export declare class OrderBook {
    asks: {
        price: string;
        amount: string;
    }[];
    bids: {
        price: string;
        amount: string;
    }[];
    isFrozen: boolean;
    seq: number;
}
export declare class Order {
    orderNumber: number;
    type: string;
    rate: string;
    amount: string;
    total: string;
}
export declare enum TradeType {
    Buy = 0,
    Sell = 1,
}
export declare class Balance {
    currency: string;
    amount: string;
    btcValue: string;
    constructor(currency?: any, amount?: any);
}
export declare class Portfolio {
    timestamp: Date;
    balances: Balance[];
    constructor(balances: Balance[], timestamp: Date);
    balanceOf(currency: string): Balance;
    removeCurrency(currency: string): void;
    getValue(): number;
}
export declare enum AccountType {
    Exchange = 0,
    Margin = 1,
    Lending = 2,
}
export declare class Deposit {
    currency: string;
    address: string;
    amount: string;
    confirmations: number;
    txid: string;
    timestamp: Date;
    status: string;
    isComplete: boolean;
}
export declare class Withdrawal {
    withdrawalNumber: number;
    currency: string;
    address: string;
    amount: string;
    fee: string;
    timestamp: Date;
    status: string;
    isComplete: boolean;
    ipAddress: string;
}
export declare class DepositsAndWithdrawals {
    deposits: Deposit[];
    withdrawals: Withdrawal[];
}
export declare class CompleteBalances {
    [currency: string]: {
        available: string;
        onOrders: string;
        btcValue: string;
    };
}
export declare class NewAddress {
    success: boolean;
    address: string;
}
export declare class DepositAddresses {
    [currency: string]: string;
}
export declare class Balances {
    [currency: string]: string;
}
export declare class Currency {
    txFee: string;
    name: string;
    minConf: number;
    disabled: boolean;
}
export declare class LoanOrders {
    offers: {
        rate: string;
        amount: string;
        rangeMin: number;
        rangeMax: number;
    }[];
    demands: {
        rate: string;
        amount: string;
        rangeMin: number;
        rangeMax: number;
    }[];
}
export declare class Candlestick {
    timestamp: Date;
    high: string;
    low: string;
    open: string;
    close: string;
    volume: string;
    quoteVolume: string;
    weightedAverage: string;
}
export declare class Trade {
    globalTradeID: number;
    tradeID: number;
    timestamp: Date;
    type: TradeType;
    rate: string;
    amount: string;
    total: string;
}
export declare class UserTrade {
    globalTradeID: number;
    tradeID: number;
    timestamp: Date;
    type: TradeType;
    rate: string;
    amount: string;
    total: string;
    fee: string;
    orderNumber: number;
    category: AccountType;
    base: string;
    quote: string;
}
export declare class Volume {
    baseCurrency: string;
    quoteCurrency: string;
    constructor(baseCurrency: string, quoteCurrency: string);
}
export declare class VolumeList {
    pair: {
        [currencyPair: string]: Volume;
    };
    totalBTC: string;
    totalETH: string;
    totalUSDT: string;
    totalXMR: string;
    totalXUSD: string;
}
export declare class Ticker {
    id: number;
    last: string;
    lowestAsk: string;
    highestBid: string;
    percentChange: string;
    baseVolume: string;
    quoteVolume: string;
    high24hr: string;
    low24hr: string;
}
export default class Poloniex {
    apiKey: string;
    apiSecret: string;
    readonly version: string;
    readonly PUBLIC_API_URL: string;
    readonly PRIVATE_API_URL: string;
    readonly USER_AGENT: string;
    readonly STRICT_SSL: boolean;
    constructor(apiKey?: string, apiSecret?: string);
    _request(options: any, callback: any): this;
    _public(command: any, parameters: any, callback: any): this;
    _private(command: any, parameters: any, callback: any): this;
    _getPrivateHeaders(parameters: any): {
        Key: string;
        Sign: any;
    };
    private lastNonce;
    private repeatNonce;
    readonly NONCE_LENGTH: number;
    nonce(): number;
    returnTicker(): Promise<{
        [currencyPair: string]: Ticker;
    }>;
    return24hVolume(): Promise<VolumeList>;
    returnOrderBook(): Promise<{
        [currencyPair: string]: OrderBook;
    }>;
    returnOrderBook(currencyPair: string, depth?: number): Promise<OrderBook>;
    returnTradeHistory(currencyPair: string, start?: Date, end?: Date): Promise<Trade[]>;
    returnChartData(currencyPair: string, period: number, start: Date, end: Date): Promise<Candlestick[]>;
    returnCurrencies(): Promise<{
        [currency: string]: Currency;
    }>;
    returnLoanOrders(currency: string): Promise<LoanOrders>;
    returnBalances(): Promise<Balances>;
    returnCompleteBalances(account?: string): Promise<Balance[]>;
    returnDepositAddresses(): Promise<DepositAddresses>;
    generateNewAddress(currency: string): Promise<NewAddress>;
    returnDepositsWithdrawals(start: Date, end: Date): Promise<DepositsAndWithdrawals>;
    returnOpenOrders(): Promise<{
        [currencyPair: string]: Order[];
    }>;
    returnOpenOrders(currencyPair: any): Promise<Order[]>;
    returnUserTradeHistory(currencyPair?: string): Promise<UserTrade[]>;
    returnOrderTrades(orderNumber: number): Promise<Trade[]>;
    buy(currencyPair: string, rate: string, amount: string): void;
    sell(currencyPair: string, rate: string, amount: string): void;
    cancelOrder(orderNumber: number): Promise<boolean>;
    moveOrder(orderNumber: number, rate: string, amount?: string): void;
    withdraw(currency: string, amount: string, address: string): void;
    returnFeeInfo(): void;
    returnAvailableAccountBalances(account?: string): void;
    returnTradableBalances(account?: string): void;
    transferBalance(currency: string, amount: string, fromAccount: AccountType, toAccount: AccountType): void;
    returnMarginAccountSummary(): void;
    marginBuy(currencyPair: string, rate: string, amount: string): void;
    marginSell(currencyPair: string, rate: string, amount: string): void;
    getMarginPosition(currencyPair: string): void;
    closeMarginPosition(currencyPair: string): void;
    createLoanOffer(currency: string, amount: string, duration: number, autoRenew: boolean, lendingRate: string): void;
    cancelLoanOffer(orderNumber: number): void;
    returnOpenLoanOffers(): void;
    returnActiveLoans(): void;
    returnLendingHistory(start: Date, end: Date): void;
    returnBalanceHistory(): Promise<Portfolio[]>;
    returnBalanceChart(period: number, start?: Date, end?: Date): void;
    returnFeesHistory(): void;
}
