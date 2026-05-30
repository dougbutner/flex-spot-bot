# AI setup instructions — FLEX Spot Bots

Use this document when helping a human (or yourself) install and run the FLEX spot liquidity bot. Follow steps in order; confirm each step before moving on.

---

## Role of the assistant

You are setting up a **standalone Node.js bot** that posts and refreshes Alcor spot orders for FLEX ecosystem tokens (EASY/XUSDC, INDEX/XPR, MEME/XPR) on **XPR Network**. The user clones or copies the `flex-spot-bots` folder, configures `.env`, runs `npm install` once, then `npm start` manually or via cron/Task Scheduler.

Do not ask the user to run the parent `tin` server or Bree scheduler unless they explicitly want that architecture.

---

## Prerequisites checklist

Ask the user to confirm:

1. **Node.js 18+** installed (`node -v`).
2. An **XPR account** (12-character name) with:
   - Active permission key available as a private key string
   - Token balances for markets they care about (EASY, INDEX, MEME, and quote tokens XUSDC / XPR as needed)
   - Small amount of **XPR** for CPU/net on transactions
3. A reliable **JSON-RPC URL** for XPR mainnet (public endpoint or their own node).
4. They understand this bot **moves funds on-chain** (cancels and places Alcor orders).

---

## Step 1 — Project location

Ensure the working directory is the project root containing:

- `package.json`
- `run.js`
- `src/market-orders.js`
- `.env.example`

If the user only has a zip or subfolder, `cd` into that directory before any npm command.

---

## Step 2 — Install dependencies

Run exactly:

```bash
npm install
```

Expected: `node_modules` created, no errors. If install fails, check Node version and network.

---

## Step 3 — Environment file

1. Copy example env:
   ```bash
   cp .env.example .env
   ```
2. Set these variables in `.env` (no quotes unless the value contains spaces):

| Variable | How to obtain |
|----------|----------------|
| `FLEX_ACTOR` | User's XPR account name (e.g. from WebAuth / anchor wallet) |
| `FLEX_PRIVATE_KEY` | Active private key for `FLEX_ACTOR` — **never paste into chat logs or commit to git** |
| `JSON_RPC_XPR` | Mainnet RPC HTTPS URL; default in `.env.example` is a starting point — user may substitute a faster endpoint |

3. Verify `.env` is listed in `.gitignore` and will not be committed.

**Optional:** If migrating from the original `tin` job, map `FREE_LOVE` → `FLEX_PRIVATE_KEY` and hardcoded actor → `FLEX_ACTOR`.

---

## Step 4 — First manual run

```bash
npm start
```

Interpret output:

- `FLEX spot bot — account: <name>` — env loaded.
- Per-market lines `--- EASY/XUSDC market 1268 ---` etc.
- `tx: <id> (N actions)` — on-chain batch succeeded.
- `skip <pair>: no balance` — normal if wallet empty for that pair.
- `market N: order book empty` — book has no liquidity; user may skip that market or fund pool first.
- `Missing required env` — fix `.env` and retry.

On failure (invalid key, RPC down, insufficient RAM/CPU), read the error message and fix RPC, permissions, or XPR stake before retrying.

---

## Step 5 — Post-run verification

Guide the user to:

1. Open [Alcor](https://alcor.exchange) and confirm open orders for `FLEX_ACTOR` on markets 1268, 1375, 1213.
2. Compare balances before/after if this was a test with real funds.
3. Adjust cron frequency only after a successful manual run.

---

## Step 6 — Automation

### macOS / Linux

1. `mkdir -p logs` in project root.
2. `which node` and `which npm` — use absolute paths in crontab.
3. Add crontab line (example every 15 minutes):
   ```cron
   */15 * * * * cd /ABS/PATH/flex-spot-bots && /ABS/PATH/npm start >> /ABS/PATH/flex-spot-bots/logs/cron.log 2>&1
   ```
4. After one interval, `tail logs/cron.log` and confirm `market-orders completed`.

### Windows

1. `mkdir logs` in project root.
2. Task Scheduler: trigger every N minutes; action = `node.exe` with arguments `run.js`, **Start in** = project root (folder containing `.env`).
3. Or `schtasks` as documented in README.md.
4. Confirm `logs\cron.log` after first scheduled run.

---

## Customization (only if user asks)

| Topic | Location |
|-------|----------|
| Which tokens/markets | `tokens` object in `src/market-orders.js` |
| Order count / spread / reserve | `numOrders`, `priceSpread`, `balanceReserve` at top of same file |
| Pause between markets | `2000` ms delay in `runMarketOrders` loop |

Warn that changing market IDs or contracts incorrectly will fail transactions or place orders on the wrong pool.

---

## Safety reminders for the assistant

- Never echo the user's private key back in full.
- Recommend a dedicated trading account, not a primary holdings account.
- Remind that reflection/tax mechanics on transfers still apply to FLEX tokens per [flex.town](https://flex.town).
- This bot does not manage Solana-side EASY; XPR-only.

---

## One-line summary for the user

```bash
npm install && cp .env.example .env
# fill .env, then:
npm start
```

Automate with cron (Mac/Linux) or Task Scheduler (Windows) as in README.md.
