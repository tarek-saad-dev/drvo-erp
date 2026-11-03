-- K5B / slice 1: auditable, branch-scoped role assignment for existing accounts.
-- No tenants, owners, employee accounts, or permission seeds are created here.
-- The HTTP API must revalidate actor grants and a strict role-grant subset in
-- a SERIALIZABLE transaction. Never authorize from URL or JWT role claims.

CREATE TABLE core.BranchRoleChangeAudit (
  ChangeId BIGINT IDENTITY(1,1) NOT NULL,
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  ActorAccountId UNIQUEIDENTIFIER NOT NULL,
  TargetAccountId UNIQUEIDENTIFIER NOT NULL,
  OldRoleId UNIQUEIDENTIFIER NULL,
  NewRoleId UNIQUEIDENTIFIER NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5B_RoleChange_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5B_RoleChangeAudit PRIMARY KEY (ChangeId),
  CONSTRAINT FK_K5B_RoleAudit_Branch FOREIGN KEY (TenantId,BusinessId,BranchId)
    REFERENCES core.Branch (TenantId,BusinessId,BranchId),
  CONSTRAINT FK_K5B_RoleAudit_Actor FOREIGN KEY (TenantId,ActorAccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT FK_K5B_RoleAudit_Target FOREIGN KEY (TenantId,TargetAccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT FK_K5B_RoleAudit_NewRole FOREIGN KEY (TenantId,BusinessId,NewRoleId)
    REFERENCES core.BusinessRole (TenantId,BusinessId,RoleId),
  CONSTRAINT CK_K5B_RoleAudit_NoSelf CHECK (ActorAccountId <> TargetAccountId)
);
CREATE INDEX IX_K5B_RoleChange_Branch
  ON core.BranchRoleChangeAudit (TenantId,BusinessId,BranchId,CreatedAtUtc DESC);

-- Narrow writable objects for the existing runtime principal only; this
-- database-local login does not get DDL, role editing, or account creation.
-- CI containers may use a different app principal so guard its existence.
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
  GRANT SELECT ON OBJECT::core.BranchRoleChangeAudit TO [drvo_erp_stage_app];
  GRANT INSERT ON OBJECT::core.BranchRoleChangeAudit TO [drvo_erp_stage_app];
  GRANT INSERT ON OBJECT::core.BranchRole TO [drvo_erp_stage_app];
  GRANT UPDATE (RoleId, IsActive) ON OBJECT::core.BranchRole TO [drvo_erp_stage_app];
END
