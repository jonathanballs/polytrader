import * as express from 'express';
import * as clone from 'clone';
import * as Big from 'big.js'
import * as mongoose from 'mongoose'

import Etherscan from '../wrappers/etherscan-wrapper'
import { Portfolio } from '../wrappers'
import { loginRequired, loginRequiredApi } from '../auth/auth'
import servicesList from '../wrappers/services'

import UserModel from '../models/user'
import PortfolioEventHistoryModel from '../models/portfolio'
import PriceModel from '../models/price'

var router = express.Router()
export default router


router.get('/api/portfolio-history', loginRequiredApi, (req, res) => {
    // Fetch event histories from db
    var eventHistoryPromises = req.user.accounts.map(a => {
        return PortfolioEventHistoryModel.findOneOrCreate(
            { accountID: a._id }
        )
    })
    Promise.all(eventHistoryPromises).then(eventHistories => {
        Promise.all(eventHistories.map(eh => {
            return (<any>eh).getAnnotatedPortfolioHistory(86400 / 2)
        })).then(portfolioHistories => {
            res.send(portfolioHistories)
        }).catch(err => console.log("Error annotating history", err))
    }).catch(err => console.log("Error getting history ", err))

})

router.get('/api/update-portfolios/', loginRequiredApi, (req, res) => {
    var updateStatuses = {}

    var updatePromises = req.user.accounts.map(a => {
        return a.sync()
        .then(_ => {
            console.log("Service ", a.service, "succeeded")
            updateStatuses[a._id] = {service: a.service, success: true}
        })
        .catch(err => {
            console.log("Service ", a.service, "failed: ", err)
            updateStatuses[a._id] = {service: a.service, success: false, reason: err}
        })
    })

    Promise.all(updatePromises)
    .then(_ => {
        req.user.save()
        res.send(updateStatuses)
    })
    .catch(_ => {
        req.user.save()
        res.send(updateStatuses)
    })
})

// Get poloniex data
router.get('/', loginRequired, (req, res) => {
    res.render('portfolio/portfolio')
});
