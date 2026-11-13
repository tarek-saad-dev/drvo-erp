# Salon S9-A — private scoped Booking Customer finder

**Architecture impact:** Private Shared Booking UX only. The existing independent `GET /customers` response supplies a maximum last/first 200 already authorized Customer rows; a pure client filter helps locate names (Arabic diacritics/alif forms) and international phone E164 digits, including Arabic-Indic numerals. The client does **not** query an unscoped Customer table or create a global directory, does not expose any new API, and does not let a guessed CustomerId gain authorization. A search term is never sent to the server or stored in URLs/cookies.

On changing search text the selected customer and the pending Booking idempotency key are cleared to avoid creating a booking for a stale selection. Only the normal selected active Customer from the independently granted response can be submitted. Full Booking POST still requires valid GUID, scoped K5, exact Origin and SQL-owning checks for Business/Branch/Resource and conflict.

A visible notice says results may be incomplete because the authorized Customer list is capped at 200. No Server search, pagination or cross-Branch list is asserted. The link to Customers goes through that independent gated Module; creating Customers still requires separate authority. K5C private Next build/typecheck and negative private 404 checks, pure normalized search tests, K0/K1 and existing SQL API CI are required.

**No SQL, schema, migration, Auth, entitlement, POS settlement or financial posting changes.** VPS SQL 010–017, K5F/offsite independent restore, ADR-032 and ADR-031 remain held.
