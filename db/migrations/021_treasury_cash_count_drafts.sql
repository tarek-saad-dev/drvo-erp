-- SQL021. Treasury physical cash count observations ONLY.
-- Source-audited Cashier treasury/reconciliation; close-day/variance intentionally deferred.
-- NO financial movement, settlement, account balance, POS effect, GL or BusinessDay mutation.
-- Primary DRVO dev migration requires ADR-039 verified target + restorable backup.
CREATE TABLE core.TreasuryCashCountDraft(
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,CountId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 CountedMinor BIGINT NOT NULL,
 Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Note NVARCHAR(240) NOT NULL,
 Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
   CONSTRAINT DF_TreasuryCount_Status DEFAULT('DRAFT'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_TreasuryCount_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_TreasuryCount PRIMARY KEY(TenantId,BusinessId,BranchId,CountId),
 CONSTRAINT UQ_TreasuryCount_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_TreasuryCount_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_TreasuryCount_Creator FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_TreasuryCount_Canceller FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_TreasuryCount_Amount CHECK(CountedMinor BETWEEN 0 AND 9000000000000),
 CONSTRAINT CK_TreasuryCount_Currency CHECK(Currency IN('EGP','SAR','AED','USD')),
 CONSTRAINT CK_TreasuryCount_Status CHECK(Status IN('DRAFT','CANCELLED')),
 CONSTRAINT CK_TreasuryCount_Cancel CHECK(
  (Status='DRAFT' AND CancelRequestId IS NULL
    AND CancelledByAccountId IS NULL AND CancelledAtUtc IS NULL)
  OR(Status='CANCELLED' AND CancelRequestId IS NOT NULL
    AND CancelledByAccountId IS NOT NULL AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_TreasuryCount_Cancel
 ON core.TreasuryCashCountDraft(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_TreasuryCount_Recent
 ON core.TreasuryCashCountDraft(
  TenantId,BusinessId,BranchId,CreatedAtUtc DESC,CountId DESC);

EXEC(N'CREATE PROCEDURE core.AssertTreasuryCountAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN(''treasury.count.read'',''treasury.count.manage'') OR NOT EXISTS(
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId
   AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId AND bm.AccountId=a.AccountId
   AND bm.BusinessId=@BusinessId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId AND b.BusinessId=bm.BusinessId
   AND b.IsActive=1
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
 ) THROW 51481,''Treasury count access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadTreasuryCountDrafts
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryCountAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.count.read'';
 SELECT TOP(200)
  CONVERT(VARCHAR(36),CountId) AS countId,
  CountedMinor AS countedMinor,Currency AS currency,
  Note AS note,Status AS status,CreatedAtUtc AS createdAtUtc,
  CancelledAtUtc AS cancelledAtUtc
 FROM core.TreasuryCashCountDraft
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
 ORDER BY CreatedAtUtc DESC,CountId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateTreasuryCashCountDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@CountedMinor BIGINT,@Currency CHAR(3),
 @Note NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryCountAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.count.manage'';
 IF @ClientRequestId IS NULL OR @CountedMinor IS NULL OR
   @CountedMinor NOT BETWEEN 0 AND 9000000000000 OR
   @Currency IS NULL OR @Currency NOT IN(''EGP'',''SAR'',''AED'',''USD'') OR
   @Note IS NULL OR LEN(@Note)>240
  THROW 51482,''Invalid cash count draft'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PriorMinor BIGINT,
  @PriorCurrency CHAR(3),@PriorNote NVARCHAR(240);
 SELECT @Id=CountId,@PriorMinor=CountedMinor,
  @PriorCurrency=Currency,@PriorNote=Note
 FROM core.TreasuryCashCountDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorMinor<>@CountedMinor OR @PriorCurrency<>@Currency OR @PriorNote<>@Note
   THROW 51483,''Cash count request conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  SET @Id=NEWID();
  INSERT core.TreasuryCashCountDraft(
   TenantId,BusinessId,BranchId,CountId,ClientRequestId,
   CountedMinor,Currency,Note,CreatedByAccountId)
  VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,
   @CountedMinor,@Currency,@Note,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelTreasuryCashCountDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @CountId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertTreasuryCountAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''treasury.count.manage'';
 IF @CountId IS NULL OR @ClientRequestId IS NULL
  THROW 51482,''Invalid cancellation'',1;
 DECLARE @Status VARCHAR(10),@PriorRequest UNIQUEIDENTIFIER;
 SELECT @Status=Status,@PriorRequest=CancelRequestId
 FROM core.TreasuryCashCountDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND CountId=@CountId;
 IF @Status IS NULL THROW 51484,''Cash count not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @PriorRequest<>@ClientRequestId
   THROW 51483,''Cash count already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@CountId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  UPDATE core.TreasuryCashCountDraft
   SET Status=''CANCELLED'',CancelledAtUtc=SYSUTCDATETIME(),
    CancelRequestId=@ClientRequestId,CancelledByAccountId=@AccountId
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
   AND CountId=@CountId AND Status=''DRAFT'';
  SELECT CONVERT(VARCHAR(36),@CountId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

-- Explicit EXECUTE-only runtime, guard itself ungranted.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.TreasuryCashCountDraft
  TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadTreasuryCountDrafts TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateTreasuryCashCountDraft TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelTreasuryCashCountDraft TO [drvo_erp_stage_app];
END
