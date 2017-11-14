// Coinbase API wrapper
// Jonathan Balls 2017

import * as Big from "big.js";
import * as clone from "clone";
import * as coinbase from "coinbase";
import * as qs from "qs";
import * as request from "request";
import IWrapper from "../";

import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent } from "../";

export default class Etherscan implements IWrapper {

    public apiKey: string;
    public apiSecret: string;

    public api: coinbase.Client;

    constructor(serverAuth, userAuth) {
        this.apiKey = userAuth.apiKey;
        this.apiSecret = userAuth.apiSecret;
        this.api = coinbase.Client({
            apiKey: this.apiKey,
            apiSecret: this.apiSecret,
        });
    }

    public validateCredentials(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    resolve(false);
                    return;
                }
                resolve(true);
            });
        });
    }

    public returnBalances(): Promise<Balance[]> {
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    reject(false);
                    return;
                }

                const balances = accounts.map((a) => {
                    return new Balance(a.balance.currency, a.balance.amount);
                });

                resolve(balances);
            });
        });
    }
    public returnHistory(startDate: Date = new Date(0)): Promise<PortfolioEvent[]> {
        // History is fairly complicated because we have to get information
        // from deposits, withdrawals, tra
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    reject(err);
                    return;
                }

                const accountPromises: Array<Promise<PortfolioEvent[]>> = accounts
                    .filter((a) => ["BTC", "LTC", "ETH"].indexOf(a.currency) > -1)
                    .map((account) => {
                        return this.getAccountHistory(account.id);
                    });

                Promise.all(accountPromises)
                    .then((accountHistories) => {
                        const history = accountHistories
                            .reduce((prev, acc) => acc.concat(prev))
                            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

                        resolve(history);
                    });

            });
        });
    }

    private getAccountHistory(accountID: string, pagination = null): Promise<PortfolioEvent[]> {
        return new Promise((resolve, reject) => {
            this.api.getAccount(accountID, (err, account) => {
                if (err) {
                    reject(err);
                    return;
                } else if (!account) {
                    reject("Couldn't find account with id " + accountID);
                }
                account.getTransactions(pagination, (transactionError, transactions, nextPagination) => {
                    if (transactionError) {
                        reject(transactionError);
                        return;
                    } else if (!transactions) {
                        reject("Couldn't find more tranactions");
                        return;
                    }
                    const history = transactions.map((tx) => {
                        switch (tx.type) {
                            case "sell":
                                const withdrawal: DepositWithdrawal = {
                                    address: null,
                                    amount: Big(tx.amount.amount).abs().toFixed(10),
                                    currency: tx.amount.currency,
                                    fees: "0.0",
                                    txid: null,
                                };

                                const withdrawalEvent: PortfolioEvent = {
                                    data: withdrawal,
                                    permanent: true,
                                    timestamp: new Date(Date.parse(tx.created_at)),
                                    type: "withdrawal",
                                };

                                return withdrawalEvent;
                            case "buy":
                                const deposit: DepositWithdrawal = {
                                    address: null,
                                    amount: Big(tx.amount.amount).abs().toFixed(10),
                                    currency: tx.amount.currency,
                                    fees: "0.0",
                                    txid: null,
                                };

                                const buyEvent: PortfolioEvent = {
                                    data: deposit,
                                    permanent: true,
                                    timestamp: new Date(Date.parse(tx.created_at)),
                                    type: "deposit",
                                };

                                return buyEvent;
                            case "send":
                                // Can be either a send or receive
                                const isReceive = Big(tx.amount.amount).gt(0);
                                const currency = tx.amount.currency;
                                const amount = Big(tx.amount.amount).abs().toFixed(10);

                                const depositWithdrawal: DepositWithdrawal = {
                                    address: null,
                                    amount,
                                    currency,
                                    fees: "0.0",
                                    txid: null,
                                };

                                const portfolioEvent: PortfolioEvent = {
                                    data: depositWithdrawal,
                                    permanent: true,
                                    timestamp: new Date(Date.parse(tx.created_at)),
                                    type: isReceive ? "deposit" : "withdrawal",
                                };

                                return portfolioEvent;

                            default:
                                // No support yet for coinbase specific tx types
                                return null;
                        }
                    }).filter((p) => !!p); // Remove nulls

                    if (nextPagination.next_uri) {
                        this.getAccountHistory(accountID, nextPagination)
                            .then((nextHistory) => resolve(history.concat(nextHistory)))
                            .catch(() => resolve(history));
                    } else {
                        resolve(history);
                    }
                });
            });
        });
    }
}
