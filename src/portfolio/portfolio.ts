import * as express from 'express';
import { loginRequired } from '../auth/auth'
import servicesList from '../wrappers/services'
import { User, Price } from "../models";
import { Portfolio } from '../wrappers'
import * as clone from 'clone';
import * as Big from 'big.js'

var router = express.Router()
export default router


// Get poloniex data
router.get('/', loginRequired, (req, res) => {
    //Redirect to account in case of API key not setup
    if (!req.user.accounts.length) {
        res.redirect('/account')
    }

    // Make requests to apis of all user accounts
    var historyPromises: [Promise<Portfolio[]>] = req.user.accounts.map(a => {
        var service = servicesList.filter(s => s.key == a.service)[0]
        var wrapper = new service.wrapper(service.serverAuth, a.userAuth)

        return wrapper.returnPortfolioHistory()
    })

    // Wait for all wrappers to return and then process
    Promise.all(historyPromises).then(portfolioHistories => {

        // Find the date of the first portfolio of all users accounts
        var earliestPortfolio = portfolioHistories.reduce((acc, b) => {
            return acc[0].timestamp < b[0].timestamp ? acc : b
        })[0]

        var currencyPairs = new Set(portfolioHistories.reduce((acc, b) => {
            return acc.concat(b.reduce((accu, p) => {
                return accu.concat(p.balances.map(c => "BTC_" + c.currency))
            }, []))
        }, []))

        // Fetch historic prices for all traded currencies
        let prices = []
        Price.aggregate([
            {
                $match: {
                    'currency_pair': { $in: Array.from(currencyPairs) },
                    'date': { $gt: earliestPortfolio.timestamp }
                }
            },
            {
                $project: {
                    yearMonthDay: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                    currency_pair: "$currency_pair",
                    daily_average: "$daily_average"
                }
            },
            {
                $group: {
                    _id: "$yearMonthDay",
                    prices: { $push: { currency_pair: "$currency_pair", daily_average: "$daily_average" } }
                }
            },
            {
                $sort: {
                    _id: 1
                }
            }
        ]).cursor({}).exec()
            .on('data', doc => prices.push(doc))
            .on('end', _ => {

                // Helper function to get the user's portfolio at a certain time
                var portfolioAtTime = (portfolioHistory: Portfolio[], time: Date) => {
                    var filteredPortfolios = portfolioHistory.filter(p => p.timestamp < time)
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    return filteredPortfolios.length ? filteredPortfolios[0] : new Portfolio([], portfolioHistory[0].timestamp)
                }

                var portfolioHistoriesProcessed = portfolioHistories.map(ph => {
                    return prices.map(price => {
                        // Get users portfolio on date
                        var pd_sp = price._id.split('-')
                        var price_date = new Date(pd_sp[0], pd_sp[1] - 1, pd_sp[2])
                        var p = clone(portfolioAtTime(ph, price_date))
                        p.timestamp = price_date

                        p.balances.forEach(b => {
                            if (b.currency == "BTC") {
                                b.btcValue = b.amount
                                return;
                            }
                            else if (b.currency == "USDT") {
                                b.btcValue = "0.0"
                                return;
                            }

                            var b_price = price.prices.filter(p => p.currency_pair == "BTC_" + b.currency)[0]

                            if (typeof (b_price) != 'undefined') {
                                b.btcValue = new Big(b_price.daily_average).times(b.amount).toFixed(10)
                            } else {
                                b.btcValue = '0.0'
                            }
                        })
                        return p
                    })
                })
                res.render('portfolio/portfolio', { portfolioHistories: portfolioHistoriesProcessed });
            }).catch(err => res.render('portfolio/portfolio', { err }))
    })
});

