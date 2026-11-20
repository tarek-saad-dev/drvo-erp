-- SQL027: Inventory branch on-hand + nonposting purchase/opening receives + adjustments.
-- Cashier pin 046bf19: branch inventory list, stock policy, purchaseInventory receive.
-- Quantities are QtyMilli (1000 = 1 unit). No sale decrement, transfers, AP, Treasury or GL (ADR-031).
-- Primary/VPS apply only after backup + 001â€“026 verification.
CREATE TABLE core.InventoryStockPolicy (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 AllowNegativeStock BIT NOT NULL CONSTRAINT DF_InvPolicy_Neg DEFAULT(1),
 Notes NVARCHAR(240) NOT NULL CONSTRAINT DF_InvPolicy_Notes DEFAULT(N''),
 UpdatedByAccountId UNIQUEIDENTIFIER NULL,
 UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_InvPolicy_Updated DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_InventoryStockPolicy PRIMARY KEY(TenantId,BusinessId),
 CONSTRAINT FK_InventoryStockPolicy_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT FK_InventoryStockPolicy_Actor FOREIGN KEY(TenantId,UpdatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_InventoryStockPolicy_Notes CHECK(LEN(Notes)<=240)
);

CREATE TABLE core.BranchStockBalance (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
 QtyMilli BIGINT NOT NULL CONSTRAINT DF_BranchStock_Qty DEFAULT(0),
 ReorderLevelMilli BIGINT NULL,
 LastMovementAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_BranchStockBalance PRIMARY KEY(TenantId,BusinessId,BranchId,OfferingId),
 CONSTRAINT FK_BranchStock_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_BranchStock_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_BranchStock_Qty CHECK(QtyMilli BETWEEN -9000000000000 AND 9000000000000),
 CONSTRAINT CK_BranchStock_Reorder CHECK(ReorderLevelMilli IS NULL
  OR ReorderLevelMilli BETWEEN 0 AND 9000000000000)
);
CREATE INDEX IX_BranchStock_Low
 ON core.BranchStockBalance(TenantId,BusinessId,BranchId,QtyMilli)
 INCLUDE(OfferingId,ReorderLevelMilli);

CREATE TABLE core.StockReceiveDocument (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ReceiveId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 SourceType VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 SupplierNote NVARCHAR(160) NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_StockReceive_Status DEFAULT('APPLIED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_StockReceive_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_StockReceiveDocument PRIMARY KEY(TenantId,BusinessId,BranchId,ReceiveId),
 CONSTRAINT UQ_StockReceive_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_StockReceive_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_StockReceive_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_StockReceive_CancelActor FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_StockReceive_Source CHECK(SourceType IN('OPENING','PURCHASE')),
 CONSTRAINT CK_StockReceive_Status CHECK(Status IN('APPLIED','CANCELLED')),
 CONSTRAINT CK_StockReceive_Note CHECK(LEN(SupplierNote)<=160),
 CONSTRAINT CK_StockReceive_Cancel CHECK(
  (Status='APPLIED' AND CancelRequestId IS NULL AND CancelledByAccountId IS NULL
   AND CancelledAtUtc IS NULL)
  OR (Status='CANCELLED' AND CancelRequestId IS NOT NULL AND CancelledByAccountId IS NOT NULL
   AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_StockReceive_Cancel
 ON core.StockReceiveDocument(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_StockReceive_Recent
 ON core.StockReceiveDocument(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,ReceiveId DESC);

CREATE TABLE core.StockReceiveLine (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ReceiveId UNIQUEIDENTIFIER NOT NULL,
 [LineNo] INT NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
 QtyMilli BIGINT NOT NULL,UnitCostMinor BIGINT NOT NULL,
 CONSTRAINT PK_StockReceiveLine PRIMARY KEY(TenantId,BusinessId,BranchId,ReceiveId,[LineNo]),
 CONSTRAINT FK_StockReceiveLine_Doc FOREIGN KEY(TenantId,BusinessId,BranchId,ReceiveId)
  REFERENCES core.StockReceiveDocument(TenantId,BusinessId,BranchId,ReceiveId),
 CONSTRAINT FK_StockReceiveLine_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_StockReceiveLine_No CHECK([LineNo] BETWEEN 1 AND 50),
 CONSTRAINT CK_StockReceiveLine_Qty CHECK(QtyMilli BETWEEN 1 AND 9000000000000),
 CONSTRAINT CK_StockReceiveLine_Cost CHECK(UnitCostMinor BETWEEN 0 AND 9000000000000)
);

CREATE TABLE core.StockAdjustDocument (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,AdjustId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
 DeltaMilli BIGINT NOT NULL,Reason NVARCHAR(240) NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_StockAdjust_Status DEFAULT('APPLIED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_StockAdjust_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_StockAdjustDocument PRIMARY KEY(TenantId,BusinessId,BranchId,AdjustId),
 CONSTRAINT UQ_StockAdjust_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_StockAdjust_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_StockAdjust_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT FK_StockAdjust_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_StockAdjust_CancelActor FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_StockAdjust_Delta CHECK(DeltaMilli<>0
  AND DeltaMilli BETWEEN -9000000000000 AND 9000000000000),
 CONSTRAINT CK_StockAdjust_Reason CHECK(LEN(LTRIM(RTRIM(Reason))) BETWEEN 1 AND 240),
 CONSTRAINT CK_StockAdjust_Status CHECK(Status IN('APPLIED','CANCELLED')),
 CONSTRAINT CK_StockAdjust_Cancel CHECK(
  (Status='APPLIED' AND CancelRequestId IS NULL AND CancelledByAccountId IS NULL
   AND CancelledAtUtc IS NULL)
  OR (Status='CANCELLED' AND CancelRequestId IS NOT NULL AND CancelledByAccountId IS NOT NULL
   AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_StockAdjust_Cancel
 ON core.StockAdjustDocument(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_StockAdjust_Recent
 ON core.StockAdjustDocument(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,AdjustId DESC);

EXEC(N'CREATE PROCEDURE core.AssertInventoryBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''inventory.read'',''inventory.manage'',''purchasing.manage'')
  OR NOT EXISTS (
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId AND bm.AccountId=a.AccountId
   AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId AND b.BusinessId=bm.BusinessId AND b.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=b.TenantId AND ba.BusinessId=b.BusinessId
   AND ba.AccountId=a.AccountId AND ba.IsActive=1
  JOIN core.Branch br ON br.TenantId=ba.TenantId AND br.BusinessId=ba.BusinessId
   AND br.BranchId=ba.BranchId AND br.IsActive=1
  JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId AND ar.BusinessId=ba.BusinessId
   AND ar.BranchId=ba.BranchId AND ar.AccountId=a.AccountId AND ar.IsActive=1
  JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId AND ro.BusinessId=ar.BusinessId
   AND ro.RoleId=ar.RoleId AND ro.IsActive=1
  JOIN core.RolePermission p ON p.TenantId=ro.TenantId AND p.BusinessId=ro.BusinessId
   AND p.RoleId=ro.RoleId AND p.ActionCode=@Action
  WHERE s.TenantId=@TenantId AND s.AccountId=@AccountId
   AND s.TokenHash=@TokenHash AND s.SessionVersion=@SessionVersion
   AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
   AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId
 ) THROW 51471,''Inventory access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.EnsureInventoryStockPolicy
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM core.InventoryStockPolicy WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId)
  INSERT core.InventoryStockPolicy(TenantId,BusinessId) VALUES(@TenantId,@BusinessId);
END');

EXEC(N'CREATE PROCEDURE core.ApplyBranchStockDelta
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @OfferingId UNIQUEIDENTIFIER,@DeltaMilli BIGINT
AS BEGIN
 SET NOCOUNT ON;
 DECLARE @AllowNeg BIT,@Qty BIGINT;
 EXEC core.EnsureInventoryStockPolicy @TenantId,@BusinessId;
 SELECT @AllowNeg=AllowNegativeStock FROM core.InventoryStockPolicy
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId;
 IF NOT EXISTS(SELECT 1 FROM core.CatalogOffering
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND OfferingId=@OfferingId
   AND Kind=''PRODUCT'' AND IsActive=1)
  THROW 51474,''Inventory product unavailable'',1;
 SELECT @Qty=QtyMilli FROM core.BranchStockBalance WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND OfferingId=@OfferingId;
 IF @Qty IS NULL BEGIN
  IF @DeltaMilli<0 AND @AllowNeg=0 THROW 51475,''Negative stock blocked'',1;
  INSERT core.BranchStockBalance(TenantId,BusinessId,BranchId,OfferingId,QtyMilli,LastMovementAtUtc)
   VALUES(@TenantId,@BusinessId,@BranchId,@OfferingId,@DeltaMilli,SYSUTCDATETIME());
 END ELSE BEGIN
  IF (@Qty+@DeltaMilli)<0 AND @AllowNeg=0 THROW 51475,''Negative stock blocked'',1;
  UPDATE core.BranchStockBalance SET QtyMilli=QtyMilli+@DeltaMilli,
   LastMovementAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND OfferingId=@OfferingId;
 END
END');

EXEC(N'CREATE PROCEDURE core.ReadInventoryWorkspace
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.read'';
 EXEC core.EnsureInventoryStockPolicy @TenantId,@BusinessId;
 SELECT AllowNegativeStock AS allowNegativeStock,Notes AS notes,
  UpdatedAtUtc AS updatedAtUtc
 FROM core.InventoryStockPolicy
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId;
 SELECT TOP(200)
  CONVERT(VARCHAR(36),o.OfferingId) AS offeringId,o.DisplayName AS displayName,
  CONVERT(VARCHAR(36),o.CategoryId) AS categoryId,c.DisplayName AS categoryName,
  o.PriceMinor AS priceMinor,o.Currency AS currency,o.IsActive AS isActive,
  CAST(ISNULL(b.QtyMilli,0) AS BIGINT) AS qtyMilli,
  b.ReorderLevelMilli AS reorderLevelMilli,
  b.LastMovementAtUtc AS lastMovementAtUtc,
  CASE
   WHEN ISNULL(b.QtyMilli,0)<=0 THEN ''OUT''
   WHEN b.ReorderLevelMilli IS NOT NULL AND ISNULL(b.QtyMilli,0)<=b.ReorderLevelMilli THEN ''LOW''
   ELSE ''OK'' END AS stockStatus
 FROM core.CatalogOffering o
 LEFT JOIN core.CatalogCategory c ON c.TenantId=o.TenantId AND c.BusinessId=o.BusinessId
  AND c.CategoryId=o.CategoryId
 LEFT JOIN core.BranchStockBalance b ON b.TenantId=o.TenantId AND b.BusinessId=o.BusinessId
  AND b.BranchId=@BranchId AND b.OfferingId=o.OfferingId
 WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId AND o.Kind=''PRODUCT''
 ORDER BY o.DisplayName,o.OfferingId;
 SELECT TOP(50)
  CONVERT(VARCHAR(36),r.ReceiveId) AS receiveId,r.SourceType AS sourceType,
  r.SupplierNote AS supplierNote,r.Status AS status,r.CreatedAtUtc AS createdAtUtc,
  (SELECT COUNT(*) FROM core.StockReceiveLine l
    WHERE l.TenantId=r.TenantId AND l.BusinessId=r.BusinessId
     AND l.BranchId=r.BranchId AND l.ReceiveId=r.ReceiveId) AS lineCount
 FROM core.StockReceiveDocument r
 WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId AND r.BranchId=@BranchId
 ORDER BY r.CreatedAtUtc DESC,r.ReceiveId DESC;
 SELECT TOP(50)
  CONVERT(VARCHAR(36),a.AdjustId) AS adjustId,
  CONVERT(VARCHAR(36),a.OfferingId) AS offeringId,o.DisplayName AS offeringName,
  a.DeltaMilli AS deltaMilli,a.Reason AS reason,a.Status AS status,
  a.CreatedAtUtc AS createdAtUtc
 FROM core.StockAdjustDocument a
 JOIN core.CatalogOffering o ON o.TenantId=a.TenantId AND o.BusinessId=a.BusinessId
  AND o.OfferingId=a.OfferingId
 WHERE a.TenantId=@TenantId AND a.BusinessId=@BusinessId AND a.BranchId=@BranchId
 ORDER BY a.CreatedAtUtc DESC,a.AdjustId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.UpsertInventoryStockPolicy
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@AllowNegativeStock BIT,@Notes NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @ClientRequestId IS NULL OR @AllowNegativeStock IS NULL OR @Notes IS NULL OR LEN(@Notes)>240
  THROW 51472,''Invalid inventory policy'',1;
 EXEC core.EnsureInventoryStockPolicy @TenantId,@BusinessId;
 UPDATE core.InventoryStockPolicy
  SET AllowNegativeStock=@AllowNegativeStock,Notes=@Notes,
   UpdatedByAccountId=@AccountId,UpdatedAtUtc=SYSUTCDATETIME()
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId;
 SELECT CAST(1 AS BIT) AS updated,@AllowNegativeStock AS allowNegativeStock;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateStockReceive
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@SourceType VARCHAR(16),@SupplierNote NVARCHAR(160),
 @LinesJson NVARCHAR(MAX)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.manage'';
 IF @ClientRequestId IS NULL OR @SourceType NOT IN(''OPENING'',''PURCHASE'')
  OR @SupplierNote IS NULL OR LEN(@SupplierNote)>160
  OR @LinesJson IS NULL OR ISJSON(@LinesJson)<>1
  THROW 51472,''Invalid stock receive'',1;
 DECLARE @Prior UNIQUEIDENTIFIER,@PriorSource VARCHAR(16),@PriorNote NVARCHAR(160);
 SELECT @Prior=ReceiveId,@PriorSource=SourceType,@PriorNote=SupplierNote
  FROM core.StockReceiveDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ClientRequestId=@ClientRequestId;
 IF @Prior IS NOT NULL BEGIN
  IF @PriorSource<>@SourceType OR @PriorNote<>@SupplierNote
   THROW 51473,''Stock receive replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Prior) AS id,CAST(0 AS BIT) AS created;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;RETURN;
 END
 DECLARE @Lines TABLE([LineNo] INT NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
  QtyMilli BIGINT NOT NULL,UnitCostMinor BIGINT NOT NULL PRIMARY KEY([LineNo]));
 INSERT @Lines([LineNo],OfferingId,QtyMilli,UnitCostMinor)
 SELECT CAST(j.[LineNo] AS INT),TRY_CONVERT(UNIQUEIDENTIFIER,j.OfferingId),
  CAST(j.QtyMilli AS BIGINT),CAST(j.UnitCostMinor AS BIGINT)
 FROM OPENJSON(@LinesJson) WITH(
  [LineNo] INT ''$.lineNo'',OfferingId NVARCHAR(36) ''$.offeringId'',
  QtyMilli BIGINT ''$.qtyMilli'',UnitCostMinor BIGINT ''$.unitCostMinor'') j;
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR (SELECT COUNT(*) FROM @Lines)>50
  THROW 51472,''Invalid stock receive lines'',1;
 IF EXISTS(SELECT 1 FROM @Lines WHERE [LineNo] NOT BETWEEN 1 AND 50
  OR OfferingId IS NULL OR QtyMilli NOT BETWEEN 1 AND 9000000000000
  OR UnitCostMinor NOT BETWEEN 0 AND 9000000000000)
  THROW 51472,''Invalid stock receive line values'',1;
 IF (SELECT COUNT(DISTINCT [LineNo]) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  OR (SELECT COUNT(DISTINCT OfferingId) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  THROW 51472,''Duplicate stock receive lines'',1;
 IF EXISTS(SELECT 1 FROM @Lines l WHERE NOT EXISTS(
  SELECT 1 FROM core.CatalogOffering o WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId
   AND o.OfferingId=l.OfferingId AND o.Kind=''PRODUCT'' AND o.IsActive=1))
  THROW 51474,''Inventory product unavailable'',1;
 DECLARE @Id UNIQUEIDENTIFIER=NEWID();
 INSERT core.StockReceiveDocument(TenantId,BusinessId,BranchId,ReceiveId,ClientRequestId,
  SourceType,SupplierNote,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@SourceType,@SupplierNote,@AccountId);
 INSERT core.StockReceiveLine(TenantId,BusinessId,BranchId,ReceiveId,[LineNo],OfferingId,
  QtyMilli,UnitCostMinor)
 SELECT @TenantId,@BusinessId,@BranchId,@Id,[LineNo],OfferingId,QtyMilli,UnitCostMinor FROM @Lines;
 DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT;
 DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT OfferingId,QtyMilli FROM @Lines ORDER BY [LineNo];
 OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
 WHILE @@FETCH_STATUS=0 BEGIN
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@Qty;
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

EXEC(N'CREATE PROCEDURE core.CancelStockReceive
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ReceiveId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.manage'';
 IF @ReceiveId IS NULL OR @ClientRequestId IS NULL THROW 51472,''Invalid stock receive cancel'',1;
 DECLARE @Status VARCHAR(10),@Prior UNIQUEIDENTIFIER;
 SELECT @Status=Status,@Prior=CancelRequestId FROM core.StockReceiveDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ReceiveId=@ReceiveId;
 IF @Status IS NULL THROW 51474,''Stock receive not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @Prior<>@ClientRequestId THROW 51473,''Stock receive already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@ReceiveId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT;
  DECLARE c CURSOR LOCAL FAST_FORWARD FOR
   SELECT OfferingId,QtyMilli FROM core.StockReceiveLine
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND ReceiveId=@ReceiveId ORDER BY [LineNo];
  OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
  WHILE @@FETCH_STATUS=0 BEGIN
   EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,-@Qty;
   FETCH NEXT FROM c INTO @Off,@Qty;
  END
  CLOSE c;DEALLOCATE c;
  UPDATE core.StockReceiveDocument SET Status=''CANCELLED'',CancelRequestId=@ClientRequestId,
   CancelledByAccountId=@AccountId,CancelledAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ReceiveId=@ReceiveId AND Status=''APPLIED'';
  SELECT CONVERT(VARCHAR(36),@ReceiveId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateStockAdjust
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@OfferingId UNIQUEIDENTIFIER,
 @DeltaMilli BIGINT,@Reason NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @ClientRequestId IS NULL OR @OfferingId IS NULL OR @DeltaMilli IS NULL OR @DeltaMilli=0
  OR @DeltaMilli NOT BETWEEN -9000000000000 AND 9000000000000
  OR @Reason IS NULL OR LEN(LTRIM(RTRIM(@Reason))) NOT BETWEEN 1 AND 240
  THROW 51472,''Invalid stock adjust'',1;
 SET @Reason=LTRIM(RTRIM(@Reason));
 DECLARE @Prior UNIQUEIDENTIFIER,@PriorOff UNIQUEIDENTIFIER,@PriorDelta BIGINT,@PriorReason NVARCHAR(240);
 SELECT @Prior=AdjustId,@PriorOff=OfferingId,@PriorDelta=DeltaMilli,@PriorReason=Reason
  FROM core.StockAdjustDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ClientRequestId=@ClientRequestId;
 IF @Prior IS NOT NULL BEGIN
  IF @PriorOff<>@OfferingId OR @PriorDelta<>@DeltaMilli OR @PriorReason<>@Reason
   THROW 51473,''Stock adjust replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Prior) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@OfferingId,@DeltaMilli;
  DECLARE @Id UNIQUEIDENTIFIER=NEWID();
  INSERT core.StockAdjustDocument(TenantId,BusinessId,BranchId,AdjustId,ClientRequestId,
   OfferingId,DeltaMilli,Reason,CreatedByAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@OfferingId,@DeltaMilli,
    @Reason,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelStockAdjust
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @AdjustId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertInventoryBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''inventory.manage'';
 IF @AdjustId IS NULL OR @ClientRequestId IS NULL THROW 51472,''Invalid stock adjust cancel'',1;
 DECLARE @Status VARCHAR(10),@Prior UNIQUEIDENTIFIER,@Off UNIQUEIDENTIFIER,@Delta BIGINT;
 SELECT @Status=Status,@Prior=CancelRequestId,@Off=OfferingId,@Delta=DeltaMilli
  FROM core.StockAdjustDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND AdjustId=@AdjustId;
 IF @Status IS NULL THROW 51474,''Stock adjust not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @Prior<>@ClientRequestId THROW 51473,''Stock adjust already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@AdjustId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,-@Delta;
  UPDATE core.StockAdjustDocument SET Status=''CANCELLED'',CancelRequestId=@ClientRequestId,
   CancelledByAccountId=@AccountId,CancelledAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND AdjustId=@AdjustId AND Status=''APPLIED'';
  SELECT CONVERT(VARCHAR(36),@AdjustId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.InventoryStockPolicy TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BranchStockBalance TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.StockReceiveDocument TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.StockReceiveLine TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.StockAdjustDocument TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadInventoryWorkspace TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.UpsertInventoryStockPolicy TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateStockReceive TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelStockReceive TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateStockAdjust TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelStockAdjust TO [drvo_erp_stage_app];
END
