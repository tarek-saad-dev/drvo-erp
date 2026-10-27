# Documentation change protocol

1. **Capture:** describe requested change and expected business outcome.
2. **Impact analysis:** identify affected modules, interfaces, tables, security, tests and docs.
3. **Decision:** for material architectural choices, write a new ADR. Never silently erase the old rationale.
4. **Update spec:** edit canonical architecture/module/product docs and links.
5. **Implement:** ship small, tested changes.
6. **Verify:** collect test/CI and deployment evidence; don't claim production success without proof.
7. **Sync status:** update CURRENT-STATE, ROADMAP and CHANGELOG with relevant commit/PR references.

## Status vocabulary

Proposed → Accepted → Planned → In progress → Implemented → Tested → Production verified.

An accepted decision is **not** implemented code. Rejected/superseded ADRs remain accessible for history.

## Definition of done

For implemented features: specification + security/tenant checks + migration (if relevant) + tests + code review + evidence + updated documentation. For production verified: deployment and end-to-end smoke checks.

## Sources

Repository documentation and reviewed commits are canonical. ChatGPT/Cursor conversations are supporting material.
