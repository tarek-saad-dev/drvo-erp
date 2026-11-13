export type CorrectionStage="NO_CORRECTION"|"STALE_OR_MISSING"|"NEED_CLOSE"|"READY_TO_PUBLISH";
export declare function toLocalMinute(utc:string):string;
export declare function windowCorrectionStage(windowId:string|null,resourceId:string,
 windows:readonly {windowId:string;resourceId:string;state:"OPEN"|"CLOSED"}[]):CorrectionStage;
