// Coinbase API wrapper
// Jonathan Balls 2017

import axios from "axios";
import * as Big from "big.js";
import * as clone from "clone";
import * as coinbase from "coinbase";
import * as qs from "qs";
import * as request from "request";
import IWrapper from "../";
import { PTAuthenticationError, PTConnectionError, PTParseError } from "../../errors";

import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent } from "../";

export default class Coinbase implements IWrapper {

    public api: coinbase.Client;
    public userAuth = null;
    public serverAuth = null;

    constructor(serverAuth, userAuth) {
        this.userAuth = userAuth;
        this.serverAuth = serverAuth;

        this.api = coinbase.Client({
            accessToken: this.userAuth.accessToken,
            refreshToken: this.userAuth.refreshToken,
        });
    }

    public validateCredentials(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.refreshAccessToken()
            .then(() => {
                this.api = coinbase.Client({
                    accessToken: this.userAuth.accessToken,
                    refreshToken: this.userAuth.refreshToken,
                });

                this.api.getAccounts({}, (err, accounts) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this.userAuth);
                    }
                });
            }).catch((err) => {
                if (err.response) {
                    reject(new PTAuthenticationError(err.response));
                } else if (err.request) {
                    reject(new PTConnectionError(err.request));
                } else {
                    reject(err);
                }
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
                    })
                    .catch((err1) => reject(err1));

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

    private refreshAccessToken() {
        return new Promise<boolean>((resolve, reject) => {
            axios.post("https://api.coinbase.com/oauth/token", qs.stringify({
                client_id: this.serverAuth.clientId,
                client_secret: this.serverAuth.clientSecret,
                grant_type: "refresh_token",
                refresh_token: this.userAuth.refreshToken,
            }))
            .then((response) => {
                this.userAuth = {
                    accessToken: response.data.access_token,
                    expiresIn: response.data.expires_in,
                    refreshToken: response.data.refresh_token,
                    scope: response.data.scope,
                    tokenType: response.data.token_type,
                };
                resolve(true);
            })
            .catch((err) => reject(err));
        });
    }
}
