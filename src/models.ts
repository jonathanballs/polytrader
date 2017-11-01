// Mongoose models
import * as mongoose from 'mongoose'
import * as clone from 'clone'
import * as Big from 'big.js'
import { Portfolio, Balance } from './wrappers'

// User schema
var linkedAccountSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    service: String, // Rename this to serviceKey
    timestampCreated: Date,
    timestampLastSuccessfulSync: Date,
    userAuth: mongoose.Schema.Types.Mixed
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
    base: String,
    quote: String,
    rate: String,
    baseAmount: String,
    quoteAmount: String,
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

            // Convert events to portfolios
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
                portfolioHistory.push(portfolio)
            })

            // Get list of currencies in portfolio
            var currencyPairs = new Set(portfolioHistory.map(p => {
                return p.balances.map(b => 'BTC_' + b.currency)
            }).reduce((acc, p) => acc.concat(p)))

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
                    var portfolioAtTime = (portfolioHistory: Portfolio[], time: Date) => {
                        var filteredPortfolios = portfolioHistory
                            .filter(p => p.timestamp < time)
                            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

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
        })
    }

export var PortfolioEventHistoryModel = mongoose.model(
    'portfolio_event_history', portfolioEventHistorySchema)
