export type SearchableCustomer={customerId:string;displayName:string;phoneE164?:string|null;isActive:boolean};
export declare function normalizeCustomerTerm(value:string):string;
export declare function findAuthorizedCustomers<T extends SearchableCustomer>(
 rows:readonly T[],query:string):T[];
