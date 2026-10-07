# Swarp Foundation Admin

Internal admin console for the Swarp custodial wallet and SwarpLaunch launchpad:
users, wallets, transactions and launchpad projects, plus a dashboard of totals
and charts. It is a static single-page app; all data comes from the backend API,
which is **not** in this repository.

## Stack

- Vite 8 + React 19 + TypeScript
- [Refine](https://refine.dev) 5 (`@refinedev/core`, `@refinedev/react-router`) for data,
  auth, access control and notifications
- TanStack Table (list views), TanStack Query (cache, via Refine)
- Tailwind CSS 3, Radix UI primitives (dialog, label, separator, slot, tooltip), Heroicons/Lucide
- Recharts (dashboard only, loaded on demand)
- axios for HTTP

## Environment variables

Copy `.env.example` to `.env` for local development. Only `VITE_*` variables are
read, and their values are embedded in the public JavaScript bundle, so never put
secrets in them.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_ADMIN_API_URL` | Production builds | `http://localhost:3000` (dev only) | API origin, e.g. `https://api.example.com`. Production builds fail if it is missing or not `https`. |
| `VITE_ADMIN_API_BASE_PATH` | No | `/admin-api` | Path prefix of the admin REST resources. |
| `VITE_DEV_PORT` | No | `3002` | Port for `npm run dev` and `npm run preview`. |

All configuration is read in one place, `src/config.ts`.

## Run locally

```bash
cd apps/foundation-admin
cp .env.example .env        # then point VITE_ADMIN_API_URL at your API
npm ci
npm run dev                 # http://localhost:3002 (listens on localhost only)
```

The backend must allow the dev origin in its CORS settings.

## Checks and build

```bash
npx tsc -b                  # type-check
npm run lint                # ESLint
VITE_ADMIN_API_URL=https://api.example.com npm run build   # output in dist/
npm audit --omit=dev        # production dependency advisories
```

`npm run build` runs `tsc -b` and `vite build`. Routes are code-split; framework
code is split into `vendor-react` and `vendor-refine` chunks.

## Deploy (AWS Amplify)

1. Create an Amplify app with **`apps/foundation-admin`** as the app root
   (monorepo setting). `amplify.yml` installs with
   `npm ci --cache .npm --prefer-offline` and caches `.npm`, not `node_modules`.
2. Set `VITE_ADMIN_API_URL` (and `VITE_ADMIN_API_BASE_PATH` if it is not
   `/admin-api`) under *Environment variables*. Without it the build fails.
3. Add the SPA rewrite under *Rewrites and redirects* so deep links such as
   `/users/show/123` load the app instead of returning 404:

   | Source address | Target address | Type |
   | --- | --- | --- |
   | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

4. Security headers come from `customHttp.yml` (Amplify picks it up from the app
   root): `Content-Security-Policy` (`default-src 'self'`, `connect-src 'self' https:`,
   `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `Strict-Transport-Security`,
   `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`,
   `Permissions-Policy` and `X-Robots-Tag: noindex`. Production builds also
   carry a CSP `<meta>` tag (injected by `vite.config.ts`) whose `connect-src`
   is pinned to the API origin, as a fallback for hosts that do not send the
   headers.
5. Restrict who can reach the console (Amplify access control, VPN or an IP
   allowlist in front of it). It is an internal tool and should not be public.

Other static hosts work the same way: serve `dist/`, rewrite unknown paths to
`/index.html`, and send the headers listed in `customHttp.yml`.

## Security model

The console only decides what to *offer*; every rule below must also be enforced
by the backend, because anything in the browser can be bypassed.

- **Sign-in**: `POST /auth/admin-login` with email and password returns
  `{ access_token, user }`. The JWT and user object are kept in `localStorage`
  (`swarp_foundation_admin_token`, `swarp_foundation_admin_user`) and sent as
  `Authorization: Bearer`. The JWT `exp` claim is checked on every route change;
  expired or malformed tokens end the session. Logout and any `401` from the API
  clear both keys and the query cache.
- **Roles**: read from `user.role` / `user.roles` in the login response (falling
  back to the same JWT claims). `superadmin` and `admin` can edit; anything else,
  including a missing role, is treated as a read-only `viewer`. `403` responses
  show a "not permitted" notification.
- **What each resource allows** (`src/accessControl.ts`):

  | Resource | Read | Edit | Delete |
  | --- | --- | --- | --- |
  | Users | all roles | admin, superadmin (country, currency, language only) | never |
  | Wallets | all roles | no | no |
  | Transactions | all roles | no | no |
  | Launchpad projects | all roles | admin, superadmin (name and ticker locked) | admin, superadmin, after typing the project name |

- **User contact details**: email and phone number are read-only here, since
  they are the login and recovery channel.
- **Edits** send only changed fields with `PATCH`, keep types (booleans, numbers,
  `null`), accept only `https://` URLs and are confirmed in a dialog showing the
  before/after diff.
- **Displayed data**: detail and list views render a per-resource field
  allowlist (`src/resources/fields.ts`) and never render keys that look like
  secrets (PINs, passwords, hashes, seeds, private keys, OTP or confirmation
  codes). Emails and phone numbers are partially masked in lists.
- **Requests**: record ids are URL-encoded; list sorting/filtering parameters
  coming from the URL are validated before they are sent.

## Backend requirements

These protections are only complete if the API also does the following:

- Enforce authentication and the admin role on every `/admin-api` route, with
  the same per-resource rules as the table above (in particular: no user hard
  delete, no email/phone change through `PATCH /admin-api/users/:id`, no name or
  ticker change on launchpad projects, read-only wallets and transactions).
- Return `role` (`superadmin` | `admin` | other) or `roles` on the `user` object
  from `POST /auth/admin-login`; otherwise every admin is read-only.
- Issue a JWT `access_token` with an `exp` claim, and reject expired or revoked
  tokens with `401`.
- Return `403` for authenticated but unauthorised requests.
- Accept `PATCH` with a partial body on `/admin-api/users/:id` and
  `/admin-api/launchpad-projects/:id`, and validate it server-side (types,
  `https` URLs, `profileScore` 0-100).
- Never include secrets in admin responses (`confirmationCode`, PIN or password
  hashes, private keys).
- List endpoints: accept `page`, `limit`, `search`, `sort` (field name, which the
  server must check against an allowlist) and `order` (`asc` | `desc`), and
  return `{ data: [...], total }`.
- Allow the console origin in CORS and rate-limit `POST /auth/admin-login`.
- Keep an audit log of admin writes and deletes.
