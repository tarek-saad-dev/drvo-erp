'use strict';
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseVerifiedBookingHandoff(data,bookingId){
 if(typeof bookingId!=='string'||!GUID.test(bookingId)||
    !data||typeof data!=='object'||Array.isArray(data))return null;
 if(Object.keys(data).sort().join('|')!=='bookingId|customerId|offeringId|status')return null;
 if(data.status!=='COMPLETED'||typeof data.bookingId!=='string'||
    !GUID.test(data.bookingId)||data.bookingId.toLowerCase()!==bookingId.toLowerCase()||
    typeof data.customerId!=='string'||!GUID.test(data.customerId)||
    typeof data.offeringId!=='string'||!GUID.test(data.offeringId))return null;
 return {customerId:data.customerId,offeringId:data.offeringId};
}
