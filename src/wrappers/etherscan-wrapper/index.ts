// Etherscan API wrapper
// Jonathan Balls 2017

import * as Big from "big.js";
import * as clone from "clone";
import * as ethereum_address from "ethereum-address";
import * as qs from "qs";
import * as request from "request";
import IWrapper from "../";

import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent } from "../";

export default class Etherscan implements IWrapper {
    public walletAddress: string;
    public apiKey: string;

    public readonly apiURL = "https://api.etherscan.io/api?";
    public exponent = 17; // Results from api are returned as integers which are 10e17

    constructor(serverAuth, userAuth) {
        this.apiKey = serverAuth.apiKey;
        this.walletAddress = userAuth.walletAddress;
    }

    public validateCredentials() {
        if (ethereum_address.isAddress(this.walletAddress)) {
            return Promise.resolve(true);
        } else {
            return Promise.reject("Error: Not a valid Ethereum wallet address");
        }
    }

    public returnBalances(): Promise<Balance[]> {
        const requestURL: string = this.apiURL + qs.stringify({
            action: "balance",
            address: this.walletAddress,
            apiKey: this.apiKey,
            module: "account",
            tag: "latest",
        });

        return new Promise<Balance[]>((resolve, reject) => {
            request(requestURL, (err, resp, body) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        const ethBalance = Big(JSON.parse(body).result)
                            .div("10e" + this.exponent).toFixed(10);
                        resolve([new Balance("ETH", ethBalance)]);
                    } catch (e) {
                        reject(e);
                    }
                }
            });
        });
    }

    public returnHistory(startDate: Date = new Date(0)): Promise<PortfolioEvent[]> {

        const requestURL: string = this.apiURL + qs.stringify({
            action: "txlist",
            address: this.walletAddress,
            apiKey: this.apiKey,
            endBlock: Number.MAX_SAFE_INTEGER,
            module: "account",
            sort: "asc",
            startBlock: 0,
        });

        return new Promise((resolve, reject) => {
            request(requestURL, (err, resp, body) => {

                if (err) {
                    reject(err);
                }

                let portfolioHistory: PortfolioEvent[];
                let rawResponse;
                try {
                    rawResponse = JSON.parse(body);
                } catch (e) {
                    reject("Unable to parse server response");
                    return;
                }

                portfolioHistory = rawResponse.result.map((transaction) => {

                    const depositWithdrawal: DepositWithdrawal = {
                        address: transaction.from,
                        amount: Big(transaction.value).div("10e" + this.exponent)
                            .toFixed(this.exponent),
                        currency: "ETH",
                        fees: "0.0",
                        txid: transaction.hash,
                    };

                    const portfolioEvent: PortfolioEvent = {
                        data: depositWithdrawal,
                        permanent: true,
                        timestamp: new Date(transaction.timeStamp * 1000),
                        type: transaction.to === this.walletAddress
                            ? "deposit" : "withdrawal",
                    };

                    return portfolioEvent;
                })
                    .filter((pe) => pe.timestamp > startDate);

                resolve(portfolioHistory);
            });
        });
    }
}
