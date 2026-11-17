-- SQL022: additive Cashier canonical discount snapshots for existing POS DRAFT.
-- Shared POS owns pricing. Customer and HR are referenced, never replicated.
-- Source Cashier bc9c03fff service-line-totals.ts; no payments/Tax/Inventory/GL.
-- NOT authorized for primary DRVO DB until target/backup/restore gates verified.
CREATE TABLE core.PosDraftPriceSnapshot(
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,DraftId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NULL,
 HeaderDiscountInputMinor BIGINT NULL,
 HeaderDiscountInputBps INT NULL,
 HeaderDiscountMinor BIGINT NOT NULL,
 LinesNetMinor BIGINT NOT NULL,
 TotalDiscountMinor BIGINT NOT NULL,
 GrandTotalMinor BIGINT NOT NULL,
 SourceRule VARCHAR(50) COLLATE Latin1_General_100_BIN2 NOT NULL
 CONSTRAINT DF_PosDraftPrice_Source DEFAULT('CASHIER_LINE_AND_HEADER_DISCOUNT'),
 CONSTRAINT PK_PosDraftPriceSnapshot PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId),
 CONSTRAINT FK_PosDraftPriceSnapshot_Draft FOREIGN KEY(TenantId,BusinessId,BranchId,DraftId)
 REFERENCES core.PosDraft(TenantId,BusinessId,BranchId,DraftId),
 CONSTRAINT FK_PosDraftPriceSnapshot_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
 REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT CK_PosDraftPrice_Amount CHECK(
  (HeaderDiscountInputMinor IS NULL OR HeaderDiscountInputMinor BETWEEN 0 AND 9000000000000)
  AND (HeaderDiscountInputBps IS NULL OR HeaderDiscountInputBps BETWEEN 0 AND 10000)
  AND HeaderDiscountMinor BETWEEN 0 AND 9000000000000
  AND LinesNetMinor BETWEEN 0 AND 9000000000000
  AND TotalDiscountMinor BETWEEN 0 AND 9000000000000
  AND GrandTotalMinor BETWEEN 0 AND 9000000000000
  AND GrandTotalMinor+HeaderDiscountMinor=LinesNetMinor),
 CONSTRAINT CK_PosDraftPrice_Source CHECK(SourceRule='CASHIER_LINE_AND_HEADER_DISCOUNT')
);
CREATE TABLE core.PosDraftLinePriceSnapshot(
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,DraftId UNIQUEIDENTIFIER NOT NULL,
 [LineNo] INT NOT NULL,ExecutorEmployeeId UNIQUEIDENTIFIER NULL,
 DiscountInputMinor BIGINT NULL,DiscountInputBps INT NULL,
 DiscountMinor BIGINT NOT NULL,NetMinor BIGINT NOT NULL,
 CONSTRAINT PK_PosDraftLinePrice PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId,[LineNo]),
 CONSTRAINT FK_PosDraftLinePrice_Line FOREIGN KEY(TenantId,BusinessId,BranchId,DraftId,[LineNo])
 REFERENCES core.PosDraftLine(TenantId,BusinessId,BranchId,DraftId,[LineNo]),
 CONSTRAINT FK_PosDraftLinePrice_Executor FOREIGN KEY(TenantId,BusinessId,BranchId,ExecutorEmployeeId)
 REFERENCES core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT CK_PosDraftLinePrice_Amounts CHECK(
  (DiscountInputMinor IS NULL OR DiscountInputMinor BETWEEN 0 AND 9000000000000)
  AND (DiscountInputBps IS NULL OR DiscountInputBps BETWEEN 0 AND 10000)
  AND DiscountMinor BETWEEN 0 AND 9000000000000
  AND NetMinor BETWEEN 0 AND 9000000000000)
);

EXEC(N'CREATE PROCEDURE core.CreateBranchPosCashierDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@PayloadHash CHAR(64),@LinesJson NVARCHAR(MAX),
 @CustomerId UNIQUEIDENTIFIER=NULL,@HeaderDiscountMinor BIGINT=NULL,
 @HeaderDiscountBps INT=NULL,@ExpectedTotalMinor BIGINT=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPosDraftBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''pos.draft.manage'';
 EXEC core.AssertCatalogBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''catalog.read'';
 -- Rich drafts display customer identity and personnel; permissions mandatory.
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''hr.read'';
 IF @ClientRequestId IS NULL OR @PayloadHash IS NULL OR LEN(@PayloadHash)<>64
  OR @PayloadHash LIKE ''%[^0-9a-f]%'' COLLATE Latin1_General_100_BIN2
  OR @ExpectedTotalMinor IS NULL OR @ExpectedTotalMinor NOT BETWEEN 0 AND 9000000000000
  OR (@HeaderDiscountMinor IS NOT NULL AND @HeaderDiscountMinor NOT BETWEEN 0 AND 9000000000000)
  OR (@HeaderDiscountBps IS NOT NULL AND @HeaderDiscountBps NOT BETWEEN 0 AND 10000)
  THROW 51422,''Invalid POS price draft'',1;
 DECLARE @PriorId UNIQUEIDENTIFIER,@PriorHash CHAR(64),@PriorAccount UNIQUEIDENTIFIER;
 SELECT @PriorId=DraftId,@PriorHash=PayloadHash,@PriorAccount=CreatedByAccountId
 FROM core.PosDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorId IS NOT NULL BEGIN
  IF @PriorHash<>@PayloadHash OR @PriorAccount<>@AccountId OR NOT EXISTS(
    SELECT 1 FROM core.PosDraftPriceSnapshot
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND DraftId=@PriorId)
   THROW 51423,''POS draft request conflicts with original'',1;
  SELECT CONVERT(VARCHAR(36),@PriorId) AS id,CAST(0 AS BIT) AS created,
   CAST(1 AS INT) AS version,
   (SELECT GrandTotalMinor FROM core.PosDraftPriceSnapshot
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
      AND DraftId=@PriorId) AS grandTotalMinor;
 END ELSE BEGIN
  IF @LinesJson IS NULL OR LEN(@LinesJson)>8000 OR ISJSON(@LinesJson)<>1 OR
   LEFT(LTRIM(@LinesJson),1)<> ''['' THROW 51422,''Invalid POS line JSON'',1;
  IF @CustomerId IS NOT NULL AND NOT EXISTS(
   SELECT 1 FROM core.Customer WITH(HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
    AND IsActive=1)
   THROW 51424,''Unknown or inactive customer'',1;
  DECLARE @Parsed TABLE(
   [LineNo] INT PRIMARY KEY,OfferingId UNIQUEIDENTIFIER NULL,Quantity INT NULL,
   DiscountInputMinor BIGINT NULL,DiscountInputBps INT NULL,ExecutorEmployeeId UNIQUEIDENTIFIER NULL
  );
  INSERT @Parsed([LineNo],OfferingId,Quantity,DiscountInputMinor,DiscountInputBps,ExecutorEmployeeId)
   SELECT TRY_CONVERT(INT,j.[key])+1,
    TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(j.value,''$.offeringId'')),
    TRY_CONVERT(INT,JSON_VALUE(j.value,''$.quantity'')),
    TRY_CONVERT(BIGINT,JSON_VALUE(j.value,''$.lineDiscountMinor'')),
    TRY_CONVERT(INT,JSON_VALUE(j.value,''$.lineDiscountPercentBps'')),
    TRY_CONVERT(UNIQUEIDENTIFIER,JSON_VALUE(j.value,''$.executorEmployeeId''))
   FROM OPENJSON(@LinesJson) j;
  DECLARE @Count INT=(SELECT COUNT(*) FROM @Parsed);
  IF @Count NOT BETWEEN 1 AND 20 OR EXISTS(
   SELECT 1 FROM @Parsed WHERE OfferingId IS NULL OR Quantity NOT BETWEEN 1 AND 20
    OR (DiscountInputMinor IS NOT NULL AND DiscountInputMinor NOT BETWEEN 0 AND 9000000000000)
    OR (DiscountInputBps IS NOT NULL AND DiscountInputBps NOT BETWEEN 0 AND 10000)
  ) OR EXISTS(SELECT OfferingId FROM @Parsed GROUP BY OfferingId HAVING COUNT(*)>1)
   THROW 51422,''Invalid POS lines'',1;
  IF EXISTS(
   SELECT 1 FROM @Parsed p LEFT JOIN core.HrEmployeeBranch eb WITH(HOLDLOCK)
    ON eb.TenantId=@TenantId AND eb.BusinessId=@BusinessId AND eb.BranchId=@BranchId
     AND eb.EmployeeId=p.ExecutorEmployeeId
   LEFT JOIN core.HrEmployee e WITH(HOLDLOCK)
    ON e.TenantId=eb.TenantId AND e.BusinessId=eb.BusinessId AND e.EmployeeId=eb.EmployeeId
   WHERE p.ExecutorEmployeeId IS NOT NULL
    AND (eb.EmployeeId IS NULL OR eb.IsActive<>1 OR e.IsActive<>1))
   THROW 51424,''Unknown or inactive branch executor'',1;
  DECLARE @Priced TABLE(
   [LineNo] INT PRIMARY KEY,OfferingId UNIQUEIDENTIFIER NOT NULL,
   Kind VARCHAR(7) NOT NULL,DisplayName NVARCHAR(160) NOT NULL,
   Currency CHAR(3) NOT NULL,Quantity INT NOT NULL,UnitPriceMinor BIGINT NOT NULL,
   Gross DECIMAL(38,0) NOT NULL,Discount DECIMAL(38,0) NOT NULL,
   Net DECIMAL(38,0) NOT NULL,DiscountInputMinor BIGINT NULL,
   DiscountInputBps INT NULL,ExecutorEmployeeId UNIQUEIDENTIFIER NULL
  );
  INSERT @Priced([LineNo],OfferingId,Kind,DisplayName,Currency,Quantity,
    UnitPriceMinor,Gross,Discount,Net,DiscountInputMinor,DiscountInputBps,ExecutorEmployeeId)
   SELECT p.[LineNo],o.OfferingId,o.Kind,o.DisplayName,o.Currency,p.Quantity,o.PriceMinor,
    g.Gross,
    CASE WHEN raw.Discount>g.Gross THEN g.Gross ELSE raw.Discount END,
    g.Gross-CASE WHEN raw.Discount>g.Gross THEN g.Gross ELSE raw.Discount END,
    p.DiscountInputMinor,p.DiscountInputBps,p.ExecutorEmployeeId
   FROM @Parsed p
   JOIN core.CatalogOffering o WITH(HOLDLOCK)
    ON o.TenantId=@TenantId AND o.BusinessId=@BusinessId
    AND o.OfferingId=p.OfferingId AND o.IsActive=1
   CROSS APPLY(SELECT CONVERT(DECIMAL(38,0),o.PriceMinor)*
      CONVERT(DECIMAL(38,0),p.Quantity) AS Gross) g
   CROSS APPLY(SELECT
    CASE WHEN p.DiscountInputMinor IS NOT NULL THEN CONVERT(DECIMAL(38,0),p.DiscountInputMinor)
     WHEN p.DiscountInputBps IS NOT NULL THEN
      FLOOR((g.Gross*CONVERT(DECIMAL(38,0),p.DiscountInputBps)+5000)/10000)
     ELSE CONVERT(DECIMAL(38,0),0) END AS Discount) raw
   WHERE o.Currency IN(''EGP'',''SAR'',''AED'',''USD'')
    AND o.PriceMinor BETWEEN 0 AND 9000000000000
    AND g.Gross BETWEEN 0 AND 9000000000000;
  IF (SELECT COUNT(*) FROM @Priced)<>@Count OR
   (SELECT COUNT(DISTINCT Currency) FROM @Priced)<>1
   THROW 51424,''Foreign, inactive or mixed-currency Catalog line'',1;
  DECLARE @Subtotal DECIMAL(38,0),@Net DECIMAL(38,0),@LinesDiscount DECIMAL(38,0),
   @Currency CHAR(3),@Header DECIMAL(38,0),@RawHeader DECIMAL(38,0),@Grand DECIMAL(38,0);
  SELECT @Subtotal=SUM(Gross),@Net=SUM(Net),@LinesDiscount=SUM(Discount),
   @Currency=MIN(Currency) FROM @Priced;
  IF @Subtotal IS NULL OR @Subtotal NOT BETWEEN 0 AND 9000000000000
   OR @Net NOT BETWEEN 0 AND 9000000000000
   THROW 51422,''POS totals exceed allowed bounds'',1;
  SET @RawHeader=CASE
   WHEN @HeaderDiscountMinor IS NOT NULL AND @HeaderDiscountMinor>0
    THEN CONVERT(DECIMAL(38,0),@HeaderDiscountMinor)
   WHEN @HeaderDiscountBps IS NOT NULL AND @HeaderDiscountBps>0
    THEN FLOOR((@Net*CONVERT(DECIMAL(38,0),@HeaderDiscountBps)+5000)/10000)
   ELSE CONVERT(DECIMAL(38,0),0) END;
  SET @Header=CASE WHEN @Net=0 THEN 0 WHEN @RawHeader>@Net THEN @Net ELSE @RawHeader END;
  SET @Grand=@Net-@Header;
  -- User-facing quote is a REVIEW checkpoint, never price authority. Changed
  -- Catalog or discounts require a new server quote before any immutable save.
  IF @Grand<>CONVERT(DECIMAL(38,0),@ExpectedTotalMinor)
   THROW 51423,''POS Catalog price or quote changed; review again'',1;
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT core.PosDraft(TenantId,BusinessId,BranchId,DraftId,ClientRequestId,
   PayloadHash,CreatedByAccountId,Currency,SubtotalMinor)
   VALUES(@TenantId,@BusinessId,@BranchId,@NewId,@ClientRequestId,
    @PayloadHash,@AccountId,@Currency,CONVERT(BIGINT,@Subtotal));
  INSERT core.PosDraftLine(TenantId,BusinessId,BranchId,DraftId,[LineNo],
    OfferingId,Kind,OfferingNameSnapshot,Quantity,UnitPriceMinor,LineSubtotalMinor)
   SELECT @TenantId,@BusinessId,@BranchId,@NewId,[LineNo],
    OfferingId,Kind,DisplayName,Quantity,UnitPriceMinor,CONVERT(BIGINT,Gross) FROM @Priced;
  INSERT core.PosDraftPriceSnapshot(TenantId,BusinessId,BranchId,DraftId,CustomerId,
    HeaderDiscountInputMinor,HeaderDiscountInputBps,HeaderDiscountMinor,
    LinesNetMinor,TotalDiscountMinor,GrandTotalMinor)
   VALUES(@TenantId,@BusinessId,@BranchId,@NewId,@CustomerId,
    @HeaderDiscountMinor,@HeaderDiscountBps,
    CONVERT(BIGINT,@Header),CONVERT(BIGINT,@Net),
    CONVERT(BIGINT,@LinesDiscount+@Header),CONVERT(BIGINT,@Grand));
  INSERT core.PosDraftLinePriceSnapshot(TenantId,BusinessId,BranchId,DraftId,[LineNo],
    ExecutorEmployeeId,DiscountInputMinor,DiscountInputBps,DiscountMinor,NetMinor)
   SELECT @TenantId,@BusinessId,@BranchId,@NewId,[LineNo],
    ExecutorEmployeeId,DiscountInputMinor,DiscountInputBps,
    CONVERT(BIGINT,Discount),CONVERT(BIGINT,Net) FROM @Priced;
  SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created,
   CAST(1 AS INT) AS version,CONVERT(BIGINT,@Grand) AS grandTotalMinor;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.ReadBranchPosCashierDrafts
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertPosDraftBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''pos.draft.read'';
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''hr.read'';
 DECLARE @Page TABLE(DraftId UNIQUEIDENTIFIER PRIMARY KEY);
 INSERT @Page SELECT TOP(50) d.DraftId FROM core.PosDraft d
 JOIN core.PosDraftPriceSnapshot p ON p.TenantId=d.TenantId
  AND p.BusinessId=d.BusinessId AND p.BranchId=d.BranchId AND p.DraftId=d.DraftId
 WHERE d.TenantId=@TenantId AND d.BusinessId=@BusinessId AND d.BranchId=@BranchId
 ORDER BY d.CreatedAtUtc DESC,d.DraftId;
 SELECT CONVERT(VARCHAR(36),d.DraftId) AS draftId,d.CreatedAtUtc AS createdAtUtc,
  d.Currency AS currency,d.SubtotalMinor AS subtotalMinor,
  CONVERT(VARCHAR(36),p.CustomerId) AS customerId,p.HeaderDiscountMinor AS headerDiscountMinor,
  p.LinesNetMinor AS linesNetMinor,p.TotalDiscountMinor AS totalDiscountMinor,
  p.GrandTotalMinor AS grandTotalMinor,d.Status AS status,d.Version AS version
 FROM core.PosDraft d JOIN core.PosDraftPriceSnapshot p
 ON p.TenantId=d.TenantId AND p.BusinessId=d.BusinessId
  AND p.BranchId=d.BranchId AND p.DraftId=d.DraftId
 JOIN @Page pg ON pg.DraftId=d.DraftId
 WHERE d.TenantId=@TenantId AND d.BusinessId=@BusinessId AND d.BranchId=@BranchId
 ORDER BY d.CreatedAtUtc DESC,d.DraftId;
 SELECT CONVERT(VARCHAR(36),l.DraftId) AS draftId,l.[LineNo] AS lineNo,
  CONVERT(VARCHAR(36),l.OfferingId) AS offeringId,l.OfferingNameSnapshot AS displayName,
  l.Kind AS kind,l.Quantity AS quantity,l.UnitPriceMinor AS unitPriceMinor,
  l.LineSubtotalMinor AS grossMinor,
  CONVERT(VARCHAR(36),p.ExecutorEmployeeId) AS executorEmployeeId,
  p.DiscountMinor AS discountMinor,p.NetMinor AS netMinor
 FROM core.PosDraftLine l JOIN core.PosDraftLinePriceSnapshot p
  ON p.TenantId=l.TenantId AND p.BusinessId=l.BusinessId AND p.BranchId=l.BranchId
   AND p.DraftId=l.DraftId AND p.[LineNo]=l.[LineNo]
 JOIN @Page pg ON pg.DraftId=l.DraftId
 WHERE l.TenantId=@TenantId AND l.BusinessId=@BusinessId AND l.BranchId=@BranchId
 ORDER BY l.DraftId,l.[LineNo];
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.PosDraftPriceSnapshot TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.PosDraftLinePriceSnapshot TO [drvo_erp_stage_app];
 -- Dynamic GRANT resolves procedures after same-batch EXEC(N'CREATE PROCEDURE').
 EXEC(N'GRANT EXECUTE ON OBJECT::core.CreateBranchPosCashierDraft TO [drvo_erp_stage_app]');
 EXEC(N'GRANT EXECUTE ON OBJECT::core.ReadBranchPosCashierDrafts TO [drvo_erp_stage_app]');
END
