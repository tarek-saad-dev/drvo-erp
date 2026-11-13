# Salon S3 — Private Pilot operator preflight / explicit Go–No-Go (2026-11-13)

> **2026-11-13 S5 UPDATE:** Source migrations now **001–016** (new Booking dated availability SQL016). K5F pre-migration observed-history checker remains fixed to legitimate 001–009; never confuse source manifest size with actual VPS schema. SQL **010–016 is NOT approved on VPS**. The evidence CLI remains read-only/non-authorizing. [S5 handoff](SALON-S5-THREE-TRACK-DELIVERY-2026-11-13.md).


> **2026-11-13 S4 update:** Source SQL migration count is now **15 (001–015)** due to reviewed Booking lifecycle PR #80. The operator's actual K5F pre-migration history must **still** match only 001–009; SQL 010–015 is unapproved for VPS. This source planner remains read-only and nonauthorizing, including if all claims are operator-reported. [S4](SALON-S4-PARALLEL-DELIVERY-2026-11-13.md).


**Status:** PR [#78](https://github.com/tarek-saad-dev/drvo-erp/pull/78) MERGED at `4b010ad30387c41b6c3a915f6e7845330020651b`; K0/K1/Staging Artifact CI PASS. SOURCE-ONLY, READ-ONLY candidate-evidence assessment. NOT a VPS audit, staging SQL migration approval, K5 activation, pilot login or acceptance of proposed ADR-032. Prior [S2 integration](SALON-S2-INTEGRATED-HANDOFF-2026-11-13.md) proved actual Customer→Catalog→Booking→POS DRAFT through authenticated Nest + disposable SQL2022, **not through live VPS**.

## Why this is the next necessary slice

The private Salon UI and scoped API owners already exist. Deploying code succeeded, but activating K5 + applying SQL 010–014 while K5F/offsite backup proof is incomplete risks exposing real branches and losing recoverability. A PR/CI GREEN is not authorization for live migration or enabling modules. This gate turns the remaining operational acceptance into a deterministic, redacted review matrix without giving ChatGPT SSH/root/VPS access.

## Architectural impact BEFORE implementation

- New `tools/salon-pilot/preflight.cjs` is standalone Node CommonJS; **no SQL driver, SSH, HTTP, network or remote code execution**. It consumes a maximum-8-KB deliberately bounded, redacted JSON of **operator-REPORTED** evidence and the immutable Git source manifests already used by K5F-2.
- No changes to Modular Monolith, K5 Identity, Customer/Catalog/Booking/POS APIs, DB roles/SQL migrations, Cashier, public `/demo/salon` or staging feature flags.
- This gate can *report missing evidence*. **Even with every field OPERATOR_REPORTED it always returns `canMigrateVps:false`, `canEnablePrivateK5:false`, `canEnableModules:false`, `canInviteUsers:false` and `canPostFinancialSale:false`.** Human self-reported fields are not independently attested. An authorized operator must review original non-secret logs and sign off before any separate controlled action.
- ADR-030 trusted authenticated Tenant/Business/Branch scope stays enforced. ADR-031 first GL remains PROPOSED; ADR-032 commercial entitlement remains PROPOSED and cannot be silently accepted by an evidence field.

## Run a safe source-only check

From a trusted local DRVO clone at the **reviewed Git SHA**, no VPS access required:

```bash
node tools/salon-pilot/preflight.cjs --template > salon-pilot-redacted-evidence.json
node tools/salon-pilot/preflight.cjs --input salon-pilot-redacted-evidence.json
```

The template intentionally includes `reportedDeployedSha:null`, an **empty** migration-history evidence list, and eight `MISSING` controls. For reviewed operator evidence, fill **only** the exact allowed keys with the **non-secret** observed release SHA, exact observed nine pre-migration `core.SchemaMigration` `name` + SHA-256 `checksum` records and values `MISSING` or `OPERATOR_REPORTED`. **NEVER upload the JSON itself to GitHub or chat**; keep it in authorized local operator records, redact logs, and do not run the tool with credentials/DB connections. Unknown fields, secrets accidentally included as keys, unknown SQL history, wrong DB, extra rows/changes and malformed identifiers fail closed; content is never echoed on validation failure.

The existing source manifest checker supports **K5F pre-migration SQL 001–009 only**: even nine matching reported rows merely identifies the source gap **010–014**, not a database ready to migrate. Updating K5F to correctly audit a post-migration state needs a separately reviewed source+operator process; never trick the 9-row checker to accept 14.

## Independent operator checkpoints (outside this PR)

| Review control | Required operational proof before proceeding | Current state |
|---|---|---|
| Release SHA and trust | Compare reviewed Git main SHA with actual deployed `release.sha`; inspect root-owned immutable K5F bundle digest and dependencies from a trusted administrator console | **Unverified live** |
| K5F flags/security audit | Run the reviewed K5F checker as root from its **trusted pinned bundle**, full 17 feature flags default OFF, validate runtime DB least privilege and real email/proxy access controls | **OPEN** |
| Recovery | Encrypted backup **off-host** and independently restored, isolated DRVO-only recovery DB; compare source/history/permissions; record approved RPO/RTO/cleanup | **OPEN** |
| Access / negative tests | HTTPS Nginx real IP/Origin, private access restriction, Resend sender plus synthetic Owner/Staff and foreign Tenant/Branch denial | **OPEN** |
| SQL 010–014 | Explicit operator/founder migration window and rollback/recovery sign-off, manually reviewed payload and restricted DB-only workflow | **NOT AUTHORIZED** |
| Private activation | ADR-032 approval / authenticated Business entitlement, scoped action grants, negative authorization evidence; never enable public onboarding | **NOT AUTHORIZED** |
| Money | Finance/Founder/Architecture ADR-031 first journal + VAT/AR/Treasury/tender policy | **NOT AUTHORIZED** |

**Read-only operator commands** (from the previous [K5F runbook](K5F-STAGING-SECURITY-VALIDATION-2026-11-10.md); only an authorized VPS administrator):

```bash
sudo -u drvoerp -H git -C /srv/drvo-erp/repo rev-parse HEAD
sudo cat /srv/drvo-erp/deploy/current/release.sha
sudo systemctl is-active drvoerp-api.service drvoerp-web.service
```

Only **after** the two SHAs match, review the official K5F root-bundle refresh runbook before running the checker as root; do **not** execute a mutable checkout as root or supply a guessed `--expected-sha`. The audit of real flags, proxy chain, SQL privileges and off-host restore must be performed by an authorized operator, not inferred from CI.

## Source CI acceptance

- `tests/salon-pilot-preflight.test.cjs` uses actual exact SQL 001–014 source manifest, simulates correctly ordered 001–009 and drift/foreign DB/extra row cases, missing operator controls and mismatched deploy SHAs.
- Tests explicitly establish that **all controls reported** still cannot authorize migrations or auth/financial posting; unknown fields fail with no leaked content.
- Pass K0, K1 on exact PR HEAD. Document CI results and changed files after merge.

## Pilot resume point AFTER independent approvals (not this PR)

Only when K5F + offsite restore are signed off: review the strict manually dispatched staging SQL migration window for 010–014; separately approve private-only K5/Customer/Catalog/Booking/POS flags with restricted, test-only Branch membership and module entitlements. Run a real Owner/Staff browser walkthrough: **create Customer → Catalog Service → Booking → browser refresh shows persisted SQL row → POS DRAFT → refresh shows persisted Draft**, with foreign Business/Branch and revoked permission denying access. Never connect the public mock `/demo/salon` to private API. No Sale POSTED until Finance approves ADR-031.

**This S3 preflight PR intentionally neither runs migrations nor opens a live salon.**
