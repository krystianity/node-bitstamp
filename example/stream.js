"use strict";

const {BitstampStream, CURRENCY} = require("../index.js");

//printing available currencies
console.log(CURRENCY);

/* STREAMS */
// @ https://www.bitstamp.net/websocket/v2/

const bitstampStream = new BitstampStream();

bitstampStream.on("connected", () => {
    /*
        as the stream is re-usable (subscribe to multiple currencies / channels)
        every subscribe actions returns a channel name, which is the actual event you
        can listen to after subscription
    */
    const ethEurTickerChannel = bitstampStream.subscribe(bitstampStream.CHANNEL_LIVE_TRADES, CURRENCY.ETH_EUR);
    bitstampStream.on(ethEurTickerChannel, ({ data, event }) => {
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
});
bitstampStream.on("disconnected", () => {});

// Live orderBook updates
bitstampStream.on("connected", () => {
    const btcEurOrderBookChannel = bitstampStream.subscribe(bitstampStream.CHANNEL_ORDER_BOOK, CURRENCY.BTC_EUR);

    bitstampStream.on(btcEurOrderBookChannel, ({ data, event }) => {
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
});

bitstampStream.on("error", (e) => console.error(e));

setTimeout(() => {
    console.log("closing after 10 seconds.");
    bitstampStream.close();
}, 10000);
