-- Shared Customers/CRM v0: Business-owned contact identity, NOT K5 Account.
-- No health/clinical records, no marketing consent assumption, no real customer seed.
CREATE TABLE core.Customer (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NOT NULL, ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DisplayName NVARCHAR(160) NOT NULL, PhoneE164 VARCHAR(16) NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_Customer_Active DEFAULT(1),
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_Customer_Created DEFAULT SYSUTCDATETIME(),
 RowVersion ROWVERSION NOT NULL,
 CONSTRAINT PK_Customer PRIMARY KEY(TenantId,BusinessId,CustomerId),
 CONSTRAINT UQ_Customer_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT FK_Customer_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT CK_Customer_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 160),
 CONSTRAINT CK_Customer_Phone CHECK(PhoneE164 IS NULL OR (
   LEN(PhoneE164) BETWEEN 8 AND 16 AND LEFT(PhoneE164,1)='+' AND
   SUBSTRING(PhoneE164,2,15) NOT LIKE '%[^0-9]%' COLLATE Latin1_General_100_BIN2
 ))
);
CREATE INDEX IX_Customer_Business_Name ON core.Customer(TenantId,BusinessId,DisplayName,CustomerId);

EXEC(N'CREATE PROCEDURE core.AssertCustomersBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''customers.read'',''customers.manage'') OR NOT EXISTS(
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
   AND bm.AccountId=a.AccountId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId
   AND b.BusinessId=bm.BusinessId AND b.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=b.TenantId
   AND ba.BusinessId=b.BusinessId AND ba.AccountId=a.AccountId AND ba.IsActive=1
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
 ) THROW 51131,''Access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadCustomers @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
 @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 SELECT TOP(200) CONVERT(VARCHAR(36),CustomerId) AS customerId,
  DisplayName AS displayName,PhoneE164 AS phoneE164,IsActive AS isActive
 FROM core.Customer
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND IsActive=1
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

EXEC(N'CREATE PROCEDURE core.CreateCustomer @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
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
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
 END
 ELSE
 BEGIN
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT INTO core.Customer(TenantId,BusinessId,CustomerId,ClientRequestId,DisplayName,PhoneE164)
  VALUES(@TenantId,@BusinessId,@NewId,@ClientRequestId,@DisplayName,@PhoneE164);
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
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.Customer TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCustomers TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateCustomer TO [drvo_erp_stage_app];
END
