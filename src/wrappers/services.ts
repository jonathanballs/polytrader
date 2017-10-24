// A mapping of services provided

import Poloniex from './poloniex-wrapper'
import Etherscan from './etherscan-wrapper'

var services = {
    'poloniex': {
        name: 'Poloniex',
        formFields: [ "apiKey", "apiSecret" ],
        serverAuth: [],
        wrapper: Poloniex
    },
    'ethereum-wallet': {
        name: 'Ethereum Wallet',
        formFields: [ "walletAddress" ],
        serverAuth: { apiKey: "TW6UIF78AZDQDGJI1VDJXSQWHDFWKKQP15"},
        wrapper: Etherscan
    }
}

export default services
