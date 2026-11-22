'use strict';
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/;
export function parseWebsiteSlots(data,resourceId,offeringId,utcDay){
 if(!GUID.test(resourceId)||!GUID.test(offeringId)||
    !data||typeof data!=='object'||Array.isArray(data)||
    data.advisory!==true||data.confirmed!==false||data.timezone!=='UTC'||
    data.utcDay!==utcDay||typeof data.resourceId!=='string'||typeof data.offeringId!=='string'||
    data.resourceId.toLowerCase()!==resourceId.toLowerCase()||
    data.offeringId.toLowerCase()!==offeringId.toLowerCase()||
    !Array.isArray(data.slots)||data.slots.length>24)return null;
 let last='';
 const slots=[];
 for(const slot of data.slots){
  if(!slot||typeof slot!=='object'||Array.isArray(slot)||
     typeof slot.startsAtUtc!=='string'||typeof slot.endsAtUtc!=='string'||
     !ISO.test(slot.startsAtUtc)||!ISO.test(slot.endsAtUtc)||
     !Number.isFinite(Date.parse(slot.startsAtUtc))||!Number.isFinite(Date.parse(slot.endsAtUtc))||
     new Date(slot.startsAtUtc).toISOString()!==slot.startsAtUtc||
     new Date(slot.endsAtUtc).toISOString()!==slot.endsAtUtc||
     slot.startsAtUtc.slice(0,10)!==utcDay||slot.startsAtUtc<=last||
     Date.parse(slot.endsAtUtc)<=Date.parse(slot.startsAtUtc))return null;
  last=slot.startsAtUtc;
  slots.push({startsAtUtc:slot.startsAtUtc,endsAtUtc:slot.endsAtUtc});
 }
 return {slots};
}
