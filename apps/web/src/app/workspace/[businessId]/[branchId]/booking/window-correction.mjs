/** S8 local UI advice only; SQL017 is the sole authority. */
export function toLocalMinute(utc){
 const date=new Date(utc);
 if(typeof utc!=='string'||!Number.isFinite(date.getTime()))return '';
 return new Date(date.getTime()-date.getTimezoneOffset()*60000)
  .toISOString().slice(0,16);
}
export function windowCorrectionStage(windowId,resourceId,windows){
 if(windowId===null)return 'NO_CORRECTION';
 if(typeof windowId!=='string'||typeof resourceId!=='string'||!Array.isArray(windows))
  return 'STALE_OR_MISSING';
 const previous=windows.find(w=>w.windowId===windowId);
 if(!previous||previous.resourceId!==resourceId)return 'STALE_OR_MISSING';
 if(previous.state==='OPEN')return 'NEED_CLOSE';
 if(previous.state==='CLOSED')return 'READY_TO_PUBLISH';
 return 'STALE_OR_MISSING';
}
