// Etherscan API wrapper
// Jonathan Balls 2017

import * as clone from 'clone'
import * as request from 'request'
import * as qs from 'qs'
import * as Big from 'big.js'
import * as ethereum_address from 'ethereum-address'
import IWrapper from '../'

import { DepositWithdrawal, PortfolioEvent, Balance, Portfolio } from '../'

export default class Etherscan implements IWrapper {
    walletAddress: string
    apiKey: string

    readonly apiURL = 'https://api.etherscan.io/api?'
    exponent = 17 // Results from api are returned as integers which are 10e17

    constructor(serverAuth, userAuth) {
        this.apiKey = serverAuth.apiKey
        this.walletAddress = userAuth.walletAddress
    }

    validateCredentials() {
        if (ethereum_address.isAddress(this.walletAddress)) {
            return Promise.resolve(true)
        } else {
            return Promise.reject("Error: Not a valid Ethereum wallet address")
        }
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
                    var ethBalance = Big(JSON.parse(body).result)
                            .div(Big(10).pow(this.exponent)).toFixed(10)
                    resolve([new Balance('ETH', ethBalance)])
                }
            })
        })
    }

    returnHistory(startDate: Date = new Date(0)) : Promise<PortfolioEvent[]> {
        var requestURL : string = this.apiURL + qs.stringify({
            module: 'account',
            action: 'txlist',
            address: this.walletAddress,
            startBlock: 0,
            endBlock: Number.MAX_SAFE_INTEGER,
            sort: 'asc',
            apiKey: this.apiKey
        })

        return new Promise((resolve, reject) => {
            request(requestURL, (err, resp, body) => {

                if (err)
                    reject(err)

                var portfolioHistory: PortfolioEvent[]
                portfolioHistory = JSON.parse(body).result.map(transaction => {

                    var depositWithdrawal : DepositWithdrawal = {
                        currency: "ETH",
                        amount: Big(transaction.value).div('10e' + this.exponent)
                                                            .toFixed(this.exponent),
                        txid: transaction.hash,
                        address: transaction.from,
                        fees: "0.0"
                    }

                    var portfolioEvent : PortfolioEvent = {
                            timestamp: new Date(transaction.timeStamp * 1000),
                            permanent: true,
                            type: transaction.to == this.walletAddress
                                                    ? 'deposit' : 'withdrawal',
                            data: depositWithdrawal
                    }

                    return portfolioEvent
                })
                .filter(pe => pe.timestamp > startDate);

                resolve(portfolioHistory)

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
                    reject(err)

                var portfolioHistory:  Portfolio[] = new Array()

                JSON.parse(body).result.forEach(transaction => {
                    var portfolio = portfolioHistory.length
                        ? clone(portfolioHistory[portfolioHistory.length-1])
                        : new Portfolio([new Balance('ETH', '0.0')],
                                            new Date(transaction.timeStamp * 1000))

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

                portfolioHistory.forEach(p => {
                    p.balanceOf('ETH').amount = Big(p.balanceOf('ETH').amount).div(Big(10).pow(this.exponent)).toFixed(10)
                })

                resolve(portfolioHistory)
            })
        })
    }
}
