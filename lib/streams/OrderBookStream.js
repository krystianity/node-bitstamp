"use strict";

const EventEmitter = require("events");
const Pusher = require("pusher-js/node");

class OrderBookStream extends EventEmitter {

    constructor(key = "de504dc5763aeef9ff52"){
        super();

        this.key = key;
        this.socket = new Pusher(this.key);
    }

    subscribe(currency, topic = "order_book", event = "data"){
        const key = `${topic}_${currency}`;
        const subscription = this.socket.subscribe(key);
        subscription.bind(event, data => {
            super.emit(key, data);
        });
        return key;
    }

    close(){
        if(this.socket){
            return this.socket.disconnect();
        }
    }
}

module.exports = OrderBookStream;