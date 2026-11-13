/**
 * S9: lookup within the already independently authorized Customers GET result.
 * Never interprets a search term or CustomerId as permission to query other scope.
 * Booking GET is capped at 200 Customers; this is a local filter, not global search.
 */
export function normalizeCustomerTerm(value){
 if(typeof value!=='string')return '';
 return value.normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'')
  .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه')
  .replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660))
  .replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0))
  .toLocaleLowerCase('en').trim();
}
export function findAuthorizedCustomers(rows,query){
 if(!Array.isArray(rows)||typeof query!=='string')return [];
 const needle=normalizeCustomerTerm(query).slice(0,80);
 if(!needle)return rows;
 const numeric=/^[+0-9\s()-]+$/.test(needle);
 const digits=numeric?needle.replace(/[^0-9]/g,''):'';
 return rows.filter(c=>{
  if(!c||typeof c.displayName!=='string')return false;
  const name=normalizeCustomerTerm(c.displayName);
  const phone=typeof c.phoneE164==='string'?c.phoneE164:'';
  return name.includes(needle)||(digits.length>=3&&phone.replace(/[^0-9]/g,'').includes(digits));
 });
}
