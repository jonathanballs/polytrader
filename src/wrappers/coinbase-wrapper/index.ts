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

    validateCredentials() : Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    resolve(false)
                    return
                }
                resolve(true)
            })
        })
    }

    returnBalances() : Promise<Balance[]> {
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    reject(false)
                    return
                }

                var balances = accounts.map(a => {
                    return new Balance(a.balance.currency, a.balance.amount)
                })

                resolve(balances)
            })
        })
    }

    private getAccountHistory(accountID: string, pagination = null): Promise<PortfolioEvent[]> {
        return new Promise((resolve, reject) => {
            this.api.getAccount(accountID, (err, account) => {
                account.getTransactions(pagination, (err, transactions, pagination) => {
                    var history = transactions.map(tx => {
                        switch(tx.type) {
                        case 'sell':
                            var withdrawal: DepositWithdrawal = {
                                amount: Big(tx.amount.amount).abs().toFixed(10),
                                currency: tx.amount.currency,
                                txid: null,
                                address: null,
                                fees: "0.0"
                            }

                            var portfolioEvent: PortfolioEvent = {
                                timestamp: new Date(Date.parse(tx.created_at)),
                                permanent: true,
                                type: 'withdrawal',
                                data: withdrawal
                            }

                            return portfolioEvent
                        case 'buy':
                            var deposit: DepositWithdrawal = {
                                amount: Big(tx.amount.amount).abs().toFixed(10),
                                currency: tx.amount.currency,
                                txid: null,
                                address: null,
                                fees: "0.0"
                            }

                            var portfolioEvent: PortfolioEvent = {
                                timestamp: new Date(Date.parse(tx.created_at)),
                                permanent: true,
                                type: 'deposit',
                                data: deposit
                            }

                            return portfolioEvent
                        case 'send':
                            // Can be either a send or receive
                            var isReceive = Big(tx.amount.amount).gt(0)
                            var currency = tx.amount.currency
                            var amount = Big(tx.amount.amount).abs().toFixed(10)

                            var depositWithdrawal : DepositWithdrawal = {
                                amount,
                                currency,
                                txid: null,
                                address: null,
                                fees: "0.0"
                            }

                            var portfolioEvent : PortfolioEvent = {
                                timestamp: new Date(Date.parse(tx.created_at)),
                                permanent: true,
                                type: isReceive ? 'deposit' : 'withdrawal',
                                data: depositWithdrawal
                            }

                            return portfolioEvent

                        default:
                            // No support yet for coinbase specific tx types
                            return null
                        }
                    }).filter(p => !!p) // Remove nulls

                    if (pagination.next_uri) {
                        this.getAccountHistory(accountID, pagination)
                        .then(nextHistory => resolve(history.concat(nextHistory)))
                    }
                    else {
                        resolve(history)
                    }
                })
            })
        })
    }

    returnHistory(startDate: Date = new Date(0)): Promise<PortfolioEvent[]> {
        // History is fairly complicated because we have to get information
        // from deposits, withdrawals, tra
        return new Promise((resolve, reject) => {
            this.api.getAccounts({}, (err, accounts) => {
                if (err) {
                    reject(err)
                    return
                }

                var accountPromises: Promise<PortfolioEvent[]>[] = accounts
                .filter(a => ["BTC", "LTC", "ETH"].indexOf(a.currency) > -1)
                .map(account => {
                    return this.getAccountHistory(account.id)
                });

                Promise.all(accountPromises)
                .then(accountHistories => {
                    var history = accountHistories
                    .reduce((prev, acc) => acc.concat(prev))
                    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

                    resolve(history)
                })

            })
        })
    }
}
