import axios, { AxiosRequestConfig } from "axios";
import { AxiosResponse } from "axios";

export class PTAuthenticationError {
    public response: AxiosResponse;
    public message: string;
    public stack: string;

    constructor(response: AxiosResponse, message?: string) {
        this.response = response;
        this.message = message || "Failed to authenticate with server";
        this.stack = (new Error()).stack;
    }
}

export class PTConnectionError {
    public request: AxiosRequestConfig;
    public message: string;
    public stack: string;

    constructor(request: AxiosRequestConfig, message?: string) {
        this.request = request;
        this.message = message || "Failed to connect to server";
        this.stack = (new Error()).stack;
    }
}

export class PTParseError {
    public message: string;
    public stack: string;
    public response: AxiosResponse;
    public parseErrorLocation: string;

    constructor(response: AxiosResponse, parseErrorLocation?: string, message?: string) {
        this.response = response;
        this.parseErrorLocation = parseErrorLocation;
        this.message = message || "Failed to parse server response";
        this.stack = (new Error()).stack;
    }
}
