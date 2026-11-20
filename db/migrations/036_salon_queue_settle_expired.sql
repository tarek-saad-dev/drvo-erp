-- SQL036: Salon Queue operator settle-expired (NONPOSTING).
-- Cashier source: POST /api/queue/settle-expired (pin 046bf19) - operator button, not paid posting.
-- Extends SQL026 QueueTicket with AutoClose audit; WAITING/CALLED past ExpectedEndAt+grace -> NO_SHOW.
-- Overdue IN_SERVICE is NOT auto-closed (operator must DONE/CANCEL). No sale/Treasury/GL (ADR-031).
-- Primary/VPS apply only after backup + 001-035 verification.
-- After ADD column, later DDL that references new cols must be dynamic SQL (no GO batches).

IF COL_LENGTH('core.QueueTicket','AutoClosedAtUtc') IS NULL
 ALTER TABLE core.QueueTicket ADD AutoClosedAtUtc DATETIME2(3) NULL;
IF COL_LENGTH('core.QueueTicket','AutoCloseReason') IS NULL
 ALTER TABLE core.QueueTicket ADD AutoCloseReason VARCHAR(40) COLLATE Latin1_General_100_BIN2 NULL;

EXEC(N'IF NOT EXISTS(
 SELECT 1 FROM sys.check_constraints WHERE name=N''CK_QueueTicket_AutoClose'' AND parent_object_id=OBJECT_ID(N''core.QueueTicket'')
) ALTER TABLE core.QueueTicket WITH CHECK ADD CONSTRAINT CK_QueueTicket_AutoClose CHECK(
 (AutoClosedAtUtc IS NULL AND AutoCloseReason IS NULL) OR
 (AutoClosedAtUtc IS NOT NULL AND AutoCloseReason IN(''SETTLED_BY_OPERATOR'')))');

EXEC(N'CREATE OR ALTER PROCEDURE core.SettleExpiredQueueTickets
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @GraceMinutes INT
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertQueueBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''queue.manage'';
 IF @GraceMinutes IS NULL OR @GraceMinutes NOT BETWEEN 0 AND 240
  THROW 51452,''Invalid queue settle grace'',1;
 DECLARE @Now DATETIME2(3)=SYSUTCDATETIME();
 DECLARE @Settled TABLE(
  TicketId UNIQUEIDENTIFIER NOT NULL,
  PriorStatus VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL
 );
 UPDATE q SET
  Status=''NO_SHOW'',
  CancelledAtUtc=@Now,
  AutoClosedAtUtc=@Now,
  AutoCloseReason=''SETTLED_BY_OPERATOR''
 OUTPUT inserted.TicketId,deleted.Status INTO @Settled(TicketId,PriorStatus)
 FROM core.QueueTicket q WITH(UPDLOCK,HOLDLOCK)
 WHERE q.TenantId=@TenantId AND q.BusinessId=@BusinessId AND q.BranchId=@BranchId
  AND q.Status IN(''WAITING'',''CALLED'')
  AND q.ExpectedEndAtUtc IS NOT NULL
  AND DATEADD(MINUTE,@GraceMinutes,q.ExpectedEndAtUtc)<@Now;
 INSERT core.QueueTicketMutation(TenantId,BusinessId,BranchId,ClientRequestId,TicketId,
  TargetStatus,ActorAccountId,AtUtc)
 SELECT @TenantId,@BusinessId,@BranchId,NEWID(),s.TicketId,''NO_SHOW'',@AccountId,@Now
 FROM @Settled s;
 SELECT COUNT(*) AS settledCount FROM @Settled;
 SELECT CONVERT(VARCHAR(36),TicketId) AS ticketId,PriorStatus AS priorStatus
 FROM @Settled ORDER BY TicketId;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.QueueTicket TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.QueueTicketMutation TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.SettleExpiredQueueTickets TO [drvo_erp_stage_app];
END
