"use strict";

const crypto = require("crypto");
const querystring = require("querystring");
const debug = require("debug")("node-bitstamp:signature");

class Signature {

    constructor(key, secret, clientId){

        this.key = key;
        this.secret = secret;
        this.clientId = clientId;

        this.nonceIncr = null;
        this.last = null;
    }

    _generateNonce(){

        const now = Date.now();

        //prevent the same nonce during multiple requests in the same ms
        // @link https://github.com/askmike/bitstamp
        if(now !== this.last){
            this.nonceIncr = -1;
        }

        this.last = now;
        this.nonceIncr++;

        // add padding to nonce incr
        // @link https://stackoverflow.com/questions/6823592/numbers-in-the-form-of-001
        const padding = this.nonceIncr < 10 ? "000" :
            this.nonceIncr < 100 ? "00" :
            this.nonceIncr < 1000 ?  "0" : "";

        const nonce = now + padding + this.nonceIncr;
        debug("nonce", nonce);
        return nonce;
    }

    /*
        Signature is a HMAC-SHA256 encoded message containing nonce, customer ID and API key.
        The HMAC-SHA256 code must be generated using a secret key that was generated with your
        API key. This code must be converted to it's hexadecimal representation
        (64 uppercase characters).
    */
    _createSignature(){
        const nonce = this._generateNonce();
        const message = nonce + this.clientId + this.key;
        const signer = crypto.createHmac("sha256", Buffer.from(this.secret, "utf8"));
        const signature = signer.update(message).digest("hex").toUpperCase();
        return {signature, nonce};
    }

    _compactObject(object = {}){

        const clone = Object.assign({}, object);
        Object.keys(object).forEach(key => {
            if(typeof object[key] === "undefined" || object[key] === null){
                delete clone[key];
            }
        });

        return clone;
    }

    signBody(body = {}){

        if(typeof body !== "object"){
            throw new Error("body must be a key/value object.");
        }

        const {signature, nonce} = this._createSignature();
        let args = Object.assign({}, body, {
            key: this.key,
            signature,
            nonce
        });

        args = this._compactObject(args);
        return querystring.stringify(args);
    }
}

module.exports = Signature;