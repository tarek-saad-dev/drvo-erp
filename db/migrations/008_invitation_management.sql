-- K5D operational safety: show branch invitation metadata and revoke unaccepted links.
-- No plaintext email or raw token is stored or exposed.
-- Definer rights are scoped to reviewed SQL migrator; ordinary app gets EXECUTE ONLY.
EXEC(N'CREATE OR ALTER PROCEDURE core.ListBranchInvitations
 @TenantId UNIQUEIDENTIFIER,
 @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,
 @ActorAccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,
 @SessionTokenHash CHAR(64)
WITH EXECUTE AS SELF
AS
BEGIN
 SET NOCOUNT ON;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 IF NOT EXISTS (
  SELECT 1 FROM core.Account a WITH (HOLDLOCK)
  JOIN core.AuthSession s WITH (HOLDLOCK)
    ON s.TenantId=a.TenantId AND s.AccountId=a.AccountId
    AND s.SessionVersion=a.SessionVersion
    AND s.TokenHash=@SessionTokenHash
    AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId
    AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
    AND bm.AccountId=a.AccountId AND bm.BusinessId=@BusinessId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId
    AND b.BusinessId=bm.BusinessId AND b.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=bm.TenantId
    AND ba.BusinessId=bm.BusinessId AND ba.AccountId=bm.AccountId
    AND ba.BranchId=@BranchId AND ba.IsActive=1
  JOIN core.Branch br ON br.TenantId=ba.TenantId
    AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId
    AND br.IsActive=1
  JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
    AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
    AND ar.AccountId=ba.AccountId AND ar.IsActive=1
  JOIN core.BusinessRole r ON r.TenantId=ar.TenantId
    AND r.BusinessId=ar.BusinessId AND r.RoleId=ar.RoleId AND r.IsActive=1
  JOIN core.RolePermission p ON p.TenantId=r.TenantId
    AND p.BusinessId=r.BusinessId AND p.RoleId=r.RoleId
    AND p.ActionCode=''users.assign_role''
  WHERE a.TenantId=@TenantId AND a.AccountId=@ActorAccountId
    AND a.IsActive=1 AND a.SessionVersion=@SessionVersion
) THROW 51160,''Access denied'',1;
 SELECT TOP (50)
  CONVERT(VARCHAR(36),i.InvitationId) AS invitationId,
  CONVERT(VARCHAR(36),i.IntendedRoleId) AS roleId,
  r.RoleCode AS roleCode,
  i.IssuedAtUtc AS issuedAtUtc,
  i.ExpiresAtUtc AS expiresAtUtc,
  CASE
    WHEN i.RevokedAtUtc IS NOT NULL THEN ''REVOKED''
    WHEN i.AcceptedAtUtc IS NOT NULL THEN ''ACCEPTED''
    WHEN i.ExpiresAtUtc<=SYSUTCDATETIME() THEN ''EXPIRED''
    ELSE ''PENDING''
  END AS status
 FROM core.AccountInvitation i
 JOIN core.BusinessRole r ON r.TenantId=i.TenantId
   AND r.BusinessId=i.BusinessId AND r.RoleId=i.IntendedRoleId
 WHERE i.TenantId=@TenantId AND i.BusinessId=@BusinessId
   AND i.BranchId=@BranchId
 ORDER BY i.IssuedAtUtc DESC,i.InvitationId DESC;
END');
EXEC(N'CREATE OR ALTER PROCEDURE core.RevokeBranchInvitation
 @TenantId UNIQUEIDENTIFIER,
 @BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,
 @ActorAccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,
 @SessionTokenHash CHAR(64),
 @InvitationId UNIQUEIDENTIFIER
WITH EXECUTE AS SELF
AS
BEGIN
 SET NOCOUNT ON;
 SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  IF NOT EXISTS (
  SELECT 1 FROM core.Account a WITH (HOLDLOCK)
  JOIN core.AuthSession s WITH (HOLDLOCK)
    ON s.TenantId=a.TenantId AND s.AccountId=a.AccountId
    AND s.SessionVersion=a.SessionVersion
    AND s.TokenHash=@SessionTokenHash
    AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
  JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId
    AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
  JOIN core.Tenant t ON t.TenantId=a.TenantId AND t.IsActive=1
  JOIN core.BusinessMembership bm ON bm.TenantId=a.TenantId
    AND bm.AccountId=a.AccountId AND bm.BusinessId=@BusinessId AND bm.IsActive=1
  JOIN core.Business b ON b.TenantId=bm.TenantId
    AND b.BusinessId=bm.BusinessId AND b.IsActive=1
  JOIN core.BranchAssignment ba ON ba.TenantId=bm.TenantId
    AND ba.BusinessId=bm.BusinessId AND ba.AccountId=bm.AccountId
    AND ba.BranchId=@BranchId AND ba.IsActive=1
  JOIN core.Branch br ON br.TenantId=ba.TenantId
    AND br.BusinessId=ba.BusinessId AND br.BranchId=ba.BranchId
    AND br.IsActive=1
  JOIN core.BranchRole ar ON ar.TenantId=ba.TenantId
    AND ar.BusinessId=ba.BusinessId AND ar.BranchId=ba.BranchId
    AND ar.AccountId=ba.AccountId AND ar.IsActive=1
  JOIN core.BusinessRole r ON r.TenantId=ar.TenantId
    AND r.BusinessId=ar.BusinessId AND r.RoleId=ar.RoleId AND r.IsActive=1
  JOIN core.RolePermission p ON p.TenantId=r.TenantId
    AND p.BusinessId=r.BusinessId AND p.RoleId=r.RoleId
    AND p.ActionCode=''users.assign_role''
  WHERE a.TenantId=@TenantId AND a.AccountId=@ActorAccountId
    AND a.IsActive=1 AND a.SessionVersion=@SessionVersion
) THROW 51161,''Access denied'',1;
  UPDATE core.AccountInvitation
   SET RevokedAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId
     AND BranchId=@BranchId AND InvitationId=@InvitationId
     AND RevokedAtUtc IS NULL AND AcceptedAtUtc IS NULL;
  IF @@ROWCOUNT<>1 THROW 51162,''Invitation not revocable'',1;
  INSERT INTO core.SecurityAudit(TenantId,AccountId,EventCode)
   VALUES(@TenantId,@ActorAccountId,''account.invitation.revoked'');
  COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
 END CATCH
END');
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 GRANT EXECUTE ON OBJECT::core.ListBranchInvitations TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.RevokeBranchInvitation TO [drvo_erp_stage_app];
END
