// Bittrex API wrapper
// Jonathan Balls 2017

import * as Big from "big.js";
import * as clone from "clone";
import * as crypto from "crypto";
import * as csv from "csv-parser";
import * as fs from "fs";
import * as qs from "qs";
import * as request from "request";

import IWrapper from "../";
import { Balance, DepositWithdrawal, Portfolio, PortfolioEvent, Trade } from "../";

export default class Bittrex implements IWrapper {

    public userAuth: any;
    public readonly apiURL = "https://bittrex.com/api/v1.1";
    public decimalPlaces = 18; // Results from api are returned as integers with 18dp

    public readonly NONCE_LENGTH: number = 15;
    private lastNonce: number = null;
    private repeatNonce: number = 0;

    constructor(serverAuth, userAuth) {
        this.userAuth = userAuth;
    }

    public _request(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const noncedUrl: string = url + "?" + qs.stringify({
                apikey: this.userAuth.apiKey, nonce: this.nonce(),
            });
            const options = {
                headers: {
                    apisign: crypto.createHmac("sha512", this.userAuth.apiSecret)
                        .update(noncedUrl).digest("hex"),
                },
                url: noncedUrl,
            };

            request(options, (err, response, body) => {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    reject("Couldn't parse json: " + body);
                    return;
                }

                if (err || body.success === false) {
                    reject(err || body.message);
                } else {
                    resolve(body.result);
                }
            });
        });
    }

    public validateCredentials(): Promise<boolean> {
        // Keep it always true for now
        return new Promise((resolve, reject) => {
            this.returnBalances().then(() => {
                resolve(true);
            }).catch((e) => reject(e));
        });
    }

    public returnBalances(): Promise<Balance[]> {
        const url = this.apiURL + "/account/getbalances";
        return new Promise((resolve, reject) => {
            this._request(url).then((balancesRaw) => {
                resolve(balancesRaw.map((br) => {
                    return new Balance(br.Currency, br.Balance + "");
                }));
            }).catch((err) => reject(err));
        });
    }

    public returnDepositsWithdrawals(): Promise<PortfolioEvent[]> {
        const url = this.apiURL + "/account/getwithdrawalhistory";
        return new Promise((resolve, reject) => {
            this._request(url).then((withdrawalsRaw) => {
                const depositUrl = this.apiURL + "/account/getdeposithistory";
                this._request(depositUrl).then((depositsRaw) => {
                    const deposits: PortfolioEvent[] = depositsRaw.map((dr) => {
                        const deposit: DepositWithdrawal = {
                            address: dr.CryptoAddress,
                            amount: dr.Amount + "",
                            currency: dr.Currency,
                            fees: "0.0",
                            txid: dr.TxId,
                        };
                        const event: PortfolioEvent = {
                            data: deposit,
                            permanent: true,
                            timestamp: new Date(Date.parse(dr.LastUpdated)),
                            type: "deposit",
                        };

                        return event;
                    });

                    const withdrawals = withdrawalsRaw.map((wr) => {
                        const withdrawal: DepositWithdrawal = {
                            address: wr.CryptoAddress,
                            amount: wr.Amount + "",
                            currency: wr.Currency,
                            fees: "0.0",
                            txid: wr.TxId,
                        };
                        const event: PortfolioEvent = {
                            data: withdrawal,
                            permanent: true,
                            timestamp: new Date(Date.parse(wr.Opened)),
                            type: "withdrawal",
                        };

                        return event;
                    });

                    const ret: PortfolioEvent[] = withdrawals.concat(deposits)
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                    resolve(ret);
                }).catch((err) => reject(err));
            }).catch((err) => reject(err));
        });
    }

    public returnHistory(startDate?: Date): Promise<PortfolioEvent[]> {

        return new Promise<PortfolioEvent[]>((resolve, reject) => {
            const portfolioHistory: PortfolioEvent[] = new Array();

            // Read order history csv file
            const filePath = this.userAuth.portfolioHistory.path;
            fs.exists(filePath, (exists) => {
                if (!exists) {
                    reject("Unable to find history file: " + this.userAuth.portfolioHistory.originalFilename);
                    return;
                }
                fs.createReadStream(filePath)
                    .pipe(csv({
                        headers: [
                            "timestampClosed",
                            "timestampOpened",
                            "market",
                            "type",
                            "ask",
                            "unitsFilled",
                            "unitsTotal",
                            "rate",
                            "cost"],
                        quote: '"',
                    }))
                    .on("data", (data) => {
                        const isSell = data.type.toLowerCase().includes("sell");

                        // Sometimes it parses the headers as a row
                        if (data.type === "Type") {
                            resolve([]);
                        }

                        if (isSell) {
                            const trade: Trade = {
                                boughtAmount: data.cost,
                                boughtCurrency: data.market.split("-")[0],
                                fees: "0.0",
                                rate: data.rate,
                                soldAmount: Big(data.unitsFilled).abs().toFixed(15),
                                soldCurrency: data.market.split("-")[1],
                            };

                            const portfolioEvent: PortfolioEvent = {
                                data: trade,
                                permanent: data.unitsFilled === data.unitsTotal,
                                timestamp: new Date(Date.parse(data.timestampClosed)),
                                type: "trade",
                            };

                            portfolioHistory.push(portfolioEvent);
                        } else {
                            const trade: Trade = {
                                boughtAmount: data.unitsFilled,
                                boughtCurrency: data.market.split("-")[1],
                                fees: "0.0",
                                rate: data.rate,
                                soldAmount: Big(data.cost).abs().toFixed(15),
                                soldCurrency: data.market.split("-")[0],
                            };

                            const portfolioEvent: PortfolioEvent = {
                                data: trade,
                                permanent: data.unitsFilled === data.unitsTotal,
                                timestamp: new Date(Date.parse(data.timestampClosed)),
                                type: "trade",
                            };

                            portfolioHistory.push(portfolioEvent);
                        }
                    })
                    .on("end", () => {
                        this.returnDepositsWithdrawals().then((depositsWithdrawals) => {
                            const ret: PortfolioEvent[] = portfolioHistory.concat(depositsWithdrawals)
                                .sort((a, b) => a.timestamp.getTime() -
                                    b.timestamp.getTime());
                            resolve(ret);
                        });
                    });
            });

        });
    }

    public nonce(): number {
        const now: number = Math.pow(10, 2) * +new Date();

        if (now === this.lastNonce) {
            this.repeatNonce++;
        } else {
            this.repeatNonce = 0;
            this.lastNonce = now;
        }

        const s = (now + this.repeatNonce).toString();
        return +s.substr(s.length - this.NONCE_LENGTH);
    }
}
