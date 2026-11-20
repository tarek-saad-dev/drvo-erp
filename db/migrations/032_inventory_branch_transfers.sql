-- SQL032: SLOT RESERVED for Inventory branch-to-branch transfers (INV-03).
-- Real body is owned by feat/cashier-inv-transfer-20261120
-- (032_inventory_branch_transfers.sql). This placeholder keeps migration numbering
-- consecutive so BK-06 (033) and CU-04 (034) can land without fighting inventory.
-- No inventory tables or procedures are invented here. Replace with the inventory
-- transfer migration content when that PR merges (take inventory version on conflict).
-- No-op marker so the forward-only engine has a non-empty script body.
DECLARE @DrvoSql032InventorySlotReserved BIT = 1;
