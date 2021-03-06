import axios from "axios";
import * as express from "express";
import * as fs from "fs";
import * as mongoose from "mongoose";
import * as multiparty from "multiparty";
import * as passwordHasher from "password-hash";
import * as qs from "qs";

import { loginRequired, loginRequiredApi } from "../auth/auth";
import PortfolioModel from "../models/portfolio";
import UserModel from "../models/user";
import queue from "../tasks";
import services from "../wrappers/services";
import { servicesClient } from "../wrappers/services";

const router = express.Router();
export default router;

// Validates account form submission
function validateAccountForm(req, res, next) {

    // This will be set if the form is for an already existing form
    const isAccountUpdate = !!req.params.accountID;
    let account = null;
    if (req.params.accountID) {
        account = req.user.getAccountByID(req.params.accountID);
    }

    // Parse the multipart form
    const form = new multiparty.Form({
        maxFieldsSize: 100000, // 100KB
        uploadDir: "/upload",
    });
    form.parse(req, (err, fields, files) => {
        if (err) {
            res.status(400).send("Error: Failed to parse form: " + err + "");
            return;
        }

        req.body.service = fields.service[0];
        req.checkBody("service").notEmpty().isAscii()
            .isIn(services.map((s) => s.key));
        if (req.validationErrors() || req.body.service === "coinbase") {
            res.status(400).send(`Error: ${req.body.service} is not a valid service type`);
            return;
        }
        const service = services.filter((s) => s.key === req.body.service)[0];

        // Check all text form fields
        service.formFields.forEach((formField) => {
            if (formField.type === "text" && fields[formField.name]) {
                req.body[formField.name] = fields[formField.name][0];
                req.checkBody(formField.name).notEmpty().isAscii();
                req.sanitizeBody(formField.name).trim();
            } else if (formField.type === "file") {
                let fileField = files[formField.name];
                // If the file is not sent then we should get the one that is already in db
                if (fileField) {
                    fileField = fileField[0];
                    delete fileField.fieldName;
                    delete fileField.headers;
                    fileField.uploadDate = new Date();
                } else if (account) {
                    fileField = account.userAuth[formField.name];
                }
                req.body[formField.name] = fileField;
                req.checkBody(formField.name).notEmpty();
            }
        });
        if (req.validationErrors()) {
            // Delete the files
            for (const key in files) {
                if (files.hasOwnProperty(key)) {
                    files[key].forEach((f) => {
                        try {
                            fs.unlinkSync(files[key].path);
                        } catch (rmerr) {
                            console.log("Failed to delete file " + files[key].path + ": " + rmerr);
                        }
                    });
                }
            }
            res.status(400).send("Error: Please fill in form details fully.");
            return;
        }

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

// Finds user account and the associated service
function handleLinkedAccount(req, res, next) {
    req.account = req.user.getAccountByID(req.params.accountID);
    if (!req.account) {
        res.status(400).send("Unable to find account with ID "
            + req.params.accountID);
        return;
    }

    // Find the service. This should never fail unless a service was removed
    // from polytrader.
    req.service = services.filter((s) => s.key === req.account.service)[0];
    if (!req.service) {
        res.status(500).send("An internal error occurred. We \
        could not find a service for this account");
        return;
    }

    next();
}

// Account settings for choosing an api key
router.get("/", loginRequired, (req, res) => {
    res.render("settings/settings", { user: req.user });
});

router.get("/api/services/", loginRequiredApi, (req, res) => {
    res.send(servicesClient);
});

// Get info on all accounts
router.get("/api/accounts/", loginRequiredApi, (req, res) => {
    res.send(req.user.accounts.map((a) => a.sanitized()));
});

// GET an account
router.get("/api/accounts/:accountID/", loginRequiredApi,
        handleLinkedAccount, (req, res) => {
    res.send((req as any).account.sanitized());
});

// UPDATE an account
router.post("/api/accounts/:accountID/", loginRequiredApi,
        validateAccountForm, handleLinkedAccount, (req, res) => {

    const updateSet = (req as any).service.formFields.reduce((acc, ff) => {
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
                title: "Syncing " + (req as any).service.key +
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
router.delete("/api/accounts/:accountID/", loginRequiredApi,
        handleLinkedAccount, (req, res) => {

    (req as any).service.formFields
        .filter((ff) => ff.type === "file")
        .forEach((ff) => {
            const path = (req as any).account.userAuth[ff.name].path;
            try {
                fs.unlinkSync(path);
                console.log("Deleted old account file ", path);
            } catch (delErr) {
                console.log("Error deleting old account file ", path);
            }
        });

    UserModel.findOneAndUpdate({ _id: req.user._id },
        {
            $pull: { accounts: { _id: mongoose.Types.ObjectId(req.params.accountID) } },
        }, (err, user) => {
            if (err) {
                res.status(400).send(err + "");
            } else {
                // Also delete the portfolio history. We don't mind if it fails
                PortfolioModel.findOne({
                    accountID: mongoose.Types.ObjectId(req.params.accountID),
                }).remove().exec()
                .then(() => res.send("OK") )
                .catch(() => res.send("OK") );
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
        },
    );
});

// SYNC an account
router.post("/api/accounts/:accountID/sync", loginRequiredApi,
        handleLinkedAccount, (req, res) => {
    // Get the service type and create a user auth object for it
    (req as any).account.sync()
    .then(() => {
        res.send("OK");
    })
    .catch(() => {
        res.status(500).send("Internal Error");
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

    UserModel.findOne({ email: req.body.email })
    .then((user) => {
        if (user && user._id !== req.user._id) {
            res.status(400).send("A user with that email already exists");
            return;
        }

        const email = req.body.email;
        UserModel.update({ _id: req.user._id }, {
            email,
        }, (err, numAffected, rawResponse) => {
            res.send("SUCCESS");
        });
    }).catch((err) => {
        res.status(500).send("An internal error occurred");
        return;
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

    const coinbaseService = services.filter((s) => s.key === "coinbase")[0];

    axios.post("https://api.coinbase.com/oauth/token", qs.stringify({
        client_id: coinbaseService.serverAuth.clientId,
        client_secret: coinbaseService.serverAuth.clientSecret,
        code: coinbaseCode,
        grant_type: "authorization_code",
        redirect_uri: ((req.connection as any).encrypted ? "https" : "http") +
            "://" + req.headers.host + "/account/api/coinbasecallback",
    }))
    .then((accessTokenResponse) => {

        const userAuth = {
            accessToken: accessTokenResponse.data.access_token,
            expiresIn: accessTokenResponse.data.expires_in,
            refreshToken: accessTokenResponse.data.refresh_token,
            scope: accessTokenResponse.data.scope,
            tokenType: accessTokenResponse.data.token_type,
        };

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
