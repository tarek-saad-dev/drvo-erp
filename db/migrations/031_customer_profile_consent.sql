-- SQL031: Customers CRM profile (DOB/address/notes/acquisition source) + explicit
-- WhatsApp-offers consent EVIDENCE. Adapted from Cashier pin
-- 046bf19b0d5833a07fe4b2891cbf3032d03b7cef:
--   src/lib/customerSource.ts, src/components/pos/QuickCustomerModal.tsx,
--   src/components/pos/CompleteCustomerModal.tsx,
--   db/migrations/add-customer-source-detail-columns.sql,
--   db/migrations/add-client-whatsapp-offers-consent-evidence.sql.
-- Business-owned (Tenant+Business), Branch used for RBAC only. EXECUTE-only runtime.
-- No marketing consent is ever inferred from a stored phone, no existing row is
-- backfilled, no messaging is sent, no financial posting, no Cut import.

CREATE TABLE core.CustomerProfile (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NOT NULL,
 BirthDate DATE NULL,
 Address NVARCHAR(200) NULL,
 Notes NVARCHAR(500) NULL,
 CameFrom VARCHAR(50) COLLATE Latin1_General_100_BIN2 NULL,
 CameFromDetails NVARCHAR(150) NULL,
 ReferralCode NVARCHAR(50) NULL,
 OffersConsentPhoneE164 VARCHAR(16) NULL,
 OffersConsentedAtUtc DATETIME2(3) NULL,
 OffersConsentEvidence VARCHAR(80) NULL,
 OffersConsentRecordedByAccountId UNIQUEIDENTIFIER NULL,
 OffersConsentRevokedAtUtc DATETIME2(3) NULL,
 UpdatedByAccountId UNIQUEIDENTIFIER NOT NULL,
 UpdatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_CustomerProfile_Updated DEFAULT SYSUTCDATETIME(),
 CreatedAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_CustomerProfile_Created DEFAULT SYSUTCDATETIME(),
 RowVersion ROWVERSION NOT NULL,
 CONSTRAINT PK_CustomerProfile PRIMARY KEY(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_CustomerProfile_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
  REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_CustomerProfile_UpdatedBy FOREIGN KEY(TenantId,UpdatedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_CustomerProfile_ConsentBy FOREIGN KEY(TenantId,OffersConsentRecordedByAccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT CK_CustomerProfile_BirthDate CHECK(BirthDate IS NULL OR BirthDate>='1900-01-01'),
 CONSTRAINT CK_CustomerProfile_Source CHECK(CameFrom IS NULL OR CameFrom IN(
  'existing_loyal','walk_by','word_of_mouth','instagram','facebook','tiktok',
  'google_maps','ai','referral_code')),
 -- ISNULL() keeps every branch two-valued: a CHECK that evaluates UNKNOWN would pass.
 CONSTRAINT CK_CustomerProfile_SourceDetails CHECK(
  (CameFrom IS NULL AND CameFromDetails IS NULL AND ReferralCode IS NULL) OR
  (ISNULL(CameFrom,'')='word_of_mouth' AND CameFromDetails IS NOT NULL AND ReferralCode IS NULL) OR
  (ISNULL(CameFrom,'')='referral_code' AND ReferralCode IS NOT NULL AND CameFromDetails IS NULL) OR
  (CameFrom IS NOT NULL AND ISNULL(CameFrom,'') NOT IN('word_of_mouth','referral_code')
   AND CameFromDetails IS NULL AND ReferralCode IS NULL)),
 CONSTRAINT CK_CustomerProfile_ConsentEvidence CHECK(
  (OffersConsentPhoneE164 IS NULL AND OffersConsentedAtUtc IS NULL
   AND OffersConsentEvidence IS NULL AND OffersConsentRecordedByAccountId IS NULL
   AND OffersConsentRevokedAtUtc IS NULL) OR
  (OffersConsentPhoneE164 IS NOT NULL AND OffersConsentedAtUtc IS NOT NULL
   AND OffersConsentEvidence IS NOT NULL AND OffersConsentRecordedByAccountId IS NOT NULL
   AND LEN(OffersConsentPhoneE164) BETWEEN 8 AND 16)),
 CONSTRAINT CK_CustomerProfile_ConsentRevoke CHECK(
  OffersConsentRevokedAtUtc IS NULL OR OffersConsentRevokedAtUtc>=OffersConsentedAtUtc)
);

-- Append-only consent history: GRANT/REVOKE rows are never updated or deleted, so a
-- later re-grant cannot erase an earlier opt-out. Runtime has EXECUTE-only access.
CREATE TABLE core.CustomerOffersConsentEvent (
 TenantId UNIQUEIDENTIFIER NOT NULL,BusinessId UNIQUEIDENTIFIER NOT NULL,
 CustomerId UNIQUEIDENTIFIER NOT NULL,EventId UNIQUEIDENTIFIER NOT NULL
  CONSTRAINT DF_CustomerConsentEvent_Id DEFAULT NEWID(),
 Action VARCHAR(10) COLLATE Latin1_General_100_BIN2 NOT NULL,
 PhoneE164 VARCHAR(16) NOT NULL,Evidence VARCHAR(80) NOT NULL,
 AccountId UNIQUEIDENTIFIER NOT NULL,BranchId UNIQUEIDENTIFIER NOT NULL,
 OccurredAtUtc DATETIME2(3) NOT NULL CONSTRAINT DF_CustomerConsentEvent_At DEFAULT SYSUTCDATETIME(),
 CONSTRAINT PK_CustomerConsentEvent PRIMARY KEY(TenantId,BusinessId,CustomerId,EventId),
 CONSTRAINT FK_CustomerConsentEvent_Customer FOREIGN KEY(TenantId,BusinessId,CustomerId)
  REFERENCES core.Customer(TenantId,BusinessId,CustomerId),
 CONSTRAINT FK_CustomerConsentEvent_Account FOREIGN KEY(TenantId,AccountId)
  REFERENCES core.Account(TenantId,AccountId),
 CONSTRAINT FK_CustomerConsentEvent_Branch FOREIGN KEY(TenantId,BusinessId,BranchId)
  REFERENCES core.Branch(TenantId,BusinessId,BranchId),
 CONSTRAINT CK_CustomerConsentEvent_Action CHECK(Action IN('GRANT','REVOKE'))
);

-- Read: Customer + optional profile. Consent is ACTIVE only when explicitly granted,
-- not revoked and recorded for the Customer's CURRENT phone (phone change voids it).
EXEC(N'CREATE PROCEDURE core.ReadCustomerProfile
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),@CustomerId UNIQUEIDENTIFIER
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
 SELECT CONVERT(VARCHAR(36),c.CustomerId) AS customerId,
  c.DisplayName AS displayName,c.PhoneE164 AS phoneE164,
  CAST(CASE WHEN p.CustomerId IS NULL THEN 0 ELSE 1 END AS BIT) AS profileExists,
  CONVERT(CHAR(10),p.BirthDate,23) AS birthDate,p.Address AS address,p.Notes AS notes,
  p.CameFrom AS cameFrom,p.CameFromDetails AS cameFromDetails,p.ReferralCode AS referralCode,
  CAST(CASE WHEN p.OffersConsentedAtUtc IS NOT NULL
   AND p.OffersConsentRevokedAtUtc IS NULL
   AND p.OffersConsentPhoneE164=c.PhoneE164 THEN 1 ELSE 0 END AS BIT) AS offersConsentActive,
  p.OffersConsentedAtUtc AS offersConsentedAtUtc,
  p.OffersConsentEvidence AS offersConsentEvidence,
  p.OffersConsentRevokedAtUtc AS offersConsentRevokedAtUtc,
  p.UpdatedAtUtc AS updatedAtUtc
 FROM core.Customer c
 LEFT JOIN core.CustomerProfile p ON p.TenantId=c.TenantId
  AND p.BusinessId=c.BusinessId AND p.CustomerId=c.CustomerId
 WHERE c.TenantId=@TenantId AND c.BusinessId=@BusinessId AND c.CustomerId=@CustomerId;
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY
 BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 THROW;
 END CATCH
END');

-- Upsert (full replace of profile fields). @ConsentAction: NULL=unchanged,
-- GRANT=staff confirmed explicit WhatsApp-offers consent for the Customer's current
-- phone, REVOKE=customer opted out. Source rules mirror Cashier validateCustomerSource.
EXEC(N'CREATE PROCEDURE core.UpsertCustomerProfile
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,
 @BranchId UNIQUEIDENTIFIER,@AccountId UNIQUEIDENTIFIER,
 @SessionVersion INT,@TokenHash CHAR(64),@CustomerId UNIQUEIDENTIFIER,
 @BirthDate VARCHAR(10)=NULL,@Address NVARCHAR(200)=NULL,@Notes NVARCHAR(500)=NULL,
 @CameFrom VARCHAR(50)=NULL,@CameFromDetails NVARCHAR(150)=NULL,
 @ReferralCode NVARCHAR(50)=NULL,@ConsentAction VARCHAR(10)=NULL
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertCustomersBranchAction @TenantId,@BusinessId,@BranchId,
  @AccountId,@SessionVersion,@TokenHash,''customers.manage'';
 DECLARE @Phone VARCHAR(16);
 SELECT @Phone=PhoneE164 FROM core.Customer WITH(UPDLOCK,HOLDLOCK)
 WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
  AND IsActive=1;
 IF @@ROWCOUNT=0 THROW 51131,''Access denied'',1;
 SET @Address=NULLIF(LTRIM(RTRIM(@Address)),N'''');
 SET @Notes=NULLIF(LTRIM(RTRIM(@Notes)),N'''');
 SET @CameFrom=NULLIF(LTRIM(RTRIM(@CameFrom)),'''');
 SET @CameFromDetails=NULLIF(LTRIM(RTRIM(@CameFromDetails)),N'''');
 SET @ReferralCode=NULLIF(LTRIM(RTRIM(@ReferralCode)),N'''');
 DECLARE @Birth DATE=NULL;
 IF @BirthDate IS NOT NULL
 BEGIN
  SET @Birth=TRY_CONVERT(DATE,@BirthDate,23);
  IF @Birth IS NULL OR @Birth<''1900-01-01'' OR @Birth>CAST(SYSUTCDATETIME() AS DATE)
   OR CONVERT(CHAR(10),@Birth,23)<>@BirthDate THROW 51132,''Invalid Customer'',1;
 END
 IF @ConsentAction IS NOT NULL AND @ConsentAction NOT IN(''GRANT'',''REVOKE'')
  THROW 51132,''Invalid Customer'',1;
 IF @CameFrom IS NOT NULL
 BEGIN
  IF @CameFrom NOT IN(''existing_loyal'',''walk_by'',''word_of_mouth'',''instagram'',
   ''facebook'',''tiktok'',''google_maps'',''ai'',''referral_code'')
   THROW 51132,''Invalid Customer'',1;
  IF @CameFrom=''word_of_mouth'' AND @CameFromDetails IS NULL THROW 51132,''Invalid Customer'',1;
  IF @CameFrom=''referral_code'' AND @ReferralCode IS NULL THROW 51132,''Invalid Customer'',1;
  IF @CameFrom<>''word_of_mouth'' SET @CameFromDetails=NULL;
  IF @CameFrom<>''referral_code'' SET @ReferralCode=NULL;
 END
 ELSE
 BEGIN
  SET @CameFromDetails=NULL;SET @ReferralCode=NULL;
 END
 -- A stored phone alone is never marketing consent; GRANT needs a phone to bind to.
 IF @ConsentAction=''GRANT'' AND @Phone IS NULL THROW 51132,''Invalid Customer'',1;
 IF EXISTS(SELECT 1 FROM core.CustomerProfile WITH(UPDLOCK,HOLDLOCK)
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId)
 BEGIN
  UPDATE core.CustomerProfile SET BirthDate=@Birth,Address=@Address,Notes=@Notes,
   CameFrom=@CameFrom,CameFromDetails=@CameFromDetails,ReferralCode=@ReferralCode,
   UpdatedByAccountId=@AccountId,UpdatedAtUtc=SYSUTCDATETIME()
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId;
 END
 ELSE
 BEGIN
  INSERT INTO core.CustomerProfile(TenantId,BusinessId,CustomerId,BirthDate,Address,Notes,
   CameFrom,CameFromDetails,ReferralCode,UpdatedByAccountId)
  VALUES(@TenantId,@BusinessId,@CustomerId,@Birth,@Address,@Notes,
   @CameFrom,@CameFromDetails,@ReferralCode,@AccountId);
 END
 IF @ConsentAction=''GRANT''
 BEGIN
  -- Idempotent: keep the original evidence when already active for this exact phone.
  UPDATE core.CustomerProfile SET OffersConsentPhoneE164=@Phone,
   OffersConsentedAtUtc=SYSUTCDATETIME(),
   OffersConsentEvidence=''STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS'',
   OffersConsentRecordedByAccountId=@AccountId,OffersConsentRevokedAtUtc=NULL
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
   AND NOT (OffersConsentedAtUtc IS NOT NULL AND OffersConsentRevokedAtUtc IS NULL
    AND OffersConsentPhoneE164=@Phone);
  IF @@ROWCOUNT>0
   INSERT INTO core.CustomerOffersConsentEvent(TenantId,BusinessId,CustomerId,Action,
    PhoneE164,Evidence,AccountId,BranchId)
   VALUES(@TenantId,@BusinessId,@CustomerId,''GRANT'',@Phone,
    ''STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS'',@AccountId,@BranchId);
 END
 ELSE IF @ConsentAction=''REVOKE''
 BEGIN
  DECLARE @RevokedPhone VARCHAR(16);
  SELECT @RevokedPhone=OffersConsentPhoneE164 FROM core.CustomerProfile
  WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId
   AND OffersConsentedAtUtc IS NOT NULL AND OffersConsentRevokedAtUtc IS NULL;
  IF @RevokedPhone IS NOT NULL
  BEGIN
   UPDATE core.CustomerProfile SET OffersConsentRevokedAtUtc=SYSUTCDATETIME()
   WHERE TenantId=@TenantId AND BusinessId=@BusinessId AND CustomerId=@CustomerId;
   INSERT INTO core.CustomerOffersConsentEvent(TenantId,BusinessId,CustomerId,Action,
    PhoneE164,Evidence,AccountId,BranchId)
   VALUES(@TenantId,@BusinessId,@CustomerId,''REVOKE'',@RevokedPhone,
    ''STAFF_RECORDED_CUSTOMER_OPT_OUT'',@AccountId,@BranchId);
  END
 END
 SELECT CONVERT(VARCHAR(36),c.CustomerId) AS customerId,
  c.DisplayName AS displayName,c.PhoneE164 AS phoneE164,
  CAST(1 AS BIT) AS profileExists,
  CONVERT(CHAR(10),p.BirthDate,23) AS birthDate,p.Address AS address,p.Notes AS notes,
  p.CameFrom AS cameFrom,p.CameFromDetails AS cameFromDetails,p.ReferralCode AS referralCode,
  CAST(CASE WHEN p.OffersConsentedAtUtc IS NOT NULL
   AND p.OffersConsentRevokedAtUtc IS NULL
   AND p.OffersConsentPhoneE164=c.PhoneE164 THEN 1 ELSE 0 END AS BIT) AS offersConsentActive,
  p.OffersConsentedAtUtc AS offersConsentedAtUtc,
  p.OffersConsentEvidence AS offersConsentEvidence,
  p.OffersConsentRevokedAtUtc AS offersConsentRevokedAtUtc,
  p.UpdatedAtUtc AS updatedAtUtc
 FROM core.Customer c
 JOIN core.CustomerProfile p ON p.TenantId=c.TenantId
  AND p.BusinessId=c.BusinessId AND p.CustomerId=c.CustomerId
 WHERE c.TenantId=@TenantId AND c.BusinessId=@BusinessId AND c.CustomerId=@CustomerId;
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
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.CustomerProfile TO [drvo_erp_stage_app];
 DENY SELECT, INSERT, UPDATE, DELETE ON OBJECT::core.CustomerOffersConsentEvent TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCustomerProfile TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.UpsertCustomerProfile TO [drvo_erp_stage_app];
END
