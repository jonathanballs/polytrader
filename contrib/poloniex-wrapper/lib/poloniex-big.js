"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request");
const crypto = require("crypto");
const moment = require("moment");
const clone = require("clone");
const Big = require("big.js");
class OrderBook {
}
exports.OrderBook = OrderBook;
class Order {
}
exports.Order = Order;
var TradeType;
(function (TradeType) {
    TradeType[TradeType["Buy"] = 0] = "Buy";
    TradeType[TradeType["Sell"] = 1] = "Sell";
})(TradeType = exports.TradeType || (exports.TradeType = {}));
class Balance {
    constructor(currency, amount) {
        if (currency)
            this.currency = currency;
        if (amount)
            this.amount = amount;
    }
}
exports.Balance = Balance;
class Portfolio {
    constructor(balances, timestamp) {
        this.timestamp = timestamp;
        this.balances = balances;
    }
    balanceOf(currency) {
        var b = this.balances.filter((x) => x.currency == currency);
        if (b.length)
            return b[0];
        var newBalance = new Balance(currency, "0.0");
        this.balances.push(newBalance);
        return newBalance;
    }
    removeCurrency(currency) {
        this.balances = this.balances.filter(b => b.currency == currency);
    }
    getValue() {
        return null;
    }
}
exports.Portfolio = Portfolio;
function tradeStringToType(s) {
    return s == "buy" ? TradeType.Buy : TradeType.Sell;
}
var AccountType;
(function (AccountType) {
    AccountType[AccountType["Exchange"] = 0] = "Exchange";
    AccountType[AccountType["Margin"] = 1] = "Margin";
    AccountType[AccountType["Lending"] = 2] = "Lending";
})(AccountType = exports.AccountType || (exports.AccountType = {}));
function accountStringToType(s) {
    if (s == "lending")
        return AccountType.Lending;
    if (s == "margin")
        return AccountType.Margin;
    return AccountType.Exchange;
}
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
class UserTrade {
}
exports.UserTrade = UserTrade;
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
            this._public('returnTicker', {}, (err, ticker) => {
                if (err = err || ticker.error) {
                    reject(Error("Error in return24hVolume: " + err));
                    return;
                }
                resolve(ticker);
            });
        });
    }
    return24hVolume() {
        return new Promise((resolve, reject) => {
            this._public('return24hVolume', {}, (err, volumeList) => {
                if (err = err || volumeList.error) {
                    reject(Error("Error in return24hVolume: " + err));
                    return;
                }
                var ret = new VolumeList();
                ret.totalBTC = volumeList["totalBTC"];
                ret.totalETH = volumeList["totalETH"];
                ret.totalUSDT = volumeList["totalUSDT"];
                ret.totalXMR = volumeList["totalXMR"];
                ret.totalXUSD = volumeList["totalXUSD"];
                ret.pair = {};
                for (var key in volumeList) {
                    var pair = key.split('_');
                    if (pair.length != 2)
                        continue;
                    ret.pair[key] = new Volume(pair[0], pair[1]);
                }
                resolve(ret);
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
                if (err = err || orderBookOptions.error) {
                    reject(Error("Error in returnOrderBook: " + err));
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
                if (err = err || tradeHistory.error) {
                    reject(Error("Error in returnTradeHistory: " + err));
                    return;
                }
                tradeHistory.forEach(t => {
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate();
                    delete t.date;
                    t.type = tradeStringToType(t.type);
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
                if (err = err || candlestickData.error) {
                    reject(Error("Error in returnChartData: " + err));
                    return;
                }
                candlestickData.forEach(c => {
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
    returnCurrencies() {
        return new Promise((resolve, reject) => {
            this._public('returnCurrencies', {}, (err, currencies) => {
                if (err = err || currencies.error) {
                    reject(Error("Error in returnCurrencies: " + err));
                    return;
                }
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
                if (err = err || loanOrders.error) {
                    reject(Error("Error in returnLoanOrders: " + err));
                    return;
                }
                resolve(loanOrders);
            });
        });
    }
    returnBalances() {
        return new Promise((resolve, reject) => {
            this._private('returnBalances', {}, (err, balances) => {
                if (err = err || balances.error) {
                    reject(Error("Error in returnBalances: " + err));
                }
                resolve(balances);
            });
        });
    }
    returnCompleteBalances(account) {
        account = account || 'all';
        return new Promise((resolve, reject) => {
            this._private('returnCompleteBalances', { account }, (err, balancesRaw) => {
                if (err = err || balancesRaw.error) {
                    reject(Error("Error in returnCompleteBalances: " + err));
                    return;
                }
                var balances = [];
                for (var key in balancesRaw) {
                    var newBalance = new Balance;
                    newBalance.currency = key;
                    newBalance.amount = balancesRaw[key].available;
                    newBalance.btcValue = balancesRaw[key].btcValue;
                    if (parseFloat(newBalance.amount) > 0.0)
                        balances.push(newBalance);
                }
                resolve(balances);
            });
        });
    }
    returnDepositAddresses() {
        return new Promise((resolve, reject) => {
            this._private('returnDepositAddresses', {}, (err, addresses) => {
                if (err = err || addresses.error) {
                    reject(Error("Error in returnDepositAddresses: " + err));
                    return;
                }
                resolve(addresses);
            });
        });
    }
    generateNewAddress(currency) {
        return new Promise((resolve, reject) => {
            this._private('generateNewAddress', { currency }, (err, newAddress) => {
                if (err = err || newAddress.error) {
                    reject(Error("Error in generateNewAddress: " + err));
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
                if (err = err || depositsWithdrawals.error) {
                    reject(Error("Error in returnDepositsWithdrawals: " + err));
                    return;
                }
                depositsWithdrawals.deposits.forEach(deposit => {
                    deposit.timestamp = new Date(deposit.timestamp * 1000);
                    deposit.isComplete = deposit.status.startsWith('COMPLETE');
                });
                depositsWithdrawals.withdrawals.forEach(withdrawal => {
                    withdrawal.timestamp = new Date(withdrawal.timestamp * 1000);
                    withdrawal.isComplete = withdrawal.status.startsWith('COMPLETE');
                });
                resolve(depositsWithdrawals);
            });
        });
    }
    returnOpenOrders(currencyPair) {
        return new Promise((resolve, reject) => {
            var reqOptions = {
                currencyPair: currencyPair || 'all'
            };
            function normalizeOrder(order) {
                order.orderNumber = parseInt(order.orderNumber);
            }
            this._private('returnOpenOrders', reqOptions, (err, openOrders) => {
                if (err = err || openOrders.error) {
                    reject(Error("Error in returnOpenOrders: " + err));
                    return;
                }
                if (!currencyPair) {
                    for (var key in openOrders) {
                        openOrders[key].forEach(o => normalizeOrder(o));
                    }
                }
                else {
                    openOrders.forEach(o => normalizeOrder(o));
                }
                resolve(openOrders);
            });
        });
    }
    returnUserTradeHistory(currencyPair) {
        return new Promise((resolve, reject) => {
            var reqOptions = {
                currencyPair: currencyPair || 'all',
                start: 0,
                end: Math.floor((new Date).getTime() / 1000)
            };
            this._private('returnTradeHistory', reqOptions, (err, tradeHistory) => {
                if (err = err || tradeHistory.error) {
                    reject(Error("Error in returnTradeHistory: " + err));
                    return;
                }
                function normalizeTrade(t, base, quote) {
                    t.tradeID = parseInt(t.tradeID);
                    t.orderNumber = parseInt(t.orderNumber);
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate();
                    delete t.date;
                    t.type = tradeStringToType(t.type);
                    t.category = accountStringToType(t.category);
                    t.base = base;
                    t.quote = quote;
                }
                if (!currencyPair) {
                    var allTrades = [];
                    for (var key in tradeHistory) {
                        let base = key.split('_')[0];
                        let quote = key.split('_')[1];
                        tradeHistory[key].forEach(t => {
                            normalizeTrade(t, base, quote);
                            allTrades.push(t);
                        });
                    }
                    allTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    resolve(allTrades);
                }
                else {
                    let base = currencyPair.split('_')[0];
                    let quote = currencyPair.split('_')[1];
                    tradeHistory.forEach(t => normalizeTrade(t, base, quote));
                    tradeHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                    resolve(tradeHistory);
                }
            });
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
    returnBalanceHistory() {
        return new Promise((resolve, reject) => {
            function isWithdrawal(e) {
                return e.withdrawalNumber !== undefined;
            }
            function isDeposit(e) {
                return e.confirmations != undefined;
            }
            function isUserTrade(e) {
                return e.globalTradeID != undefined;
            }
            this.returnDepositsWithdrawals(new Date(0), new Date).then(depositsWithdrawals => {
                this.returnUserTradeHistory().then(userTrades => {
                    this.returnCompleteBalances().then(completeBalances => {
                        var allEvents = depositsWithdrawals.deposits;
                        allEvents = allEvents.concat(depositsWithdrawals.withdrawals).concat(userTrades);
                        allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                        var portfolioHistory = new Array;
                        allEvents.forEach(e => {
                            if (!portfolioHistory.length) {
                                if (isDeposit(e)) {
                                    var balance = new Balance(e.currency, e.amount);
                                    var portfolio = new Portfolio([balance], e.timestamp);
                                    portfolioHistory.push(portfolio);
                                    return;
                                }
                                else {
                                    reject(Error("Unable to find initial deposit"));
                                    return;
                                }
                            }
                            var portfolio = clone(portfolioHistory[portfolioHistory.length - 1]);
                            portfolio.timestamp = e.timestamp;
                            if (isDeposit(e)) {
                                var b = portfolio.balanceOf(e.currency);
                                b.amount = new Big(b.amount).plus(e.amount).toFixed(20);
                            }
                            else if (isWithdrawal(e)) {
                                var b = portfolio.balanceOf(e.currency);
                                b.amount = new Big(b.amount).minus(e.amount).toFixed(20);
                            }
                            else {
                                var base = portfolio.balanceOf(e.base);
                                var quote = portfolio.balanceOf(e.quote);
                                if (e.type == TradeType.Buy) {
                                    base.amount = new Big(base.amount).minus(e.total).toFixed(20);
                                    quote.amount = new Big(quote.amount).plus(e.amount).toFixed(20);
                                    var totalFee = new Big(e.amount).times(e.fee);
                                    quote.amount = new Big(quote.amount).minus(totalFee).toFixed(20);
                                }
                                else {
                                    base.amount = new Big(base.amount).plus(e.total).toFixed(20);
                                    quote.amount = new Big(quote.amount).minus(e.amount).toFixed(20);
                                    var totalFee = new Big(e.total).times(e.fee);
                                    base.amount = new Big(base.amount).minus(totalFee).toFixed(20);
                                }
                            }
                            portfolio.balances = portfolio.balances.filter(bal => {
                                return new Big(bal.amount).abs().gt("0.00001");
                            });
                            {
                                portfolio.event = e;
                            }
                            portfolioHistory.push(portfolio);
                        });
                        var portfoliosBeforeSplit = portfolioHistory.filter(p => p.timestamp < new Date(1501593374000));
                        if (portfoliosBeforeSplit) {
                            var BCHBalance = completeBalances.filter(b => b.currency == 'BCH')[0];
                            var BCHBalanceAmount = !!BCHBalance ? Big(BCHBalance.amount) : Big('0.0');
                            BCHBalanceAmount = BCHBalanceAmount.minus(Big(portfolioHistory[portfolioHistory.length - 1].balanceOf('BCH').amount));
                            var newPortfolio = clone(portfoliosBeforeSplit[portfoliosBeforeSplit.length - 1]);
                            newPortfolio.balanceOf('BCH').amount = BCHBalanceAmount.toFixed(20);
                            newPortfolio.timestamp = new Date(1501593374000);
                            {
                                newPortfolio.event = null;
                            }
                            portfolioHistory.push(newPortfolio);
                            portfolioHistory = portfolioHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                            portfolioHistory.filter(p => p.timestamp > new Date(1501593374000))
                                .map(p => {
                                var newBCHBalance = Big(p.balanceOf('BCH').amount).plus(BCHBalanceAmount);
                                p.balanceOf('BCH').amount = newBCHBalance.toFixed(20);
                            });
                        }
                        let currenciesSet = new Set();
                        completeBalances.forEach(b => currenciesSet.add(b.currency));
                        portfolioHistory[portfolioHistory.length - 1].balances.forEach(b => currenciesSet.add(b.currency));
                        var balanceDiscrepencies = Array.from(currenciesSet).map(c => {
                            var rb_list = completeBalances.filter(b => b.currency == c);
                            var rb = parseFloat(rb_list.length == 0 ? '0.0' : rb_list[0].amount);
                            var cb = parseFloat(portfolioHistory[portfolioHistory.length - 1].balanceOf(c).amount);
                            return { c, rb, cb, diff: cb - rb };
                        }).filter(b => Math.abs(b.rb - b.cb) > 0.001);
                        console.log(balanceDiscrepencies);
                        outerloop: for (var p of portfolioHistory) {
                            for (var currency of p.balances) {
                                if (parseFloat(currency.amount) < 0.0) {
                                    var newPortfolio = clone(p);
                                    newPortfolio.timestamp = new Date(newPortfolio.timestamp.getTime() + 1);
                                    {
                                        newPortfolio.event = null;
                                    }
                                    portfolioHistory.push(newPortfolio);
                                    portfolioHistory.filter(p => p.timestamp > newPortfolio.timestamp).forEach(p => {
                                        for (var bDiscrep of balanceDiscrepencies) {
                                            p.balanceOf(bDiscrep.c).amount = Big(p.balanceOf(bDiscrep.c).amount).minus(bDiscrep.diff).toFixed(20);
                                        }
                                    });
                                    break outerloop;
                                }
                            }
                        }
                        resolve(portfolioHistory);
                    }).catch(err => reject(err));
                }).catch(err => reject(err));
            }).catch(err => reject(err));
        });
    }
    returnBalanceChart(period, start, end) {
    }
    returnFeesHistory() {
    }
}
exports.default = Poloniex;
//# sourceMappingURL=poloniex-big.js.map