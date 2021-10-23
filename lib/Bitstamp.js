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

        const ep = "btc_withdrawal";
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

    paxWithdrawal(amount, address){

        const ep = "pax_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    xlmWithdrawal(amount, address, memo_id = null){

        const ep = "xlm_withdrawal";
        const body = {
            amount,
            address,
            memo_id
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    linkWithdrawal(amount, address){

        const ep = "link_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    omgWithdrawal(amount, address){

        const ep = "omg_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    usdcWithdrawal(amount, address){

        const ep = "usdc_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    aaveWithdrawal(amount, address){

        const ep = "aave_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    batWithdrawal(amount, address){

        const ep = "bat_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    umaWithdrawal(amount, address){

        const ep = "uma_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    daiWithdrawal(amount, address){

        const ep = "dai_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    kncWithdrawal(amount, address){

        const ep = "knc_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    mkrWithdrawal(amount, address){

        const ep = "mkr_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    zrxWithdrawal(amount, address){

        const ep = "zrx_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    gusdWithdrawal(amount, address){

        const ep = "gusd_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    algoWithdrawal(amount, address){

        const ep = "algo_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    audioWithdrawal(amount, address){

        const ep = "audio_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    crvWithdrawal(amount, address){

        const ep = "crv_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    snxWithdrawal(amount, address){

        const ep = "snx_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    uniWithdrawal(amount, address){

        const ep = "uni_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    yfiWithdrawal(amount, address){

        const ep = "yfi_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    compWithdrawal(amount, address){

        const ep = "comp_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    grtWithdrawal(amount, address){

        const ep = "grt_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    usdtWithdrawal(amount, address){

        const ep = "usdt_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    eurtWithdrawal(amount, address){

        const ep = "eurt_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    maticWithdrawal(amount, address){

        const ep = "matic_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    sushiWithdrawal(amount, address){

        const ep = "sushi_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    chzWithdrawal(amount, address){

        const ep = "chz_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    enjWithdrawal(amount, address){

        const ep = "enj_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    hbarWithdrawal(amount, address, memo_id = null){

        const ep = "hbar_withdrawal";
        const body = {
            amount,
            address,
            memo_id
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    alphaWithdrawal(amount, address){

        const ep = "alpha_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    axsWithdrawal(amount, address){

        const ep = "axs_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    fttWithdrawal(amount, address){

        const ep = "ftt_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    sandWithdrawal(amount, address){

        const ep = "sand_withdrawal";
        const body = {
            amount,
            address
        };
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, body, true);
    }

    storjWithdrawal(amount, address){

        const ep = "storj_withdrawal";
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

        const ep = "btc_address";
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

    paxDepositAdress(){

        const ep = "pax_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    xlmDepositAdress(){

        const ep = "xlm_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    linkDepositAdress(){

        const ep = "link_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    omgDepositAdress(){

        const ep = "omg_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    usdcDepositAdress(){

        const ep = "usdc_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    aaveDepositAdress(){

        const ep = "aave_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    batDepositAdress(){

        const ep = "bat_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    umaDepositAdress(){

        const ep = "uma_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    daiDepositAdress(){

        const ep = "dai_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    kncDepositAdress(){

        const ep = "knc_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    mkrDepositAdress(){

        const ep = "mkr_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    zrxDepositAdress(){

        const ep = "zrx_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    gusdDepositAdress(){

        const ep = "gusd_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    algoDepositAdress(){

        const ep = "algo_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    audioDepositAdress(){

        const ep = "audio_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    crvDepositAdress(){

        const ep = "crv_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    snxDepositAdress(){

        const ep = "snx_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    uniDepositAdress(){

        const ep = "uni_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    yfiDepositAdress(){

        const ep = "yfi_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    compDepositAdress(){

        const ep = "comp_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    grtDepositAdress(){

        const ep = "grt_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    usdtDepositAdress(){

        const ep = "usdt_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    eurtDepositAdress(){

        const ep = "eurt_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    maticDepositAdress(){

        const ep = "matic_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    sushiDepositAdress(){

        const ep = "sushi_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    chzDepositAdress(){

        const ep = "chz_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    enjDepositAdress(){

        const ep = "enj_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    hbarDepositAdress(){

        const ep = "hbar_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    alphaDepositAdress(){

        const ep = "alpha_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    axsDepositAdress(){

        const ep = "axs_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    fttDepositAdress(){

        const ep = "ftt_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    sandDepositAdress(){

        const ep = "sand_address";
        return this.call(this._resolveEP(ep, null), HTTP_METHOD.POST, {}, true, true);
    }

    storjDepositAdress(){

        const ep = "storj_address";
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
