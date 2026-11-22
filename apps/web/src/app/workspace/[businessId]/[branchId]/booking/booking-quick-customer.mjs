import {canonicalizeEgyptPhoneE164} from "../customers/egyptian-phone.mjs";

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** UI validation only. Authoritative Customers service enforces phone/duplicate rules. */
export function prepareQuickCustomer(name,phone){
 if(typeof name!=="string"||typeof phone!=="string")return null;
 const displayName=name.normalize("NFKC").trim();
 if(!displayName||displayName.length>160||/[\u0000-\u001f\u007f]/.test(displayName))return null;
 const phoneE164=canonicalizeEgyptPhoneE164(phone);
 return phoneE164?{displayName,phoneE164}:null;
}
export function createdCustomerId(value){
 if(!value||typeof value!=="object"||
    typeof value.created!=="boolean"||typeof value.id!=="string"||!GUID.test(value.id))return null;
 return value.id;
}
export function conflictCustomerId(value){
 if(!value||typeof value!=="object")return null;
 const detail=value.message&&typeof value.message==="object"?value.message:value;
 return detail.code==="CUSTOMER_PHONE_EXISTS"&&
  typeof detail.existingCustomerId==="string"&&GUID.test(detail.existingCustomerId)
   ?detail.existingCustomerId:null;
}
/** Never treat a 409's client-facing ID as a verified customer record. */
export function matchingBusinessCustomer(search,customerId,phoneE164){
 if(!search||search.searchScope!=="BUSINESS"||!Array.isArray(search.customers)||
    search.customers.length>20)return null;
 const customer=search.customers.find(c=>c&&c.customerId===customerId&&
   c.isActive===true&&c.phoneE164===phoneE164&&
   typeof c.displayName==="string"&&c.displayName.trim().length>0);
 return customer?{
  customerId:customer.customerId,displayName:customer.displayName,
  phoneE164:customer.phoneE164,isActive:true,
 }:null;
}
