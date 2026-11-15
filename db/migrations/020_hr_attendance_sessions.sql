-- SQL020: HR Attendance Core — server UTC punch sessions (not payroll/workday).
-- Source reviewed: Cashier attendanceSessionPolicy.ts / employees/attendance route.
-- This strict initial slice never auto-closes a stale OPEN across a BusinessDay;
-- full local-date attendance, breaks, absence, lateness, shift/payroll remain GAP.
-- Apply primary DRVO dev SQL only after independent restorable backup + 001–019 checks.
CREATE TABLE core.HrAttendanceSession (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,AttendanceId UNIQUEIDENTIFIER NOT NULL,
 EmployeeId UNIQUEIDENTIFIER NOT NULL,
 CheckedInAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_HrAttendanceSession_In DEFAULT SYSUTCDATETIME(),
 CheckedOutAtUtc DATETIME2(3) NULL,
 CheckedInByAccountId UNIQUEIDENTIFIER NOT NULL,
 CheckedOutByAccountId UNIQUEIDENTIFIER NULL,
 CONSTRAINT PK_HrAttendanceSession PRIMARY KEY(TenantId,BusinessId,BranchId,AttendanceId),
 CONSTRAINT FK_HrAttendanceSession_EmployeeBranch FOREIGN KEY(TenantId,BusinessId,BranchId,EmployeeId)
  REFERENCES core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT FK_HrAttendanceSession_InActor FOREIGN KEY(TenantId,CheckedInByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_HrAttendanceSession_OutActor FOREIGN KEY(TenantId,CheckedOutByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_HrAttendanceSession_Time CHECK(
  (CheckedOutAtUtc IS NULL AND CheckedOutByAccountId IS NULL) OR
  (CheckedOutAtUtc IS NOT NULL AND CheckedOutByAccountId IS NOT NULL
    AND CheckedOutAtUtc >= CheckedInAtUtc))
);
CREATE UNIQUE INDEX UX_HrAttendance_OneOpen
 ON core.HrAttendanceSession(TenantId,BusinessId,EmployeeId)
 WHERE CheckedOutAtUtc IS NULL;
CREATE INDEX IX_HrAttendance_BranchRecent
 ON core.HrAttendanceSession(TenantId,BusinessId,BranchId,CheckedInAtUtc DESC,AttendanceId DESC);
CREATE TABLE core.HrAttendanceMutation (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 EmployeeId UNIQUEIDENTIFIER NOT NULL,AttendanceId UNIQUEIDENTIFIER NOT NULL,
 ActionCode VARCHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 AtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_HrAttendanceMutation_At DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_HrAttendanceMutation PRIMARY KEY(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_HrAttendanceMutation_Session FOREIGN KEY(TenantId,BusinessId,BranchId,AttendanceId)
  REFERENCES core.HrAttendanceSession(TenantId,BusinessId,BranchId,AttendanceId),
 CONSTRAINT FK_HrAttendanceMutation_Employee FOREIGN KEY(TenantId,BusinessId,BranchId,EmployeeId)
  REFERENCES core.HrEmployeeBranch(TenantId,BusinessId,BranchId,EmployeeId),
 CONSTRAINT FK_HrAttendanceMutation_Actor FOREIGN KEY(TenantId,ActorAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_HrAttendanceMutation_Action CHECK(ActionCode IN('IN','OUT'))
);

EXEC(N'CREATE PROCEDURE core.ReadHrAttendance
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''hr.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),s.AttendanceId) AS attendanceId,
  CONVERT(VARCHAR(36),s.EmployeeId) AS employeeId,
  e.DisplayName AS employeeName,s.CheckedInAtUtc AS checkedInAtUtc,
  s.CheckedOutAtUtc AS checkedOutAtUtc,
  CASE WHEN s.CheckedOutAtUtc IS NULL THEN ''OPEN'' ELSE ''CLOSED'' END AS status
 FROM core.HrAttendanceSession s
 JOIN core.HrEmployee e ON e.TenantId=s.TenantId AND e.BusinessId=s.BusinessId
  AND e.EmployeeId=s.EmployeeId
 WHERE s.TenantId=@TenantId AND s.BusinessId=@BusinessId AND s.BranchId=@BranchId
 ORDER BY s.CheckedInAtUtc DESC,s.AttendanceId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED; THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.RecordHrAttendance
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@EmployeeId UNIQUEIDENTIFIER,
 @Action VARCHAR(3),@AttendanceId UNIQUEIDENTIFIER=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertHrBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''hr.manage'';
 IF @ClientRequestId IS NULL OR @EmployeeId IS NULL OR @Action NOT IN(''IN'',''OUT'')
    OR (@Action=''IN'' AND @AttendanceId IS NOT NULL)
    OR (@Action=''OUT'' AND @AttendanceId IS NULL)
   THROW 51382,''Invalid attendance command'',1;
 DECLARE @PriorAction VARCHAR(3),@PriorEmployee UNIQUEIDENTIFIER,
  @PriorId UNIQUEIDENTIFIER,@Id UNIQUEIDENTIFIER;
 SELECT @PriorAction=ActionCode,@PriorEmployee=EmployeeId,@PriorId=AttendanceId
 FROM core.HrAttendanceMutation WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @PriorAction IS NOT NULL BEGIN
  IF @PriorAction<>@Action OR @PriorEmployee<>@EmployeeId OR
   (@Action=''OUT'' AND @PriorId<>@AttendanceId)
   THROW 51383,''Attendance idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@PriorId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  IF NOT EXISTS(SELECT 1 FROM core.HrEmployeeBranch eb
   JOIN core.HrEmployee e ON e.TenantId=eb.TenantId AND e.BusinessId=eb.BusinessId
    AND e.EmployeeId=eb.EmployeeId
   WHERE eb.TenantId=@TenantId AND eb.BusinessId=@BusinessId AND eb.BranchId=@BranchId
    AND eb.EmployeeId=@EmployeeId AND eb.IsActive=1 AND e.IsActive=1)
   THROW 51384,''Employee unavailable for attendance'',1;
  IF @Action=''IN'' BEGIN
   -- One currently OPEN session per Business Employee, across all Branches.
   -- Stale opening is intentionally NOT auto-closed without BusinessDay evidence.
   IF EXISTS(SELECT 1 FROM core.HrAttendanceSession WITH(UPDLOCK,HOLDLOCK)
     WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND EmployeeId=@EmployeeId
      AND CheckedOutAtUtc IS NULL)
    THROW 51383,''Attendance session already open'',1;
   SET @Id=NEWID();
   INSERT core.HrAttendanceSession(TenantId,BusinessId,BranchId,AttendanceId,
    EmployeeId,CheckedInByAccountId)
    VALUES(@TenantId,@BusinessId,@BranchId,@Id,@EmployeeId,@AccountId);
  END ELSE BEGIN
   SET @Id=@AttendanceId;
   IF NOT EXISTS(SELECT 1 FROM core.HrAttendanceSession WITH(UPDLOCK,HOLDLOCK)
     WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
      AND AttendanceId=@Id AND EmployeeId=@EmployeeId AND CheckedOutAtUtc IS NULL)
    THROW 51383,''Attendance session is not open'',1;
   UPDATE core.HrAttendanceSession
    SET CheckedOutAtUtc=SYSUTCDATETIME(),CheckedOutByAccountId=@AccountId
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND AttendanceId=@Id AND EmployeeId=@EmployeeId AND CheckedOutAtUtc IS NULL;
  END
  INSERT core.HrAttendanceMutation(TenantId,BusinessId,BranchId,ClientRequestId,
   EmployeeId,AttendanceId,ActionCode,ActorAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@ClientRequestId,
    @EmployeeId,@Id,@Action,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED; THROW;
 END CATCH
END');

-- Explicit app principal READ/WRITE denial, only scoped stored procedures EXECUTE.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.HrAttendanceSession TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.HrAttendanceMutation TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadHrAttendance TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.RecordHrAttendance TO [drvo_erp_stage_app];
END
