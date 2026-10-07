# Swarp Trading

SwarpPay and SwarpLaunch front-ends, split out of
[SwarpFoundation](https://github.com/grkhmz23/SwarpFoundation). History for
`apps/` is preserved.

| App | Stack | Purpose |
| --- | --- | --- |
| `apps/foundation-dashboard` | Next.js 16, React 19, Redux, `@solana/web3.js` | Custodial Solana wallet, swap, SwarpLaunch launchpad. Target: `app.swarppay.com` |
| `apps/foundation-admin` | Vite, React 19, Refine | Admin console: users, wallets, transactions, launchpad projects |
| `apps/preview-api` | Next.js route handlers | **Preview only.** Answers the dashboard's API calls with sample data so the UI can be shown without the real backend. Cannot move funds. |

The real backend API both apps call is **not** in this repository.

## Run

```bash
cd apps/foundation-dashboard   # or apps/foundation-admin
cp .env.example .env.local     # dashboard; the admin app reads VITE_* from .env
npm ci
npm run dev
```

Each app's README lists its variables. Production builds fail when the API URL
is missing: `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SOLANA_NETWORK` (dashboard),
`VITE_ADMIN_API_URL` (admin).

## Deploy

Each app is its own deployment (`apps/<name>` as the root directory; `amplify.yml`
is included for AWS Amplify, Vercel also works). Point `app.swarppay.com` at the
dashboard and allow that origin in the backend CORS settings.

## Team preview (no backend)

To show the dashboard and launchpad before the backend is available, deploy
`apps/preview-api` and point a dashboard build at it. Step-by-step Vercel setup:
[`docs/DEPLOY_PREVIEW.md`](docs/DEPLOY_PREVIEW.md).

## Status

The audit in [`docs/AUDIT.md`](docs/AUDIT.md) has been worked through in both
apps (see its status section). The remaining risk is server-side: the
protections the front-ends now rely on must be enforced by the backend, listed
in [`docs/BACKEND_REQUIREMENTS.md`](docs/BACKEND_REQUIREMENTS.md).

## Checks

CI (`.github/workflows/build.yml`) runs, for each app: type-check, lint, tests
(dashboard, preview-api), `npm audit --omit=dev --audit-level=high`, and a
production build.
