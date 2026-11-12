-- PL-1b: first durable, nonposting POS DRAFT, source + CI only.
-- NO APPLY ON VPS; K5F checker expects 001-009, and ADR-031/032 remain open.
-- Independent pos.draft.read/manage; scoped SQL procedures only; no POSTED transition.
CREATE TABLE core.PosDraft (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, DraftId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL, PayloadHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL, Version INT NOT NULL CONSTRAINT DF_PosDraft_Version DEFAULT(1),
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL CONSTRAINT DF_PosDraft_Status DEFAULT('DRAFT'),
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 SubtotalMinor BIGINT NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_PosDraft_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_PosDraft PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId),
 CONSTRAINT UQ_PosDraft_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_PosDraft_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_PosDraft_Creator FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_PosDraft_Version CHECK(Version=1),
 CONSTRAINT CK_PosDraft_Status CHECK(Status='DRAFT'),
 CONSTRAINT CK_PosDraft_Subtotal CHECK(SubtotalMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_PosDraft_Currency CHECK(Currency IN('EGP','SAR','AED','USD'))
);
CREATE TABLE core.PosDraftLine (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, DraftId UNIQUEIDENTIFIER NOT NULL,
 LineNo INT NOT NULL, OfferingId UNIQUEIDENTIFIER NOT NULL,
 Kind VARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL,
 OfferingNameSnapshot NVARCHAR(160) NOT NULL,
 Quantity INT NOT NULL, UnitPriceMinor BIGINT NOT NULL, LineSubtotalMinor BIGINT NOT NULL,
 CONSTRAINT PK_PosDraftLine PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId,LineNo),
 CONSTRAINT FK_PosDraftLine_Draft FOREIGN KEY(TenantId,BusinessId,BranchId,DraftId)
  REFERENCES core.PosDraft(TenantId,BusinessId,BranchId,DraftId),
 CONSTRAINT FK_PosDraftLine_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_PosDraftLine_No CHECK(LineNo BETWEEN 1 AND 20),
 CONSTRAINT CK_PosDraftLine_Quantity CHECK(Quantity BETWEEN 1 AND 20),
 CONSTRAINT CK_PosDraftLine_Money CHECK(UnitPriceMinor BETWEEN 0 AND 9000000000000
  AND LineSubtotalMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_PosDraftLine_Kind CHECK(Kind IN('SERVICE','PRODUCT')),
 CONSTRAINT CK_PosDraftLine_Name CHECK(LEN(LTRIM(RTRIM(OfferingNameSnapshot))) BETWEEN 1 AND 160)
);
CREATE INDEX IX_PosDraft_Branch_Created
 ON core.PosDraft(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,DraftId);

EXEC(N'CREATE PROCEDURE core.AssertPosDraftBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''pos.draft.read'',''pos.draft.manage'') OR NOT EXISTS(
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
   AND bm.AccountId=a.AccountId AND bm.IsActive=1
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
   AND a.SessionVersion=@SessionVersion AND b.BusinessId=@BusinessId
   AND br.BranchId=@BranchId
 ) THROW 51401,''POS draft access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadBranchPosDrafts
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertPosDraftBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''pos.draft.read'';
 DECLARE @Page TABLE(DraftId UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @Page SELECT TOP(50) DraftId FROM core.PosDraft
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  ORDER BY CreatedAtUtc DESC,DraftId;
 SELECT CONVERT(VARCHAR(36),d.DraftId) AS draftId,d.Version AS version,
  d.Status AS status,d.Currency AS currency,d.SubtotalMinor AS subtotalMinor,
  d.CreatedAtUtc AS createdAtUtc
 FROM core.PosDraft d JOIN @Page p ON p.DraftId=d.DraftId
 WHERE d.TenantId=@TenantId AND d.BusinessId=@BusinessId AND d.BranchId=@BranchId
 ORDER BY d.CreatedAtUtc DESC,d.DraftId;
 SELECT CONVERT(VARCHAR(36),l.DraftId) AS draftId,l.LineNo AS lineNo,
  CONVERT(VARCHAR(36),l.OfferingId) AS offeringId,l.Kind AS kind,
  l.OfferingNameSnapshot AS displayName,l.Quantity AS quantity,
  l.UnitPriceMinor AS unitPriceMinor,l.LineSubtotalMinor AS lineSubtotalMinor
 FROM core.PosDraftLine l JOIN @Page p ON p.DraftId=l.DraftId
 WHERE l.TenantId=@TenantId AND l.BusinessId=@BusinessId AND l.BranchId=@BranchId
 ORDER BY l.DraftId,l.LineNo;
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateBranchPosDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@PayloadHash CHAR(64),@LinesJson NVARCHAR(MAX)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertPosDraftBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''pos.draft.manage'';
 EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''catalog.read'';
 IF @ClientRequestId IS NULL OR @PayloadHash IS NULL
  OR LEN(@PayloadHash)<>64
  OR @PayloadHash LIKE ''%[^0-9a-f]%'' COLLATE Latin1_General_100_BIN2
  THROW 51413,''Invalid request identity'',1;
 DECLARE @OldId UNIQUEIDENTIFIER,@OldHash CHAR(64),@OldAccount UNIQUEIDENTIFIER;
 SELECT @OldId=DraftId,@OldHash=PayloadHash,@OldAccount=CreatedByAccountId
 FROM core.PosDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @OldId IS NOT NULL
 BEGIN
  IF @OldHash<>@PayloadHash OR @OldAccount<>@AccountId
   THROW 51412,''Idempotency payload differs'',1;
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created,
   CAST(1 AS INT) AS version;
 END
 ELSE
 BEGIN
  IF @LinesJson IS NULL OR LEN(@LinesJson)>4000 OR ISJSON(@LinesJson)<>1
   OR LEFT(LTRIM(@LinesJson),1)<>''['' THROW 51413,''Invalid line array'',1;
  DECLARE @Parsed TABLE(LineNo INT PRIMARY KEY,OfferingId UNIQUEIDENTIFIER NULL,Quantity INT NULL);
  INSERT @Parsed(LineNo,OfferingId,Quantity)
   SELECT TRY_CONVERT(INT,j.[key])+1,
    TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(j.value,''$.offeringId'')),
    TRY_CONVERT(INT,JSON_VALUE(j.value,''$.quantity''))
   FROM OPENJSON(@LinesJson) j;
  DECLARE @Count INT=(SELECT COUNT(*) FROM @Parsed);
  IF @Count NOT BETWEEN 1 AND 20 OR EXISTS(
   SELECT 1 FROM @Parsed WHERE OfferingId IS NULL OR Quantity NOT BETWEEN 1 AND 20
  ) OR EXISTS(SELECT OfferingId FROM @Parsed GROUP BY OfferingId HAVING COUNT(*)>1)
   THROW 51413,''Invalid line set'',1;
  DECLARE @Priced TABLE(
   LineNo INT PRIMARY KEY,OfferingId UNIQUEIDENTIFIER NOT NULL,
   Kind VARCHAR(7) NOT NULL,DisplayName NVARCHAR(160) NOT NULL,
   Currency CHAR(3) NOT NULL,Quantity INT NOT NULL,
   UnitPriceMinor BIGINT NOT NULL,LineSubtotal DECIMAL(38,0) NOT NULL
  );
  INSERT @Priced(LineNo,OfferingId,Kind,DisplayName,Currency,Quantity,UnitPriceMinor,LineSubtotal)
   SELECT p.LineNo,o.OfferingId,o.Kind,o.DisplayName,o.Currency,p.Quantity,o.PriceMinor,
    CONVERT(DECIMAL(38,0),o.PriceMinor)*CONVERT(DECIMAL(38,0),p.Quantity)
   FROM @Parsed p JOIN core.CatalogOffering o WITH(HOLDLOCK)
    ON o.TenantId=@TenantId AND o.BusinessId=@BusinessId
    AND o.OfferingId=p.OfferingId AND o.IsActive=1
   WHERE o.Currency IN(''EGP'',''SAR'',''AED'',''USD'')
    AND o.PriceMinor BETWEEN 0 AND 9000000000000;
  IF (SELECT COUNT(*) FROM @Priced)<>@Count OR
   (SELECT COUNT(DISTINCT Currency) FROM @Priced)<>1
   THROW 51413,''Invalid or foreign Catalog offering'',1;
  DECLARE @Total DECIMAL(38,0),@Currency CHAR(3);
  SELECT @Total=SUM(LineSubtotal),@Currency=MIN(Currency) FROM @Priced;
  IF @Total IS NULL OR @Total>9000000000000 OR @Total<0
   THROW 51413,''Draft amount exceeds limit'',1;
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT core.PosDraft(TenantId,BusinessId,BranchId,DraftId,ClientRequestId,
   PayloadHash,CreatedByAccountId,Currency,SubtotalMinor)
  VALUES(@TenantId,@BusinessId,@BranchId,@NewId,@ClientRequestId,
   @PayloadHash,@AccountId,@Currency,CONVERT(BIGINT,@Total));
  INSERT core.PosDraftLine(TenantId,BusinessId,BranchId,DraftId,LineNo,
   OfferingId,Kind,OfferingNameSnapshot,Quantity,UnitPriceMinor,LineSubtotalMinor)
  SELECT @TenantId,@BusinessId,@BranchId,@NewId,LineNo,OfferingId,Kind,DisplayName,
   Quantity,UnitPriceMinor,CONVERT(BIGINT,LineSubtotal) FROM @Priced;
  SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created,
   CAST(1 AS INT) AS version;
 END
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');


-- Only vetted entry points are exposed to the stage app principal.
-- No direct SELECT/DML on draft records; internal auth check is not granted.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.PosDraft TO [drvo_erp_stage_app];
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.PosDraftLine TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadBranchPosDrafts TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateBranchPosDraft TO [drvo_erp_stage_app];
END
