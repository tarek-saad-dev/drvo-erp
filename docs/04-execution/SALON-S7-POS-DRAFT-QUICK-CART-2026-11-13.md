# Salon S7-B — searchable quick-add + inline DRAFT quantities

**Review-only private UI.** The existing scoped POS Preview/DRAFT screen now filters the already authorized Catalog items in the browser for quicker service/product selection, without introducing a new search endpoint. A cart line has accessible +/- controls constrained to integers 1–20. The existing 20-unique-line limit remains.

Every quantity edit clears the previously server-calculated checkout preview and the pending save idempotency key, so a changed cart cannot deliberately reuse stale priced output or replay a different immutable DRAFT request. While preview or save operations are pending, editing controls are disabled; server-owned repricing and DRAFT-only POST stay unchanged. The original saved DRAFT is immutable and a "prepare new" action remains separate.

**Architecture:** pure client UX of the independently permissioned Shared POS+Catalog owner (K5/ADR-030 scoped responses). No Salon POS fork, no write to Booking, SQL schema, real invoice, tax, payment, POSTED GL, accounting/treasury or Cashier import. Public demo and Auth default OFF unchanged. ADR-031 and ADR-032 remain PROPOSED; SQL 010–017 VPS blocked and K5F/offhost restore open.

**Tests:** extended existing apps/web/test/pos-draft-quick-cart.test.cjs run by K5C Private UI Route Gates, plus Next build/typecheck, HTTP 404 negatives and K0/K1 required PR checks. Code/CI is not operational deployment or real customer activation.
