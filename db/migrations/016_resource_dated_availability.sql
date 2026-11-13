-- S5 Booking resource dated availability. UTC explicit, NO recurring local schedule/DST.
-- Migration 016 is SOURCE / disposable SQL CI ONLY; no VPS migration or K5 activation.
-- Booking owns this scheduling state, not HR/Salon or POS/Finance.
CREATE TABLE core.BookingResourceWindow(
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, ResourceId UNIQUEIDENTIFIER NOT NULL,
 WindowId UNIQUEIDENTIFIER NOT NULL, ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 StartsAtUtc DATETIME2(0) NOT NULL, EndsAtUtc DATETIME2(0) NOT NULL,
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL
  CONSTRAINT DF_BookingWindowCreated DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_BookingResourceWindow PRIMARY KEY(TenantId,BusinessId,BranchId,WindowId),
 CONSTRAINT UQ_BookingWindowRequest UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingWindowResource FOREIGN KEY(TenantId,BusinessId,BranchId,ResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT CK_BookingWindowTime CHECK(EndsAtUtc>StartsAtUtc
  AND DATEDIFF(MINUTE,StartsAtUtc,EndsAtUtc) BETWEEN 1 AND 1440)
);
CREATE INDEX IX_BookingWindowResourceTime ON core.BookingResourceWindow(
 TenantId,BusinessId,BranchId,ResourceId,StartsAtUtc) INCLUDE(EndsAtUtc);

EXEC(N'CREATE PROCEDURE core.ReadBookingResourceWindows
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
  w.StartsAtUtc AS startsAtUtc,w.EndsAtUtc AS endsAtUtc
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

EXEC(N'CREATE PROCEDURE core.CreateBookingResourceWindow
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
    AND ResourceId=@ResourceId AND StartsAtUtc<@EndsAtUtc AND EndsAtUtc>@StartsAtUtc)
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

-- A trigger preserves the immutable SQL013 stored-procedure definition while
-- enforcing the new optional opt-in policy on every real Booking insert.
-- Old resources remain unrestricted until their first window is published.
-- Owner context ensures private table read works for the restricted app principal.
EXEC(N'CREATE TRIGGER core.TrgBookingEnforceResourceWindow
 ON core.BookingAppointment WITH EXECUTE AS OWNER
 AFTER INSERT AS BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i
  WHERE EXISTS(SELECT 1 FROM core.BookingResourceWindow w
   WHERE w.TenantId=i.TenantId AND w.BusinessId=i.BusinessId
    AND w.BranchId=i.BranchId AND w.ResourceId=i.ResourceId)
   AND NOT EXISTS(SELECT 1 FROM core.BookingResourceWindow w
    WHERE w.TenantId=i.TenantId AND w.BusinessId=i.BusinessId
     AND w.BranchId=i.BranchId AND w.ResourceId=i.ResourceId
     AND w.StartsAtUtc<=i.StartsAtUtc AND w.EndsAtUtc>=i.EndsAtUtc))
 THROW 51157,''Booking outside resource published availability'',1;
 END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingResourceWindow TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadBookingResourceWindows TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateBookingResourceWindow TO [drvo_erp_stage_app];
END
