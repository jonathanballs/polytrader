import * as express from 'express';
import {loginRequired} from '../auth/auth'
import {User} from '../models'
import Poloniex from 'poloniex-wrapper'

var router = express.Router()
export default router

// Account settings for choosing an api key
router.get('/', loginRequired, (req, res) => {
    res.render('settings/settings', {user: req.user})
});

router.post('/', loginRequired, (req, res) => {

    var email = req.body.email;

    User.update({email: req.user.email}, {
        email: email
    }, (err, numAffected, rawResponse) => {
        req.login(req.user, () => res.redirect('/account'));
    });

    return;
});

router.post('/accounts/new', loginRequired, (req, res) => {

    var accountType = req.body.accountType;
    var apiKey = req.body.apiKey;
    var apiSecret = req.body.apiSecret;

    if (accountType == 'poloniex') {
        var data = {type: accountType, apiKey, apiSecret}
        var p = new Poloniex(apiKey, apiSecret);

        p.returnBalances().then(balances => {

            res.send(balances)

            // If fetched balances successfully then this is a valid poloniex API key
            // thus it can be inserted to the database.
            User.update({email: req.user.email},
                { $push : { accounts: data }},
            (err, numAffected, rawResponse) => {
                res.redirect('/account');
            });
        }).catch(err => {
            // On error, send the error to the user
            res.status(400).send(err + '')
        })


    }
    else {
        // Return an error code
    }
    return;
});
