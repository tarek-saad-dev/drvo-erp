-- SQL024: Business-scoped Customer name/phone search + create-time duplicate phone gate.
-- Keeps ReadCustomers TOP(200) browse list. Search is a separate procedure (TOP 20).
-- No UNIQUE phone index yet: duplicates must be analyzed on real data before a constraint.
-- No financial posting, no Cut import, no feature-flag activation.

CREATE INDEX IX_Customer_Business_Phone
 ON core.Customer(TenantId,BusinessId,PhoneE164,CustomerId)
 WHERE PhoneE164 IS NOT NULL AND IsActive=1;

EXEC(N'CREATE OR ALTER PROCEDURE core.SearchCustomers
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),
 @Query NVARCHAR(80),@PhoneDigits VARCHAR(16)=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 IF @Query IS NULL OR LEN(LTRIM(RTRIM(@Query)))<1
  THROW 51132,''Invalid Customer'',1;
 SET @Query=LTRIM(RTRIM(@Query));
 IF LEN(@Query)>80 SET @Query=LEFT(@Query,80);
 IF @PhoneDigits IS NOT NULL AND (
  LEN(@PhoneDigits)>16 OR @PhoneDigits LIKE ''%[^0-9]%'' COLLATE Latin1_General_100_BIN2)
  THROW 51132,''Invalid Customer'',1;
 DECLARE @NameNeedle NVARCHAR(82)=N''%''+REPLACE(REPLACE(REPLACE(@Query,N''\'',N''\\''),N''%'',N''\%''),N''_'',N''\_'')+N''%'';
 SELECT TOP(20) CONVERT(VARCHAR(36),CustomerId) AS customerId,
  DisplayName AS displayName,PhoneE164 AS phoneE164,IsActive AS isActive
 FROM core.Customer
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND IsActive=1
  AND (
   DisplayName LIKE @NameNeedle ESCAPE N''\''
   OR (@PhoneDigits IS NOT NULL AND LEN(@PhoneDigits)>=3
       AND PhoneE164 LIKE ''%''+@PhoneDigits+''%'')
  )
 ORDER BY DisplayName,CustomerId;
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

EXEC(N'CREATE OR ALTER PROCEDURE core.CreateCustomer
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DisplayName NVARCHAR(160),
 @PhoneE164 VARCHAR(16)=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.manage'';
 IF @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 160
 OR (@PhoneE164 IS NOT NULL AND (
  LEN(@PhoneE164) NOT BETWEEN 8 AND 16 OR LEFT(@PhoneE164,1)<>''+'' OR
  SUBSTRING(@PhoneE164,2,15) LIKE ''%[^0-9]%'' COLLATE Latin1_General_100_BIN2))
  THROW 51132,''Invalid Customer'',1;
 SET @DisplayName=LTRIM(RTRIM(@DisplayName));
 DECLARE @OldId UNIQUEIDENTIFIER,@OldName NVARCHAR(160),@OldPhone VARCHAR(16);
 SELECT @OldId=CustomerId,@OldName=DisplayName,@OldPhone=PhoneE164
 FROM core.Customer WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  AND ClientRequestId=@ClientRequestId;
 IF @OldId IS NOT NULL
 BEGIN
  IF @OldName<>@DisplayName OR ISNULL(@OldPhone,'''')<>ISNULL(@PhoneE164,'''')
   THROW 51133,''Idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created,
   CAST(NULL AS VARCHAR(36)) AS existingCustomerId,CAST(0 AS BIT) AS phoneConflict;
 END
 ELSE
 BEGIN
  IF @PhoneE164 IS NOT NULL
  BEGIN
   DECLARE @DupId UNIQUEIDENTIFIER;
   SELECT TOP(1) @DupId=CustomerId
   FROM core.Customer WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId
    AND IsActive=1 AND PhoneE164=@PhoneE164
   ORDER BY CreatedAtUtc,CustomerId;
   IF @DupId IS NOT NULL
   BEGIN
    -- Approved duplicate policy: refuse create; return existing id for operator select.
    -- No UNIQUE index yet — analyze real duplicates before adding a hard constraint.
    SELECT CONVERT(VARCHAR(36),@DupId) AS id,CAST(0 AS BIT) AS created,
     CONVERT(VARCHAR(36),@DupId) AS existingCustomerId,
     CAST(1 AS BIT) AS phoneConflict;
    COMMIT TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    RETURN;
   END
  END
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT INTO core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName,PhoneE164)
  VALUES(@TenantId,@BusinessId,@NewId,@ClientRequestId,@DisplayName,@PhoneE164);
  SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created,
   CAST(NULL AS VARCHAR(36)) AS existingCustomerId,CAST(0 AS BIT) AS phoneConflict;
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
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.Customer TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.SearchCustomers TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateCustomer TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCustomers TO [drvo_erp_stage_app];
END
