# Identity and Access Discovery — Round 1

**Date:** 2026-10-28
**Status:** Founder requirements confirmed; security details and permission matrix pending.

| # | Decision | Status |
|---|---|---|
| 1 | Tenants self-register | Approved |
| 2 | Owner and Manager create employee accounts | Approved |
| 3 | Username unique platform-wide | Approved; supersedes prior tentative tenant-qualified username |
| 4 | Login by Username + Password; tenant resolved automatically | Approved |
| 5 | Owner must hold explicit Membership for each Business | Approved |
| 6 | Manager can create other Managers | Approved; scope and privilege escalation controls unresolved |
| 7 | One Role per user per Branch | Approved |
| 8 | Explicit Deny vs Allow | OPEN — requested recommendation |
| 9 | Password recovery via email OTP | Approved; require verified recovery address and security controls |
| 10 | Mandatory first-login password change for employees | Approved |
| 11 | Disabled employee sessions end on next refresh | Approved intent; backend must reject revoked credentials on next protected request, irrespective of refresh |
| 12 | Temporary permissions | DEFER until permission matrix |

## Critical reconciliation

1. Prior tenancy discovery specified **separate user accounts across Tenants**, not shared multi-Tenant memberships. Platform-global unique username is compatible: a person joining a different Tenant registers a different account and username. This is a departure from any previously suggested tenant-qualified username uniqueness.
2. Login with username alone determines Tenant only if the account is globally unique. Never trust a Tenant ID provided by clients for authorization.
3. Self-registration is distinct from employee invitation; define verified email, Tenant creation abuse prevention, recovery and management.
4. Manager may create Manager accounts, but should never grant privileges or scopes beyond their own authorization; exact rule pending Founder approval.
5. An Owner requires explicit Business Membership. Owner's ability to provision their first Business and recover from being locked out requires a bootstrap/recovery flow.
6. One Role per Branch does not settle multiple simultaneous Tenant/Business/Branch roles, precedence and effective permission calculation.
7. Profit/cost access for Managers within managed scope is already approved. Exact Manager Role semantics and scope must be defined.
8. Revocation should invalidate authorization server-side on next API request. A browser UI refresh is not a security boundary.

## Recommended, not yet accepted

**Permissions:** default deny when no Allow exists, with no explicit Deny rule in V1. This reduces conflicting grants and complexity given one Role per Branch. Separate guards for owner, scope and high-risk actions. If explicit Deny becomes necessary, introduce it only through a documented precedence model and test suite.

**Recovery:** short-lived, single-use OTP with rate limits, nonenumerating responses and audit logs. Final TTL/channel implementation pending.
**Privilege safety:** Manager creation cannot exceed creator's scope or grant unauthorized roles. Require server-side checks.

[Tenancy Blueprint](TENANCY-ARCHITECTURE.md) · [Open questions](../04-execution/OPEN-QUESTIONS.md).

## Permission evaluation decision (2026-10-28)

Founder accepted **Allow-only + Default Deny** for V1. An action without a valid applicable Allow permission is rejected. No explicit Deny rule. All operations still require scoped membership, resource ownership and security checks. The QR card use case remains unspecified and is not authorization on its own.
