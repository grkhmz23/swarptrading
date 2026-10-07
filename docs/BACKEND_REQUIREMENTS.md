# Backend requirements

The front-ends in this repository now send the data and follow the flows below,
but **the backend is the security boundary**. Every item here must be enforced
server-side; client checks only improve the user experience and stop casual
misuse. Items are grouped by priority.

The backend is not in this repository, so none of this has been verified.

---

## P0 — required before real funds

### Sessions and the wallet PIN
1. **Scoped tokens.** A token issued after OTP or Google sign-in must be limited
   ("PIN pending"). Only `POST /auth/verify-wallet-pin` or
   `POST /auth/login-with-passcode` should return / upgrade to a token that can
   call wallet, swap, staking and launchpad trading endpoints. The dashboard
   gates `/dashboard` on a PIN unlock per tab, but a script can call the API
   directly.
2. **PIN on value-moving calls.** Require and verify the wallet PIN (or a
   short-lived step-up token issued by `verify-wallet-pin`) on:
   `POST /wallet/:id/send-transaction`, `POST /wallet/:id/swap/execute`
   (body already carries `pin`), `POST /launchpad/projects/:id/custodial/buy|sell`,
   `POST /launchpad/custodial/create-token`, `POST /staking/stake`,
   `POST /staking/withdraw/:id`, `DELETE /auth/delete-account`,
   `POST /auth/change-passcode`. The UI verifies the PIN via
   `verify-wallet-pin` immediately before each of these.
3. **PIN brute force.** Per-account and per-IP lockout with backoff on
   `verify-wallet-pin` and `login-with-passcode`. Reject repeated, sequential and
   common PINs on `set-wallet-pin` / `change-passcode` (same rules as
   `apps/foundation-dashboard/src/lib/pin.ts`).
4. **No PIN overwrite.** `POST /auth/set-wallet-pin` must return 409 when a PIN
   already exists; changes only through `change-passcode` with the old PIN.
5. **Passcode login needs a second factor.** Phone number + 6-digit PIN alone is
   one factor. Require an OTP (or a device-bound token) for new devices.
6. **OTP never in responses.** `POST /auth/continue-with-phone` must not return
   the OTP in any environment reachable from the internet. Return a uniform
   response (`{ otpSent: true }`) regardless of whether the account exists, and
   rate-limit + CAPTCHA it (SMS pumping).
7. **`POST /auth/update-country`** must identify the user from the bearer token
   (now always sent) and ignore `phoneNumber` / `email` in the body.

### Money correctness
8. **Idempotency.** Honour the `Idempotency-Key` header (UUID per user action)
   on send, swap execute, launchpad custodial buy/sell, and stake. Store the key
   with the result for at least 24h and return the original result on replay.
   CORS must allow the `Idempotency-Key` header.
9. **Slippage and minimum output.** `swap/execute` receives `slippageTolerance`,
   `minimumOutputAmount`, `inputMint`, `outputMint`; launchpad buy/sell receive
   `slippageTolerance` and `minimumOutputAmount`. Reject execution that would
   return less than `minimumOutputAmount`. Route swaps by **mint**, never by
   symbol. If DTO validation rejects unknown properties, add these fields.
10. **No client-reported credits.** Remove or disable
    `POST /wallet/:id/sync-moonpay-balance` (the client no longer calls it).
    Credit purchases only from MoonPay/Transak webhooks or verified on-chain
    transfers.
11. **Account deletion** must fail while the wallet holds SOL or tokens.
12. **Amounts.** Convert to base units (lamports / raw token units) with exact
    decimal arithmetic and reject amounts finer than the token's decimals.

## P1 — before public launch

13. **Google OAuth.** The client now starts sign-in at
    `GET /auth/google/callback?state=<uuid>` and only accepts a callback in the
    tab that started it. Pass `state` through the OAuth round trip and append it
    to the redirect back to the app. Better: redirect with a one-time `code` the
    client exchanges via POST, instead of putting the session token in the URL.
14. **Session storage.** Move the access token to an `httpOnly`, `Secure`,
    `SameSite=Strict` cookie (the client reads/writes it in one place:
    `src/lib/session.ts`), short-lived access tokens with refresh, and a
    `POST /auth/logout` that revokes them.
15. **Email ownership.** Verify email with an OTP before saving it;
    authenticate and rate-limit `check-email`.
16. **Launchpad tokens.** Build the Metaplex metadata JSON server-side (the
    client no longer sends `metadataUri`). Enforce name ≤ 32 chars, ticker
    2–10 `[A-Z0-9]`, https-only social links, image type/size by magic bytes and
    re-encode uploads; reject SVG. Refuse bonding-curve trades for migrated
    tokens. Disable the unused non-custodial `/launchpad/onchain/*`,
    `/launchpad/projects/:id/buy|sell` routes if they still exist.
17. **Staking.** Accept `poolId` on `POST /staking/stake` and validate amount
    against the pool's min/max server-side.
18. **Transactions.** Include `tokenMint` and `tokenSymbol` on SPL entries in
    `GET /wallet/:id/transactions` (the UI labels by them).
19. **MoonPay production.** Provide a server endpoint that signs MoonPay widget
    URLs (HMAC with the secret key); until then the UI only uses MoonPay with a
    sandbox key and routes live purchases through Transak.

## Admin API (`/admin-api`)

20. Enforce authentication **and** an admin role on every route; return
    `role` (`superadmin` | `admin` | other) on `POST /auth/admin-login`.
21. Users: no hard delete; `PATCH /admin-api/users/:id` must not change email or
    phone (use a separate, audited, re-authenticated flow).
22. Launchpad projects: name and ticker immutable after creation; validate URLs
    and `profileScore`.
23. Wallets and transactions read-only.
24. Never return secrets (`confirmationCode`, PIN/password hashes, keys).
25. Accept `PATCH` with partial bodies; list endpoints take `page`, `limit`,
    `search`, allow-listed `sort`, `order` and return `{ data, total }`.
26. Audit log for every admin write/delete, MFA for admin login, session timeout.

## Operations

27. CORS allow-list: `https://app.swarppay.com` and the admin origin only.
28. Set `NEXT_PUBLIC_API_URL` (https) and `NEXT_PUBLIC_SOLANA_NETWORK` for the
    dashboard build, `VITE_ADMIN_API_URL` for the admin build — both builds fail
    without them.
29. The dashboard CSP `connect-src` is fixed at build time from
    `NEXT_PUBLIC_API_URL`; rebuild when the API origin changes.
