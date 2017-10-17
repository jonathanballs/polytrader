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
import * as Big from 'big.js'
var MongoStore = ms(session);

import * as passport from 'passport'
import { Strategy } from 'passport-local'

import * as mongoose from 'mongoose';
import { User, Price } from "./models";
import Poloniex from 'poloniex-wrapper'

mongoose.connect('mongodb://db/polytrader', {useMongoClient: true});

var LOCAL_STRATEGY_CONFIG = {
    usernameField: 'email',
};

// TODO set redirect url
function loginRequired(req, res, next) {
    // req['user'] is the user
    req.user ? next() : res.redirect('/login')
}


// Local strategy to fetch user from database
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
}));

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
console.log("Polytrader running :)");
console.log(':: Listening on port ' + port);

app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
    secret: 'TODO: make a secret key',
    store: new MongoStore({ mongooseConnection: mongoose.connection}),
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/static', express.static('static')) // Serve static files
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
app.get('/account', loginRequired, (req, res) => {
    res.render('account', {user: req.user})
});

app.post('/account', loginRequired, (req, res) => {

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
app.get('/portfolio', loginRequired, (req, res) => {
    //Redirect to account in case of API key not setup
    console.log(req.user)
    if(!req.user.accounts.length) {
        res.redirect('/account')
    }

    // Create a new connection to poloniex api
    var p = new Poloniex(req.user.accounts[0].poloniexAPIKey, req.user.accounts[0].poloniexAPISecret)

    p.returnCompleteBalances().then(balances => {
        p.returnBalanceHistory().then(portfolioHistory => {

            // Find list of all currency pairs
            var all_pairs = new Set()
            portfolioHistory.map(p => {
                p.balances.map(b => { all_pairs.add("BTC_" + b.currency) })
            })

            // Fetch historic prices from database
            let prices = []
            Price.aggregate([
                {$match: {
                        'currency_pair': {$in : Array.from(all_pairs)},
                        'date': {$gt : portfolioHistory[0].timestamp}
                }},
                {$project: {
                    yearMonthDay: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    currency_pair: "$currency_pair",
                    daily_average: "$daily_average"
                }},
                {$group: {
                    _id: "$yearMonthDay",
                    prices: { $push: { currency_pair: "$currency_pair", daily_average: "$daily_average"}}
                }},
                {$sort: {
                    _id: 1
                }}
            ]).cursor({}).exec()
            .on('data', doc => prices.push(doc))
            .on('end', _ => {

                // Helper function to get the user's portfolio at a certain time
                var portfolioAtTime = (time: Date) => {
                    return portfolioHistory.filter(p => p.timestamp < time )
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                }

                var portfolioHistoryProcessed = prices.map(price => {
                    // Get users portfolio on date
                    var pd_sp = price._id.split('-')
                    var price_date = new Date(pd_sp[0], pd_sp[1]-1, pd_sp[2])
                    var p = clone(portfolioAtTime(price_date))
                    p.timestamp = price_date

                    p.balances.forEach(b => {
                        if (b.currency == "BTC") {
                            b.btcValue = b.amount
                            return;
                        }
                        else if(b.currency == "USDT") {
                            b.btcValue = "0.0"
                            return;
                        }

                        var b_price = price.prices.filter(p => p.currency_pair == "BTC_" + b.currency)[0]

                        if(typeof(b_price) != 'undefined') {
                            b.btcValue = new Big(b_price.daily_average).times(b.amount).toFixed(10)
                        } else {
                            b.btcValue = '0.0'
                        }
                    })
                    return p
                })

                res.render('portfolio', {balances, portfolioHistory: portfolioHistoryProcessed});
            })
        }).catch(err => res.render('portfolio', {err}))
    }).catch(err => res.render('portfolio', {err}))
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
    req.checkBody('password1', 'Your password is too short').len({min: 6});
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
                req.logIn(u, () =>  res.redirect('/portfolio'))
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
app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})

app.use((req, res, next) => {
    res.status(404).render('404') // 404 handler
})
