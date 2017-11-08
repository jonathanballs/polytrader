import * as express from 'express';
import { loginRequired, loginRequiredApi } from '../auth/auth'
import { UserModel } from '../models'
import * as mongoose from 'mongoose'
import services from '../wrappers/services'
import { servicesClient } from '../wrappers/services'
import * as multiparty from 'multiparty'

var router = express.Router()
export default router

// Validates account form submission
function validateAccountForm(req, res, next) {

    // Parse the multipart form
    var form = new multiparty.Form({ maxFieldsSize: 100000,
                            uploadDir: '/upload' }) // limit to 100kb
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.status(400).send("Error: Failed to parse form: " + err + '')
            return
        }

        for (var key in fields) {
            req.body[key] = fields[key][0]
        }

        for (var key in files) {
            delete files[key][0].fieldName
            delete files[key][0].headers
            req.body[key] = files[key][0]
        }

        console.log(req.body)

        // Check that the service type is valid
        req.checkBody('service').notEmpty().isAscii()
            .isIn(services.map(s => s.key))
        if (req.validationErrors()) {
            res.status(400).send('Error: Please submit a valid service type')
            return
        }
        var service = services.filter(s => s.key == req.body.service)[0]

        // Assert that userAuth variables are submitted
        service.formFields.forEach(ff => {
            if (!ff.type) {
                req.checkBody(ff.name).notEmpty().isAscii()
                req.sanitizeBody(ff.name).trim()
            }
        })

        if (req.validationErrors()) {
            res.status(400).send('Error: Please fill in form details fully.');
            return
        }

        // Validate the userAuth variables and run next middleware
        var userAuth = service.formFields.reduce((acc, ff) => {
            acc[ff.name] = req.body[ff.name]
            return acc
        }, {})

        var wrapper = new service.wrapper(service.serverAuth, userAuth)
        wrapper.validateCredentials().then(b => {
            if (b) {
                next()
            } else {
                res.status(400).send("Error Invalid Credentials")
            }
        })
            .catch(e => {
                res.status(400).send(e + '')
                return
            })
    })
}

// Account settings for choosing an api key
router.get('/', loginRequired, (req, res) => {
    res.render('settings/settings', { user: req.user })
});

router.post('/api/email/', loginRequiredApi, (req, res) => {
    var email = req.body.email;
    UserModel.update({ email: req.user.email }, {
        email: email
    }, (err, numAffected, rawResponse) => {
        req.login(req.user, () => res.redirect('/account'));
    });

    return;
});

router.get('/api/services/', loginRequiredApi, (req, res) => {
    res.send(servicesClient)
})

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
router.post('/api/accounts/:accountID/', loginRequiredApi, validateAccountForm,
                                                                   (req, res) => {
    var account = req.user.accounts.filter(a => a._id == req.params.accountID)[0]
    if (!account) {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
        return
    }

    var service = services.filter(s => s.key == req.body.service)[0]
    var updateSet = service.formFields.reduce((acc, ff) => {
        // e.g. { "accounts.$.apiKey": "1234-5678" }
        acc["accounts.$." + ff.name] = req.body[ff.name]
        return acc
    }, {})

    UserModel.findOneAndUpdate(
        { "_id": req.user._id, 
            "accounts._id": mongoose.Types.ObjectId(req.params.accountID) },
        {
            $set: updateSet
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

    if (typeof (account) == 'undefined') {
        res.status(404).send("Unable to find account with ID " + req.params.accountID)
        return
    }

    UserModel.findOneAndUpdate({ _id: req.user._id },
        {
            $pull: { accounts: { _id: mongoose.Types.ObjectId(req.params.accountID) } }
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

    // Get the service type and create a user auth object for it
    var service = services.filter(s => s.key == req.body.service)[0]
    var userAuth = service.formFields.reduce((acc, ff) => {
        acc[ff.name] = req.body[ff.name]
        return acc
    }, {})

    var newAccount = {
        _id: mongoose.Types.ObjectId(),
        service: req.body.service,
        timestampCreated: new Date(),
        timestampLastSuccessfulSync: null,
        balances: [],
        userAuth
    }

    UserModel.findOneAndUpdate({ email: req.user.email },
        { $push: { accounts: newAccount } },
        { new: true },
        (err, updatedUser) => {
            // Update the account
            updatedUser.accounts[updatedUser.accounts.length -1].sync()
            if (err) {
                res.status(400).send(err + '')
            }
            else {
                res.send('OK')
            }
        });
})
