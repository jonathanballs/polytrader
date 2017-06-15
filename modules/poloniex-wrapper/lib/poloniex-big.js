"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const crypto = require("crypto");
const moment = require("moment");
class OrderBook {
}
exports.OrderBook = OrderBook;
var TradeType;
(function (TradeType) {
    TradeType[TradeType["Buy"] = 0] = "Buy";
    TradeType[TradeType["Sell"] = 1] = "Sell";
})(TradeType = exports.TradeType || (exports.TradeType = {}));
class Deposit {
}
exports.Deposit = Deposit;
class Withdrawal {
}
exports.Withdrawal = Withdrawal;
class DepositsAndWithdrawals {
}
exports.DepositsAndWithdrawals = DepositsAndWithdrawals;
class CompleteBalances {
}
exports.CompleteBalances = CompleteBalances;
class NewAddress {
}
exports.NewAddress = NewAddress;
class DepositAddresses {
}
exports.DepositAddresses = DepositAddresses;
class Balances {
}
exports.Balances = Balances;
var AccountType;
(function (AccountType) {
    AccountType[AccountType["Exchange"] = 0] = "Exchange";
    AccountType[AccountType["Margin"] = 1] = "Margin";
    AccountType[AccountType["Lending"] = 2] = "Lending";
})(AccountType = exports.AccountType || (exports.AccountType = {}));
class Currency {
}
exports.Currency = Currency;
class LoanOrders {
}
exports.LoanOrders = LoanOrders;
class Candlestick {
}
exports.Candlestick = Candlestick;
class Trade {
}
exports.Trade = Trade;
class Volume {
    constructor(baseCurrency, quoteCurrency) {
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
    }
}
exports.Volume = Volume;
class VolumeList {
}
exports.VolumeList = VolumeList;
class Ticker {
}
exports.Ticker = Ticker;
class Poloniex {
    constructor(apiKey, apiSecret) {
        this.version = '0.0.1';
        this.PUBLIC_API_URL = "https://poloniex.com/public";
        this.PRIVATE_API_URL = "https://poloniex.com/tradingApi";
        this.USER_AGENT = "poloniex-big" + this.version;
        this.STRICT_SSL = true;
        this.lastNonce = null;
        this.repeatNonce = 0;
        this.NONCE_LENGTH = 15;
        if (apiKey)
            this.apiKey = apiKey;
        if (apiSecret)
            this.apiSecret = apiSecret;
    }
    _request(options, callback) {
        if (!('headers' in options)) {
            options.headers = {};
        }
        options.json = true;
        options.headers['User-Agent'] = this.USER_AGENT;
        options.strictSSL = this.STRICT_SSL;
        request(options, function (err, response, body) {
            if (!err && (typeof body === 'undefined' || body === null)) {
                err = 'Empty response';
            }
            callback(err, body);
        });
        return this;
    }
    _public(command, parameters, callback) {
        var options;
        if (typeof parameters === 'function') {
            callback = parameters;
            parameters = {};
        }
        parameters || (parameters = {});
        parameters.command = command;
        options = {
            method: 'GET',
            url: this.PUBLIC_API_URL,
            qs: parameters
        };
        options.qs.command = command;
        return this._request(options, callback);
    }
    _private(command, parameters, callback) {
        var options;
        if (typeof parameters === 'function') {
            callback = parameters;
            parameters = {};
        }
        parameters || (parameters = {});
        parameters.command = command;
        parameters.nonce = this.nonce();
        options = {
            method: 'POST',
            url: this.PRIVATE_API_URL,
            form: parameters,
            headers: this._getPrivateHeaders(parameters)
        };
        return this._request(options, callback);
    }
    _getPrivateHeaders(parameters) {
        var paramString, signature;
        if (!this.apiKey || !this.apiSecret) {
            throw 'Poloniex: Error. API key and secret required';
        }
        paramString = Object.keys(parameters).map(function (param) {
            return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
        }).join('&');
        signature = crypto.createHmac('sha512', this.apiSecret).update(paramString).digest('hex');
        return {
            Key: this.apiKey,
            Sign: signature
        };
    }
    ;
    nonce() {
        var now = Math.pow(10, 2) * +new Date();
        if (now == this.lastNonce) {
            this.repeatNonce++;
        }
        else {
            this.repeatNonce = 0;
            this.lastNonce = now;
        }
        var s = (now + this.repeatNonce).toString();
        return +s.substr(s.length - this.NONCE_LENGTH);
    }
    returnTicker() {
        return new Promise((resolve, reject) => {
            this._public('returnTicker', {}, (err, data) => {
                err ? reject(Error(err)) : resolve(data);
            });
        });
    }
    return24hVolume() {
        return new Promise((resolve, reject) => {
            this._public('return24hVolume', {}, (err, data) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                else {
                    var ret = new VolumeList();
                    ret.totalBTC = data["totalBTC"];
                    ret.totalETH = data["totalETH"];
                    ret.totalUSDT = data["totalUSDT"];
                    ret.totalXMR = data["totalXMR"];
                    ret.totalXUSD = data["totalXUSD"];
                    ret.pair = {};
                    for (var key in data) {
                        var pair = key.split('_');
                        if (pair.length != 2)
                            continue;
                        ret.pair[key] = new Volume(pair[0], pair[1]);
                    }
                    resolve(ret);
                }
            });
        });
    }
    returnOrderBook(currencyPair, depth) {
        var orderBookOptions = { currencyPair: currencyPair || 'all' };
        if (depth)
            orderBookOptions.depth = depth;
        return new Promise((resolve, reject) => {
            function normalizeOrderBook(orderBook) {
                var ret = new OrderBook;
                ret.isFrozen = orderBook["isFrozen"] == "1";
                ret.seq = orderBook["seq"];
                ret.asks = orderBook["asks"].map(a => {
                    return {
                        price: a[0],
                        amount: String(a[1])
                    };
                });
                ret.bids = orderBook["bids"].map(a => {
                    return {
                        price: a[0],
                        amount: String(a[1])
                    };
                });
                return ret;
            }
            this._public('returnOrderBook', orderBookOptions, (err, data) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                if (typeof currencyPair == 'undefined') {
                    var orderBooks = {};
                    for (var key in data) {
                        orderBooks[key] = normalizeOrderBook(data[key]);
                    }
                    resolve(orderBooks);
                }
                else {
                    resolve(normalizeOrderBook(data));
                }
            });
        });
    }
    returnTradeHistory(currencyPair, start, end) {
        return new Promise((resolve, reject) => {
            var reqOptions = {
                currencyPair: currencyPair
            };
            if (start) {
                reqOptions.start = Math.ceil(start.getTime() / 1000);
            }
            if (end) {
                reqOptions.end = Math.floor(end.getTime() / 1000);
            }
            this._public('returnTradeHistory', reqOptions, (err, tradeHistory) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                tradeHistory.forEach(t => {
                    t.date = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate();
                });
                resolve(tradeHistory);
            });
        });
    }
    returnChartData(currencyPair, period, start, end) {
        var reqOptions = {
            currencyPair,
            period,
            start: Math.ceil(start.getTime() / 1000),
            end: Math.floor(end.getTime() / 1000)
        };
        return new Promise((resolve, reject) => {
            this._public('returnChartData', reqOptions, (err, candlestickData) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                candlestickData.forEach(c => {
                    c.date = new Date(c.date * 1000);
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
    returnCurrencies() {
        return new Promise((resolve, reject) => {
            this._public('returnCurrencies', {}, (err, currencies) => {
                for (var currency in currencies) {
                    var c = currencies[currency];
                    c.disabled = !!c.disabled;
                    c.txFee = String(c.txFee);
                }
                resolve(currencies);
            });
        });
    }
    returnLoanOrders(currency) {
        return new Promise((resolve, reject) => {
            this._public('returnLoanOrders', { currency }, (err, loanOrders) => {
                err ? reject(Error(err)) : resolve(loanOrders);
            });
        });
    }
    returnBalances() {
        return new Promise((resolve, reject) => {
            this._private('returnBalances', {}, (err, balances) => {
                if (err)
                    console.log(err);
                err ? reject(Error(err)) : resolve(balances);
            });
        });
    }
    returnCompleteBalances(account) {
        account = account || 'all';
        return new Promise((resolve, reject) => {
            this._private('returnCompleteBalances', { account }, (err, balances) => {
                err ? reject(Error(err)) : resolve(balances);
            });
        });
    }
    returnDepositAddresses() {
        return new Promise((resolve, reject) => {
            this._private('returnDepositAddresses', {}, (err, addresses) => {
                err ? reject(Error(err)) : resolve(addresses);
            });
        });
    }
    generateNewAddress(currency) {
        return new Promise((resolve, reject) => {
            this._private('generateNewAddress', { currency }, (err, newAddress) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                var ret = new NewAddress;
                ret.success = newAddress.success == "1";
                ret.address = newAddress.response;
                resolve(ret);
            });
        });
    }
    returnDepositsWithdrawals(start, end) {
        var reqOptions = {
            start: Math.ceil(start.getTime() / 1000),
            end: Math.floor(end.getTime() / 1000)
        };
        return new Promise((resolve, reject) => {
            this._private('returnDepositsWithdrawals', reqOptions, (err, depositsWithdrawals) => {
                if (err) {
                    reject(Error(err));
                    return;
                }
                depositsWithdrawals.deposits.forEach(deposit => {
                    deposit.timestamp = new Date(deposit.timestamp * 1000);
                    deposit.isComplete = deposit.status.startsWith('COMPLETE');
                });
                depositsWithdrawals.withdrawals.forEach(withdrawal => {
                    withdrawal.timestamp = new Date(withdrawal.tiemstamp * 1000);
                    withdrawal.isComplete = withdrawal.status.startsWith('COMPLETE');
                });
                resolve(depositsWithdrawals);
            });
        });
    }
    returnOpenOrders(currencyPair) {
        class Order {
        }
    }
    returnUserTradeHistory(currencyPair) {
        return new Promise((resolve, reject) => {
            return [];
        });
    }
    returnOrderTrades(orderNumber) {
        return new Promise((resolve, reject) => {
            return [];
        });
    }
    buy(currencyPair, rate, amount) {
        class BuyOrder {
        }
    }
    sell(currencyPair, rate, amount) {
        class SellOrder {
        }
    }
    cancelOrder(orderNumber) {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }
    moveOrder(orderNumber, rate, amount) {
        class MoveOrder {
        }
    }
    withdraw(currency, amount, address) {
        class Withdrawal {
        }
    }
    returnFeeInfo() {
        class Fees {
        }
    }
    returnAvailableAccountBalances(account) {
    }
    returnTradableBalances(account) {
    }
    transferBalance(currency, amount, fromAccount, toAccount) {
    }
    returnMarginAccountSummary() {
        class MarginAccount {
        }
    }
    marginBuy(currencyPair, rate, amount) {
        class MarginOrder {
        }
    }
    marginSell(currencyPair, rate, amount) {
        class MarginOrder {
        }
    }
    getMarginPosition(currencyPair) {
        var MarginType;
        (function (MarginType) {
            MarginType[MarginType["short"] = 0] = "short";
            MarginType[MarginType["long"] = 1] = "long";
        })(MarginType || (MarginType = {}));
        class MarginPosition {
        }
    }
    closeMarginPosition(currencyPair) {
        class ClosedMarginPosition {
        }
    }
    createLoanOffer(currency, amount, duration, autoRenew, lendingRate) {
        class LoanOffer {
        }
    }
    cancelLoanOffer(orderNumber) {
        class CancelledLoanOffer {
        }
    }
    returnOpenLoanOffers() {
        class LoanOffer {
        }
    }
    returnActiveLoans() {
        class ActiveLoan {
        }
        class ActiveLoans {
        }
    }
    returnLendingHistory(start, end) {
        class FinishedLoan {
        }
    }
}
exports.default = Poloniex;
//# sourceMappingURL=poloniex-big.js.map