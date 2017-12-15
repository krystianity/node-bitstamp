# node-bitstamp

bitstamp REST and WS API Node.js client :dollar:

## README Overview

* [Offers](#offers)
* [Donate](#donate)
* [Example](#example)
* [Debug Info](#debug-info)
* [A word on parallel requests](#a-word-on-parallel-requests)
* [License](#license)

## Offers

* version 1 and version 2 of the bistamp REST API
* supports all new api endpoints
* 100% promise based
* optional full control of response status and headers
* all bitstamp currencies available: Bitcoin, Ethereum, Litecoin, Ripple, XRP
* also implements the websocket API to listen for live trade events
* takes care of signature and nonce automatically
* takes care of max. request quotas automatically (prevents bans)
* install via `npm i node-bitstamp` or `yarn add node-bitstamp`

## Donate

* If this client helped you, feel free to buy me a :beer:
* BTC: `3FX5SGcizKVwsezqFRbDVgQ7UhGwx6XArU`
* ETH: `0x54e0a18386eb7831de38a438cd3fc0162e5d33e6`
* LTC: `MUJgac5DYntbvjH7zLAjjjm3z9QgPfVLgH`
* Donations are much appreciated.
* If you dont want to give away money, starring the project is also a way of saying
    thank you :)

## Example

* you can find a runnable api example [here](example/api.js), run via `yarn example:api`
* you can find a runnable stream example [here](example/stream.js), run via `yarn example:stream`

```javascript
"use strict";

const {TickerStream, OrderBookStream, Bitstamp, CURRENCY} = require("node-bitstamp");

//printing available currencies
console.log(CURRENCY);

/* STREAMS */
// @ https://www.bitstamp.net/websocket/

// Live trades
const tickerStream = new TickerStream();
const tickerTopic = tickerStream.subscribe(CURRENCY.ETH_EUR);

/*
    as tickers are re-usable (subscribe to multiple currencies)
    every subscribe actions returns a topic name, which is the actual event you
    can listen to after subscription
*/

tickerStream.on("connected", () => {});
tickerStream.on("disconnected", () => {});

/*
    sadly pusher-js does not really expose errors in an acceptable manner
    therefore you will have to trust its automatic re-connect handling
    in case of disconnections and network errors
*/

tickerStream.on(tickerTopic, data => {
    console.log(data);
    /* e.g.
        { 
            amount: 0.01513062,
            buy_order_id: 297260696,
            sell_order_id: 297260910,
            amount_str: '0.01513062',
            price_str: '212.80',
            timestamp: '1505558814',
            price: 212.8,
            type: 1,
            id: 21565524,
            cost: 3.219795936
        }
    */
});

tickerStream.close();

// Live orderBook updates
const orderBookStream = new OrderBookStream();
const orderBookTopic = orderBookStream.subscribe(CURRENCY.BTC_EUR);

orderBookStream.on("connected", () => {});
orderBookStream.on("disconnected", () => {});

/*
    sadly pusher-js does not really expose errors in an acceptable manner
    therefore you will have to trust its automatic re-connect handling
    in case of disconnections and network errors
*/

orderBookStream.on(orderBookTopic, data => {
    console.log(data);
    /* e.g.
        { bids:
        [ 
            [ '3284.06000000', '0.16927410' ],
            [ '3284.05000000', '1.00000000' ],
            [ '3284.02000000', '0.72755647' ],
            .....
        ],
        asks:
        [ 
            [ '3289.00000000', '3.16123001' ],
            [ '3291.99000000', '0.22000000' ],
            [ '3292.00000000', '49.94312963' ],
            .....
        ] }
    */
});

orderBookStream.close();


/* REST-API */
// @ https://www.bitstamp.net/api/

// @ https://www.bitstamp.net/account/login/
// To get an API key, go to "Account", "Security" and then "API Access". 
// Set permissions and click "Generate key"
// Dont forget to active the key and confirm the email.
const key = "abc3def4ghi5jkl6mno7";
const secret = "abcdefghijklmno";
const clientId = "123123";

const bitstamp = new Bitstamp({
    key,
    secret,
    clientId,
    timeout: 5000,
    rateLimit: true //turned on by default
});

const run = async () => {

    /*
        Every api function returns a bluebird promise.
        The promise only rejects on network errors or timeouts.
        A successfull promise always resolves in an object containing status, headers and body.
        status is the http status code as number, headers is an object of http response headers
        and body is the parsed JSON response body of the api, you dont need to parse the results
        yourself you can simply continue by accessing the object.
    */

    /* PUBLIC */
    const ticker = await bitstamp.ticker(CURRENCY.ETH_BTC).then(({status, headers, body}) => console.log(body));
    await bitstamp.tickerHour(CURRENCY.ETH_BTC);
    await bitstamp.orderBook(CURRENCY.ETH_BTC);
    await bitstamp.transactions(CURRENCY.ETH_BTC, "hour");
    await bitstamp.conversionRate();

    /* PRIVATE */
    const balance = await bitstamp.balance().then(({body:data}) => data);
    await bitstamp.userTransaction(CURRENCY.ETH_BTC, {offset, limit, sort});

    await bitstamp.openOrders(CURRENCY.ETH_BTC);
    await bitstamp.openOrdersAll();
    await bitstamp.orderStatus(id);
    await bitstamp.cancelOrder(id);
    await bitstamp.cancelOrdersAll();

    await bitstamp.buyLimitOrder(amount, price, currency, limit_price, daily_order);
    await bitstamp.sellLimitOrder(amount, price, currency, limit_price, daily_order);
    await bitstamp.buyMarketOrder(amount, currency);
    await bitstamp.sellMarketOrder(amount, currency);

    await bitstamp.withDrawalRequests(timedelta);
    await bitstamp.bitcoinWithdrawal(amount, address, instant);
    await bitstamp.litecoinWithdrawal(amount, address);
    await bitstamp.ethereumWithdrawal(amount, address);
    await bitstamp.rippleWithdrawal(amount, address, currency);
    await bitstamp.xrpWithdrawal(amount, address, destination_tag);

    await bitstamp.bitcoinDepositAdress().then(({body}) => console.log(body));
    await bitstamp.litecoinDepositAdress().then(({body}) => console.log(body));
    await bitstamp.ethereumDepositAdress().then(({body}) => console.log(body));
    await bitstamp.rippleDepositAdress().then(({body}) => console.log(body));
    await bitstamp.xrpDepositAdress().then(({body}) => console.log(body));

    await bitstamp.unconfirmedBitcoinDeposits();
    await bitstamp.transferSubToMain(amount, currency, subAccount);
    await bitstamp.transferMainToSub(amount, currency, subAccount);

    await bitstamp.openBankWithdrawal(/* {..} */);
    await bitstamp.bankWithdrawalStatus(id);
    await bitstamp.cancelBankWithdrawal(id);

    await bitstamp.newLiquidationAddress(currency);
    await bitstamp.liquidationAddressInfo(address);
};

run().then(() => {
    console.log(bitstamp.getStats());
    bitstamp.close();
});
```

## Debug Info

`DEBUG=node-bitstamp:* npm start`

## A word on parallel requests

* The client will never generate the same nonce for two requests.
* But a new request must always contain a higher nonce, than the last request before.
* When you make multiple calls in parallel (pretty easy in node..) there is a chance
    that the later calls reach the bitstamp api earlier than the first, causing the first
    requests to fail with an `invalid nonce` error.
* To prevent this you should make these calls sequentially.
* Besides chaining promises, this is another way to do it:

```javascript
const async = require("async"); // npm i async or yarn add async

async.series([
    cb => bitstamp.bitcoinDepositAdress()
        .then(r => cb(null, "BTC: " + r.body)).catch(e => cb(e)),
    cb => bitstamp.ethereumDepositAdress()
        .then(r => cb(null, "ETH: " + r.body.address)).catch(e => cb(e)),
    cb => bitstamp.litecoinDepositAdress()
        .then(r => cb(null, "LTC: " + r.body.address)).catch(e => cb(e))
], (error, data) => {

    if(error){
        return console.error(error);
    }

    console.log(data); // [ "BTC: ..", "ETH: ..", "LTC: .." ]
});
```

## License

MIT