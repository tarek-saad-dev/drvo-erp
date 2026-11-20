-- SQL034: Customers CRM follow-up desk (Cashier CU-04), additive, NON-POSTING.
-- Adapted from Cashier pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef:
--   src/app/admin/customers/follow-up/page.tsx
--   src/components/customers/ContactDialog.tsx
--   src/app/api/admin/customers/follow-up/route.ts
-- Built ONLY on SQL012 core.Customer + SQL031 core.CustomerProfile consent evidence.
-- Adds one append-only contact-attempt log (staff-recorded outcome notes) and two
-- EXECUTE-only read procedures plus one write procedure. Business-owned
-- (Tenant+Business); BranchId is attribution + RBAC only.
-- What this is NOT: no message is ever sent (no WhatsApp/SMS/email worker), no consent
-- is created or inferred (a stored phone is never consent), no "dormant customer"
-- ranking (that needs posted Sales history = CU-05, which is BLOCKED), no financial
-- posting, no Cut/Cashier import, no VPS/primary apply. SOURCE + disposable-SQL-CI only.

CREATE TABLE core.CustomerContactAttempt (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NOT NULL,AttemptId UNIQUEIDENTIFIER NOT NULL
  CONSTRAINT DF_CustomerContactAttempt_Id DEFAULT NEWID(),
 ClientRequestId UNIQUEIDENTIFIER NOT NULL,
 BranchId UNIQUEIDENTIFIER NOT NULL,
 Channel VARCHAR(16) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Outcome VARCHAR(20) COLLATE Latin1_General_100_BIN2 NOT NULL,
 Note NVARCHAR(300) NULL,
 ContactedPhoneE164 VARCHAR(16) NULL,
 FollowUpDueUtc DATETIME2(0) NULL,
 AccountId UNIQUEIDENTIFIER NOT NULL,
 CreatedAtUtc DATETIME2(3) NOT NULL
  CONSTRAINT DF_CustomerContactAttempt_Created DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_CustomerContactAttempt PRIMARY KEY(TenantId,BusinessId,CustomerId,AttemptId),
 CONSTRAINT UQ_CustomerContactAttempt_Request UNIQUE(TenantId,BusinessId,ClientRequestId),
 CONSTRAINT FK_CustomerContactAttempt_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
  REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_CustomerContactAttempt_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT FK_CustomerContactAttempt_Account FOREIGN KEY(TenantId,AccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_CustomerContactAttempt_Channel
  CHECK(Channel IN('CALL','WHATSAPP_MANUAL','IN_PERSON','OTHER')),
 CONSTRAINT CK_CustomerContactAttempt_Outcome
  CHECK(Outcome IN('REACHED','NO_ANSWER','WRONG_NUMBER','CALL_BACK_LATER','DECLINED')),
 CONSTRAINT CK_CustomerContactAttempt_Note CHECK(Note IS NULL OR LEN(LTRIM(RTRIM(Note)))>0),
 CONSTRAINT CK_CustomerContactAttempt_FollowUp CHECK(
  (Outcome='CALL_BACK_LATER' AND FollowUpDueUtc IS NOT NULL) OR
  (Outcome IN('REACHED','NO_ANSWER')) OR
  (Outcome IN('WRONG_NUMBER','DECLINED') AND FollowUpDueUtc IS NULL))
);
CREATE INDEX IX_CustomerContactAttempt_Customer ON core.CustomerContactAttempt
 (TenantId,BusinessId,CustomerId,CreatedAtUtc DESC) INCLUDE(Channel,Outcome,FollowUpDueUtc);

EXEC(N'CREATE PROCEDURE core.ReadCustomerFollowUpQueue
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @Filter VARCHAR(20)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 IF @Filter IS NULL OR @Filter NOT IN(''ALL'',''INCOMPLETE'',''NO_PHONE'',''NO_CONSENT'',
  ''HAS_NOTES'',''FOLLOW_UP_DUE'',''NEVER_CONTACTED'')
  THROW 51132,''Invalid Customer'',1;
 SELECT TOP(201) s.customerId,s.displayName,s.phoneE164,s.phoneMissing,s.profileMissing,
  s.birthDateMissing,s.addressMissing,s.sourceMissing,s.incomplete,s.hasNotes,
  s.consentState,s.lastAttemptAtUtc,s.lastChannel,s.lastOutcome,s.followUpDueUtc,
  s.followUpDue,s.attemptCount
 FROM (
  SELECT CONVERT(VARCHAR(36),c.CustomerId) AS customerId,c.DisplayName AS displayName,
   c.PhoneE164 AS phoneE164,
   CAST(CASE WHEN c.PhoneE164 IS NULL THEN 1 ELSE 0 END AS BIT) AS phoneMissing,
   CAST(CASE WHEN p.CustomerId IS NULL THEN 1 ELSE 0 END AS BIT) AS profileMissing,
   CAST(CASE WHEN p.BirthDate IS NULL THEN 1 ELSE 0 END AS BIT) AS birthDateMissing,
   CAST(CASE WHEN p.Address IS NULL THEN 1 ELSE 0 END AS BIT) AS addressMissing,
   CAST(CASE WHEN p.CameFrom IS NULL THEN 1 ELSE 0 END AS BIT) AS sourceMissing,
   CAST(CASE WHEN p.CustomerId IS NULL OR p.BirthDate IS NULL OR p.Address IS NULL
    OR p.CameFrom IS NULL THEN 1 ELSE 0 END AS BIT) AS incomplete,
   CAST(CASE WHEN p.Notes IS NOT NULL THEN 1 ELSE 0 END AS BIT) AS hasNotes,
   CASE
    WHEN p.OffersConsentedAtUtc IS NULL THEN ''NONE''
    WHEN p.OffersConsentRevokedAtUtc IS NOT NULL THEN ''REVOKED''
    WHEN p.OffersConsentPhoneE164 IS NULL OR p.OffersConsentPhoneE164<>c.PhoneE164
     THEN ''PHONE_CHANGED''
    ELSE ''ACTIVE'' END AS consentState,
   a.CreatedAtUtc AS lastAttemptAtUtc,a.Channel AS lastChannel,a.Outcome AS lastOutcome,
   a.FollowUpDueUtc AS followUpDueUtc,
   CAST(CASE WHEN a.FollowUpDueUtc IS NOT NULL AND a.FollowUpDueUtc<=SYSUTCDATETIME()
    THEN 1 ELSE 0 END AS BIT) AS followUpDue,
   ISNULL(n.cnt,0) AS attemptCount
  FROM core.Customer c
  LEFT JOIN core.CustomerProfile p ON p.TenantId=c.TenantId AND p.BusinessId=c.BusinessId
   AND p.CustomerId=c.CustomerId
  OUTER APPLY (SELECT TOP(1) x.CreatedAtUtc,x.Channel,x.Outcome,x.FollowUpDueUtc
   FROM core.CustomerContactAttempt x
   WHERE x.TenantId=c.TenantId AND x.BusinessId=c.BusinessId AND x.CustomerId=c.CustomerId
   ORDER BY x.CreatedAtUtc DESC,x.AttemptId) a
  OUTER APPLY (SELECT COUNT(*) AS cnt FROM core.CustomerContactAttempt y
   WHERE y.TenantId=c.TenantId AND y.BusinessId=c.BusinessId
    AND y.CustomerId=c.CustomerId) n
  WHERE c.TenantId=@TenantId AND c.BusinessId=@BusinessId AND c.IsActive=1
 ) s
 WHERE (@Filter=''ALL'' AND (s.followUpDue=1 OR s.incomplete=1 OR s.phoneMissing=1
   OR s.consentState IN(''REVOKED'',''PHONE_CHANGED'') OR s.hasNotes=1))
  OR (@Filter=''INCOMPLETE'' AND s.incomplete=1)
  OR (@Filter=''NO_PHONE'' AND s.phoneMissing=1)
  OR (@Filter=''NO_CONSENT'' AND s.consentState<>''ACTIVE'')
  OR (@Filter=''HAS_NOTES'' AND s.hasNotes=1)
  OR (@Filter=''FOLLOW_UP_DUE'' AND s.followUpDue=1)
  OR (@Filter=''NEVER_CONTACTED'' AND s.attemptCount=0)
 ORDER BY s.followUpDue DESC,s.followUpDueUtc,
  (CAST(s.incomplete AS INT)+CAST(s.phoneMissing AS INT)
   +CASE WHEN s.consentState IN(''REVOKED'',''PHONE_CHANGED'') THEN 1 ELSE 0 END) DESC,
  s.displayName,s.customerId;
 COMMIT TRANSACTION;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.ReadCustomerContactAttempts
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @CustomerId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.read'';
 IF NOT EXISTS(SELECT 1 FROM core.Customer
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
   AND IsActive=1)
  THROW 51131,''Access denied'',1;
 SELECT TOP(20) CONVERT(VARCHAR(36),x.AttemptId) AS attemptId,x.Channel AS channel,
  x.Outcome AS outcome,x.Note AS note,x.ContactedPhoneE164 AS contactedPhoneE164,
  x.FollowUpDueUtc AS followUpDueUtc,x.CreatedAtUtc AS createdAtUtc,
  CAST(CASE WHEN x.BranchId=@BranchId THEN 1 ELSE 0 END AS BIT) AS thisBranch
 FROM core.CustomerContactAttempt x
 WHERE x.TenantId=@TenantId AND x.BusinessId=@BusinessId AND x.CustomerId=@CustomerId
 ORDER BY x.CreatedAtUtc DESC,x.AttemptId;
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

EXEC(N'CREATE PROCEDURE core.LogCustomerContactAttempt
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ClientRequestId UNIQUEIDENTIFIER,@CustomerId UNIQUEIDENTIFIER,
 @Channel VARCHAR(16),@Outcome VARCHAR(20),@Note NVARCHAR(300)=NULL,
 @FollowUpDueUtc DATETIME2(0)=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.manage'';
 SET @Note=NULLIF(LTRIM(RTRIM(@Note)),N'''');
 IF @ClientRequestId IS NULL OR @CustomerId IS NULL OR @Channel IS NULL OR @Outcome IS NULL
  OR @Channel NOT IN(''CALL'',''WHATSAPP_MANUAL'',''IN_PERSON'',''OTHER'')
  OR @Outcome NOT IN(''REACHED'',''NO_ANSWER'',''WRONG_NUMBER'',''CALL_BACK_LATER'',''DECLINED'')
  OR (@Outcome=''CALL_BACK_LATER'' AND @FollowUpDueUtc IS NULL)
  OR (@Outcome IN(''WRONG_NUMBER'',''DECLINED'') AND @FollowUpDueUtc IS NOT NULL)
  OR (@FollowUpDueUtc IS NOT NULL AND (@FollowUpDueUtc<=SYSUTCDATETIME()
   OR @FollowUpDueUtc>DATEADD(YEAR,1,SYSUTCDATETIME())))
  THROW 51132,''Invalid Customer'',1;
 DECLARE @OldId UNIQUEIDENTIFIER,@OldCustomer UNIQUEIDENTIFIER,@OldChannel VARCHAR(16),
  @OldOutcome VARCHAR(20),@OldNote NVARCHAR(300),@OldDue DATETIME2(0);
 SELECT @OldId=AttemptId,@OldCustomer=CustomerId,@OldChannel=Channel,@OldOutcome=Outcome,
  @OldNote=Note,@OldDue=FollowUpDueUtc
 FROM core.CustomerContactAttempt WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND ClientRequestId=@ClientRequestId;
 IF @OldId IS NOT NULL
 BEGIN
  IF @OldCustomer<>@CustomerId OR @OldChannel<>@Channel OR @OldOutcome<>@Outcome
   OR ISNULL(@OldNote,N'''')<>ISNULL(@Note,N'''')
   OR ISNULL(CONVERT(VARCHAR(30),@OldDue,126),'''')<>ISNULL(CONVERT(VARCHAR(30),@FollowUpDueUtc,126),'''')
   THROW 51133,''Idempotency conflict'',1;
  SELECT CONVERT(VARCHAR(36),@OldId) AS id,CAST(0 AS BIT) AS created;
 END
 ELSE
 BEGIN
  DECLARE @Phone VARCHAR(16);
  SELECT @Phone=PhoneE164 FROM core.Customer WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
   AND IsActive=1;
  IF @@ROWCOUNT=0 THROW 51131,''Access denied'',1;
  IF @Channel IN(''CALL'',''WHATSAPP_MANUAL'') AND @Phone IS NULL
   THROW 51132,''Invalid Customer'',1;
  IF @Channel=''WHATSAPP_MANUAL'' AND NOT EXISTS(SELECT 1 FROM core.CustomerProfile WITH(UPDLOCK,HOLDLOCK)
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
    AND OffersConsentedAtUtc IS NOT NULL AND OffersConsentRevokedAtUtc IS NULL
    AND OffersConsentPhoneE164=@Phone)
   THROW 51134,''Contact not permitted'',1;
  DECLARE @NewId UNIQUEIDENTIFIER=NEWID();
  INSERT core.CustomerContactAttempt(TenantId,BusinessId,CustomerId,AttemptId,ClientRequestId,
   BranchId,Channel,Outcome,Note,ContactedPhoneE164,FollowUpDueUtc,AccountId)
  VALUES(@TenantId,@BusinessId,@CustomerId,@NewId,@ClientRequestId,@BranchId,@Channel,
   @Outcome,@Note,CASE WHEN @Channel IN(''CALL'',''WHATSAPP_MANUAL'') THEN @Phone ELSE NULL END,
   @FollowUpDueUtc,@AccountId);
  SELECT CONVERT(VARCHAR(36),@NewId) AS id,CAST(1 AS BIT) AS created;
 END
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL
BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.CustomerContactAttempt TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCustomerFollowUpQueue TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCustomerContactAttempts TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.LogCustomerContactAttempt TO [drvo_erp_stage_app];
END
