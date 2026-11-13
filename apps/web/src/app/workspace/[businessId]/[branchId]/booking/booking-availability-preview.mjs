/**
 * Advisory local slot suggestions from already-authorized Booking reads.
 * A truncated 300-window / 200-appointment response is NOT a free-slot proof.
 * Only the Booking API + SQL may confirm a new appointment.
 */
const STEP_MS=15*60*1000;
const GUID=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
export function suggestBookingStarts({resourceId,dayLocal,durationMinutes,windows,appointments,nowMs=Date.now(),limit=8}){
 const empty=status=>({status,slots:[]});
 if(!GUID.test(resourceId||'')||!Number.isInteger(durationMinutes)||
   durationMinutes<1||durationMinutes>1440||
   typeof dayLocal!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(dayLocal)||
   !Array.isArray(windows)||!Array.isArray(appointments))return empty('NEED_SELECTION');
 const parts=dayLocal.split('-').map(Number);
 const localDay=new Date(parts[0],parts[1]-1,parts[2]);
 if(localDay.getFullYear()!==parts[0]||localDay.getMonth()!==parts[1]-1||
    localDay.getDate()!==parts[2])return empty('NEED_SELECTION');
 const dayBegin=localDay.getTime();
 const dayEnd=new Date(parts[0],parts[1]-1,parts[2]+1).getTime();
 const relevant=windows.filter(w=>w.resourceId===resourceId&&w.state==='OPEN');
 if(relevant.length===0)return empty('NO_OPEN_WINDOWS_RETURNED');
 const bookings=appointments.filter(b=>b.resourceId===resourceId&&b.status==='BOOKED')
   .map(b=>[Date.parse(b.startsAtUtc),Date.parse(b.endsAtUtc)])
   .filter(([s,e])=>Number.isFinite(s)&&Number.isFinite(e)&&e>s);
 const starts=new Set();
 const durationMs=durationMinutes*60000;
 const safeLimit=Math.min(Math.max(Number.isInteger(limit)?limit:8,1),12);
 for(const window of relevant.sort((a,b)=>Date.parse(a.startsAtUtc)-Date.parse(b.startsAtUtc))){
   const start=Date.parse(window.startsAtUtc),end=Date.parse(window.endsAtUtc);
   if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)continue;
   const first=Math.ceil(Math.max(start,dayBegin,nowMs+5*60000)/STEP_MS)*STEP_MS;
   for(let at=first;at<end&&at<dayEnd&&at+durationMs<=end;at+=STEP_MS){
     if(bookings.some(([s,e])=>s<at+durationMs&&e>at))continue;
     starts.add(at);
     if(starts.size>=safeLimit)break;
   }
   if(starts.size>=safeLimit)break;
 }
 const slots=[...starts].sort((a,b)=>a-b).slice(0,safeLimit).map(at=>{
   const local=new Date(at);
   const shifted=new Date(at-local.getTimezoneOffset()*60000);
   return {
     startsAtUtc:new Date(at).toISOString(),
     localInput:shifted.toISOString().slice(0,16),
     localLabel:local.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),
   };
 });
 return {status:slots.length?'SUGGESTIONS':'NO_VISIBLE_CANDIDATES',slots};
}
