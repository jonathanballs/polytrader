import * as express from 'express';
import {loginRequired} from '../auth/auth'
import {User} from '../models'
import * as mongoose from 'mongoose'
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

router.get('/api/accounts/', loginRequired, (req, res) => {
    res.send(req.user.accounts)
})

router.post('/api/accounts/new', loginRequired, (req, res) => {

    // Get post variables and strip whitespace
    var accountType = req.body.accountType;
    var apiKey = req.body.apiKey.replace(/ /g,'');;
    var apiSecret = req.body.apiSecret.replace(/ /g,'');;

    if (accountType == 'poloniex') {
        var data = {
            _id: mongoose.Types.ObjectId(),
            type: accountType,
            apiKey,
            apiSecret,
            timestampCreated: new Date(),
            timestampLastSuccessfulSync: null
        }
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
            res.status(400).send(err + '')
        })


    }
    else {
        res.status(400).send("Error: invalid account type")
    }
});
