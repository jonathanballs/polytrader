// Mongoose models
import * as mongoose from 'mongoose'
import * as clone from 'clone'
import * as Big from 'big.js'
import { Portfolio, Balance } from '../wrappers'
import servicesList from '../wrappers/services'

import PortfolioEventHistoryModel from './portfolio'

// User schema
var balanceSchema = mongoose.Schema({
    currency: String,
    balance: String
})

var linkedAccountSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    service: String, // Rename this to serviceKey
    timestampCreated: Date,
    userAuth: mongoose.Schema.Types.Mixed,
    balances: [mongoose.Schema.Types.Mixed],

    timestampLastSync: Date,
    lastSyncWasSuccessful: Boolean,
    lastSyncErrorMessage: String,
})

linkedAccountSchema.methods.sync = function sync() {

    return new Promise((resolve, reject) => {
        var service = servicesList.filter(s => s.key == this.service)[0]
        var wrapper = new service.wrapper(service.serverAuth, this.userAuth)
        wrapper.returnHistory().then(his => {
            wrapper.returnBalances().then(balances => {

                // Update account balances
                UserModel.findOneAndUpdate(
                    { "accounts._id": this._id },
                    {
                        $set: {
                            "accounts.$.balances": balances,
                            "accounts.$.timestampLastSync": new Date,
                            "accounts.$.lastSyncWasSuccessful": true,
                            "accounts.$.lastSyncErrorMessage": null
                        }
                    }, (err) => {
                        if (err) {
                            reject("Error updating account balance in db" + err)
                        }
                    })

                PortfolioEventHistoryModel.findOneOrCreate({ accountID: this._id })
                    .then(peh => {
                        var lastTimestamp = peh.events.length
                            ? peh.events[peh.events.length - 1].timestamp
                            : new Date(0)

                        his = his.filter(ev => ev.timestamp > lastTimestamp)

                        PortfolioEventHistoryModel.update(
                            { _id: peh._id },
                            { $push: { events: { $each: his } } })
                        .then(_ => {
                            resolve()
                        }).catch(err => {
                            reject("Error inserting portfolio history into db:" + err)
                        })

                    }).catch(err => reject(err))
                }).catch(err => reject(err))
        }).catch(err => {

            // Save failure details to database
            UserModel.findOneAndUpdate(
                { "accounts._id": this._id },
                { $set: {
                        "accounts.$.timestampLastSync": new Date,
                        "accounts.$.lastSyncWasSuccessful": false,
                        "accounts.$.lastSyncErrorMessage": err + '',
                    }
                }
            ).catch(err => {
                console.log("Failed to update account lastSyncStatus.")
            })

            reject(err)
        })
    })
}

var userSchema = new mongoose.Schema({
    email: String,
    loginTimestamp: Date,
    signupTimestamp: Date,
    accounts: [linkedAccountSchema],
    passwordHash: String
});

var UserModel = mongoose.model('User', userSchema);
export default UserModel
