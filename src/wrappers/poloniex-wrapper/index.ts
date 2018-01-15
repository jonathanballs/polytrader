// Typescript poloniex library
// Jonathan Balls 2017

import * as Big from "big.js";
import * as clone from "clone";
import * as crypto from "crypto";
import * as moment from "moment";
import * as request from "request";

import IWrapper from "../";
import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent, Trade } from "../";

export class Order {
    public orderNumber: number;
    public type: string;
    public rate: string;
    public amount: string;
    public total: string;
}

export enum TradeType { Buy, Sell }

function tradeStringToType(s: string): TradeType {
    return s === "buy" ? TradeType.Buy : TradeType.Sell;
}

export enum AccountType {
    Exchange,
    Margin,
    Lending,
}

function accountStringToType(s: string): AccountType {
    if (s === "lending") {
        return AccountType.Lending;
    }
    if (s === "margin") {
        return AccountType.Margin;
    }
    return AccountType.Exchange;
}

export class Deposit {
    public currency: string;
    public address: string;
    public amount: string;
    public confirmations: number;
    public txid: string;
    public timestamp: Date;
    public status: string;
    public isComplete: boolean;
}

export class Withdrawal {
    public withdrawalNumber: number;
    public currency: string;
    public address: string;
    public amount: string;
    public fee: string;
    public timestamp: Date;
    public status: string;
    public isComplete: boolean;
    public ipAddress: string;
}

export class DepositsAndWithdrawals {
    public deposits: Deposit[];
    public withdrawals: Withdrawal[];
}

export class CompleteBalances {
    [currency: string]: { available: string, onOrders: string, btcValue: string }
}

export class Currency {
    public txFee: string;
    public name: string;
    public minConf: number;
    public disabled: boolean;
}

export class UserTrade {
    public globalTradeID: number;
    public tradeID: number;
    public timestamp: Date;
    public type: TradeType;
    public rate: string;
    public amount: string;
    public total: string;
    public fee: string;
    public orderNumber: number;
    public category: AccountType;
    public base: string;
    public quote: string;
}

export default class Poloniex implements IWrapper {

    public apiKey: string;
    public apiSecret: string;
    public userAuth;

    public readonly version: string = "0.0.1";
    public readonly PUBLIC_API_URL: string = "https://poloniex.com/public";
    public readonly PRIVATE_API_URL: string = "https://poloniex.com/tradingApi";
    public readonly USER_AGENT: string = "poloniex-big" + this.version;
    public readonly STRICT_SSL: boolean = true;

    public readonly NONCE_LENGTH: number = 15;
    private lastNonce: number = null;
    private repeatNonce: number = 0;

    constructor(serverAuth, userAuth) {
        this.userAuth = userAuth;
        this.apiKey = userAuth.apiKey;
        this.apiSecret = userAuth.apiSecret;
    }

    public validateCredentials() {
        return new Promise<any>((resolve, reject) => {
            this.returnBalances().then((balances) => {
                resolve(this.userAuth);
            }).catch((e) => {
                reject(e);
            });
        });
    }

    // Make an API request
    public _request(options, callback) {

        if (!("headers" in options)) {
            options.headers = {};
        }

        options.json = true;
        options.headers["User-Agent"] = this.USER_AGENT;
        options.strictSSL = this.STRICT_SSL;

        request(options, (err, response, body) => {
            // Empty response
            if (!err && (typeof body === "undefined" || body === null)) {
                err = "Empty response";
            }

            callback(err, body);
        });

        return this;
    }

    // Make a public API request
    public _public(command, parameters, callback) {
        let options;

        if (typeof parameters === "function") {
            callback = parameters;
            parameters = {};
        }

        parameters = parameters || {};
        parameters.command = command;
        options = {
            method: "GET",
            qs: parameters,
            url: this.PUBLIC_API_URL,
        };

        options.qs.command = command;
        return this._request(options, callback);
    }

    // Make a private API request
    public _private(command, parameters, callback) {
        let options;

        if (typeof parameters === "function") {
            callback = parameters;
            parameters = {};
        }

        parameters = parameters || {};
        parameters.command = command;
        parameters.nonce = this.nonce();

        options = {
            form: parameters,
            headers: this._getPrivateHeaders(parameters),
            method: "POST",
            url: this.PRIVATE_API_URL,
        };

        return this._request(options, callback);
    }

    // The secret is encapsulated and never exposed
    public _getPrivateHeaders(parameters) {

        if (!this.apiKey || !this.apiSecret) {
            throw new Error("Poloniex: Error. API key and secret required");
        }

        // Convert to `arg1=foo&arg2=bar`
        const paramString = Object.keys(parameters).map((param) => {
            return encodeURIComponent(param) + "=" + encodeURIComponent(parameters[param]);
        }).join("&");

        const signature = crypto.createHmac("sha512", this.apiSecret).update(paramString).digest("hex");

        return {
            Key: this.apiKey,
            Sign: signature,
        };
    }

    public nonce(): number {
        const now: number = Math.pow(10, 2) * +new Date();

        if (now === this.lastNonce) {
            this.repeatNonce++;
        } else {
            this.repeatNonce = 0;
            this.lastNonce = now;
        }

        const s = (now + this.repeatNonce).toString();
        return +s.substr(s.length - this.NONCE_LENGTH);
    }

    // Returns a list of all currencies
    public returnCurrencies() {
        return new Promise<{ [currency: string]: Currency }>((resolve, reject) => {
            this._public("returnCurrencies", {}, (err, currencies) => {
                const error = err || currencies.error;
                if (err) {
                    reject(Error(err));
                    return;
                }

                for (const currency in currencies) {
                    if (currencies.hasOwnProperty(currency)) {
                        const c = currencies[currency];

                        c.disabled = !!c.disabled;
                        c.txFee = String(c.txFee);
                    }
                }

                resolve(currencies);
            });
        });
    }

    //
    // TRADING API METHODS
    // These methods require api keys in order to work
    //
    public returnBalances() {
        return new Promise<Balance[]>((resolve, reject) => {
            this._private("returnBalances", {}, (err, balances) => {
                const error = err || balances.error;
                if (err) {
                    reject(Error(err));
                    return;
                }

                const ret: Balance[] = new Array();
                for (const currency in balances) {
                    if (balances.hasOwnProperty(currency)) {
                        try {
                            if (Big(balances[currency]).gt("0.0000001")) {
                                ret.push(new Balance(currency, balances[currency]));
                            }
                        } catch (e) {
                            reject(e);
                        }
                    }
                }

                resolve(ret);
            });
        });
    }

    // Returns the deposit and withdrawal history for the user
    public returnDepositsWithdrawals(start: Date, end: Date) {

        const reqOptions = {
            end: Math.floor(end.getTime() / 1000),
            start: Math.ceil(start.getTime() / 1000),
        };

        return new Promise<DepositsAndWithdrawals>((resolve, reject) => {
            this._private("returnDepositsWithdrawals", reqOptions, (err, depositsWithdrawals) => {
                const error = err || depositsWithdrawals.error;
                if (error) {
                    reject(Error(err));
                    return;
                }

                depositsWithdrawals.deposits.forEach((deposit) => {
                    deposit.timestamp = new Date(deposit.timestamp * 1000);
                    deposit.isComplete = deposit.status.startsWith("COMPLETE");
                });

                depositsWithdrawals.withdrawals.forEach((withdrawal) => {
                    withdrawal.timestamp = new Date(withdrawal.timestamp * 1000);
                    withdrawal.isComplete = withdrawal.status.startsWith("COMPLETE");
                });

                resolve(depositsWithdrawals);
            });
        });
    }

    // Returns users historical trades. For now it returns all trades
    public returnUserTradeHistory(currencyPair?: string): Promise<UserTrade[]> {
        return new Promise<any>((resolve, reject) => {
            const reqOptions = {
                currencyPair: currencyPair || "all",
                end: Math.floor((new Date()).getTime() / 1000),
                start: 0,
            };

            this._private("returnTradeHistory", reqOptions, (err, tradeHistory) => {
                const error = err || tradeHistory.error;
                if (error) {
                    reject(Error(err));
                    return;
                }

                function normalizeTrade(t, base: string, quote: string) {
                    t.tradeID = parseInt(t.tradeID, 10);
                    t.orderNumber = parseInt(t.orderNumber, 10);
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate();
                    delete t.date;
                    t.type = tradeStringToType(t.type);
                    t.category = accountStringToType(t.category);

                    t.base = base;
                    t.quote = quote;
                }

                // Normalize all trades
                if (!currencyPair) {
                    const allTrades: UserTrade[] = [];
                    for (const key in tradeHistory) {
                        if (tradeHistory.hasOwnProperty(key)) {
                            const base: string = key.split("_")[0];
                            const quote: string = key.split("_")[1];
                            tradeHistory[key].forEach((t) => {
                                normalizeTrade(t, base, quote);
                                allTrades.push(t);
                            });
                        }
                    }
                    allTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    resolve(allTrades);
                } else {
                    const base: string = currencyPair.split("_")[0];
                    const quote: string = currencyPair.split("_")[1];
                    tradeHistory.forEach((t) => normalizeTrade(t, base, quote));
                    tradeHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    resolve(tradeHistory);
                }
            });
        });
    }

    //
    // WRAPPER METHODS
    // These api methods are not implemented by Poloniex but combine
    // multiple api methods to provide more complex data.
    //

    public returnHistory(startDate: Date = new Date(0)): Promise<PortfolioEvent[]> {

        type RawEvent = Withdrawal | Deposit | UserTrade;
        function isWithdrawal(e: RawEvent): e is Withdrawal {
            return (e as Withdrawal).withdrawalNumber !== undefined;
        }

        function isDeposit(e: RawEvent): e is Deposit {
            return (e as Deposit).confirmations !== undefined;
        }

        function isUserTrade(e: RawEvent): e is UserTrade {
            return (e as UserTrade).globalTradeID !== undefined;
        }

        return new Promise<PortfolioEvent[]>((resolve, reject) => {
            this.returnDepositsWithdrawals(startDate, new Date()).then((depositsWithdrawals) => {
                this.returnUserTradeHistory().then((userTrades) => {
                    this.returnCurrencies().then((currencies) => {

                        let rawEvents: RawEvent[] = depositsWithdrawals.deposits;
                        rawEvents = rawEvents.concat(depositsWithdrawals.withdrawals);
                        rawEvents = rawEvents.concat(userTrades);

                        const portfolioEvents: PortfolioEvent[] = rawEvents.map((ev) => {
                            if (isWithdrawal(ev) || isDeposit(ev)) {
                                const depositsWithdrawal: DepositWithdrawal = {
                                    address: ev.address,
                                    amount: ev.amount,
                                    currency: ev.currency,
                                    fees: isWithdrawal(ev) ? currencies[ev.currency].txFee : "0.0",
                                    txid: "TODO",
                                };

                                const portfolioEvent: PortfolioEvent = {
                                    data: depositsWithdrawal,
                                    permanent: ev.status.includes("COMPLETE"),
                                    timestamp: ev.timestamp,
                                    type: isDeposit(ev) ? "deposit" : "withdrawal",
                                };

                                return portfolioEvent;
                            } else if (isUserTrade(ev)) {
                                const isSale = ev.type === TradeType.Sell;

                                const trade: Trade = {
                                    boughtAmount: isSale ? ev.total : ev.amount,
                                    boughtCurrency: isSale ? ev.base : ev.quote,
                                    fees: Big(isSale ? ev.total : ev.amount).times(ev.fee).toFixed(15),
                                    rate: ev.rate,
                                    soldAmount: isSale ? ev.amount : ev.total,
                                    soldCurrency: isSale ? ev.quote : ev.base,
                                };

                                const portfolioEvent: PortfolioEvent = {
                                    data: trade,
                                    permanent: true,
                                    timestamp: ev.timestamp,
                                    type: "trade",
                                };

                                return portfolioEvent;
                            } else {
                                console.log("WARNING: Unknown event" + JSON.stringify(ev));
                            }
                        });

                        portfolioEvents.sort((a, b) => {
                            return a.timestamp.getTime() - b.timestamp.getTime();
                        });

                        resolve(portfolioEvents);

                    }).catch((err) => reject(err));
                }).catch((err) => reject(err));
            }).catch((err) => {
                reject(err);
            });
        });
    }
}
