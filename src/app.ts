#!/usr/bin/env/ node

import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as poloniex from 'poloniex.js';
import * as bodyParser from 'body-parser';
import expressValidator = require('express-validator');
import * as passwordHasher from 'password-hash';
import * as session from 'express-session';
import * as ms from 'connect-mongo';
import * as clone from 'clone';
var MongoStore = ms(session);

import * as passport from 'passport'
import {Strategy} from 'passport-local'

import * as mongoose from 'mongoose';
mongoose.connect('mongodb://localhost/test');
import { User } from "./models";

var LOCAL_STRATEGY_CONFIG = {
    usernameField: 'email',
};

class Balance {
    currency: string;
    amount: number;
    btcValue: number;

    constructor(currency: string, amount: number) {
        this.currency = currency;
        this.amount = amount;
    }
}

class Portfolio {
    timestamp: Date;
    balances: Balance[];

    constructor(balances: Balance[], timestamp: Date) {
        this.timestamp = timestamp;
        this.balances = balances;
    }

    balanceOf(currency: string) : Balance {
        var b = this.balances.filter((x) => x.currency == currency);

        if (b.length)
            return b[0];

        var newBalance = new Balance(currency, 0.0);
        this.balances.push(newBalance);

        return newBalance;
    }

    getValue() : number {
        return this.balances
            .map((b) => b.btcValue)
            .reduce((a, b)=>a+b, 0);
    }

}
passport.use(new Strategy(LOCAL_STRATEGY_CONFIG, (email, password, done) => {
        User.findOne({email: email}, (err, user) => {
            if (err)
                return done(err)

            if (!user)
                return done(null, false, { message: 'Incorrect username.' });

            if (!passwordHasher.verify(password, user.passwordHash))
                return done(null, false, { message: 'Incorrect password.' });

            return done(null, user);
        });
    })
);

passport.serializeUser((user:any, done) => {
    done(null, user._id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, u) => done(null, u));
});

var verbose = false;
var port = 8080;
var app = express();
var server = http.createServer(app);
var io = socketio(server);

server.listen(port);
console.log("Polotrader running :)");
console.log(':: Listening on port ' + port);

app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session(
    {
        secret: 'TODO: make a secret key',
        store: new MongoStore({ mongooseConnection: mongoose.connection})
    }
));
app.use(passport.initialize());
app.use(passport.session());

// Serve static files at /static
app.use(express.static('lib'))
app.use(express.static('comp'))
app.use('/static', express.static('static'))

app.use(expressValidator())

// Serve the index file
app.get('/', (req, res) => {
    if (req.user) {
        // Logged in users get redirected to their portfolios
        res.redirect('/portfolio');
    }
    else {
        res.render('index')
    }

});

app.get('/login', (req, res) => {
    res.render('login')
});

app.post('/login', passport.authenticate(
    'local', { successRedirect: '/', failureRedirect: '/login' }));

// Account settings for choosing an api key
app.get('/account', (req, res) => {
    console.log(req.user._id);
    res.render('account', {user: req.user})
});

app.post('/account', (req, res) => {

    var email = req.body.email;
    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;

    User.update({email: req.user.email}, {
        email: email,
        poloniexAPIKey: apiKey,
        poloniexAPISecret: apiSecret
    }, (err, numAffected, rawResponse) => {
        req.login(req.user, () => res.redirect('/account'));
    });

    return;
});

// Get poloniex data
app.get('/portfolio', (req, res) => {

    // Create a new connection to poloniex api
    var p = new poloniex(req.user.poloniexAPIKey, req.user.poloniexAPISecret);

    p.returnCompleteBalances((err, rawBalances) => {

        // Return the trade history
        var returnTradeHistoryParams = {
            currencyPair: 'all',
            start: 0,
            end: +new Date()
        }

        p._private('returnTradeHistory', returnTradeHistoryParams, (err, tradeHistoryRaw) => {
            p.returnDepositsWithdrawals(0, +new Date(), (err, depositsWithdrawalsRaw) => {

                // Get current balances
                var balances = new Array()
                for (var key in rawBalances) {
                    if (rawBalances.hasOwnProperty(key)) {
                        var amountHave = parseFloat(rawBalances[key]["available"]) + parseFloat(rawBalances[key]["onOrders"])

                        if (amountHave > 0.0) {
                            balances.push( {
                                currency: key,
                                balance: amountHave,
                                btcValue: rawBalances[key]["btcValue"]}
                            );
                        }
                    }
                }

                // Events stores all buy/sell/widthdraw/deposits events
                var portfolioEvents = new Array();
                enum eventTypes {
                    Withdrawal,
                        Deposit,
                        Trade
                }

                // Create a list of all portfolio events
                depositsWithdrawalsRaw["withdrawals"].forEach((w) => {
                    w.timestamp *= 1000;
                    w.eventType = eventTypes.Withdrawal;
                    portfolioEvents.push(w);
                })
                depositsWithdrawalsRaw["deposits"].forEach((d) => {
                    d.timestamp *= 1000;
                    d.eventType = eventTypes.Deposit;
                    portfolioEvents.push(d);
                })
                for (var key in tradeHistoryRaw) {
                    var currFrom = key.split('_')[0];
                    var currTo = key.split('_')[1];

                    tradeHistoryRaw[key].forEach((t) => {
                        t["currFrom"] = currFrom;
                        t["currTo"] = currTo;
                        t["timestamp"] = Date.parse(t.date);
                        t["eventType"] = eventTypes.Trade;

                        portfolioEvents.push(t);
                    });
                }

                portfolioEvents.sort((a, b) => a.timestamp - b.timestamp);

                var portfolioHistory : Portfolio[] = new Array();

                portfolioEvents.forEach((e) => {

                    // We assume that the first event is a deposit. The program
                    // will break if it's not but it should be always true :/
                    if (!portfolioHistory.length) {
                        var balance = new Balance(e["currency"], parseFloat(e["amount"]))
                        var portfolio = new Portfolio([balance], new Date(e.timestamp));
                        portfolioHistory.push(portfolio);
                        return;
                    }

                    // Clone the last portfolio. Kinda cancerous - I'm sorry
                    var portfolio = clone(portfolioHistory[portfolioHistory.length-1]);
                    portfolio.timestamp = new Date(e.timestamp);

                    switch(e.eventType) {
                        case eventTypes.Withdrawal:
                            // Assume that balance already exists
                            var b = portfolio.balanceOf(e["currency"]);
                            b.amount -= parseFloat(e["amount"])
                            break;
                        case eventTypes.Deposit:
                            var b = portfolio.balanceOf(e["currency"]);
                            b.amount += parseFloat(e["amount"]);
                            console.log(b.amount);
                            break;

                        case eventTypes.Trade:
                            var b1 = portfolio.balanceOf(e["currFrom"]);
                            var b2 = portfolio.balanceOf(e["currTo"]);

                            if (e["type"] == "buy") {
                                b1.amount -= parseFloat(e["total"]);
                                //b1.amount -= parseFloat(e["fee"]);
                                b2.amount += parseFloat(e["amount"]);
                            }
                            else {
                                b1.amount += parseFloat(e["total"]);
                                //b1.amount -= parseFloat(e["fee"]);
                                b2.amount -= parseFloat(e["amount"]);
                            }

                            break;
                    }

                    portfolioHistory.push(portfolio);
                });

                res.render('portfolio', {err: err, balances: balances, portfolioHistory: portfolioHistory});

            });
        });
    });
});

app.post('/signup', (req, res) => {

    // Check passwords are the same
    var email = req.body.email;
    var password1 = req.body.password1;
    var password2 = req.body.password2;
    if (password1 != password2) {
        console.log(`User signed up with ${email} but passwords don't match`);
        res.render('signup',
            {formErrors: [
                {param: 'password1', msg: 'Passwords do not match', value: ''},
                {param: 'email', value: email}
            ]
            }
        );

        return;
    }

    // Check for other errors
    req.checkBody('email', 'Invalid email address').isEmail();
    req.checkBody('password1', 'Your password is too short').len(6);
    var errors = req.validationErrors();
    if (errors) {
        console.log(`User signed up with ${email} but there were validation errors`);
        res.render('signup', {formErrors: errors} );
        return;
    }

    // Check if user already exists otherwise create it.
    User.findOne({email: email}, (err, user) => {
        if (!user) {
            var u = new User({
                email: email,
                passwordHash: passwordHasher.generate(password1),
                signupTimestamp: Date.now(),
                loginTimestamp: Date.now()
            })
            u.save((err, u) => {
                res.redirect('/portfolio');
                return;
            });
        }

        else {
            console.log(`User tried to sign up with ${email} but it is already in use`);
            var errors = [
                {param: 'email', msg: 'A user with this email already exists', value: email}
            ]
            res.render('signup', {formErrors: errors} );
            return;
        }
    });
});

