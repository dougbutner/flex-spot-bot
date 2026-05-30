const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
const fetch = require('node-fetch');
const { TextEncoder, TextDecoder } = require('util');

const Bagman = require('../lib/bagman');

const alcorContract = 'alcor';
const numOrders = 3;
const priceSpread = 0.01;
const balanceReserve = 0.99;

const tokens = {
  EASY: {
    contract: 'mon3y',
    precision: 6,
    markets: {
      XUSDC: { id: '1268', contract: 'xtokens', precision: 6 },
    },
  },
  INDEX: {
    contract: 'xfund',
    precision: 6,
    markets: {
      XPR: { id: '1375', contract: 'eosio.token', precision: 4 },
    },
  },
  MEME: {
    contract: 'm3m3',
    precision: 4,
    markets: {
      XPR: { id: '1213', contract: 'eosio.token', precision: 4 },
    },
  },
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env: ${name} (copy .env.example to .env and fill in values)`);
  }
  return String(value).trim();
}

function parseQuantity(value) {
  return parseFloat(String(value).split(' ')[0]);
}

function formatAmount(amount, precision) {
  return amount.toFixed(precision);
}

function splitBalance(total, count, precision) {
  const weights = Array.from({ length: count }, (_, i) => i + 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const factor = 10 ** precision;
  let units = Math.floor(total * factor + 1e-9);
  const splits = [];
  let allocated = 0;

  for (let i = 0; i < count; i++) {
    if (i === count - 1) splits.push((units - allocated) / factor);
    else {
      const share = Math.floor((units * weights[i]) / weightSum);
      allocated += share;
      splits.push(share / factor);
    }
  }

  return splits;
}

function nameToUint64(s) {
  const char = (c) => {
    if (c >= 'a' && c <= 'z') return (c.charCodeAt(0) - 'a'.charCodeAt(0)) + 6;
    if (c >= '1' && c <= '5') return (c.charCodeAt(0) - '1'.charCodeAt(0)) + 1;
    return 0;
  };
  let n = 0n;
  let i = 0;
  for (; i < 12 && s[i]; i++) n |= BigInt(char(s[i]) & 0x1f) << BigInt(64 - 5 * (i + 1));
  if (i === 12) n |= BigInt(char(s[i]) & 0x0f);
  return n.toString();
}

function countQuoteMarkets() {
  const counts = {};
  for (const token of Object.values(tokens)) {
    for (const quoteSymbol of Object.keys(token.markets)) {
      counts[quoteSymbol] = (counts[quoteSymbol] || 0) + 1;
    }
  }
  return counts;
}

function createApi() {
  const privateKey = requireEnv('FLEX_PRIVATE_KEY');
  const rpcUrl = requireEnv('JSON_RPC_XPR');
  const signatureProvider = new JsSignatureProvider([privateKey]);
  const rpc = new JsonRpc(rpcUrl, { fetch });
  return new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
}

async function getTokenBalance(rpc, currActor, contract, symbol) {
  const rows = await rpc.get_table_rows({
    code: contract,
    table: 'accounts',
    scope: currActor,
    limit: 1,
    lower_bound: symbol,
    upper_bound: symbol,
  });
  if (!rows.rows.length || !rows.rows[0].balance) return 0;
  return parseQuantity(rows.rows[0].balance);
}

async function getAccountOrders(rpc, currActor, marketId) {
  const actor64 = nameToUint64(currActor);
  const opts = { scope: marketId, code: alcorContract, key_type: 'i64', index_position: 3, lower_bound: actor64, upper_bound: actor64 };
  const [sell_orders, buy_orders] = await Promise.all([
    rpc.get_table_rows({ ...opts, table: 'sellorder' }),
    rpc.get_table_rows({ ...opts, table: 'buyorder' }),
  ]);
  return { sell_orders: sell_orders.rows, buy_orders: buy_orders.rows };
}

function buildClearActions(currActor, marketId, orders) {
  const cancel = (action, rows) => rows.map((order) => ({
    contract: alcorContract,
    action,
    actor: currActor,
    permission: 'active',
    data: { executor: currActor, market_id: marketId, order_id: order.id },
  }));
  return [...cancel('cancelbuy', orders.buy_orders), ...cancel('cancelsell', orders.sell_orders)];
}

async function getMarketPrices(rpc, marketId) {
  const opts = { code: alcorContract, scope: marketId, limit: 1, key_type: 'i128', index_position: 2 };
  const [sell_rows, buy_rows] = await Promise.all([
    rpc.get_table_rows({ ...opts, table: 'sellorder' }),
    rpc.get_table_rows({ ...opts, table: 'buyorder' }),
  ]);
  if (!sell_rows.rows.length || !buy_rows.rows.length) throw new Error(`market ${marketId}: order book empty`);
  return {
    best_sell: parseQuantity(sell_rows.rows[0].ask) / parseQuantity(sell_rows.rows[0].bid),
    best_buy: parseQuantity(buy_rows.rows[0].bid) / parseQuantity(buy_rows.rows[0].ask),
  };
}

function buildOrderActions(currActor, tokenSymbol, token, quoteSymbol, market, prices, quoteBudget, baseBalance) {
  const actions = [];
  const buyAmounts = splitBalance(quoteBudget, numOrders, market.precision);
  const sellAmounts = splitBalance(baseBalance * balanceReserve, numOrders, token.precision);

  console.log(`[${tokenSymbol}/${quoteSymbol}] quote budget:`, quoteBudget, 'base:', baseBalance * balanceReserve);

  for (let i = 0; i < numOrders; i++) {
    const level = i + 1;
    const price_buy = level === 1 ? prices.best_buy : prices.best_buy / (1 + priceSpread * level);
    const price_sell = level === 1 ? prices.best_sell : prices.best_sell * (1 + priceSpread * level);

    if (buyAmounts[i] > 0) {
      const offer = formatAmount(buyAmounts[i], market.precision);
      const want = formatAmount(buyAmounts[i] / price_buy, token.precision);
      actions.push({
        contract: market.contract,
        action: 'transfer',
        actor: currActor,
        permission: 'active',
        data: {
          from: currActor,
          to: alcorContract,
          quantity: `${offer} ${quoteSymbol}`,
          memo: `${want} ${tokenSymbol}@${token.contract}`,
        },
      });
    }

    if (sellAmounts[i] > 0) {
      const offer = formatAmount(sellAmounts[i], token.precision);
      const want = formatAmount(sellAmounts[i] * price_sell, market.precision);
      actions.push({
        contract: token.contract,
        action: 'transfer',
        actor: currActor,
        permission: 'active',
        data: {
          from: currActor,
          to: alcorContract,
          quantity: `${offer} ${tokenSymbol}`,
          memo: `${want} ${quoteSymbol}@${market.contract}`,
        },
      });
    }
  }

  return actions;
}

async function executeBatch(api, batch) {
  if (!batch.length) return;
  const bagman = new Bagman(api);
  await bagman.batMan(batch);
  console.log('tx:', bagman.result?.transaction_id, `(${batch.length} actions)`);
}

async function processMarket(api, rpc, currActor, tokenSymbol, token, quoteSymbol, market, quoteMarketCounts) {
  const label = `${tokenSymbol}/${quoteSymbol}`;
  console.log(`\n--- ${label} market ${market.id} ---`);

  const [orders, prices, quoteBalance, baseBalance] = await Promise.all([
    getAccountOrders(rpc, currActor, market.id),
    getMarketPrices(rpc, market.id),
    getTokenBalance(rpc, currActor, market.contract, quoteSymbol),
    getTokenBalance(rpc, currActor, token.contract, tokenSymbol),
  ]);

  const quoteBudget = quoteBalance * balanceReserve / quoteMarketCounts[quoteSymbol];
  if (quoteBudget <= 0 && baseBalance <= 0) {
    console.log(`skip ${label}: no balance`);
    return;
  }

  const batch = [
    ...buildClearActions(currActor, market.id, orders),
    ...buildOrderActions(currActor, tokenSymbol, token, quoteSymbol, market, prices, quoteBudget, baseBalance),
  ];

  console.log(`${label}: ${batch.length} actions (${orders.buy_orders.length + orders.sell_orders.length} cancels)`);
  await executeBatch(api, batch);
}

async function runMarketOrders() {
  const currActor = requireEnv('FLEX_ACTOR');
  const api = createApi();
  const rpc = api.rpc;
  const quoteMarketCounts = countQuoteMarkets();

  console.log('FLEX spot bot — account:', currActor);

  for (const [tokenSymbol, token] of Object.entries(tokens)) {
    for (const [quoteSymbol, market] of Object.entries(token.markets)) {
      await processMarket(api, rpc, currActor, tokenSymbol, token, quoteSymbol, market, quoteMarketCounts);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('\nmarket-orders completed');
}

module.exports = { runMarketOrders, tokens };
