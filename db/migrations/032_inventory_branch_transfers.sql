-- SQL032: Inventory branch-to-branch stock transfers (INV-03), NONPOSTING.
-- Cashier pin 046bf19: transferInventory.service.ts / api/inventory/transfers/route.ts.
-- Reuses core.BranchStockBalance + core.ApplyBranchStockDelta from SQL027. Quantities are QtyMilli.
-- DRVO adaptation: a transfer is one atomic APPLIED document (source -qty, destination +qty in one
-- SERIALIZABLE transaction); CANCEL applies the reverse deltas. No IN_TRANSIT/receive hop yet.
-- Source stock is always enforced (Cashier allowNegativeOverride=false), independent of the policy.
-- No GL, COGS, AP, Treasury or sale decrement (ADR-031). Runtime login gets EXECUTE only.
-- Primary/VPS apply only after backup + 001-031 verification.
CREATE TABLE core.StockTransferDocument (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 TransferId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 FromBranchId UNIQUEIDENTIFIER NOT NULL,ToBranchId UNIQUEIDENTIFIER NOT NULL,
 TransferNote NVARCHAR(160) NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_StockTransfer_Status DEFAULT('APPLIED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_StockTransfer_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_StockTransferDocument PRIMARY KEY(TenantId,BusinessId,TransferId),
 CONSTRAINT UQ_StockTransfer_Request UNIQUE(TenantId,BusinessId,FromBranchId,ClientRequestId),
 CONSTRAINT FK_StockTransfer_From FOREIGN KEY(TenantId,BusinessId,FromBranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_StockTransfer_To FOREIGN KEY(TenantId,BusinessId,ToBranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_StockTransfer_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_StockTransfer_CancelActor FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_StockTransfer_Branches CHECK(FromBranchId<>ToBranchId),
 CONSTRAINT CK_StockTransfer_Note CHECK(LEN(TransferNote)<=160),
 CONSTRAINT CK_StockTransfer_Status CHECK(Status IN('APPLIED','CANCELLED')),
 CONSTRAINT CK_StockTransfer_Cancel CHECK(
  (Status='APPLIED' AND CancelRequestId IS NULL AND CancelledByAccountId IS NULL
   AND CancelledAtUtc IS NULL)
  OR (Status='CANCELLED' AND CancelRequestId IS NOT NULL AND CancelledByAccountId IS NOT NULL
   AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_StockTransfer_Cancel
 ON core.StockTransferDocument(TenantId,BusinessId,FromBranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_StockTransfer_FromRecent
 ON core.StockTransferDocument(TenantId,BusinessId,FromBranchId,CreatedAtUtc DESC,TransferId DESC);
CREATE INDEX IX_StockTransfer_ToRecent
 ON core.StockTransferDocument(TenantId,BusinessId,ToBranchId,CreatedAtUtc DESC,TransferId DESC);

CREATE TABLE core.StockTransferLine (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 TransferId UNIQUEIDENTIFIER NOT NULL,[LineNo] INT NOT NULL,
 OfferingId UNIQUEIDENTIFIER NOT NULL,QtyMilli BIGINT NOT NULL,
 CONSTRAINT PK_StockTransferLine PRIMARY KEY(TenantId,BusinessId,TransferId,[LineNo]),
 CONSTRAINT FK_StockTransferLine_Doc FOREIGN KEY(TenantId,BusinessId,TransferId)
  REFERENCES core.StockTransferDocument(TenantId,BusinessId,TransferId),
 CONSTRAINT FK_StockTransferLine_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_StockTransferLine_No CHECK([LineNo] BETWEEN 1 AND 50),
 CONSTRAINT CK_StockTransferLine_Qty CHECK(QtyMilli BETWEEN 1 AND 9000000000000)
);

EXEC(N'CREATE PROCEDURE core.ReadStockTransfers
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.read'';
 SELECT TOP(50)
  CONVERT(VARCHAR(36),t.TransferId) AS transferId,
  CONVERT(VARCHAR(36),t.FromBranchId) AS fromBranchId,fb.DisplayName AS fromBranchName,
  CONVERT(VARCHAR(36),t.ToBranchId) AS toBranchId,tb.DisplayName AS toBranchName,
  CASE WHEN t.FromBranchId=@BranchId THEN ''OUT'' ELSE ''IN'' END AS direction,
  t.TransferNote AS transferNote,t.Status AS status,t.CreatedAtUtc AS createdAtUtc,
  t.CancelledAtUtc AS cancelledAtUtc,
  (SELECT COUNT(*) FROM core.StockTransferLine l
    WHERE l.TenantId=t.TenantId AND l.BusinessId=t.BusinessId
     AND l.TransferId=t.TransferId) AS lineCount
 FROM core.StockTransferDocument t
 JOIN core.Branch fb ON fb.TenantId=t.TenantId AND fb.BusinessId=t.BusinessId
  AND fb.BranchId=t.FromBranchId
 JOIN core.Branch tb ON tb.TenantId=t.TenantId AND tb.BusinessId=t.BusinessId
  AND tb.BranchId=t.ToBranchId
 WHERE t.TenantId=@TenantId AND t.BusinessId=@BusinessId
  AND (t.FromBranchId=@BranchId OR t.ToBranchId=@BranchId)
 ORDER BY t.CreatedAtUtc DESC,t.TransferId DESC;
 SELECT CONVERT(VARCHAR(36),l.TransferId) AS transferId,l.[LineNo] AS [lineNo],
  CONVERT(VARCHAR(36),l.OfferingId) AS offeringId,o.DisplayName AS offeringName,
  l.QtyMilli AS qtyMilli
 FROM core.StockTransferLine l
 JOIN core.CatalogOffering o ON o.TenantId=l.TenantId AND o.BusinessId=l.BusinessId
  AND o.OfferingId=l.OfferingId
 WHERE l.TenantId=@TenantId AND l.BusinessId=@BusinessId AND l.TransferId IN (
  SELECT TOP(50) t.TransferId FROM core.StockTransferDocument t
   WHERE t.TenantId=@TenantId AND t.BusinessId=@BusinessId
    AND (t.FromBranchId=@BranchId OR t.ToBranchId=@BranchId)
   ORDER BY t.CreatedAtUtc DESC,t.TransferId DESC)
 ORDER BY l.TransferId,l.[LineNo];
 SELECT CONVERT(VARCHAR(36),br.BranchId) AS branchId,br.DisplayName AS displayName
 FROM core.Branch br
 WHERE br.TenantId=@TenantId AND br.BusinessId=@BusinessId AND br.IsActive=1
  AND br.BranchId<>@BranchId
  AND EXISTS(SELECT 1 FROM core.BranchAssignment ba
   JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId AND ar.BusinessId=ba.BusinessId
    AND ar.BranchId=ba.BranchId AND ar.AccountId=ba.AccountId AND ar.IsActive=1
   JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId AND ro.BusinessId=ar.BusinessId
    AND ro.RoleId=ar.RoleId AND ro.IsActive=1
   JOIN core.RolePermission p ON p.TenantId=ro.TenantId AND p.BusinessId=ro.BusinessId
    AND p.RoleId=ro.RoleId AND p.ActionCode=''inventory.manage''
   WHERE ba.TenantId=br.TenantId AND ba.BusinessId=br.BusinessId AND ba.BranchId=br.BranchId
    AND ba.AccountId=@AccountId AND ba.IsActive=1)
 ORDER BY br.DisplayName,br.BranchId;
 SELECT TOP(200)
  CONVERT(VARCHAR(36),o.OfferingId) AS offeringId,o.DisplayName AS displayName,
  CAST(ISNULL(b.QtyMilli,0) AS BIGINT) AS qtyMilli
 FROM core.CatalogOffering o
 LEFT JOIN core.BranchStockBalance b ON b.TenantId=o.TenantId AND b.BusinessId=o.BusinessId
  AND b.BranchId=@BranchId AND b.OfferingId=o.OfferingId
 WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId AND o.Kind=''PRODUCT'' AND o.IsActive=1
 ORDER BY o.DisplayName,o.OfferingId;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateStockTransfer
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@ToBranchId UNIQUEIDENTIFIER,
 @TransferNote NVARCHAR(160),@LinesJson NVARCHAR(MAX)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @ClientRequestId IS NULL OR @ToBranchId IS NULL OR @ToBranchId=@BranchId
  OR @TransferNote IS NULL OR LEN(@TransferNote)>160
  OR @LinesJson IS NULL OR ISJSON(@LinesJson)<>1
  THROW 51472,''Invalid stock transfer'',1;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@ToBranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 DECLARE @LockRes NVARCHAR(255)=N''drvo.inv.transfer.''+CONVERT(NVARCHAR(36),@TenantId)
  +N''.''+CONVERT(NVARCHAR(36),@BusinessId),@LockRc INT;
 EXEC @LockRc=sys.sp_getapplock @Resource=@LockRes,@LockMode=''Exclusive'',
  @LockOwner=''Transaction'',@LockTimeout=10000;
 IF @LockRc<0 THROW 51473,''Stock transfer busy'',1;
 DECLARE @Lines TABLE([LineNo] INT NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
  QtyMilli BIGINT NOT NULL PRIMARY KEY([LineNo]));
 INSERT @Lines([LineNo],OfferingId,QtyMilli)
 SELECT CAST(j.[LineNo] AS INT),TRY_CONVERT(UNIQUEIDENTIFIER,j.OfferingId),
  CAST(j.QtyMilli AS BIGINT)
 FROM OPENJSON(@LinesJson) WITH(
  [LineNo] INT ''$.lineNo'',OfferingId NVARCHAR(36) ''$.offeringId'',
  QtyMilli BIGINT ''$.qtyMilli'') j;
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR (SELECT COUNT(*) FROM @Lines)>50
  THROW 51472,''Invalid stock transfer lines'',1;
 IF EXISTS(SELECT 1 FROM @Lines WHERE [LineNo] NOT BETWEEN 1 AND 50
  OR OfferingId IS NULL OR QtyMilli NOT BETWEEN 1 AND 9000000000000)
  THROW 51472,''Invalid stock transfer line values'',1;
 IF (SELECT COUNT(DISTINCT [LineNo]) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  OR (SELECT COUNT(DISTINCT OfferingId) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  THROW 51472,''Duplicate stock transfer lines'',1;
 DECLARE @Prior UNIQUEIDENTIFIER,@PriorTo UNIQUEIDENTIFIER,@PriorNote NVARCHAR(160);
 SELECT @Prior=TransferId,@PriorTo=ToBranchId,@PriorNote=TransferNote
  FROM core.StockTransferDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND FromBranchId=@BranchId
   AND ClientRequestId=@ClientRequestId;
 IF @Prior IS NOT NULL BEGIN
  IF @PriorTo<>@ToBranchId OR @PriorNote<>@TransferNote
   OR (SELECT COUNT(*) FROM @Lines)<>(SELECT COUNT(*) FROM core.StockTransferLine pl
    WHERE pl.TenantId=@TenantId AND pl.BusinessId=@BusinessId AND pl.TransferId=@Prior)
   OR EXISTS(SELECT 1 FROM @Lines n WHERE NOT EXISTS(
    SELECT 1 FROM core.StockTransferLine o WHERE o.TenantId=@TenantId
     AND o.BusinessId=@BusinessId AND o.TransferId=@Prior
     AND o.OfferingId=n.OfferingId AND o.QtyMilli=n.QtyMilli))
   THROW 51473,''Stock transfer replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Prior) AS id,CAST(0 AS BIT) AS created;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;RETURN;
 END
 IF EXISTS(SELECT 1 FROM @Lines l WHERE NOT EXISTS(
  SELECT 1 FROM core.CatalogOffering o WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId
   AND o.OfferingId=l.OfferingId AND o.Kind=''PRODUCT'' AND o.IsActive=1))
  THROW 51474,''Inventory product unavailable'',1;
 IF EXISTS(SELECT 1 FROM @Lines l WHERE ISNULL((SELECT b.QtyMilli
  FROM core.BranchStockBalance b WITH(UPDLOCK,HOLDLOCK)
  WHERE b.TenantId=@TenantId AND b.BusinessId=@BusinessId AND b.BranchId=@BranchId
   AND b.OfferingId=l.OfferingId),0)<l.QtyMilli)
  THROW 51475,''Insufficient source stock'',1;
 DECLARE @Id UNIQUEIDENTIFIER=NEWID();
 INSERT core.StockTransferDocument(TenantId,BusinessId,TransferId,ClientRequestId,
  FromBranchId,ToBranchId,TransferNote,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@Id,@ClientRequestId,@BranchId,@ToBranchId,
   @TransferNote,@AccountId);
 INSERT core.StockTransferLine(TenantId,BusinessId,TransferId,[LineNo],OfferingId,QtyMilli)
 SELECT @TenantId,@BusinessId,@Id,[LineNo],OfferingId,QtyMilli FROM @Lines;
 DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT,@OutDelta BIGINT,@InDelta BIGINT;
 DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT OfferingId,QtyMilli FROM @Lines ORDER BY [LineNo];
 OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
 WHILE @@FETCH_STATUS=0 BEGIN
  SET @OutDelta=-@Qty;
  SET @InDelta=@Qty;
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@OutDelta;
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@ToBranchId,@Off,@InDelta;
  FETCH NEXT FROM c INTO @Off,@Qty;
 END
 CLOSE c;DEALLOCATE c;
 SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelStockTransfer
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @TransferId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @TransferId IS NULL OR @ClientRequestId IS NULL
  THROW 51472,''Invalid stock transfer cancel'',1;
 DECLARE @LockRes NVARCHAR(255)=N''drvo.inv.transfer.''+CONVERT(NVARCHAR(36),@TenantId)
  +N''.''+CONVERT(NVARCHAR(36),@BusinessId),@LockRc INT;
 EXEC @LockRc=sys.sp_getapplock @Resource=@LockRes,@LockMode=''Exclusive'',
  @LockOwner=''Transaction'',@LockTimeout=10000;
 IF @LockRc<0 THROW 51473,''Stock transfer busy'',1;
 DECLARE @Status VARCHAR(10),@Prior UNIQUEIDENTIFIER,@ToBranchId UNIQUEIDENTIFIER;
 SELECT @Status=Status,@Prior=CancelRequestId,@ToBranchId=ToBranchId
  FROM core.StockTransferDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND FromBranchId=@BranchId
   AND TransferId=@TransferId;
 IF @Status IS NULL THROW 51474,''Stock transfer not found'',1;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@ToBranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @Status=''CANCELLED'' BEGIN
  IF @Prior<>@ClientRequestId THROW 51473,''Stock transfer already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@TransferId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  IF EXISTS(SELECT 1 FROM core.StockTransferLine l
   WHERE l.TenantId=@TenantId AND l.BusinessId=@BusinessId AND l.TransferId=@TransferId
    AND ISNULL((SELECT b.QtyMilli FROM core.BranchStockBalance b WITH(UPDLOCK,HOLDLOCK)
     WHERE b.TenantId=@TenantId AND b.BusinessId=@BusinessId AND b.BranchId=@ToBranchId
      AND b.OfferingId=l.OfferingId),0)<l.QtyMilli)
   THROW 51475,''Destination stock already consumed'',1;
  DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT,@DestDelta BIGINT,@SourceDelta BIGINT;
  DECLARE c CURSOR LOCAL FAST_FORWARD FOR
   SELECT OfferingId,QtyMilli FROM core.StockTransferLine
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND TransferId=@TransferId
    ORDER BY [LineNo];
  OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @DestDelta=-@Qty;
   SET @SourceDelta=@Qty;
   EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@ToBranchId,@Off,@DestDelta;
   EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@SourceDelta;
   FETCH NEXT FROM c INTO @Off,@Qty;
  END
  CLOSE c;DEALLOCATE c;
  UPDATE core.StockTransferDocument SET Status=''CANCELLED'',CancelRequestId=@ClientRequestId,
   CancelledByAccountId=@AccountId,CancelledAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND FromBranchId=@BranchId
    AND TransferId=@TransferId AND Status=''APPLIED'';
  SELECT CONVERT(VARCHAR(36),@TransferId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.StockTransferDocument TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.StockTransferLine TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadStockTransfers TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateStockTransfer TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelStockTransfer TO [drvo_erp_stage_app];
END
