#!/usr/bin/env node
require('dotenv').config();

const { runMarketOrders } = require('./src/market-orders');

runMarketOrders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
