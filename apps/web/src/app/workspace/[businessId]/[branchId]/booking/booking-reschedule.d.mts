import type {AdvisorySlot,AdvisoryStatus} from "./booking-availability-preview.mjs";
type Appt={bookingId:string;resourceId:string;status:string;startsAtUtc:string;endsAtUtc:string};
export declare function canOfferReschedule(appointment:Appt|null|undefined,nowMs?:number):boolean;
export declare function appointmentDurationMinutes(appointment:Pick<Appt,"startsAtUtc"|"endsAtUtc">|null|undefined):number|null;
export declare function localMinuteToUtcIso(local:string,nowMs?:number):string|null;
export declare function buildMoveBody(input:{resourceId:string;localStart:string;nowMs?:number}):{resourceId:string;startsAtUtc:string}|null;
export declare function moveRequestKeyId(bookingId:string,body:{resourceId:string;startsAtUtc:string}):string;
export declare function advisoryMoveConflict<T extends Appt>(input:{
 appointments:readonly T[];bookingId:string;resourceId:string;startsAtUtc:string;durationMinutes:number|null;
}):T|null;
export declare function suggestMoveStarts(input:{
 appointment:Appt;resourceId:string;dayLocal:string;
 windows:readonly {resourceId:string;state:"OPEN"|"CLOSED";startsAtUtc:string;endsAtUtc:string}[];
 appointments:readonly Appt[];nowMs?:number;limit?:number;
}):{status:AdvisoryStatus;slots:AdvisorySlot[]};
export declare function describeMoveFailure(status:number):{key:"reset"|"keep";message:string};
