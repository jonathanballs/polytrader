import * as express from 'express';
import { loginRequired, loginRequiredApi } from '../auth/auth'
import { User } from '../models'
import * as mongoose from 'mongoose'
import Poloniex from '../wrappers/poloniex-wrapper'

var router = express.Router()
export default router

// Validates account form submission
function validateAccountForm(req, res, next) {

    // Check that the account type is valid
    req.checkBody('accountType').notEmpty().isAscii()
    // If validation errors then stop and return
    if (req.validationErrors()) {
        console.log(req.validationErrors())
        res.status(400).send('Error: Please fill in details correctly.');
        return
    }

    switch (req.body.accountType) {
        case 'poloniex':
            req.checkBody('apiKey').notEmpty().isAscii()
            req.checkBody('apiSecret').notEmpty().isAscii()
            req.sanitizeBody('apiKey').trim()
            req.sanitizeBody('apiSecret').trim()

            if (req.validationErrors()) {
                console.log(req.validationErrors())
                res.status(400).send('Error: Please fill in details correctly.');
                return
            }

            var accountType = req.body.accountType;
            var apiKey = req.body.apiKey
            var apiSecret = req.body.apiSecret

            var data = {
                _id: mongoose.Types.ObjectId(),
                type: accountType,
                apiKey,
                apiSecret,
                timestampCreated: new Date(),
                timestampLastSuccessfulSync: null
            }
            var p = new Poloniex(apiKey, apiSecret);

            // Test these keys against the poloniex api
            p.returnBalances().then(balances => {
                next()
            }).catch(err => {
                res.status(400).send(err + '')
            })
            return
        default:
            res.status(400).send('Error: Unsupported account type')
            return
    }
}

// Account settings for choosing an api key
router.get('/', loginRequired, (req, res) => {
    res.render('settings/settings', { user: req.user })
});

router.post('/api/email/', loginRequiredApi, (req, res) => {
    var email = req.body.email;
    User.update({ email: req.user.email }, {
        email: email
    }, (err, numAffected, rawResponse) => {
        req.login(req.user, () => res.redirect('/account'));
    });

    return;
});

// Get info on all accounts
router.get('/api/accounts/', loginRequiredApi, (req, res) => {
    res.send(req.user.accounts)
})

// GET an account
router.get('/api/accounts/:accountID/', loginRequiredApi, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    if (typeof (account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
    }
    else {
        res.send(account)
    }
})

// UPDATE an account
router.post('/api/accounts/:accountID/', loginRequiredApi, validateAccountForm, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
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
            res.send(req.user.accounts)
        }
    )
})

// DELETE an account
router.delete('/api/accounts/:accountID/', loginRequiredApi, (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    console.log("Delete request for " + req.params.accountID)
    if (typeof (account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
        return
    }

    User.findOneAndUpdate({ _id: req.user._id },
    {
        $pull : { accounts: { _id: mongoose.Types.ObjectId(req.params.accountID) } }
    }, (err, user) => {
        if (err) {
            res.status(400).send(err + '')
        }
        else {
            res.send('OK')
        }
    })
})


// CREATE a new account
router.post('/api/accounts/', loginRequiredApi, validateAccountForm, (req, res) => {

    // Get post variables and strip whitespace
    var accountType = req.body.accountType;
    var apiKey = req.body.apiKey
    var apiSecret = req.body.apiSecret

    var data = {
        _id: mongoose.Types.ObjectId(),
        type: accountType,
        apiKey,
        apiSecret,
        timestampCreated: new Date(),
        timestampLastSuccessfulSync: null
    }

    User.update({ email: req.user.email },
        { $push: { accounts: data } },
        (err, numAffected, rawResponse) => {
            if (err) {
                res.status(400).send(err + '')
            }
            else {
                res.send('OK')
            }
        });
})
