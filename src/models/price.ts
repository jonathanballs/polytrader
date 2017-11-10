// Beware. This code is MEGA cancer
// Mongoose models
import * as mongoose from 'mongoose'
import * as clone from 'clone'
import * as Big from 'big.js'
import { Portfolio, Balance } from '../wrappers'
import servicesList from '../wrappers/services'

// Historical price schema
var priceSchema = new mongoose.Schema({
    date: Date,
    currency_pair: String,
    daily_average: Number,
    period: Number,
    price_history: [mongoose.Schema.Types.Mixed],
}, { collection: 'price_history' })

priceSchema.statics.getPriceHistory =
    function getPriceHistory(
        currencies: string[],
        resolution: number = 86400,          // One day
        from = new Date(0),                  // Start of portfolio
        to = new Date())                     // Today
    {
        return new Promise((resolve, reject) => {

            let prices = []
            this.aggregate([
                {
                    $match: {
                        'currency_pair': { $in: currencies },
                        'date': { $gte: from, $lte: to }
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
                        price_history: "$price_history",
                    }
                },
                {
                    $group: {
                        _id: "$yearMonthDay",
                        prices: {
                            $push: {
                                currency_pair: "$currency_pair",
                                price_history: "$price_history",
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

                    prices = prices.map(currencyDayPrices => {
                        // return list of prices
                        // price = {date, prices: [currency: price]}
                        var pd_sp = currencyDayPrices._id.split('-')
                        var price_date = new Date(pd_sp[0], pd_sp[1] - 1, pd_sp[2])

                        var newPricesList = []
                        var numElementsNeeded = Math.floor(86400 / resolution)
                        for (var i = 0; i < numElementsNeeded; i++) {

                            var accuratePricesList = {
                                timestamp: new Date(price_date.getTime() + i * resolution * 1000),
                                prices: {}
                            }

                            currencyDayPrices.prices.forEach(priceHistory => {
                                accuratePricesList.prices[priceHistory.currency_pair] =
                                    priceHistory.price_history[Math.floor(
                                        (i / numElementsNeeded) * priceHistory.price_history.length)]
                            })

                            newPricesList.push(accuratePricesList)
                        }

                        return newPricesList
                    }).reduce((prev, acc) => acc.concat(prev), [])

                    resolve(prices)
                })
        })
    }

export default mongoose.model('Price', priceSchema);
