"use strict";

const Promise = require("bluebird");
const request = require("request");
const querystring = require("querystring");

const Signature = require("./Signature.js");

// 600 requests max per 10 minutes
const MAX_CALL_WINDOW = 60 * 1000; // 10 minutes
const MAX_CALLS_PER_WINDOW = 60;

const HTTP_METHOD = {
    GET: "GET",
    POST: "POST"
};

class Bitstamp {

    constructor(opts = {}, base = "https://www.bitstamp.net/api/v2", old = "https://www.bitstamp.net/api"){

        this.base = base;
        this.old = old;
        this.totalCallsMade = 0;
        this.callsInLastMinute = 0;

        this._intv = setInterval(() => {
            this.callsInLastMinute = 0;
        }, MAX_CALL_WINDOW);

        const {
            key,
            secret,
            clientId
        } = opts;

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
            }
        };

        if(body != null){

            if(!signed){
                body = querystring.stringify(body);
            } else {
                body = this.signature.signBody(body);
            }

            options.body = body;
        }

        return options;
    }

    call(endpoint, method = "GET", body = null, signed = false, old = false){
        return new Promise((resolve, reject) => {

            this.totalCallsMade++;
            this.callsInLastMinute++;

            if(this.callsInLastMinute >= MAX_CALLS_PER_WINDOW){
                return reject(new Error(`Must not exceed ${MAX_CALLS_PER_WINDOW} calls per ${MAX_CALL_WINDOW} ms.`));
            }

            request(this._getOptions(endpoint, body, method, signed, old), (error, response, body) => {

                if(error){
                    return reject(error);
                }

                try {
                    body = JSON.parse(body);
                } catch(error){
                    //empty
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
    
    /* API */

    ticker(currency = null){

        const ep = "ticker";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    tickerHour(currency = null){

        const ep = "ticker_hour";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    orderBook(currency = null){

        const ep = "order_book";
        return this.call(this._resolveEP(ep, currency), HTTP_METHOD.GET, null, false);
    }

    transactions(currency = null, time = "hour"){

        const ep = "transactions";
        return this.call(this._resolveEP(ep, currency) + `?time=${time}`, HTTP_METHOD.GET, null, false);
    }

    conversionRate(){
        
        const ep = "eur_usd";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.GET, null, false);
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
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true);
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

    bitcoinWithdrawal(amount, address, instant = false){
        
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