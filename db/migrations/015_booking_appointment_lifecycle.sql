-- Shared Booking v1: terminal appointment transitions, authored only by Booking.
-- New migration 015; NO VPS SQL application without K5F/offsite restore approval.
-- DRAFT/POS/GL/Payments/HR/Inventory remain untouched.
ALTER TABLE core.BookingAppointment DROP CONSTRAINT CK_BookingAppointment_Status;
ALTER TABLE core.BookingAppointment ADD CONSTRAINT CK_BookingAppointment_Status
 CHECK(Status IN ('BOOKED','CANCELLED','COMPLETED'));

CREATE TABLE core.BookingStatusChange (
 TenantId UNIQUEIDENTIFIER NOT NULL, BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL, ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 BookingId UNIQUEIDENTIFIER NOT NULL,
 TargetStatus VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
 ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 ChangedAtUtc DATETIME2(3) NOT NULL
  CONSTRAINT DF_BookingStatusChange_Changed DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_BookingStatusChange PRIMARY KEY
  (TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingStatusChange_Booking FOREIGN KEY
  (TenantId,BusinessId,BranchId,BookingId)
  REFERENCES core.BookingAppointment(TenantId,BusinessId,BranchId,BookingId),
 CONSTRAINT CK_BookingStatusChange_Target
  CHECK(TargetStatus IN ('CANCELLED','COMPLETED'))
);
CREATE INDEX IX_BookingStatusChange_Booking ON core.BookingStatusChange
 (TenantId,BusinessId,BranchId,BookingId,ChangedAtUtc);

EXEC(N'CREATE PROCEDURE core.ChangeBookingAppointmentStatus
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@BookingId UNIQUEIDENTIFIER,
 @TargetStatus VARCHAR(12)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
  @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 IF @ClientRequestId IS NULL OR @BookingId IS NULL OR
   @TargetStatus IS NULL OR @TargetStatus NOT IN (''CANCELLED'',''COMPLETED'')
  THROW 51154,''Invalid booking state request'',1;
 DECLARE @PriorBooking UNIQUEIDENTIFIER,@PriorTarget VARCHAR(12);
 SELECT @PriorBooking=BookingId,@PriorTarget=TargetStatus
 FROM core.BookingStatusChange WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorBooking IS NOT NULL
 BEGIN
  IF @PriorBooking<>@BookingId OR @PriorTarget<>@TargetStatus
   THROW 51152,''Idempotency request changed'',1;
  SELECT CONVERT(VARCHAR(36),@BookingId) AS id,@TargetStatus AS status,
   CAST(0 AS BIT) AS changed;
 END
 ELSE
 BEGIN
  -- Take the same scoped Resource lock as CreateBookingAppointment BEFORE
  -- mutating an appointment, so cancel/create races serialize per resource.
  DECLARE @ResourceId UNIQUEIDENTIFIER,@OldStatus VARCHAR(12),@StartsAtUtc DATETIME2(0);
  SELECT @ResourceId=ResourceId FROM core.BookingAppointment
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND BranchId=@BranchId AND BookingId=@BookingId;
  IF @ResourceId IS NULL THROW 51156,''Appointment not found'',1;
  IF NOT EXISTS(
   SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId
    AND BranchId=@BranchId AND ResourceId=@ResourceId
  ) THROW 51156,''Resource not found'',1;
  SELECT @OldStatus=Status,@StartsAtUtc=StartsAtUtc
  FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND BranchId=@BranchId AND BookingId=@BookingId;
  IF @OldStatus<>''BOOKED'' THROW 51155,''Booking is already final'',1;
  IF @TargetStatus=''COMPLETED'' AND @StartsAtUtc>SYSUTCDATETIME()
   THROW 51155,''Cannot complete a future booking'',1;
  UPDATE core.BookingAppointment SET Status=@TargetStatus
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND BranchId=@BranchId AND BookingId=@BookingId AND Status=''BOOKED'';
  IF @@ROWCOUNT<>1 THROW 51155,''Booking changed concurrently'',1;
  INSERT core.BookingStatusChange(
   TenantId,BusinessId,BranchId,ClientRequestId,BookingId,TargetStatus,ActorAccountId
  ) VALUES(
   @TenantId,@BusinessId,@BranchId,@ClientRequestId,@BookingId,@TargetStatus,@AccountId
  );
  SELECT CONVERT(VARCHAR(36),@BookingId) AS id,@TargetStatus AS status,
   CAST(1 AS BIT) AS changed;
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
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.BookingStatusChange TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ChangeBookingAppointmentStatus TO [drvo_erp_stage_app];
END
