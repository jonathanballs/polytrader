// Task processing for polytrader
import axios from "axios";
import * as kue from "kue";
import * as print from "sprintf-js";
import PriceModel from "./models/price";
import UserModel from "./models/user";

// Connect to redis
const queue = kue.createQueue({
    redis: {
        host: "redis",
    },
});

queue.process("sync-account", (job, done) => {

    UserModel.findOne(
        { "accounts._id": job.data.accountID },
        { "accounts.$": 1 },
    )
        .then((user) => {
            return user.accounts[0].sync();
        })
        .then(() => {
            console.log(job.data.title, " DONE ");
            done();
        })
        .catch((err) => {
            console.log("Tried to update account with ID of", job.data.id,
                "but recieved error: ", err);
            done();
        });
});

const POLONIEX_PRICE_HISTORY_URL = "https://poloniex.com/public?" +
       "command=returnChartData&currencyPair=BTC_%s&start=%d&end=%d&period=300";

queue.process("update-price-history", (job, done) => {
    console.log("Updating price history for " + job.data.currency.symbol);

    const currency = job.data.currency;
    let startDate = 0;

    PriceModel.find(
    {
        currency_pair: "BTC_" + currency.symbol,
    }).sort({ date: -1 })
    .limit(1)
    .exec()
    .then((prices) => {
        startDate = prices.length
            ? Math.round(+prices[0].date / 1000)
            : 0;

        const endDate = Math.round(+new Date() / 1000);
        const url = print.sprintf(POLONIEX_PRICE_HISTORY_URL,
            currency.symbol, startDate, endDate);
        return axios.get(url);
    })
    .then((res) => {
        const data = res.data;
        const currentFillDate = new Date(res.data[0].date * 1000);
        const dateRanges = [];
        while (currentFillDate < new Date(res.data[res.data.length - 1].date * 1000)) {

            const range = {
                end: null,
                start: new Date(currentFillDate),
            };
            currentFillDate.setDate(currentFillDate.getDate() + 1);

            range.end = new Date(currentFillDate);
            dateRanges.push(range);
        }

        const insertPromises = dateRanges.map((dateRange) => {
            return new Promise((resolve, reject) => {
                PriceModel.findOne( {
                    currency_pair: "BTC_" + currency.symbol,
                    date: dateRange.start,
                })
                .then((pm) => {
                    if (!pm) {
                        pm = new PriceModel({
                            currency_pair: "BTC_" + currency.symbol,
                            date: new Date(dateRange.start),
                            period: 300,
                        });
                    }

                    pm.price_history = data.filter((d) => {
                        return dateRange.start / 1000 <= d.date
                                && d.date < dateRange.end / 1000;
                    })
                    .map((d) => d.open);
                    pm.daily_average = pm.price_history.reduce((a, b) => a + b, 0) / pm.price_history.length;

                    pm.save()
                    .then((c) => resolve() )
                    .catch((err) => reject(err));
                })
                .catch((err) => {
                    reject(err);
                });
            });
        });

        Promise.all(insertPromises)
        .then(() => { done(); })
        .catch((err) => {
            console.log("Error inserting promises to database", err);
            done();
        });
    })
    .catch((err) => {
        console.log("Failed update price history of ", currency.symbol, err);
        done();
    });
});

export default queue;
