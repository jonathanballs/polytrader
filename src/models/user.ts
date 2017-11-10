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
    timestampLastSuccessfulSync: Date,
    userAuth: mongoose.Schema.Types.Mixed,
    balances: [mongoose.Schema.Types.Mixed]
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
                            "accounts.$.timestampLastSuccessfulSync": new Date
                        }
                    }, (err) => {
                        if (err)
                            console.log("Error finding account events" + err)
                    })

                PortfolioEventHistoryModel.findOneOrCreate({ accountID: this._id })
                    .then(peh => {
                        var lastTimestamp = peh.events.length
                            ? peh.events[peh.events.length - 1].timestamp
                            : new Date(0)

                        his = his.filter(ev => ev.timestamp > lastTimestamp)
                        PortfolioEventHistoryModel.update(
                            { _id: peh._id },
                            { $push: { events: { $each: his } } }).then().catch(err => {
                                console.log(err)
                            })

                        resolve()
                    }).catch(err => reject(err))
            }).catch(err => reject(err))
        }).catch(err => reject(err))
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
