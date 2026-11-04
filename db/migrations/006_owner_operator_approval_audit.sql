-- K5D Operator approval audit: no new general-purpose application grants.
-- Only a root-authorized, database-scoped operator can create first Owner
-- approvals, linked to a keyed fingerprint of the human operator identity.
-- In particular, drvo_erp_stage_app must NOT receive any rights here.

CREATE TABLE core.OwnerApprovalOperatorAudit (
  ApprovalId UNIQUEIDENTIFIER NOT NULL,
  OperatorHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  CreatedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_OperatorAudit_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5D_OperatorAudit PRIMARY KEY (ApprovalId),
  CONSTRAINT FK_K5D_OperatorAudit_Approval FOREIGN KEY (ApprovalId)
    REFERENCES core.OwnerBootstrapApproval(ApprovalId),
  CONSTRAINT CK_K5D_OperatorAudit_Hash CHECK (
    DATALENGTH(OperatorHash)=64
    AND OperatorHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  )
);
CREATE INDEX IX_K5D_OperatorAudit_Operator
  ON core.OwnerApprovalOperatorAudit(OperatorHash,CreatedAtUtc DESC);

-- No GRANT statements by design. Root/operator executes this review-only
-- operation using the EXISTING separate staging SQL migrator account.
