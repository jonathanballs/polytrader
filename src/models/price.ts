// Beware. This code is MEGA cancer
// Mongoose models
import * as Big from "big.js";
import * as clone from "clone";
import * as mongoose from "mongoose";
import { Balance, Portfolio } from "../wrappers";
import servicesList from "../wrappers/services";

// Historical price schema
const priceSchema = new mongoose.Schema({
    currency_pair: String,
    daily_average: Number,
    date: Date,
    period: Number,
    price_history: [mongoose.Schema.Types.Mixed],
}, { collection: "price_history" });

priceSchema.statics.getPriceHistory =
    function getPriceHistory(
        currencies: string[],
        resolution: number = 86400,          // One day
        from = new Date(0),                  // Start of portfolio
        to = new Date()) {

        return new Promise((resolve, reject) => {

            let prices = [];
            this.aggregate([
                {
                    $match: {
                        currency_pair: { $in: currencies },
                        date: { $gte: from, $lte: to },
                    },
                },
                {
                    $project: {
                        currency_pair: "$currency_pair",
                        price_history: "$price_history",
                        yearMonthDay: {
                            $dateToString: {
                                date: "$date", format: "%Y-%m-%d",
                            },
                        },
                    },
                },
                {
                    $group: {
                        _id: "$yearMonthDay",
                        prices: {
                            $push: {
                                currency_pair: "$currency_pair",
                                price_history: "$price_history",
                            },
                        },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]).cursor({}).exec()
                .on("data", (doc) => prices.push(doc))
                .on("end", () => {

                    prices = prices.map((currencyDayPrices) => {
                        // return list of prices
                        // price = {date, prices: [currency: price]}
                        const priceDate = new Date(currencyDayPrices._id);

                        const newPricesList = [];
                        const numElementsNeeded = Math.floor(86400 / resolution);
                        for (let i = 0; i < numElementsNeeded; i++) {

                            const accuratePricesList = {
                                prices: {},
                                timestamp: new Date(priceDate.getTime() + i * resolution * 1000),
                            };

                            currencyDayPrices.prices.forEach((priceHistory) => {
                                accuratePricesList.prices[priceHistory.currency_pair] =
                                    priceHistory.price_history[Math.floor(
                                        (i / numElementsNeeded) * priceHistory.price_history.length)];
                            });

                            newPricesList.push(accuratePricesList);
                        }

                        return newPricesList;
                    }).reduce((prev, acc) => acc.concat(prev), []);

                    resolve(prices);
                });
        });
    };

export default mongoose.model("Price", priceSchema);
