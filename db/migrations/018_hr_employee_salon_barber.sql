-- 018: Shared HR Employee core + Salon Barber extension, source-adapted Cashier.
-- Intentional internal pre-customer development only; ADR-039 backup/target
-- verification is required BEFORE any application to primary DRVO dev SQL.
-- NO attendance/payroll posting, Public Auth, finance, or real PII seeds.
CREATE TABLE core.HrEmployee (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 EmployeeId UNIQUEIDENTIFIER NOT NULL, ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 EmployeeCode VARCHAR(32) COLLATE Latin1_General_100_BIN2 NOT NULL,
 DisplayName NVARCHAR(160) NOT NULL,
 EmploymentType VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
 PayrollMethod VARCHAR(8) COLLATE Latin1_General_100_BIN2 NOT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_HrEmployee_Active DEFAULT(1),
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_HrEmployee_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_HrEmployee PRIMARY KEY(TenantId,BusinessId,EmployeeId),
 CONSTRAINT UQ_HrEmployee_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT UQ_HrEmployee_Code UNIQUE(TenantId,BusinessId,EmployeeCode),
 CONSTRAINT FK_HrEmployee_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT CK_HrEmployee_Code CHECK(
  LEN(EmployeeCode) BETWEEN 2 AND 32 AND
  EmployeeCode NOT LIKE '%[^A-Z0-9_-]%' COLLATE Latin1_General_100_BIN2),
 CONSTRAINT CK_HrEmployee_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 160),
 CONSTRAINT CK_HrEmployee_Employment CHECK(EmploymentType IN ('full_time','part_time','freelance')),
 CONSTRAINT CK_HrEmployee_Payroll CHECK(PayrollMethod IN ('hourly','daily','monthly')),
 CONSTRAINT CK_HrEmployee_Freelance CHECK(EmploymentType<>'freelance' OR PayrollMethod<>'monthly')
);
CREATE TABLE core.HrEmployeeBranch (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, EmployeeId UNIQUEIDENTIFIER NOT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_HrEmployeeBranch_Active DEFAULT(1),
 CONSTRAINT PK_HrEmployeeBranch PRIMARY KEY(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT FK_HrEmployeeBranch_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_HrEmployeeBranch_Employee FOREIGN KEY(TenantId,BusinessId,EmployeeId)
  REFERENCES core.HrEmployee(TenantId,BusinessId,EmployeeId)
);
CREATE INDEX IX_HrEmployeeBranch_List ON core.HrEmployeeBranch
 (TenantId,BusinessId,BranchId,IsActive,EmployeeId);
-- Salon extensions own only service/booking-specific staff configuration.
-- Employee identity and employment classification remain owned by HR Core.
CREATE TABLE core.SalonBarberProfile (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, EmployeeId UNIQUEIDENTIFIER NOT NULL,
 ResourceId UNIQUEIDENTIFIER NULL,
 IsBookable BIT NOT NULL CONSTRAINT DF_SalonBarber_Bookable DEFAULT(0),
 CONSTRAINT PK_SalonBarberProfile PRIMARY KEY(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT FK_SalonBarberProfile_EmployeeBranch FOREIGN KEY(TenantId,BusinessId,BranchId,EmployeeId)
  REFERENCES core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT FK_SalonBarberProfile_BookingResource FOREIGN KEY(TenantId,BusinessId,BranchId,ResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT CK_SalonBarberProfile_Resource CHECK(IsBookable=0 OR ResourceId IS NOT NULL)
);
CREATE UNIQUE INDEX UX_SalonBarberProfile_ActiveResource
 ON core.SalonBarberProfile(TenantId,BusinessId,BranchId,ResourceId)
 WHERE IsBookable=1 AND ResourceId IS NOT NULL;
CREATE TABLE core.SalonBarberMutation (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 EmployeeId UNIQUEIDENTIFIER NOT NULL,ResourceId UNIQUEIDENTIFIER NULL,
 IsBookable BIT NOT NULL,ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 ChangedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_SalonBarberMutation_Changed DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_SalonBarberMutation PRIMARY KEY(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_SalonBarberMutation_Employee FOREIGN KEY(TenantId,BusinessId,BranchId,EmployeeId)
  REFERENCES core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId)
);

EXEC(N'CREATE PROCEDURE core.AssertHrBranchAction
@TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''hr.read'',''hr.manage'',''salon.barber.manage'') OR NOT EXISTS (
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId AND bm.AccountId=a.AccountId AND bm.IsActive=1
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
  WHERE s.TenantId=@TenantId AND s.AccountId=@AccountId AND s.TokenHash=@TokenHash
   AND s.SessionVersion=@SessionVersion AND s.RevokedAtUtc IS NULL
   AND s.ExpiresAtUtc>SYSUTCDATETIME()
   AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId
 ) THROW 51181,''HR access denied'',1;
END
');

EXEC(N'CREATE PROCEDURE core.ReadHrBranchRoster
@TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''hr.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),e.EmployeeId) AS employeeId,
  e.EmployeeCode AS employeeCode,e.DisplayName AS displayName,
  e.EmploymentType AS employmentType,e.PayrollMethod AS payrollMethod,
  e.IsActive AS isActive,eb.IsActive AS branchActive,
  COALESCE(bp.IsBookable,CAST(0 AS BIT)) AS isBookable,
  CONVERT(VARCHAR(36),bp.ResourceId) AS resourceId,
  br.DisplayName AS resourceName
 FROM core.HrEmployeeBranch eb
 JOIN core.HrEmployee e ON e.TenantId=eb.TenantId AND e.BusinessId=eb.BusinessId
  AND e.EmployeeId=eb.EmployeeId
 LEFT JOIN core.SalonBarberProfile bp ON bp.TenantId=eb.TenantId AND bp.BusinessId=eb.BusinessId
  AND bp.BranchId=eb.BranchId AND bp.EmployeeId=eb.EmployeeId
 LEFT JOIN core.BookingResource br ON br.TenantId=bp.TenantId AND br.BusinessId=bp.BusinessId
  AND br.BranchId=bp.BranchId AND br.ResourceId=bp.ResourceId
 WHERE eb.TenantId=@TenantId AND eb.BusinessId=@BusinessId AND eb.BranchId=@BranchId
 ORDER BY e.DisplayName,e.EmployeeId;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED; THROW;
 END CATCH
END
');

EXEC(N'CREATE PROCEDURE core.CreateHrEmployee
@TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@EmployeeCode VARCHAR(32),@DisplayName NVARCHAR(160),
 @EmploymentType VARCHAR(10),@PayrollMethod VARCHAR(8)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''hr.manage'';
 IF @ClientRequestId IS NULL OR @EmployeeCode IS NULL OR
  LEN(@EmployeeCode) NOT BETWEEN 2 AND 32 OR
  @EmployeeCode LIKE ''%[^A-Z0-9_-]%'' COLLATE Latin1_General_100_BIN2 OR
  @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 160 OR
  @EmploymentType IS NULL OR @EmploymentType NOT IN (''full_time'',''part_time'',''freelance'') OR
  @PayrollMethod IS NULL OR @PayrollMethod NOT IN (''hourly'',''daily'',''monthly'') OR
  (@EmploymentType=''freelance'' AND @PayrollMethod=''monthly'')
  THROW 51182,''Invalid employee data'',1;
 SET @DisplayName=LTRIM(RTRIM(@DisplayName));
 DECLARE @Id UNIQUEIDENTIFIER,@Code VARCHAR(32),@Name NVARCHAR(160),
  @Type VARCHAR(10),@Method VARCHAR(8);
 SELECT @Id=EmployeeId,@Code=EmployeeCode,@Name=DisplayName,
  @Type=EmploymentType,@Method=PayrollMethod
 FROM core.HrEmployee WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @Code<>@EmployeeCode OR @Name<>@DisplayName OR
   @Type<>@EmploymentType OR @Method<>@PayrollMethod OR NOT EXISTS(
   SELECT 1 FROM core.HrEmployeeBranch WHERE TenantId=@TenantId
    AND BusinessId=@BusinessId AND BranchId=@BranchId AND EmployeeId=@Id
  ) THROW 51183,''Employee idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  IF EXISTS(SELECT 1 FROM core.HrEmployee WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND EmployeeCode=@EmployeeCode)
   THROW 51183,''Employee code already used'',1;
  SET @Id=NEWID();
  INSERT core.HrEmployee(TenantId,BusinessId,EmployeeId,ClientRequestId,EmployeeCode,
    DisplayName,EmploymentType,PayrollMethod)
   VALUES(@TenantId,@BusinessId,@Id,@ClientRequestId,@EmployeeCode,
    @DisplayName,@EmploymentType,@PayrollMethod);
  INSERT core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId)
   VALUES(@TenantId,@BusinessId,@BranchId,@Id);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END
');

EXEC(N'CREATE PROCEDURE core.SetSalonBarberProfile
@TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@EmployeeId UNIQUEIDENTIFIER,
 @ResourceId UNIQUEIDENTIFIER=NULL,@IsBookable BIT
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''salon.barber.manage'';
 IF @ClientRequestId IS NULL OR @EmployeeId IS NULL OR @IsBookable IS NULL OR
  (@IsBookable=1 AND @ResourceId IS NULL)
   THROW 51182,''Invalid barber profile'',1;
 IF NOT EXISTS(
  SELECT 1 FROM core.HrEmployeeBranch eb
  JOIN core.HrEmployee e ON e.TenantId=eb.TenantId AND e.BusinessId=eb.BusinessId
   AND e.EmployeeId=eb.EmployeeId
  WHERE eb.TenantId=@TenantId AND eb.BusinessId=@BusinessId
   AND eb.BranchId=@BranchId AND eb.EmployeeId=@EmployeeId
   AND eb.IsActive=1 AND e.IsActive=1
 ) THROW 51184,''Employee not assigned to branch'',1;
 IF @ResourceId IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM core.BookingResource
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId AND IsActive=1 AND Kind=''PERSON''
 ) THROW 51184,''Invalid branch barber resource'',1;
 DECLARE @PriorEmployee UNIQUEIDENTIFIER,@PriorResource UNIQUEIDENTIFIER,@PriorBookable BIT;
 SELECT @PriorEmployee=EmployeeId,@PriorResource=ResourceId,@PriorBookable=IsBookable
 FROM core.SalonBarberMutation WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  AND BranchId=@BranchId AND ClientRequestId=@ClientRequestId;
 IF @PriorEmployee IS NOT NULL BEGIN
  IF @PriorEmployee<>@EmployeeId OR
    ISNULL(CONVERT(VARCHAR(36),@PriorResource),'''')<>ISNULL(CONVERT(VARCHAR(36),@ResourceId),'''') OR
    @PriorBookable<>@IsBookable
   THROW 51183,''Barber idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@EmployeeId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  IF EXISTS(SELECT 1 FROM core.SalonBarberProfile WITH(UPDLOCK,HOLDLOCK)
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId
     AND BranchId=@BranchId AND EmployeeId=@EmployeeId)
   UPDATE core.SalonBarberProfile SET ResourceId=@ResourceId,IsBookable=@IsBookable
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId
     AND BranchId=@BranchId AND EmployeeId=@EmployeeId;
  ELSE INSERT core.SalonBarberProfile(TenantId,BusinessId,BranchId,EmployeeId,ResourceId,IsBookable)
   VALUES(@TenantId,@BusinessId,@BranchId,@EmployeeId,@ResourceId,@IsBookable);
  INSERT core.SalonBarberMutation(TenantId,BusinessId,BranchId,ClientRequestId,
    EmployeeId,ResourceId,IsBookable,ActorAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@ClientRequestId,@EmployeeId,
    @ResourceId,@IsBookable,@AccountId);
  SELECT CONVERT(VARCHAR(36),@EmployeeId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED; THROW;
 END CATCH
END
');

-- Runtime principal: strict EXECUTE-only, no direct HR/Barber table access.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.HrEmployee TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.HrEmployeeBranch TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.SalonBarberProfile TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.SalonBarberMutation TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadHrBranchRoster TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateHrEmployee TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.SetSalonBarberProfile TO [drvo_erp_stage_app];
END
