// Typescript poloniex library
// Actually has a lot more types than is strictly necessary
// Jonathan Balls 2017

import * as request from 'request'
import * as crypto from 'crypto'
import * as moment from 'moment'
import * as clone from 'clone'
import * as Big from 'big.js'

import Wrapper from '../'

import { Portfolio, Balance } from '../'

export class OrderBook {
    asks: {price: string, amount: string}[]
    bids: {price: string, amount: string}[]
    isFrozen: boolean
    seq: number
}

export class Order {
    orderNumber: number
    type: string
    rate: string
    amount: string
    total: string
}

export enum TradeType {
    Buy,
    Sell
}

function tradeStringToType(s: string) : TradeType {
    return s=="buy" ? TradeType.Buy : TradeType.Sell
}

export enum AccountType {
    Exchange,
    Margin,
    Lending
}

function accountStringToType(s: string) : AccountType {
    if (s == "lending")
        return AccountType.Lending
    if (s == "margin")
        return AccountType.Margin
    return AccountType.Exchange
}

export class Deposit {
    currency: string
    address: string
    amount: string
    confirmations: number
    txid: string
    timestamp: Date
    status: string
    isComplete: boolean
}

export class Withdrawal {
    withdrawalNumber: number
    currency: string
    address: string
    amount: string
    fee: string
    timestamp: Date
    status: string
    isComplete: boolean
    ipAddress: string
}

export class DepositsAndWithdrawals {
    deposits: Deposit[]
    withdrawals: Withdrawal[]
}

export class CompleteBalances {
    [currency: string]: {available: string, onOrders: string, btcValue: string}
}

export class NewAddress {
    success: boolean
    address: string
}

export class DepositAddresses {
    [currency: string]: string
}

export class Balances {
    [currency: string]: string
}

export class Currency {
    txFee: string
    name: string
    minConf: number
    disabled: boolean
}

export class LoanOrders {
    offers:   {rate: string, amount: string, rangeMin: number, rangeMax: number}[]
    demands:  {rate: string, amount: string, rangeMin: number, rangeMax: number}[]
}

export class Candlestick {
    timestamp: Date
    high: string
    low: string
    open: string
    close: string
    volume: string
    quoteVolume: string
    weightedAverage: string
}


export class Trade {
    globalTradeID: number
    tradeID: number
    timestamp: Date
    type: TradeType
    rate: string
    amount: string
    total: string
}

export class UserTrade {
    globalTradeID: number
    tradeID: number
    timestamp: Date
    type: TradeType
    rate: string
    amount: string
    total: string
    fee: string
    orderNumber: number
    category: AccountType
    base: string
    quote: string
}

export class Volume {
    baseCurrency: string
    quoteCurrency: string

    constructor(baseCurrency: string, quoteCurrency: string) {
        this.baseCurrency = baseCurrency;
        this.quoteCurrency = quoteCurrency;
    }
}

export class VolumeList {
    pair : {[currencyPair: string]: Volume}
    totalBTC: string
    totalETH: string
    totalUSDT: string
    totalXMR: string
    totalXUSD: string
}

export class Ticker {
    id: number
    last: string
    lowestAsk: string
    highestBid: string
    percentChange: string
    baseVolume: string
    quoteVolume: string
    high24hr: string
    low24hr: string
}


export default class Poloniex implements Wrapper {

    apiKey: string
    apiSecret: string

    readonly version : string = '0.0.1'
    readonly PUBLIC_API_URL : string = "https://poloniex.com/public"
    readonly PRIVATE_API_URL: string = "https://poloniex.com/tradingApi"
    readonly USER_AGENT : string = "poloniex-big" + this.version
    readonly STRICT_SSL : boolean = true

    constructor(serverAuth, userAuth) {
        this.apiKey = userAuth.apiKey
        this.apiSecret = userAuth.apiSecret
    }

    validateCredentials(){ return true }

    // Make an API request
    _request(options, callback) {


        if (!('headers' in options)) {
            options.headers = {};
        }

        options.json = true;
        options.headers['User-Agent'] = this.USER_AGENT;
        options.strictSSL = this.STRICT_SSL;

        request(options, function(err, response, body) {
            // Empty response
            if (!err && (typeof body === 'undefined' || body === null)){
            err = 'Empty response';
            }

            callback(err, body);
        });

        return this;
    }

    // Make a public API request
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

    // Make a private API request
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

    // The secret is encapsulated and never exposed
    _getPrivateHeaders(parameters) {
        var paramString, signature;

        if (!this.apiKey || !this.apiSecret) {
            throw 'Poloniex: Error. API key and secret required';
        }

        // Convert to `arg1=foo&arg2=bar`
        paramString = Object.keys(parameters).map(function(param) {
            return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
        }).join('&');

        signature = crypto.createHmac('sha512', this.apiSecret).update(paramString).digest('hex');

        return {
            Key: this.apiKey,
            Sign: signature
        };
    };

    private lastNonce: number = null
    private repeatNonce: number = 0
    readonly NONCE_LENGTH: number = 15

    nonce() : number {
        var now : number = Math.pow(10, 2) * +new Date()

        if (now == this.lastNonce) {
            this.repeatNonce++
        } else {
            this.repeatNonce = 0
            this.lastNonce = now
        }

        var s = (now + this.repeatNonce).toString()
        return +s.substr(s.length - this.NONCE_LENGTH)
    }

    returnTicker() {
        return new Promise<{[currencyPair: string] : Ticker}>((resolve, reject) => {
            this._public('returnTicker', {}, (err, ticker) => {
                if (err = err || ticker.error) {
                    reject(Error("Error in return24hVolume: " + err))
                    return;
                }

                resolve(ticker)
            })
        })
    }

    // Returns the 24-hour volume for all markets
    return24hVolume() {
        return new Promise<VolumeList>((resolve, reject) => {
            this._public('return24hVolume', {}, (err, volumeList) => {
                if (err = err || volumeList.error) {
                    reject(Error("Error in return24hVolume: " + err))
                    return;
                }

                var ret : VolumeList = new VolumeList()
                ret.totalBTC = volumeList["totalBTC"];
                ret.totalETH = volumeList["totalETH"];
                ret.totalUSDT = volumeList["totalUSDT"];
                ret.totalXMR = volumeList["totalXMR"];
                ret.totalXUSD = volumeList["totalXUSD"];
                ret.pair = {}

                for (var key in volumeList) {
                    var pair = key.split('_')
                    if (pair.length != 2)
                        continue
                    ret.pair[key] = new Volume(pair[0], pair[1])
                }

                resolve(ret);
            })
        })
    }


    // Returns the order book. Pass no arguments to get all currencies
    returnOrderBook() : Promise<{[currencyPair: string]: OrderBook}>
    returnOrderBook(currencyPair: string, depth?: number) : Promise<OrderBook>
    returnOrderBook(currencyPair?: string, depth?: number) {

        var orderBookOptions: any = { currencyPair: currencyPair || 'all' }
        if (depth)
            orderBookOptions.depth = depth;

        return new Promise<any>((resolve, reject) => {

            // Normalize an order book returned by poloniex
            function normalizeOrderBook(orderBook) : OrderBook {
                var ret = new OrderBook;
                ret.isFrozen = orderBook["isFrozen"] == "1"
                ret.seq = orderBook["seq"]
                ret.asks = orderBook["asks"].map(a => {
                    return {
                        price: a[0],
                        amount: String(a[1])
                    }
                })
                ret.bids = orderBook["bids"].map(a => {
                    return {
                        price: a[0],
                        amount: String(a[1])
                    }
                })

                return ret;
            }

            this._public('returnOrderBook', orderBookOptions, (err, data) => {
                if (err = err || orderBookOptions.error) {
                    reject(Error("Error in returnOrderBook: " + err))
                    return;
                }

                // Resolve complete order book
                if (typeof currencyPair == 'undefined') {
                    // Normalize all currencies
                    var orderBooks : {[currencyPair: string] : OrderBook} = {}
                    for (var key in data) {
                        orderBooks[key] = normalizeOrderBook(data[key])
                    }
                    resolve(orderBooks)
                }
                // Resolve currency specific order book
                else {
                    resolve(normalizeOrderBook(data))
                }
            })
        })
    }

    // Returns trade history
    // TODO parse date not to local time but to UTC
    returnTradeHistory(currencyPair: string, start?: Date, end?: Date) {
        return new Promise<Trade[]>((resolve, reject) => {

            var reqOptions: any  = {
                currencyPair: currencyPair
            }

            if (start) {
                reqOptions.start = Math.ceil(start.getTime() / 1000)
            }
            if (end) {
                reqOptions.end = Math.floor(end.getTime() / 1000)
            }

            this._public('returnTradeHistory', reqOptions, (err, tradeHistory) => {
                if (err = err || tradeHistory.error) {
                    reject(Error("Error in returnTradeHistory: " + err))
                    return
                }

                tradeHistory.forEach(t => {
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate()
                    delete t.date
                    t.type = tradeStringToType(t.type)
                });

                resolve(tradeHistory)
            })
        })
    }

    // Return candlestick data for a currency
    returnChartData(currencyPair: string, period: number,
                                            start: Date, end: Date) {
        var reqOptions = {
            currencyPair,
            period,
            start: Math.ceil(start.getTime() / 1000),
            end: Math.floor(end.getTime() / 1000)
        }

        return new Promise<Candlestick[]>((resolve, reject) => {
            this._public('returnChartData', reqOptions, (err, candlestickData) => {
                if (err = err || candlestickData.error) {
                    reject(Error("Error in returnChartData: " + err))
                    return
                }

                candlestickData.forEach(c => {
                    c.timestamp = new Date(c.date * 1000)
                    delete c.date
                    c.high = String(c.high)
                    c.low = String(c.low)
                    c.open = String(c.open)
                    c.close = String(c.close)
                    c.volume = String(c.volume)
                    c.quoteVolume = String(c.quoteVolume)
                    c.weightedAverage = String(c.weightedAverage)
                })

                resolve(candlestickData)
            })
        })

    }

    // Returns a list of all currencies
    returnCurrencies() {
        return new Promise<{[currency: string]: Currency}>((resolve, reject) => {
            this._public('returnCurrencies', {}, (err, currencies) => {

                if (err = err || currencies.error) {
                    reject(Error("Error in returnCurrencies: " + err))
                    return
                }

                for (var currency in currencies) {
                    var c = currencies[currency]

                    c.disabled = !!c.disabled
                    c.txFee = String(c.txFee)
                }

                resolve(currencies)
            })
        })
    }

    // Return the list of loan offers and demands for a given currency
    returnLoanOrders(currency: string) {
        return new Promise<LoanOrders>((resolve, reject) => {
            this._public('returnLoanOrders', {currency}, (err, loanOrders) => {

                if (err = err || loanOrders.error) {
                    reject(Error("Error in returnLoanOrders: " + err))
                    return
                }

                resolve(loanOrders)
            })
        })
    }

    //
    // TRADING API METHODS
    // These methods require api keys in order to work
    //

    returnBalances() {
        return new Promise<Balances>((resolve, reject) => {
            this._private('returnBalances', {}, (err, balances) => {
                if (err = err || balances.error) {
                    reject(Error(err))
                }

                resolve(balances)
            })
        })
    }

    // Return balance for exchange account of specific account if asked
    returnCompleteBalances(account?: string) {
        account = account || 'all'

        return new Promise<Balance[]>((resolve, reject) => {
            this._private('returnCompleteBalances', {account}, (err, balancesRaw) => {
                if (err = err || balancesRaw.error) {
                    reject(Error("Error in returnCompleteBalances: " + err))
                    return
                }

                var balances : Balance[] = []
                for (var key in balancesRaw) {
                    var newBalance = new Balance
                    newBalance.currency = key
                    newBalance.amount = balancesRaw[key].available
                    newBalance.btcValue = balancesRaw[key].btcValue

                    if (parseFloat(newBalance.amount) > 0.0)
                        balances.push(newBalance)
                }

                resolve(balances)
            })
        })
    }

    // Get an object containing all deposit addresses for different currencies
    // Note that you may not have an address for a currency in which case it will
    // be undefined. You will need to generate a new address using the method
    // below
    returnDepositAddresses() {
        return new Promise<DepositAddresses>((resolve, reject) => {
            this._private('returnDepositAddresses', {}, (err, addresses) => {
                if (err = err || addresses.error) {
                    reject(Error("Error in returnDepositAddresses: " + err))
                    return
                }

                resolve(addresses)
            })
        })
    }

    // Generates a new deposit address for a currency
    generateNewAddress(currency: string) {
        return new Promise<NewAddress>((resolve, reject) => {
            this._private('generateNewAddress', {currency}, (err, newAddress) => {
                if (err = err || newAddress.error) {
                    reject(Error("Error in generateNewAddress: " + err))
                    return
                }
                
                var ret = new NewAddress;
                ret.success = newAddress.success == "1"
                ret.address = newAddress.response
                resolve(ret)
            })
        })
    }

    // Returns the deposit and withdrawal history for the user
    returnDepositsWithdrawals(start: Date, end: Date) {

        var reqOptions = {
            start: Math.ceil(start.getTime() / 1000),
            end: Math.floor(end.getTime() / 1000)
        }

        return new Promise<DepositsAndWithdrawals>((resolve, reject) => {
            this._private('returnDepositsWithdrawals', reqOptions, (err, depositsWithdrawals) => {
                if (err = err || depositsWithdrawals.error) {
                    reject(Error("Error in returnDepositsWithdrawals: " + err))
                    return
                }

                depositsWithdrawals.deposits.forEach(deposit => {
                    deposit.timestamp = new Date(deposit.timestamp * 1000)
                    deposit.isComplete = deposit.status.startsWith('COMPLETE')
                });

                depositsWithdrawals.withdrawals.forEach(withdrawal => {
                    withdrawal.timestamp = new Date(withdrawal.timestamp * 1000)
                    withdrawal.isComplete = withdrawal.status.startsWith('COMPLETE')
                })

                resolve(depositsWithdrawals)
            })
        })
    }

    // Return list of users orders for a currency pair or all currencies
    returnOpenOrders() : Promise<{[currencyPair: string]: Order[]}>
    returnOpenOrders(currencyPair) : Promise<Order[]>
    returnOpenOrders(currencyPair?: string) {
        return new Promise<any>((resolve, reject) => {
            var reqOptions = {
                currencyPair: currencyPair || 'all'
            }

            function normalizeOrder(order) {
                order.orderNumber = parseInt(order.orderNumber)
            }

            this._private('returnOpenOrders', reqOptions, (err, openOrders) => {
                if (err = err || openOrders.error) {
                    reject(Error("Error in returnOpenOrders: " + err))
                    return
                }

                // Normalize all orders
                if (!currencyPair) {
                    for (var key in openOrders) {
                        openOrders[key].forEach(o => normalizeOrder(o))
                    }
                }
                else {
                    openOrders.forEach(o => normalizeOrder(o))
                }

                resolve(openOrders)
            })
        })
    }

    // Returns users historical trades. For now it returns all trades
    returnUserTradeHistory(currencyPair?: string): Promise<UserTrade[]> {
        return new Promise<any>((resolve, reject) => {
            var reqOptions = {
                currencyPair: currencyPair || 'all',
                start: 0,
                end: Math.floor((new Date).getTime() / 1000)
            }

            this._private('returnTradeHistory', reqOptions, (err, tradeHistory) => {
                if (err = err || tradeHistory.error) {
                    reject(Error("Error in returnTradeHistory: " + err))
                    return
                }

                function normalizeTrade(t, base: string, quote: string) {
                    t.tradeID = parseInt(t.tradeID)
                    t.orderNumber = parseInt(t.orderNumber)
                    t.timestamp = moment.utc(t.date, "YYYY-MM-DD HH:mm:ss").toDate()
                    delete t.date
                    t.type = tradeStringToType(t.type)
                    t.category = accountStringToType(t.category)

                    t.base = base
                    t.quote = quote
                }

                // Normalize all trades
                if (!currencyPair) {
                    var allTrades: UserTrade[] = []
                    for (var key in tradeHistory) {
                        let base: string = key.split('_')[0]
                        let quote: string = key.split('_')[1]
                        tradeHistory[key].forEach(t => {
                            normalizeTrade(t, base, quote)
                            allTrades.push(t)
                        })
                    }
                    allTrades.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    resolve(allTrades)
                }
                else {
                    let base: string = currencyPair.split('_')[0]
                    let quote: string = currencyPair.split('_')[1]
                    tradeHistory.forEach(t => normalizeTrade(t, base, quote))
                    tradeHistory.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                    resolve(tradeHistory)
                }
            })
        })
    }

    // Return trades associated with a given orderNumber
    returnOrderTrades(orderNumber: number) {
        return new Promise<Trade[]>((resolve, reject) => {
            return []
        })
    }

    // Place a buy order
    buy(currencyPair: string, rate: string, amount: string) {
        class BuyOrder {
            orderNumber: number
            resultingTrades: Trade[]
        }
    }

    sell(currencyPair: string, rate: string, amount: string) {
        class SellOrder {
            orderNumber: number
            resultingTrades: Trade[]
        }
    }

    cancelOrder(orderNumber: number) {
        return new Promise<boolean>((resolve, reject) => {
            resolve(true)
        })
    }

    // Cancels an order and places a new one of th esame type in a single atomic transaction
    // TODO add postOnly and immediateOrCancel
    moveOrder(orderNumber: number, rate: string, amount?: string) {
        class MoveOrder {
            success: boolean
            orderNumber: number
            resultingTrades: Trade[]
        }
    }

    // Places a withdraw request with no email confirmation. Requires withdrawing to be
    // enabled by the api
    withdraw(currency: string, amount: string, address: string) {
        class Withdrawal {
            response: string
        }
    }

    // Returns fees (percentage) that user would have to pay
    returnFeeInfo() {
        class Fees {
            makerFee: string
            takerFee: string
            thirtyDayVolume: string
            nextTier: string
        }
    }

    returnAvailableAccountBalances(account?: string) {
        // Returns account balances
    }

    returnTradableBalances(account?: string) {
        // Return tradable balances
    }

    transferBalance(currency: string, amount: string, fromAccount: AccountType, toAccount: AccountType) {
        // Transfer balances between accounts
    }

    // Returns a summary of the users margin account
    returnMarginAccountSummary() {
        class MarginAccount {
            totalValue: string
            p1: string
            lendingFees: string
            netValue: string
            totalBorrowedValue: string
            currentMargin: string
        }
    }

    marginBuy(currencyPair: string, rate: string, amount: string) {
        class MarginOrder {
            success: boolean
            message: string
            orderNumber: number
            resultingTrades: Trade[]
        }
    }

    marginSell(currencyPair: string, rate: string, amount: string) {
        class MarginOrder {
            success: boolean
            message: string
            orderNumber: number
            resultingTrades: Trade[]
        }
    }

    getMarginPosition(currencyPair: string) {

        enum MarginType {
            short,
            long
        }

        class MarginPosition {
            amount: string
            total: string
            basePrice: string
            liquidationPrice: string
            p1: string
            lendingFees: string
            type: MarginType
        }
    }

    closeMarginPosition(currencyPair: string) {
        class ClosedMarginPosition {
            success: boolean
            message: string
            resultingTrades: Trade[]
        }
    }

    // Create a loan offer
    createLoanOffer(currency: string, amount: string, duration: number, autoRenew: boolean, lendingRate: string) {
        class LoanOffer {
            success: boolean
            message: string
            orderID: number
        }
    }

    // cancel a loan offer
    cancelLoanOffer(orderNumber: number) {
        class CancelledLoanOffer {
            success: boolean
            message: string
        }
    }

    // Return all open load offers that the user has made for all currencies
    returnOpenLoanOffers() {
        class LoanOffer {
            id: number
            rate: string
            amount: string
            duration: number
            autoRenew: boolean
            date: Date
        }
        type LoanOffers = {[currency: string]: LoanOffer}
    }

    // Return active loans (provided and used) for all currencies
    returnActiveLoans() {
        class ActiveLoan {
            id: number
            currency: string
            rate: string
            amount: string
            range: number
            autoRenew: boolean
            date: Date
            fees: string
        }

        class ActiveLoans {
            provided: {[currency: string] : ActiveLoan}
            used: {[currency: string] : ActiveLoan}
        }
    }

    // Return the users lending history
    returnLendingHistory(start: Date, end: Date) {
        class FinishedLoan {
            id: number
            currency: string
        }
    }


    //
    // WRAPPER METHODS
    // These api methods are not implemented by Poloniex but combine
    // multiple api methods to provide more complex data.
    //

    // Returns a list of balances after each balance 'event' e.g. a buy,
    // sell, deposit etc.
    returnPortfolioHistory() : Promise<Portfolio[]> {

        return new Promise<Portfolio[]>((resolve, reject) => {

            function isWithdrawal(e: Withdrawal | Deposit | UserTrade) : e is Withdrawal {
                return (<Withdrawal>e).withdrawalNumber !== undefined
            }

            function isDeposit(e: Withdrawal | Deposit | UserTrade) : e is Deposit {
                return (<Deposit>e).confirmations != undefined
            }

            function isUserTrade(e: Withdrawal | Deposit | UserTrade) : e is UserTrade {
                return (<UserTrade>e).globalTradeID != undefined
            }

            this.returnDepositsWithdrawals(new Date(0), new Date).then(depositsWithdrawals => {
                this.returnUserTradeHistory().then(userTrades => {
                    this.returnCompleteBalances().then(completeBalances => {

                        var allEvents: (Deposit|Withdrawal|UserTrade)[] = depositsWithdrawals.deposits
                        allEvents = allEvents.concat(depositsWithdrawals.withdrawals).concat(userTrades)
                        allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

                        var portfolioHistory : Portfolio[] = new Array;
                        allEvents.forEach(e => {
                            // Add the initial balance
                            if (!portfolioHistory.length) {
                                if (isDeposit(e)) {
                                    var balance = new Balance(e.currency, e.amount)
                                    var portfolio = new Portfolio([balance], e.timestamp)
                                    portfolioHistory.push(portfolio)
                                    return
                                }
                                else {
                                    reject(Error("Unable to find initial deposit"))
                                    return
                                }
                            }

                            // Clone the last portfolio
                            var portfolio = clone(portfolioHistory[portfolioHistory.length-1])
                            portfolio.timestamp = e.timestamp

                            if(isDeposit(e)) {
                                var b = portfolio.balanceOf(e.currency)
                                b.amount = new Big(b.amount).plus(e.amount).toFixed(20)
                            }

                            else if (isWithdrawal(e)) {
                                var b = portfolio.balanceOf(e.currency)
                                b.amount = new Big(b.amount).minus(e.amount).toFixed(20)
                            }

                            else {
                                var base = portfolio.balanceOf(e.base)
                                var quote = portfolio.balanceOf(e.quote)

                                // Calculate new balances
                                if (e.type == TradeType.Buy) {
                                    base.amount = new Big(base.amount).minus(e.total).toFixed(20)
                                    quote.amount = new Big(quote.amount).plus(e.amount).toFixed(20)

                                    var totalFee = new Big(e.amount).times(e.fee)
                                    quote.amount = new Big(quote.amount).minus(totalFee).toFixed(20)
                                }
                                else {
                                    base.amount = new Big(base.amount).plus(e.total).toFixed(20)
                                    quote.amount = new Big(quote.amount).minus(e.amount).toFixed(20)

                                    var totalFee = new Big(e.total).times(e.fee);
                                    base.amount = new Big(base.amount).minus(totalFee).toFixed(20)
                                }
                            }

                            // Purge "rounding error" balances
                            portfolio.balances = portfolio.balances.filter(bal => {
                                return new Big(bal.amount).abs().gt("0.00001")
                            })

                            // Debugging. Attach the event that caused the balance change
                            { (<any>portfolio).event = e }

                            portfolioHistory.push(portfolio)
                        })

                        // SPECIAL CASE: BCH deposits
                        var portfoliosBeforeSplit = portfolioHistory.filter(
                                p => p.timestamp < new Date(1501593374000))

                        if (portfoliosBeforeSplit) {
                            var BCHBalance = completeBalances.filter(b=>b.currency=='BCH')[0]
                            var BCHBalanceAmount = !!BCHBalance ? Big(BCHBalance.amount) : Big('0.0')
                            BCHBalanceAmount = BCHBalanceAmount.minus(
                                    Big(portfolioHistory[portfolioHistory.length-1].balanceOf('BCH').amount))

                            var newPortfolio = clone(portfoliosBeforeSplit[portfoliosBeforeSplit.length-1])
                            newPortfolio.balanceOf('BCH').amount = BCHBalanceAmount.toFixed(20)
                            newPortfolio.timestamp = new Date(1501593374000)

                            // Remove the event annotation
                            { (<any>newPortfolio).event = null }

                            // Insert it into history
                            portfolioHistory.push(newPortfolio)
                            portfolioHistory = portfolioHistory.sort(
                                    (a, b) => a.timestamp.getTime() - b.timestamp.getTime())
                            
                            // Update portfolios post split
                            portfolioHistory.filter(p => p.timestamp > new Date(1501593374000))
                                .map(p => {
                                    var newBCHBalance = Big(p.balanceOf('BCH').amount).plus(BCHBalanceAmount)
                                    p.balanceOf('BCH').amount = newBCHBalance.toFixed(20)
                                })
                        }

                        // Error detection
                        // Sometimes bugs in poloniex code will mean that not all transactions are recorded
                        // Perhaps this should be made generic instead of tied to a specific exchange :/
                        let currenciesSet = new Set() // List of all currencies both calculated and real
                        completeBalances.forEach(b => currenciesSet.add(b.currency) )
                        portfolioHistory[portfolioHistory.length-1].balances.forEach(b => currenciesSet.add(b.currency))

                        // Only fix significant discrepancies
                        var balanceDiscrepencies = Array.from(currenciesSet).map(c => {
                            // rb: real balance, cb: calculated balance
                            var rb_list = completeBalances.filter(b => b.currency == c)
                            var rb : number = parseFloat(rb_list.length == 0 ? '0.0' : rb_list[0].amount)
                            var cb : number = parseFloat(portfolioHistory[portfolioHistory.length-1].balanceOf(c).amount)

                            return {c, rb, cb, diff: cb-rb}
                        }).filter(b => Math.abs(b.rb - b.cb) > 0.001)

                        console.log(balanceDiscrepencies)

                        // Find first impossible portfolio and fix errors
                        outerloop:
                        for (var p of portfolioHistory) {
                            for (var currency of p.balances) {
                                if (parseFloat(currency.amount) < 0.0) {

                                    // Create a new portfolio
                                    var newPortfolio = clone(p)
                                    newPortfolio.timestamp = new Date(newPortfolio.timestamp.getTime() + 1)
                                    { (<any>newPortfolio).event = null }
                                    portfolioHistory.push(newPortfolio)

                                    // Update portfolios
                                    portfolioHistory.filter(p=>p.timestamp > newPortfolio.timestamp).forEach(p => {
                                        for (var bDiscrep of balanceDiscrepencies) {
                                            p.balanceOf(bDiscrep.c).amount = Big(p.balanceOf(bDiscrep.c).amount).minus(bDiscrep.diff).toFixed(20)
                                        }
                                    })

                                    break outerloop;
                                }
                            }
                        }

                        resolve(portfolioHistory)
                    }).catch(err => reject(err))
                }).catch(err => reject(err))
            }).catch(err => reject(err))
        })
    }

    // Return historical balances each date at specific intervals (in seconds)
    // By default it returns all
    returnBalanceChart(period: number, start?: Date, end?: Date) {
    }

    returnFeesHistory() {
    }
}
