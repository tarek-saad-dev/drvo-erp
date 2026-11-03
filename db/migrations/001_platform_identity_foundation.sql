-- K4 forward-only, structural identity foundation. No users or business seed records.
-- Physical scope: Tenant -> Business -> Branch and Account -> Membership -> BranchAssignment.
-- K5 MUST implement trusted authentication, authorization, and effective Role permissions.
-- Explicit GUIDs are provided by the trusted server; never infer Tenant from client headers.

CREATE TABLE core.Tenant (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(160) NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Tenant_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Tenant_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_Tenant PRIMARY KEY (TenantId),
  CONSTRAINT CK_K4_Tenant_Name CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0)
);

CREATE TABLE core.Business (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(160) NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Business_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Business_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_Business PRIMARY KEY (TenantId, BusinessId),
  CONSTRAINT FK_K4_Business_Tenant FOREIGN KEY (TenantId)
    REFERENCES core.Tenant (TenantId),
  CONSTRAINT CK_K4_Business_Name CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0)
);

CREATE TABLE core.Branch (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(160) NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Branch_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Branch_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_Branch PRIMARY KEY (TenantId, BusinessId, BranchId),
  CONSTRAINT FK_K4_Branch_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES core.Business (TenantId, BusinessId),
  CONSTRAINT CK_K4_Branch_Name CHECK (LEN(LTRIM(RTRIM(DisplayName))) > 0)
);

-- An Account has one home Tenant in V1. A username is unique across all Tenants.
CREATE TABLE core.Account (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  Username NVARCHAR(80) COLLATE Latin1_General_100_CI_AS NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Account_Active DEFAULT (1),
  SessionVersion INT NOT NULL CONSTRAINT DF_K4_Account_SessionVersion DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Account_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_Account PRIMARY KEY (TenantId, AccountId),
  CONSTRAINT UQ_K4_Account_AccountId UNIQUE (AccountId),
  CONSTRAINT UQ_K4_Account_Username UNIQUE (Username),
  CONSTRAINT FK_K4_Account_Tenant FOREIGN KEY (TenantId)
    REFERENCES core.Tenant (TenantId),
  CONSTRAINT CK_K4_Account_Username CHECK (LEN(LTRIM(RTRIM(Username))) BETWEEN 3 AND 80),
  CONSTRAINT CK_K4_Account_SessionVersion CHECK (SessionVersion >= 1)
);

-- A Business membership is required even for an eventual Owner.
CREATE TABLE core.BusinessMembership (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Membership_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Membership_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_BusinessMembership PRIMARY KEY (TenantId, BusinessId, AccountId),
  CONSTRAINT FK_K4_Membership_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES core.Business (TenantId, BusinessId),
  CONSTRAINT FK_K4_Membership_Account FOREIGN KEY (TenantId, AccountId)
    REFERENCES core.Account (TenantId, AccountId)
);

-- This is structural Branch assignment, NOT a grant of permissions.
-- K5 must add the reviewed Role/Action authorization matrix.
CREATE TABLE core.BranchAssignment (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  IsActive BIT NOT NULL CONSTRAINT DF_K4_Assignment_Active DEFAULT (1),
  CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_K4_Assignment_Created DEFAULT SYSUTCDATETIME(),
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_K4_BranchAssignment PRIMARY KEY (TenantId, BusinessId, BranchId, AccountId),
  CONSTRAINT FK_K4_Assignment_Branch FOREIGN KEY (TenantId, BusinessId, BranchId)
    REFERENCES core.Branch (TenantId, BusinessId, BranchId),
  CONSTRAINT FK_K4_Assignment_Membership FOREIGN KEY (TenantId, BusinessId, AccountId)
    REFERENCES core.BusinessMembership (TenantId, BusinessId, AccountId)
);

CREATE INDEX IX_K4_Membership_Account
  ON core.BusinessMembership (TenantId, AccountId, BusinessId) INCLUDE (IsActive);
CREATE INDEX IX_K4_Assignment_Account
  ON core.BranchAssignment (TenantId, AccountId, BusinessId, BranchId) INCLUDE (IsActive);
