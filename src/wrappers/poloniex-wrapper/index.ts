// Typescript poloniex library
// Actually has a lot more types than is strictly necessary
// Jonathan Balls 2017

import * as Big from "big.js";
import * as clone from "clone";
import * as crypto from "crypto";
import * as moment from "moment";
import * as request from "request";

import IWrapper from "../";
import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent, Trade } from "../";

export class OrderBook {
    public asks: Array<{ price: string, amount: string }>;
    public bids: Array<{ price: string, amount: string }>;
    public isFrozen: boolean;
    public seq: number;
}

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

export class NewAddress {
    public success: boolean;
    public address: string;
}

export class DepositAddresses {
    [currency: string]: string
}

export class Currency {
    public txFee: string;
    public name: string;
    public minConf: number;
    public disabled: boolean;
}

export class LoanOrders {
    public offers: Array<{ rate: string, amount: string, rangeMin: number, rangeMax: number }>;
    public demands: Array<{ rate: string, amount: string, rangeMin: number, rangeMax: number }>;
}

export class Candlestick {
    public timestamp: Date;
    public high: string;
    public low: string;
    public open: string;
    public close: string;
    public volume: string;
    public quoteVolume: string;
    public weightedAverage: string;
}

export class TradeResponse {
    public globalTradeID: number;
    public tradeID: number;
    public timestamp: Date;
    public type: TradeType;
    public rate: string;
    public amount: string;
    public total: string;
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

export class Volume {
    public baseCurrency: string;
    public quoteCurrency: string;

    constructor(baseCurrency: string, quoteCurrency: string) {
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
    }
}

export class VolumeList {
    public pair: { [currencyPair: string]: Volume };
    public totalBTC: string;
    public totalETH: string;
    public totalUSDT: string;
    public totalXMR: string;
    public totalXUSD: string;
}

export class Ticker {
    public id: number;
    public last: string;
    public lowestAsk: string;
    public highestBid: string;
    public percentChange: string;
    public baseVolume: string;
    public quoteVolume: string;
    public high24hr: string;
    public low24hr: string;
}

export default class Poloniex implements IWrapper {

    public apiKey: string;
    public apiSecret: string;

    public readonly version: string = "0.0.1";
    public readonly PUBLIC_API_URL: string = "https://poloniex.com/public";
    public readonly PRIVATE_API_URL: string = "https://poloniex.com/tradingApi";
    public readonly USER_AGENT: string = "poloniex-big" + this.version;
    public readonly STRICT_SSL: boolean = true;

    public readonly NONCE_LENGTH: number = 15;
    private lastNonce: number = null;
    private repeatNonce: number = 0;

    constructor(serverAuth, userAuth) {
        this.apiKey = userAuth.apiKey;
        this.apiSecret = userAuth.apiSecret;
    }

    public validateCredentials() {
        return new Promise<boolean>((resolve, reject) => {
            this.returnBalances().then((balances) => {
                resolve(true);
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

    public returnTicker() {
        return new Promise<{ [currencyPair: string]: Ticker }>((resolve, reject) => {
            this._public("returnTicker", {}, (err, ticker) => {
                if (err || ticker.error) {
                    reject("Error in return24hVolume: " + (err || ticker.error));
                    return;
                }

                resolve(ticker);
            });
        });
    }

    // Returns the 24-hour volume for all markets
    public return24hVolume() {
        return new Promise<VolumeList>((resolve, reject) => {
            this._public("return24hVolume", {}, (err, volumeList) => {
                const error = err || volumeList.error;
                if (err) {
                    reject(Error(err));
                    return;
                }

                const ret: VolumeList = new VolumeList();
                ret.totalBTC = volumeList.totalBTC;
                ret.totalETH = volumeList.totalETH;
                ret.totalUSDT = volumeList.totalUSDT;
                ret.totalXMR = volumeList.totalXMR;
                ret.totalXUSD = volumeList.totalXUSD;
                ret.pair = {};

                for (const key in volumeList) {
                    if (volumeList.hasOwnProperty(key)) {
                        const pair = key.split("_");
                        if (pair.length !== 2) {
                            continue;
                        }
                        ret.pair[key] = new Volume(pair[0], pair[1]);
                    }
                }

                resolve(ret);
            });
        });
    }

    // Returns the order book. Pass no arguments to get all currencies
    public returnOrderBook(): Promise<{ [currencyPair: string]: OrderBook }>;
    public returnOrderBook(currencyPair: string, depth?: number): Promise<OrderBook>;
    public returnOrderBook(currencyPair?: string, depth?: number) {

        const orderBookOptions: any = { currencyPair: currencyPair || "all" };
        if (depth) {
            orderBookOptions.depth = depth;
        }

        return new Promise<any>((resolve, reject) => {

            // Normalize an order book returned by poloniex
            function normalizeOrderBook(orderBook): OrderBook {
                const ret = new OrderBook();
                ret.isFrozen = orderBook.isFrozen === "1";
                ret.seq = orderBook.seq;
                ret.asks = orderBook.asks.map((a) => {
                    return {
                        amount: String(a[1]),
                        price: a[0],
                    };
                });
                ret.bids = orderBook.bids.map((a) => {
                    return {
                        amount: String(a[1]),
                        price: a[0],
                    };
                });

                return ret;
            }

            this._public("returnOrderBook", orderBookOptions, (err, data) => {
                const error = err || orderBookOptions.errors;
                if (error) {
                    reject(Error("Error in returnOrderBook: " + error));
                    return;
                }

                // Resolve complete order book
                if (typeof currencyPair === "undefined") {
                    // Normalize all currencies
                    const orderBooks: { [currencyPair: string]: OrderBook } = {};
                    for (const key in data) {
                        if (data.hasOwnProperty(key)) {
                            orderBooks[key] = normalizeOrderBook(data[key]);
                        }
                    }
                    resolve(orderBooks);
                } else {
                    resolve(normalizeOrderBook(data));
                }
            });
        });
    }

    // Returns trade history
    // TODO parse date not to local time but to UTC
    public returnTradeHistory(currencyPair: string, start?: Date, end?: Date) {
        return new Promise<TradeResponse[]>((resolve, reject) => {

            const reqOptions: any = {
                currencyPair,
            };

            if (start) {
                reqOptions.start = Math.ceil(start.getTime() / 1000);
            }
            if (end) {
                reqOptions.end = Math.floor(end.getTime() / 1000);
            }

            this._public("returnTradeHistory", reqOptions, (err, tradeHistory) => {
                const error = err || tradeHistory.error;
                if (error) {
                    reject(Error(error));
                    return;
                }

                tradeHistory.forEach((t) => {
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate();
                    delete t.date;
                    t.type = tradeStringToType(t.type);
                });

                resolve(tradeHistory);
            });
        });
    }

    // Return candlestick data for a currency
    public returnChartData(currencyPair: string, period: number,
                           start: Date, end: Date) {
        const reqOptions = {
            currencyPair,
            end: Math.floor(end.getTime() / 1000),
            period,
            start: Math.ceil(start.getTime() / 1000),
        };

        return new Promise<Candlestick[]>((resolve, reject) => {
            this._public("returnChartData", reqOptions, (err, candlestickData) => {
                const error = err || candlestickData.error;
                if (err) {
                    reject(Error(err));
                    return;
                }

                candlestickData.forEach((c) => {
                    c.timestamp = new Date(c.date * 1000);
                    delete c.date;
                    c.high = String(c.high);
                    c.low = String(c.low);
                    c.open = String(c.open);
                    c.close = String(c.close);
                    c.volume = String(c.volume);
                    c.quoteVolume = String(c.quoteVolume);
                    c.weightedAverage = String(c.weightedAverage);
                });

                resolve(candlestickData);
            });
        });

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

    // Return the list of loan offers and demands for a given currency
    public returnLoanOrders(currency: string) {
        return new Promise<LoanOrders>((resolve, reject) => {
            this._public("returnLoanOrders", { currency }, (err, loanOrders) => {
                const error = err || loanOrders.error;
                if (err) {
                    reject(Error(err));
                    return;
                }

                resolve(loanOrders);
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

    // Get an object containing all deposit addresses for different currencies
    // Note that you may not have an address for a currency in which case it will
    // be undefined. You will need to generate a new address using the method
    // below
    public returnDepositAddresses() {
        return new Promise<DepositAddresses>((resolve, reject) => {
            this._private("returnDepositAddresses", {}, (err, addresses) => {
                const error = err || addresses.error;
                if (error) {
                    reject(Error(err));
                    return;
                }

                resolve(addresses);
            });
        });
    }

    // Generates a new deposit address for a currency
    public generateNewAddress(currency: string) {
        return new Promise<NewAddress>((resolve, reject) => {
            this._private("generateNewAddress", { currency }, (err, newAddress) => {
                const error = err || newAddress.error;
                if (error) {
                    reject(Error(error));
                    return;
                }

                const ret = new NewAddress();
                ret.success = newAddress.success === "1";
                ret.address = newAddress.response;
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

    // Return list of users orders for a currency pair or all currencies
    public returnOpenOrders(): Promise<{ [currencyPair: string]: Order[] }>;
    public returnOpenOrders(currencyPair): Promise<Order[]>;
    public returnOpenOrders(currencyPair?: string) {
        return new Promise<any>((resolve, reject) => {
            const reqOptions = {
                currencyPair: currencyPair || "all",
            };

            function normalizeOrder(order) {
                order.orderNumber = parseInt(order.orderNumber, 10);
            }

            this._private("returnOpenOrders", reqOptions, (err, openOrders) => {
                const error = err || openOrders.error;
                if (error) {
                    reject(Error(err));
                    return;
                }

                // Normalize all orders
                if (!currencyPair) {
                    for (const key in openOrders) {
                        if (openOrders.hasOwnProperty(key)) {
                            openOrders[key].forEach((o) => normalizeOrder(o));
                        }
                    }
                } else {
                    openOrders.forEach((o) => normalizeOrder(o));
                }

                resolve(openOrders);
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

    // Return trades associated with a given orderNumber
    public returnOrderTrades(orderNumber: number) {
        return new Promise<TradeResponse[]>((resolve, reject) => {
            return [];
        });
    }

    // Place a buy order
    public buy(currencyPair: string, rate: string, amount: string) {
        class BuyOrder {
            public orderNumber: number;
            public resultingTrades: TradeResponse[];
        }
    }

    public sell(currencyPair: string, rate: string, amount: string) {
        class SellOrder {
            public orderNumber: number;
            public resultingTrades: TradeResponse[];
        }
    }

    public cancelOrder(orderNumber: number) {
        return new Promise<boolean>((resolve, reject) => {
            resolve(true);
        });
    }

    // Cancels an order and places a new one of th esame type in a single atomic transaction
    // TODO add postOnly and immediateOrCancel
    public moveOrder(orderNumber: number, rate: string, amount?: string) {
        class MoveOrder {
            public success: boolean;
            public orderNumber: number;
            public resultingTrades: TradeResponse[];
        }
    }

    // Returns a summary of the users margin account
    public returnMarginAccountSummary() {
        class MarginAccount {
            public totalValue: string;
            public p1: string;
            public lendingFees: string;
            public netValue: string;
            public totalBorrowedValue: string;
            public currentMargin: string;
        }
    }

    public marginBuy(currencyPair: string, rate: string, amount: string) {
        class MarginOrder {
            public success: boolean;
            public message: string;
            public orderNumber: number;
            public resultingTrades: TradeResponse[];
        }
    }

    public marginSell(currencyPair: string, rate: string, amount: string) {
        class MarginOrder {
            public success: boolean;
            public message: string;
            public orderNumber: number;
            public resultingTrades: TradeResponse[];
        }
    }

    public getMarginPosition(currencyPair: string) {

        enum MarginType {
            short,
            long,
        }

        class MarginPosition {
            public amount: string;
            public total: string;
            public basePrice: string;
            public liquidationPrice: string;
            public p1: string;
            public lendingFees: string;
            public type: MarginType;
        }
    }

    public closeMarginPosition(currencyPair: string) {
        class ClosedMarginPosition {
            public success: boolean;
            public message: string;
            public resultingTrades: TradeResponse[];
        }
    }

    // Create a loan offer
    public createLoanOffer(currency: string, amount: string,
                           duration: number, autoRenew: boolean,
                           lendingRate: string) {
        class LoanOffer {
            public success: boolean;
            public message: string;
            public orderID: number;
        }
    }

    // cancel a loan offer
    public cancelLoanOffer(orderNumber: number) {
        class CancelledLoanOffer {
            public success: boolean;
            public message: string;
        }
    }

    // Return all open load offers that the user has made for all currencies
    public returnOpenLoanOffers() {
        class LoanOffer {
            public id: number;
            public rate: string;
            public amount: string;
            public duration: number;
            public autoRenew: boolean;
            public date: Date;
        }
        interface ILoanOffers { [currency: string]: LoanOffer; }
    }

    // Return active loans (provided and used) for all currencies
    public returnActiveLoans() {
        class ActiveLoan {
            public id: number;
            public currency: string;
            public rate: string;
            public amount: string;
            public range: number;
            public autoRenew: boolean;
            public date: Date;
            public fees: string;
        }

        class ActiveLoans {
            public provided: { [currency: string]: ActiveLoan };
            public used: { [currency: string]: ActiveLoan };
        }
    }

    // Return the users lending history
    public returnLendingHistory(start: Date, end: Date) {
        class FinishedLoan {
            public id: number;
            public currency: string;
        }
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
