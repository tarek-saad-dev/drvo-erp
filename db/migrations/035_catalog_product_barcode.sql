-- SQL035: PRODUCT barcode on CatalogOffering (Cashier Barcode / product search).
-- Pin 046bf19: productCatalog.service.ts Barcode NVARCHAR search on products.
-- SERVICE rows must keep Barcode NULL. Unique per Business when present.
-- No sale, stock decrement, purchase AP, or ADR-031 posting.
-- Never apply on primary/VPS without separate backup + approval.
-- Note: after ADD column, later DDL that references Barcode must be dynamic SQL
-- (GO batches are forbidden by the migrator; same-batch name resolution fails).

ALTER TABLE core.CatalogOffering ADD Barcode NVARCHAR(50) NULL;

EXEC(N'ALTER TABLE core.CatalogOffering ADD CONSTRAINT CK_CatalogOffering_Barcode CHECK(
 (Kind=''PRODUCT'' AND (Barcode IS NULL OR LEN(LTRIM(RTRIM(Barcode))) BETWEEN 1 AND 50))
 OR (Kind=''SERVICE'' AND Barcode IS NULL)
)');

EXEC(N'CREATE UNIQUE INDEX UX_CatalogOffering_Barcode
 ON core.CatalogOffering(TenantId,BusinessId,Barcode)
 WHERE Barcode IS NOT NULL');

EXEC(N'CREATE OR ALTER PROCEDURE core.ReadCatalog
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
   DurationMinutes AS durationMinutes,IsActive AS isActive,
   Barcode AS barcode
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

EXEC(N'CREATE OR ALTER PROCEDURE core.CreateCatalogOffering
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64), @ClientRequestId UNIQUEIDENTIFIER, @CategoryId UNIQUEIDENTIFIER=NULL,
 @Kind VARCHAR(7),@DisplayName NVARCHAR(160),@PriceMinor BIGINT,
 @Currency CHAR(3),@DurationMinutes INT=NULL,@Barcode NVARCHAR(50)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
 @AccountId,@SessionVersion,@TokenHash,''catalog.manage'';
  IF @Barcode IS NOT NULL SET @Barcode=LTRIM(RTRIM(@Barcode));
  IF @Barcode IS NOT NULL AND LEN(@Barcode)=0 SET @Barcode=NULL;
  IF @Kind NOT IN (''SERVICE'',''PRODUCT'')
   OR @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 160
   OR @PriceMinor IS NULL OR @PriceMinor NOT BETWEEN 0 AND 9000000000000
   OR @Currency IS NULL OR @Currency LIKE ''%[^A-Z]%'' COLLATE Latin1_General_100_BIN2
   OR (@Kind=''SERVICE'' AND (@DurationMinutes IS NULL OR @DurationMinutes NOT BETWEEN 1 AND 1440))
   OR (@Kind=''PRODUCT'' AND @DurationMinutes IS NOT NULL)
   OR (@Kind=''SERVICE'' AND @Barcode IS NOT NULL)
   OR (@Kind=''PRODUCT'' AND @Barcode IS NOT NULL AND LEN(@Barcode) NOT BETWEEN 1 AND 50)
   THROW 51111,''Invalid offering'',1;
  SET @DisplayName=LTRIM(RTRIM(@DisplayName));
  IF @CategoryId IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM core.CatalogCategory
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId
    AND CategoryId=@CategoryId AND IsActive=1
  ) THROW 51111,''Invalid category'',1;
  IF @Barcode IS NOT NULL AND EXISTS(
   SELECT 1 FROM core.CatalogOffering WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND Barcode=@Barcode
  ) THROW 51111,''Barcode already used'',1;
  DECLARE @OldId UNIQUEIDENTIFIER,@OldCategory UNIQUEIDENTIFIER,
   @OldKind VARCHAR(7),@OldName NVARCHAR(160),@OldPrice BIGINT,
   @OldCurrency CHAR(3),@OldDuration INT,@OldBarcode NVARCHAR(50);
  SELECT @OldId=OfferingId,@OldCategory=CategoryId,@OldKind=Kind,
   @OldName=DisplayName,@OldPrice=PriceMinor,@OldCurrency=Currency,
   @OldDuration=DurationMinutes,@OldBarcode=Barcode
  FROM core.CatalogOffering WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND ClientRequestId=@ClientRequestId;
  IF @OldId IS NOT NULL
  BEGIN
   IF @OldKind<>@Kind OR @OldName<>@DisplayName OR @OldPrice<>@PriceMinor
    OR @OldCurrency<>@Currency OR ISNULL(CONVERT(VARCHAR(36),@OldCategory),'''')<>ISNULL(CONVERT(VARCHAR(36),@CategoryId),'''')
    OR ISNULL(@OldDuration,0)<>ISNULL(@DurationMinutes,0)
    OR ISNULL(@OldBarcode,N'''')<>ISNULL(@Barcode,N'''')
    THROW 51112,''Idempotency conflict'',1;
   SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
  END
  ELSE
  BEGIN
   DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
   INSERT INTO core.CatalogOffering(
    TenantId,BusinessId,OfferingId,ClientRequestId,CategoryId,
    Kind,DisplayName,PriceMinor,Currency,DurationMinutes,Barcode
   ) VALUES(
    @TenantId,@BusinessId,@NewId,@ClientRequestId,@CategoryId,
    @Kind,@DisplayName,@PriceMinor,@Currency,@DurationMinutes,@Barcode
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

EXEC(N'CREATE OR ALTER PROCEDURE core.SetCatalogProductBarcode
 @TenantId UNIQUEIDENTIFIER, @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER, @AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT, @TokenHash CHAR(64),
 @OfferingId UNIQUEIDENTIFIER, @Barcode NVARCHAR(50)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; BEGIN TRANSACTION;
  EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
   @AccountId,@SessionVersion,@TokenHash,''catalog.manage'';
  IF @OfferingId IS NULL THROW 51111,''Invalid barcode update'',1;
  IF @Barcode IS NOT NULL SET @Barcode=LTRIM(RTRIM(@Barcode));
  IF @Barcode IS NOT NULL AND LEN(@Barcode)=0 SET @Barcode=NULL;
  IF @Barcode IS NOT NULL AND LEN(@Barcode) NOT BETWEEN 1 AND 50
   THROW 51111,''Invalid barcode'',1;
  DECLARE @Kind VARCHAR(7),@Prior NVARCHAR(50);
  SELECT @Kind=Kind,@Prior=Barcode FROM core.CatalogOffering WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND OfferingId=@OfferingId;
  IF @Kind IS NULL THROW 51101,''Access denied'',1;
  IF @Kind<>''PRODUCT'' THROW 51111,''Barcode is PRODUCT-only'',1;
  IF ISNULL(@Prior,N'''')=ISNULL(@Barcode,N'''')
  BEGIN
   SELECT CONVERT(VARCHAR(36),@OfferingId) AS id,CAST(0 AS BIT) AS changed;
   COMMIT TRANSACTION; SET TRANSACTION ISOLATION LEVEL READ COMMITTED; RETURN;
  END
  IF @Barcode IS NOT NULL AND EXISTS(
   SELECT 1 FROM core.CatalogOffering WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND Barcode=@Barcode
    AND OfferingId<>@OfferingId)
   THROW 51111,''Barcode already used'',1;
  UPDATE core.CatalogOffering SET Barcode=@Barcode
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND OfferingId=@OfferingId
    AND Kind=''PRODUCT'';
  SELECT CONVERT(VARCHAR(36),@OfferingId) AS id,CAST(1 AS BIT) AS changed;
  COMMIT TRANSACTION; SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED; THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 GRANT EXECUTE ON OBJECT::core.SetCatalogProductBarcode TO [drvo_erp_stage_app];
END
