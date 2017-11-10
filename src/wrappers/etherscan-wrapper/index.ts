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
                            .div('10e' + this.exponent).toFixed(10)
                    resolve([new Balance('ETH', ethBalance)])
                }
            })
        })
    }

    returnHistory(startDate: Date = new Date(0)) : Promise<PortfolioEvent[]> {
        // REMOVE THIS
        return Promise.resolve([])

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
                var rawResponse
                try {
                    rawResponse = JSON.parse(body)
                } catch (e) {
                    reject("Unable to parse server response")
                    return
                }

                portfolioHistory = rawResponse.result.map(transaction => {

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
}
