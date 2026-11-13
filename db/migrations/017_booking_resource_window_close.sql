-- S6 Booking: reversible correction by CLOSING a dated availability window.
-- SQL 017 SOURCE+disposable SQL CI only; no VPS migrations/flags without K5F approval.
-- Retain every historical window as a permanent resource opt-in marker.
ALTER TABLE core.BookingResourceWindow ADD
 State VARCHAR(6) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_BookingWindowState DEFAULT('OPEN');
-- Dynamic DDL makes SQL Server compile this CHECK *after* the ADD COLUMN.
EXEC(N'ALTER TABLE core.BookingResourceWindow ADD CONSTRAINT CK_BookingWindowState
 CHECK(State IN(''OPEN'',''CLOSED''))');

CREATE TABLE core.BookingWindowCloseAudit(
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 WindowId UNIQUEIDENTIFIER NOT NULL,
 ClosedByAccountId UNIQUEIDENTIFIER NOT NULL,
 ClosedAtUtc DATETIME2(3) NOT NULL
  CONSTRAINT DF_BookingWindowCloseAudit_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_BookingWindowCloseAudit PRIMARY KEY
  (TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingWindowCloseAudit_Window FOREIGN KEY
  (TenantId,BusinessId,BranchId,WindowId) REFERENCES
  core.BookingResourceWindow(TenantId,BusinessId,BranchId,WindowId)
);
CREATE INDEX IX_BookingWindowCloseAudit_Window ON core.BookingWindowCloseAudit
 (TenantId,BusinessId,BranchId,WindowId,ClosedAtUtc);

-- Show current and closed future windows. UI clearly distinguishes CLOSED.
EXEC(N'ALTER PROCEDURE core.ReadBookingResourceWindows
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''booking.read'';
 SELECT TOP(300) CONVERT(VARCHAR(36),w.WindowId) AS windowId,
  CONVERT(VARCHAR(36),w.ResourceId) AS resourceId,
  w.StartsAtUtc AS startsAtUtc,w.EndsAtUtc AS endsAtUtc,w.State AS state
 FROM core.BookingResourceWindow w
 WHERE w.TenantId=@TenantId AND w.BusinessId=@BusinessId AND w.BranchId=@BranchId
  AND w.EndsAtUtc>SYSUTCDATETIME()
 ORDER BY w.StartsAtUtc,w.WindowId;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

-- Previously CLOSED windows do not block replacement windows.
-- The first-ever-window rule still counts all windows, including CLOSED.
EXEC(N'ALTER PROCEDURE core.CreateBookingResourceWindow
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@ResourceId UNIQUEIDENTIFIER,
 @StartsAtUtc DATETIME2(0),@EndsAtUtc DATETIME2(0)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 IF @ClientRequestId IS NULL OR @ResourceId IS NULL OR
  @StartsAtUtc IS NULL OR @EndsAtUtc IS NULL OR
  @StartsAtUtc<DATEADD(MINUTE,5,SYSUTCDATETIME()) OR
  @EndsAtUtc>DATEADD(DAY,90,SYSUTCDATETIME()) OR
  @EndsAtUtc<=@StartsAtUtc OR DATEDIFF(MINUTE,@StartsAtUtc,@EndsAtUtc) NOT BETWEEN 1 AND 1440
  THROW 51154,''Invalid dated resource availability window'',1;
 -- Same resource row lock and ordering as booking INSERT / status transition.
 IF NOT EXISTS(SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId AND IsActive=1)
  THROW 51154,''Invalid active Booking resource'',1;
 DECLARE @OldWindow UNIQUEIDENTIFIER,@OldResource UNIQUEIDENTIFIER,
   @OldStart DATETIME2(0),@OldEnd DATETIME2(0);
 SELECT @OldWindow=WindowId,@OldResource=ResourceId,
  @OldStart=StartsAtUtc,@OldEnd=EndsAtUtc
 FROM core.BookingResourceWindow WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @OldWindow IS NOT NULL
 BEGIN
  IF @OldResource<>@ResourceId OR @OldStart<>@StartsAtUtc OR @OldEnd<>@EndsAtUtc
   THROW 51152,''Idempotency request changed'',1;
  SELECT CONVERT(VARCHAR(36),@OldWindow) AS id,CAST(0 AS BIT) AS created;
 END
 ELSE
 BEGIN
  -- Nonoverlapping UTC windows are deliberately simple: split working days into
  -- explicit windows. No holiday/recurrence/tz rule inferred from the browser.
  IF EXISTS(SELECT 1 FROM core.BookingResourceWindow WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND StartsAtUtc<@EndsAtUtc AND EndsAtUtc>@StartsAtUtc AND State=''OPEN'')
   THROW 51153,''Resource window overlaps another window'',1;
  -- When publishing the FIRST window, refuse to strand a future booked
  -- appointment outside it. Subsequent windows only ADD covered time.
  IF NOT EXISTS(SELECT 1 FROM core.BookingResourceWindow
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId)
   AND EXISTS(SELECT 1 FROM core.BookingAppointment
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND ResourceId=@ResourceId AND Status=''BOOKED'' AND EndsAtUtc>SYSUTCDATETIME()
     AND (StartsAtUtc<@StartsAtUtc OR EndsAtUtc>@EndsAtUtc))
   THROW 51155,''Existing future booking would fall outside first window'',1;
  DECLARE @WindowId UNIQUEIDENTIFIER=NEWID();
  INSERT core.BookingResourceWindow(TenantId,BusinessId,BranchId,
   ResourceId,WindowId,ClientRequestId,StartsAtUtc,EndsAtUtc,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@ResourceId,@WindowId,
   @ClientRequestId,@StartsAtUtc,@EndsAtUtc,@AccountId);
  SELECT CONVERT(VARCHAR(36),@WindowId) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

-- Must retain "EXISTS any window" opt-in even when all are CLOSED; otherwise
-- a resource would become unconstrained again after its last closure.
EXEC(N'ALTER TRIGGER core.TrgBookingEnforceResourceWindow
 ON core.BookingAppointment
 AFTER INSERT AS BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i
  WHERE EXISTS(SELECT 1 FROM core.BookingResourceWindow w
   WHERE w.TenantId=i.TenantId AND w.BusinessId=i.BusinessId
    AND w.BranchId=i.BranchId AND w.ResourceId=i.ResourceId)
   AND NOT EXISTS(SELECT 1 FROM core.BookingResourceWindow w
    WHERE w.TenantId=i.TenantId AND w.BusinessId=i.BusinessId
     AND w.BranchId=i.BranchId AND w.ResourceId=i.ResourceId
     AND w.StartsAtUtc<=i.StartsAtUtc AND w.EndsAtUtc>=i.EndsAtUtc AND w.State=''OPEN''))
 THROW 51157,''Booking outside resource published availability'',1;
 END');

EXEC(N'CREATE PROCEDURE core.CloseBookingResourceWindow
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@WindowId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 IF @ClientRequestId IS NULL OR @WindowId IS NULL
  THROW 51154,''Invalid resource-window close request'',1;

 -- Resource identity is first used only as a selector; never as authorization.
 -- Acquire the Resource row lock BEFORE any window UPDATE, matching the
 -- existing Booking INSERT/CREATE window lock order.
 DECLARE @ResourceId UNIQUEIDENTIFIER,@WindowState VARCHAR(6),
  @Start DATETIME2(0),@End DATETIME2(0);
 SELECT @ResourceId=ResourceId FROM core.BookingResourceWindow
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND WindowId=@WindowId;
 IF @ResourceId IS NULL THROW 51156,''Window not found'',1;
 IF NOT EXISTS(SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId)
  THROW 51156,''Resource not found'',1;

 DECLARE @PriorWindow UNIQUEIDENTIFIER;
 SELECT @PriorWindow=WindowId FROM core.BookingWindowCloseAudit WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorWindow IS NOT NULL
 BEGIN
  IF @PriorWindow<>@WindowId THROW 51152,''Idempotency request changed'',1;
  SELECT CONVERT(VARCHAR(36),@WindowId) AS id,''CLOSED'' AS state,
   CAST(0 AS BIT) AS changed;
 END
 ELSE
 BEGIN
  SELECT @WindowState=State,@Start=StartsAtUtc,@End=EndsAtUtc
  FROM core.BookingResourceWindow WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId AND WindowId=@WindowId;
  IF @WindowState<>''OPEN'' OR @WindowState IS NULL
   THROW 51155,''Availability window is already closed'',1;
  -- A confirmed appointment that overlaps the window and has not ended
  -- protects the published availability from being withdrawn unexpectedly.
  IF EXISTS(SELECT 1 FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status=''BOOKED''
    AND EndsAtUtc>SYSUTCDATETIME()
    AND StartsAtUtc<@End AND EndsAtUtc>@Start)
   THROW 51155,''Confirmed booking still depends on this window'',1;
  UPDATE core.BookingResourceWindow SET State=''CLOSED''
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId AND WindowId=@WindowId AND State=''OPEN'';
  IF @@ROWCOUNT<>1 THROW 51155,''Availability window changed'',1;
  INSERT core.BookingWindowCloseAudit(
   TenantId,BusinessId,BranchId,ClientRequestId,WindowId,ClosedByAccountId
  ) VALUES(@TenantId,@BusinessId,@BranchId,@ClientRequestId,@WindowId,@AccountId);
  SELECT CONVERT(VARCHAR(36),@WindowId) AS id,''CLOSED'' AS state,
   CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingWindowCloseAudit
  TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CloseBookingResourceWindow
  TO [drvo_erp_stage_app];
END
