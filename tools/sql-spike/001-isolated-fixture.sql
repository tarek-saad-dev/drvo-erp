-- K2 DISPOSABLE SQL SERVER SPIKE ONLY. NOT AN ERP MIGRATION.
-- These tables live only in a throwaway CI database and represent neither
-- a final Tenant/Business schema nor an accepted ADR-030 SQL design.
CREATE TABLE dbo.DrvoSpike_Tenants (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_DrvoSpike_Tenants PRIMARY KEY (TenantId)
);

CREATE TABLE dbo.DrvoSpike_Businesses (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_DrvoSpike_Businesses PRIMARY KEY (TenantId, BusinessId),
  CONSTRAINT FK_DrvoSpike_Businesses_Tenants
    FOREIGN KEY (TenantId) REFERENCES dbo.DrvoSpike_Tenants(TenantId)
);

CREATE TABLE dbo.DrvoSpike_Branches (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  DisplayName NVARCHAR(80) NOT NULL,
  CONSTRAINT PK_DrvoSpike_Branches PRIMARY KEY (TenantId, BusinessId, BranchId),
  CONSTRAINT FK_DrvoSpike_Branches_Businesses
    FOREIGN KEY (TenantId, BusinessId)
    REFERENCES dbo.DrvoSpike_Businesses(TenantId, BusinessId)
);

CREATE TABLE dbo.DrvoSpike_Resources (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  ResourceId UNIQUEIDENTIFIER NOT NULL,
  Label NVARCHAR(80) NOT NULL,
  RowVersion ROWVERSION NOT NULL,
  CONSTRAINT PK_DrvoSpike_Resources PRIMARY KEY (TenantId, BusinessId, BranchId, ResourceId),
  CONSTRAINT FK_DrvoSpike_Resources_Branches
    FOREIGN KEY (TenantId, BusinessId, BranchId)
    REFERENCES dbo.DrvoSpike_Branches(TenantId, BusinessId, BranchId)
);

CREATE TABLE dbo.DrvoSpike_Amounts (
  Id UNIQUEIDENTIFIER NOT NULL,
  Amount DECIMAL(19,4) NOT NULL,
  CONSTRAINT PK_DrvoSpike_Amounts PRIMARY KEY (Id)
);
