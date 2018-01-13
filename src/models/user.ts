// Mongoose models
import * as Big from "big.js";
import * as clone from "clone";
import * as mongoose from "mongoose";

import { Balance, Portfolio } from "../wrappers";
import servicesList from "../wrappers/services";
import PortfolioEventHistoryModel from "./portfolio";

// User schema
const balanceSchema = mongoose.Schema({
    balance: String,
    currency: String,
});

const linkedAccountSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    balances: [mongoose.Schema.Types.Mixed],
    lastSyncErrorMessage: String,
    lastSyncWasSuccessful: Boolean,
    service: String, // Rename this to serviceKey
    timestampCreated: Date,
    timestampLastSync: Date,
    userAuth: mongoose.Schema.Types.Mixed,
});

// Return account info with secret fields removed
linkedAccountSchema.methods.sanitized = function sanitized() {
    const ret = clone(this.toObject());
    const service = servicesList.filter((s) => s.key === this.service)[0];
    ret.userAuth = service.formFields.filter((ff) => !ff.secret).reduce((prev, curr) => {
        return {[curr.name]: this.userAuth[curr.name], ...prev};
    }, {});
    return ret;
};

linkedAccountSchema.methods.sync = function sync() {

    const syncPromise = new Promise((resolve, reject) => {
        const service = servicesList.filter((s) => s.key === this.service)[0];
        const wrapper = new service.wrapper(service.serverAuth, this.userAuth);

        wrapper.validateCredentials().then((userAuth) => {
            // Update the userAuth in db as it may have changed
            UserModel.findOneAndUpdate(
                { "accounts._id": this._id },
                {
                    $set: {
                        "accounts.$.userAuth": userAuth,
                    },
                },
            ).then(() => {
                wrapper.returnHistory().then((history) => {
                    wrapper.returnBalances().then((balances) => {

                        // Update account balances
                        UserModel.findOneAndUpdate(
                            { "accounts._id": this._id },
                            {
                                $set: {
                                    "accounts.$.balances": balances,
                                    "accounts.$.lastSyncErrorMessage": null,
                                    "accounts.$.lastSyncWasSuccessful": true,
                                    "accounts.$.timestampLastSync": new Date(),
                                },
                            }, (err) => {
                                if (err) {
                                    reject("Error updating account balance in db" + err);
                                }
                            });

                        // Sort history properly
                        history = history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                        PortfolioEventHistoryModel.findOneOrCreate({ accountID: this._id })
                        .then((peh) => {
                            const newHistory = peh.events
                                .filter((e) => e.timestamp < history[0].timestamp)
                                .concat(history);

                            PortfolioEventHistoryModel.update(
                                { _id: peh._id },
                                { $set: { events: newHistory } })
                                .then(() => {
                                    resolve("Successfully synced");
                                }).catch((err) => {
                                    reject("Error inserting portfolio history into db:" + err);
                                });
                        }).catch((err) => reject(err));
                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        }).catch((err) => reject(err));
    });

    return new Promise((resolve, reject) => {
        syncPromise
        .then((a) => resolve(a))
        .catch((err) => {
            // Save failure details to database
            UserModel.findOneAndUpdate(
                { "accounts._id": this._id },
                {
                    $set: {
                        "accounts.$.lastSyncErrorMessage": err + "",
                        "accounts.$.lastSyncWasSuccessful": false,
                        "accounts.$.timestampLastSync": new Date(),
                    },
                })
                .then(() => {
                    resolve("Unable to sync but issue logged to db correctly.");
                })
                .catch((saveError) => {
                    reject(new Error("Failed to sync account " + this._id +
                        " and failed to save failure in database " + saveError));
                });
        });
    });
};

const userSchema = new mongoose.Schema({
    accounts: [linkedAccountSchema],
    email: String,
    isSuperUser: Boolean,
    loginTimestamp: Date,
    passwordHash: String,
    signupTimestamp: Date,
});

userSchema.methods.getAccountByID = function getAccountByID(id) {
    const accList = this.accounts.filter((a) => (a._id + "") === (id + ""));
    return accList.length === 0 ? null : accList[0];
};

const UserModel = mongoose.model("User", userSchema);
export default UserModel;
