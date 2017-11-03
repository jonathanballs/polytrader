import * as express from 'express';
import { loginRequired } from '../auth/auth'
import servicesList from '../wrappers/services'
import { UserModel, PriceModel } from "../models";
import { Portfolio } from '../wrappers'
import * as clone from 'clone';
import * as Big from 'big.js'
import * as mongoose from 'mongoose'

import Etherscan from '../wrappers/etherscan-wrapper'
import { PortfolioEventHistoryModel } from '../models'

var router = express.Router()
export default router


// Get poloniex data
router.get('/', loginRequired, (req, res) => {
    //Redirect to account in case of API key not setup
    if (!req.user.accounts.length) {
        res.redirect('/account')
        return
    }

    // Update the accounts
    req.user.accounts.forEach(a => {
        var service = servicesList.filter(s => s.key == a.service)[0]
        var wrapper = new service.wrapper(service.serverAuth, a.userAuth)
        wrapper.returnHistory().then(his => {
            wrapper.returnBalances().then(balances => {
                // Update account balances
                UserModel.findOneAndUpdate(
                    { "_id": req.user._id, 
                        "accounts._id": a._id },
                    {
                        $set: { "accounts.$.balances": balances }
                    }, (err) => {
                        if (err)
                            console.log("Error finding account events" + err)
                    })



                PortfolioEventHistoryModel.findOneOrCreate({accountID: a._id})
                .then(peh => {
                    var lastTimestamp = peh.events.length 
                        ? peh.events[peh.events.length-1].timestamp
                        : new Date(0)
                    his = his.filter(ev => ev.timestamp > lastTimestamp)

                    PortfolioEventHistoryModel.update(
                        {_id: peh._id},
                        { $push: { events: { $each : his } } }).then().catch( err => {
                            console.log(err)
                        })

                    }).catch(err => console.log("returnHistory error :" + err))
            }).catch(err => console.log("returnHistory error :" + err))
        }).catch(err => console.log("returnHistory error :" + err))
    })

    // Fetch event histories from db
    var eventHistoryPromises = req.user.accounts.map(a => {
        return PortfolioEventHistoryModel.findOneOrCreate(
            { accountID: a._id }
        )
    })
    Promise.all(eventHistoryPromises).then(eventHistories => {
        Promise.all(eventHistories.map(eh => {
            return eh.getAnnotatedPortfolioHistory()
        })).then(portfolioHistories => {
            res.render('portfolio/portfolio', { portfolioHistories })
        })
    })
});
