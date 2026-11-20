-- SQL037: Purchasing Core — Business-shared suppliers + nonposting purchase receives with AP preview.
-- Cashier pin 046bf19: purchases route + purchaseInventory receive (stock only; no paid AP/GL).
-- Extends SQL027 BranchStockBalance via ApplyBranchStockDelta; does NOT duplicate StockReceiveDocument.
-- AP totals are informational preview only (NOT_PAID / NOT_POSTED). ADR-031 payment/GL remain gated.
-- Primary/VPS apply only after backup + 001-036 verification.
CREATE TABLE core.Supplier (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 SupplierId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DisplayName NVARCHAR(120) NOT NULL,PhoneNote NVARCHAR(40) NOT NULL
  CONSTRAINT DF_Supplier_Phone DEFAULT(N''),
 Notes NVARCHAR(240) NOT NULL CONSTRAINT DF_Supplier_Notes DEFAULT(N''),
 IsActive BIT NOT NULL CONSTRAINT DF_Supplier_Active DEFAULT(1),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Supplier_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_Supplier PRIMARY KEY(TenantId,BusinessId,SupplierId),
 CONSTRAINT UQ_Supplier_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT UQ_Supplier_Name UNIQUE(TenantId,BusinessId,DisplayName),
 CONSTRAINT FK_Supplier_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT FK_Supplier_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_Supplier_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 120),
 CONSTRAINT CK_Supplier_Phone CHECK(LEN(PhoneNote)<=40),
 CONSTRAINT CK_Supplier_Notes CHECK(LEN(Notes)<=240)
);
CREATE INDEX IX_Supplier_Active
 ON core.Supplier(TenantId,BusinessId,IsActive,DisplayName,SupplierId);

CREATE TABLE core.PurchaseReceiveDocument (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ReceiveId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 SupplierId UNIQUEIDENTIFIER NULL,
 SupplierNote NVARCHAR(160) NOT NULL,
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_PurchaseReceive_Status DEFAULT('APPLIED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PurchaseReceive_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_PurchaseReceiveDocument PRIMARY KEY(TenantId,BusinessId,BranchId,ReceiveId),
 CONSTRAINT UQ_PurchaseReceive_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_PurchaseReceive_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_PurchaseReceive_Supplier FOREIGN KEY(TenantId,BusinessId,SupplierId)
  REFERENCES core.Supplier(TenantId,BusinessId,SupplierId),
 CONSTRAINT FK_PurchaseReceive_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_PurchaseReceive_CancelActor FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_PurchaseReceive_Currency CHECK(Currency IN('EGP','SAR','AED','USD')),
 CONSTRAINT CK_PurchaseReceive_Status CHECK(Status IN('APPLIED','CANCELLED')),
 CONSTRAINT CK_PurchaseReceive_Note CHECK(LEN(SupplierNote)<=160),
 CONSTRAINT CK_PurchaseReceive_Cancel CHECK(
  (Status='APPLIED' AND CancelRequestId IS NULL AND CancelledByAccountId IS NULL
   AND CancelledAtUtc IS NULL)
  OR (Status='CANCELLED' AND CancelRequestId IS NOT NULL AND CancelledByAccountId IS NOT NULL
   AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_PurchaseReceive_Cancel
 ON core.PurchaseReceiveDocument(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_PurchaseReceive_Recent
 ON core.PurchaseReceiveDocument(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,ReceiveId DESC);

CREATE TABLE core.PurchaseReceiveLine (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ReceiveId UNIQUEIDENTIFIER NOT NULL,
 [LineNo] INT NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
 QtyMilli BIGINT NOT NULL,UnitCostMinor BIGINT NOT NULL,LineExtMinor BIGINT NOT NULL,
 CONSTRAINT PK_PurchaseReceiveLine PRIMARY KEY(TenantId,BusinessId,BranchId,ReceiveId,[LineNo]),
 CONSTRAINT FK_PurchaseReceiveLine_Doc FOREIGN KEY(TenantId,BusinessId,BranchId,ReceiveId)
  REFERENCES core.PurchaseReceiveDocument(TenantId,BusinessId,BranchId,ReceiveId),
 CONSTRAINT FK_PurchaseReceiveLine_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_PurchaseReceiveLine_No CHECK([LineNo] BETWEEN 1 AND 50),
 CONSTRAINT CK_PurchaseReceiveLine_Qty CHECK(QtyMilli BETWEEN 1 AND 9000000000000),
 CONSTRAINT CK_PurchaseReceiveLine_Cost CHECK(UnitCostMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_PurchaseReceiveLine_Ext CHECK(LineExtMinor BETWEEN 0 AND 9000000000000)
);

EXEC(N'CREATE PROCEDURE core.AssertPurchasingBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''purchasing.read'',''purchasing.manage'')
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
 ) THROW 51511,''Purchasing access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadPurchasingWorkspace
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPurchasingBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),SupplierId) AS supplierId,DisplayName AS displayName,
  PhoneNote AS phoneNote,Notes AS notes,IsActive AS isActive
 FROM core.Supplier
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId
 ORDER BY DisplayName,SupplierId;
 SELECT TOP(200)
  CONVERT(VARCHAR(36),o.OfferingId) AS offeringId,o.DisplayName AS displayName,
  o.IsActive AS isActive,CAST(ISNULL(b.QtyMilli,0) AS BIGINT) AS qtyMilli
 FROM core.CatalogOffering o
 LEFT JOIN core.BranchStockBalance b ON b.TenantId=o.TenantId AND b.BusinessId=o.BusinessId
  AND b.BranchId=@BranchId AND b.OfferingId=o.OfferingId
 WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId AND o.Kind=''PRODUCT''
 ORDER BY o.DisplayName,o.OfferingId;
 SELECT TOP(50)
  CONVERT(VARCHAR(36),r.ReceiveId) AS receiveId,
  CONVERT(VARCHAR(36),r.SupplierId) AS supplierId,
  s.DisplayName AS supplierName,r.SupplierNote AS supplierNote,
  r.Currency AS currency,r.Status AS status,r.CreatedAtUtc AS createdAtUtc,
  (SELECT COUNT(*) FROM core.PurchaseReceiveLine l
    WHERE l.TenantId=r.TenantId AND l.BusinessId=r.BusinessId
     AND l.BranchId=r.BranchId AND l.ReceiveId=r.ReceiveId) AS lineCount,
  CAST((SELECT ISNULL(SUM(l.LineExtMinor),0) FROM core.PurchaseReceiveLine l
    WHERE l.TenantId=r.TenantId AND l.BusinessId=r.BusinessId
     AND l.BranchId=r.BranchId AND l.ReceiveId=r.ReceiveId) AS BIGINT) AS apTotalMinor
 FROM core.PurchaseReceiveDocument r
 LEFT JOIN core.Supplier s ON s.TenantId=r.TenantId AND s.BusinessId=r.BusinessId
  AND s.SupplierId=r.SupplierId
 WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId AND r.BranchId=@BranchId
 ORDER BY r.CreatedAtUtc DESC,r.ReceiveId DESC;
 SELECT
  CAST(ISNULL(SUM(CASE WHEN r.Status=''APPLIED'' THEN l.LineExtMinor ELSE 0 END),0) AS BIGINT)
   AS openApMinor,
  CAST(ISNULL(SUM(l.LineExtMinor),0) AS BIGINT) AS lifetimeApMinor,
  COUNT(DISTINCT CASE WHEN r.Status=''APPLIED'' THEN r.ReceiveId END) AS openReceiveCount
 FROM core.PurchaseReceiveDocument r
 JOIN core.PurchaseReceiveLine l ON l.TenantId=r.TenantId AND l.BusinessId=r.BusinessId
  AND l.BranchId=r.BranchId AND l.ReceiveId=r.ReceiveId
 WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId AND r.BranchId=@BranchId;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateSupplier
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DisplayName NVARCHAR(120),
 @PhoneNote NVARCHAR(40),@Notes NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPurchasingBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.manage'';
 IF @ClientRequestId IS NULL OR @DisplayName IS NULL OR @PhoneNote IS NULL OR @Notes IS NULL
  OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 120
  OR @DisplayName<>LTRIM(RTRIM(@DisplayName))
  OR LEN(@PhoneNote)>40 OR LEN(@Notes)>240
  THROW 51512,''Invalid supplier'',1;
 SET @DisplayName=LTRIM(RTRIM(@DisplayName));
 DECLARE @Prior UNIQUEIDENTIFIER,@PriorName NVARCHAR(120),@PriorPhone NVARCHAR(40),
  @PriorNotes NVARCHAR(240);
 SELECT @Prior=SupplierId,@PriorName=DisplayName,@PriorPhone=PhoneNote,@PriorNotes=Notes
  FROM core.Supplier WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND ClientRequestId=@ClientRequestId;
 IF @Prior IS NOT NULL BEGIN
  IF @PriorName<>@DisplayName OR @PriorPhone<>@PhoneNote OR @PriorNotes<>@Notes
   THROW 51513,''Supplier replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Prior) AS id,CAST(0 AS BIT) AS created;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;RETURN;
 END
 IF EXISTS(SELECT 1 FROM core.Supplier WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND DisplayName=@DisplayName)
  THROW 51513,''Supplier name exists'',1;
 DECLARE @Id UNIQUEIDENTIFIER=NEWID();
 INSERT core.Supplier(TenantId,BusinessId,SupplierId,ClientRequestId,DisplayName,PhoneNote,
  Notes,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@Id,@ClientRequestId,@DisplayName,@PhoneNote,@Notes,@AccountId);
 SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreatePurchaseReceive
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@SupplierId UNIQUEIDENTIFIER,
 @SupplierNote NVARCHAR(160),@Currency CHAR(3),@LinesJson NVARCHAR(MAX)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPurchasingBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.manage'';
 IF @ClientRequestId IS NULL OR @SupplierNote IS NULL OR LEN(@SupplierNote)>160
  OR @Currency IS NULL OR @Currency NOT IN(''EGP'',''SAR'',''AED'',''USD'')
  OR @LinesJson IS NULL OR ISJSON(@LinesJson)<>1
  THROW 51512,''Invalid purchase receive'',1;
 IF @SupplierId IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM core.Supplier WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND SupplierId=@SupplierId AND IsActive=1)
  THROW 51514,''Supplier unavailable'',1;
 DECLARE @Prior UNIQUEIDENTIFIER,@PriorSupplier UNIQUEIDENTIFIER,@PriorNote NVARCHAR(160),
  @PriorCurrency CHAR(3);
 SELECT @Prior=ReceiveId,@PriorSupplier=SupplierId,@PriorNote=SupplierNote,
  @PriorCurrency=Currency
  FROM core.PurchaseReceiveDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ClientRequestId=@ClientRequestId;
 IF @Prior IS NOT NULL BEGIN
  IF ISNULL(@PriorSupplier,''00000000-0000-0000-0000-000000000000'')
    <>ISNULL(@SupplierId,''00000000-0000-0000-0000-000000000000'')
   OR @PriorNote<>@SupplierNote OR @PriorCurrency<>@Currency
   THROW 51513,''Purchase receive replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Prior) AS id,CAST(0 AS BIT) AS created,
   CAST((SELECT ISNULL(SUM(LineExtMinor),0) FROM core.PurchaseReceiveLine
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND ReceiveId=@Prior) AS BIGINT) AS apTotalMinor;
  COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;RETURN;
 END
 DECLARE @Lines TABLE([LineNo] INT NOT NULL,OfferingId UNIQUEIDENTIFIER NOT NULL,
  QtyMilli BIGINT NOT NULL,UnitCostMinor BIGINT NOT NULL,LineExtMinor BIGINT NOT NULL
  PRIMARY KEY([LineNo]));
 INSERT @Lines([LineNo],OfferingId,QtyMilli,UnitCostMinor,LineExtMinor)
 SELECT CAST(j.[LineNo] AS INT),TRY_CONVERT(UNIQUEIDENTIFIER,j.OfferingId),
  CAST(j.QtyMilli AS BIGINT),CAST(j.UnitCostMinor AS BIGINT),
  CAST((CAST(j.QtyMilli AS BIGINT)*CAST(j.UnitCostMinor AS BIGINT))/1000 AS BIGINT)
 FROM OPENJSON(@LinesJson) WITH(
  [LineNo] INT ''$.lineNo'',OfferingId NVARCHAR(36) ''$.offeringId'',
  QtyMilli BIGINT ''$.qtyMilli'',UnitCostMinor BIGINT ''$.unitCostMinor'') j;
 IF NOT EXISTS(SELECT 1 FROM @Lines) OR (SELECT COUNT(*) FROM @Lines)>50
  THROW 51512,''Invalid purchase receive lines'',1;
 IF EXISTS(SELECT 1 FROM @Lines WHERE [LineNo] NOT BETWEEN 1 AND 50
  OR OfferingId IS NULL OR QtyMilli NOT BETWEEN 1 AND 9000000000000
  OR UnitCostMinor NOT BETWEEN 0 AND 9000000000000
  OR LineExtMinor NOT BETWEEN 0 AND 9000000000000)
  THROW 51512,''Invalid purchase receive line values'',1;
 IF (SELECT COUNT(DISTINCT [LineNo]) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  OR (SELECT COUNT(DISTINCT OfferingId) FROM @Lines)<>(SELECT COUNT(*) FROM @Lines)
  THROW 51512,''Duplicate purchase receive lines'',1;
 IF EXISTS(SELECT 1 FROM @Lines l WHERE NOT EXISTS(
  SELECT 1 FROM core.CatalogOffering o WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId
   AND o.OfferingId=l.OfferingId AND o.Kind=''PRODUCT'' AND o.IsActive=1))
  THROW 51514,''Purchasing product unavailable'',1;
 DECLARE @Id UNIQUEIDENTIFIER=NEWID();
 INSERT core.PurchaseReceiveDocument(TenantId,BusinessId,BranchId,ReceiveId,ClientRequestId,
  SupplierId,SupplierNote,Currency,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@SupplierId,@SupplierNote,
   @Currency,@AccountId);
 INSERT core.PurchaseReceiveLine(TenantId,BusinessId,BranchId,ReceiveId,[LineNo],OfferingId,
  QtyMilli,UnitCostMinor,LineExtMinor)
 SELECT @TenantId,@BusinessId,@BranchId,@Id,[LineNo],OfferingId,QtyMilli,UnitCostMinor,
  LineExtMinor FROM @Lines;
 DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT;
 DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT OfferingId,QtyMilli FROM @Lines ORDER BY [LineNo];
 OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
 WHILE @@FETCH_STATUS=0 BEGIN
  EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@Qty;
  FETCH NEXT FROM c INTO @Off,@Qty;
 END
 CLOSE c;DEALLOCATE c;
 SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,
  CAST((SELECT ISNULL(SUM(LineExtMinor),0) FROM @Lines) AS BIGINT) AS apTotalMinor;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelPurchaseReceive
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ReceiveId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPurchasingBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''purchasing.manage'';
 IF @ReceiveId IS NULL OR @ClientRequestId IS NULL THROW 51512,''Invalid purchase receive cancel'',1;
 DECLARE @Status VARCHAR(10),@Prior UNIQUEIDENTIFIER;
 SELECT @Status=Status,@Prior=CancelRequestId FROM core.PurchaseReceiveDocument WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ReceiveId=@ReceiveId;
 IF @Status IS NULL THROW 51514,''Purchase receive not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @Prior<>@ClientRequestId THROW 51513,''Purchase receive already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@ReceiveId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  DECLARE @Off UNIQUEIDENTIFIER,@Qty BIGINT,@ReverseQty BIGINT;
  DECLARE c CURSOR LOCAL FAST_FORWARD FOR
   SELECT OfferingId,QtyMilli FROM core.PurchaseReceiveLine
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND ReceiveId=@ReceiveId ORDER BY [LineNo];
  OPEN c;FETCH NEXT FROM c INTO @Off,@Qty;
  WHILE @@FETCH_STATUS=0 BEGIN
   SET @ReverseQty=-@Qty;
   EXEC core.ApplyBranchStockDelta @TenantId,@BusinessId,@BranchId,@Off,@ReverseQty;
   FETCH NEXT FROM c INTO @Off,@Qty;
  END
  CLOSE c;DEALLOCATE c;
  UPDATE core.PurchaseReceiveDocument SET Status=''CANCELLED'',CancelRequestId=@ClientRequestId,
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

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.Supplier TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.PurchaseReceiveDocument TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.PurchaseReceiveLine TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadPurchasingWorkspace TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateSupplier TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreatePurchaseReceive TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelPurchaseReceive TO [drvo_erp_stage_app];
END
