// Base interface for api wrappers

export default interface IWrapper {
    returnBalances() : Promise<Balance[]>
    returnPortfolioHistory(startDate?: Date) : Promise<Portfolio[]>
    returnHistory(startDate?: Date) : Promise<PortfolioEvent[]>
    validateCredentials() : Promise<boolean>
}

export class Portfolio {
    timestamp: Date;
    balances: Balance[];

    constructor(balances: Balance[], timestamp: Date) {
        this.timestamp = timestamp;
        this.balances = balances;
    }

    balanceOf(currency: string) : Balance {
        var b: Balance = null
        if (b = this.balances.filter((x) => x.currency == currency)[0]) {
            return b
        }

        this.balances.push(new Balance(currency, "0.0"));
        return this.balanceOf(currency)
    }

    removeCurrency(currency: string) {
        this.balances = this.balances.filter(b => b.currency == currency);
    }

    getValue() : number {
        return null
    }
}

export class Balance {
    currency: string;
    amount: string;
    btcValue: string;

    constructor(currency?, amount?) {
        if(currency)
            this.currency = currency

        this.amount = amount ? amount : '0.0'
    }
}

export class DepositWithdrawal {
    amount: string
    currency: string
    txid: string
    address: string
    fees: string
}

export class Trade {
    base: string
    quote: string
    rate: string
    baseAmount: string
    quoteAmount: string
    fee: string
}

export class PortfolioEvent {
    timestamp: Date
    permanent: boolean
    type: string
    data: DepositWithdrawal | Trade
}
