//#!/usr/bin/env/ node

import * as express from 'express';
import * as http from 'http';
import * as bodyParser from 'body-parser';
import expressValidator = require('express-validator');
import * as passwordHasher from 'password-hash';
import * as session from 'express-session';
import * as ms from 'connect-mongo';
var MongoStore = ms(session);
import * as path from 'path'
import * as mongoose from 'mongoose';
import * as passport from 'passport'
import { Strategy } from 'passport-local'

import { UserModel } from "./models";
import settingsRouter from './settings/settings'
import authRouter from './auth/auth'
import portfolioRouter from './portfolio/portfolio'
import servicesList from './wrappers/services'

mongoose.connect('mongodb://db/polytrader', {useMongoClient: true});

// Local strategy to fetch user from database
passport.use(new Strategy({usernameField: 'email'}, (email, password, done) => {
    UserModel.findOne({email: email}, (err, user) => {
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
    UserModel.findById(id, (err, u) => done(null, u));
});

var verbose = false;
var port = 8080;
var app = express();
var server = http.createServer(app);

server.listen(port);
console.log("Polytrader starting at " + new Date());
console.log(':: Listening on port ' + port);

app.set('view engine', 'pug')
app.set('views', path.join(__dirname, '/views'))

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
app.use('/static', express.static('dist/static')) // Serve compiled static files
app.use(expressValidator())
app.use(function(req, res, next) {
    res.locals.user = req.user;
    next();
});

app.use('/account', settingsRouter)
app.use('/auth', authRouter)
app.use('/portfolio', portfolioRouter)

app.get('/', (req, res) => {
    if (req.user) {
        // Logged in users get redirected to their portfolios
        res.redirect('/portfolio');
    }
    else {
        res.render('index')
    }
});

app.use((req, res, next) => {
    res.status(404).render('404') // 404 handler
})
