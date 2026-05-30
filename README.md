# FLEX Spot Bots

**New Earth Finance liquidity on Alcor — take it EASY, let the bot mirror the range.**

This package runs a spot liquidity bot for core [Flex](https://flex.town) tokens on XPR Network. It cancels your stale Alcor orders and replaces them with a small ladder of buys and sells pegged to the live book — the same “abundance in arbitrage” rhythm flex.town describes: reliable volume from the outside world, fees flowing back through reflection mechanics, and pure-liquid tokens staying useful in real markets.

Markets covered out of the box:

| Token | Pair   | Alcor market |
|-------|--------|--------------|
| EASY  | XUSDC  | 1268         |
| INDEX | XPR    | 1375         |
| MEME  | XPR    | 1213         |

You need an XPR account with balances for those pairs, an active key in `.env`, and Node 18+.

---

## Quick start

From this folder:

```bash
npm install
```

Copy the example env, fill in your account and keys, then run once by hand:

```bash
cp .env.example .env
# edit .env — FLEX_ACTOR, FLEX_PRIVATE_KEY, JSON_RPC_XPR
npm start
```

That’s it: one line to install dependencies, one line (`npm start`) to run the bot manually.

---

## Environment

| Variable | Description |
|----------|-------------|
| `FLEX_ACTOR` | 12-character XPR account that holds tokens and signs on Alcor |
| `FLEX_PRIVATE_KEY` | Active private key for that account |
| `JSON_RPC_XPR` | HTTPS JSON-RPC for XPR mainnet |

Never commit `.env`. Treat the private key like vault access to your Flex chest.

---

## What the bot does

On each run, for every configured market it:

1. Reads your open buy/sell orders on Alcor and cancels them.
2. Reads the best bid/ask on the book.
3. Splits your available quote and base balances (with a small reserve) into three weighted orders per side, slightly off the touch using a fixed spread step.
4. Submits transfers to `alcor` with the correct memos for spot placement.

Runs are sequential with a short pause between markets so RPC and chain stay happy.

---

## Run automatically (cron)

### macOS / Linux (`crontab`)

Use the full path to this project and the same Node/npm your shell uses. Example: every 15 minutes.

```bash
crontab -e
```

Add one line (adjust paths and schedule):

```cron
*/15 * * * * cd /full/path/to/flex-spot-bots && /usr/local/bin/npm start >> logs/cron.log 2>&1
```

Create a log folder first:

```bash
mkdir -p logs
```

Tips:

- Run `which npm` and `which node` in Terminal and use those paths in cron if the job never fires.
- macOS may need cron Full Disk Access or a wrapper script that loads your profile; if logs stay empty, test with an absolute path to `node run.js` instead of `npm start`.
- Stagger interval with how fast you want books refreshed; the upstream tin scheduler used roughly five-minute windows.

### Windows (Task Scheduler)

Windows does not ship `cron`; **Task Scheduler** is the native equivalent.

1. Open **Task Scheduler** → **Create Task**.
2. **General**: name e.g. `FLEX Spot Bot`, run whether user is logged on or not if you want unattended runs.
3. **Triggers** → **New** → repeat every **15 minutes** (or your interval), indefinitely.
4. **Actions** → **New**:
   - **Program/script**: full path to `node.exe` (e.g. `C:\Program Files\nodejs\node.exe`)
   - **Add arguments**: `run.js`
   - **Start in**: full path to this folder (e.g. `C:\Users\you\flex-spot-bots`)
5. Ensure `.env` lives in that **Start in** directory.

**Command-line alternative** (`schtasks`), run once in an elevated or user cmd (adjust paths):

```bat
schtasks /Create /TN "FLEX Spot Bot" /SC MINUTE /MO 15 /TR "cmd /c cd /d C:\path\to\flex-spot-bots && npm start >> logs\cron.log 2>&1" /F
```

Create `logs` under the project folder first.

---

## AI-assisted setup

For step-by-step instructions meant for Cursor, ChatGPT, or other assistants helping you wire wallet, RPC, and cron, see **[AI-SETUP.md](./AI-SETUP.md)**.

---

## Security

- Only use a key with permissions you are willing to expose to automation.
- Prefer a dedicated market-making account, not your primary savings wallet.
- Review Alcor open orders and balances after the first manual `npm start`.

---

## Links

- [flex.town](https://flex.town) — Flex tokens, reflections, and Alcor tools
- [Alcor on XPR](https://alcor.exchange) — DEX where this bot places spot liquidity

Built for contributors who want ranged liquidity below and reflections above — without running the full tin job server.
