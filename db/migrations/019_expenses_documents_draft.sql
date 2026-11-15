-- 019: Expenses Core — draft expense documents and Business categories only.
-- Source parity lead: Cashier /src/app/api/expenses/route.ts, adjusted for ADR-040.
-- Intentionally NOT a Treasury CashMove, payment, posted expense or Accounting journal.
-- Deploy to primary DRVO dev SQL ONLY after target and recoverable backup verification.
CREATE TABLE core.ExpenseCategory (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 CategoryId UNIQUEIDENTIFIER NOT NULL,ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 DisplayName NVARCHAR(100) NOT NULL,IsActive BIT NOT NULL
  CONSTRAINT DF_ExpenseCategory_Active DEFAULT(1),
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ExpenseCategory_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_ExpenseCategory PRIMARY KEY(TenantId,BusinessId,CategoryId),
 CONSTRAINT UQ_ExpenseCategory_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT UQ_ExpenseCategory_Name UNIQUE(TenantId,BusinessId,DisplayName),
 CONSTRAINT FK_ExpenseCategory_Business FOREIGN KEY(TenantId,BusinessId)
  REFERENCES core.Business(TenantId,BusinessId),
 CONSTRAINT CK_ExpenseCategory_Name CHECK(LEN(LTRIM(RTRIM(DisplayName))) BETWEEN 1 AND 100)
);
CREATE TABLE core.ExpenseDraft (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,DraftId UNIQUEIDENTIFIER NOT NULL,
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,CategoryId UNIQUEIDENTIFIER NOT NULL,
 AmountMinor BIGINT NOT NULL,Currency CHAR(3) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Note NVARCHAR(240) NOT NULL,Status VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL
  CONSTRAINT DF_ExpenseDraft_Status DEFAULT('DRAFT'),
 CreatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_ExpenseDraft_Created DEFAULT SYSUTCDATETIME(),
 CancelRequestId UNIQUEIDENTIFIER NULL,CancelledByAccountId UNIQUEIDENTIFIER NULL,
 CancelledAtUtc DATETIME2(3) NULL,
 CONSTRAINT PK_ExpenseDraft PRIMARY KEY(TenantId,BusinessId,BranchId,DraftId),
 CONSTRAINT UQ_ExpenseDraft_Request UNIQUE(TenantId,BusinessId,BranchId,ClientRequestId),
 CONSTRAINT FK_ExpenseDraft_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_ExpenseDraft_Category FOREIGN KEY(TenantId,BusinessId,CategoryId)
  REFERENCES core.ExpenseCategory(TenantId,BusinessId,CategoryId),
 CONSTRAINT FK_ExpenseDraft_Actor FOREIGN KEY(TenantId,CreatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_ExpenseDraft_CancelActor FOREIGN KEY(TenantId,CancelledByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_ExpenseDraft_Amount CHECK(AmountMinor BETWEEN 1 AND 9000000000000),
 CONSTRAINT CK_ExpenseDraft_Currency CHECK(Currency IN('EGP','SAR','AED','USD')),
 CONSTRAINT CK_ExpenseDraft_Status CHECK(Status IN('DRAFT','CANCELLED')),
 CONSTRAINT CK_ExpenseDraft_CancelState CHECK(
  (Status='DRAFT' AND CancelRequestId IS NULL AND CancelledByAccountId IS NULL AND CancelledAtUtc IS NULL)
  OR (Status='CANCELLED' AND CancelRequestId IS NOT NULL AND CancelledByAccountId IS NOT NULL AND CancelledAtUtc IS NOT NULL))
);
CREATE UNIQUE INDEX UX_ExpenseDraft_CancelRequest
 ON core.ExpenseDraft(TenantId,BusinessId,BranchId,CancelRequestId)
 WHERE CancelRequestId IS NOT NULL;
CREATE INDEX IX_ExpenseDraft_BranchRecent
 ON core.ExpenseDraft(TenantId,BusinessId,BranchId,CreatedAtUtc DESC,DraftId DESC);

EXEC(N'CREATE PROCEDURE core.AssertExpenseBranchAction
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),@Action VARCHAR(90)
AS BEGIN
 SET NOCOUNT ON;
 IF @Action NOT IN (''expenses.read'',''expenses.manage'') OR NOT EXISTS (
  SELECT 1 FROM core.AuthSession s
  JOIN core.Account a ON a.TenantId=s.TenantId AND a.AccountId=s.AccountId
   AND a.SessionVersion=s.SessionVersion AND a.IsActive=1
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId AND bm.AccountId=a.AccountId AND bm.IsActive=1
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
 ) THROW 51281,''Expense access denied'',1;
END');

EXEC(N'CREATE PROCEDURE core.ReadExpenseWorkspace
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertExpenseBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''expenses.read'';
 SELECT TOP(200) CONVERT(VARCHAR(36),CategoryId) AS categoryId,
  DisplayName AS displayName,IsActive AS isActive
 FROM core.ExpenseCategory
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId
 ORDER BY DisplayName,CategoryId;
 SELECT TOP(200) CONVERT(VARCHAR(36),d.DraftId) AS draftId,
  CONVERT(VARCHAR(36),d.CategoryId) AS categoryId,
  c.DisplayName AS categoryName,d.AmountMinor AS amountMinor,
  d.Currency AS currency,d.Note AS note,d.Status AS status,
  d.CreatedAtUtc AS createdAtUtc
 FROM core.ExpenseDraft d
 JOIN core.ExpenseCategory c ON c.TenantId=d.TenantId AND c.BusinessId=d.BusinessId
  AND c.CategoryId=d.CategoryId
 WHERE d.TenantId=@TenantId AND d.BusinessId=@BusinessId AND d.BranchId=@BranchId
 ORDER BY d.CreatedAtUtc DESC,d.DraftId DESC;
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateExpenseCategory
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@DisplayName NVARCHAR(100)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertExpenseBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''expenses.manage'';
 IF @ClientRequestId IS NULL OR @DisplayName IS NULL OR
  LEN(LTRIM(RTRIM(@DisplayName))) NOT BETWEEN 1 AND 100
   THROW 51282,''Invalid expense category'',1;
 SET @DisplayName=LTRIM(RTRIM(@DisplayName));
 DECLARE @Id UNIQUEIDENTIFIER,@PriorName NVARCHAR(100);
 SELECT @Id=CategoryId,@PriorName=DisplayName FROM core.ExpenseCategory WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PriorName<>@DisplayName THROW 51283,''Expense category replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  IF EXISTS(SELECT 1 FROM core.ExpenseCategory WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND DisplayName=@DisplayName)
   THROW 51283,''Expense category already exists'',1;
  SET @Id=NEWID();
  INSERT core.ExpenseCategory(TenantId,BusinessId,CategoryId,ClientRequestId,DisplayName)
   VALUES(@TenantId,@BusinessId,@Id,@ClientRequestId,@DisplayName);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CreateExpenseDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@CategoryId UNIQUEIDENTIFIER,
 @AmountMinor BIGINT,@Currency CHAR(3),@Note NVARCHAR(240)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertExpenseBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''expenses.manage'';
 IF @ClientRequestId IS NULL OR @CategoryId IS NULL OR
  @AmountMinor IS NULL OR @AmountMinor NOT BETWEEN 1 AND 9000000000000 OR
  @Currency IS NULL OR @Currency NOT IN(''EGP'',''SAR'',''AED'',''USD'') OR
  @Note IS NULL OR LEN(@Note)>240
   THROW 51282,''Invalid expense draft'',1;
 IF NOT EXISTS(SELECT 1 FROM core.ExpenseCategory
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId
   AND CategoryId=@CategoryId AND IsActive=1)
  THROW 51284,''Expense category unavailable'',1;
 DECLARE @Id UNIQUEIDENTIFIER,@PrevCategory UNIQUEIDENTIFIER,
  @PrevAmount BIGINT,@PrevCurrency CHAR(3),@PrevNote NVARCHAR(240);
 SELECT @Id=DraftId,@PrevCategory=CategoryId,@PrevAmount=AmountMinor,
  @PrevCurrency=Currency,@PrevNote=Note
 FROM core.ExpenseDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND ClientRequestId=@ClientRequestId;
 IF @Id IS NOT NULL BEGIN
  IF @PrevCategory<>@CategoryId OR @PrevAmount<>@AmountMinor
   OR @PrevCurrency<>@Currency OR @PrevNote<>@Note
   THROW 51283,''Expense draft replay conflict'',1;
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(0 AS BIT) AS created;
 END ELSE BEGIN
  SET @Id=NEWID();
  INSERT core.ExpenseDraft(TenantId,BusinessId,BranchId,DraftId,ClientRequestId,
   CategoryId,AmountMinor,Currency,Note,CreatedByAccountId)
   VALUES(@TenantId,@BusinessId,@BranchId,@Id,@ClientRequestId,
    @CategoryId,@AmountMinor,@Currency,@Note,@AccountId);
  SELECT CONVERT(VARCHAR(36),@Id) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.CancelExpenseDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @DraftId UNIQUEIDENTIFIER,@ClientRequestId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;BEGIN TRANSACTION;
 EXEC core.AssertExpenseBranchAction @TenantId,@BusinessId,@BranchId,@AccountId,
  @SessionVersion,@TokenHash,''expenses.manage'';
 IF @DraftId IS NULL OR @ClientRequestId IS NULL
  THROW 51282,''Invalid expense cancellation'',1;
 DECLARE @Status VARCHAR(10),@PriorRequest UNIQUEIDENTIFIER;
 SELECT @Status=Status,@PriorRequest=CancelRequestId FROM core.ExpenseDraft WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
  AND DraftId=@DraftId;
 IF @Status IS NULL THROW 51284,''Expense draft not found'',1;
 IF @Status=''CANCELLED'' BEGIN
  IF @PriorRequest<>@ClientRequestId THROW 51283,''Expense draft already cancelled'',1;
  SELECT CONVERT(VARCHAR(36),@DraftId) AS id,CAST(0 AS BIT) AS changed;
 END ELSE BEGIN
  UPDATE core.ExpenseDraft SET Status=''CANCELLED'',CancelRequestId=@ClientRequestId,
   CancelledByAccountId=@AccountId,CancelledAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
    AND DraftId=@DraftId AND Status=''DRAFT'';
  SELECT CONVERT(VARCHAR(36),@DraftId) AS id,CAST(1 AS BIT) AS changed;
 END
 COMMIT TRANSACTION;SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');

-- App principal has EXECUTE-only access to *public* scoped procedures.
-- Internal AssertExpenseBranchAction has no direct runtime EXECUTE grant.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.ExpenseCategory TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.ExpenseDraft TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadExpenseWorkspace TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateExpenseCategory TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CreateExpenseDraft TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.CancelExpenseDraft TO [drvo_erp_stage_app];
END
