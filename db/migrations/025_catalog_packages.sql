-- SQL025: Business-scoped Catalog packages (regular/groom) with included Catalog offerings.
-- POS may expand packages into nonposting DRAFT lines using live Catalog prices.
-- No redemption, payment, stock, booking handoff, or ADR-031 posting.
-- Never apply on primary/VPS without separate explicit migration/security approval.

CREATE TABLE core.CatalogPackage (
 TenantId UNIQUEIDENTIFIER NOT NULL,
 BusinessId UNIQUEIDENTIFIER NOT NULL,
 PackageId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 Kind VARCHAR(7) COLLATE Latin1_General_100_BIN2 NOT NULL,
 DisplayName NVARCHAR(160) NOT NULL,
 Description NVARCHAR(400) NULL,
 PriceMinor BIGINT NOT NULL,
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 DurationMinutes INT NULL,
 IsPopular BIT NOT NULL CONSTRAINT DF_CatalogPackage_Popular DEFAULT(0),
 IsActive BIT NOT NULL CONSTRAINT DF_CatalogPackage_Active DEFAULT(1),
 CONSTRAINT PK_CatalogPackage PRIMARY KEY(TenantId,BusinessId,PackageId),
 CONSTRAINT UQ_CatalogPackage_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT FK_CatalogPackage_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT CK_CatalogPackage_Kind CHECK(Kind IN ('REGULAR','GROOM')),
 CONSTRAINT CK_CatalogPackage_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 160),
 CONSTRAINT CK_CatalogPackage_Price CHECK(PriceMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_CatalogPackage_Currency CHECK(
  Currency NOT LIKE '%[^A-Z]%' COLLATE Latin1_General_100_BIN2),
 CONSTRAINT CK_CatalogPackage_Duration CHECK(
  DurationMinutes IS NULL OR DurationMinutes BETWEEN 1 AND 1440)
);
CREATE INDEX IX_CatalogPackage_List
 ON core.CatalogPackage(TenantId,BusinessId,IsActive,DisplayName);

CREATE TABLE core.CatalogPackageItem (
 TenantId UNIQUEIDENTIFIER NOT NULL,
 BusinessId UNIQUEIDENTIFIER NOT NULL,
 PackageId UNIQUEIDENTIFIER NOT NULL,
 OfferingId UNIQUEIDENTIFIER NOT NULL,
 SortOrder INT NOT NULL,
 IsRequired BIT NOT NULL CONSTRAINT DF_CatalogPackageItem_Required DEFAULT(1),
 CONSTRAINT PK_CatalogPackageItem PRIMARY KEY(TenantId,BusinessId,PackageId,OfferingId),
 CONSTRAINT FK_CatalogPackageItem_Package FOREIGN KEY(TenantId,BusinessId,PackageId)
  REFERENCES core.CatalogPackage(TenantId,BusinessId,PackageId),
 CONSTRAINT FK_CatalogPackageItem_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT CK_CatalogPackageItem_Sort CHECK(SortOrder BETWEEN 0 AND 40)
);
CREATE INDEX IX_CatalogPackageItem_Offering
 ON core.CatalogPackageItem(TenantId,BusinessId,OfferingId,PackageId);

EXEC(N'CREATE OR ALTER PROCEDURE core.ReadCatalogPackages
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
  SELECT CONVERT(VARCHAR(36),PackageId) AS packageId,
   Kind AS kind, DisplayName AS displayName,
   Description AS description, PriceMinor AS priceMinor,
   Currency AS currency, DurationMinutes AS durationMinutes,
   IsPopular AS isPopular, IsActive AS isActive
  FROM core.CatalogPackage
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  ORDER BY DisplayName,PackageId;
  SELECT CONVERT(VARCHAR(36),PackageId) AS packageId,
   CONVERT(VARCHAR(36),OfferingId) AS offeringId,
   SortOrder AS sortOrder, IsRequired AS isRequired
  FROM core.CatalogPackageItem
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  ORDER BY PackageId,SortOrder,OfferingId;
  COMMIT TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  THROW;
 END CATCH
END');

EXEC(N'CREATE OR ALTER PROCEDURE core.CreateCatalogPackage
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,
 @Kind VARCHAR(7), @DisplayName NVARCHAR(160),
 @Description NVARCHAR(400)=NULL,
 @PriceMinor BIGINT, @Currency CHAR(3),
 @DurationMinutes INT=NULL, @IsPopular BIT=0,
 @ItemsJson NVARCHAR(MAX)
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
   @AccountId,@SessionVersion,@TokenHash,''catalog.manage'';
  IF @Kind NOT IN (''REGULAR'',''GROOM'')
   OR @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 160
   OR @PriceMinor NOT BETWEEN 0 AND 9000000000000
   OR @Currency IS NULL OR LEN(@Currency)<>3
   OR @Currency LIKE ''%[^A-Z]%'' COLLATE Latin1_General_100_BIN2
   OR (@DurationMinutes IS NOT NULL AND @DurationMinutes NOT BETWEEN 1 AND 1440)
   OR @ItemsJson IS NULL OR LEN(@ItemsJson)<2
   OR (@Description IS NOT NULL AND LEN(@Description)>400)
   THROW 51111,''Invalid Catalog data'',1;
  SET @DisplayName=LTRIM(RTRIM(@DisplayName));
  IF @Description IS NOT NULL SET @Description=NULLIF(LTRIM(RTRIM(@Description)),N'''');
  DECLARE @OldId UNIQUEIDENTIFIER,@OldKind VARCHAR(7),@OldName NVARCHAR(160),
   @OldDesc NVARCHAR(400),@OldPrice BIGINT,@OldCurrency CHAR(3),
   @OldDuration INT,@OldPopular BIT;
  SELECT @OldId=PackageId,@OldKind=Kind,@OldName=DisplayName,@OldDesc=Description,
   @OldPrice=PriceMinor,@OldCurrency=Currency,@OldDuration=DurationMinutes,
   @OldPopular=IsPopular
  FROM core.CatalogPackage WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND ClientRequestId=@ClientRequestId;
  DECLARE @Parsed TABLE(
   [ItemNo] INT PRIMARY KEY,
   OfferingId UNIQUEIDENTIFIER NULL,
   SortOrder INT NULL,
   IsRequired BIT NULL
  );
  INSERT @Parsed([ItemNo],OfferingId,SortOrder,IsRequired)
   SELECT TRY_CONVERT(INT,j.[key])+1,
    TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(j.value,''$.offeringId'')),
    TRY_CONVERT(INT,JSON_VALUE(j.value,''$.sortOrder'')),
    CASE WHEN JSON_VALUE(j.value,''$.isRequired'') IS NULL THEN CAST(1 AS BIT)
     WHEN LOWER(JSON_VALUE(j.value,''$.isRequired'')) IN (''true'',''1'') THEN CAST(1 AS BIT)
     WHEN LOWER(JSON_VALUE(j.value,''$.isRequired'')) IN (''false'',''0'') THEN CAST(0 AS BIT)
     ELSE NULL END
   FROM OPENJSON(@ItemsJson) j;
  DECLARE @ItemCount INT=(SELECT COUNT(*) FROM @Parsed);
  IF @ItemCount NOT BETWEEN 1 AND 20
   OR EXISTS(SELECT 1 FROM @Parsed WHERE OfferingId IS NULL
    OR SortOrder IS NULL OR SortOrder NOT BETWEEN 0 AND 40 OR IsRequired IS NULL)
   OR EXISTS(SELECT OfferingId FROM @Parsed GROUP BY OfferingId HAVING COUNT(*)>1)
   THROW 51111,''Invalid Catalog data'',1;
  IF EXISTS(
   SELECT 1 FROM @Parsed p
   LEFT JOIN core.CatalogOffering o WITH(HOLDLOCK)
    ON o.TenantId=@TenantId AND o.BusinessId=@BusinessId AND o.OfferingId=p.OfferingId
   WHERE o.OfferingId IS NULL OR o.IsActive<>1 OR o.Kind<>''SERVICE'')
   THROW 51111,''Invalid Catalog data'',1;
  IF @OldId IS NOT NULL
  BEGIN
   IF @OldKind<>@Kind OR @OldName<>@DisplayName
    OR ISNULL(@OldDesc,N'''')<>ISNULL(@Description,N'''')
    OR @OldPrice<>@PriceMinor OR @OldCurrency<>@Currency
    OR ISNULL(@OldDuration,0)<>ISNULL(@DurationMinutes,0)
    OR @OldPopular<>@IsPopular
    OR EXISTS(
     SELECT OfferingId,SortOrder,IsRequired FROM core.CatalogPackageItem
     WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND PackageId=@OldId
     EXCEPT
     SELECT OfferingId,SortOrder,IsRequired FROM @Parsed)
    OR EXISTS(
     SELECT OfferingId,SortOrder,IsRequired FROM @Parsed
     EXCEPT
     SELECT OfferingId,SortOrder,IsRequired FROM core.CatalogPackageItem
     WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND PackageId=@OldId)
    THROW 51112,''Idempotency conflict'',1;
   SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
  END
  ELSE
  BEGIN
   DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
   INSERT INTO core.CatalogPackage(
    TenantId,BusinessId,PackageId,ClientRequestId,Kind,DisplayName,Description,
    PriceMinor,Currency,DurationMinutes,IsPopular
   ) VALUES(
    @TenantId,@BusinessId,@NewId,@ClientRequestId,@Kind,@DisplayName,@Description,
    @PriceMinor,@Currency,@DurationMinutes,@IsPopular
   );
   INSERT INTO core.CatalogPackageItem(
    TenantId,BusinessId,PackageId,OfferingId,SortOrder,IsRequired
   )
   SELECT @TenantId,@BusinessId,@NewId,OfferingId,SortOrder,IsRequired
   FROM @Parsed;
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

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::core.CatalogPackage TO [drvo_erp_stage_app];
 DENY SELECT, INSERT, UPDATE, DELETE
  ON OBJECT::core.CatalogPackageItem TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCatalogPackages TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateCatalogPackage TO [drvo_erp_stage_app];
END
