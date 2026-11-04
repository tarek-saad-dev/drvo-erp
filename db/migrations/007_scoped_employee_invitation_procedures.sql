-- K5D new-account employee invitations scoped to authorized branch.
-- Never grants Owner roles; validates issuer session and role subset in SQL.
-- Ordinary API principal has only EXECUTE on the two vetted procedures.
-- Feature flags OFF. No invite/account created by this migration.
CREATE UNIQUE INDEX UX_K5D_OpenBranchInvite ON core.AccountInvitation
 (TenantId,BusinessId,BranchId,InvitedEmailHash)
 WHERE AcceptedAtUtc IS NULL AND RevokedAtUtc IS NULL;

EXEC(N'CREATE OR ALTER PROCEDURE core.IssueBranchInvitation
 @TenantId UNIQUEIDENTIFIER,
 @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,
 @IssuerAccountId UNIQUEIDENTIFIER,
 @IssuerSessionVersion INT,
 @IssuerSessionTokenHash CHAR(64),
 @InvitationId UNIQUEIDENTIFIER,
 @IntendedRoleId UNIQUEIDENTIFIER,
 @InvitedEmailHash CHAR(64),
 @TokenHash CHAR(64)
WITH EXECUTE AS SELF
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 DECLARE @ActorRole UNIQUEIDENTIFIER;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  SELECT TOP(1) @ActorRole=ar.RoleId
    FROM core.Account a WITH (UPDLOCK,HOLDLOCK)
    JOIN core.AuthSession s WITH (HOLDLOCK)
      ON s.TenantId=a.TenantId AND s.AccountId=a.AccountId
      AND s.SessionVersion=a.SessionVersion
      AND s.TokenHash=@IssuerSessionTokenHash
      AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
    JOIN core.AccountCredential cred
      ON cred.TenantId=a.TenantId AND cred.AccountId=a.AccountId
      AND cred.MustChangePassword=0
    JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
    JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
      AND bm.AccountId=a.AccountId AND bm.IsActive=1
    JOIN core.Business b ON b.TenantId=bm.TenantId
      AND b.BusinessId=bm.BusinessId AND b.IsActive=1
    JOIN core.BranchAssignment ba ON ba.TenantId=b.TenantId
      AND ba.BusinessId=b.BusinessId AND ba.AccountId=a.AccountId
      AND ba.IsActive=1
    JOIN core.Branch br ON br.TenantId=ba.TenantId
      AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId
      AND br.IsActive=1
    JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
      AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
      AND ar.AccountId=ba.AccountId AND ar.IsActive=1
    JOIN core.BusinessRole actorRole
      ON actorRole.TenantId=ar.TenantId AND actorRole.BusinessId=ar.BusinessId
      AND actorRole.RoleId=ar.RoleId AND actorRole.IsActive=1
    JOIN core.RolePermission perm
      ON perm.TenantId=ar.TenantId AND perm.BusinessId=ar.BusinessId
      AND perm.RoleId=ar.RoleId AND perm.ActionCode=''users.assign_role''
    WHERE a.TenantId=@TenantId AND a.AccountId=@IssuerAccountId
      AND a.SessionVersion=@IssuerSessionVersion AND a.IsActive=1
      AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId;
  IF @ActorRole IS NULL THROW 51100,''Permission denied'',1;

  IF NOT EXISTS (
    SELECT 1 FROM core.BusinessRole r WITH (HOLDLOCK)
    WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId
      AND r.RoleId=@IntendedRoleId AND r.IsActive=1
      AND r.RoleCode IN (N''MANAGER'',N''STAFF'',N''VIEWER'')
      AND NOT EXISTS (
        SELECT 1 FROM core.RolePermission requested
        WHERE requested.TenantId=@TenantId AND requested.BusinessId=@BusinessId
          AND requested.RoleId=@IntendedRoleId
          AND NOT EXISTS (
            SELECT 1 FROM core.RolePermission held
            WHERE held.TenantId=@TenantId AND held.BusinessId=@BusinessId
              AND held.RoleId=@ActorRole AND held.ActionCode=requested.ActionCode
          )
      )
  ) THROW 51101,''Role not delegable'',1;

  IF EXISTS (SELECT 1 FROM core.VerifiedAccountEmail WITH (HOLDLOCK)
     WHERE EmailHash=@InvitedEmailHash)
     THROW 51102,''Existing account invitations not supported'',1;
  IF EXISTS (
    SELECT 1 FROM core.AccountInvitation WITH (UPDLOCK,HOLDLOCK)
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId
      AND BranchId=@BranchId AND InvitedEmailHash=@InvitedEmailHash
      AND AcceptedAtUtc IS NULL AND RevokedAtUtc IS NULL
  ) THROW 51103,''Active invitation already exists'',1;
  IF (
    SELECT COUNT_BIG(*) FROM core.AccountInvitation WITH (UPDLOCK,HOLDLOCK)
    WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND BranchId=@BranchId
      AND IssuedAtUtc>=DATEADD(DAY,-1,SYSUTCDATETIME())
  ) >= 30 THROW 51104,''Branch invitation limit reached'',1;
  IF (
    SELECT COUNT_BIG(*) FROM core.AccountInvitation WITH (UPDLOCK,HOLDLOCK)
    WHERE InvitedEmailHash=@InvitedEmailHash
      AND IssuedAtUtc>=DATEADD(DAY,-1,SYSUTCDATETIME())
  ) >= 3 THROW 51105,''Recipient invitation limit reached'',1;

  INSERT INTO core.AccountInvitation
    (InvitationId,TenantId,BusinessId,BranchId,IssuerAccountId,
     InvitedEmailHash,TokenHash,IntendedRoleId,ExpiresAtUtc)
  VALUES
    (@InvitationId,@TenantId,@BusinessId,@BranchId,@IssuerAccountId,
     @InvitedEmailHash,@TokenHash,@IntendedRoleId,
     DATEADD(HOUR,24,SYSUTCDATETIME()));
  INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
    VALUES(@TenantId,@IssuerAccountId,''account.invitation.issued'');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH
END');

EXEC(N'CREATE OR ALTER PROCEDURE core.AcceptBranchInvitation
 @InvitedEmailHash CHAR(64),
 @TokenHash CHAR(64),
 @Username NVARCHAR(80),
 @NewAccountId UNIQUEIDENTIFIER,
 @Salt VARBINARY(32),
 @PasswordHash VARBINARY(64)
WITH EXECUTE AS SELF
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 DECLARE @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
   @BranchId UNIQUEIDENTIFIER,@IssuerAccountId UNIQUEIDENTIFIER,
   @IntendedRoleId UNIQUEIDENTIFIER,@InvitationId UNIQUEIDENTIFIER,
   @ActorRole UNIQUEIDENTIFIER;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;

  IF LEN(@Username) NOT BETWEEN 3 AND 80
    OR @Username LIKE N''%[^a-zA-Z0-9._-]%'' COLLATE Latin1_General_100_BIN2
    THROW 51110,''Invalid username'',1;

  SELECT TOP(1)
    @InvitationId=i.InvitationId,@TenantId=i.TenantId,
    @BusinessId=i.BusinessId,@BranchId=i.BranchId,
    @IssuerAccountId=i.IssuerAccountId,@IntendedRoleId=i.IntendedRoleId
  FROM core.AccountInvitation i WITH (UPDLOCK,HOLDLOCK)
  JOIN core.Tenant t ON t.TenantId=i.TenantId AND t.IsActive=1
  JOIN core.Business b ON b.TenantId=i.TenantId
    AND b.BusinessId=i.BusinessId AND b.IsActive=1
  JOIN core.Branch br ON br.TenantId=i.TenantId
    AND br.BusinessId=i.BusinessId AND br.BranchId=i.BranchId
    AND br.IsActive=1
  JOIN core.BusinessRole requested
    ON requested.TenantId=i.TenantId AND requested.BusinessId=i.BusinessId
    AND requested.RoleId=i.IntendedRoleId AND requested.IsActive=1
    AND requested.RoleCode IN (N''MANAGER'',N''STAFF'',N''VIEWER'')
  WHERE i.InvitedEmailHash=@InvitedEmailHash AND i.TokenHash=@TokenHash
    AND i.RevokedAtUtc IS NULL AND i.AcceptedAtUtc IS NULL
    AND i.ExpiresAtUtc>SYSUTCDATETIME();
  IF @InvitationId IS NULL THROW 51111,''Invalid or expired invitation'',1;

  SELECT TOP(1) @ActorRole=ar.RoleId
  FROM core.Account a WITH (UPDLOCK,HOLDLOCK)
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
    AND bm.AccountId=a.AccountId AND bm.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=bm.TenantId
    AND ba.BusinessId=bm.BusinessId AND ba.AccountId=bm.AccountId
    AND ba.IsActive=1
  JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
    AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
    AND ar.AccountId=ba.AccountId AND ar.IsActive=1
  JOIN core.BusinessRole held ON held.TenantId=ar.TenantId
    AND held.BusinessId=ar.BusinessId AND held.RoleId=ar.RoleId
    AND held.IsActive=1
  JOIN core.RolePermission p ON p.TenantId=ar.TenantId
    AND p.BusinessId=ar.BusinessId AND p.RoleId=ar.RoleId
    AND p.ActionCode=''users.assign_role''
  WHERE a.TenantId=@TenantId AND a.AccountId=@IssuerAccountId
    AND a.IsActive=1 AND bm.BusinessId=@BusinessId
    AND ba.BranchId=@BranchId;
  IF @ActorRole IS NULL THROW 51112,''Issuer lost invitation permission'',1;
  IF EXISTS (
    SELECT 1 FROM core.RolePermission requested
      WHERE requested.TenantId=@TenantId
        AND requested.BusinessId=@BusinessId
        AND requested.RoleId=@IntendedRoleId
        AND NOT EXISTS (
          SELECT 1 FROM core.RolePermission held
          WHERE held.TenantId=@TenantId AND held.BusinessId=@BusinessId
            AND held.RoleId=@ActorRole
            AND held.ActionCode=requested.ActionCode
        )
  ) THROW 51113,''Invitation role exceeds issuer permissions'',1;

  INSERT INTO core.Account(TenantId,AccountId,Username)
    VALUES(@TenantId,@NewAccountId,@Username);
  INSERT INTO core.AccountCredential
    (TenantId,AccountId,Salt,PasswordHash,PasswordAlgorithm,MustChangePassword)
    VALUES(@TenantId,@NewAccountId,@Salt,@PasswordHash,''scrypt-v1'',0);
  INSERT INTO core.VerifiedAccountEmail(TenantId,AccountId,EmailHash)
    VALUES(@TenantId,@NewAccountId,@InvitedEmailHash);
  INSERT INTO core.BusinessMembership(TenantId,BusinessId,AccountId)
    VALUES(@TenantId,@BusinessId,@NewAccountId);
  INSERT INTO core.BranchAssignment(TenantId,BusinessId,BranchId,AccountId)
    VALUES(@TenantId,@BusinessId,@BranchId,@NewAccountId);
  INSERT INTO core.BranchRole(TenantId,BusinessId,BranchId,AccountId,RoleId)
    VALUES(@TenantId,@BusinessId,@BranchId,@NewAccountId,@IntendedRoleId);

  UPDATE core.AccountInvitation
    SET AcceptedAtUtc=SYSUTCDATETIME(),AcceptedAccountId=@NewAccountId
    WHERE InvitationId=@InvitationId AND RevokedAtUtc IS NULL
      AND AcceptedAtUtc IS NULL AND ExpiresAtUtc>SYSUTCDATETIME();
  IF @@ROWCOUNT<>1 THROW 51114,''Invitation already accepted'',1;
  INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
    VALUES(@TenantId,@NewAccountId,''account.invitation.accepted'');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 GRANT EXECUTE ON OBJECT::core.IssueBranchInvitation TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.AcceptBranchInvitation TO [drvo_erp_stage_app];
END
