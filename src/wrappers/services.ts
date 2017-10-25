// A mapping of services provided
import * as clone from 'clone'

import Poloniex from './poloniex-wrapper'
import Etherscan from './etherscan-wrapper'

var services = [
    {
        name: 'Poloniex',
        key: 'poloniex',
        formFields: [
            { name: 'apiKey', description: 'API Key', placeholder: 'Poloniex API Key' },
            { name: 'apiSecret', description: 'API Secret', placeholder: 'Poloniex API Secret' }],
        serverAuth: [],
        wrapper: Poloniex
    },
    {
        name: 'Ethereum Wallet',
        key: 'ethereum-wallet',
        formFields: [{ name: 'walletAddress', description: 'Address', placeholder: 'Ethereum Wallet Address' }],
        serverAuth: { apiKey: "TW6UIF78AZDQDGJI1VDJXSQWHDFWKKQP15" },
        wrapper: Etherscan
    }
]

export var servicesClient = clone(services)
servicesClient.forEach(s => {
    delete s['serverAuth']
    delete s['wrapper']
})

export default services
