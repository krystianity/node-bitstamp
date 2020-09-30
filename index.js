"use strict";

const BitstampStream = require("./lib/BitstampStream.js");
const Bitstamp = require("./lib/Bitstamp.js");
const CURRENCY = require("./lib/currency.js");

module.exports = {
    default: Bitstamp,
    BitstampStream,
    Bitstamp,
    CURRENCY
};
