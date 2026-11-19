-- SQL029. Operations BusinessDay + Cashier Shift sessions (non-posting).
-- Cashier source: TblNewDay / TblShiftMove invariants + businessDayReconciliation (pin 046bf19).
-- At most one OPEN day per Branch; at most one OPEN shift per Account (tenant-wide).
-- Shift opens only against OPEN day. Day close refuses open shifts unless forceCloseShifts=1.
-- NO sale, Treasury balance mutation, cash movement, or ADR-031 GL/journal writes.
-- Primary/VPS apply only after backup + 001â€“026 verification.
CREATE TABLE core.BusinessDay (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,DayId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 BusinessDate DATE NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_BusinessDay_Status DEFAULT('OPEN'),
 OpenedByAccountId UNIQUEIDENTIFIER NOT NULL,
 OpenedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_BusinessDay_Opened DEFAULT SYSUTCDATETIME(),
 ClosedByAccountId UNIQUEIDENTIFIER NULL,ClosedAtUtc DATETIME2(3) NULL,
 CloseRequestId UNIQUEIDENTIFIER NULL,
 CONSTRAINT PK_BusinessDay PRIMARY KEY(TenantId,BusinessId,BranchId,DayId),
 CONSTRAINT UQ_BusinessDay_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT UQ_BusinessDay_Date UNIQUE(TenantId,BusinessId,BranchId,BusinessDate),
 CONSTRAINT FK_BusinessDay_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_BusinessDay_Opener FOREIGN KEY(TenantId,OpenedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_BusinessDay_Closer FOREIGN KEY(TenantId,ClosedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_BusinessDay_Status CHECK(Status IN('OPEN','CLOSED')),
 CONSTRAINT CK_BusinessDay_CloseShape CHECK(
  (Status='OPEN' AND ClosedByAccountId IS NULL AND ClosedAtUtc IS NULL
    AND CloseRequestId IS NULL)
  OR(Status='CLOSED' AND ClosedByAccountId IS NOT NULL AND ClosedAtUtc IS NOT NULL
    AND CloseRequestId IS NOT NULL))
);
CREATE UNIQUE INDEX UX_BusinessDay_OneOpenPerBranch
 ON core.BusinessDay(TenantId,BusinessId,BranchId)
 WHERE Status='OPEN';
CREATE UNIQUE INDEX UX_BusinessDay_CloseRequest
 ON core.BusinessDay(TenantId,BusinessId,BranchId,CloseRequestId)
 WHERE CloseRequestId IS NOT NULL;
CREATE INDEX IX_BusinessDay_BranchRecent
 ON core.BusinessDay(TenantId,BusinessId,BranchId,BusinessDate DESC,DayId DESC);

CREATE TABLE core.OperationalShift (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ShiftId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DayId UNIQUEIDENTIFIER NOT NULL,
 ActorAccountId UNIQUEIDENTIFIER NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_OperationalShift_Status DEFAULT('OPEN'),
 OpenedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_OperationalShift_Opened DEFAULT SYSUTCDATETIME(),
 ClosedByAccountId UNIQUEIDENTIFIER NULL,ClosedAtUtc DATETIME2(3) NULL,
 CloseRequestId UNIQUEIDENTIFIER NULL,
 CONSTRAINT PK_OperationalShift PRIMARY KEY(TenantId,BusinessId,BranchId,ShiftId),
 CONSTRAINT UQ_OperationalShift_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_OperationalShift_Day FOREIGN KEY(TenantId,BusinessId,BranchId,DayId)
  REFERENCES core.BusinessDay(TenantId,BusinessId,BranchId,DayId),
 CONSTRAINT FK_OperationalShift_Actor FOREIGN KEY(TenantId,ActorAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_OperationalShift_Closer FOREIGN KEY(TenantId,ClosedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_OperationalShift_Status CHECK(Status IN('OPEN','CLOSED')),
 CONSTRAINT CK_OperationalShift_CloseShape CHECK(
  (Status='OPEN' AND ClosedByAccountId IS NULL AND ClosedAtUtc IS NULL
    AND CloseRequestId IS NULL)
  OR(Status='CLOSED' AND ClosedByAccountId IS NOT NULL AND ClosedAtUtc IS NOT NULL
    AND CloseRequestId IS NOT NULL))
);
CREATE UNIQUE INDEX UX_OperationalShift_OneOpenPerAccount
 ON core.OperationalShift(TenantId,ActorAccountId)
 WHERE Status='OPEN';
-- CloseRequestId is not globally unique: day force-close may stamp many shifts.
CREATE INDEX IX_OperationalShift_CloseRequest
 ON core.OperationalShift(TenantId,BusinessId,BranchId,CloseRequestId)
 WHERE CloseRequestId IS NOT NULL;
CREATE INDEX IX_OperationalShift_Day
 ON core.OperationalShift(TenantId,BusinessId,BranchId,DayId,Status,OpenedAtUtc);

EXEC(N'CREATE PROCEDURE core.AssertOperationsAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN(
  ''operations.day.read'',''operations.day.manage'',
  ''operations.shift.read'',''operations.shift.manage'') OR NOT EXISTS(
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId AND bm.AccountId=a.AccountId
   AND bm.BusinessId=@BusinessId AND bm.IsActive=1
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
   AND s.ExpiresAtUtc>SYSUTCDATETIME() AND b.BusinessId=@BusinessId
   AND br.BranchId=@BranchId
 ) THROW 51491,''Operations access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadOperationsDayShift
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.day.read'';
 SELECT TOP(1)
  CONVERT(VARCHAR(36),DayId) AS dayId,
  CONVERT(VARCHAR(10),BusinessDate,23) AS businessDate,
  Status AS status,
  CONVERT(VARCHAR(36),OpenedByAccountId) AS openedByAccountId,
  OpenedAtUtc AS openedAtUtc,
  ClosedAtUtc AS closedAtUtc
 FROM core.BusinessDay
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND Status=''OPEN''
 ORDER BY BusinessDate DESC,DayId DESC;
 SELECT TOP(50)
  CONVERT(VARCHAR(36),ShiftId) AS shiftId,
  CONVERT(VARCHAR(36),DayId) AS dayId,
  CONVERT(VARCHAR(36),ActorAccountId) AS actorAccountId,
  Status AS status,
  OpenedAtUtc AS openedAtUtc,
  ClosedAtUtc AS closedAtUtc
 FROM core.OperationalShift
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
 ORDER BY OpenedAtUtc DESC,ShiftId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.OpenBusinessDay
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@BusinessDate DATE
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.day.manage'';
 IF @ClientRequestId IS NULL OR @BusinessDate IS NULL
  THROW 51492,''Invalid business day open'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorDate DATE,@PriorStatus VARCHAR(10);
 SELECT @Id=DayId,@PriorDate=BusinessDate,@PriorStatus=Status
 FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorDate<>@BusinessDate OR @PriorStatus<>''OPEN''
   THROW 51493,''Business day request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created,
   CONVERT(VARCHAR(10),@PriorDate,23) AS businessDate,''OPEN'' AS status;
 END ELSE BEGIN
  IF EXISTS(
   SELECT 1 FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND Status=''OPEN'')
   THROW 51495,''Branch already has an OPEN business day'',1;
  IF EXISTS(
   SELECT 1 FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND BusinessDate=@BusinessDate)
   THROW 51493,''Business date already exists for branch'',1;
  SET @Id=NEWID();
  INSERT core.BusinessDay(
   TenantId,BusinessId,BranchId,DayId,ClientRequestId,BusinessDate,OpenedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@BusinessDate,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,
   CONVERT(VARCHAR(10),@BusinessDate,23) AS businessDate,''OPEN'' AS status;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CloseBusinessDay
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @DayId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER,@ForceCloseShifts BIT
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.day.manage'';
 IF @DayId IS NULL OR @ClientRequestId IS NULL OR @ForceCloseShifts IS NULL
  THROW 51492,''Invalid business day close'',1;
 DECLARE @Status VARCHAR(10),@PriorClose UNIQUEIDENTIFIER;
 SELECT @Status=Status,@PriorClose=CloseRequestId
 FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND DayId=@DayId;
 IF @Status IS NULL THROW 51494,''Business day not found'',1;
 IF @Status=''CLOSED'' BEGIN
  IF @PriorClose<>@ClientRequestId THROW 51493,''Business day already closed'',1;
  SELECT CONVERT(VARCHAR(36),@DayId) AS id,CAST(0 AS BIT) AS changed,''CLOSED'' AS status;
 END ELSE BEGIN
  IF @ForceCloseShifts=0 AND EXISTS(
   SELECT 1 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND DayId=@DayId AND Status=''OPEN'')
   THROW 51495,''Cannot close day while shifts remain OPEN'',1;
  IF @ForceCloseShifts=1
   UPDATE core.OperationalShift
    SET Status=''CLOSED'',ClosedAtUtc=SYSUTCDATETIME(),
     ClosedByAccountId=@AccountId,CloseRequestId=@ClientRequestId
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND DayId=@DayId AND Status=''OPEN'';
  UPDATE core.BusinessDay
   SET Status=''CLOSED'',ClosedAtUtc=SYSUTCDATETIME(),
    ClosedByAccountId=@AccountId,CloseRequestId=@ClientRequestId
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND DayId=@DayId AND Status=''OPEN'';
  SELECT CONVERT(VARCHAR(36),@DayId) AS id,CAST(1 AS BIT) AS changed,''CLOSED'' AS status;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.OpenOperationalShift
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DayId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.shift.manage'';
 IF @ClientRequestId IS NULL OR @DayId IS NULL
  THROW 51492,''Invalid shift open'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorDay UNIQUEIDENTIFIER,@PriorStatus VARCHAR(10);
 SELECT @Id=ShiftId,@PriorDay=DayId,@PriorStatus=Status
 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorDay<>@DayId OR @PriorStatus<>''OPEN''
   THROW 51493,''Shift request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created,
   CONVERT(VARCHAR(36),@PriorDay) AS dayId,''OPEN'' AS status;
 END ELSE BEGIN
  DECLARE @DayStatus VARCHAR(10);
  SELECT @DayStatus=Status FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND DayId=@DayId;
  IF @DayStatus IS NULL THROW 51494,''Business day not found'',1;
  IF @DayStatus<>''OPEN'' THROW 51495,''Shift requires an OPEN business day'',1;
  IF EXISTS(
   SELECT 1 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND ActorAccountId=@AccountId AND Status=''OPEN'')
   THROW 51495,''Account already has an OPEN shift'',1;
  SET @Id=NEWID();
  INSERT core.OperationalShift(
   TenantId,BusinessId,BranchId,ShiftId,ClientRequestId,DayId,ActorAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@DayId,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,
   CONVERT(VARCHAR(36),@DayId) AS dayId,''OPEN'' AS status;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CloseOperationalShift
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ShiftId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertOperationsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''operations.shift.manage'';
 IF @ShiftId IS NULL OR @ClientRequestId IS NULL
  THROW 51492,''Invalid shift close'',1;
 DECLARE @Status VARCHAR(10),@PriorClose UNIQUEIDENTIFIER,@Actor UNIQUEIDENTIFIER;
 SELECT @Status=Status,@PriorClose=CloseRequestId,@Actor=ActorAccountId
 FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ShiftId=@ShiftId;
 IF @Status IS NULL THROW 51494,''Shift not found'',1;
 IF @Status=''CLOSED'' BEGIN
  IF @PriorClose<>@ClientRequestId THROW 51493,''Shift already closed'',1;
  SELECT CONVERT(VARCHAR(36),@ShiftId) AS id,CAST(0 AS BIT) AS changed,''CLOSED'' AS status;
 END ELSE BEGIN
  IF @Actor<>@AccountId THROW 51491,''Only shift actor may close without recon'',1;
  UPDATE core.OperationalShift
   SET Status=''CLOSED'',ClosedAtUtc=SYSUTCDATETIME(),
    ClosedByAccountId=@AccountId,CloseRequestId=@ClientRequestId
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ShiftId=@ShiftId AND Status=''OPEN'';
  SELECT CONVERT(VARCHAR(36),@ShiftId) AS id,CAST(1 AS BIT) AS changed,''CLOSED'' AS status;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BusinessDay TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.OperationalShift TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadOperationsDayShift TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.OpenBusinessDay TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CloseBusinessDay TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.OpenOperationalShift TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CloseOperationalShift TO [drvo_erp_stage_app];
END
