"use strict";

const {TickerStream, OrderBookStream, CURRENCY} = require("../index.js");

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

tickerStream.on("connected", () => console.log("ticker stream connected."));
tickerStream.on("disconnected", () => console.log("ticker stream disconnected."));

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

// Live orderBook updates
const orderBookStream = new OrderBookStream();
const orderBookTopic = orderBookStream.subscribe(CURRENCY.BTC_EUR);

orderBookStream.on("connected", () => console.log("order book stream connected."));
orderBookStream.on("disconnected", () => console.log("order book stream disconnected."));

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

setTimeout(() => {
    console.log("closing after 10 seconds.");
    tickerStream.close();
    orderBookStream.close();
}, 10000);