// A mapping of services provided
import * as clone from "clone";

import IWrapper from "./";
import Bittrex from "./bittrex-wrapper";
import Coinbase from "./coinbase-wrapper";
import Etherscan from "./etherscan-wrapper";
import Poloniex from "./poloniex-wrapper";

interface IWrapperConstructor {
    new(serverAuth: { [key: string]: string },
        userAuth: { [key: string]: string }): IWrapper;
}

interface IService {
    name: string;
    key: string;
    formFields: Array<{
        name: string
        description: string
        placeholder?: string // Assume same as desc
        type?: string, // Assume text
        secret?: boolean, // Assume false
    }>;
    serverAuth: { [key: string]: string };
    wrapper: IWrapperConstructor;
}

const services: [IService] = [
    {
        formFields: [
            { name: "portfolioHistory", description: "History CSV", placeholder: "Bittrex History CSV", type: "file" },
            { name: "apiKey", description: "API Key", placeholder: "Bittrex API Key" },
            { name: "apiSecret", description: "API Secret", placeholder: "Bittrex API Secret"}],
        key: "bittrex",
        name: "Bittrex",
        serverAuth: {},
        wrapper: Bittrex,
    },
    {
        formFields: [
            { name: "accessToken", description: "OAuth Access Token", secret: true },
            { name: "refreshToken", description: "OAuth Refresh Token", secret: true },
            { name: "expiresIn", description: "OAuth Token Lifespan", secret: true },
            { name: "tokenType", description: "OAuth Token Type", secret: true },
            { name: "scope", description: "OAuth Permissions Scope", secret: true },
        ],
        key: "coinbase",
        name: "Coinbase",
        serverAuth: {
            clientId: "8cc804e451eb2a636534f046a08bd55421865e6e5a05583391cacb262e5016ca",
            clientSecret: "f1b367badd3e08f778df09a838308913671557a2c44929e86d2e1317f9861620",
        },
        wrapper: Coinbase,
    },
    {
        formFields: [
            { name: "apiKey", description: "API Key", placeholder: "Poloniex API Key" },
            { name: "apiSecret", description: "API Secret", placeholder: "Poloniex API Secret" }],
        key: "poloniex",
        name: "Poloniex",
        serverAuth: {},
        wrapper: Poloniex,
    },
    {
        formFields: [{ name: "walletAddress", description: "Address", placeholder: "Ethereum Wallet Address" }],
        key: "ethereum-wallet",
        name: "Ethereum Wallet",
        serverAuth: { apiKey: "TW6UIF78AZDQDGJI1VDJXSQWHDFWKKQP15" },
        wrapper: Etherscan,
    },
];

// Fill in defaults
services.map((service) => {
    service.formFields.map((formField) => {
        formField.type = formField.type || "text";
        formField.secret = formField.secret || false;
        formField.placeholder = formField.placeholder || formField.description;
    });
});

export let servicesClient = clone(services);
servicesClient.forEach((s) => {
    delete s.serverAuth;
    delete s.wrapper;
    s.formFields = s.formFields.filter((ff) => !ff.secret);
});

export default services;
