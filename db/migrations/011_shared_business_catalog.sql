-- K7 Catalog: shared Business-owned product/service categories and list prices.
-- Deliberately no seed, no POS invoice/booking, no entitlement/activation grants.
-- Never apply on VPS without separate explicit migration/security approval.
CREATE TABLE core.CatalogCategory (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 CategoryId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DisplayName NVARCHAR(100) NOT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_CatalogCategory_Active DEFAULT(1),
 CONSTRAINT PK_CatalogCategory PRIMARY KEY(TenantId,BusinessId,CategoryId),
 CONSTRAINT UQ_CatalogCategory_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT FK_CatalogCategory_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT CK_CatalogCategory_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 100)
);
CREATE TABLE core.CatalogOffering (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 OfferingId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 CategoryId UNIQUEIDENTIFIER NULL,
 Kind VARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL,
 DisplayName NVARCHAR(160) NOT NULL,
 PriceMinor BIGINT NOT NULL,
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 DurationMinutes INT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_CatalogOffering_Active DEFAULT(1),
 CONSTRAINT PK_CatalogOffering PRIMARY KEY(TenantId,BusinessId,OfferingId),
 CONSTRAINT UQ_CatalogOffering_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT FK_CatalogOffering_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT FK_CatalogOffering_Category FOREIGN KEY(TenantId,BusinessId,CategoryId)
  REFERENCES core.CatalogCategory(TenantId,BusinessId,CategoryId),
 CONSTRAINT CK_CatalogOffering_Kind CHECK(Kind IN ('SERVICE','PRODUCT')),
 CONSTRAINT CK_CatalogOffering_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 160),
 CONSTRAINT CK_CatalogOffering_Price CHECK(PriceMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_CatalogOffering_Currency CHECK(
  Currency NOT LIKE '%[^A-Z]%' COLLATE Latin1_General_100_BIN2),
 CONSTRAINT CK_CatalogOffering_Duration CHECK(
  (Kind='SERVICE' AND DurationMinutes BETWEEN 1 AND 1440) OR
  (Kind='PRODUCT' AND DurationMinutes IS NULL))
);
CREATE INDEX IX_CatalogOffering_List
 ON core.CatalogOffering(TenantId,BusinessId,IsActive,DisplayName);

EXEC(N'CREATE PROCEDURE core.AssertCatalogBranchAction
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64), @Action VARCHAR(90)
AS
BEGIN
 SET NOCOUNT ON;
 -- Internal procedure only; no runtime direct EXECUTE grant.
 IF @Action NOT IN (''catalog.read'',''catalog.manage'') OR NOT EXISTS (
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId
   AND a.AccountId=s.AccountId AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId
   AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
   AND bm.AccountId=a.AccountId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId
   AND b.BusinessId=bm.BusinessId AND b.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=b.TenantId
   AND ba.BusinessId=b.BusinessId AND ba.AccountId=a.AccountId AND ba.IsActive=1
  JOIN core.Branch br ON br.TenantId=ba.TenantId
   AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId AND br.IsActive=1
  JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
   AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
   AND ar.AccountId=ba.AccountId AND ar.IsActive=1
  JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId
   AND ro.BusinessId=ar.BusinessId AND ro.RoleId=ar.RoleId AND ro.IsActive=1
  JOIN core.RolePermission rp ON rp.TenantId=ro.TenantId
   AND rp.BusinessId=ro.BusinessId AND rp.RoleId=ro.RoleId AND rp.ActionCode=@Action
  WHERE s.TenantId=@TenantId AND s.AccountId=@AccountId
   AND s.TokenHash=@TokenHash AND s.SessionVersion=@SessionVersion
   AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
   AND a.SessionVersion=@SessionVersion
   AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId
 ) THROW 51101, ''Access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadCatalog
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64)
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
 @AccountId,@SessionVersion,@TokenHash,''catalog.read'';
  SELECT CONVERT(VARCHAR(36),CategoryId) AS categoryId,
   DisplayName AS displayName, IsActive AS isActive
  FROM core.CatalogCategory
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  ORDER BY DisplayName,CategoryId;
  SELECT CONVERT(VARCHAR(36),OfferingId) AS offeringId,
   CONVERT(VARCHAR(36),CategoryId) AS categoryId,
   Kind AS kind,DisplayName AS displayName,
   PriceMinor AS priceMinor,Currency AS currency,
   DurationMinutes AS durationMinutes,IsActive AS isActive
  FROM core.CatalogOffering
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  ORDER BY DisplayName,OfferingId;
   COMMIT TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateCatalogCategory
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64), @ClientRequestId UNIQUEIDENTIFIER,@DisplayName NVARCHAR(100)
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
 @AccountId,@SessionVersion,@TokenHash,''catalog.manage'';
  IF @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 100
   THROW 51111,''Invalid category'',1;
  SET @DisplayName=LTRIM(RTRIM(@DisplayName));
  DECLARE @OldId UNIQUEIDENTIFIER,@OldName NVARCHAR(100);
  SELECT @OldId=CategoryId,@OldName=DisplayName
  FROM core.CatalogCategory WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND ClientRequestId=@ClientRequestId;
  IF @OldId IS NOT NULL
  BEGIN
   IF @OldName<>@DisplayName THROW 51112,''Idempotency conflict'',1;
   SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
  END
  ELSE
  BEGIN
   DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
   INSERT INTO core.CatalogCategory
    (TenantId,BusinessId,CategoryId,ClientRequestId,DisplayName)
   VALUES(@TenantId,@BusinessId,@NewId,@ClientRequestId,@DisplayName);
   SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created;
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

EXEC(N'CREATE PROCEDURE core.CreateCatalogOffering
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64), @ClientRequestId UNIQUEIDENTIFIER, @CategoryId UNIQUEIDENTIFIER=NULL,
 @Kind VARCHAR(7),@DisplayName NVARCHAR(160),@PriceMinor BIGINT,
 @Currency CHAR(3),@DurationMinutes INT=NULL
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
 @AccountId,@SessionVersion,@TokenHash,''catalog.manage'';
  IF @Kind NOT IN (''SERVICE'',''PRODUCT'')
   OR @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 160
   OR @PriceMinor IS NULL OR @PriceMinor NOT BETWEEN 0 AND 9000000000000
   OR @Currency IS NULL OR @Currency LIKE ''%[^A-Z]%'' COLLATE Latin1_General_100_BIN2
   OR (@Kind=''SERVICE'' AND (@DurationMinutes IS NULL OR @DurationMinutes NOT BETWEEN 1 AND 1440))
   OR (@Kind=''PRODUCT'' AND @DurationMinutes IS NOT NULL)
   THROW 51111,''Invalid offering'',1;
  SET @DisplayName=LTRIM(RTRIM(@DisplayName));
  IF @CategoryId IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM core.CatalogCategory
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId
    AND CategoryId=@CategoryId AND IsActive=1
  ) THROW 51111,''Invalid category'',1;
  DECLARE @OldId UNIQUEIDENTIFIER,@OldCategory UNIQUEIDENTIFIER,
   @OldKind VARCHAR(7),@OldName NVARCHAR(160),@OldPrice BIGINT,
   @OldCurrency CHAR(3),@OldDuration INT;
  SELECT @OldId=OfferingId,@OldCategory=CategoryId,@OldKind=Kind,
   @OldName=DisplayName,@OldPrice=PriceMinor,@OldCurrency=Currency,
   @OldDuration=DurationMinutes
  FROM core.CatalogOffering WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND ClientRequestId=@ClientRequestId;
  IF @OldId IS NOT NULL
  BEGIN
   IF @OldKind<>@Kind OR @OldName<>@DisplayName OR @OldPrice<>@PriceMinor
    OR @OldCurrency<>@Currency OR ISNULL(CONVERT(VARCHAR(36),@OldCategory),'''')<>ISNULL(CONVERT(VARCHAR(36),@CategoryId),'''')
    OR ISNULL(@OldDuration,0)<>ISNULL(@DurationMinutes,0)
    THROW 51112,''Idempotency conflict'',1;
   SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
  END
  ELSE
  BEGIN
   DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
   INSERT INTO core.CatalogOffering(
    TenantId,BusinessId,OfferingId,ClientRequestId,CategoryId,
    Kind,DisplayName,PriceMinor,Currency,DurationMinutes
   ) VALUES(
    @TenantId,@BusinessId,@NewId,@ClientRequestId,@CategoryId,
    @Kind,@DisplayName,@PriceMinor,@Currency,@DurationMinutes
   );
   SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created;
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

-- Application principal can call only vetted, scope-checked routines.
-- No direct table DML/SELECT access and no direct internal Assert proc call.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::core.CatalogCategory TO [drvo_erp_stage_app];
 DENY SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::core.CatalogOffering TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCatalog TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateCatalogCategory TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateCatalogOffering TO [drvo_erp_stage_app];
END
