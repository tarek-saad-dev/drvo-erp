-- SQL026: Salon Queue Extension — walk-in tickets + Booking arrive handoff.
-- Shared Booking remains appointment owner; Queue never posts sale/Treasury/GL (ADR-031).
-- Source contracts: Cashier queueLifecycleEngine / operations queue create (pin 046bf19).
-- Primary/VPS apply only after backup + 001–025 verification.
CREATE TABLE core.QueueTicket (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,TicketId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 TicketCode VARCHAR(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
 CustomerId UNIQUEIDENTIFIER NULL,ResourceId UNIQUEIDENTIFIER NULL,
 OfferingId UNIQUEIDENTIFIER NULL,BookingId UNIQUEIDENTIFIER NULL,
 DurationMinutes INT NOT NULL,
 ExpectedStartAtUtc DATETIME2(0) NOT NULL,ExpectedEndAtUtc DATETIME2(0) NOT NULL,
 Status VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_QueueTicket_Status DEFAULT('WAITING'),
 Source VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_QueueTicket_Created DEFAULT SYSUTCDATETIME(),
 CalledAtUtc DATETIME2(3) NULL,ServiceStartedAtUtc DATETIME2(3) NULL,
 ServiceEndedAtUtc DATETIME2(3) NULL,CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_QueueTicket PRIMARY KEY(TenantId,BusinessId,BranchId,TicketId),
 CONSTRAINT UQ_QueueTicket_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT UQ_QueueTicket_Code UNIQUE(TenantId,BusinessId,BranchId,TicketCode),
 CONSTRAINT FK_QueueTicket_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_QueueTicket_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
  REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_QueueTicket_Resource FOREIGN KEY(TenantId,BusinessId,BranchId,ResourceId)
  REFERENCES core.BookingResource(TenantId,BusinessId,BranchId,ResourceId),
 CONSTRAINT FK_QueueTicket_Offering FOREIGN KEY(TenantId,BusinessId,OfferingId)
  REFERENCES core.CatalogOffering(TenantId,BusinessId,OfferingId),
 CONSTRAINT FK_QueueTicket_Booking FOREIGN KEY(TenantId,BusinessId,BranchId,BookingId)
  REFERENCES core.BookingAppointment(TenantId,BusinessId,BranchId,BookingId),
 CONSTRAINT FK_QueueTicket_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_QueueTicket_Duration CHECK(DurationMinutes BETWEEN 5 AND 480),
 CONSTRAINT CK_QueueTicket_Time CHECK(ExpectedEndAtUtc>ExpectedStartAtUtc
  AND DATEDIFF(MINUTE,ExpectedStartAtUtc,ExpectedEndAtUtc)=DurationMinutes),
 CONSTRAINT CK_QueueTicket_Status CHECK(Status IN(
  'WAITING','CALLED','IN_SERVICE','DONE','CANCELLED','NO_SHOW')),
 CONSTRAINT CK_QueueTicket_Source CHECK(Source IN('WALK_IN','BOOKING_HANDOFF')),
 CONSTRAINT CK_QueueTicket_SourceShape CHECK(
  (Source='WALK_IN' AND BookingId IS NULL) OR
  (Source='BOOKING_HANDOFF' AND BookingId IS NOT NULL AND CustomerId IS NOT NULL
   AND ResourceId IS NOT NULL AND OfferingId IS NOT NULL))
);
CREATE UNIQUE INDEX UX_QueueTicket_ActiveBooking
 ON core.QueueTicket(TenantId,BusinessId,BranchId,BookingId)
 WHERE BookingId IS NOT NULL AND Status IN('WAITING','CALLED','IN_SERVICE');
CREATE INDEX IX_QueueTicket_BranchRecent
 ON core.QueueTicket(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,TicketId DESC);
CREATE INDEX IX_QueueTicket_ResourceActive
 ON core.QueueTicket(TenantId,BusinessId,BranchId,ResourceId,ExpectedStartAtUtc)
 INCLUDE(ExpectedEndAtUtc,Status,DurationMinutes);

CREATE TABLE core.QueueTicketMutation (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 TicketId UNIQUEIDENTIFIER NOT NULL,
 TargetStatus VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL,
 ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 AtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_QueueTicketMutation_At DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_QueueTicketMutation PRIMARY KEY(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_QueueTicketMutation_Ticket FOREIGN KEY(TenantId,BusinessId,BranchId,TicketId)
  REFERENCES core.QueueTicket(TenantId,BusinessId,BranchId,TicketId),
 CONSTRAINT FK_QueueTicketMutation_Actor FOREIGN KEY(TenantId,ActorAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_QueueTicketMutation_Target CHECK(TargetStatus IN(
  'WAITING','CALLED','IN_SERVICE','DONE','CANCELLED','NO_SHOW'))
);
CREATE INDEX IX_QueueTicketMutation_Ticket
 ON core.QueueTicketMutation(TenantId,BusinessId,BranchId,TicketId,AtUtc);

EXEC(N'CREATE PROCEDURE core.AssertQueueBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''queue.read'',''queue.manage'') OR NOT EXISTS (
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
   AND bm.AccountId=a.AccountId AND bm.IsActive=1
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
  WHERE s.TenantId=@TenantId AND s.AccountId=@AccountId
   AND s.TokenHash=@TokenHash AND s.SessionVersion=@SessionVersion
   AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
   AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId
 ) THROW 51451,''Queue access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadBranchQueue
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertQueueBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''queue.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),q.TicketId) AS ticketId,q.TicketCode AS ticketCode,
  CONVERT(VARCHAR(36),q.CustomerId) AS customerId,
  CONVERT(VARCHAR(36),q.ResourceId) AS resourceId,
  CONVERT(VARCHAR(36),q.OfferingId) AS offeringId,
  CONVERT(VARCHAR(36),q.BookingId) AS bookingId,
  ISNULL(c.DisplayName,N'''') AS customerName,
  ISNULL(r.DisplayName,N'''') AS resourceName,
  ISNULL(o.DisplayName,N'''') AS offeringName,
  q.DurationMinutes AS durationMinutes,
  q.ExpectedStartAtUtc AS expectedStartAtUtc,q.ExpectedEndAtUtc AS expectedEndAtUtc,
  q.Status AS status,q.Source AS source,q.CreatedAtUtc AS createdAtUtc
 FROM core.QueueTicket q
 LEFT JOIN core.Customer c ON c.TenantId=q.TenantId AND c.BusinessId=q.BusinessId
  AND c.CustomerId=q.CustomerId
 LEFT JOIN core.BookingResource r ON r.TenantId=q.TenantId AND r.BusinessId=q.BusinessId
  AND r.BranchId=q.BranchId AND r.ResourceId=q.ResourceId
 LEFT JOIN core.CatalogOffering o ON o.TenantId=q.TenantId AND o.BusinessId=q.BusinessId
  AND o.OfferingId=q.OfferingId
 WHERE q.TenantId=@TenantId AND q.BusinessId=@BusinessId AND q.BranchId=@BranchId
 ORDER BY q.CreatedAtUtc DESC,q.TicketId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateQueueTicket
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@CustomerId UNIQUEIDENTIFIER,
 @ResourceId UNIQUEIDENTIFIER,@OfferingId UNIQUEIDENTIFIER,
 @DurationMinutes INT,@ExpectedStartAtUtc DATETIME2(0)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertQueueBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''queue.manage'';
 IF @ClientRequestId IS NULL OR @ResourceId IS NULL OR @DurationMinutes IS NULL
  OR @DurationMinutes NOT BETWEEN 5 AND 480 OR @ExpectedStartAtUtc IS NULL
  THROW 51452,''Invalid queue ticket'',1;
 IF @CustomerId IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM core.Customer WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND CustomerId=@CustomerId AND IsActive=1)
  THROW 51454,''Queue customer unavailable'',1;
 IF NOT EXISTS(
  SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ResourceId=@ResourceId AND IsActive=1)
  THROW 51454,''Queue resource unavailable'',1;
 IF @OfferingId IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM core.CatalogOffering
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND OfferingId=@OfferingId
   AND Kind=''SERVICE'' AND IsActive=1)
  THROW 51454,''Queue offering unavailable'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorCustomer UNIQUEIDENTIFIER,@PriorResource UNIQUEIDENTIFIER,
  @PriorOffering UNIQUEIDENTIFIER,@PriorDuration INT,@PriorStart DATETIME2(0),
  @Ends DATETIME2(0),@Code VARCHAR(24);
 SET @Ends=DATEADD(MINUTE,@DurationMinutes,@ExpectedStartAtUtc);
 SELECT @Id=TicketId,@PriorCustomer=CustomerId,@PriorResource=ResourceId,
  @PriorOffering=OfferingId,@PriorDuration=DurationMinutes,@PriorStart=ExpectedStartAtUtc
 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF ISNULL(@PriorCustomer,''00000000-0000-0000-0000-000000000000'')
     <>ISNULL(@CustomerId,''00000000-0000-0000-0000-000000000000'')
   OR @PriorResource<>@ResourceId
   OR ISNULL(@PriorOffering,''00000000-0000-0000-0000-000000000000'')
     <>ISNULL(@OfferingId,''00000000-0000-0000-0000-000000000000'')
   OR @PriorDuration<>@DurationMinutes OR @PriorStart<>@ExpectedStartAtUtc
   THROW 51453,''Queue ticket replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  IF EXISTS(
   SELECT 1 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status IN(''WAITING'',''CALLED'',''IN_SERVICE'')
    AND ExpectedStartAtUtc<@Ends AND ExpectedEndAtUtc>@ExpectedStartAtUtc)
   THROW 51455,''Queue resource conflict'',1;
  IF EXISTS(
   SELECT 1 FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status=''BOOKED''
    AND StartsAtUtc<@Ends AND EndsAtUtc>@ExpectedStartAtUtc)
   THROW 51455,''Queue conflicts with booked appointment'',1;
  SET @Id=NEWID();
  SET @Code=''Q-''+UPPER(REPLACE(LEFT(CONVERT(VARCHAR(36),@Id),8),''-'',''''));
  INSERT core.QueueTicket(TenantId,BusinessId,BranchId,TicketId,ClientRequestId,TicketCode,
   CustomerId,ResourceId,OfferingId,BookingId,DurationMinutes,ExpectedStartAtUtc,
   ExpectedEndAtUtc,Status,Source,CreatedByAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@Code,
    @CustomerId,@ResourceId,@OfferingId,NULL,@DurationMinutes,@ExpectedStartAtUtc,
    @Ends,''WAITING'',''WALK_IN'',@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateQueueTicketFromBooking
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@BookingId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertQueueBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''queue.manage'';
 IF @ClientRequestId IS NULL OR @BookingId IS NULL
  THROW 51452,''Invalid booking queue handoff'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorBooking UNIQUEIDENTIFIER,@CustomerId UNIQUEIDENTIFIER,
  @ResourceId UNIQUEIDENTIFIER,@OfferingId UNIQUEIDENTIFIER,@Starts DATETIME2(0),
  @Ends DATETIME2(0),@Duration INT,@Code VARCHAR(24),@Status VARCHAR(12);
 SELECT @Id=TicketId,@PriorBooking=BookingId FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorBooking<>@BookingId THROW 51453,''Queue handoff replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  SELECT @CustomerId=CustomerId,@ResourceId=ResourceId,@OfferingId=OfferingId,
   @Starts=StartsAtUtc,@Ends=EndsAtUtc,@Status=Status
  FROM core.BookingAppointment WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND BookingId=@BookingId;
  IF @CustomerId IS NULL THROW 51454,''Booking unavailable for queue handoff'',1;
  IF @Status<>''BOOKED'' THROW 51456,''Booking is not active for handoff'',1;
  SET @Duration=DATEDIFF(MINUTE,@Starts,@Ends);
  IF @Duration NOT BETWEEN 5 AND 480 THROW 51452,''Invalid booking duration for queue'',1;
  IF NOT EXISTS(
   SELECT 1 FROM core.BookingResource WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND IsActive=1)
   THROW 51454,''Queue resource unavailable'',1;
  IF EXISTS(
   SELECT 1 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND BookingId=@BookingId AND Status IN(''WAITING'',''CALLED'',''IN_SERVICE''))
   THROW 51453,''Booking already handed to queue'',1;
  IF EXISTS(
   SELECT 1 FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND ResourceId=@ResourceId AND Status IN(''WAITING'',''CALLED'',''IN_SERVICE'')
    AND ExpectedStartAtUtc<@Ends AND ExpectedEndAtUtc>@Starts)
   THROW 51455,''Queue resource conflict'',1;
  SET @Id=NEWID();
  SET @Code=''Q-''+UPPER(REPLACE(LEFT(CONVERT(VARCHAR(36),@Id),8),''-'',''''));
  INSERT core.QueueTicket(TenantId,BusinessId,BranchId,TicketId,ClientRequestId,TicketCode,
   CustomerId,ResourceId,OfferingId,BookingId,DurationMinutes,ExpectedStartAtUtc,
   ExpectedEndAtUtc,Status,Source,CreatedByAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@Code,
    @CustomerId,@ResourceId,@OfferingId,@BookingId,@Duration,@Starts,@Ends,
    ''WAITING'',''BOOKING_HANDOFF'',@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.ChangeQueueTicketStatus
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@TicketId UNIQUEIDENTIFIER,@TargetStatus VARCHAR(12)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertQueueBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''queue.manage'';
 IF @ClientRequestId IS NULL OR @TicketId IS NULL OR @TargetStatus IS NULL
  OR @TargetStatus NOT IN(''CALLED'',''IN_SERVICE'',''DONE'',''CANCELLED'',''NO_SHOW'')
  THROW 51452,''Invalid queue transition'',1;
 DECLARE @PriorTicket UNIQUEIDENTIFIER,@PriorTarget VARCHAR(12),@Status VARCHAR(12);
 SELECT @PriorTicket=TicketId,@PriorTarget=TargetStatus
 FROM core.QueueTicketMutation WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorTicket IS NOT NULL BEGIN
  IF @PriorTicket<>@TicketId OR @PriorTarget<>@TargetStatus
   THROW 51453,''Queue transition replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@TicketId) AS id,@TargetStatus AS status,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  SELECT @Status=Status FROM core.QueueTicket WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND TicketId=@TicketId;
  IF @Status IS NULL THROW 51454,''Queue ticket not found'',1;
  IF @Status IN(''DONE'',''CANCELLED'',''NO_SHOW'') THROW 51456,''Queue ticket already final'',1;
  IF @TargetStatus=''CALLED'' AND @Status<>''WAITING'' THROW 51456,''Invalid call transition'',1;
  IF @TargetStatus=''IN_SERVICE'' AND @Status NOT IN(''WAITING'',''CALLED'')
   THROW 51456,''Invalid start transition'',1;
  IF @TargetStatus=''DONE'' AND @Status<>''IN_SERVICE'' THROW 51456,''Invalid done transition'',1;
  IF @TargetStatus IN(''CANCELLED'',''NO_SHOW'') AND @Status NOT IN(''WAITING'',''CALLED'',''IN_SERVICE'')
   THROW 51456,''Invalid cancel transition'',1;
  UPDATE core.QueueTicket SET Status=@TargetStatus,
   CalledAtUtc=CASE WHEN @TargetStatus=''CALLED'' THEN SYSUTCDATETIME() ELSE CalledAtUtc END,
   ServiceStartedAtUtc=CASE WHEN @TargetStatus=''IN_SERVICE'' THEN SYSUTCDATETIME()
    ELSE ServiceStartedAtUtc END,
   ServiceEndedAtUtc=CASE WHEN @TargetStatus=''DONE'' THEN SYSUTCDATETIME()
    ELSE ServiceEndedAtUtc END,
   CancelledAtUtc=CASE WHEN @TargetStatus IN(''CANCELLED'',''NO_SHOW'') THEN SYSUTCDATETIME()
    ELSE CancelledAtUtc END
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND TicketId=@TicketId;
  INSERT core.QueueTicketMutation(TenantId,BusinessId,BranchId,ClientRequestId,TicketId,
   TargetStatus,ActorAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@ClientRequestId,@TicketId,@TargetStatus,@AccountId);
  SELECT CONVERT(VARCHAR(36),@TicketId) AS id,@TargetStatus AS status,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.QueueTicket TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.QueueTicketMutation TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadBranchQueue TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateQueueTicket TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateQueueTicketFromBooking TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ChangeQueueTicketStatus TO [drvo_erp_stage_app];
END
