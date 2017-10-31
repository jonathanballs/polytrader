// Base interface for api wrappers

export default interface Wrapper {
    returnBalances() : Promise<Balance[]>
    returnPortfolioHistory() : Promise<Portfolio[]>
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
        var b = this.balances.filter((x) => x.currency == currency);

        if (b.length)
            return b[0];

        var newBalance = new Balance(currency, "0.0");
        this.balances.push(newBalance);

        return newBalance;
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
