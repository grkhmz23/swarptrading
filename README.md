# Swarp Trading

SwarpPay and SwarpLaunch front-ends, split out of
[SwarpFoundation](https://github.com/grkhmz23/SwarpFoundation). History for
`apps/` is preserved.

| App | Stack | Purpose |
| --- | --- | --- |
| `apps/foundation-dashboard` | Next.js 16, React 19, Redux, `@solana/web3.js` | Custodial Solana wallet, swap, SwarpLaunch launchpad. Target: `app.swarppay.com` |
| `apps/foundation-admin` | Vite, React 19, Refine | Admin console: users, wallets, transactions, launchpad projects |

The backend API both apps call is **not** in this repository.

## Run

```bash
cd apps/foundation-dashboard   # or apps/foundation-admin
cp .env.example .env.local     # dashboard; the admin app reads VITE_* from .env
npm ci
npm run dev
```

Dashboard variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SOLANA_NETWORK`, `NEXT_PUBLIC_SWARP_TOKEN_MINT`.
Admin variables: `VITE_ADMIN_API_URL`, `VITE_ADMIN_API_BASE_PATH`.

## Deploy

Each app is its own deployment (`apps/<name>` as the root directory; `amplify.yml`
is included for AWS Amplify, Vercel also works). Point `app.swarppay.com` at the
dashboard and allow that origin in the backend CORS settings.

## Known issues to fix before public launch

- No PIN check on send, swap or launchpad trades.
- Session tokens kept in `localStorage`; no content security policy.
- One-time code can be returned in an API response.
- Devnet / MoonPay sandbox defaults mixed with production settings; dead
  private-key code in `balanceSync.ts`.
- No tests.
