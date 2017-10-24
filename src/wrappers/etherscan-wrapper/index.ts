// Etherscan API wrapper
// Jonathan Balls 2017

import * as clone from 'clone'
import * as request from 'request'
import * as qs from 'qs'
import * as Big from 'big.js'

import { Balance, Portfolio } from '../'

export default class Etherscan {
    walletAddress: string
    apiKey: string

    apiURL = 'https://api.etherscan.io/api?'
    decimalPlaces = 18 // Results from api are returned as integers with 18dp

    constructor(serverAuth, userAuth) {
        this.apiKey = serverAuth.apiKey
        this.walletAddress = userAuth.walletAddress
    }

    returnBalances() : Promise<Balance[]> {
        var requestURL : string = this.apiURL + qs.stringify({
            module: 'account',
            action: 'balance',
            address: this.walletAddress,
            tag: 'latest',
            apiKey: this.apiKey
        })

        return new Promise<Balance[]>((resolve, reject) => {
            request(requestURL, (err, resp, body) => {
                if (err) {
                    reject(err)
                }
                else {
                    var ethBalance = Big(JSON.parse(body).result).div(Big(10).pow(this.decimalPlaces)).toFixed(10)
                    resolve([new Balance('ETH', ethBalance)])
                }
            })
        })
    }

    returnPortfolioHistory() : Promise<Portfolio[]> {
        var requestURL : string = this.apiURL + qs.stringify({
            module: 'account',
            action: 'txlist',
            address: this.walletAddress,
            startBlock: 0,
            endBlock: Number.MAX_SAFE_INTEGER,
            sort: 'desc',
            apiKey: this.apiKey
        })

        return new Promise<Portfolio[]>((resolve, reject) => {
            request(requestURL, (err, resp, body) => {

                if (err)
                    reject()

                var portfolioHistory:  Portfolio[] = new Array()

                JSON.parse(body).result.forEach(transaction => {
                    var portfolio = portfolioHistory.length
                        ? clone(portfolioHistory[portfolioHistory.length-1])
                        : new Portfolio([new Balance('ETH', '0.0')], new Date(transaction.timeStamp * 1000))

                    if(transaction.to == this.walletAddress && transaction.from != this.walletAddress) {
                        portfolio.balanceOf('ETH').amount = new Big(portfolio.balanceOf('ETH').amount).plus(transaction.value).toFixed(10)
                    }
                    else if(transaction.to != this.walletAddress && transaction.from == this.walletAddress) {
                        portfolio.balanceOf('ETH').amount = new Big(portfolio.balanceOf('ETH').amount).minus(transaction.value).toFixed(10)
                    }
                    else {
                        console.log("Self transaction detected at " + this.walletAddress)
                    }

                    portfolioHistory.push(portfolio)
                });

                resolve(portfolioHistory)
            })
        })
    }
}
