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
        })
    })

})

router.get('/api/update-portfolios/', loginRequiredApi, (req, res) => {
    req.user.accounts.forEach(a => {
        a.sync().then(_ => { res.send("success") })
    })
})

// Get poloniex data
router.get('/', loginRequired, (req, res) => {
    res.render('portfolio/portfolio')
});
