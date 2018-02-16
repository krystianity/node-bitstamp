"use strict";

const EventEmitter = require("events");
const Pusher = require("pusher-js/node");

class TickerStream extends EventEmitter {

    constructor(key = "de504dc5763aeef9ff52", cluster= "mt1", encrypted = true){
        super();

        this.key = key;
        this.socket = new Pusher(this.key, {
            cluster,
            encrypted
        });

        this.socket.connection.bind("connected", () => {
            super.emit("connected");
        });

        this.socket.connection.bind("disconnected", () => {
            super.emit("disconnected");
        });
    }

    subscribe(currency, topic = "live_trades", event = "trade"){
        const key = currency ? `${topic}_${currency}` : topic;
        const subscription = this.socket.subscribe(key);
        subscription.bind(event, data => {
            const {amount, price} = data;
            const cost = amount * price;
            super.emit(key, Object.assign({}, data, {cost, key}));
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
