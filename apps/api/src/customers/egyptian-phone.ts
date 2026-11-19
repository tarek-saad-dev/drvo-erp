/**
 * Egyptian mobile canonicalization for Customers Core search/create.
 * Adapted from Cashier POS operator UX (01xxxxxxxxx / +20 / 0020) without
 * transporting legacy dbo or session assumptions.
 */
export function digitsOnly(raw:string):string{
 return raw.trim()
  .replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776))
  .replace(/[^0-9]/g,"");
}

/** Returns E.164 (+…) for usable phones; Egyptian 01… maps to +201…. */
export function canonicalizeEgyptPhoneE164(raw:string):string|null{
 const digit=digitsOnly(raw);
 let national=digit;
 if(/^01[0-9]{9}$/.test(digit))national="20"+digit.slice(1);
 else if(digit.startsWith("0020"))national=digit.slice(2);
 else if(digit.startsWith("20")&&digit.length>=11)national=digit;
 const cleaned="+"+national.replace(/[^0-9]/g,"");
 if(!/^\+[1-9][0-9]{6,14}$/.test(cleaned))return null;
 const lookedLocal=/^01[0-9]{9}$/.test(digit)
  ||/^(\+?20|0020)1[0-9]{9}$/.test(raw.replace(/[\s()-]/g,""));
 if(lookedLocal&&!/^\+201[0-9]{9}$/.test(cleaned))return null;
 return cleaned;
}

/** Digit needle for SQL LIKE phone search (min 3). */
export function phoneSearchDigits(raw:string):string|null{
 const e164=canonicalizeEgyptPhoneE164(raw);
 if(e164)return e164.replace(/[^0-9]/g,"");
 const d=digitsOnly(raw);
 return d.length>=3?d.slice(0,16):null;
}
