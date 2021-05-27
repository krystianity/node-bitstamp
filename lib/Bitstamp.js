"use strict";

const Promise = require("bluebird");
const request = require("request");
const querystring = require("querystring");
const debug = require("debug")("node-bitstamp:client");

const Signature = require("./Signature.js");

// 600 requests max per 10 minutes
const MAX_CALL_WINDOW = 60 * 1000; // 10 minutes
const MAX_CALLS_PER_WINDOW = 60;

const HTTP_METHOD = {
    GET: "GET",
    POST: "POST"
};

class Bitstamp {

    constructor(opts = {}, base = "https://www.bitstamp.net/api/v2",
        old = "https://www.bitstamp.net/api"){

        this.base = base;
        this.old = old;
        this.totalCallsMade = 0;
        this.callsInLastMinute = 0;
        this.lastCall = null;

        this._intv = setInterval(() => {
            this.callsInLastMinute = 0;
        }, MAX_CALL_WINDOW);

        const {
            key,
            secret,
            clientId,
            timeout,
            rateLimit
        } = opts;

        this.timeout = timeout || 5000;
        this.rateLimit = typeof rateLimit === "undefined" ? true : rateLimit;
        this.signature = new Signature(key, secret, clientId);
    }

    _getUrl(endpoint = "", old = false){
        return `${old ? this.old : this.base}/${endpoint}`;
    }

    _getOptions(endpoint = "", body = null, method = "GET", signed = false, old = false){

        const options = {
            method,
            url: this._getUrl(endpoint, old),
            headers: {
                "content-type": "application/x-www-form-urlencoded",
                "accept": "application/json"
            },
            timeout: this.timeout
        };

        if(body != null){

            if(!signed){
                body = querystring.stringify(body);
            } else {
                body = this.signature.signBody(body);
            }

            options.body = body;
        }

        debug("calling", options.url, "..");
        return options;
    }

    call(endpoint, method = "GET", body = null, signed = false, old = false){
        return new Promise((resolve, reject) => {

            this.totalCallsMade++;
            this.callsInLastMinute++;

            if(this.callsInLastMinute >= MAX_CALLS_PER_WINDOW && this.rateLimit){
                return reject(new Error(`Must not exceed ${MAX_CALLS_PER_WINDOW} calls per ${MAX_CALL_WINDOW} ms.`));
            }

            this.lastCall = Date.now();

            const options = this._getOptions(endpoint, body, method, signed, old);
            request(options, (error, response, body) => {

                // The HTTP request did not succeed.
                // e.g. ESOCKETTIMEDOUT
                if (error){
                    return reject(error);
                }

                // The HTTP request worked but returned an error code.
                // e.g. 401 unauthorized
                if (response.statusCode < 200 || response.statusCode > 299) {

                    if(!body){
                        return reject(new Error("No body can be provided."));
                    }

                    return reject(new Error("With body: " + body));
                }

                debug("result", options.url, response.statusCode);
                try {
                    body = JSON.parse(body);
                } catch (error) {
                    return reject(error);
                }

                // There was an API request error.
                // e.g. Insufficient funds in case of withdrawal.
                if (body.status === "error") {
                    return reject(body.reason);
                }

                // Typically this happens when the request's statuscode
                // is not 2xx but we check here just in case.
                if (body.error) {
                    return reject(body.error);
                }

                resolve({
                    status: response.statusCode,
                    headers: response.headers,
                    body
                });
            });
        });
    }

    close(){
        if(this._intv){
            clearInterval(this._intv);
        }
    }

    _resolveEP(endpoint, currency = null){

        if(!currency){
            return `${endpoint}/`;
        } else {
            return `${endpoint}/${currency}/`;
        }
    }

    getStats(){
        return {
            lastCall: this.lastCall,
            callsInLastMinute: this.callsInLastMinute,
            totalCallsMade: this.totalCallsMade
        };
    }

    /* API */

    ticker(currency = null){

        const ep = "ticker";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    tickerHour(currency = null){

        const ep = "ticker_hour";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    ohlcData(currency = null, start = null, end = null, step = 60, limit = 100){

      const query = {step, limit};

      if (start) {
        query.start = start;
      }

      if (end) {
        query.end = end;
      }

      const ep = "ohlc";
      return this.call(this._resolveEP(ep, currency) + `?${querystring.stringify(query)}`, HTTP_METHOD.GET, null, false);
    }

    orderBook(currency = null){

        const ep = "order_book";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    transactions(currency = null, time = "hour"){

        const ep = "transactions";
        return this.call(this._resolveEP(ep, currency) + `?${querystring.stringify({time})}`, HTTP_METHOD.GET, null, false);
    }

    conversionRate(){

        const ep = "eur_usd";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.GET, null, false, true);
    }

    /* PRIVATE */

    balance(currency = null){

        const ep = "balance";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, {}, true);
    }

    userTransaction(currency = null, opts = {}){

        const ep = "user_transactions";
        //opts // {offset, limit, sort}
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, opts || {}, true);
    }

    cryptoTransactions(currency = null, opts = {}){

        const ep = "crypto-transactions";
        //opts // {offset, limit, sort}
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, opts || {}, true);
    }

    openOrders(currency = null){

        const ep = "open_orders";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, {}, true);
    }

    openOrdersAll(){

        const ep = "open_orders";
        return this.call(this._resolveEP(ep, "all/"), HTTP_METHOD.POST, {}, true);
    }

    orderStatus(id){

        const ep = "order_status";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {id}, true);
    }

    cancelOrder(id){

        const ep = "cancel_order";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {id}, true);
    }

    cancelOrdersAll(){

        const ep = "cancel_all_orders";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    buyLimitOrder(amount, price, currency = null, limit_price = null, daily_order = null){

        const ep = "buy";
        const body = {
            amount,
            price,
            limit_price,
            daily_order
        };
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true);
    }

    buyMarketOrder(amount, currency = null){

        const ep = "buy/market";
        const body = {
            amount
        };
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true);
    }

    buyInstantOrder(amount , currency = null){
        const ep = "buy/instant";
        const body = {
            amount
        }
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true );
    }

    sellInstantOrder( amount, currency =null){
        const ep = "sell/instant";
        const body = {
            amount
        }
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true );
    }



    sellLimitOrder(amount, price, currency = null, limit_price = null, daily_order = null){

        const ep = "sell";
        const body = {
            amount,
            price,
            limit_price,
            daily_order
        };
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true);
    }

    sellMarketOrder(amount, currency = null){

        const ep = "sell/market";
        const body = {
            amount
        };
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.POST, body, true);
    }

    /* OTHER */

    withDrawalRequests(timedelta = null){

        const ep = "withdrawal_requests";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {timedelta}, true, true);
    }

    bitcoinWithdrawal(amount, address, instant = 0){

        const ep = "bitcoin_withdrawal";
        const body = {
            amount,
            address,
            instant
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true, true);
    }

    litecoinWithdrawal(amount, address){

        const ep = "ltc_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    ethereumWithdrawal(amount, address){

        const ep = "eth_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    rippleWithdrawal(amount, address, currency){

        const ep = "ripple_withdrawal";
        const body = {
            amount,
            address,
            currency
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true, true);
    }

    xrpWithdrawal(amount, address, destination_tag = null){

        const ep = "xrp_withdrawal";
        const body = {
            amount,
            address,
            destination_tag
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    bchWithdrawal(amount, address){

        const ep = "bch_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    ethereumDepositAdress(){

        const ep = "eth_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true);
    }

    xrpDepositAdress(){

        const ep = "xrp_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true);
    }

    litecoinDepositAdress(){

        const ep = "ltc_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true);
    }

    bitcoinDepositAdress(){

        const ep = "bitcoin_deposit_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    bchDepositAdress(){

        const ep = "bch_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true);
    }

    rippleDepositAdress(){

        const ep = "ripple_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    unconfirmedBitcoinDeposits(){

        const ep = "unconfirmed_btc";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    transferSubToMain(amount, currency, subAccount = null){

        const ep = "transfer-to-main";
        const body = {
            amount,
            currency,
            subAccount
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    transferMainToSub(amount, currency, subAccount = null){

        const ep = "transfer-from-main";
        const body = {
            amount,
            currency,
            subAccount
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    openBankWithdrawal(body = {}){

        const ep = "withdrawal/open/";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    bankWithdrawalStatus(id){

        const ep = "withdrawal/status/";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {id}, true);
    }

    cancelBankWithdrawal(id){

        const ep = "withdrawal/cancel/";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {id}, true);
    }

    newLiquidationAddress(liquidation_currency){

        const ep = "liquidation_address/new";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {liquidation_currency}, true);
    }

    liquidationAddressInfo(address){

        const ep = "liquidation_address/new";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {address}, true);
    }
}

module.exports = Bitstamp;
