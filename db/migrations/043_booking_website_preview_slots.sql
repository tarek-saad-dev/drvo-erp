-- SQL043: first BK-WEB1 source-backed website availability contract.
-- Private authenticated operator website-preview ONLY. Public booking remains OFF.
-- Share Booking owner. Read ALL scoped resource windows and booking conflicts,
-- not the truncated Booking board (200 appointments/300 windows).
-- A displayed slot is advisory; SQL013 CreateBookingAppointment still serializes
-- and re-checks conflict, active Catalog service and availability at write time.
-- Day interpretation is explicitly UTC, NOT a business's wall-clock timezone.
EXEC(N'CREATE PROCEDURE core.ReadWebsiteBookingSlots
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @ResourceId UNIQUEIDENTIFIER,@OfferingId UNIQUEIDENTIFIER,@UtcDayStart DATETIME2(0)
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
  SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
  BEGIN TRANSACTION;
  EXEC core.AssertBookingBranchAction
   @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.read'';
  IF @UtcDayStart IS NULL OR CONVERT(TIME(0),@UtcDayStart)<>''00:00:00''
   OR @UtcDayStart<CONVERT(DATE,SYSUTCDATETIME())
   OR @UtcDayStart>=DATEADD(DAY,90,CONVERT(DATE,SYSUTCDATETIME()))
    THROW 51154,''Invalid UTC day or outside supported preview horizon'',1;
  IF NOT EXISTS(SELECT 1 FROM core.BookingResource r
    WHERE r.TenantId=@TenantId AND r.BusinessId=@BusinessId
     AND r.BranchId=@BranchId AND r.ResourceId=@ResourceId AND r.IsActive=1)
    THROW 51156,''Resource not found'',1;
  DECLARE @Duration INT;
  SELECT @Duration=o.DurationMinutes FROM core.CatalogOffering o
   WHERE o.TenantId=@TenantId AND o.BusinessId=@BusinessId
    AND o.OfferingId=@OfferingId AND o.Kind=''SERVICE'' AND o.IsActive=1;
  IF @Duration IS NULL OR @Duration NOT BETWEEN 1 AND 1440
    THROW 51156,''Service not found'',1;
  -- Explicitly published OPEN window required for the website.
  -- Unlike older private resources, unconfigured windows are never assumed open.
  -- A CLOSED historic window still prevents showing time without an OPEN replacement.
  ;WITH digits(n) AS (
   SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
   SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
   SELECT 8 UNION ALL SELECT 9
  ), candidates AS (
   SELECT DATEADD(MINUTE,(a.n*10+b.n)*15,@UtcDayStart) AS startsAtUtc
   FROM digits a CROSS JOIN digits b
   WHERE a.n*10+b.n<96
  )
  SELECT TOP(24) c.startsAtUtc AS startsAtUtc,
   DATEADD(MINUTE,@Duration,c.startsAtUtc) AS endsAtUtc
  FROM candidates c
  WHERE c.startsAtUtc>=DATEADD(MINUTE,5,SYSUTCDATETIME())
   AND EXISTS(SELECT 1 FROM core.BookingResourceWindow w
     WHERE w.TenantId=@TenantId AND w.BusinessId=@BusinessId
      AND w.BranchId=@BranchId AND w.ResourceId=@ResourceId
      AND w.State=''OPEN'' AND w.StartsAtUtc<=c.startsAtUtc
      AND w.EndsAtUtc>=DATEADD(MINUTE,@Duration,c.startsAtUtc))
   AND NOT EXISTS(SELECT 1 FROM core.BookingAppointment b
     WHERE b.TenantId=@TenantId AND b.BusinessId=@BusinessId
      AND b.BranchId=@BranchId AND b.ResourceId=@ResourceId
      AND b.Status=''BOOKED''
      AND b.StartsAtUtc<DATEADD(MINUTE,@Duration,c.startsAtUtc)
      AND b.EndsAtUtc>c.startsAtUtc)
  ORDER BY c.startsAtUtc;
  COMMIT TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
  THROW;
 END CATCH
END');
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingResourceWindow TO [drvo_erp_stage_app];
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingAppointment TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadWebsiteBookingSlots TO [drvo_erp_stage_app];
END
