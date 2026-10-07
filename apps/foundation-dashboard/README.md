# SwarpPay dashboard

Custodial Solana wallet (send, receive, swap, staking, fiat on/off-ramp) and the
SwarpLaunch token launchpad. Intended for `app.swarppay.com`.

The backend API is a separate service and is **not** in this repository. What
the server must enforce is listed in
[`docs/BACKEND_REQUIREMENTS.md`](../../docs/BACKEND_REQUIREMENTS.md).

## Stack

Next.js 16 (App Router) · React 19 · Redux Toolkit · Tailwind CSS 4 ·
`lightweight-charts` · `@veriff/incontext-sdk` · Vitest.

## Run

```bash
cd apps/foundation-dashboard
cp .env.example .env.local      # set NEXT_PUBLIC_API_URL at least
npm ci
npm run dev                     # http://localhost:3000
```

## Checks

```bash
npm run type-check
npm run lint
npm test
npm run build    # requires NEXT_PUBLIC_API_URL (https) and NEXT_PUBLIC_SOLANA_NETWORK
```

CI (`.github/workflows/build.yml`) runs all of these plus
`npm audit --omit=dev --audit-level=high`.

## Configuration

All configuration is public and inlined at build time — never put secrets in it.
See `.env.example`; values are read only in `src/config/env.ts`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | Backend origin (https in production) |
| `NEXT_PUBLIC_SOLANA_NETWORK` | yes | `devnet`, `testnet` or `mainnet-beta` |
| `NEXT_PUBLIC_SWARP_TOKEN_MINT` | no | SWARP mint address |
| `NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY` | no | MoonPay is offered only with a `pk_test_` key |
| `NEXT_PUBLIC_LEGAL_SITE_URL` | no | Where Terms / Privacy live |
| `NEXT_PUBLIC_SWARP_PRESALE_PRICE_USD` | no | Shown on the SWARP card when set |
| `NEXT_PUBLIC_ENVIRONMENT_BANNER` | no | Notice pinned to the top of every page (e.g. for a build that uses `apps/preview-api`) |

## How it is put together

```
src/
  app/                 routes (/, /verify-phone, /select-citizenship, /creating-wallet,
                       /set-passcode, /login-passcode, /unlock, /dashboard, /settings,
                       /token/[address])
  config/env.ts        the only place that reads NEXT_PUBLIC_*
  lib/
    http.ts            fetch client: ApiError, 401 handling, idempotency keys, enc/query
    session.ts         access token storage, JWT decode, clearSession()
    pinGate.ts         per-tab PIN unlock + retry backoff
    oauth.ts           Google sign-in state check (blocks login CSRF)
    pin.ts             PIN rules
    amount.ts          amount parsing, decimals, fee reserve
    ohlc.ts            trades -> candles
    solana.ts, storage.ts, css.ts
  components/
    session/           RequireSession route guard, SessionManager (401 -> sign-in)
    ui/                CodeInput, PinConfirmModal, LegalNotice, ...
    onboarding/        sign-up / sign-in screens
    home/              wallet dashboard, modals (send, swap, receive, fiat)
    Launchpad/         launchpad home, token detail, portfolio, history, watchlist, alerts
    Setting/           settings, security, address book
  services/            api.ts (backend calls), tokenDetail, moonpay (sandbox), veriff
  store/               Redux slices; resetSessionState on logout
```

### Security model (client side)

- **Sign-in → PIN unlock.** OTP or Google sign-in yields a token; the wallet
  stays locked until the PIN is entered in this tab (`/unlock`). Passcode login
  unlocks directly.
- **Step-up on money.** Send, swap, launchpad buy/sell, staking, token creation
  and account deletion show a review screen and re-verify the PIN first. Send,
  swap, launchpad buy/sell and stake also carry an `Idempotency-Key`.
- **Session expiry.** Any 401 on an authenticated call clears all client state
  and returns to sign-in.
- **Headers.** CSP (no third-party scripts), `frame-ancestors 'none'`, HSTS,
  nosniff, strict referrer policy, `noindex` — see `next.config.ts`.

## Deploy

Any Next.js host (Vercel, AWS Amplify — `amplify.yml` included). Set the
environment variables above in the host before building.
