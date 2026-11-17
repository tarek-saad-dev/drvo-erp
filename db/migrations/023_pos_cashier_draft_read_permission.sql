-- SQL023: deferred EXECUTE permission after SQL022 CREATE PROCEDURE metadata is committed.
-- No schema/data changes, no feature activation, no financial posting.
IF OBJECT_ID(N'core.ReadBranchPosCashierDrafts',N'P') IS NULL
 THROW 51429,'SQL022 Cashier draft scoped read procedure missing',1;
IF OBJECT_ID(N'core.CreateBranchPosCashierDraft',N'P') IS NULL
 THROW 51429,'SQL022 Cashier draft scoped write procedure missing',1;
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 GRANT EXECUTE ON OBJECT::core.ReadBranchPosCashierDrafts TO [drvo_erp_stage_app];
END
