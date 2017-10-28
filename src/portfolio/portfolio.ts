import * as express from 'express';
import {loginRequired} from '../auth/auth'
import servicesList from '../wrappers/services'
import { User, Price } from "../models";
import * as clone from 'clone';
import * as Big from 'big.js'

var router = express.Router()
export default router


// Get poloniex data
router.get('/', loginRequired, (req, res) => {
    //Redirect to account in case of API key not setup
    if(!req.user.accounts.length) {
        res.redirect('/account')
    }

    var accountService = req.user.accounts[0].service
    var wrapper = servicesList.filter(s => s.key == accountService)[0]

    var p = new wrapper.wrapper(wrapper.serverAuth, req.user.accounts[0].userAuth)

    p.returnBalances().then(balances => {
        p.returnPortfolioHistory().then(portfolioHistory => {

            // Find list of all currency pairs
            var all_pairs = new Set()
            portfolioHistory.map(p => {
                p.balances.map(b => { all_pairs.add("BTC_" + b.currency) })
            })

            // Fetch historic prices from database
            let prices = []
            Price.aggregate([
                {$match: {
                        'currency_pair': {$in : Array.from(all_pairs)},
                        'date': {$gt : portfolioHistory[0].timestamp}
                }},
                {$project: {
                    yearMonthDay: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    currency_pair: "$currency_pair",
                    daily_average: "$daily_average"
                }},
                {$group: {
                    _id: "$yearMonthDay",
                    prices: { $push: { currency_pair: "$currency_pair", daily_average: "$daily_average"}}
                }},
                {$sort: {
                    _id: 1
                }}
            ]).cursor({}).exec()
            .on('data', doc => prices.push(doc))
            .on('end', _ => {

                // Helper function to get the user's portfolio at a certain time
                var portfolioAtTime = (time: Date) => {
                    return portfolioHistory.filter(p => p.timestamp < time )
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
                }

                var portfolioHistoryProcessed = prices.map(price => {
                    // Get users portfolio on date
                    var pd_sp = price._id.split('-')
                    var price_date = new Date(pd_sp[0], pd_sp[1]-1, pd_sp[2])
                    var p = clone(portfolioAtTime(price_date))
                    p.timestamp = price_date

                    p.balances.forEach(b => {
                        if (b.currency == "BTC") {
                            b.btcValue = b.amount
                            return;
                        }
                        else if(b.currency == "USDT") {
                            b.btcValue = "0.0"
                            return;
                        }

                        var b_price = price.prices.filter(p => p.currency_pair == "BTC_" + b.currency)[0]

                        if(typeof(b_price) != 'undefined') {
                            b.btcValue = new Big(b_price.daily_average).times(b.amount).toFixed(10)
                        } else {
                            b.btcValue = '0.0'
                        }
                    })
                    return p
                })

                res.render('portfolio/portfolio', {balances, portfolioHistory: portfolioHistoryProcessed});
            })
        }).catch(err => res.render('portfolio/portfolio', {err}))
    }).catch(err => res.render('portfolio/portfolio', {err}))
});

