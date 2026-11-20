-- SQL033: Booking reschedule / move (Cashier BK-06), additive, Booking-owned.
-- Adapted from Cashier pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef:
--   src/app/api/operations/bookings/[id]/reschedule/route.ts
--   src/app/api/operations/bookings/[id]/validate-move/route.ts
--   src/components/operations/BookingRescheduleConfirmDialog.tsx
-- Moves ONE existing BOOKED appointment to a new Resource and/or start, keeping its
-- original duration. Reuses the SQL013/015/016/017 resource lock order, overlap rule and
-- published-availability policy. SOURCE + disposable-SQL-CI only: no VPS/primary apply.
-- No POS/GL/payments/inventory/HR touched; nothing is sent to the customer (no
-- notification). Queue tickets are only READ as a guard, never mutated.

CREATE TABLE core.BookingReschedule (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 BookingId UNIQUEIDENTIFIER NOT NULL,
 FromResourceId UNIQUEIDENTIFIER NOT NULL,
 FromStartsAtUtc DATETIME2(0) NOT NULL,FromEndsAtUtc DATETIME2(0) NOT NULL,
 ToResourceId UNIQUEIDENTIFIER NOT NULL,
 ToStartsAtUtc DATETIME2(0) NOT NULL,ToEndsAtUtc DATETIME2(0) NOT NULL,
 ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 ChangedAtUtc DATETIME2(3) NOT NULL
  CONSTRAINT DF_BookingReschedule_Changed DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_BookingReschedule PRIMARY KEY(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_BookingReschedule_Booking FOREIGN KEY(TenantId,BusinessId,BranchId,BookingId)
  REFERENCES core.BookingAppointment(TenantId,BusinessId,BranchId,BookingId),
 CONSTRAINT FK_BookingReschedule_From FOREIGN KEY(TenantId,BusinessId,BranchId,FromResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT FK_BookingReschedule_To FOREIGN KEY(TenantId,BusinessId,BranchId,ToResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT FK_BookingReschedule_Actor FOREIGN KEY(TenantId,ActorAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_BookingReschedule_Times CHECK(
  FromEndsAtUtc>FromStartsAtUtc AND ToEndsAtUtc>ToStartsAtUtc)
);
CREATE INDEX IX_BookingReschedule_Booking ON core.BookingReschedule
 (TenantId,BusinessId,BranchId,BookingId,ChangedAtUtc);

-- @Validate=1 is the Cashier "validate-move" equivalent: every check runs, nothing is
-- written or recorded and no idempotency key is needed. @Validate=0 performs the move.
EXEC(N'CREATE PROCEDURE core.RescheduleBookingAppointment
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@BookingId UNIQUEIDENTIFIER,
 @ResourceId UNIQUEIDENTIFIER,@StartsAtUtc DATETIME2(0),@Validate BIT
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
  @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.manage'';
 IF @BookingId IS NULL OR @ResourceId IS NULL OR @StartsAtUtc IS NULL OR @Validate IS NULL
  OR (@Validate=0 AND @ClientRequestId IS NULL)
  THROW 51154,''Invalid reschedule request'',1;
 DECLARE @PriorBooking UNIQUEIDENTIFIER,@PriorResource UNIQUEIDENTIFIER,
  @PriorStart DATETIME2(0),@PriorEnd DATETIME2(0);
 IF @Validate=0
  SELECT @PriorBooking=BookingId,@PriorResource=ToResourceId,
   @PriorStart=ToStartsAtUtc,@PriorEnd=ToEndsAtUtc
  FROM core.BookingReschedule WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ClientRequestId=@ClientRequestId;
 IF @PriorBooking IS NOT NULL
 BEGIN
  IF @PriorBooking<>@BookingId OR @PriorResource<>@ResourceId OR @PriorStart<>@StartsAtUtc
   THROW 51152,''Idempotency request changed'',1;
  SELECT CONVERT(VARCHAR(36),@BookingId) AS id,CONVERT(VARCHAR(36),@PriorResource) AS resourceId,
   @PriorStart AS startsAtUtc,@PriorEnd AS endsAtUtc,CAST(0 AS BIT) AS changed,
   CAST(0 AS BIT) AS validateOnly;
 END
 ELSE
 BEGIN
  IF @StartsAtUtc<DATEADD(MINUTE,5,SYSUTCDATETIME())
   OR @StartsAtUtc>DATEADD(YEAR,1,SYSUTCDATETIME())
   THROW 51154,''Appointment must move to a valid future window'',1;
  -- Resource identity is only a selector until locks are held; never authorization.
  DECLARE @OldResource UNIQUEIDENTIFIER,@Starts DATETIME2(0),@Ends DATETIME2(0),
   @Status VARCHAR(12);
  SELECT @OldResource=ResourceId FROM core.BookingAppointment
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND BookingId=@BookingId;
  IF @OldResource IS NULL THROW 51156,''Appointment not found'',1;
  -- Deterministic lock order on the (up to two) scoped Resource rows so two opposite
  -- moves cannot deadlock; same row lock family as SQL013/015/016/017 writers.
  DECLARE @First UNIQUEIDENTIFIER=CASE WHEN @OldResource<=@ResourceId
   THEN @OldResource ELSE @ResourceId END;
  DECLARE @Second UNIQUEIDENTIFIER=CASE WHEN @OldResource<=@ResourceId
   THEN @ResourceId ELSE @OldResource END;
  IF NOT EXISTS(SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@First)
   THROW 51154,''Invalid resource'',1;
  IF @Second<>@First AND NOT EXISTS(SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@Second)
   THROW 51154,''Invalid resource'',1;
  DECLARE @CurResource UNIQUEIDENTIFIER;
  SELECT @CurResource=ResourceId,@Starts=StartsAtUtc,@Ends=EndsAtUtc,@Status=Status
  FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND BookingId=@BookingId;
  IF @CurResource IS NULL THROW 51156,''Appointment not found'',1;
  IF @CurResource<>@OldResource THROW 51155,''Booking changed concurrently'',1;
  IF @Status<>''BOOKED'' THROW 51155,''Booking is already final'',1;
  IF @Starts<=SYSUTCDATETIME() THROW 51155,''A started booking cannot be moved'',1;
  -- Queue ownership: a live ticket was created from this booking; moving it would
  -- silently desynchronize the Queue. The operator must resolve the ticket first.
  IF EXISTS(SELECT 1 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND BookingId=@BookingId AND Status IN(''WAITING'',''CALLED'',''IN_SERVICE''))
   THROW 51158,''Booking has an active queue ticket'',1;
  IF NOT EXISTS(SELECT 1 FROM core.BookingResource
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND IsActive=1)
   THROW 51154,''Invalid resource'',1;
  IF @CurResource=@ResourceId AND @Starts=@StartsAtUtc
   THROW 51154,''Booking is already at the requested time and resource'',1;
  -- Original duration is preserved; the move never re-reads or reprices the service.
  DECLARE @NewEnds DATETIME2(0)=DATEADD(MINUTE,DATEDIFF(MINUTE,@Starts,@Ends),@StartsAtUtc);
  -- Same optional published-availability policy as the SQL016/017 insert trigger
  -- (triggers on INSERT only, so a move must re-enforce it explicitly).
  IF EXISTS(SELECT 1 FROM core.BookingResourceWindow
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId)
   AND NOT EXISTS(SELECT 1 FROM core.BookingResourceWindow
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND State=''OPEN''
    AND StartsAtUtc<=@StartsAtUtc AND EndsAtUtc>=@NewEnds)
   THROW 51157,''Booking outside resource published availability'',1;
  -- Overlap excludes the appointment being moved so shifting inside its own slot works.
  IF EXISTS(SELECT 1 FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status=''BOOKED'' AND BookingId<>@BookingId
    AND StartsAtUtc<@NewEnds AND EndsAtUtc>@StartsAtUtc)
   THROW 51153,''Resource busy'',1;
  IF @Validate=1
   SELECT CONVERT(VARCHAR(36),@BookingId) AS id,CONVERT(VARCHAR(36),@ResourceId) AS resourceId,
    @StartsAtUtc AS startsAtUtc,@NewEnds AS endsAtUtc,CAST(0 AS BIT) AS changed,
    CAST(1 AS BIT) AS validateOnly;
  ELSE
  BEGIN
   UPDATE core.BookingAppointment
   SET ResourceId=@ResourceId,StartsAtUtc=@StartsAtUtc,EndsAtUtc=@NewEnds
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND BookingId=@BookingId AND Status=''BOOKED'';
   IF @@ROWCOUNT<>1 THROW 51155,''Booking changed concurrently'',1;
   INSERT core.BookingReschedule(
    TenantId,BusinessId,BranchId,ClientRequestId,BookingId,
    FromResourceId,FromStartsAtUtc,FromEndsAtUtc,
    ToResourceId,ToStartsAtUtc,ToEndsAtUtc,ActorAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@ClientRequestId,@BookingId,
    @CurResource,@Starts,@Ends,@ResourceId,@StartsAtUtc,@NewEnds,@AccountId);
   SELECT CONVERT(VARCHAR(36),@BookingId) AS id,CONVERT(VARCHAR(36),@ResourceId) AS resourceId,
    @StartsAtUtc AS startsAtUtc,@NewEnds AS endsAtUtc,CAST(1 AS BIT) AS changed,
    CAST(0 AS BIT) AS validateOnly;
  END
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
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingReschedule TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.RescheduleBookingAppointment TO [drvo_erp_stage_app];
END
