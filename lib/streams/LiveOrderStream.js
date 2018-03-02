"use strict";

const EventEmitter = require("events");
const Pusher = require("pusher-js/node");

class LiveOrderStream extends EventEmitter {

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

    subscribe(currency, topic = "live_orders", event = ["order_created","order_changed","order_deleted"]){
        const key = currency ? `${topic}_${currency}` : topic;
        const subscription = this.socket.subscribe(key);
        subscription.bind(event[0], data => {
            const {amount, price} = data;
            super.emit(key, Object.assign({}, data, {currency, 'event': event[0]}));
        });
        subscription.bind(event[1], data => {
            const {amount, price} = data;
            super.emit(key, Object.assign({}, data, {currency, 'event': event[1]}));
        });
        subscription.bind(event[2], data => {
            const {amount, price} = data;
            super.emit(key, Object.assign({}, data, {currency, 'event': event[2]}));
        });
        return key;
    }

    close(){
        if(this.socket){
            return this.socket.disconnect();
        }
    }
}

module.exports = LiveOrderStream;
