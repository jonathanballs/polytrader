// Bittrex API wrapper
// Jonathan Balls 2017

import * as clone from 'clone'
import * as request from 'request'
import * as qs from 'qs'
import * as Big from 'big.js'
import * as crypto from 'crypto'
import IWrapper from '../'

import { Balance, Portfolio } from '../'

export default class Bittrex implements IWrapper {

    userAuth : any

    readonly apiURL = 'https://bittrex.com/api/v1.1'
    decimalPlaces = 18 // Results from api are returned as integers with 18dp

    constructor(serverAuth, userAuth) {
        this.userAuth = userAuth
    }

    returnHistory(startDate?: Date) {
        return Promise.resolve([])
    }

    _request(url: string) : Promise<any> {
        return new Promise((resolve, reject) => {
            var noncedUrl : string = url + '?' + qs.stringify({
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

    validateCredentials() : Promise<boolean> {
        // Keep it always true for now
        return Promise.resolve(true)
        // return new Promise((resolve, reject) => {
        //     this.returnBalances().then(_ => {
        //         resolve(true)
        //     }).catch(e => reject(e))
        // })
    }

    returnBalances() : Promise<Balance[]> {
        var url = this.apiURL + '/account/getbalances'
        return new Promise((resolve, reject) => {
            this._request(url).then(balancesRaw => {
                resolve(balancesRaw.map(br => {
                    return new Balance(br.Currency, br.Balance + '')
                }))
            }).catch(err => reject(err))
        })
    }

    returnPortfolioHistory(startDate: Date = new Date(0)) : Promise<Portfolio[]> {
        var url = this.apiURL + '/account/getorderhistory'

        return new Promise((resolve, reject) => {
            this._request(url).then(tradesRaw => {
                resolve(tradesRaw)
            }).catch(err => reject(err))
        })
    }

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
}
