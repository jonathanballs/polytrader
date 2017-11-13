// Portfolio models. This includes history for portfolio history modelling.
import * as Big from "big.js";
import * as clone from "clone";
import * as mongoose from "mongoose";
import { Balance, Portfolio } from "../wrappers";
import servicesList from "../wrappers/services";

import PriceModel from "./price";
import UserModel from "./user";

// PortfolioEvents Schema
const depositWithdrawal = new mongoose.Schema({
    address: String,
    amount: String,
    currency: String,
    fees: String,
    txid: String,
});

const trade = new mongoose.Schema({
    boughtAmount: String,
    boughtCurrency: String,
    fee: String,
    rate: String,
    soldAmount: String,
    soldCurrency: String,
});

const portfolioEventSchema = new mongoose.Schema({
    data: mongoose.Schema.Types.Mixed,
    permanent: Boolean,
    timestamp: Date,
    type: String,
});

const portfolioEventHistorySchema = new mongoose.Schema({
    accountID: mongoose.Schema.Types.ObjectId,
    events: [portfolioEventSchema],
});

portfolioEventHistorySchema.statics.findOneOrCreate = function(condition, doc) {
    const self = this;

    return new Promise((resolve, reject) => {
        self.findOne(condition, (err, peh) => {
            if (err) {
                reject(err);
                return;
            } else if (peh) {
                resolve(peh);
                return;
            } else {
                self.create({
                    accountID: condition.accountID,
                    events: [],
                }, (err1, newPeh) => {
                    err1 ? reject(err1) : resolve(peh);
                });
            }
        });
    });
};

// Convert event history to a portfolio history
portfolioEventHistorySchema.methods.getPortfolioHistory =
    function getPortfolioHistory(
        resolution: number = 86400,                 // One day
        from = new Date(0),                         // Start of portfolio
        to = new Date()): Promise<Portfolio[]> {
        return new Promise<Portfolio[]>((resolve, reject) => {

            if (!this.events.length) {
                resolve([]);
                return;
            }

            // Construct portfolio history based on portfolio events
            const portfolioHistory: Portfolio[] = new Array();
            this.events.forEach((ev) => {
                const portfolio = portfolioHistory.length
                    ? clone(portfolioHistory[portfolioHistory.length - 1])
                    : new Portfolio([], ev.timestamp);

                portfolio.timestamp = ev.timestamp;

                if (ev.type === "deposit") {
                    const oldBalance = portfolio.balanceOf(ev.data.currency);
                    oldBalance.amount = Big(oldBalance.amount)
                        .plus(ev.data.amount)
                        .toFixed(16);
                } else if (ev.type === "withdrawal") {
                    const oldBalance = portfolio.balanceOf(ev.data.currency);
                    oldBalance.amount = Big(oldBalance.amount)
                        .minus(ev.data.amount)
                        .toFixed(16);
                } else if (ev.type === "trade") {
                    const oldBoughtBalance = portfolio.balanceOf(ev.data.boughtCurrency);
                    const oldSoldBalance = portfolio.balanceOf(ev.data.soldCurrency);

                    oldBoughtBalance.amount = Big(oldBoughtBalance.amount)
                        .plus(ev.data.boughtAmount)
                        .minus(ev.data.fees)
                        .toFixed(15);

                    oldSoldBalance.amount = Big(oldSoldBalance.amount)
                        .minus(ev.data.soldAmount)
                        .toFixed(15);
                }

                portfolioHistory.push(portfolio);
            });

            UserModel.findOne({ "accounts._id": this.accountID }, (err, user) => {
                const account = user.getAccountByID(this.accountID);

                if (!portfolioHistory.length) {
                    return;
                }

                // Rename antcoin to neocoin
                for (const p of portfolioHistory) {
                    const antBalance = p.balances.filter((b) => b.currency === "ANS")[0];
                    if (antBalance) {
                        const neoBalance = p.balanceOf("NEO");
                        neoBalance.amount = Big(neoBalance.amount).plus(antBalance.amount).toFixed(15);
                        // Remove antshares
                        p.balances = p.balances.filter((b) => b.currency !== "ANS");
                    }
                }

                // Error correction. First we find a list of all the currenciesA
                // that exist both in the users' real balances and their balances
                // according to our modelling. We then detect discrepencies and
                // attempt to correct them. In the future discrepencies should be
                // logged in order help notice patterns and bugs in portfolio
                // modelling.
                const currenciesSet = new Set<string>(account.balances.map((b) => b.currency));
                portfolioHistory[portfolioHistory.length - 1].balances
                    .forEach((b) => currenciesSet.add(b.currency));

                // Create a list of discrepencies detailing, real balance, calculated
                // balance and their difference for each balance. Insignificant
                // discrepencies are ignored.
                const balanceDiscrepencies = Array.from(currenciesSet).map((c) => {
                    const rbList = account.balances.filter((b) => b.currency === c);

                    const rb: number = parseFloat(rbList.length === 0
                        ? "0.0" : rbList[0].amount);
                    const cb: number = parseFloat(
                        portfolioHistory[portfolioHistory.length - 1]
                            .balanceOf(c).amount);

                    return { c, rb, cb, diff: cb - rb };
                }).filter((b) => Math.abs(b.rb - b.cb) > 0.001);

                // Find first impossible portfolio and fix errors
                outerloop:
                for (const p of portfolioHistory) {
                    for (const b of p.balances) {
                        if (parseFloat(b.amount) < 0.0) {

                            // Create a new portfolio
                            const newPortfolio = clone(p);
                            newPortfolio.timestamp = new Date(
                                newPortfolio.timestamp.getTime() + 1);
                            { (newPortfolio as any).event = null; }
                            portfolioHistory.push(newPortfolio);

                            // Update portfolios

                            portfolioHistory.filter((portfolio) => {
                                return portfolio.timestamp > newPortfolio.timestamp;
                            })
                                .forEach((portfolio) => {
                                    for (const bDiscrep of balanceDiscrepencies) {
                                        portfolio.balanceOf(bDiscrep.c).amount =
                                            Big(portfolio.balanceOf(bDiscrep.c).amount)
                                                .minus(bDiscrep.diff).toFixed(20);
                                    }
                                });

                            break outerloop;
                        }
                    }
                }

                resolve(portfolioHistory);
            });
        });
    };

// Convert event history to an annotated portfolio history which includes
// btcValue's for every balance
portfolioEventHistorySchema.methods.getAnnotatedPortfolioHistory =
    function getAnnotatedPortfolioHistory(
        resolution: number = 86400,                 // One day
        from = new Date(0),                         // Start of portfolio
        to = new Date()): Promise<Portfolio[]> {

        return new Promise<Portfolio[]>((resolve, reject) => {

            this.getPortfolioHistory(resolution, from, to).then(
                (portfolioHistory: Portfolio[]) => {

                    // Make sure that is not an empty portfolio History
                    if (!portfolioHistory.length) {
                        resolve([]);
                        return;
                    }

                    // Limit range to that of the portfolio
                    if (portfolioHistory[0].timestamp > from) {
                        from = portfolioHistory[0].timestamp;
                    }

                    // Create a list of all currency pairs that need to be looked up
                    // for the portfolio history
                    const currencyPairs = Array.from(new Set(portfolioHistory.map((p) => {
                        return p.balances.map((b) => "BTC_" + b.currency);
                    }).reduce((acc, p) => acc.concat(p), [])));

                    PriceModel.getPriceHistory(currencyPairs, resolution, from, to).then((prices) => {
                        // Helper function to get the user's portfolio at a certain time
                        const portfolioAtTime = (ph: Portfolio[], time: Date) => {
                            const filteredPortfolios = portfolioHistory
                                .filter((p) => p.timestamp < time)
                                // Sort so that the last one comes first
                                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                            return filteredPortfolios.length
                                ? filteredPortfolios[0]
                                : new Portfolio([], portfolioHistory[0].timestamp);
                        };

                        const portfolioHistoriesProcessed = prices.map((price) => {
                            // Get users portfolio on date

                            const portfolioClone = clone(portfolioAtTime(portfolioHistory, price.timestamp));
                            portfolioClone.timestamp = price.timestamp;

                            portfolioClone.balances.forEach((b) => {
                                if (b.currency === "BTC") {
                                    b.btcValue = b.amount;
                                    return;
                                } else if (b.currency === "USDT") {
                                    b.btcValue = "0.0";
                                    return;
                                } else {
                                    const bPrice = price.prices["BTC_" + b.currency];
                                    b.btcValue = bPrice
                                        ? Number(bPrice * parseFloat(b.amount)).toFixed(15)
                                        : "0.0";
                                }
                            });

                            return portfolioClone;
                        }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                        resolve(portfolioHistoriesProcessed);
                    });
                }).catch((err) => reject(err));
        });
    };

export default mongoose.model("portfolio_event_history", portfolioEventHistorySchema);
