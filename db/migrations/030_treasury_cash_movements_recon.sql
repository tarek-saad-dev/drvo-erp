-- SQL030. Treasury operational cash movements + shift reconciliation drafts.
-- Cashier source: TblCashMove / treasury transfer / shift-reconciliation (pin 046bf19).
-- Records custody IN/OUT/TRANSFER against OPEN BusinessDay+Shift only.
-- GlPostState is ALWAYS GATED - ADR-031 live journals are not written here.
-- Variance/reconciliation closes the OperationalShift without posting over/short GL.
-- Depends on SQL021 cash counts (observations) and SQL029 BusinessDay/Shift.
CREATE TABLE core.TreasuryCashMovement (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,MovementId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DayId UNIQUEIDENTIFIER NOT NULL,ShiftId UNIQUEIDENTIFIER NOT NULL,
 Direction VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
 AmountMinor BIGINT NOT NULL,
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 FromRail VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 ToRail VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Note NVARCHAR(240) NOT NULL,
 Status VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_TreasuryCashMovement_Status DEFAULT('RECORDED'),
 GlPostState VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_TreasuryCashMovement_Gl DEFAULT('GATED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TreasuryCashMovement_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_TreasuryCashMovement PRIMARY KEY(TenantId,BusinessId,BranchId,MovementId),
 CONSTRAINT UQ_TreasuryCashMovement_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_TreasuryCashMovement_Day FOREIGN KEY(TenantId,BusinessId,BranchId,DayId)
  REFERENCES core.BusinessDay(TenantId,BusinessId,BranchId,DayId),
 CONSTRAINT FK_TreasuryCashMovement_Shift FOREIGN KEY(TenantId,BusinessId,BranchId,ShiftId)
  REFERENCES core.OperationalShift(TenantId,BusinessId,BranchId,ShiftId),
 CONSTRAINT FK_TreasuryCashMovement_Creator FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_TreasuryCashMovement_Canceller FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_TreasuryCashMovement_Direction CHECK(Direction IN('IN','OUT','TRANSFER')),
 CONSTRAINT CK_TreasuryCashMovement_Amount CHECK(AmountMinor BETWEEN 1 AND 9000000000000),
 CONSTRAINT CK_TreasuryCashMovement_Currency CHECK(Currency IN('EGP','SAR','AED','USD')),
 CONSTRAINT CK_TreasuryCashMovement_Rails CHECK(
  FromRail IN('CASH','CARD','BANK','OTHER') AND ToRail IN('CASH','CARD','BANK','OTHER')),
 CONSTRAINT CK_TreasuryCashMovement_RailShape CHECK(
  (Direction='IN' AND FromRail='OTHER' AND ToRail<>'OTHER')
  OR(Direction='OUT' AND ToRail='OTHER' AND FromRail<>'OTHER')
  OR(Direction='TRANSFER' AND FromRail<>ToRail AND FromRail<>'OTHER' AND ToRail<>'OTHER')),
 CONSTRAINT CK_TreasuryCashMovement_Status CHECK(Status IN('RECORDED','CANCELLED')),
 CONSTRAINT CK_TreasuryCashMovement_Gl CHECK(GlPostState='GATED'),
 CONSTRAINT CK_TreasuryCashMovement_Cancel CHECK(
  (Status='RECORDED' AND CancelRequestId IS NULL
    AND CancelledByAccountId IS NULL AND CancelledAtUtc IS NULL)
  OR(Status='CANCELLED' AND CancelRequestId IS NOT NULL
    AND CancelledByAccountId IS NOT NULL AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_TreasuryCashMovement_Cancel
 ON core.TreasuryCashMovement(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_TreasuryCashMovement_Shift
 ON core.TreasuryCashMovement(TenantId,BusinessId,BranchId,ShiftId,CreatedAtUtc DESC);
CREATE INDEX IX_TreasuryCashMovement_Day
 ON core.TreasuryCashMovement(TenantId,BusinessId,BranchId,DayId,CreatedAtUtc DESC);

CREATE TABLE core.TreasuryShiftRecon (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,ReconId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DayId UNIQUEIDENTIFIER NOT NULL,ShiftId UNIQUEIDENTIFIER NOT NULL,
 Rail VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 SystemMinor BIGINT NOT NULL,CountedMinor BIGINT NOT NULL,VarianceMinor BIGINT NOT NULL,
 Note NVARCHAR(240) NOT NULL,
 GlPostState VARCHAR(12) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_TreasuryShiftRecon_Gl DEFAULT('GATED'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TreasuryShiftRecon_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_TreasuryShiftRecon PRIMARY KEY(TenantId,BusinessId,BranchId,ReconId),
 CONSTRAINT UQ_TreasuryShiftRecon_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT UQ_TreasuryShiftRecon_ShiftRail UNIQUE(TenantId,BusinessId,BranchId,ShiftId,Rail),
 CONSTRAINT FK_TreasuryShiftRecon_Day FOREIGN KEY(TenantId,BusinessId,BranchId,DayId)
  REFERENCES core.BusinessDay(TenantId,BusinessId,BranchId,DayId),
 CONSTRAINT FK_TreasuryShiftRecon_Shift FOREIGN KEY(TenantId,BusinessId,BranchId,ShiftId)
  REFERENCES core.OperationalShift(TenantId,BusinessId,BranchId,ShiftId),
 CONSTRAINT FK_TreasuryShiftRecon_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_TreasuryShiftRecon_Rail CHECK(Rail IN('CASH','CARD','BANK','OTHER')),
 CONSTRAINT CK_TreasuryShiftRecon_Amounts CHECK(
  SystemMinor BETWEEN -9000000000000 AND 9000000000000
  AND CountedMinor BETWEEN 0 AND 9000000000000
  AND VarianceMinor=CountedMinor-SystemMinor),
 CONSTRAINT CK_TreasuryShiftRecon_Gl CHECK(GlPostState='GATED')
);
CREATE INDEX IX_TreasuryShiftRecon_Shift
 ON core.TreasuryShiftRecon(TenantId,BusinessId,BranchId,ShiftId,CreatedAtUtc DESC);

EXEC(N'CREATE PROCEDURE core.AssertTreasuryOpsAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN(
  ''treasury.movement.read'',''treasury.movement.manage'',
  ''treasury.recon.read'',''treasury.recon.manage'') OR NOT EXISTS(
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
 ) THROW 51501,''Treasury ops access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadTreasuryCashMovements
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryOpsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.movement.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),MovementId) AS movementId,
  CONVERT(VARCHAR(36),DayId) AS dayId,
  CONVERT(VARCHAR(36),ShiftId) AS shiftId,
  Direction AS direction,AmountMinor AS amountMinor,Currency AS currency,
  FromRail AS fromRail,ToRail AS toRail,Note AS note,Status AS status,
  GlPostState AS glPostState,CreatedAtUtc AS createdAtUtc,
  CancelledAtUtc AS cancelledAtUtc
 FROM core.TreasuryCashMovement
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
 ORDER BY CreatedAtUtc DESC,MovementId DESC;
 SELECT TOP(50)
  CONVERT(VARCHAR(36),ReconId) AS reconId,
  CONVERT(VARCHAR(36),DayId) AS dayId,
  CONVERT(VARCHAR(36),ShiftId) AS shiftId,
  Rail AS rail,SystemMinor AS systemMinor,CountedMinor AS countedMinor,
  VarianceMinor AS varianceMinor,Note AS note,GlPostState AS glPostState,
  CreatedAtUtc AS createdAtUtc
 FROM core.TreasuryShiftRecon
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
 ORDER BY CreatedAtUtc DESC,ReconId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateTreasuryCashMovement
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DayId UNIQUEIDENTIFIER,@ShiftId UNIQUEIDENTIFIER,
 @Direction VARCHAR(10),@AmountMinor BIGINT,@Currency CHAR(3),
 @FromRail VARCHAR(16),@ToRail VARCHAR(16),@Note NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryOpsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.movement.manage'';
 IF @ClientRequestId IS NULL OR @DayId IS NULL OR @ShiftId IS NULL OR
  @Direction IS NULL OR @Direction NOT IN(''IN'',''OUT'',''TRANSFER'') OR
  @AmountMinor IS NULL OR @AmountMinor NOT BETWEEN 1 AND 9000000000000 OR
  @Currency IS NULL OR @Currency NOT IN(''EGP'',''SAR'',''AED'',''USD'') OR
  @FromRail IS NULL OR @ToRail IS NULL OR
  @FromRail NOT IN(''CASH'',''CARD'',''BANK'',''OTHER'') OR
  @ToRail NOT IN(''CASH'',''CARD'',''BANK'',''OTHER'') OR
  @Note IS NULL OR LEN(@Note)>240 OR
  (@Direction=''IN'' AND (@FromRail<>''OTHER'' OR @ToRail=''OTHER'')) OR
  (@Direction=''OUT'' AND (@ToRail<>''OTHER'' OR @FromRail=''OTHER'')) OR
  (@Direction=''TRANSFER'' AND (@FromRail=@ToRail OR @FromRail=''OTHER'' OR @ToRail=''OTHER''))
  THROW 51502,''Invalid cash movement'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorDir VARCHAR(10),@PriorAmt BIGINT,
  @PriorCur CHAR(3),@PriorFrom VARCHAR(16),@PriorTo VARCHAR(16),
  @PriorNote NVARCHAR(240),@PriorDay UNIQUEIDENTIFIER,@PriorShift UNIQUEIDENTIFIER;
 SELECT @Id=MovementId,@PriorDir=Direction,@PriorAmt=AmountMinor,@PriorCur=Currency,
  @PriorFrom=FromRail,@PriorTo=ToRail,@PriorNote=Note,@PriorDay=DayId,@PriorShift=ShiftId
 FROM core.TreasuryCashMovement WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorDir<>@Direction OR @PriorAmt<>@AmountMinor OR @PriorCur<>@Currency OR
   @PriorFrom<>@FromRail OR @PriorTo<>@ToRail OR @PriorNote<>@Note OR
   @PriorDay<>@DayId OR @PriorShift<>@ShiftId
   THROW 51503,''Cash movement request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created,''GATED'' AS glPostState;
 END ELSE BEGIN
  DECLARE @DayStatus VARCHAR(10),@ShiftStatus VARCHAR(10),@ShiftDay UNIQUEIDENTIFIER,
   @ShiftActor UNIQUEIDENTIFIER;
  SELECT @DayStatus=Status FROM core.BusinessDay WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId AND DayId=@DayId;
  IF @DayStatus IS NULL THROW 51504,''Business day not found'',1;
  IF @DayStatus<>''OPEN'' THROW 51505,''Cash movement requires OPEN business day'',1;
  SELECT @ShiftStatus=Status,@ShiftDay=DayId,@ShiftActor=ActorAccountId
  FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ShiftId=@ShiftId;
  IF @ShiftStatus IS NULL THROW 51504,''Shift not found'',1;
  IF @ShiftStatus<>''OPEN'' OR @ShiftDay<>@DayId OR @ShiftActor<>@AccountId
   THROW 51505,''Cash movement requires actor OPEN shift on day'',1;
  SET @Id=NEWID();
  INSERT core.TreasuryCashMovement(
   TenantId,BusinessId,BranchId,MovementId,ClientRequestId,DayId,ShiftId,
   Direction,AmountMinor,Currency,FromRail,ToRail,Note,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@DayId,@ShiftId,
   @Direction,@AmountMinor,@Currency,@FromRail,@ToRail,@Note,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,''GATED'' AS glPostState;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelTreasuryCashMovement
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @MovementId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryOpsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.movement.manage'';
 IF @MovementId IS NULL OR @ClientRequestId IS NULL
  THROW 51502,''Invalid movement cancel'',1;
 DECLARE @Status VARCHAR(12),@Prior UNIQUEIDENTIFIER,@ShiftId UNIQUEIDENTIFIER,
  @ShiftStatus VARCHAR(10);
 SELECT @Status=Status,@Prior=CancelRequestId,@ShiftId=ShiftId
 FROM core.TreasuryCashMovement WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND MovementId=@MovementId;
 IF @Status IS NULL THROW 51504,''Cash movement not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @Prior<>@ClientRequestId THROW 51503,''Cash movement already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@MovementId) AS id,CAST(0 AS BIT) AS changed,''GATED'' AS glPostState;
 END ELSE BEGIN
  SELECT @ShiftStatus=Status FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ShiftId=@ShiftId;
  IF @ShiftStatus<>''OPEN'' THROW 51505,''Cannot cancel movement on closed shift'',1;
  UPDATE core.TreasuryCashMovement
   SET Status=''CANCELLED'',CancelledAtUtc=SYSUTCDATETIME(),
    CancelRequestId=@ClientRequestId,CancelledByAccountId=@AccountId
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND MovementId=@MovementId AND Status=''RECORDED'';
  SELECT CONVERT(VARCHAR(36),@MovementId) AS id,CAST(1 AS BIT) AS changed,''GATED'' AS glPostState;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateTreasuryShiftRecon
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@ShiftId UNIQUEIDENTIFIER,
 @Rail VARCHAR(16),@CountedMinor BIGINT,@Note NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryOpsAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.recon.manage'';
 IF @ClientRequestId IS NULL OR @ShiftId IS NULL OR
  @Rail IS NULL OR @Rail NOT IN(''CASH'',''CARD'',''BANK'',''OTHER'') OR
  @CountedMinor IS NULL OR @CountedMinor NOT BETWEEN 0 AND 9000000000000 OR
  @Note IS NULL OR LEN(@Note)>240
  THROW 51502,''Invalid shift reconciliation'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorRail VARCHAR(16),@PriorCounted BIGINT,
  @PriorNote NVARCHAR(240),@PriorShift UNIQUEIDENTIFIER;
 SELECT @Id=ReconId,@PriorRail=Rail,@PriorCounted=CountedMinor,@PriorNote=Note,
  @PriorShift=ShiftId
 FROM core.TreasuryShiftRecon WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorRail<>@Rail OR @PriorCounted<>@CountedMinor OR @PriorNote<>@Note
   OR @PriorShift<>@ShiftId
   THROW 51503,''Shift recon request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created,''GATED'' AS glPostState,
   CAST(0 AS BIT) AS shiftClosed;
 END ELSE BEGIN
  DECLARE @DayId UNIQUEIDENTIFIER,@ShiftStatus VARCHAR(10),@ShiftActor UNIQUEIDENTIFIER;
  SELECT @DayId=DayId,@ShiftStatus=Status,@ShiftActor=ActorAccountId
  FROM core.OperationalShift WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ShiftId=@ShiftId;
  IF @DayId IS NULL THROW 51504,''Shift not found'',1;
  IF @ShiftStatus<>''OPEN'' THROW 51505,''Shift already closed'',1;
  IF @ShiftActor<>@AccountId THROW 51501,''Only shift actor may reconcile/close'',1;
  DECLARE @System BIGINT=
   ISNULL((SELECT SUM(CASE
    WHEN Direction=''IN'' AND ToRail=@Rail THEN AmountMinor
    WHEN Direction=''OUT'' AND FromRail=@Rail THEN -AmountMinor
    WHEN Direction=''TRANSFER'' AND ToRail=@Rail THEN AmountMinor
    WHEN Direction=''TRANSFER'' AND FromRail=@Rail THEN -AmountMinor
    ELSE 0 END)
    FROM core.TreasuryCashMovement WITH(UPDLOCK,HOLDLOCK)
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
     AND ShiftId=@ShiftId AND Status=''RECORDED''),0);
  IF @System IS NULL SET @System=0;
  DECLARE @Variance BIGINT=@CountedMinor-@System;
  SET @Id=NEWID();
  INSERT core.TreasuryShiftRecon(
   TenantId,BusinessId,BranchId,ReconId,ClientRequestId,DayId,ShiftId,
   Rail,SystemMinor,CountedMinor,VarianceMinor,Note,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,@DayId,@ShiftId,
   @Rail,@System,@CountedMinor,@Variance,@Note,@AccountId);
  UPDATE core.OperationalShift
   SET Status=''CLOSED'',ClosedAtUtc=SYSUTCDATETIME(),
    ClosedByAccountId=@AccountId,CloseRequestId=@ClientRequestId
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND ShiftId=@ShiftId AND Status=''OPEN'';
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created,''GATED'' AS glPostState,
   CAST(1 AS BIT) AS shiftClosed,
   @System AS systemMinor,@CountedMinor AS countedMinor,@Variance AS varianceMinor;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.TreasuryCashMovement
  TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.TreasuryShiftRecon
  TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadTreasuryCashMovements TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateTreasuryCashMovement TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelTreasuryCashMovement TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateTreasuryShiftRecon TO [drvo_erp_stage_app];
END
