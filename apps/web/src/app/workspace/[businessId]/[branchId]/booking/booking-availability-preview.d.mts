export type AdvisorySlot = {startsAtUtc:string;localInput:string;localLabel:string};
export type AdvisoryStatus = "NEED_SELECTION"|"NO_OPEN_WINDOWS_RETURNED"|"NO_VISIBLE_CANDIDATES"|"SUGGESTIONS";
export declare function suggestBookingStarts(input:{
 resourceId:string;dayLocal:string;durationMinutes:number|null|undefined;
 windows:readonly {resourceId:string;state:"OPEN"|"CLOSED";startsAtUtc:string;endsAtUtc:string}[];
 appointments:readonly {resourceId:string;status:string;startsAtUtc:string;endsAtUtc:string}[];
 nowMs?:number;limit?:number;
}):{status:AdvisoryStatus;slots:AdvisorySlot[]};
