// A mapping of services provided
import * as clone from 'clone'

import Poloniex from './poloniex-wrapper'
import Etherscan from './etherscan-wrapper'
import Bittrex from './bittrex-wrapper'
import Coinbase from './coinbase-wrapper'
import IWrapper from './'

interface WrapperConstructor {
    new(serverAuth: {[key: string] : string},
                    userAuth: {[key: string] : string}) : IWrapper
}

interface Service {
    name : string
    key: string
    formFields: [{
        name: string
        description: string
        placeholder: string
        type?: string // Optional. Assume text
    }]
    serverAuth: { [key: string]: string }
    wrapper: WrapperConstructor
}

var services : [Service] = [
    {
        name: 'Bittrex',
        key: 'bittrex',
        formFields: [
            { name: 'portfolioHistory', description: 'History CSV', placeholder: 'Bittrex History CSV', type: 'file'},
            { name: 'apiKey', description: 'API Key', placeholder: 'Bittrex API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Bittrex API Secret' }],
        serverAuth: {},
        wrapper: Bittrex
    },
    {
        name: 'Coinbase',
        key: 'coinbase',
        formFields: [
            { name: 'apiKey', description: 'API Key', placeholder: 'Coinbase API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Coinbase API Secret' }],
        serverAuth: {},
        wrapper: Coinbase
    },
    {
        name: 'Poloniex',
        key: 'poloniex',
        formFields: [
            { name: 'apiKey', description: 'API Key', placeholder: 'Poloniex API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Poloniex API Secret' }],
        serverAuth: {},
        wrapper: Poloniex
    },
    {
        name: 'Ethereum Wallet',
        key: 'ethereum-wallet',
        formFields: [{ name: 'walletAddress', description: 'Address', placeholder: 'Ethereum Wallet Address' }],
        serverAuth: { apiKey: "TW6UIF78AZDQDGJI1VDJXSQWHDFWKKQP15" },
        wrapper: Etherscan
    },
]

export var servicesClient = clone(services)
servicesClient.forEach(s => {
    delete s['serverAuth']
    delete s['wrapper']
})

export default services
