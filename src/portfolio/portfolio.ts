import * as express from 'express';
import { loginRequired } from '../auth/auth'
import servicesList from '../wrappers/services'
import { UserModel, PriceModel } from "../models";
import { Portfolio } from '../wrappers'
import * as clone from 'clone';
import * as Big from 'big.js'

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

    // Update portfolio histories
    var historyPromises: [Promise<Portfolio[]>] = req.user.accounts.map(a => {
        var service = servicesList.filter(s => s.key == a.service)[0]
        var wrapper = new service.wrapper(service.serverAuth, a.userAuth)

        // Update the event database
        PortfolioEventHistoryModel.findOneOrCreate({accountID: a._id}).then(peh => {

            // Only get new ones
            var startDate = peh.events.length 
                ? peh.events[peh.events.length-1].timestamp
                : new Date(0)

            wrapper.returnHistory(startDate).then(portfolioHistory => {
                portfolioHistory.forEach(event => {
                    PortfolioEventHistoryModel.update({_id: peh._id},
                        { $push: { events: event } },
                        (err, numAffected, rawResponse) => {
                            console.log(numAffected)
                        }
                    )
                })
            })

            peh.getAnnotatedPortfolioHistory().then(php => {
                res.render('portfolio/portfolio', {portfolioHistories: [php]})
            }).catch(err => res.render('portfolio/portfolio', { err }))
        })

        return wrapper.returnPortfolioHistory()
    })

});

