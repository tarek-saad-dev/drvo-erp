-- K6C: Business-scoped, non-authoritative candidate Module metadata.
-- Forward-only definition for separate, explicit database migration approval.
-- NO seed, activation, entitlement, pricing, customer/Owner or public authorization.
-- The app runtime has EXECUTE-only access to the tightly scoped procedure.
-- Same-owner, static SQL ownership chaining avoids privileged EXECUTE AS OWNER.
CREATE TABLE core.BusinessModuleCandidate (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  ModuleKey VARCHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CandidateVersion VARCHAR(32) COLLATE Latin1_General_100_BIN2 NOT NULL,
  DisplayName NVARCHAR(120) NOT NULL,
  CONSTRAINT PK_K6C_BusinessModuleCandidate
    PRIMARY KEY (TenantId, BusinessId, ModuleKey),
  CONSTRAINT FK_K6C_Candidate_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES core.Business (TenantId, BusinessId),
  CONSTRAINT CK_K6C_Candidate_Key CHECK (
    LEN(ModuleKey) BETWEEN 1 AND 64
    AND LEFT(ModuleKey,1) LIKE '[A-Za-z]' COLLATE Latin1_General_100_BIN2
    AND ModuleKey NOT LIKE '%[^A-Za-z0-9._-]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K6C_Candidate_Version CHECK (
    LEN(CandidateVersion) BETWEEN 1 AND 32
    AND CandidateVersion NOT LIKE '%[^0-9A-Za-z.+-]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K6C_Candidate_Name CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0)
);

-- Must be a separate dynamic batch: CREATE PROCEDURE first in its own batch.
EXEC(N'
CREATE PROCEDURE core.ReadBusinessModuleCandidates
  @TenantId UNIQUEIDENTIFIER,
  @BusinessId UNIQUEIDENTIFIER,
  @BranchId UNIQUEIDENTIFIER,
  @AccountId UNIQUEIDENTIFIER,
  @SessionVersion INT,
  @TokenHash CHAR(64)
AS
BEGIN
  SET NOCOUNT ON;
  -- Hold authorization joins stable until the candidate rows are read.
  -- Reset isolation on BOTH success/failure to avoid pooled-session leakage.
  BEGIN TRY
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    BEGIN TRANSACTION;
  -- All caller identity data comes from a previously verified server session.
  -- Recheck the *same* live session and active branch permission atomically
  -- with the read, against persisted SQL memberships, never client scope claims.
  IF NOT EXISTS (
    SELECT 1
    FROM core.AuthSession s
    JOIN core.Account a ON a.TenantId=s.TenantId
      AND a.AccountId=s.AccountId AND a.SessionVersion=s.SessionVersion
      AND a.IsActive=1
    JOIN core.AccountCredential cr ON cr.TenantId=a.TenantId
      AND cr.AccountId=a.AccountId AND cr.MustChangePassword=0
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
    JOIN core.BusinessRole ro ON ro.TenantId=ar.TenantId
      AND ro.BusinessId=ar.BusinessId AND ro.RoleId=ar.RoleId
      AND ro.IsActive=1
    JOIN core.RolePermission perm ON perm.TenantId=ro.TenantId
      AND perm.BusinessId=ro.BusinessId AND perm.RoleId=ro.RoleId
      AND perm.ActionCode=''branch.read''
    WHERE s.TenantId=@TenantId AND s.AccountId=@AccountId
      AND s.SessionVersion=@SessionVersion
      AND s.TokenHash=@TokenHash
      AND s.RevokedAtUtc IS NULL AND s.ExpiresAtUtc>SYSUTCDATETIME()
      AND a.SessionVersion=@SessionVersion
      AND b.BusinessId=@BusinessId AND br.BranchId=@BranchId
  )
    THROW 51091, ''Access denied'', 1;

  -- This metadata is scoped to exactly one Business; never read by a bare
  -- ModuleKey or a Tenant-only filter. Not an "active"/entitled/eligible list.
  SELECT c.ModuleKey AS moduleKey,
         c.CandidateVersion AS version,
         c.DisplayName AS displayName
  FROM core.BusinessModuleCandidate c
  JOIN core.Business b ON b.TenantId=c.TenantId
    AND b.BusinessId=c.BusinessId AND b.IsActive=1
  WHERE c.TenantId=@TenantId AND c.BusinessId=@BusinessId
  ORDER BY c.ModuleKey;
    COMMIT TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
    THROW;
  END CATCH
END
');

-- Stage runtime app: even if a broader role is accidentally granted later,
-- direct SELECT/INSERT/UPDATE/DELETE of candidate metadata is denied.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
  DENY SELECT, INSERT, UPDATE, DELETE
    ON OBJECT::core.BusinessModuleCandidate TO [drvo_erp_stage_app];
  GRANT EXECUTE ON OBJECT::core.ReadBusinessModuleCandidates
    TO [drvo_erp_stage_app];
END
