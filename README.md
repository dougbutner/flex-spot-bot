# FLEX Spot Bots

**Ranged liquidity below, reflections above — take it EASY on Alcor.**

New Earth Finance runs on real volume. [Flex tokens](https://flex.town) charge a transfer fee, stack reflexive rewards for holders, and stay **pure liquid** in live markets. This bot keeps your Alcor spot book in range: it cancels stale orders and reposts a small ladder pegged to the touch — the same **abundance in arbitrage** rhythm [flex.town](https://flex.town) describes. Outside crypto moves in via wrapped assets; bots and market makers pay transfer fees; reflections splash back to wallets. You mirror the range; the ecosystem keeps flowing.

For tokenomics, contracts, and the Contributors Club, see **[flex.report](https://flex.report)** — the Flex white paper.

---

## Markets out of the box

| Token | Pair   | Alcor market | Role |
|-------|--------|--------------|------|
| EASY  | XUSDC  | 1268         | Blue-chip flex — pure liquid for stables, 2% reflection |
| INDEX | XPR    | 1375         | Soft peg to XPR; pool fees buy back on spot (this bot helps repeg) |
| MEME  | XPR    | 1213         | Fun-first flex for Alcor farms |

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

Install once. `npm start` whenever you want to refresh the book — or let cron handle it (below).

---

## Environment

| Variable | Description |
|----------|-------------|
| `FLEX_ACTOR` | 12-character XPR account that holds tokens and signs on Alcor |
| `FLEX_PRIVATE_KEY` | Active private key for that account |
| `JSON_RPC_XPR` | HTTPS JSON-RPC for XPR mainnet |

Never commit `.env`. Treat the private key like vault access to your flex chest.

---

## What the bot does

On each run, for every configured market:

1. Reads your open buy/sell orders on Alcor and cancels them.
2. Reads the best bid/ask on the book.
3. Splits available quote and base balances (with a small reserve) into three weighted orders per side, slightly off the touch using a fixed spread step.
4. Submits transfers to `alcor` with the correct memos for spot placement.

Runs are sequential with a short pause between markets so RPC and chain stay happy.

**Note:** Flex transfer fees still apply on every move — that is the point. More volume → more reflection pool → [Send It](https://flex.town) when someone splashes rewards. This bot does not manage Solana-side EASY; XPR only.

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

- [flex.town](https://flex.town) — Send It, flex your reward token, swap, and Flex Tools
- [flex.report](https://flex.report) — Tokenomics, liftoff guide, Contributors Club
- [Alcor on XPR](https://alcor.exchange) — DEX where this bot places spot liquidity

Built for Contributors who want **true liquid economies** on Alcor — ranged liquidity below, reflections above — without running the full tin job server.
