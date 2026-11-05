---
name: security-audit
description: Rigorous, evidence-based security audit of the maisha matcha app (Next.js + Payload + Supabase Postgres). Use before every push to production, after any change to auth, access rules, API routes, server actions, env/secrets, database schema or dependencies, or when the user asks for a security review, vulnerability check, RLS check or pentest-style pass.
---

# Security audit

Produce findings with evidence (file:line, command output), never guesses.
Severity: BLOCKER (exploitable now or data exposure), SHOULD (fix before
next release), NIT. End with SHIP or ITERATE. Fix BLOCKERs in the same
session when asked; otherwise report them first.

Run every section. Write "checked, clean" for sections with no finding so
the reader can see coverage.

## 1. Dependencies and supply chain

- `npm audit --omit=dev --json`: list each advisory with the dependency path
  and whether the vulnerable code is REACHABLE (public route, admin only,
  build only). Compare against the accepted list in `CLAUDE.md` ("Known
  audit findings"); anything new is at least SHOULD.
- `npm_config_legacy_peer_deps=false npm ci --dry-run` must pass.
- Lockfile: every `resolved` URL is registry.npmjs.org; no git or http
  sources; no install scripts added by new packages
  (`npm query ':attr(scripts, [postinstall])'`).

## 2. Secrets

- Search tracked files for secrets:
  `$G grep -nIE '(sk_live|sk_test|re_[A-Za-z0-9]{20,}|eyJhbGciOi|postgres(ql)?://[^ ]*:[^@ ]+@|BEGIN (RSA|EC|OPENSSH) PRIVATE)'`
  and the history: `$G log -p --all -S 'PAYLOAD_SECRET=' | head`.
- `.env*` gitignored except `.env.example`; `.env.example` holds no values.
- No server env var is read in a client component (`"use client"` files
  must not reference `process.env` other than `NEXT_PUBLIC_*`).
- `lib/secret.ts`: production never falls back to a known string.

## 3. Database exposure (Supabase, "RLS")

Payload owns its tables in the `payload` schema and connects as the
database owner, so Postgres RLS is NOT the access layer; Payload access
rules are. The real risk is Supabase's Data API (PostgREST/GraphQL) serving
tables to the public `anon` key. Verify both layers:

- Repo: `payload.config.ts` sets `schemaName: "payload"` and `push: false`;
  migrations create nothing in `public`.
- Live (needs `DATABASE_URL`; read-only queries only):
  ```sql
  select has_schema_privilege('anon','payload','USAGE') as anon_usage,
         has_schema_privilege('authenticated','payload','USAGE') as auth_usage;
  select schemaname, tablename, rowsecurity from pg_tables
   where schemaname = 'public';
  select grantee, table_schema, table_name, privilege_type
    from information_schema.role_table_grants
   where grantee in ('anon','authenticated') and table_schema in ('public','payload');
  ```
  Expected: no USAGE on `payload`; every `public` table (if any) has RLS on
  with explicit policies; no grants to anon/authenticated on `payload`.
- Supabase dashboard: API → Exposed schemas must not list `payload`.
  Ask the user to confirm if you cannot see it.

## 4. Access control (Payload)

For every collection in `cms/collections/`:
- All four operations (`read/create/update/delete`) are spelled out with
  helpers from `cms/access.ts`. A missing one defaults to "any signed-in
  user": BLOCKER for financial or personal data.
- Financial and ledger collections (orders, stock movements, audit log,
  future invoices/payments) have `delete: nobody` and no field that lets a
  past record be rewritten.
- Hidden fields (`pinHash`, `tokenHash`, lockout fields) have
  `read: () => false` and are never returned by any API
  (`curl /api/users/<id>` with a manager cookie).
- `overrideAccess: true` appears only in seed, migrations, hooks that
  write audit/ledger rows, and `lib/pos/*`. Grep and justify each.
- Integration tests in `tests/integration` cover each rule; add one for any
  rule without a test.

## 5. Authentication and sessions

- Admin: Payload JWT cookie, `maxLoginAttempts`, `beforeLogin` blocks
  inactive users and baristas. CSRF origins set when `NEXT_PUBLIC_SITE_URL`
  is set.
- Counter: device cookie (random, hashed at rest), PIN (scrypt), atomic
  lockout reservation, session bound to person + device + PIN version, 12h
  expiry. Re-run `tests/integration/pos-auth.test.ts`; read
  `lib/pos/core.ts` for any read-modify-write on counters.
- Cookies: `httpOnly`, `secure` in production, `sameSite` strict for POS.

## 6. Server entry points

List every public entry point and check input validation (zod), rate
limiting, error messages that leak nothing, and auth:
`app/api/**/route.ts`, `app/**/actions.ts` (server actions), Payload's
`/api/[...slug]` and GraphQL (disable GraphQL if unused).
- Server actions receive untrusted input: validate everything, re-check
  the session inside the action, never trust ids from the client for
  authorization.

## 7. Headers and browser surface

`curl -sI <url>` on `/es`, `/pos`, `/admin`: HSTS (Vercel adds it),
`X-Content-Type-Options`, `Referrer-Policy`, frame protection
(`X-Frame-Options` or CSP `frame-ancestors`) at least on `/pos` and
`/admin`. Note a missing CSP as SHOULD with a concrete policy.
- No `dangerouslySetInnerHTML` with non-constant input.
- Uploads (Media): owner/manager only; SVG served with Payload's upload CSP.

## 8. Privacy (GDPR)

Personal data stays in members/customers and staff collections, readable
only by owner/manager; erasure path exists (owner delete on members);
audit log does not copy personal data beyond ids.

## Output

A table of findings (severity, area, file:line, evidence, fix), then the
"checked, clean" list, then SHIP or ITERATE. Record accepted risks in
`CLAUDE.md` with a date.
