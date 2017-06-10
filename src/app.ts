#!/usr/bin/env/ node

import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as poloniex from 'poloniex.js';
import * as bodyParser from 'body-parser';
import * as expressValidator from 'express-validator';
import * as passwordHasher from 'password-hash';
import * as session from 'express-session';
import * as ms from 'connect-mongo';
var MongoStore = ms(session);

import * as passport from 'passport'
import * as LocalStrategy from 'passport-local'

import * as mongoose from 'mongoose';
mongoose.connect('mongodb://localhost/test');

var userSchema = new mongoose.Schema({
    email: String,
    loginTimestamp: Date,
    signupTimestamp: Date,
    poloniexAPIKey: String,
    poloniexAPISecret: String,
    passwordHash: String
});
var User = mongoose.model('User', userSchema);

var LOCAL_STRATEGY_CONFIG = {
    usernameField: 'email',
};

passport.use(new LocalStrategy(LOCAL_STRATEGY_CONFIG, (email, password, done) => {
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

passport.serializeUser((user, done) => {
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

    p.returnCompleteBalances((err, data) => {
        var balances = new Array()
        for (var key in data) {
            if (data.hasOwnProperty(key)) {
                var amountHave = parseFloat(data[key]["available"]) + parseFloat(data[key]["onOrders"])

                if (amountHave > 0.0) {
                    balances.push( {
                        currency: key,
                        balance: amountHave,
                        btcValue: data[key]["btcValue"]}
                    );
                }
            }
        }

        res.render('portfolio', {err: err, balances: balances})
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
    req.checkBody('password1', 'Your password is too short').len(6, 100);
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

