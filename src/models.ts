// Mongoose models
import * as mongoose from 'mongoose'
import * as clone from 'clone'
import * as Big from 'big.js'
import { Portfolio, Balance } from './wrappers'

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
var userSchema = new mongoose.Schema({
    email: String,
    loginTimestamp: Date,
    signupTimestamp: Date,
    accounts: [linkedAccountSchema],
    passwordHash: String
});
export var UserModel = mongoose.model('User', userSchema);

// Historical price schema
var priceSchema = new mongoose.Schema({
    date: Date,
    currency_pair: String,
    price: Number
}, { collection: 'price_history' })
export var PriceModel = mongoose.model('Price', priceSchema);


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
                resolve(self.create({accountID: condition.accountID,
                                                events: []}, (err, peh) => {
                                                            resolve(peh)
                                                        }))
            }
        })
    })
};

// Convert event history to a portfolio history
portfolioEventHistorySchema.methods.getAnnotatedPortfolioHistory =
    function getAnnotatedPortfolioHistory(): Promise<Portfolio[]> {

        return new Promise<Portfolio[]>((resolve, reject) => {

            if (!this.events.length) {
                resolve([])
                return
            }

            // Construct portfolio history based on portfolio events
            var portfolioHistory: Portfolio[] = new Array()
            this.events.forEach(ev => {
                var portfolio = portfolioHistory.length
                    ? clone(portfolioHistory[portfolioHistory.length-1])
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
            var currencyPairs = new Set(portfolioHistory.map(p => {
                return p.balances.map(b => 'BTC_' + b.currency)
            }).reduce((acc, p) => acc.concat(p), []))

            // Error correction
            // Sometimes exchange and polytrader bugs lead to missing events.
            // This should identify, report and (hopefully) correct them
            UserModel.findOne({ "accounts._id": this.accountID } , (err, user) => {
                if(!portfolioHistory.length) {
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

                // Perform price annotation
                let prices = []
                PriceModel.aggregate([
                    {
                        $match: {
                            'currency_pair': { $in: Array.from(currencyPairs) },
                            'date': { $gt: portfolioHistory[0].timestamp }
                        }
                    },
                    {
                        $project: {
                            yearMonthDay: {
                                $dateToString: {
                                    format: "%Y-%m-%d", date: "$date"
                                }
                            },
                            currency_pair: "$currency_pair",
                            daily_average: "$daily_average"
                        }
                    },
                    {
                        $group: {
                            _id: "$yearMonthDay",
                            prices: {
                                $push: {
                                    currency_pair: "$currency_pair",
                                    daily_average: "$daily_average"
                                }
                            }
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
                            var pd_sp = price._id.split('-')
                            var price_date = new Date(pd_sp[0], pd_sp[1] - 1, pd_sp[2])
                            var p = clone(portfolioAtTime(portfolioHistory, price_date))
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

                                var b_price = price.prices.filter(p => {
                                    return p.currency_pair == "BTC_" + b.currency
                                })[0]

                                if (typeof (b_price) != 'undefined') {
                                    b.btcValue = new Big(b_price.daily_average)
                                        .times(b.amount)
                                        .toFixed(10)
                                } else {
                                    b.btcValue = '0.0'
                                }
                            })
                            return p
                        })

                        resolve(portfolioHistoriesProcessed)
                    })
            }).catch( err => reject(err) )
        })
    }

export var PortfolioEventHistoryModel = mongoose.model(
    'portfolio_event_history', portfolioEventHistorySchema)
