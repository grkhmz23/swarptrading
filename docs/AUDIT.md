# Swarp Trading — Code Audit

Date: 2026-10-07 · Scope: `apps/foundation-dashboard` (SwarpPay wallet + SwarpLaunch
launchpad) and `apps/foundation-admin` at commit `5242ff2`.

The backend API is **not** in this repository. Findings that depend on what the
server does are marked *(backend)* — they are real client-side defects, but how
exploitable they are depends on server checks we could not see.

Paths are relative to `apps/foundation-dashboard/src/` unless they start with
`foundation-admin/`.

---

## Status (updated after the fix pass)

**Done in the front-ends** — every Critical/High row (A1–A10, M1–M11, L1–L8,
D1–D5), all Medium items and the Low list, with these exceptions:

| Item | State | Why |
| --- | --- | --- |
| A1, A2, A4, A6, A9, A10, M1, M2, M5 (server side) | Client side done; **needs backend** | The UI now gates, re-verifies the PIN and sends idempotency keys / slippage / mints, but only the server can enforce it. See [`BACKEND_REQUIREMENTS.md`](BACKEND_REQUIREMENTS.md). |
| A3 OAuth `state` | Client side done | Callbacks are accepted only in the tab that started sign-in (blocks login CSRF). Full fix needs the backend to echo `state` or switch to a code exchange. |
| A7 token in `localStorage` | Mitigated | Third-party scripts removed (Veriff bundled from npm), strict CSP, token access centralised in `lib/session.ts`. Moving to an httpOnly cookie needs the backend. |
| M11 MoonPay signing | Mitigated | MoonPay only with a sandbox key; live purchases/withdrawals use the backend-signed Transak flow. |
| Split `HomeScreen.tsx` / `api.ts` | Partly | 1,849 → 1,363 and 2,375 → 1,662 lines (dead code removed); a full split is a refactor with no behaviour change, left for later. |
| One onboarding flow | Not merged | Both flows (phone routes, Google state machine) are now guarded and PIN-gated; merging them is a product decision. |
| Lint | 96 → 65 warnings, 0 errors | Remaining: 42 `set-state-in-effect` (fetch-on-mount pattern), 17 `<img>` vs `next/image`, 6 hoisted-function `immutability`. |
| `npm audit` | 0 high/critical | Dashboard: 2 moderate in `jayson`'s server-only `stream-json` (not reachable from the browser build). Admin: 0. |
| New UI strings | English only | Translations are served by the backend; keys need adding there. |

Tests: 43 unit tests (HTTP client, session/JWT, PIN rules, PIN gate, OAuth
state, amounts, OHLC, trade status). Browser smoke tests were run against a
mocked API for the auth guard, send/swap, and every launchpad screen.

---

## 1. Summary

| | Dashboard | Admin |
| --- | --- | --- |
| Type-check | clean | clean |
| Lint | 0 errors, 96 warnings (40 `set-state-in-effect`, 19 unused vars, 20 `@next/next`, 7 `immutability`, 5 `purity`, 5 `exhaustive-deps`) | clean |
| Build | passes | passes (one 1 MB chunk, no code splitting) |
| `npm audit --omit=dev` | 11 vulns: **1 critical (`next` 16.0.0–16.3.5)**, 8 high (`sharp`, `braces`, `brace-expansion`, `source-map-js`, …), 2 moderate | 5 vulns: 1 high (`axios`), 4 moderate (`qs`, `decode-uri-component` via unused `@refinedev/simple-rest`) |
| Tests | none | none |

**The short version:** the UI is feature-complete in breadth but is not safe to
put real money behind yet. The biggest problems, in order:

1. **Auth is front-end theatre.** The PIN gate is a client redirect; any token
   from OTP/Google login opens `/dashboard`. Login is phone + 6-digit PIN with
   weak PINs allowed and no lockout. OAuth token arrives in the URL with no
   `state` check (login CSRF).
2. **Money flows lack basic guards.** No PIN on send/swap/trade, no idempotency
   keys (double-click = double send), slippage not sent on swap execute and
   hard-coded 5% on launchpad trades, quotes never bound to execution.
3. **Fake data shown as real.** Random candlestick chart for tokens with no
   trades, hard-coded SOL=$200 / $181.67, EUR/GBP rate 0.10, fallback staking APYs,
   failed trades displayed as "Completed", SPL balances shown as 0.
4. **Session handling.** Bearer tokens in `localStorage` (both apps), no CSP or
   security headers, third-party scripts (Veriff, MoonPay) on the same origin,
   no global 401 handling, logout doesn't revoke or reset state.
5. **Admin console** has no roles, can edit user email/phone and hard-delete
   users with one click, no audit trail.

---

## 2. Critical / High — fix before any real funds

### Auth & session

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| A1 | **PIN gate is client-only.** `/dashboard` only checks a JWT exists and isn't expired. The token is stored right after OTP / Google login, *before* the PIN. Typing `/dashboard` skips the PIN. *(backend: if it doesn't scope pre-PIN tokens, this is full account access)* | `app/dashboard/page.tsx:14-46`; token stored at `components/onboarding/VerifyPhone.tsx:154`, `SignUpEmailScreen.tsx:42`, `OnboardingFlow.tsx:306` | Backend issues a `pin_pending` token after OTP/OAuth and a full-scope token only after PIN verify; wallet routes reject `pin_pending`. Client guard checks the scope claim. |
| A2 | **Login = phone + 6-digit PIN**, no OTP for returning users, `000000`/`123456` accepted, no lockout/attempt UI, no forgot-PIN flow. | `SignUpEmailScreen.tsx:164-167`, `EnterPasscode.tsx:63-76`, `SetPasscode.tsx:36-44`, `Setting/ChangePasscodeModal.tsx:55-63` | Require OTP (or device-bound token) + PIN for new sessions; server-side per-account/IP lockout; weak-PIN blocklist on client and server; forgot-PIN via OTP + KYC. |
| A3 | **OAuth token passed in query string, no `state`/nonce.** Any `?token=` is stored, so an attacker link logs the victim into the attacker's custodial account (victim then deposits into it). Token also lands in logs/history. | `SignUpEmailScreen.tsx:34-78`, `OnboardingFlow.tsx:296-327` | Backend redirects with one-time `code`, client exchanges via POST; client generates and verifies `state`. |
| A4 | **PIN can be (re)set with only an OTP-level token.** `/creating-wallet` always routes to `/set-passcode`; `/set-passcode` and `/confirm-passcode` are directly reachable and call `setWalletPIN`. SIM-swap → overwrite PIN. *(backend)* | `app/creating-wallet/page.tsx:9-12`, `ConfirmPasscode.tsx:81` | Server returns 409 when a PIN exists; changes only via `change-passcode` with old PIN. Client checks `hasWalletPIN`. |
| A5 | **`updateCountry` sends no Authorization header** — identifies the user by phone/email in the body, so it only works if the endpoint is unauthenticated. Anyone can change anyone's citizenship. | `services/api.ts:212-221` | Require bearer token; derive user from token; ignore identifiers in body. |
| A6 | **Account deletion needs no PIN/OTP and no balance check**; no typed confirmation. Combined with no `frame-ancestors` (A8) it's clickjackable. | `Setting/Security&Privacy.tsx:34-46`, `api.ts:919-927`, `DeleteAccountModal.tsx:45-59` | Require PIN + OTP; block while balance > 0; typed confirmation. |
| A7 | **Tokens in `localStorage`** (`swarp_fd_access_token`, `swarp_foundation_admin_token`) on an origin that also loads Veriff's CDN script without SRI and MoonPay. Any XSS / compromised script = drain wallets / full admin. | ~40 reads across dashboard; `foundation-admin/src/authProvider.ts:15`; `services/veriff.ts:55-71` | httpOnly `SameSite=Strict` cookie (or in-memory short-lived token + refresh cookie); SRI on third-party scripts or isolate them; CSP. |
| A8 | **No security headers** on either app: no CSP, `frame-ancestors`, X-Frame-Options, HSTS, Referrer-Policy. Dashboard is `robots: index, follow`. | `next.config.ts`; `foundation-admin/index.html`, `amplify.yml` | `headers()` in Next config / Amplify `customHeaders`; `poweredByHeader: false`; `noindex`. |
| A9 | **Account enumeration / phone→wallet mapping / SMS pumping.** `continueWithPhone` is unauthenticated and its response type includes `isNewUser`, `hasWalletPIN`, `userId`, `walletId`, `walletAddress` and `otp`. Resend cooldown is client-only. *(backend)* | `api.ts:3-12, 183-190`; `VerifyPhone.tsx:33-42` | Uniform `{otpSent:true}` response; CAPTCHA; server rate limits; never return `otp`. |
| A10 | **OTP returned in API response "in development mode"** and stored in `sessionStorage`. *(backend: must be stripped in production)* | `api.ts:11`, `SignUpEmailScreen.tsx:148-154` | Remove from the contract entirely. |

### Money flows — wallet / swap / send

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| M1 | **No PIN on send, swap, stake or launchpad trades.** `executeSwap` has an optional `pin` the UI never sends. | `components/home/modals/SwapModal.tsx:217-221`, `SendModal.tsx:300`, `Launchpad/sections/TokenDetail.tsx:585-605` | Server-enforced PIN (or step-up) on every value-moving call. |
| M2 | **Client tells the server how much SOL to credit.** `syncMoonPayBalance` POSTs `{amount}` computed in the browser and a fake signature `mainnet_sync_${Date.now()}`. UI path is currently unreachable but the endpoint/method exist. *(backend: if trusted, mints balance)* | `api.ts:489-513`, `HomeScreen.tsx:636-641`, `services/balanceSync.ts` | Delete the method + `balanceSync.ts`; backend credits only from MoonPay webhooks / verified on-chain txs; disable the route. |
| M3 | **Double-submit on Send** — `isLoading` set only after an awaited address validation; no idempotency key. Double-click = two sends. | `SendModal.tsx:259-293` | Set submitting ref before first await; `Idempotency-Key` header enforced server-side (apply to send, swap, buy, sell, stake, claim). |
| M4 | **Re-picking SOL sends the wrapped-SOL mint** (`So111…112`) instead of native SOL. | `SendModal.tsx:147-158, 304` | Map wSOL mint → native; compare by mint not symbol. |
| M5 | **Swap execute ≠ quote.** Execute sends only `{inputToken, outputToken, amount}` — no slippage, no quote id, no min-out; `validUntil` never checked. | `api.ts:550-575`, `SwapModal.tsx:189, 217-221` | Send `quoteId`/route + `slippageBps` + `minOutAmount`; re-quote when expired. |
| M6 | **Swap tokens identified by symbol** across 500 Jupiter tokens (symbols aren't unique; fake "USDC" exists). | `SwapModal.tsx:394, 488, 270-274` | Use mint addresses end to end; flag unverified tokens. |
| M7 | **"Buy {TOKEN}" opens a SOL→USDC swap** — token isn't passed to the modal. | `home/sections/TokenDetailSection.tsx:396-401` | Pass `outputMint` into `SwapModal`. |
| M8 | **No global 401 handling.** On any wallet fetch error (incl. 401) the app shows the cached balance from `localStorage` as if live. | `api.ts:154-167`, `HomeScreen.tsx:897-903` | Central 401 → clear session + Redux, redirect; show "stale" state, never cached balance as current. |
| M9 | **`makeRequest` drops merged headers** (`...options` after `headers`). `createWallet` and `airdropSOL` send JSON as `text/plain`; `uploadProfilePicture` only works because of the bug. Also sets browser-forbidden headers (`User-Agent`, `Sec-Fetch-*`) and an ngrok header that forces CORS preflight. | `api.ts:76-91` | `const {headers, ...rest} = options; fetch(url, {...rest, headers: {...defaults, ...headers}})`; omit Content-Type for `FormData`; drop forbidden + ngrok headers. |
| M10 | **API errors are plain objects, not `Error`s**, so every `err instanceof Error` branch is dead — server messages ("Slippage exceeded", "Insufficient balance") are thrown away everywhere. | `api.ts:117-176` + call sites | `class ApiError extends Error { statusCode; code }`. |
| M11 | **MoonPay widget URL unsigned**; production receives the devnet address; `externalCustomerId` = internal wallet id. | `services/moonpay.ts:175-189, 348-405` | Backend-signed widget URL; mainnet address in production. |

### Launchpad / trading

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| L1 | **Slippage hard-coded to 5%**, no UI control, and the quoted output is never sent — server can only measure against its own execution price. Thin bonding curve = easy sandwiching. | `Launchpad/sections/TokenDetail.tsx:581-605`, `api.ts:2084-2115` | Slippage input (default 0.5–1%); send `minOutputAmount`; server rejects below it. |
| L2 | **Successful trade can be reported as failed** (response missing `trade` → TypeError; network drop; refetch fails) and the user is told to retry. No idempotency key, `response.success` never checked. | `TokenDetail.tsx:578-650` | Idempotency key; check `success`; show "status unknown" and refresh instead of "failed". |
| L3 | **Random fake candlestick chart** for tokens with no trades (or when `price` is missing) — 50 upward-biased random candles labelled `TICKER/SOL`, re-randomised every render. | `Launchpad/TradingViewChart.tsx:107-117, 232-273` | Delete `generateSimulatedOHLC`; render "No trades yet". |
| L4 | **Portfolio uses SOL = $200** hard-coded. | `Launchpad/sections/Portfolio.tsx:169` | Live price, or show SOL. |
| L5 | **Failed trades shown as "Completed"** (`else` branch maps everything to Completed). | `Launchpad/sections/TradeHistory.tsx:145` | Map `failed` → Failed; unknown → Unknown; normalise case. |
| L6 | **Input `"."` sends `solAmount: null`** — passes regex, `NaN` passes every check. | `TokenDetail.tsx:550-571, 1458, 1581` | `Number.isFinite(n) && n > 0` everywhere. |
| L7 | **100% buttons round above balance** (`toFixed(6)` rounds up; sell `toFixed(0)`), no fee/rent reserve, dust can't be sold. | `TokenDetail.tsx:1477-1486` | Floor to decimals; reserve ~0.01 SOL; `sellAll` flag. |
| L8 | **Every trade unmounts the page into a skeleton**; if the refetch fails the page shows "Failed to load" right after a successful trade. | `TokenDetail.tsx:315-317, 622` | Separate `isRefreshing`. |

### Admin console (`apps/foundation-admin`)

| # | Finding | Where | Fix |
| --- | --- | --- | --- |
| D1 | **No roles/permissions** — `getPermissions` returns null, no `accessControlProvider`. Any accepted token = full console. *(backend must enforce admin role on every `/admin-api` route)* | `foundation-admin/src/authProvider.ts:64`, `App.tsx:17-74` | Roles from login; Refine access control; gate destructive actions. |
| D2 | **Admin can change a user's email/phone** (the login/recovery channel) with no confirm, reason or step-up → account takeover by a rogue/compromised admin. | `foundation-admin/src/pages/users/edit.tsx:9-13`, `components/GenericEdit.tsx:63-78` | Read-only here; dedicated flow with re-auth, reason, audit log, notify old contact. |
| D3 | **Users hard-deleted** with a generic confirm. | `pages/users/list.tsx:11`, `show.tsx:8`, `components/GenericDelete.tsx:38-58` | Suspend / soft-delete; typed confirm + reason + zero-balance check. |
| D4 | **`GenericShow` renders every field the API returns** — incl. `Transaction.confirmationCode`; any leaked secret would be shown. | `components/GenericShow.tsx:173-180`, `types/index.ts:37` | Per-resource field allowlist; mask PII. |
| D5 | **`GenericEdit` corrupts values**: `false`/`0`/`null` → `""`, numbers saved as strings; uses PUT with a partial body (may null other columns). Errors are silent (no notificationProvider). | `GenericEdit.tsx:57, 215, 224`, `dataProvider.ts:95` | `??`, typed coercion, send only changed fields, PATCH, toast errors. |

---

## 3. Medium

**Wallet / home**
- Fake values shown as real: SOL fallback $181.67 and random chart (`HomeScreen.tsx:560-607, 944-955`); MoonPay estimate `price || 200` (`:658`); EUR/GBP rate defaults 0.10 → €18/SOL (`HomeScreen.tsx:211-215`); hard-coded SWARP $0.03 (`TokenDetailSection.tsx:58-71`).
- Staking: fallback pools with fake 8/15/25% APY stay on failure; `lockDays || 30` turns flexible pools into 30-day locks; no `poolId` sent (`StakingSection.tsx:39-48, 73-83, 125`).
- Wallet screen shows every SPL token as 0 (`WalletSection.tsx:183-194`).
- Transactions always labelled SOL — sending 100 USDC shows "-100 SOL" (`types/home.ts:37-52`, `HomeSection.tsx:494-525`).
- `balanceSync` auto-starts on import, polls devnet RPC forever, fires false "MoonPay purchase detected" on every fresh login; mainnet RPC host is dead (`services/balanceSync.ts`).
- MoonPay popup blocked → "Opening MoonPay…" stuck forever (`moonpay.ts:221-247`); sell flow can't complete for a custodial wallet (`HomeScreen.tsx:1302-1353`).
- `FiatFlowModal` sends crypto amount as `fiatAmount` on withdraw and uses hard-coded rates (`FiatFlowModal.tsx:57-89`).
- Redux state survives logout; `clearUser` uses `Object.assign` so ids remain; next user in tab sees previous profile/contacts (`store/slices/userSlice.ts`).
- Swap quote screen mislabels units; "Slippage" row shows price impact with fake 0.1 fallback (`SwapModal.tsx:628-636`).
- No network badge anywhere while backend is devnet — users may send mainnet SOL to a devnet-tracked address.
- API layer logs full URLs (incl. OAuth `?code=`), headers and error bodies to console (`api.ts:100-113, 155-160`).

**Auth / onboarding / settings**
- New PIN stored in plaintext in `sessionStorage` (`app/set-passcode/page.tsx:15`).
- Email never verified; `checkEmail` unauthenticated → enumeration (`EmailSetup.tsx:50`, `api.ts:1059`).
- Two diverging onboarding implementations (state machine vs routes); route flow skips profile steps and never sets `onboarding_complete` (`app/page.tsx:19-41`, `login-passcode`, `confirm-passcode`).
- Most routes have no guard (`/settings`, `/set-passcode`, `/select-citizenship`, …); no `middleware.ts`.
- Delete-account flow reloads before the modal cleans up (`Security&Privacy.tsx:45-46`).
- Change passcode: no confirm field, no same-PIN or weak-PIN check (`ChangePasscodeModal.tsx:50-73`).
- `NEXT_PUBLIC_API_URL` falls back to `http://localhost:3001` in production builds (`api.ts:1`, `SignUpEmailScreen.tsx:193`, `TokenDetailSection.tsx:7`); same for admin (`foundation-admin/src/dataProvider.ts:4`). Fail the build instead.
- Hydration mismatch: settings slice reads `localStorage` at module load (`store/slices/settingsSlice.ts:10-31`).
- Address book crashes on non-allowlisted image hosts with `next/image` (`Setting/AdressBook.tsx:21-26, 146-152`).

**Launchpad**
- Quote never refreshed, out-of-order responses can show a buy quote on the sell form; amount not cleared on Buy/Sell switch; price impact never shown (`TokenDetail.tsx:515-547`).
- Token balance stale after selling all; missing if project isn't on portfolio page 1 — use the unused `getLaunchpadTokenBalance` (`TokenDetail.tsx:377-413`).
- Buy balance may read the wrong wallet (`wallets[0]` vs custodial wallet) *(backend)* (`TokenDetail.tsx:301-313`).
- Hard-coded/fake UI: rank `#47`, holdings box shows `1`, holders value always 0, 5M timeframe always "selected", socials a static image (`TokenDetail.tsx:363, 1170, 1245, 1605-1631`).
- TXNS/Volume/Buys/Sells computed from last 50 trades but shown as totals (`TokenDetail.tsx:333, 497-512`).
- Chart: current-price candle misaligned / duplicated; legend stale closure; chart torn down on every price change (`TradingViewChart.tsx:181-209, 484-534`).
- `BUY`/`SELL` casing differs between endpoints → buys could render as sells *(backend)* (`api.ts:2362` vs UI comparisons).
- Large dead API surface: legacy `/buy` `/sell`, comments, entire `/onchain/*` family — confirm server routes are disabled (`api.ts`).
- Add-to-watchlist uses the *toggle* endpoint → can remove items; double-click toggles twice (`AddAssetModal.tsx:43-51, 107-111`, `Watchlist.tsx:91-100`).
- Watchlist prints SOL prices with `$` (`Watchlist.tsx:33-39`); alerts default to USD and truncate to `$0.00` (`CreateAlertModal.tsx:133`, `Alerts.tsx:9-15`); alerts always show "Active" and swallow errors (`Alerts.tsx:22, 113-125, 274`).
- Trade history: 50 rows, client-side date filter, `toFixed(2)` shows 0.004 SOL as 0.00 (`TradeHistory.tsx:128, 191-230`).
- Portfolio: static SVG "performance" graph, P&L fetched but not shown (`Portfolio.tsx:280-300, 542`).
- RequestToken upload: no size limit (reads whole file into memory), trusts `file.type`, accepts SVG, MP4 sent as `imageUrl`, `metadataUri = imageUrl` (`RequestToken.tsx:62-103, 184`); explorer link hard-coded `?cluster=devnet` (`:553`).
- LaunchpadHome filters (category, market cap, age) collected but never applied; bar shows `|priceChange24h|*2` not bonding progress (`LaunchpadHome.tsx:234, 383-395`).
- DexScreener token page crashes on null `priceChange24h`/`symbol` (`app/token/[address]/page.tsx:166, 245`).

**Admin**
- Pagination total `response.data.total || response.data.length` → `undefined` on empty pages, Next never disables (`dataProvider.ts:69`).
- Login/edit/delete errors are silent (no `notificationProvider`).
- 401 handling split; 403 unhandled; status code dropped in `getList` (`dataProvider.ts:26-29, 73`).
- Logout/check client-only; no token revocation or `exp` check (`authProvider.ts:41-62`).
- Dashboard hard-codes `/admin-api`, shows 0s on error, `value.toFixed` on string (`pages/dashboard/index.tsx:67-72, 217`).
- Launchpad project name/ticker/score editable after launch with no validation (`pages/launchpad-projects/edit.tsx:9-19`).
- Route `id` not URL-encoded → crafted link can redirect save/delete to another admin endpoint (`dataProvider.ts:44`).
- Users list hard-codes `isVerified` to "N/A" (`GenericList.tsx:78-80`).

---

## 4. Low (selected)

- JWT payload decoded with `atob` (not base64url) in 4 places — rare forced logouts.
- `ProfilePhoto`: Enter key uses stale closure; `localStorage.removeItem` during render; 413 check reads wrong field; accepts SVG.
- `JSON.parse` of stored onboarding data without try/catch, some during render → white screen on bad value.
- `router.replace` during render (`app/page.tsx:55`).
- OTP input: no `autoComplete="one-time-code"`, paste blocked, non-digits accepted, interval not cleared.
- Own referral code stored under the same key as the inviter's code (`ReferSection.tsx:52`).
- ~20 hard-coded `swarpfoundation.com/terms|privacy` links; "Swap Pay" typo; `<html lang="en">` fixed.
- README for the dashboard describes a different app (Next 15.4.5, screens that don't exist, Arabic).
- `token/[address]` Swap button links to a route that drops the query; `window.open` without `noopener` (also `TokenDetailSection.tsx:403`); DexScreener iframe without `sandbox`.
- Notification templates use `String.replace` with user data → `$&` expansion (`NotificationModal.tsx:108-113`); notifications never marked read.
- `SendModal` form resets whenever the balance refreshes; address-validation race.
- Username availability race; `'dismissed'` stored as a username sentinel.
- Creator `imageUrl` placed unquoted in CSS `url(...)`; social URLs not validated (`javascript:` accepted, not rendered today).
- `TradeModal.tsx` is entirely mock (fake txid `5xK8...7mN2`, confirm does nothing) — imported but unused.
- Admin: search box desync, deep-link page reset, `0` shown as "N/A", broken `/users/create`, no 404 route, `host: true` on Vite dev server, `identity` parse can throw, Amplify caches `node_modules` that `npm ci` deletes.

**Dead code:** `HomeDashboard.tsx`, `ui/BalanceTile|RewardCard|CryptoCard`, `lib/colors.ts`, all four hooks in `hooks/` except `useToast` (duplicated inside `HomeScreen`), unreachable Swap section in `HomeScreen.tsx:1592-1766`, commented blocks in `HomeScreen.tsx` and `api.ts`, `TradeModal.tsx`, launchpad `Notifications.tsx`, ~20 unused API methods. Admin: `@refinedev/simple-rest`, `zod`, `react-is`, `react-hook-form` and 3 Radix packages unused; duplicate `cn` helper; e-commerce leftovers in `AppSidebar` icon map.

---

## 5. Gaps (missing, not broken)

- **Backend not in repo** — custody, signing, bonding curve, fees, rate limits, lockout and KYC enforcement can't be reviewed. This is the largest remaining risk.
- No idempotency keys on any value-moving request.
- Amounts sent as JS floats, never as strings / base units.
- No confirmation/review screen before custodial spends or irreversible token creation.
- No single network config (devnet/mainnet assumptions in 5+ places).
- No live updates: launchpad price, trades, holders and quotes are frozen until the next action.
- No server-side OHLC/candles or 24h stats endpoint.
- No pagination in launchpad lists, trades, history, portfolio.
- No token name/ticker validation or impersonation check before minting.
- No graduated/migrated-token handling in the trade panel.
- No error boundaries.
- Admin: no MFA/step-up, no audit trail, no reason field, no session timeout, no wallet freeze tooling, sorting/filters ignored.
- No tests, and CI only runs `npm ci && npm run build` (no lint, type-check, audit).

---

## 6. Recommended fix plan

**Phase 0 — dependencies & build hygiene (½ day)**
1. Upgrade `next` past 16.3.5 (critical advisory), `sharp`, `react`/`react-dom` ≥ 19.2.1; `npm audit fix` in both apps; bump `axios` in admin; drop unused deps.
2. CI: add lint, type-check, `npm audit --omit=dev --audit-level=high`.
3. Fail the build when `NEXT_PUBLIC_API_URL` / `VITE_ADMIN_API_URL` is missing in production.

**Phase 1 — security blockers (needs backend changes too)**
1. Scoped tokens (pin_pending vs full); server PIN/step-up on send, swap, trade, stake, delete, PIN change.
2. OAuth: code + `state` exchange instead of `?token=`.
3. Login: OTP + PIN; lockout; weak-PIN blocklist; forgot-PIN flow.
4. Sessions: httpOnly cookie, central 401 handler, server logout, Redux reset on logout.
5. Security headers + CSP in both apps; SRI / isolation for Veriff and MoonPay; `noindex`.
6. Remove `syncMoonPayBalance`, `balanceSync.ts`, `otp` from responses; auth on `updateCountry`, `checkEmail`.
7. Admin: roles + access control, read-only email/phone, soft delete, field allowlist on show, audit log.

**Phase 2 — money correctness**
1. Fix `makeRequest` headers; real `ApiError` class.
2. Idempotency keys + submit locks on send/swap/buy/sell/stake/claim.
3. Swap: mint-based token identity, send slippage + min-out + quote id, quote expiry.
4. Launchpad: user slippage + min-out, `Number.isFinite` validation, floor-to-decimals max buttons, fee reserve, "status unknown" instead of "failed".
5. Amounts as decimal strings / base units.
6. Fix SOL vs wSOL, Buy-token → swap preselection, per-token transaction labels.

**Phase 3 — remove fake data**
Simulated chart, hard-coded SOL prices and FX rates, fallback APYs, `#47` rank, holdings box, static portfolio graph, trade-history status mapping, alert status, SPL balances on wallet screen, TradeModal.

**Phase 4 — structure & quality**
1. One onboarding flow; route guard via `middleware.ts`.
2. Split `HomeScreen.tsx` (1,900 lines) and `api.ts` (2,400 lines); delete dead code.
3. Single network config + visible network badge.
4. Backend endpoints for candles, 24h stats, pagination.
5. Tests for amount parsing, max/fee, quote expiry, auth guard, 401 handling.
6. Rewrite the dashboard README; config constants for legal URLs and `app.swarppay.com`.
