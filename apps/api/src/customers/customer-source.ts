/**
 * Customer acquisition-source contract for Customers Core / CRM profile.
 *
 * ADAPTED from Cashier pinned source `src/lib/customerSource.ts`
 * (pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef, blob 70f0ad1ba02b29d8d656368807b9ff62e465bd75).
 * Behavior is preserved (nine stable codes, Arabic labels, detail rules). The only
 * change is dropping the legacy `Customer` (TblClient) type dependency.
 *
 * Database stores the stable English `value`; UI shows the Arabic `label`.
 */
export const CUSTOMER_SOURCE_OPTIONS=[
 {value:"existing_loyal",label:"عميل قديم / لويال"},
 {value:"walk_by",label:"شاف المحل وهو معدّي"},
 {value:"word_of_mouth",label:"حد قاله عنّا"},
 {value:"instagram",label:"إنستجرام"},
 {value:"facebook",label:"فيسبوك"},
 {value:"tiktok",label:"تيك توك"},
 {value:"google_maps",label:"جوجل مابس"},
 {value:"ai",label:"عن طريق AI"},
 {value:"referral_code",label:"كود إحالة"},
] as const;

export type CustomerSource=(typeof CUSTOMER_SOURCE_OPTIONS)[number]["value"];

export const CUSTOMER_SOURCE_VALUES:readonly CustomerSource[]=
 CUSTOMER_SOURCE_OPTIONS.map(o=>o.value);

/** Exact evidence code Cashier stores when staff confirm explicit WhatsApp-offers consent. */
export const OFFERS_CONSENT_EVIDENCE="STAFF_CONFIRMED_CUSTOMER_WHATSAPP_OFFERS";

export function isKnownCustomerSource(
 value:string|null|undefined,
):value is CustomerSource{
 return !!value&&CUSTOMER_SOURCE_VALUES.includes(value as CustomerSource);
}

export function getCustomerSourceLabel(value:string|null|undefined):string{
 if(!value)return "";
 const known=CUSTOMER_SOURCE_OPTIONS.find(o=>o.value===value);
 return known?.label??`مصدر قديم: ${value}`;
}

export function formatCustomerSourceDisplay(
 cameFrom:string|null|undefined,
 cameFromDetails:string|null|undefined,
 referralCode:string|null|undefined,
):string{
 if(!cameFrom?.trim())return "";
 const label=getCustomerSourceLabel(cameFrom);
 if(cameFrom==="word_of_mouth"&&cameFromDetails?.trim())
  return `${label} — ${cameFromDetails.trim()}`;
 if(cameFrom==="referral_code"&&referralCode?.trim())
  return `${label} — ${referralCode.trim()}`;
 return label;
}

export function isCustomerSourceMissing(cameFrom:string|null|undefined):boolean{
 return !cameFrom?.trim();
}

export type CustomerProfileFields={
 birthDate?:string|null;address?:string|null;cameFrom?:string|null;
};
/** Cashier `isCustomerIncomplete`: missing DOB, address or source. */
export function isCustomerProfileIncomplete(profile:CustomerProfileFields|null|undefined):boolean{
 return !profile?.birthDate||!profile?.address||isCustomerSourceMissing(profile?.cameFrom);
}

export type CustomerSourceValidation={
 cameFrom:string|null;cameFromDetails:string|null;referralCode:string|null;
 errors:Record<string,string>;
};

/**
 * Validate and normalize source fields.
 *  - `cameFrom` must be a supported code.
 *  - `word_of_mouth` requires `cameFromDetails` and clears `referralCode`.
 *  - `referral_code` requires `referralCode` and clears `cameFromDetails`.
 *  - All other sources clear both detail fields.
 *  - Empty strings normalize to null.
 */
export function validateCustomerSource(
 cameFrom:unknown,cameFromDetails:unknown,referralCode:unknown,
):CustomerSourceValidation{
 const result:CustomerSourceValidation={
  cameFrom:null,cameFromDetails:null,referralCode:null,errors:{},
 };
 const rawSource=typeof cameFrom==="string"?cameFrom.trim():null;
 result.cameFrom=rawSource||null;
 const details=typeof cameFromDetails==="string"?cameFromDetails.trim():"";
 const code=typeof referralCode==="string"?referralCode.trim():"";
 if(!result.cameFrom){
  result.errors.cameFrom="مصدر العميل مطلوب";
  return result;
 }
 if(!isKnownCustomerSource(result.cameFrom)){
  result.errors.cameFrom="مصدر العميل غير صالح";
  return result;
 }
 switch(result.cameFrom){
  case "word_of_mouth":
   if(!details)result.errors.cameFromDetails="اكتب اسم الشخص اللي رشّح العميل";
   result.cameFromDetails=details||null;
   result.referralCode=null;
   break;
  case "referral_code":
   if(!code)result.errors.referralCode="اكتب كود الإحالة";
   result.referralCode=code||null;
   result.cameFromDetails=null;
   break;
  default:
   result.cameFromDetails=null;
   result.referralCode=null;
 }
 return result;
}
