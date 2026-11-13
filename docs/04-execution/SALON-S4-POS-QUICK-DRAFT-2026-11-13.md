# S4B — Faster private POS DRAFT UX (review-only)

**Scope:** Reuse existing Shared POS/Catalog APIs; no new SQL, backend endpoint, accounting or paid flags. Existing immutable saved DRAFTs stay intact.

## Architecture impact before change

The POS private UI exposes a quick-add set (first 8 **authorized** active Catalog items) to assemble a temporary cart without extra select clicks. Saved DRAFT rows get a **Prepare new cart** action; it copies only OfferingId + Quantity after checking the currently authorized active Catalog references and limits, resets preview and Idempotency-Key and explicitly warns about changed list prices. It does **not** mutate the saved draft, copy stale snapshot pricing as authority, auto-save, invoice, collect, post, cancel a booking or import Cashier data.

The actual save always goes through existing POS-owned DRAFT SQL procedure `core.CreateBranchPosDraft`, where Catalog prices are re-evaluated. The client cannot set price/Tax. `DRVO_POS_DRAFTS_WEB_ENABLED` plus independent POS draft read permission remains required even to see saved rows and save controls. Future editable draft Version CAS and sale POSTED still separate, under ADR-031 and ADR-032.

## Validation

Next build/typecheck, K5C no-auth 404 and new quick-cart nonposting regression test. NO VPS SQL or feature flags. Real Customer/Branch session remains a separate K5F/ADR-032 approval.
