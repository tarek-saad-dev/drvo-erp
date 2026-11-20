-- SQL039. Atomic Cashier-style operational shift handoff (NONPOSTING custody).
-- Cashier source: _cashier_source/operations/handoffShiftSession.ts (pin 046bf19 / blob 55b380f4).
-- Closes the actor's current OPEN shift (any branch in tenant) and opens on target BranchId
-- inside one SERIALIZABLE transaction. At most one OPEN shift per Account (UX from SQL029).
-- Asserts operations.shift.manage on the TARGET branch only (Cashier validates target access).
-- Refuses when target BusinessDay is not OPEN. No BusinessClock timezone table (UTC interim).
-- NO Treasury movement, cash settlement, or ADR-031 GL/journal writes.
-- MERGE AFTER: Package PR must land real 038_pos_draft_package_line_snapshots.sql first
-- (K4 migrator requires consecutive numbers; never ship a stub 038).
-- Primary/VPS apply only after backup + 001-038 verification.
EXEC(N'CREATE OR ALTER PROCEDURE core.HandoffOperationalShift
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DayId UNIQUEIDENTIFIER,
 @ExpectedSourceShiftId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.shift.manage'';
 IF @ClientRequestId IS NULL OR @DayId IS NULL
  THROW 51492,''Invalid shift handoff'',1;

 DECLARE @PriorId UNIQUEIDENTIFIER,@PriorDay UNIQUEIDENTIFIER,@PriorStatus VARCHAR(10);
 SELECT @PriorId=ShiftId,@PriorDay=DayId,@PriorStatus=Status
 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorId IS NOT NULL BEGIN
  IF @PriorDay<>@DayId OR @PriorStatus<>''OPEN''
   THROW 51493,''Shift handoff request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@PriorId) AS id,CAST(0 AS BIT) AS created,
   CONVERT(VARCHAR(36),@PriorDay) AS dayId,''OPEN'' AS status,
   CONVERT(VARCHAR(36),@BranchId) AS branchId,
   CAST(NULL AS VARCHAR(36)) AS closedShiftId,
   CAST(NULL AS VARCHAR(36)) AS closedBranchId,
   ''IDEMPOTENT_REPLAY'' AS outcome;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  RETURN;
 END

 DECLARE @DayStatus VARCHAR(10);
 SELECT @DayStatus=Status FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND DayId=@DayId;
 IF @DayStatus IS NULL THROW 51494,''Business day not found'',1;
 IF @DayStatus<>''OPEN'' THROW 51495,''Shift handoff requires an OPEN business day'',1;

 DECLARE @OpenShiftId UNIQUEIDENTIFIER,@OpenBranchId UNIQUEIDENTIFIER,
  @OpenBusinessId UNIQUEIDENTIFIER,@OpenDayId UNIQUEIDENTIFIER,@OpenStatus VARCHAR(10);
 SELECT @OpenShiftId=ShiftId,@OpenBranchId=BranchId,@OpenBusinessId=BusinessId,
  @OpenDayId=DayId,@OpenStatus=Status
 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND ActorAccountId=@AccountId AND Status=''OPEN'';

 IF @ExpectedSourceShiftId IS NOT NULL BEGIN
  IF @OpenShiftId IS NULL OR @OpenShiftId<>@ExpectedSourceShiftId
   THROW 51493,''Stale or missing source shift for handoff'',1;
 END

 IF @OpenShiftId IS NOT NULL
  AND @OpenBusinessId=@BusinessId AND @OpenBranchId=@BranchId AND @OpenDayId=@DayId BEGIN
  SELECT CONVERT(VARCHAR(36),@OpenShiftId) AS id,CAST(0 AS BIT) AS created,
   CONVERT(VARCHAR(36),@OpenDayId) AS dayId,''OPEN'' AS status,
   CONVERT(VARCHAR(36),@OpenBranchId) AS branchId,
   CAST(NULL AS VARCHAR(36)) AS closedShiftId,
   CAST(NULL AS VARCHAR(36)) AS closedBranchId,
   ''ALREADY_OPEN_HERE'' AS outcome;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  RETURN;
 END

 DECLARE @ClosedShiftId UNIQUEIDENTIFIER=NULL,@ClosedBranchId UNIQUEIDENTIFIER=NULL;
 IF @OpenShiftId IS NOT NULL BEGIN
  IF @OpenBusinessId=@BusinessId AND @OpenBranchId=@BranchId
   THROW 51495,''Open shift on target branch is on a different day'',1;
  UPDATE core.OperationalShift
   SET Status=''CLOSED'',ClosedAtUtc=SYSUTCDATETIME(),
    ClosedByAccountId=@AccountId,CloseRequestId=@ClientRequestId
  WHERE TenantId=@TenantId AND BusinessId=@OpenBusinessId AND BranchId=@OpenBranchId
   AND ShiftId=@OpenShiftId AND Status=''OPEN'';
  IF @@ROWCOUNT<>1 THROW 51493,''Concurrent shift handoff conflict'',1;
  SET @ClosedShiftId=@OpenShiftId;SET @ClosedBranchId=@OpenBranchId;
 END ELSE IF @ExpectedSourceShiftId IS NOT NULL
  THROW 51493,''Stale or missing source shift for handoff'',1;

 IF EXISTS(
  SELECT 1 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND ActorAccountId=@AccountId AND Status=''OPEN'')
  THROW 51495,''Account already has an OPEN shift'',1;

 DECLARE @Id UNIQUEIDENTIFIER=NEWID();
 INSERT core.OperationalShift(
  TenantId,BusinessId,BranchId,ShiftId,ClientRequestId,DayId,ActorAccountId)
 VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@DayId,@AccountId);

 SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,
  CONVERT(VARCHAR(36),@DayId) AS dayId,''OPEN'' AS status,
  CONVERT(VARCHAR(36),@BranchId) AS branchId,
  CONVERT(VARCHAR(36),@ClosedShiftId) AS closedShiftId,
  CONVERT(VARCHAR(36),@ClosedBranchId) AS closedBranchId,
  CASE WHEN @ClosedShiftId IS NULL THEN ''FIRST_OPEN_HERE'' ELSE ''HANDED_OFF'' END AS outcome;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BusinessDay TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.OperationalShift TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.HandoffOperationalShift TO [drvo_erp_stage_app];
END
