// Bittrex API wrapper
// Jonathan Balls 2017

import * as clone from 'clone'
import * as request from 'request'
import * as qs from 'qs'
import * as Big from 'big.js'
import * as crypto from 'crypto'
import * as csv from 'csv-parser'
import * as fs from 'fs'

import IWrapper from '../'
import { DepositWithdrawal, PortfolioEvent, Trade, Balance, Portfolio } from '../'

export default class Bittrex implements IWrapper {

    userAuth: any

    readonly apiURL = 'https://bittrex.com/api/v1.1'
    decimalPlaces = 18 // Results from api are returned as integers with 18dp

    constructor(serverAuth, userAuth) {
        this.userAuth = userAuth
    }

    _request(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            var noncedUrl: string = url + '?' + qs.stringify({
                apikey: this.userAuth.apiKey, nonce: this.nonce()
            })
            var options = {
                url: noncedUrl,
                headers: {
                    'apisign': crypto.createHmac('sha512', this.userAuth.apiSecret)
                        .update(noncedUrl).digest('hex')
                }
            }

            request(options, (err, response, body) => {
                try {
                    body = JSON.parse(body)
                }
                catch (e) {
                    reject("Couldn't parse json: " + body)
                    return
                }

                if (err || body.success == false) {
                    var errorMessage = err || body.message
                    reject(errorMessage)
                }

                else {
                    resolve(body.result)
                }
            })
        })
    }

    validateCredentials(): Promise<boolean> {
        // Keep it always true for now
        return Promise.resolve(true)
        // return new Promise((resolve, reject) => {
        //     this.returnBalances().then(_ => {
        //         resolve(true)
        //     }).catch(e => reject(e))
        // })
    }

    returnBalances(): Promise<Balance[]> {
        var url = this.apiURL + '/account/getbalances'
        return new Promise((resolve, reject) => {
            this._request(url).then(balancesRaw => {
                resolve(balancesRaw.map(br => {
                    return new Balance(br.Currency, br.Balance + '')
                }))
            }).catch(err => reject(err))
        })
    }

    returnDepositsWithdrawals() : Promise<PortfolioEvent[]> {
        var url = this.apiURL + '/account/getwithdrawalhistory'
        return new Promise((resolve, reject) => {
            this._request(url).then(withdrawalsRaw => {
                var url = this.apiURL + '/account/getdeposithistory'
                this._request(url).then(depositsRaw => {
                    var deposits: PortfolioEvent[] = depositsRaw.map(dr => {
                        var deposit : DepositWithdrawal  = {
                            currency: dr.Currency,
                            amount: dr.Amount + '',
                            txid: dr.TxId,
                            address: dr.CryptoAddress,
                            fees: "0.0"
                        }
                        var event : PortfolioEvent = {
                            timestamp: new Date(Date.parse(dr.LastUpdated)),
                            permanent: true,
                            data: deposit,
                            type: 'deposit'
                        }

                        return event
                    })

                    var withdrawals = withdrawalsRaw.map(wr => {
                        var withdrawal : DepositWithdrawal = {
                            currency: wr.Currency,
                            amount: wr.Amount + '',
                            txid: wr.TxId,
                            address: wr.CryptoAddress,
                            fees: "0.0"
                        }
                        var event : PortfolioEvent = {
                            timestamp: new Date(Date.parse(wr.Opened)),
                            permanent: true,
                            data: withdrawal,
                            type: 'withdrawal'
                        }

                        return event
                    })

                    var ret: PortfolioEvent[] = withdrawals.concat(deposits)
                                .sort((a, b) => b.timestamp.getTime() -
                                    a.timestamp.getTime())
                    resolve(ret)
                }).catch(err => reject(err))
            }).catch(err => reject(err))
        })
    }

    returnHistory(startDate?: Date): Promise<PortfolioEvent[]> {

        return new Promise<PortfolioEvent[]>((resolve, reject) => {
            var portfolioHistory: PortfolioEvent[] = new Array()

            // Read order history csv file
            var filePath = this.userAuth.portfolioHistory.path

            fs.exists(filePath, exists => {
                if (!exists) {
                    reject("Unable to find history file: " + this.userAuth.portfolioHistory.originalFilename)
                    return
                }
                fs.createReadStream(filePath)
                    .pipe(csv({
                        quote: '"',
                        headers: ["timestampClosed",
                            "timestampOpened",
                            "market",
                            "type",
                            "ask",
                            "unitsFilled",
                            "unitsTotal",
                            "rate",
                            "cost"]
                    }))
                    .on('data', data => {
                        var isSell = data.type.toLowerCase().includes('sell')

                        // Sometimes it parses the headers as a row
                        if (data.type == 'Type') {
                            resolve([])
                        }


                        if (isSell) {
                            var trade: Trade = {
                                soldCurrency: data.market.split('-')[1],
                                boughtCurrency: data.market.split('-')[0],
                                soldAmount: Big(data.unitsFilled).abs().toFixed(15),
                                boughtAmount: data.cost,
                                rate: data.rate,
                                fees: "0.0"
                            }

                            var portfolioEvent: PortfolioEvent = {
                                timestamp: new Date(Date.parse(data.timestampClosed)),
                                type: 'trade',
                                permanent: data.unitsFilled == data.unitsTotal,
                                data: trade,
                            }

                            portfolioHistory.push(portfolioEvent)
                        }
                        else {
                            var trade: Trade = {
                                soldCurrency: data.market.split('-')[0],
                                boughtCurrency: data.market.split('-')[1],
                                soldAmount: Big(data.cost).abs().toFixed(15),
                                boughtAmount: data.unitsFilled,
                                rate: data.rate,
                                fees: "0.0"
                            }

                            var portfolioEvent: PortfolioEvent = {
                                timestamp: new Date(Date.parse(data.timestampClosed)),
                                type: 'trade',
                                permanent: data.unitsFilled == data.unitsTotal,
                                data: trade,
                            }

                            portfolioHistory.push(portfolioEvent)
                        }
                    })
                    .on('end', _ => {
                        this.returnDepositsWithdrawals().then(depositsWithdrawals => {
                            var ret: PortfolioEvent[] = portfolioHistory.concat(depositsWithdrawals)
                                .sort((a, b) => a.timestamp.getTime() -
                                    b.timestamp.getTime())
                            resolve(ret)
                        })
                    })
            })

        })
    }

    private lastNonce: number = null
    private repeatNonce: number = 0
    readonly NONCE_LENGTH: number = 15
    nonce(): number {
        var now: number = Math.pow(10, 2) * +new Date()

        if (now == this.lastNonce) {
            this.repeatNonce++
        } else {
            this.repeatNonce = 0
            this.lastNonce = now
        }

        var s = (now + this.repeatNonce).toString()
        return +s.substr(s.length - this.NONCE_LENGTH)
    }
}
