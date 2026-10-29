# ADR-010 Offline Customer Credit
Date: 2026-10-29. Status: **Approved product behavior with explicit conflict to resolve**.

Founder decision: while Offline, register the credit receivable immediately on the POS device and check/review any credit-limit excess after synchronization.

Conflict: earlier POS rules required hard stop on exceeding customer credit limit. Two disconnected devices cannot enforce a global shared limit. **Latest choice supersedes the earlier hard-stop promise for offline-originated credit only**, but business consequence of excess must be specified before financial implementation. Online hard stop stays intact.

Design proposal, not approved: local record labeled OFFLINE_UNRECONCILED, sync to immutable server sale/debt record where permissible, flag CREDIT_LIMIT_EXCEEDED_REVIEW with amount, reviewer and remediation. Never silently discard actual sale or falsely claim global cap enforced; decide authorization, credit hold, and recovery workflow, including simultaneous multi-device sales.

Acceptance examples: customer limit 1,000; two offline devices each create 800 debt; after sync actual total 1,600 must be visibly flagged and cannot be mistakenly accepted as compliant with limit. Preserve source events, no duplicate AR. 
