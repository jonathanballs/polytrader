// Base interface for api wrappers

export default interface IWrapper {
    returnBalances(): Promise<Balance[]>;
    returnHistory(startDate?: Date): Promise<PortfolioEvent[]>;
    validateCredentials(): Promise<boolean>;
}

export class Portfolio {
    public balances: Balance[];
    public timestamp: Date;

    constructor(balances: Balance[], timestamp: Date) {
        this.timestamp = timestamp;
        this.balances = balances;
    }

    public balanceOf(currency: string): Balance {
        const b: Balance = this.balances.filter((x) => x.currency === currency)[0];
        if (b) { return b; }

        this.balances.push(new Balance(currency, "0.0"));
        return this.balanceOf(currency);
    }

    public removeCurrency(currency: string) {
        this.balances = this.balances.filter((b) => b.currency === currency);
    }

    public getValue(): number {
        return null;
    }
}

export class Balance {
    public currency: string;
    public amount: string;
    public btcValue: string;

    constructor(currency?, amount?) {
        if (currency) {
            this.currency = currency;
        }

        this.amount = amount ? amount : "0.0";
    }
}

export class DepositWithdrawal {
    public amount: string;
    public currency: string;
    public txid: string;
    public address: string;
    public fees: string;
}

export class Trade {
    public soldCurrency: string;
    public boughtCurrency: string;
    public rate: string;
    public soldAmount: string;
    public boughtAmount: string;
    public fees: string;
}

export class PortfolioEvent {
    public timestamp: Date;
    public permanent: boolean;
    public type: string;
    public data: DepositWithdrawal | Trade;
}
