# Offline POS & Shift/Day Close — Logical Database Draft
Date: 2026-10-28. Status: architecture proposal only. SQL dialect, primary keys, schema syntax, indexes and storage vendor NOT selected. No database deployed.

## Boundaries
Tenant > Business > Branch isolation; globally unique username and tenant-scoped account per previously approved access spec. Business-level currency/timezone, not per-branch overrides. Modules Core + Extension. Shared SQL with mandatory tenant isolation. Never derive permission from incoming tenantId.

## Candidate tables (not final naming)
| Entity | Key columns / constraint |
|---|---|
| pos_devices | id, tenant_id, business_id, branch_id, registered_by, status, last_seen_at |
| pos_device_queue_watermarks | device_id, shift_id, last_acked_sequence, last_seen_local_count, last_seen_local_amount, observed_at |
| pos_offline_events | id, device_id, client_event_id, shift_id, local_sequence, payload_hash, kind, occurred_at, synced_at, posting_date, ack_state, canonical_sale_id; UNIQUE(device_id,client_event_id), UNIQUE(device_id,local_sequence) subject to event stream design |
| pos_offline_event_attempts | event_id, attempt_no, error_category, attempted_at, retry_after, outcome; audit without losing event |
| pos_invoices | id, tenant_id, business_id, branch_id, shift_id, operator_id, customer_id nullable, posted_at, occurred_at, business_date, immutable_doc_revision |
| pos_invoice_lines | id, invoice_id, line_kind, catalog_id nullable, executor_user_id nullable, opener_user_id nullable, price, discount, pre_tax_net, tax, returnable_remaining |
| pos_payments | id, invoice_id, method_id, amount, tender_state, provider_reference nullable, verification_evidence_id nullable, collected_at |
| pos_receivables | customer_id, invoice_id, outstanding, credit_limit_reference, version; transactional credit limit checks |
| pos_shifts | id, branch_id, cashier_user_id, status, opening_float, opened_at, provisional_closed_at, finalized_at, version |
| pos_shift_cash_counts | id, shift_id, counted_minor, expected_synced_minor, expected_local_unsynced_minor, counted_at, entered_by, snapshot_hash |
| treasury_custody_handoffs | id, branch_id, treasury_id, from_user, to_user, occurred_at, counted_amount, evidence, reviewed_by |
| treasury_variances | id, shift_id, expected_minor, counted_minor, difference_minor, custody_reference, review_status, approved_by, reason |
| treasury_variance_corrections | id, variance_id, reverses_correction_id nullable, new_approved_minor, reason, actor_id, created_at; append-only |
| pos_business_days | id, business_id, branch_id, business_date, close_status, provisional_closed_at, finalized_at |
| pos_reconciliation_exceptions | id, tenant_id, branch_id, shift_id, event_id nullable, kind, state, assigned_manager_id, evidence, resolution_id |
| pos_device_loss_incidents | id, device_id, shift_id, last_ack_sequence, estimate_missing, physical_count_reference, incident_reason, status, reviewed_by |
| employee_ledger_entries | id, employee_id, source_event_id, type, signed_amount, posting_date; tip and approved compensation adjustments |
| salon_service_attribution | line_id, executor_user_id, opener_user_id nullable, opener_rate, opener_commission_amount; one opener distinct from executor |
| domain_outbox / audit_events | id, source_event_id, event_type, payload, created_at, published_at; unique event replay key |

## Structural invariants
1. Every financial document carries Tenant/Business/Branch and authorized membership scope; references can't cross scopes.
2. One canonical posted sale per stable client sale identity, with immutable original line price and postings.
3. Posted payments preserve provider confirmation state; pending method cannot settle invoices.
4. Physical cash count includes local cash received while not double counting subsequently synced sales.
5. Accounting and staff ledger corrections are new records with references to originals, not destructive overwrites.
6. Provisional shift and day close statuses distinct from final; late events reconcile by original shift and occurred_at, with posting period adjustment.
7. One executor and max one different opener per service; opener commission = 10% × discounted pre-tax price, refund reversal once.
8. Device loss incidents retain unverified missing amounts; no synthetic invoices without evidence.
9. Branch shared treasury and per-cashier shift maintain separate custody and cash movement records.

## Recommended indexes / partition strategy (not final)
- All queries: tenant_id, business_id, branch_id + date/status as appropriate.
- Offline event uniqueness: (device_id, client_event_id), and sequence check.
- Manager review: (branch_id, ack_state, occurred_at), (assigned_manager_id, state).
- Shift close: (branch_id, status, opened_at); day uniqueness (branch_id, business_date).
- Source-reference uniqueness for reversal/commission, outbox consumer idempotency.
- Avoid one physical database per Business for baseline shared SQL design; actual isolation technique remains to be selected.

## State and data retention
Local device database is separate from central DB and encrypted; server cannot claim to have received lost unsynced events. Store incident and cash reconciliation when a device is lost. Define backup policy, PII retention, audit retention, incident resolution separately.

## Referential transaction sketch
Posting an offline cash sale: validate device/membership and event uniqueness; insert immutable invoice/lines, payment + stock shortfall review as applicable, sale event and outbox atomically; ACK with canonical references. Credit, card and provider-dependent tender rules cannot be implemented from this draft until founder confirms supported paths.

## Open design decisions
Database engine, ORM, RLS, provider payment evidence, journal chart of accounts/tax rules, lost-device approval, closing finality when exceptions permanently unresolved, offline invoice with unpaid tender, authorization cache TTL, credits offline and exact physical payment state machine.
