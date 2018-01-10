import axios from "axios";
import * as express from "express";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import * as passwordHasher from "password-hash";
import * as qs from "qs";

import { loginRequired, loginRequiredApi } from "../auth/auth";
import UserModel from "../models/user";
import queue from "../tasks";
import services from "../wrappers/services";
import { servicesClient } from "../wrappers/services";

const router = express.Router();
export default router;

// Validates account form submission
function validateAccountForm(req, res, next) {

    // Parse the multipart form
    const form = new multiparty.Form({
        maxFieldsSize: 100000,
        uploadDir: "/upload",
    });
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.status(400).send("Error: Failed to parse form: " + err + "");
            return;
        }

        for (const key in fields) {
            if (fields.hasOwnProperty(key)) {
                req.body[key] = fields[key][0];
            }
        }

        for (const key in files) {
            if (files.hasOwnProperty(key)) {
                delete files[key][0].fieldName;
                delete files[key][0].headers;
                req.body[key] = files[key][0];
            }
        }

        // Check that the service type is valid
        req.checkBody("service").notEmpty().isAscii()
            .isIn(services.map((s) => s.key));
        if (req.validationErrors() || req.body.service === "coinbase") {
            res.status(400).send("Error: Please submit a valid service type");
            return;
        }
        const service = services.filter((s) => s.key === req.body.service)[0];

        // Assert that userAuth variables are submitted
        service.formFields.forEach((ff) => {
            if (!ff.type) {
                req.checkBody(ff.name).notEmpty().isAscii();
                req.sanitizeBody(ff.name).trim();
            }
        });

        if (req.validationErrors()) {
            res.status(400).send("Error: Please fill in form details fully.");
            return;
        }

        // Validate the userAuth variables and run next middleware
        const userAuth = service.formFields.reduce((acc, ff) => {
            acc[ff.name] = req.body[ff.name];
            return acc;
        }, {});

        const wrapper = new service.wrapper(service.serverAuth, userAuth);
        wrapper.validateCredentials()
            .then((valid) => {
                valid ? next() : res.status(400).send("Error: Invalid credentials");
            })
            .catch((e) => {
                res.status(400).send(e + "");
                return;
            });
    });
}

// Account settings for choosing an api key
router.get("/", loginRequired, (req, res) => {
    res.render("settings/settings", { user: req.user });
});

router.post("/api/email/", loginRequiredApi, (req, res) => {
    return;
});

router.get("/api/services/", loginRequiredApi, (req, res) => {
    res.send(servicesClient);
});

// Get info on all accounts
router.get("/api/accounts/", loginRequiredApi, (req, res) => {
    res.send(req.user.accounts);
});

// GET an account
router.get("/api/accounts/:accountID/", loginRequiredApi, (req, res) => {
    const account = req.user.getAccountByID(req.params.accountID);

    if (typeof (account) === "undefined") {
        res.status(404).send("Unable to find account with ID " + req.params.accountID);
    } else {
        res.send(account);
    }
});

// UPDATE an account
router.post("/api/accounts/:accountID/", loginRequiredApi,
    validateAccountForm, (req, res) => {

        const account = req.user.getAccountByID(req.params.accountID);
        if (account === null) {
            res.status(404).send("Unable to find account with ID " +
                req.params.accountID);
            return;
        }

        const service = services.filter((s) => s.key === req.body.service)[0];
        const updateSet = service.formFields.reduce((acc, ff) => {
            // e.g. { "accounts.$.apiKey": "1234-5678" }
            acc["accounts.$." + ff.name] = req.body[ff.name];
            return acc;
        }, {});

        UserModel.findOneAndUpdate(
            {
                "_id": req.user._id,
                "accounts._id": mongoose.Types.ObjectId(req.params.accountID),
            },
            {
                $set: updateSet,
            },
            (err, user) => {
                if (err) {
                    res.status(400).send(err + "");
                    return;
                }
                res.send(req.user.accounts);

                queue.create("sync-account", {
                    accountID: req.params.accountID,
                    title: "Syncing " + service.key +
                    " account for " + req.user.email,
                }).save((saveErr) => {
                    if (saveErr) {
                        console.log("Error creating sync-account task on " +
                            " when user updates account: ", saveErr);
                    }
                });
            },
        );
    });

// DELETE an account
router.delete("/api/accounts/:accountID/", loginRequiredApi, (req, res) => {
    const account = req.user.getAccountByID(req.params.accountID);

    if (account === null) {
        res.status(404).send("Unable to find account with ID " + req.params.accountID);
        return;
    }

    UserModel.findOneAndUpdate({ _id: req.user._id },
        {
            $pull: { accounts: { _id: mongoose.Types.ObjectId(req.params.accountID) } },
        }, (err, user) => {
            if (err) {
                res.status(400).send(err + "");
            } else {
                res.send("OK");
            }
        });
});

// CREATE a new account
router.post("/api/accounts/", loginRequiredApi, validateAccountForm, (req, res) => {

    // Get the service type and create a user auth object for it
    const service = services.filter((s) => s.key === req.body.service)[0];
    const userAuth = service.formFields.reduce((acc, ff) => {
        acc[ff.name] = req.body[ff.name];
        return acc;
    }, {});

    const newAccount = {
        _id: mongoose.Types.ObjectId(),
        balances: [],
        lastSyncErrorMessage: null,
        lastSyncWasSuccessful: null,
        service: req.body.service,
        timestampCreated: new Date(),
        timestampLastSync: null,
        userAuth,
    };

    UserModel.findOneAndUpdate({ _id: req.user._id },
        { $push: { accounts: newAccount } },
        { new: true },
        (err, updatedUser) => {
            // Update the account
            if (err) {
                res.status(400).send(err + "");
                return;
            }

            queue.create("sync-account", {
                accountID: updatedUser.accounts[
                    updatedUser.accounts.length - 1]._id,
                title: "Syncing " + newAccount.service +
                " account for " + req.user.email,

            }).save((saveErr) => {
                if (saveErr) {
                    console.log("Error creating sync-account task on " +
                        " when user updates account");
                }
            });

            res.send("OK");
        });
});

router.get("/api/user/", loginRequiredApi, (req, res) => {
    res.send({ email: req.user.email });
});

router.post("/api/user/", loginRequiredApi, (req, res) => {

    req.checkBody("email").isEmail();
    if (req.validationErrors()) {
        res.status(400).send("Not a valid email address");
        return;
    }

    const email = req.body.email;
    UserModel.update({ _id: req.user._id }, {
        email,
    }, (err, numAffected, rawResponse) => {
        res.send("SUCCESS");
    });

});

router.post("/api/password", loginRequiredApi, (req, res) => {

    req.checkBody("oldPassword").isAscii().notEmpty().isLength({ min: 8 });
    req.checkBody("newPassword1").isAscii().notEmpty().isLength({ min: 8 });
    req.checkBody("newPassword2").isAscii().notEmpty().isLength({ min: 8 });

    if (req.validationErrors()) {
        res.status(400).send("Passwords are too short");
        return;
    } else if (req.body.newPassword1 !== req.body.newPassword2) {
        res.status(400).send("Passwords do not match");
        return;
    } else if (!passwordHasher.verify(req.body.oldPassword, req.user.passwordHash)) {
        // If the old passwod isn't correct
        res.status(400).send("Your old password is incorrect");
        return;
    }

    // Update the password
    const passwordHash = passwordHasher.generate(req.body.newPassword1);
    UserModel.update({ _id: req.user._id }, {
        passwordHash,
    }, (err, numAffected, rawResponse) => {
        console.log("Password updated to ", req.body.newPassword1);
        res.send("SUCCESS");
    });
});

// Coinbase callback
router.get("/api/coinbasecallback", loginRequired, (req, res) => {
    const coinbaseCode = req.query.code;
    if (!coinbaseCode) {
        res.status(400).send("Error: no coinbase code in request");
        return;
    }

    axios.post("https://api.coinbase.com/oauth/token", qs.stringify({
        client_id: "8cc804e451eb2a636534f046a08bd55421865e6e5a05583391cacb262e5016ca",
        client_secret: "f1b367badd3e08f778df09a838308913671557a2c44929e86d2e1317f9861620",
        code: coinbaseCode,
        grant_type: "authorization_code",
        redirect_uri: "http://localhost:8080/account/api/coinbasecallback",
    }))
    .then((accessTokenResponse) => {
        console.log(accessTokenResponse.data);
        const userAuth = accessTokenResponse.data;

        const newAccount = {
            _id: mongoose.Types.ObjectId(),
            balances: [],
            lastSyncErrorMessage: null,
            lastSyncWasSuccessful: null,
            service: "coinbase",
            timestampCreated: new Date(),
            timestampLastSync: null,
            userAuth,
        };

        UserModel.findOneAndUpdate({ _id: req.user._id },
            { $push: { accounts: newAccount } },
            { new: true },
            (err, updatedUser) => {
                // Update the account
                if (err) {
                    res.status(400).send(err + "");
                    return;
                }

                queue.create("sync-account", {
                    accountID: updatedUser.accounts[
                        updatedUser.accounts.length - 1]._id,
                    title: "Syncing " + newAccount.service +
                    " account for " + req.user.email,

                }).save((saveErr) => {
                    if (saveErr) {
                        console.log("Error creating sync-account task on " +
                            " when user updates account: ", saveErr);
                    }
                    res.redirect("/account");
                });

            },
        );
    })
    .catch((err) => {
        res.status(400).send(err);
    });
});
