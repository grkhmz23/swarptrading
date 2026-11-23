# Deploy a team preview on Vercel

This deploys the dashboard (wallet + trading + SwarpLaunch launchpad) with
**sample data**, so the team can click through every screen before the real
backend exists. Nothing in it can move funds: every send, swap, buy, sell,
stake, token creation and withdrawal stops at the final step with
"Preview build: this action is disabled".

You create two Vercel projects from this repository:

| Vercel project | Root directory | What it is |
| --- | --- | --- |
| `swarp-preview-api` | `apps/preview-api` | Sample-data API (see its README) |
| `swarp-dashboard` | `apps/foundation-dashboard` | The real dashboard UI, pointed at the API above |

No API keys are needed for the preview: Jupiter, RPC, SMS and KYC keys belong
to the real backend.

## 0. Get the code onto the branch Vercel builds

Vercel builds the repository's default branch (`main`) for production. The
preview API is on `claude/adoring-dirac-iq4nu8` (PR #1) until that PR is
merged. Either:

- **merge PR #1 into `main`** (CI is green on it), or
- after creating each project below, open **Settings → Git → Production
  Branch**, set it to `claude/adoring-dirac-iq4nu8`, then **Deployments →
  Redeploy**. The first build from `main` fails for the API project because
  `apps/preview-api` is not on `main` yet; that is expected.

## 1. Pick an access code and a secret

```bash
openssl rand -hex 32                     # PREVIEW_JWT_SECRET
python3 -c "import secrets; print(f'{secrets.randbelow(10**6):06d}')"   # PREVIEW_ACCESS_CODE
```

The access code is what your team types as the SMS code and the wallet PIN.
It is the only thing standing between the public internet and the preview
(which holds nothing of value), so share it only with the team.

## 2. Create the API project

1. vercel.com → **Add New… → Project** → import `grkhmz23/swarptrading`
   (install the Vercel GitHub app for the repo if asked).
2. **Project Name:** `swarp-preview-api`.
3. **Root Directory → Edit →** `apps/preview-api`. Framework preset: Next.js
   (detected automatically). Leave "Include files outside the root directory in
   the Build Step" **on** (the default): the build type-checks against the
   dashboard's API client.
4. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `PREVIEW_JWT_SECRET` | the 64-char hex string from step 1 |
   | `PREVIEW_ACCESS_CODE` | the 6 digits from step 1 |
   | `PREVIEW_ALLOWED_ORIGINS` | `https://swarp-dashboard.vercel.app,https://swarp-dashboard-*.vercel.app` |

5. **Deploy.** When it finishes, open the production URL (for example
   `https://swarp-preview-api.vercel.app`). It should return
   `{"service":"swarp-preview-api","sampleData":true,...}`.

## 3. Create the dashboard project

1. **Add New… → Project** → import the same repository again.
2. **Project Name:** `swarp-dashboard`.
3. **Root Directory:** `apps/foundation-dashboard`.
4. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_URL` | the API production URL from step 2, no trailing slash |
   | `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
   | `NEXT_PUBLIC_ENVIRONMENT_BANNER` | `Preview — sample data, transactions disabled` |

5. **Deploy.**

If Vercel gave the dashboard a different domain than
`swarp-dashboard.vercel.app` (the name was taken), update
`PREVIEW_ALLOWED_ORIGINS` in the API project to that domain and **Redeploy**
the API project. Environment changes only apply to new deployments.

## 4. Share it

Send the team:

- the dashboard URL,
- "enter any phone number, then the access code as the passcode",
- the access code.

Use the **production** URLs. Vercel protects preview (non-production)
deployments with Vercel Authentication by default, which also blocks the
dashboard's calls to a preview API deployment.

## What the team will see

- Sign-in → home with balances, SOL chart, transaction history.
- Wallet, Trade (token list), Transactions, Rewards, Staking, Settings.
- Send / Receive / Swap / Top up / Withdraw: review screens and PIN step, then
  the "disabled" message.
- Launchpad: featured and live projects, token page with chart, trades and
  holders, buy/sell quotes and PIN step, portfolio, trade history, watchlist,
  alerts (create/edit/delete work), request-token form.

## Check it (done list)

```bash
API=https://swarp-preview-api.vercel.app        # your API URL
DASH=https://swarp-dashboard.vercel.app         # your dashboard URL
CODE=123456                                     # your access code

curl -s $API/ ; echo                                         # sampleData:true
curl -s -o /dev/null -w '%{http_code}\n' -X OPTIONS $API/wallet -H "Origin: $DASH"   # 204
curl -s -i -X OPTIONS $API/wallet -H "Origin: $DASH" | grep -i access-control-allow-origin  # your dashboard origin
TOKEN=$(curl -s -X POST $API/auth/login-with-passcode -H 'Content-Type: application/json' \
  -d "{\"phoneNumber\":\"+15550100\",\"passcode\":\"$CODE\"}" | python3 -c 'import json,sys;print(json.load(sys.stdin)["token"])')
curl -s $API/wallet -H "Authorization: Bearer $TOKEN" ; echo                        # one sample wallet
curl -s -X POST $API/staking/stake -H "Authorization: Bearer $TOKEN" ; echo         # 403 "Preview build: ..."
```

Then open `$DASH`, sign in, and confirm the yellow banner is visible.

## Moving to the real backend later

In the dashboard project set `NEXT_PUBLIC_API_URL` to the real API, remove
`NEXT_PUBLIC_ENVIRONMENT_BANNER`, set the right `NEXT_PUBLIC_SOLANA_NETWORK`,
add the custom domain `app.swarppay.com`, and redeploy. Then delete the
`swarp-preview-api` project. The backend must meet
[`BACKEND_REQUIREMENTS.md`](BACKEND_REQUIREMENTS.md) first.
