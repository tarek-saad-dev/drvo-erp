# Salon S8-C — Owner/Staff private browser pilot review matrix (NOT executed)

**Source/CI-only preparation, NOT an authenticated browser test.** The existing authenticated SQL2022/Nest integration tests prove private module action behavior on disposable databases, while K5F root-owned VPS audit, offsite independent restore, explicit SQL 010–017 approval and ADR-032 private entitlement are still unapproved. Therefore an actual Owner/Staff browser test against live Staging would be unauthorized.

This deliverable is a portable read-only machine-readable Owner/Staff/Tenant/Branch review matrix that is deliberately unable to connect to VPS, invoke a browser, execute SQL or enable flags. Fourteen cases describe conditional expected outcomes (Owner and Staff positive reads only WHEN explicitly granted; negative missing-action rights, forged Origin, foreign Tenant/Branch, POS independence, double booking, SQL017 confirmed window close, CLOSED window and DRAFT_NOT_POSTED). Role label alone NEVER grants action: live tests must explicitly verify active grants and fresh K5 session.

Run from a reviewed local repository:
    node tools/salon-pilot/browser-matrix.cjs --matrix

This prints only synthetic route placeholders and review case definitions: no logins, tokens, PII, live addresses or credentials. The root K0 Node tests enforce default-disabled private route code, matrix assertions and an inert tool contract. It can be carried between ChatGPT, Cursor and authorized operator workflows.

**After real release approval only:** authorized operator creates private synthetic Tenant A/B, Branch A/B, scoped Owner and Staff accounts; executes these browser/API cases, captures redacted timestamped outcomes and route-level denials, verifies independent POS/Booking rights, offhost recovery, reverse proxy and exact trusted Origin. A matrix being present, all self-reported results or all CI green is NEVER Go or permission to apply SQL, enable Auth, invite real users, charge customers or POSTED sales. ADR-031 remains a separate finance/first GL decision.
