-- K5D staging foundation: operator-approved first Owner + verified email
-- + invite lifecycle. DATA MODEL ONLY. No owner/user/business is seeded.
-- NO app write grants or public signup endpoints. An Admin approval and
-- email-possession proof must exist BEFORE an Owner may ever be provisioned.
-- No raw OTPs, magic links or invite bearer tokens are persisted.

CREATE TABLE core.OwnerBootstrapApproval (
  ApprovalId UNIQUEIDENTIFIER NOT NULL,
  ApprovedUsername NVARCHAR(80) COLLATE Latin1_General_100_CI_AS NOT NULL,
  ApprovedEmailHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  TenantDisplayName NVARCHAR(160) NOT NULL,
  BusinessDisplayName NVARCHAR(160) NOT NULL,
  BranchDisplayName NVARCHAR(160) NOT NULL,
  ApprovedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_Approval_Approved DEFAULT SYSUTCDATETIME(),
  ExpiresAtUtc DATETIME2(3) NOT NULL,
  RevokedAtUtc DATETIME2(3) NULL,
  ConsumedAtUtc DATETIME2(3) NULL,
  ConsumedTenantId UNIQUEIDENTIFIER NULL,
  ConsumedAccountId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_K5D_OwnerBootstrapApproval PRIMARY KEY (ApprovalId),
  CONSTRAINT FK_K5D_Approval_Account FOREIGN KEY (ConsumedTenantId,ConsumedAccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT CK_K5D_Approval_Username CHECK (
    LEN(ApprovedUsername) BETWEEN 3 AND 80
    AND ApprovedUsername NOT LIKE N'%[^a-zA-Z0-9._-]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Approval_EmailHash CHECK (
    DATALENGTH(ApprovedEmailHash) = 64
    AND ApprovedEmailHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Approval_Names CHECK (
    LEN(LTRIM(RTRIM(TenantDisplayName))) BETWEEN 1 AND 160
    AND LEN(LTRIM(RTRIM(BusinessDisplayName))) BETWEEN 1 AND 160
    AND LEN(LTRIM(RTRIM(BranchDisplayName))) BETWEEN 1 AND 160
  ),
  CONSTRAINT CK_K5D_Approval_Expiry CHECK (ExpiresAtUtc > ApprovedAtUtc),
  CONSTRAINT CK_K5D_Approval_Consistent CHECK (
    (ConsumedAtUtc IS NULL AND ConsumedTenantId IS NULL AND ConsumedAccountId IS NULL)
    OR
    (ConsumedAtUtc IS NOT NULL AND ConsumedTenantId IS NOT NULL AND ConsumedAccountId IS NOT NULL)
  ),
  CONSTRAINT CK_K5D_Approval_RevokedAndConsumed CHECK (
    RevokedAtUtc IS NULL OR ConsumedAtUtc IS NULL
  )
);
CREATE UNIQUE INDEX UX_K5D_PendingOwnerEmail
  ON core.OwnerBootstrapApproval (ApprovedEmailHash)
  WHERE ConsumedAtUtc IS NULL AND RevokedAtUtc IS NULL;
CREATE UNIQUE INDEX UX_K5D_PendingOwnerUsername
  ON core.OwnerBootstrapApproval (ApprovedUsername)
  WHERE ConsumedAtUtc IS NULL AND RevokedAtUtc IS NULL;

CREATE TABLE core.EmailVerificationChallenge (
  ChallengeId UNIQUEIDENTIFIER NOT NULL,
  EmailHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  TokenHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  Purpose VARCHAR(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_Challenge_Created DEFAULT SYSUTCDATETIME(),
  ExpiresAtUtc DATETIME2(3) NOT NULL,
  AttemptCount TINYINT NOT NULL
    CONSTRAINT DF_K5D_Challenge_Attempts DEFAULT 0,
  ConsumedAtUtc DATETIME2(3) NULL,
  CONSTRAINT PK_K5D_Challenge PRIMARY KEY (ChallengeId),
  CONSTRAINT UQ_K5D_Challenge_TokenHash UNIQUE (TokenHash),
  CONSTRAINT CK_K5D_Challenge_EmailHash CHECK (
    DATALENGTH(EmailHash) = 64
    AND EmailHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Challenge_TokenHash CHECK (
    DATALENGTH(TokenHash) = 64
    AND TokenHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Challenge_Purpose CHECK (
    Purpose IN ('OWNER_BOOTSTRAP','ACCOUNT_INVITE','ACCOUNT_RECOVERY')
  ),
  CONSTRAINT CK_K5D_Challenge_Expiry CHECK (ExpiresAtUtc > CreatedAtUtc),
  CONSTRAINT CK_K5D_Challenge_Attempts CHECK (AttemptCount BETWEEN 0 AND 10)
);
CREATE INDEX IX_K5D_Challenge_EmailPurpose
  ON core.EmailVerificationChallenge (EmailHash,Purpose,CreatedAtUtc DESC)
  INCLUDE (ExpiresAtUtc,ConsumedAtUtc,AttemptCount);

CREATE TABLE core.VerifiedAccountEmail (
  TenantId UNIQUEIDENTIFIER NOT NULL,
  AccountId UNIQUEIDENTIFIER NOT NULL,
  EmailHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  VerifiedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_AccountEmail_Verified DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5D_VerifiedAccountEmail PRIMARY KEY (TenantId,AccountId),
  CONSTRAINT UQ_K5D_VerifiedAccountEmail_Email UNIQUE (EmailHash),
  CONSTRAINT FK_K5D_VerifiedAccountEmail_Account FOREIGN KEY (TenantId,AccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT CK_K5D_VerifiedAccountEmail_Hash CHECK (
    DATALENGTH(EmailHash)=64
    AND EmailHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  )
);

CREATE TABLE core.AccountInvitation (
  InvitationId UNIQUEIDENTIFIER NOT NULL,
  TenantId UNIQUEIDENTIFIER NOT NULL,
  BusinessId UNIQUEIDENTIFIER NOT NULL,
  BranchId UNIQUEIDENTIFIER NOT NULL,
  IssuerAccountId UNIQUEIDENTIFIER NOT NULL,
  InvitedEmailHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  TokenHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  IntendedRoleId UNIQUEIDENTIFIER NOT NULL,
  IssuedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_Invite_Issued DEFAULT SYSUTCDATETIME(),
  ExpiresAtUtc DATETIME2(3) NOT NULL,
  RevokedAtUtc DATETIME2(3) NULL,
  AcceptedAtUtc DATETIME2(3) NULL,
  AcceptedAccountId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_K5D_Invitation PRIMARY KEY (InvitationId),
  CONSTRAINT UQ_K5D_Invitation_Token UNIQUE (TokenHash),
  CONSTRAINT FK_K5D_Invitation_Branch FOREIGN KEY (TenantId,BusinessId,BranchId)
    REFERENCES core.Branch (TenantId,BusinessId,BranchId),
  CONSTRAINT FK_K5D_Invitation_Issuer FOREIGN KEY (TenantId,IssuerAccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT FK_K5D_Invitation_Role FOREIGN KEY (TenantId,BusinessId,IntendedRoleId)
    REFERENCES core.BusinessRole (TenantId,BusinessId,RoleId),
  CONSTRAINT FK_K5D_Invitation_AcceptedAccount FOREIGN KEY (TenantId,AcceptedAccountId)
    REFERENCES core.Account (TenantId,AccountId),
  CONSTRAINT CK_K5D_Invitation_Email CHECK (
    DATALENGTH(InvitedEmailHash)=64
    AND InvitedEmailHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Invitation_Token CHECK (
    DATALENGTH(TokenHash)=64
    AND TokenHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_Invitation_Expiry CHECK (ExpiresAtUtc > IssuedAtUtc),
  CONSTRAINT CK_K5D_Invitation_Consistent CHECK (
    (AcceptedAtUtc IS NULL AND AcceptedAccountId IS NULL)
    OR
    (AcceptedAtUtc IS NOT NULL AND AcceptedAccountId IS NOT NULL)
  ),
  CONSTRAINT CK_K5D_Invitation_RevokedAndAccepted CHECK (
    RevokedAtUtc IS NULL OR AcceptedAtUtc IS NULL
  )
);
CREATE INDEX IX_K5D_Invitation_Branch
  ON core.AccountInvitation (TenantId,BusinessId,BranchId,IssuedAtUtc DESC)
  INCLUDE (InvitedEmailHash,ExpiresAtUtc,AcceptedAtUtc,RevokedAtUtc);

-- Deliberately NO GRANT statements: the ordinary app principal cannot
-- SELECT, INSERT, UPDATE or DELETE onboarding records until the separately
-- reviewed K5D service with idempotent proof-of-email and operator controls
-- has been implemented and tested.
