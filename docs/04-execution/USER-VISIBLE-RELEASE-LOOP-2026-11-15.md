# User-visible delivery loop — DRVO internal development (2026-11-15)

**Founder requirement:** After every development step, provide a real site URL and let the founder click through the new feature. A committed source file, a passing CI job or an SSH receiver acknowledgment is NOT a verified browser-visible deployment.

## Actual known environment

- Current documented **internal staging preview**: https://erp-stage.drvotech.com/ and synthetic demo https://erp-stage.drvotech.com/demo/salon.
- This is **not a validated production/customer deployment**. No actual production URL was independently confirmed on 2026-11-15.
- The assistant's external HTTPS checks could not reach the stage hostname from its available network tools on 2026-11-15; this is **unverified reachability**, not proof the public domain is globally down.
- The existing auto-deploy workflow is `.github/workflows/staging-deploy.yml`, only on qualifying `main` changes with `DRVO_STAGE_AUTO_DEPLOY=true`. It packages API + Web, and the receiver checks internal health. It does not publish SQL migrations or enable private features.
- Added `.github/workflows/external-preview-smoke.yml`: read-only external GitHub-hosted check on successful Staging Deploy (also manually dispatchable). It checks HTTPS Web `/health` and public synthetic `/demo/salon`. **It proves neither release SHA nor private Module functionality**, and must not be reported as such. If its job did not run or has no successful result, report **NOT VERIFIED**.

## Per-feature delivery/acceptance contract

1. Implement a **small but complete vertical slice** in the rightful shared Module/Extension, with Tenant/Business/Branch authorization and tests. Direct `main` during founder-approved ADR-039 development mode.
2. Confirm tests, versioned SQL needs and the exact source commit. No real DB mutation without checked target + verified restorable backup + scoped migration + after-check.
3. Establish the **deployed release SHA** from actual trusted release evidence, not CI source code alone. If a GitHub deploy is pending, blocked or unverified, say so.
4. Check the **external URL over HTTPS** plus the feature's real UI and API state from the deployed version. For private features, use **authorized internal accounts** and independently verify allowed operations, persistence after refresh, and denied cross-scope/unauthorized operations. **Do not enable Public Auth or paid/private grants** solely to make a page visible.
5. Report: **Feature / exact link / what to click and try / stored vs synthetic / source SHA / deployed SHA evidence / UI+API test result / remaining limitations**. If any gating check is absent, label the link **not confirmed live** and provide the blocker, instead of claiming a production release.
6. Maintain ADR-030/031/032/037, founder ADR-039/040, and the separate external customer gates P1–P7 and commercial C1–C3.

## First blocked real feature links

- Shared HR + Salon Barber: `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/hr`.
- Reports R1: `https://erp-stage.drvotech.com/workspace/{businessId}/{branchId}/reports`.

Both are **route templates, NOT usable deep links** without an authorized Business/Branch, private K5 session, reviewed flags and backend DB schema. SQL migration 018 is tested in disposable CI but **not verified applied to primary DRVO SQL**, and actual live release/access are unknown. No live demo should pretend that synthetic seed data proves these private Modules.

## Immediate operators' release dependencies

- Confirm actual staging hostname external DNS/HTTPS and deployed `release.sha` against the intended GitHub `main` SHA.
- For private HR: confirm backed-up SQL target and independently authorized 010–018 migration readiness, current auth/rights isolation, and safe internal feature-flag enablement; otherwise keep OFF.
- Obtain an authorized private Owner/Staff browser acceptance of HR and Reports before labeling them LIVE.
- Keep production and unrelated clinic staging separated. Never publish employee/customer information to a public anonymous demo.
