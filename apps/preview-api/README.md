# SwarpPay preview API

A stand-in for the SwarpPay backend that answers every call the dashboard
(`apps/foundation-dashboard`) makes, using **fixed sample data**. It exists so
the wallet and launchpad UI can be shown to people before the real backend is
deployed.

It is not the backend and must never be used with real users:

- Everyone signs in to the **same shared sample account** with one access code.
- Prices, balances, launchpad projects, trades and holders are invented sample
  values (token mint addresses for SOL, USDC, JUP, … are the real ones).
- **Anything that would move funds or change the account is refused** with a
  403 "Preview build: this action is disabled" — send, swap execute, launchpad
  buy/sell, token creation, staking, top-up/withdraw, identity verification,
  claiming rewards, uploads, changing the PIN, deleting the account. Quotes and
  review screens work, so the whole flow can be walked through up to the final
  confirmation.
- Small edits (watchlist, price alerts, address book, username, notification
  settings) are kept in memory: shared by all viewers and reset when the server
  restarts.

## Configuration

Copy `.env.example` to `.env.local`. Every request returns 500 until the
required values are set.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PREVIEW_JWT_SECRET` | yes | Signs session tokens, ≥ 32 chars (`openssl rand -hex 32`) |
| `PREVIEW_ACCESS_CODE` | yes | 6 digits; used as the SMS code **and** the wallet PIN |
| `PREVIEW_ALLOWED_ORIGINS` | yes | Comma-separated dashboard origins for CORS. One `*` per entry matches part of a host label, e.g. `https://swarp-dashboard-*.vercel.app` |
| `PREVIEW_WALLET_ADDRESS` | no | Receive address shown for the sample wallet. Default: a generated address nobody holds keys for — never send funds to it |
| `PREVIEW_SWARP_MINT` | no | SWARP mint in sample balances (match the dashboard's `NEXT_PUBLIC_SWARP_TOKEN_MINT`) |

No third-party keys (Jupiter, RPC, SMS, …) are needed.

## Run locally

```bash
cd apps/preview-api
cp .env.example .env.local      # fill in the three required values
npm ci
npm run dev                     # http://localhost:3001

# second terminal
cd apps/foundation-dashboard
NEXT_PUBLIC_API_URL=http://localhost:3001 NEXT_PUBLIC_SOLANA_NETWORK=devnet \
NEXT_PUBLIC_ENVIRONMENT_BANNER="Preview — sample data, transactions disabled" npm run dev
```

Open http://localhost:3000, enter any phone number, then the access code as the
passcode. (Launchpad token icons are served by this API and only load over
https, so they appear on a deployed preview, not on localhost.)

## Checks

```bash
npm run type-check   # response shapes are typed from the dashboard's src/services/api.ts
npm run lint
npm test
npm run build
```

Type-checking imports the dashboard's API client types (`@/services/api` maps
to `../foundation-dashboard/src`), so the dashboard folder must be present when
building. Vercel includes it by default.

## How it is put together

```
src/app/[[...path]]/route.ts   every method and path -> server/app.ts handle()
src/server/
  app.ts          router table, CORS, errors, token icons (/preview-assets/token/<T>.svg)
  router.ts       path matching (`:param`), request context
  auth.ts         HS256 session tokens, access-code check
  config.ts       env parsing and validation
  state.ts        in-memory watchlist / alerts / contacts / settings
  routes/         auth, wallet (+ staking), market (+ notifications), launchpad, rewards
  data/           sample tokens, SOL history, launchpad projects and trades, wallet, account
```
