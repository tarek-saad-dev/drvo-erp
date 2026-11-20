/**
 * Characterization excerpt derived from casher@046bf19
 * src/app/api/sales/[id]/route.ts DELETE (full blob 2e9746f0003587b94dc36344877bc7f61210d9e1).
 * Mirrors the route's reason trim + empty reject only. Not a byte-exact full-file lock.
 */
export function requireDeleteReason(body: { reason?: unknown; notes?: unknown }): string {
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    throw new Error('سبب مسح فاتورة المبيعات مطلوب');
  }
  return reason;
}
