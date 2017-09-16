"use strict";

const EventEmitter = require("events");
const Pusher = require("pusher-js/node");

class TickerStream extends EventEmitter {

    constructor(key = "de504dc5763aeef9ff52"){
        super();

        this.key = key;
        this.socket = new Pusher(this.key);
    }

    subscribe(currency, topic = "live_trades", event = "trade"){
        const key = `${topic}_${currency}`;
        const subscription = this.socket.subscribe(key);
        subscription.bind(event, data => {
            const {amount, price} = data;
            const cost = amount * price;
            super.emit(key, Object.assign({}, data, {cost}));
        });
        return key;
    }

    close(){
        if(this.socket){
            return this.socket.disconnect();
        }
    }
}

module.exports = TickerStream;