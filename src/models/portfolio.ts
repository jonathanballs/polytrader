// Beware. This code is MEGA cancer
// Mongoose models
import * as mongoose from 'mongoose'
import * as clone from 'clone'
import * as Big from 'big.js'
import { Portfolio, Balance } from '../wrappers'
import servicesList from '../wrappers/services'

import PriceModel from './price'
import UserModel from './user'

// PortfolioEvents Schema
var depositWithdrawal = new mongoose.Schema({
    currency: String,
    amount: String,
    txid: String,
    address: String,
    fees: String
})

var trade = new mongoose.Schema({
    soldCurrency: String,
    boughtCurrency: String,
    soldAmount: String,
    boughtAmount: String,
    rate: String,
    fee: String
})

var portfolioEventSchema = new mongoose.Schema({
    type: String,
    timestamp: Date,
    permanent: Boolean,
    data: mongoose.Schema.Types.Mixed
})

var portfolioEventHistorySchema = new mongoose.Schema({
    accountID: mongoose.Schema.Types.ObjectId,
    events: [portfolioEventSchema]
})

portfolioEventHistorySchema.statics.findOneOrCreate = function (condition, doc) {
    const self = this;
    return new Promise((resolve, reject) => {
        self.findOne(condition, (err, peh) => {
            if (peh) {
                resolve(peh)
                return
            } else {
                resolve(self.create({
                    accountID: condition.accountID,
                    events: []
                }, (err, peh) => {
                    resolve(peh)
                }))
            }
        })
    })
};

// Convert event history to a portfolio history
portfolioEventHistorySchema.methods.getPortfolioHistory =
    function getPortfolioHistory(
        resolution: Number = 86400,                 // One day
        from = new Date(0),                         // Start of portfolio
        to = new Date()): Promise<Portfolio[]>      // Today
    {
        return new Promise<Portfolio[]>((resolve, reject) => {

            if (!this.events.length) {
                resolve([])
                return
            }
            // Construct portfolio history based on portfolio events

            var portfolioHistory: Portfolio[] = new Array()
            this.events.forEach(ev => {
                var portfolio = portfolioHistory.length
                    ? clone(portfolioHistory[portfolioHistory.length - 1])
                    : new Portfolio([], ev.timestamp)

                portfolio.timestamp = ev.timestamp

                if (ev.type == 'deposit') {
                    var oldBalance = portfolio.balanceOf(ev.data.currency)
                    oldBalance.amount = Big(oldBalance.amount)
                        .plus(ev.data.amount)
                        .toFixed(16)
                }
                else if (ev.type == 'withdrawal') {
                    var oldBalance = portfolio.balanceOf(ev.data.currency)
                    oldBalance.amount = Big(oldBalance.amount)
                        .minus(ev.data.amount)
                        .toFixed(16)
                }
                else if (ev.type == 'trade') {
                    var oldBoughtBalance = portfolio.balanceOf(ev.data.boughtCurrency)
                    var oldSoldBalance = portfolio.balanceOf(ev.data.soldCurrency)

                    oldBoughtBalance.amount = Big(oldBoughtBalance.amount)
                        .plus(ev.data.boughtAmount)
                        .minus(ev.data.fees)
                        .toFixed(15)

                    oldSoldBalance.amount = Big(oldSoldBalance.amount)
                        .minus(ev.data.soldAmount)
                        .toFixed(15)
                }
                portfolioHistory.push(portfolio)
            })

            // Get list of currencies in portfolio
            // Error correction
            // Sometimes exchange and polytrader bugs lead to missing events.
            // This should identify, report and (hopefully) correct them
            UserModel.findOne({ "accounts._id": this.accountID }, (err, user) => {
                if (!portfolioHistory.length) {
                    return
                }

                // Create a list of all currencies
                let currenciesSet = new Set()
                var realBalances = user.accounts[0].balances
                realBalances.forEach(b => currenciesSet.add(b.currency))
                portfolioHistory[portfolioHistory.length - 1].balances
                    .forEach(b => currenciesSet.add(b.currency))

                // Only fix significant discrepancies
                var balanceDiscrepencies = Array.from(currenciesSet).map(c => {
                    // rb: real balance, cb: calculated balance
                    var rb_list = realBalances.filter(b => b.currency == c)
                    var rb: number = parseFloat(rb_list.length == 0 ? '0.0' : rb_list[0].amount)

                    var cb: number = parseFloat(
                        portfolioHistory[portfolioHistory.length - 1]
                            .balanceOf(c).amount)

                    return { c, rb, cb, diff: cb - rb }
                }).filter(b => Math.abs(b.rb - b.cb) > 0.001)

                // Rename antcoin to neocoin
                for (var p of portfolioHistory) {
                    var antBalance = p.balances.filter(b => b.currency == 'ANS')[0]
                    if (antBalance) {
                        var neoBalance = p.balanceOf("NEO")
                        neoBalance.amount = Big(neoBalance.amount).plus(antBalance.amount).toFixed(15)
                        // Remove antshares
                        p.balances = p.balances.filter(b => b.currency != 'ANS')
                    }
                }

                // Find first impossible portfolio and fix errors
                outerloop:
                for (var p of portfolioHistory) {
                    for (var currency of p.balances) {
                        if (parseFloat(currency.amount) < 0.0) {

                            // Create a new portfolio
                            var newPortfolio = clone(p)
                            newPortfolio.timestamp = new Date(newPortfolio.timestamp.getTime() + 1)
                            { (<any>newPortfolio).event = null }
                            portfolioHistory.push(newPortfolio)

                            // Update portfolios
                            portfolioHistory
                                .filter(p => {
                                    return p.timestamp > newPortfolio.timestamp
                                })
                                .forEach(p => {
                                    for (var bDiscrep of balanceDiscrepencies) {
                                        p.balanceOf(bDiscrep.c).amount =
                                            Big(p.balanceOf(bDiscrep.c).amount)
                                                .minus(bDiscrep.diff).toFixed(20)
                                    }
                                })

                            break outerloop;
                        }
                    }
                }

                resolve(portfolioHistory)
            })
        })
    }


// Convert event history to an annotated portfolio history which includes
// btcValue's for every balance
portfolioEventHistorySchema.methods.getAnnotatedPortfolioHistory =
    function getAnnotatedPortfolioHistory(
        resolution: Number = 86400,                 // One day
        from = new Date(0),                         // Start of portfolio
        to = new Date()): Promise<Portfolio[]>      // Today
    {

        return new Promise<Portfolio[]>((resolve, reject) => {

            var portfolioHistoryPromise = this.getPortfolioHistory(resolution, from, to)

            this.getPortfolioHistory(resolution, from, to).then(
                (portfolioHistory: Portfolio[]) => {

                    // Make sure that is not an empty portfolio History
                    if (!portfolioHistory.length) {
                        resolve([])
                        return
                    }

                    // Limit range to that of the portfolio
                    if (portfolioHistory[0].timestamp > from)
                        from = portfolioHistory[0].timestamp

                    var currencyPairs = Array.from(new Set(portfolioHistory.map(p => {
                        return p.balances.map(b => 'BTC_' + b.currency)
                    }).reduce((acc, p) => acc.concat(p), [])))


                    PriceModel.getPriceHistory(currencyPairs, resolution, from, to).then(prices => {
                        // Helper function to get the user's portfolio at a certain time
                        var portfolioAtTime = (portfolioHistory: Portfolio[],
                            time: Date) => {
                            var filteredPortfolios = portfolioHistory
                                .filter(p => p.timestamp < time)
                                .sort((a, b) => b.timestamp.getTime() -
                                    a.timestamp.getTime())

                            return filteredPortfolios.length
                                ? filteredPortfolios[0]
                                : new Portfolio([], portfolioHistory[0].timestamp)
                        }

                        var portfolioHistoriesProcessed = prices.map(price => {
                            // Get users portfolio on date

                            var p = clone(portfolioAtTime(portfolioHistory, price.timestamp))
                            p.timestamp = price.timestamp

                            p.balances.forEach(b => {
                                if (b.currency == "BTC") {
                                    b.btcValue = b.amount
                                    return;
                                }
                                else if (b.currency == "USDT") {
                                    b.btcValue = "0.0"
                                    return;
                                }
                                else {
                                    var b_price = price.prices["BTC_" + b.currency]
                                    if (b_price) {
                                        b.btcValue = Number(b_price * parseFloat(b.amount)).toFixed(15)
                                    } else {
                                        b.btcValue = "0.0"
                                    }
                                }
                            })

                            return p
                        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

                        resolve(portfolioHistoriesProcessed)
                    })
                }).catch(err => reject(err))
        })
    }


export default mongoose.model('portfolio_event_history', portfolioEventHistorySchema)
