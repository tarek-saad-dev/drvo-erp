/**
 * BK-06 advisory helpers for the private Booking reschedule action.
 * Everything here is UI guidance from already-authorized (possibly truncated) reads.
 * ONLY the Booking API + SQL033 (validate-move / reschedule) decide a move; nothing
 * here proves a slot is free and no customer notification exists.
 */
import {suggestBookingStarts} from './booking-availability-preview.mjs';

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_LEAD_MS=5*60000;

/** Only a still-future BOOKED appointment can be offered a move (SQL033 enforces it). */
export function canOfferReschedule(appointment,nowMs=Date.now()){
 if(!appointment||appointment.status!=='BOOKED'||!GUID.test(appointment.bookingId||''))return false;
 const start=Date.parse(appointment.startsAtUtc);
 return Number.isFinite(start)&&start>nowMs;
}

export function appointmentDurationMinutes(appointment){
 const start=Date.parse(appointment?.startsAtUtc),end=Date.parse(appointment?.endsAtUtc);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 const minutes=Math.round((end-start)/60000);
 return minutes>=1&&minutes<=1440?minutes:null;
}

/** datetime-local value -> exact UTC minute ISO, or null when it cannot be a valid move. */
export function localMinuteToUtcIso(local,nowMs=Date.now()){
 if(typeof local!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))return null;
 const date=new Date(local);
 if(!Number.isFinite(date.getTime())||date.getSeconds()!==0||date.getMilliseconds()!==0)return null;
 // Reject calendar overflow such as 02-30 that V8 silently rolls into March.
 const roundTrip=new Date(date.getTime()-date.getTimezoneOffset()*60000)
  .toISOString().slice(0,16);
 if(roundTrip!==local)return null;
 if(date.getTime()<nowMs+MIN_LEAD_MS)return null;
 return date.toISOString();
}

/**
 * Build the exact request body. Scope (tenant/business/branch) is NEVER part of it;
 * the server derives scope from the session and URL.
 */
export function buildMoveBody({resourceId,localStart,nowMs=Date.now()}){
 if(!GUID.test(resourceId||''))return null;
 const startsAtUtc=localMinuteToUtcIso(localStart,nowMs);
 return startsAtUtc?{resourceId,startsAtUtc}:null;
}

/** Stable key so a retry of the SAME move reuses the Idempotency-Key, a new target does not. */
export function moveRequestKeyId(bookingId,body){
 return bookingId+'|'+body.resourceId+'|'+body.startsAtUtc;
}

/**
 * Advisory overlap check against loaded appointments (excludes the appointment itself).
 * Returns the first overlapping BOOKED appointment or null. May be incomplete (200-row cap).
 */
export function advisoryMoveConflict({appointments,bookingId,resourceId,startsAtUtc,durationMinutes}){
 if(!Array.isArray(appointments)||!Number.isInteger(durationMinutes))return null;
 const start=Date.parse(startsAtUtc);
 if(!Number.isFinite(start))return null;
 const end=start+durationMinutes*60000;
 return appointments.find(a=>a.bookingId!==bookingId&&a.resourceId===resourceId&&
  a.status==='BOOKED'&&Date.parse(a.startsAtUtc)<end&&Date.parse(a.endsAtUtc)>start)??null;
}

/** Suggested starts for the moved appointment: same duration, ignoring its own slot. */
export function suggestMoveStarts({appointment,resourceId,dayLocal,windows,appointments,nowMs=Date.now(),limit=8}){
 return suggestBookingStarts({
  resourceId,dayLocal,durationMinutes:appointmentDurationMinutes(appointment),windows,
  appointments:Array.isArray(appointments)?appointments.filter(a=>a.bookingId!==appointment?.bookingId):[],
  nowMs,limit,
 });
}

/** HTTP status -> operator message + whether the idempotency key must be discarded. */
export function describeMoveFailure(status){
 if(status===409)return {key:'reset',message:'الموعد الجديد فيه تعارض (المورد مشغول، أو خارج فترات التوافر، أو للحجز تذكرة طابور شغالة، أو الحجز اتغيّر). راجع البيانات واختار وقت تاني.'};
 if(status===400)return {key:'reset',message:'بيانات النقل غير صالحة. اختار مورد وموعد مستقبلي صحيحين.'};
 if(status===403||status===404)return {key:'reset',message:'النقل غير مصرح أو الحجز مش متاح.'};
 return {key:'keep',message:'تعذر تنفيذ النقل. أعد المحاولة بنفس الطلب لتفادي التكرار.'};
}
