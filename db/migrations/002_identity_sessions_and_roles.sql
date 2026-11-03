-- K5A: Identity/RBAC structural persistence. No account/role/bootstrap seeds.
-- All protected work must use an authenticated server-issued session, current
-- Account + BusinessMembership + BranchAssignment + BranchRole + RolePermission.
-- Never grant runtime app ALTER/CREATE or access to other SQL databases.

CREATE TABLE core.AccountCredential (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  Salt VARBINARY(32) NOT NULL,
  PasswordHash VARBINARY(64) NOT NULL,
  PasswordAlgorithm VARCHAR(20) NOT NULL,
  MustChangePassword BIT NOT NULL CONSTRAINT DF_K5_Credential_MustChange DEFAULT (1),
  PasswordChangedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K5_Credential_Changed DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5_AccountCredential PRIMARY KEY (TenantId, AccountId),
  CONSTRAINT FK_K5_Credential_Account FOREIGN KEY (TenantId, AccountId)
    REFERENCES core.Account (TenantId, AccountId),
  CONSTRAINT CK_K5_Credential_Algorithm CHECK (PasswordAlgorithm = 'scrypt-v1'),
  CONSTRAINT CK_K5_Credential_Salt CHECK (DATALENGTH(Salt) = 32),
  CONSTRAINT CK_K5_Credential_Hash CHECK (DATALENGTH(PasswordHash) = 64)
);

CREATE TABLE core.AuthSession (
  SessionId UNIQUEIDENTIFIER NOT NULL,
  TenantId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  SessionVersion INT NOT NULL,
  TokenHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K5_Session_Created DEFAULT SYSUTCDATETIME(),
  ExpiresAtUtc DATETIME2(3) NOT NULL,
  RevokedAtUtc DATETIME2(3) NULL,
  CONSTRAINT PK_K5_AuthSession PRIMARY KEY (SessionId),
  CONSTRAINT UQ_K5_AuthSession_Token UNIQUE (TokenHash),
  CONSTRAINT FK_K5_Session_Account FOREIGN KEY (TenantId, AccountId)
    REFERENCES core.Account (TenantId, AccountId),
  CONSTRAINT CK_K5_Session_Expiry CHECK (ExpiresAtUtc > CreatedAtUtc),
  CONSTRAINT CK_K5_Session_Version CHECK (SessionVersion >= 1)
);
CREATE INDEX IX_K5_AuthSession_Account ON core.AuthSession (TenantId, AccountId, ExpiresAtUtc);

CREATE TABLE core.BusinessRole (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  RoleId UNIQUEIDENTIFIER NOT NULL,
  RoleCode NVARCHAR(60) NOT NULL,
  DisplayName NVARCHAR(100) NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K5_Role_Active DEFAULT (1),
  CONSTRAINT PK_K5_BusinessRole PRIMARY KEY (TenantId, BusinessId, RoleId),
  CONSTRAINT UQ_K5_BusinessRole_Code UNIQUE (TenantId, BusinessId, RoleCode),
  CONSTRAINT FK_K5_Role_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES core.Business (TenantId, BusinessId)
);

CREATE TABLE core.RolePermission (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  RoleId UNIQUEIDENTIFIER NOT NULL,
  ActionCode VARCHAR(90) NOT NULL,
  CONSTRAINT PK_K5_RolePermission PRIMARY KEY (TenantId, BusinessId, RoleId, ActionCode),
  CONSTRAINT FK_K5_Permission_Role FOREIGN KEY (TenantId, BusinessId, RoleId)
    REFERENCES core.BusinessRole (TenantId, BusinessId, RoleId),
  CONSTRAINT CK_K5_Permission_Action CHECK (
    LEN(ActionCode) BETWEEN 3 AND 90
    AND ActionCode NOT LIKE '%[^a-z0-9._-]%' COLLATE Latin1_General_100_BIN2
  )
);

-- One effective Role per Account in each Branch (PK).
CREATE TABLE core.BranchRole (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  RoleId UNIQUEIDENTIFIER NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K5_BranchRole_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K5_BranchRole_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5_BranchRole PRIMARY KEY (TenantId, BusinessId, BranchId, AccountId),
  CONSTRAINT FK_K5_BranchRole_Assignment FOREIGN KEY (TenantId, BusinessId, BranchId, AccountId)
    REFERENCES core.BranchAssignment (TenantId, BusinessId, BranchId, AccountId),
  CONSTRAINT FK_K5_BranchRole_Role FOREIGN KEY (TenantId, BusinessId, RoleId)
    REFERENCES core.BusinessRole (TenantId, BusinessId, RoleId)
);

-- Username-based auth throttle is tenant-agnostic and never stores plaintext username/IP.
CREATE TABLE core.LoginThrottle (
  ThrottleKey CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  WindowStartedUtc DATETIME2(3) NOT NULL,
  FailedCount INT NOT NULL,
  CONSTRAINT PK_K5_LoginThrottle PRIMARY KEY (ThrottleKey),
  CONSTRAINT CK_K5_LoginThrottle_Count CHECK (FailedCount BETWEEN 0 AND 1000000)
);

CREATE TABLE core.SecurityAudit (
  AuditId BIGINT IDENTITY(1,1) NOT NULL,
  TenantId UNIQUEIDENTIFIER NULL,
  AccountId UNIQUEIDENTIFIER NULL,
  EventCode VARCHAR(60) NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K5_Audit_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5_SecurityAudit PRIMARY KEY (AuditId),
  CONSTRAINT CK_K5_Audit_Code CHECK (LEN(EventCode) BETWEEN 3 AND 60)
);
CREATE INDEX IX_K5_Audit_Actor ON core.SecurityAudit(TenantId, AccountId, CreatedAtUtc DESC);
