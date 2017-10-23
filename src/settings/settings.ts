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

// Get info on all accounts
router.get('/api/accounts/', loginRequired, (req, res) => {
    res.send(req.user.accounts)
})

// GET an account
router.get('/api/accounts/:accountID/', loginRequired, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    if (typeof(account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
    }
    else {
        res.send(account)
    }
})

// UPDATE an account
router.post('/api/accounts/:accountID/', loginRequired, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    if (typeof(account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
    } else {

        req.checkBody('apiKey').notEmpty().isAscii()
        req.checkBody('apiSecret').notEmpty().isAscii()
        req.sanitizeBody('apiKey').trim()
        req.sanitizeBody('apiSecret').trim()

        User.findOneAndUpdate(
            { "_id": req.user._id, "accounts._id": mongoose.Types.ObjectId(req.params.accountID) },
            {
                $set: {
                    "accounts.$.apiKey": req.body.apiKey,
                    "accounts.$.apiSecret": req.body.apiSecret
                }
            },
            (err, user) => {
                if (err) {
                    res.status(400).send(err + '')
                    return
                }

                console.log(user)
                res.send(req.user.accounts)
            }
        )
    }
})

// DELETE an account
router.delete('/api/accounts/:accountID/', loginRequired, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    if (typeof(account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
    }
})


// CREATE a new account
router.post('/api/accounts/', loginRequired, (req, res) => {

    req.checkBody('accountType').notEmpty().isAscii()
    req.checkBody('apiKey').notEmpty().isAscii()
    req.checkBody('apiSecret').notEmpty().isAscii()
    req.sanitizeBody('apiKey').trim()
    req.sanitizeBody('apiSecret').trim()

    if (req.validationErrors()) {
        console.log(req.validationErrors())
        res.status(400).send('Error: Please fill in details correctly.');
        return
    }

    // Get post variables and strip whitespace
    var accountType = req.body.accountType;
    var apiKey = req.body.apiKey
    var apiSecret = req.body.apiSecret

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

            // If fetched balances successfully then this is a valid poloniex API key
            // thus it can be inserted to the database.
            User.update({email: req.user.email},
                { $push : { accounts: data }},
            (err, numAffected, rawResponse) => {
                res.send(balances)
            });
        }).catch(err => {
            res.status(400).send(err + '')
        })


    }
    else {
        res.status(400).send("Error: invalid account type")
    }
});
