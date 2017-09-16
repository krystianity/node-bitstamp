# node-bitstamp

bitstamp REST and WS API Node.js client :dollar:

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

## Example

```javascript
"use strict";

const {TickerStream, Bitstamp, CURRENCY} = require("node-bitstamp");

//printing available currencies
console.log(CURRENCY);

/* STREAM */
// @ https://www.bitstamp.net/websocket/

const stream = new TickerStream();
const topic = stream.subscribe(CURRENCY.ETH_EUR);

stream.on(topic, data => {
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

stream.close();



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
    const ticker = await bitstamp.ticker(CURRENCY.ETH_BTC).then(({status, headers, body}) => body;
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

## License

MIT