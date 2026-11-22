-- SQL042: Booking-owned verified COMPLETE appointment -> POS DRAFT handoff (read only).
-- Cashier: src/apps/booking/application/convertBooking.ts @ f8fa67d; no legacy invoice creation
-- from its financial conversion is imported before ADR-031 independent approvals.
-- SQL001-041 remain immutable. Scoped Booking K5 'booking.read' is required,
-- POS independently enforces its own permission and re-prices Catalog offerings.
-- No user-supplied customer/offering from a URL can authorize this lookup.
EXEC(N'CREATE PROCEDURE core.ReadCompletedBookingForPosDraft
 @TenantId UNIQUEIDENTIFIER,@BusinessId UNIQUEIDENTIFIER,@BranchId UNIQUEIDENTIFIER,
 @AccountId UNIQUEIDENTIFIER,@SessionVersion INT,@TokenHash CHAR(64),
 @BookingId UNIQUEIDENTIFIER
AS BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY
 SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
 BEGIN TRANSACTION;
 EXEC core.AssertBookingBranchAction
  @TenantId,@BusinessId,@BranchId,@AccountId,@SessionVersion,@TokenHash,''booking.read'';
 IF @BookingId IS NULL THROW 51156,''Appointment not found'',1;
 SELECT CONVERT(VARCHAR(36),b.BookingId) AS bookingId,
   CONVERT(VARCHAR(36),b.CustomerId) AS customerId,
   CONVERT(VARCHAR(36),b.OfferingId) AS offeringId,
   b.Status AS status
 FROM core.BookingAppointment b WITH(HOLDLOCK)
 WHERE b.TenantId=@TenantId AND b.BusinessId=@BusinessId AND b.BranchId=@BranchId
  AND b.BookingId=@BookingId AND b.Status=''COMPLETED'';
 -- Wrong branch, another tenant, stale/NO_SHOW/CANCELLED/BOOKED are all opaque 404.
 COMMIT TRANSACTION;
 SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
 END TRY BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  SET TRANSACTION ISOLATION LEVEL READ COMMITTED;THROW;
 END CATCH
END');
IF USER_ID(N'drvo_erp_stage_app') IS NOT NULL BEGIN
 DENY SELECT,INSERT,UPDATE,DELETE ON OBJECT::core.BookingAppointment TO [drvo_erp_stage_app];
 GRANT EXECUTE ON OBJECT::core.ReadCompletedBookingForPosDraft TO [drvo_erp_stage_app];
END
