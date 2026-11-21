-- SQL040: Owner Pilot module permissions (NONPOSTING).
-- ClaimApprovedOwner historically only granted branch/users actions.
-- Private Pilot Customer→Booking→POS Draft requires module actions on OWNER.
-- Additive: EnsureOwnerPilotModulePermissions for existing Owner businesses;
-- ClaimApprovedOwner gains the same Pilot action set for new claims.
-- ADR-031 posting remains BLOCKED; no sale/Treasury/GL permissions granted.
-- SchemaMigration row is recorded by tools/k4-db/migrate.cjs (Checksum required).
EXEC(N'CREATE OR ALTER PROCEDURE core.EnsureOwnerPilotModulePermissions
  @TenantId UNIQUEIDENTIFIER,
  @BusinessId UNIQUEIDENTIFIER
WITH EXECUTE AS SELF
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @OwnerRoleId UNIQUEIDENTIFIER;
  SELECT @OwnerRoleId = RoleId
  FROM core.BusinessRole WITH (UPDLOCK, HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND RoleCode=N''OWNER'';
  IF @OwnerRoleId IS NULL THROW 52040, N''OWNER role missing for Business'', 1;

  ;WITH PilotActions(ActionCode) AS (
    SELECT * FROM (VALUES
      (''branch.read''),
      (''users.read''),
      (''users.assign_role''),
      (''customers.read''),
      (''customers.manage''),
      (''catalog.read''),
      (''catalog.manage''),
      (''booking.read''),
      (''booking.manage''),
      (''hr.read''),
      (''hr.manage''),
      (''salon.barber.manage''),
      (''pos.draft.read''),
      (''pos.draft.manage''),
      (''inventory.read'')
    ) v(ActionCode)
  )
  INSERT INTO core.RolePermission(TenantId, BusinessId, RoleId, ActionCode)
  SELECT @TenantId, @BusinessId, @OwnerRoleId, a.ActionCode
  FROM PilotActions a
  WHERE NOT EXISTS (
    SELECT 1 FROM core.RolePermission p
    WHERE p.TenantId=@TenantId AND p.BusinessId=@BusinessId
      AND p.RoleId=@OwnerRoleId AND p.ActionCode=a.ActionCode
  );
END');

EXEC(N'CREATE OR ALTER PROCEDURE core.ClaimApprovedOwner
  @EmailHash CHAR(64),
  @TokenHash CHAR(64),
  @TenantId UNIQUEIDENTIFIER,
  @BusinessId UNIQUEIDENTIFIER,
  @BranchId UNIQUEIDENTIFIER,
  @AccountId UNIQUEIDENTIFIER,
  @OwnerRoleId UNIQUEIDENTIFIER,
  @ManagerRoleId UNIQUEIDENTIFIER,
  @StaffRoleId UNIQUEIDENTIFIER,
  @ViewerRoleId UNIQUEIDENTIFIER,
  @Salt VARBINARY(32),
  @PasswordHash VARBINARY(64)
WITH EXECUTE AS SELF
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;
  DECLARE @ApprovalId UNIQUEIDENTIFIER, @ChallengeId UNIQUEIDENTIFIER,
          @Username NVARCHAR(80), @TenantName NVARCHAR(160),
          @BusinessName NVARCHAR(160), @BranchName NVARCHAR(160);
  BEGIN TRY
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;

    SELECT TOP(1)
      @ApprovalId=a.ApprovalId,@ChallengeId=c.ChallengeId,
      @Username=a.ApprovedUsername,@TenantName=a.TenantDisplayName,
      @BusinessName=a.BusinessDisplayName,@BranchName=a.BranchDisplayName
    FROM core.OwnerBootstrapApproval a WITH (UPDLOCK,HOLDLOCK)
    INNER JOIN core.EmailVerificationChallenge c WITH (UPDLOCK,HOLDLOCK)
      ON c.EmailHash=a.ApprovedEmailHash
      AND c.Purpose=''OWNER_BOOTSTRAP''
      AND c.TokenHash=@TokenHash
      AND c.CreatedAtUtc>=a.ApprovedAtUtc
    WHERE a.ApprovedEmailHash=@EmailHash
      AND a.RevokedAtUtc IS NULL AND a.ConsumedAtUtc IS NULL
      AND a.ExpiresAtUtc>SYSUTCDATETIME()
      AND c.ConsumedAtUtc IS NULL AND c.ExpiresAtUtc>SYSUTCDATETIME()
      AND c.AttemptCount<10
      AND NOT EXISTS (
        SELECT 1 FROM core.VerifiedAccountEmail v WITH (HOLDLOCK)
        WHERE v.EmailHash=@EmailHash
      );
    IF @ApprovalId IS NULL THROW 51070,''Invalid or expired approval'',1;

    INSERT INTO core.Tenant(TenantId,DisplayName)
      VALUES(@TenantId,@TenantName);
    INSERT INTO core.Business(TenantId,BusinessId,DisplayName)
      VALUES(@TenantId,@BusinessId,@BusinessName);
    INSERT INTO core.Branch(TenantId,BusinessId,BranchId,DisplayName)
      VALUES(@TenantId,@BusinessId,@BranchId,@BranchName);
    INSERT INTO core.Account(TenantId,AccountId,Username)
      VALUES(@TenantId,@AccountId,@Username);
    INSERT INTO core.AccountCredential
      (TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)
      VALUES(@TenantId,@AccountId,@Salt,@PasswordHash,''scrypt-v1'',0);
    INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId)
      VALUES(@TenantId,@BusinessId,@AccountId);
    INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)
      VALUES(@TenantId,@BusinessId,@BranchId,@AccountId);

    INSERT INTO core.BusinessRole(TenantId,BusinessId,RoleId,RoleCode,DisplayName)
      VALUES
        (@TenantId,@BusinessId,@OwnerRoleId,N''OWNER'',N''Owner''),
        (@TenantId,@BusinessId,@ManagerRoleId,N''MANAGER'',N''Manager''),
        (@TenantId,@BusinessId,@StaffRoleId,N''STAFF'',N''Staff''),
        (@TenantId,@BusinessId,@ViewerRoleId,N''VIEWER'',N''Viewer'');
    INSERT INTO core.RolePermission(TenantId,BusinessId,RoleId,ActionCode)
      VALUES
        (@TenantId,@BusinessId,@OwnerRoleId,''branch.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''users.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''users.assign_role''),
        (@TenantId,@BusinessId,@OwnerRoleId,''customers.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''customers.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''catalog.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''catalog.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''booking.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''booking.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''hr.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''hr.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''salon.barber.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''pos.draft.read''),
        (@TenantId,@BusinessId,@OwnerRoleId,''pos.draft.manage''),
        (@TenantId,@BusinessId,@OwnerRoleId,''inventory.read''),
        (@TenantId,@BusinessId,@ManagerRoleId,''branch.read''),
        (@TenantId,@BusinessId,@ManagerRoleId,''users.read''),
        (@TenantId,@BusinessId,@StaffRoleId,''branch.read''),
        (@TenantId,@BusinessId,@ViewerRoleId,''branch.read'');
    INSERT INTO core.BranchRole
      (TenantId,BusinessId,BranchId,AccountId,RoleId)
      VALUES(@TenantId,@BusinessId,@BranchId,@AccountId,@OwnerRoleId);
    INSERT INTO core.VerifiedAccountEmail(TenantId,AccountId,EmailHash)
      VALUES(@TenantId,@AccountId,@EmailHash);

    UPDATE core.EmailVerificationChallenge
      SET ConsumedAtUtc=SYSUTCDATETIME()
      WHERE ChallengeId=@ChallengeId AND EmailHash=@EmailHash
        AND ConsumedAtUtc IS NULL AND ExpiresAtUtc>SYSUTCDATETIME()
        AND Purpose=''OWNER_BOOTSTRAP'' AND AttemptCount<10;
    IF @@ROWCOUNT <> 1 THROW 51071,''Invalid challenge'',1;

    UPDATE core.OwnerBootstrapApproval
      SET ConsumedAtUtc=SYSUTCDATETIME(),
          ConsumedTenantId=@TenantId,ConsumedAccountId=@AccountId
      WHERE ApprovalId=@ApprovalId AND ApprovedEmailHash=@EmailHash
        AND ConsumedAtUtc IS NULL AND RevokedAtUtc IS NULL
        AND ExpiresAtUtc>SYSUTCDATETIME();
    IF @@ROWCOUNT <> 1 THROW 51072,''Invalid approval'',1;

    INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
      VALUES(@TenantId,@AccountId,''owner.bootstrap'');
    COMMIT TRANSACTION;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
    THROW;
  END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
  GRANT EXECUTE ON OBJECT::core.ClaimApprovedOwner TO [drvo_erp_stage_app];
  -- Ensure is operator/migrator-facing only; do not grant to app principal.
END

IF USER_ID(N'drvo_erp_stage_migrator') IS NOT NULL
BEGIN
  GRANT EXECUTE ON OBJECT::core.EnsureOwnerPilotModulePermissions TO [drvo_erp_stage_migrator];
END
