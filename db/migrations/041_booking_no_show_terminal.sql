-- SQL041 Shared Booking: persisted NO_SHOW from Cashier source 
-- Cashier f8fa67d src/app/api/bookings/[id]/route.ts PATCH action=no_show.
-- K5 Tenant/Business/Branch guard, serializable resource lock, idempotency, audit.
-- Reject future no-show and active Queue booking tickets; never write Queue/HR/POS/GL.
-- No VPS/Cut application without separate authorization, backup and owner acceptance.
ALTER TABLE core.BookingAppointment DROP CONSTRAINT CK_BookingAppointment_Status;
ALTER TABLE core.BookingAppointment WITH CHECK ADD CONSTRAINT CK_BookingAppointment_Status
 CHECK(Status IN ('BOOKED','CANCELLED','COMPLETED','NO_SHOW'));

ALTER TABLE core.BookingStatusChange DROP CONSTRAINT CK_BookingStatusChange_Target;
ALTER TABLE core.BookingStatusChange WITH CHECK ADD CONSTRAINT CK_BookingStatusChange_Target
 CHECK(TargetStatus IN ('CANCELLED','COMPLETED','NO_SHOW'));

EXEC(N'ALTER PROCEDURE core.ChangeBookingAppointmentStatus
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
   @TargetStatus IS NULL OR @TargetStatus NOT IN (''CANCELLED'',''COMPLETED'',''NO_SHOW'')
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
  -- An arrived/queued guest cannot be marked absent until Queue resolves the ticket.
  IF @TargetStatus=''NO_SHOW'' AND EXISTS (
   SELECT 1 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND BookingId=@BookingId AND Status IN (''WAITING'',''CALLED'',''IN_SERVICE'')
  ) THROW 51158,''Active queue ticket prevents Booking no-show'',1;
  IF @TargetStatus IN (''COMPLETED'',''NO_SHOW'') AND @StartsAtUtc>SYSUTCDATETIME()
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
