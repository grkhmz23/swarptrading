# SwarpPay API

The real backend for the SwarpPay dashboard (`apps/foundation-dashboard`) and admin
console. It replaces the lost original backend and is being built step by step
following [`docs/BACKEND_PLAN.md`](../../docs/BACKEND_PLAN.md).

**Status: step 1 of the plan — foundation, SMS sign-in, sessions and wallet PIN.**
Wallets, balances, sends, swaps, ramps and the launchpad are later steps; until
then the dashboard can sign in and set a PIN but has no wallet to show.

## Stack

Node.js ≥ 22.12 · NestJS 12 on Fastify 5 · PostgreSQL (Drizzle ORM, SQL migrations) ·
`jose` JWTs · Argon2id (`@node-rs/argon2`) · Zod · Twilio Verify · Vitest.

## Run locally

```bash
cd apps/api
npm ci
cp .env.example .env          # fill in the REQUIRED values (see below)
set -a && . ./.env && set +a  # load it into the shell

createdb swarp_api            # or point DATABASE_URL at any PostgreSQL 14+
npm run build
npm run db:migrate            # applies drizzle/*.sql
npm start                     # http://localhost:3001
```

`npm run dev` rebuilds on change and restarts the server.

Required values:

| Variable | How to get it |
| --- | --- |
| `DATABASE_URL` | Any PostgreSQL 14+ database |
| `CORS_ORIGINS` | The dashboard origin(s), e.g. `http://localhost:3000,https://app.swarppay.com` |
| `JWT_SECRET`, `PIN_PEPPER` | Two different values from `openssl rand -hex 32`. Losing `PIN_PEPPER` invalidates every PIN |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Twilio Console → Account info |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console → Verify → Services → create a service (SMS channel on; enable Fraud Guard and Geo permissions for your markets) |

SMS sign-in only works with real Twilio credentials; without them `continue-with-phone`
returns 502 "Failed to send SMS". There is no fake SMS mode.

## Checks

```bash
npm run type-check
npm run lint
TEST_DATABASE_URL=postgres://user:pass@localhost:5432/swarp_api_test npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Integration tests run the whole app against a real PostgreSQL database. The test
helper drops and recreates the schema, so it refuses any database whose name does
not end in `_test`. The SMS provider is replaced by a test double; everything else
(database, hashing, tokens, guards, rate limits) is real.

## Endpoints (step 1)

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | — | Liveness + database check |
| `POST /auth/continue-with-phone` `{ phoneNumber }` | — | Sends an SMS code. Same response whether or not the account exists |
| `POST /auth/verify-otp` `{ phoneNumber, otp }` | — | Signs in (creates the account on first use). Returns `{ token, user }` and sets the refresh cookie |
| `POST /auth/refresh` | refresh cookie | New access token; rotates the cookie |
| `POST /auth/logout` | session | Revokes this session |
| `GET /auth/has-wallet-pin` | session | `{ hasPIN }` |
| `POST /auth/set-wallet-pin` `{ pin }` | session | First PIN only (409 if one exists); unlocks the session |
| `POST /auth/verify-wallet-pin` `{ pin }` | session | Unlocks the session; also the step-up before value-moving actions |
| `POST /auth/change-passcode` `{ oldPasscode, newPasscode }` | session | Changes the PIN and signs out other devices |
| `GET /auth/profile` | session | Profile basics |
| `POST /auth/update-country` `{ country }` | session | ISO country code; identity comes from the token, never the body |
| `GET /auth/sessions` | unlocked | Signed-in devices |
| `DELETE /auth/sessions/:id` | unlocked | Sign a device out |

Errors always have the shape `{ statusCode, message, error }`, which the dashboard
already reads.

## Security model

- **Sessions.** The access token is a short-lived HS256 JWT (`sub` = user, `sid` =
  session). Every request also checks the session row, so sign-out, PIN changes and
  account disabling take effect immediately. The refresh token is a random value
  stored only as a SHA-256 hash, rotated on each use, and sent as an
  `httpOnly; Secure; SameSite=Strict` cookie scoped to `/auth`.
- **PIN-pending sessions.** A session created by SMS sign-in can only reach the PIN
  and profile endpoints until the PIN is entered. Routes default to requiring an
  unlocked session (`SessionGuard`); `@AllowPinPending()` opts out and
  `@RequireRecentPin()` demands a PIN entry within `PIN_STEP_UP_TTL_SECONDS` (for
  sends, swaps and trades in later steps).
- **PIN storage.** Argon2id (19 MiB, 2 passes) with `PIN_PEPPER` as the Argon2 secret.
  A 6-digit PIN has a million values, so the pepper and the lockout are what protect
  it: after `PIN_MAX_ATTEMPTS` wrong tries the PIN locks for 15 min, doubling on each
  further lockout up to 24 h. Checks lock the row, so parallel guesses are serialised.
  Weak PINs (repeated, sequential, common) are rejected, with the same rules as the
  dashboard.
- **SMS abuse.** Per-number (3 / 10 min, 10 / day) and per-IP (20 / hour) limits are
  stored in PostgreSQL, so they hold across instances; `OTP_ALLOWED_COUNTRIES`
  restricts destinations. Twilio Verify applies its own limits and Fraud Guard on top.
- **Account enumeration.** `continue-with-phone` returns the same body for new and
  existing numbers.
- **Audit log.** Sign-ins, refreshes, PIN set/verify/fail/lock/change, session
  revocations and SMS throttling go to `audit_events` with IP and user agent. Codes,
  PINs and tokens are never stored.
- **Transport.** CORS allow-list from `CORS_ORIGINS`, Helmet headers, 64 KB body
  limit, a per-IP rate limit (300/min, 10/min on sign-in routes), and logs that
  redact `Authorization` and cookies.

## Differences from the old backend the dashboard expects

- `continue-with-phone` always routes the dashboard to the SMS code screen: the old
  phone + PIN login (`/auth/login-with-passcode`) was single-factor and is not
  provided.
- The dashboard does not yet call `/auth/refresh`, so a user is signed out when the
  access token expires (`ACCESS_TOKEN_TTL_SECONDS`, default 1 h). Wiring the refresh
  call into the dashboard is part of a later step. The refresh cookie needs the
  dashboard and API on the same site (e.g. `app.swarppay.com` and `api.swarppay.com`).
- Google sign-in and email sign-in are not implemented yet.

## Layout

```
src/
  main.ts, bootstrap.ts     server start, plugins, CORS, error filter
  config/                   environment validation (Zod)
  db/                       schema, pool, migrations runner
  common/                   error filter, Zod pipe, request metadata
  auth/                     controller, sessions, guard, PIN, SMS (Twilio Verify), throttling
  users/, audit/, health/
drizzle/                    generated SQL migrations (`npm run db:generate` after schema changes)
test/                       integration tests against PostgreSQL
```
