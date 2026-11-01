-- K3 DEVELOPMENT/CI AUTHORIZATION PROOF ONLY. NOT AN ACCEPTED ERP MIGRATION.
-- Disposable database DrvoK3Proof, separate from the prior K2 experiment.
CREATE TABLE dbo.K3_Tenants (
  TenantId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
  DisplayName NVARCHAR(80) NOT NULL
);
CREATE TABLE dbo.K3_Businesses (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_K3_Businesses PRIMARY KEY (TenantId, BusinessId),
  CONSTRAINT FK_K3_Business_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.K3_Tenants(TenantId)
);
CREATE TABLE dbo.K3_Branches (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_K3_Branches PRIMARY KEY (TenantId, BusinessId, BranchId),
  CONSTRAINT FK_K3_Branch_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES dbo.K3_Businesses(TenantId, BusinessId)
);
CREATE TABLE dbo.K3_Accounts (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  Username NVARCHAR(80) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  SessionVersion INT NOT NULL DEFAULT 1,
  CONSTRAINT PK_K3_Accounts PRIMARY KEY (TenantId, AccountId),
  CONSTRAINT UQ_K3_GlobalUsername UNIQUE (Username),
  CONSTRAINT CK_K3_SessionVersion CHECK (SessionVersion > 0),
  CONSTRAINT FK_K3_Account_Tenant FOREIGN KEY (TenantId) REFERENCES dbo.K3_Tenants(TenantId)
);
CREATE TABLE dbo.K3_BusinessMemberships (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CONSTRAINT PK_K3_Memberships PRIMARY KEY (TenantId, BusinessId, AccountId),
  CONSTRAINT FK_K3_Membership_Business FOREIGN KEY (TenantId, BusinessId)
    REFERENCES dbo.K3_Businesses(TenantId, BusinessId),
  CONSTRAINT FK_K3_Membership_Account FOREIGN KEY (TenantId, AccountId)
    REFERENCES dbo.K3_Accounts(TenantId, AccountId)
);
CREATE TABLE dbo.K3_RolePermissions (
  RoleCode VARCHAR(60) NOT NULL,
  ActionCode VARCHAR(80) NOT NULL,
  CONSTRAINT PK_K3_RolePermissions PRIMARY KEY (RoleCode, ActionCode)
);
CREATE TABLE dbo.K3_BranchRoles (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  RoleCode VARCHAR(60) NOT NULL,
  IsActive BIT NOT NULL DEFAULT 1,
  CONSTRAINT PK_K3_BranchRoles PRIMARY KEY (TenantId, BusinessId, BranchId, AccountId),
  CONSTRAINT FK_K3_Role_Branch FOREIGN KEY (TenantId, BusinessId, BranchId)
    REFERENCES dbo.K3_Branches(TenantId, BusinessId, BranchId),
  CONSTRAINT FK_K3_Role_Membership FOREIGN KEY (TenantId, BusinessId, AccountId)
    REFERENCES dbo.K3_BusinessMemberships(TenantId, BusinessId, AccountId)
);
