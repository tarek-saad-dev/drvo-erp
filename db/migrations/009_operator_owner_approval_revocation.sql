-- K5D operator-only revocation attribution for failed/misdelivered Owner mail.
-- No HTTP route, no app principal grants, no schema seeding or new Owner.
CREATE TABLE core.OwnerApprovalRevocationAudit (
  ApprovalId UNIQUEIDENTIFIER NOT NULL,
  OperatorHash CHAR(64) COLLATE Latin1_General_100_BIN2 NOT NULL,
  ReasonCode VARCHAR(24) COLLATE Latin1_General_100_BIN2 NOT NULL,
  RevokedAtUtc DATETIME2(3) NOT NULL
    CONSTRAINT DF_K5D_OwnerApprovalRevoke_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_K5D_OwnerApprovalRevoke PRIMARY KEY (ApprovalId),
  CONSTRAINT FK_K5D_OwnerApprovalRevoke_Approval FOREIGN KEY (ApprovalId)
    REFERENCES core.OwnerBootstrapApproval (ApprovalId),
  CONSTRAINT CK_K5D_OwnerApprovalRevoke_Hash CHECK (
    DATALENGTH(OperatorHash)=64
    AND OperatorHash NOT LIKE '%[^0-9a-f]%' COLLATE Latin1_General_100_BIN2
  ),
  CONSTRAINT CK_K5D_OwnerApprovalRevoke_Reason CHECK (
    ReasonCode IN ('MAIL_FAILED','REISSUE','OPERATOR_REVOKE')
  )
);
-- Deliberately no GRANT to drvo_erp_stage_app.
