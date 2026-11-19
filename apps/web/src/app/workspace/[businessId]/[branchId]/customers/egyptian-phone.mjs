/** Shared Egyptian phone helpers for private Customers/POS UI (mirrors API). */
export function digitsOnly(raw){
 if(typeof raw!=='string')return '';
 return raw.trim()
  .replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632))
  .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776))
  .replace(/[^0-9]/g,'');
}
export function canonicalizeEgyptPhoneE164(raw){
 if(typeof raw!=='string')return null;
 const digit=digitsOnly(raw);
 let national=digit;
 if(/^01[0-9]{9}$/.test(digit))national='20'+digit.slice(1);
 else if(digit.startsWith('0020'))national=digit.slice(2);
 else if(digit.startsWith('20')&&digit.length>=11)national=digit;
 const cleaned='+'+national.replace(/[^0-9]/g,'');
 if(!/^\+[1-9][0-9]{6,14}$/.test(cleaned))return null;
 const lookedLocal=/^01[0-9]{9}$/.test(digit)
  ||/^(\+?20|0020)1[0-9]{9}$/.test(raw.replace(/[\s()-]/g,''));
 if(lookedLocal&&!/^\+201[0-9]{9}$/.test(cleaned))return null;
 return cleaned;
}
