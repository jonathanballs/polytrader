import * as express from 'express';
import {User} from '../models'
import Poloniex from '../wrappers/poloniex-wrapper'
import * as passwordHasher from 'password-hash';
import * as passport from 'passport'

var router = express.Router()

// TODO set redirect url
export function loginRequired(req, res, next) {
    // req['user'] is the user
    req.user ? next() : res.redirect('/auth/login')
}
export function loginRequiredApi(req, res, next) {
    // req['user'] is the user
    req.user ? next() : res.status(401).send("Error: You are not signed into polytrader.")
}

router.post('/signup', (req, res) => {

    // Check passwords are the same
    var email = req.body.email;
    var password1 = req.body.password1;
    var password2 = req.body.password2;
    if (password1 != password2) {
        console.log(`User signed up with ${email} but passwords don't match`);
        res.render('auth/signup',
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
        res.render('auth/signup', {formErrors: errors} );
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
            res.render('auth/signup', {formErrors: errors} );
            return;
        }
    });
});

router.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})

router.get('/login', (req, res) => {
    res.render('auth/login')
});

router.post('/login', passport.authenticate(
    'local', { successRedirect: '/', failureRedirect: '/login' }));

export default router
