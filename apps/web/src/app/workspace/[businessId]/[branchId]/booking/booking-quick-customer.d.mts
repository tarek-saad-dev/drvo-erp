export declare function prepareQuickCustomer(
 name:unknown,phone:unknown
):{displayName:string;phoneE164:string}|null;
export declare function createdCustomerId(value:unknown):string|null;
export declare function conflictCustomerId(value:unknown):string|null;
export declare function matchingBusinessCustomer(
 search:unknown,customerId:string,phoneE164:string
):{customerId:string;displayName:string;phoneE164:string;isActive:true}|null;
