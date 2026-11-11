-- Shared Booking/Queue v0: appointment for a Branch Resource, Customer and SERVICE.
-- Core never models Salon-specific HR Employee or independent Service Execution.
-- NO SQL 010-013 on VPS without separate explicit security+backup sign-off.
CREATE TABLE core.BookingResource (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, ResourceId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DisplayName NVARCHAR(100) NOT NULL,
 Kind VARCHAR(9) COLLATE Latin1_General_100_BIN2 NOT NULL,
 IsActive BIT NOT NULL CONSTRAINT DF_BookingResource_Active DEFAULT(1),
 CONSTRAINT PK_BookingResource PRIMARY KEY(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT UQ_BookingResource_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingResource_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT CK_BookingResource_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 100),
 CONSTRAINT CK_BookingResource_Kind CHECK(Kind IN ('PERSON','ROOM','EQUIPMENT','CHAIR'))
);
CREATE TABLE core.BookingAppointment (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, BookingId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NOT NULL, OfferingId UNIQUEIDENTIFIER NOT NULL,
 ResourceId UNIQUEIDENTIFIER NOT NULL,
 StartsAtUtc DATETIME2(0) NOT NULL, EndsAtUtc DATETIME2(0) NOT NULL,
 Status VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BookingCreated DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_BookingAppointment PRIMARY KEY(TenantId,BusinessId,BranchId,BookingId),
 CONSTRAINT UQ_BookingAppointment_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingAppointment_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_BookingAppointment_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
  REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_BookingAppointment_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT FK_BookingAppointment_Resource FOREIGN KEY(TenantId,BusinessId,BranchId,ResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT CK_BookingAppointment_Status CHECK(Status='BOOKED'),
 CONSTRAINT CK_BookingAppointment_Time CHECK(
  EndsAtUtc>StartsAtUtc AND DATEDIFF(MINUTE,StartsAtUtc,EndsAtUtc) BETWEEN 1 AND 1440)
);
CREATE INDEX IX_BookingAppointment_ResourceRange
 ON core.BookingAppointment(TenantId,BusinessId,BranchId,ResourceId,StartsAtUtc)
 INCLUDE(EndsAtUtc,Status);
CREATE INDEX IX_BookingAppointment_BranchTime
 ON core.BookingAppointment(TenantId,BusinessId,BranchId,StartsAtUtc);

EXEC(N'CREATE PROCEDURE core.AssertBookingBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''booking.read'',''booking.manage'') OR NOT EXISTS(
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
   AND bm.AccountId=a.AccountId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId AND b.BusinessId=bm.BusinessId AND b.IsActive=1
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
 ) THROW 51151,''Access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadBranchBooking @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
 @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.read'';
 SELECT CONVERT(VARCHAR(36),r.ResourceId) AS resourceId,
  r.DisplayName AS displayName,r.Kind AS kind,r.IsActive AS isActive
 FROM core.BookingResource r
 WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId AND r.BranchId=@BranchId
 ORDER BY r.DisplayName,r.ResourceId;
 SELECT TOP(200) CONVERT(VARCHAR(36),b.BookingId) AS bookingId,
  CONVERT(VARCHAR(36),b.CustomerId) AS customerId,
  CONVERT(VARCHAR(36),b.OfferingId) AS offeringId,
  CONVERT(VARCHAR(36),b.ResourceId) AS resourceId,
  c.DisplayName AS customerName,o.DisplayName AS offeringName,
  r.DisplayName AS resourceName,b.StartsAtUtc AS startsAtUtc,
  b.EndsAtUtc AS endsAtUtc,b.Status AS status
 FROM core.BookingAppointment b
 JOIN core.Customer c ON c.TenantId=b.TenantId
  AND c.BusinessId=b.BusinessId AND c.CustomerId=b.CustomerId
 JOIN core.CatalogOffering o ON o.TenantId=b.TenantId
  AND o.BusinessId=b.BusinessId AND o.OfferingId=b.OfferingId
 JOIN core.BookingResource r ON r.TenantId=b.TenantId
  AND r.BusinessId=b.BusinessId AND r.BranchId=b.BranchId AND r.ResourceId=b.ResourceId
 WHERE b.TenantId=@TenantId AND b.BusinessId=@BusinessId AND b.BranchId=@BranchId
 ORDER BY b.StartsAtUtc DESC,b.BookingId;
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateBookingResource @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DisplayName NVARCHAR(100),@Kind VARCHAR(9)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
 @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 IF @DisplayName IS NULL OR LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 100
  OR @Kind NOT IN (''PERSON'',''ROOM'',''EQUIPMENT'',''CHAIR'')
  THROW 51154,''Invalid resource'',1;
 SET @DisplayName=LTRIM(RTRIM(@DisplayName));
 DECLARE @OldId UNIQUEIDENTIFIER,@OldName NVARCHAR(100),@OldKind VARCHAR(9);
 SELECT @OldId=ResourceId,@OldName=DisplayName,@OldKind=Kind
 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId
  AND BranchId=@BranchId AND ClientRequestId=@ClientRequestId;
 IF @OldId IS NOT NULL
 BEGIN
  IF @OldName<>@DisplayName OR @OldKind<>@Kind THROW 51152,''Idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
 END
 ELSE
 BEGIN
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT core.BookingResource(
   TenantId,BusinessId,BranchId,ResourceId,ClientRequestId,DisplayName,Kind
  ) VALUES(@TenantId,@BusinessId,@BranchId,@NewId,@ClientRequestId,@DisplayName,@Kind);
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

EXEC(N'CREATE PROCEDURE core.CreateBookingAppointment @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,
 @CustomerId UNIQUEIDENTIFIER,@OfferingId UNIQUEIDENTIFIER,
 @ResourceId UNIQUEIDENTIFIER,@StartsAtUtc DATETIME2(0)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
 @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 DECLARE @OldId UNIQUEIDENTIFIER,@OldCustomer UNIQUEIDENTIFIER,
  @OldOffering UNIQUEIDENTIFIER,@OldResource UNIQUEIDENTIFIER,@OldStart DATETIME2(0);
 SELECT @OldId=BookingId,@OldCustomer=CustomerId,@OldOffering=OfferingId,
  @OldResource=ResourceId,@OldStart=StartsAtUtc
 FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @OldId IS NOT NULL
 BEGIN
  IF @OldCustomer<>@CustomerId OR @OldOffering<>@OfferingId OR
   @OldResource<>@ResourceId OR @OldStart<>@StartsAtUtc
   THROW 51152,''Idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
 END
 ELSE
 BEGIN
  IF @StartsAtUtc IS NULL OR @StartsAtUtc<DATEADD(MINUTE,5,SYSUTCDATETIME())
   OR @StartsAtUtc>DATEADD(YEAR,1,SYSUTCDATETIME())
   THROW 51154,''Appointment must be in a valid future window'',1;
  IF NOT EXISTS(SELECT 1 FROM core.Customer
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId AND IsActive=1)
   THROW 51154,''Invalid customer'',1;
  DECLARE @Duration INT;
  SELECT @Duration=DurationMinutes FROM core.CatalogOffering
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND OfferingId=@OfferingId AND IsActive=1 AND Kind=''SERVICE'';
  IF @Duration IS NULL OR @Duration NOT BETWEEN 1 AND 1440
   THROW 51154,''Invalid service'',1;
  DECLARE @EndsAtUtc DATETIME2(0)=DATEADD(MINUTE,@Duration,@StartsAtUtc);
  -- Exclusive lock on the exact scoped Resource serializes all booking
  -- writers for this resource, preventing concurrent overlapping inserts.
  IF NOT EXISTS(SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND IsActive=1)
   THROW 51154,''Invalid resource'',1;
  IF EXISTS(SELECT 1 FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status=''BOOKED''
    AND StartsAtUtc<@EndsAtUtc AND EndsAtUtc>@StartsAtUtc)
   THROW 51153,''Resource busy'',1;
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT core.BookingAppointment(
   TenantId,BusinessId,BranchId,BookingId,ClientRequestId,
   CustomerId,OfferingId,ResourceId,StartsAtUtc,EndsAtUtc,Status
  ) VALUES(@TenantId,@BusinessId,@BranchId,@NewId,@ClientRequestId,
   @CustomerId,@OfferingId,@ResourceId,@StartsAtUtc,@EndsAtUtc,''BOOKED'');
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
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.BookingResource TO [drvo_erp_stage_app];
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.BookingAppointment TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadBranchBooking TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateBookingResource TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateBookingAppointment TO [drvo_erp_stage_app];
END
