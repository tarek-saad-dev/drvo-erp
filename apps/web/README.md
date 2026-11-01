# DRVO Web — first Next.js runtime

This is a running Next.js 16 App Router **engineering preview**; no user login, DB, subscriptions, plans, or business modules exist.

From `apps/web`: `npm install`, `npm run dev`; open `http://127.0.0.1:3100` and probe `GET /health`. Run `npm run build` and `npm run typecheck` for checks.

No external fonts, remote image dependencies, secrets, customer records or production deployment are required. Dependency versions in package.json are exact but a nested lockfile is still a follow-up gate before production.
