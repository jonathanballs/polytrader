import Poloniex from './'

import { expect, assert } from 'chai'
import 'mocha'
import * as request from 'request'
import * as dotenv from 'dotenv'

// Load environment variables if not defined
if (!process.env.POLONIEX_API_KEY || !process.env.POLONIEX_API_SECRET) {
    dotenv.config({path: 'test.env'})
}

describe('Poloniex', function() {

    let p = new Poloniex()

    this.timeout(20000)

    describe('returnTicker', () => {

        it('Returns Ticker Values', (done) => {
            p.returnTicker().then(data => {
                assert.isDefined(data["BTC_ETH"]);

                // Assert that all attributes are present
                assert.isNumber(data["BTC_ETH"].id);
                assert.isString(data["BTC_ETH"].lowestAsk)
                assert.isString(data["BTC_ETH"].highestBid)
                assert.isString(data["BTC_ETH"].baseVolume)
                assert.isString(data["BTC_ETH"].percentChange)
                assert.isString(data["BTC_ETH"].quoteVolume)

                // Assert that attributes are parseable
                assert.isNumber(parseFloat(data["BTC_ETH"].last))

                done()
            }, err => done(err));
        })
    })

    describe('return24hVolume', () => {
        it('Returns Currency Pair Volume and Totals', done => {
            p.return24hVolume().then(data => {
                assert.isDefined(data.pair["BTC_ETH"])
                assert.isString(data.pair["BTC_ETH"].baseCurrency)
                assert.isString(data.pair["BTC_ETH"].quoteCurrency)
                assert.isNumber(parseFloat(data.pair["BTC_ETH"].quoteCurrency))

                assert.isString(data.totalBTC)
                assert.isString(data.totalETH)
                assert.isString(data.totalUSDT)
                assert.isString(data.totalXMR)
                assert.isString(data.totalXUSD)
                assert.isNumber(parseFloat(data.totalBTC))

                done()
            }, err => done(err))
        })
    })

    describe('returnOrderBook', function() {

        it('Returns Order Book for specific currency', done => {
            p.returnOrderBook("BTC_ETH").then(orderBook => {
                assert.isString(orderBook.asks[0].price)
                assert.isString(orderBook.asks[0].amount)
                assert.isString(orderBook.bids[0].price)
                assert.isString(orderBook.bids[0].amount)

                assert.isBoolean(orderBook.isFrozen)
                assert.isFalse(orderBook.isFrozen)
                assert.isNumber(orderBook.seq)

                done()
            })
        })

        it('Returns Order Book for all currencies', function(done) {

            // Quite a slow endpoint. Increase timeout
            this.timeout(4000)

            p.returnOrderBook().then(orderBooks => {
                var orderBook = orderBooks["BTC_ETH"]

                assert.isString(orderBook.asks[0].price)
                assert.isString(orderBook.asks[0].amount)
                assert.isString(orderBook.bids[0].price)
                assert.isString(orderBook.bids[0].amount)

                assert.isBoolean(orderBook.isFrozen)
                assert.isNumber(orderBook.seq)

                done()
            }, err => done(err))
        })

    })

    describe('returnTradeHistory', () => {
        it('Returns Last 200 trades', done => {
            p.returnTradeHistory("BTC_ETH").then(tradeHistory => {
                expect(tradeHistory.length).equal(200)

                var th = tradeHistory[0]

                assert.isNumber(th.globalTradeID)
                assert.isNumber(th.tradeID)
                assert.isString(th.rate)
                assert.isTrue(th.timestamp instanceof Date)

                done()
            }, err => done(err))
        })

        it('Returns Between Start and End Dates', done => {
            var sixtySecondsAgo = new Date(Date.now() - 60*1000)
            var thirtySecondsAgo = new Date(Date.now() - 30*1000)
            p.returnTradeHistory("BTC_ETH", sixtySecondsAgo,
                        thirtySecondsAgo).then(tradeHistory => {
                    
                    tradeHistory.forEach((th) => {
                        assert.isBelow(th.timestamp.getTime(), thirtySecondsAgo.getTime())
                        assert.isAbove(th.timestamp.getTime(), sixtySecondsAgo.getTime())
                    })

                    done()
            }, err => done(err))
        })
    })

    describe('returnChartData', () => {
        it('Returns Half Hour of Trades', done => {
            var startTime = new Date(Date.now() - 30*60*1000)
            var endTime   = new Date(Date.now() - 15*60*1000)
            startTime.setMinutes(
                Math.floor(startTime.getMinutes() / 5)*5
            )
            endTime.setMinutes(
                Math.floor(endTime.getMinutes() / 5)*5
            )
            p.returnChartData("BTC_ETH", 300, startTime, endTime).then(chartData => {
                expect(chartData.length).equal(3)

                var candle = chartData[0]
                assert.isNumber(candle.timestamp.getTime())
                assert.isString(candle.high)
                assert.isString(candle.low)
                assert.isString(candle.open)
                assert.isString(candle.close)
                assert.isString(candle.volume)
                assert.isString(candle.quoteVolume)
                assert.isString(candle.weightedAverage)

                chartData.forEach(c => {
                    assert.isAbove(c.timestamp.getTime(), startTime.getTime())
                    assert.isBelow(c.timestamp.getTime(), endTime.getTime())
                })

                done()
            }, err => done(err))
        })
    })

    describe('returnCurrencies', () => {
        it('Returns Correct List of Currencies', done => {
            p.returnCurrencies().then(currencies => {
                assert.isDefined(currencies["BTC"])
                assert.isDefined(currencies["ETH"])

                assert.isString(currencies["BTC"].name)
                assert.isString(currencies["BTC"].txFee)
                assert.isNumber(currencies["BTC"].minConf)
                assert.isBoolean(currencies["BTC"].disabled)

                assert.isFalse(currencies["BTC"].disabled)

                done()
            }, err => done(err))
        })
    })

    describe('returnLoanOrders', () => {
        it('Returns Loan Orders for a Specific Currrency', done => {
            p.returnLoanOrders('BTC').then(loanOrders => {
                assert.isDefined(loanOrders.offers)
                expect(loanOrders.offers.length).equal(50)

                var order = loanOrders.offers[0]
                assert.isString(order.rate)
                assert.isString(order.amount)
                assert.isNumber(order.rangeMin)
                assert.isNumber(order.rangeMax)

                done()
            }, err => done(err))
        })
    })

    //
    // TRADING API METHODS
    // These tests require environment variables to be set
    //

    p = new Poloniex(process.env.POLONIEX_API_KEY,
                                process.env.POLONIEX_API_SECRET)
    
    describe('returnBalances', () => {
        it('Returns All Balances', done => {
            p.returnBalances().then(balances => {
                assert.isDefined(balances["BTC"])
                assert.isString(balances["BTC"])
                assert.isNumber(parseFloat(balances["BTC"]))
                done()
            }, err => done(err))
        })
    })

    describe('returnCompleteBalances', () => {
        it('Returns Balances of Exchange Account', done => {
            p.returnCompleteBalances('exchange').then(completeBalances => {
                assert.isDefined(completeBalances["BTC"])
                assert.isDefined(completeBalances["ETH"])

                assert.isString(completeBalances["BTC"].available)
                assert.isString(completeBalances["BTC"].onOrders)
                assert.isString(completeBalances["BTC"].btcValue)
                done()
            }, err => done(err))
        })

        it('Returns Balances of all Accounts', done => {
            p.returnCompleteBalances().then(completeBalances => {
                assert.isDefined(completeBalances["BTC"])
                assert.isDefined(completeBalances["ETH"])

                assert.isString(completeBalances["BTC"].available)
                assert.isString(completeBalances["BTC"].onOrders)
                assert.isString(completeBalances["BTC"].btcValue)
                done()
            }, err => done(err))
        })
    })

    describe('returnDepositAddresses', () => {
        it('Returns Addresses of all Currencies', done => [
            p.returnDepositAddresses().then(addresses => {
                assert.isDefined(addresses["BTC"])
                assert.isDefined(addresses["ETH"])
                assert.isAtLeast(addresses["BTC"].length, 26)
                assert.isAtMost(addresses["BTC"].length, 35)

                done()
            }, err => done(err))
        ])
    })

    describe('generateNewAddress', () => {
        it('Generate New Address for BitcoinPlus', done => {
            let currency = 'XBT'

            p.generateNewAddress(currency).then(newAddress => {
                // Note - this will only be true once a day
                assert.isBoolean(newAddress.success)
                if(newAddress.success) {
                    assert.isString(newAddress.address)
                    p.returnDepositAddresses().then(addresses => {
                        expect(addresses[currency]).equal(newAddress.address)
                        done()
                    })
                }
                else {
                    done()
                }
            }, err => done(err))
        })
    })

    describe('returnDepositsWithdrawals', () => {
        it ('Returns All Deposits and Withdrawals', done => {
            p.returnDepositsWithdrawals(new Date(Date.parse("2016-01-01")),
                                        new Date).then(depositsWithdrawals => {
                
                assert.isDefined(depositsWithdrawals.deposits)
                assert.isDefined(depositsWithdrawals.withdrawals)

                depositsWithdrawals.deposits.forEach(d => {
                    assert.isString(d.currency)
                    assert.isString(d.address)
                    assert.isString(d.amount)
                    assert.isNumber(d.confirmations)
                    assert.isString(d.txid)
                    assert.isNumber(d.timestamp.getTime())
                    assert.isString(d.status)
                    assert.isBoolean(d.isComplete)
                })

                depositsWithdrawals.withdrawals.forEach(w => {
                    assert.isNumber(w.withdrawalNumber)
                    assert.isString(w.currency)
                    assert.isString(w.address)
                    assert.isString(w.amount)
                    assert.isString(w.fee)
                    assert.isNumber(w.timestamp.getTime())
                    assert.isString(w.status)
                    assert.isBoolean(w.isComplete)
                    assert.isString(w.ipAddress)
                })

                done()
            }, err => done(err))
        })
    })
    
    describe('returnOpenOrders', () => {
        it('Return Open Orders for all currencies', done => {
            p.returnOpenOrders().then(openOrders => {
                assert.isDefined(openOrders["BTC_ETH"])

                openOrders["BTC_ETH"].forEach(o => {
                    assert.isNumber(o.orderNumber)
                    assert.isString(o.type)
                    assert.isString(o.rate)
                    assert.isString(o.amount)
                    assert.isString(o.total)
                })

                done()
            }, err => done(err))
        })

        it('Return Open Orders for BTC_ETH', done => {
            p.returnOpenOrders('BTC_ETH').then(orders => {
                orders.forEach(o => {
                    assert.isNumber(o.orderNumber)
                    assert.isString(o.type)
                    assert.isString(o.rate)
                    assert.isString(o.amount)
                    assert.isString(o.total)
                })

                done()
            }, err => done(err))
        })
    })

    describe('returnUserTradeHistory', () => {
        it('Returns User Trades For All Currencies', done => {
            p.returnUserTradeHistory().then(tradeHistory => {
                assert.isDefined(tradeHistory["BTC_ETH"])

                tradeHistory["BTC_ETH"].forEach(t => {
                    assert.isNumber(t.globalTradeID)
                    assert.isNumber(t.tradeID)
                    assert.isNumber(t.timestamp.getTime())
                    assert.isString(t.rate)
                    assert.isString(t.amount)
                    assert.isString(t.total)
                    assert.isString(t.fee)
                    assert.isNumber(t.orderNumber)
                })

                done()
            }, err => done(err))
        })

        it('Returns User Trades For BTC_ETH', done => {
            p.returnUserTradeHistory('BTC_ETH').then(tradeHistory => {
                assert.isArray(tradeHistory)

                tradeHistory.forEach(t => {
                    assert.isNumber(t.globalTradeID)
                    assert.isNumber(t.tradeID)
                    assert.isNumber(t.timestamp.getTime())
                    assert.isString(t.rate)
                    assert.isString(t.amount)
                    assert.isString(t.total)
                    assert.isString(t.fee)
                    assert.isNumber(t.orderNumber)
                })

                done()
            }, err => done(err))
        })
    })

});
