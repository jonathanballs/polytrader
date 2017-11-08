// Coinbase API wrapper
// Jonathan Balls 2017

import * as clone from 'clone'
import * as request from 'request'
import * as qs from 'qs'
import * as Big from 'big.js'
import * as coinbase from 'coinbase'
import IWrapper from '../'

import { DepositWithdrawal, PortfolioEvent, Balance, Portfolio } from '../'

export default class Etherscan implements IWrapper {

    apiKey: string
    apiSecret: string

    api: coinbase.Client

    constructor(serverAuth, userAuth) {
        this.apiKey = userAuth.apiKey
        this.apiSecret = userAuth.apiSecret
        this.api = coinbase.Client({
            'apiKey': this.apiKey,
            'apiSecret': this.apiSecret
        })
    }

    validateCredentials() {
        return Promise.resolve(false)
    }

    returnBalances() : Promise<Balance[]> {
        return Promise.resolve([])
    }

    returnHistory(startDate: Date = new Date(0)) : Promise<PortfolioEvent[]> {
        return Promise.resolve([])
    }
}
