/**
 * Customer acquisition-source contract for the private Customers/POS UI.
 * Mirrors apps/api/src/customers/customer-source.ts (a parity test keeps them equal),
 * ADAPTED from Cashier pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef
 * `src/lib/customerSource.ts` (blob 70f0ad1ba02b29d8d656368807b9ff62e465bd75).
 */
export const CUSTOMER_SOURCE_OPTIONS=[
 {value:'existing_loyal',label:'عميل قديم / لويال'},
 {value:'walk_by',label:'شاف المحل وهو معدّي'},
 {value:'word_of_mouth',label:'حد قاله عنّا'},
 {value:'instagram',label:'إنستجرام'},
 {value:'facebook',label:'فيسبوك'},
 {value:'tiktok',label:'تيك توك'},
 {value:'google_maps',label:'جوجل مابس'},
 {value:'ai',label:'عن طريق AI'},
 {value:'referral_code',label:'كود إحالة'},
];
export const CUSTOMER_SOURCE_VALUES=CUSTOMER_SOURCE_OPTIONS.map(o=>o.value);

export function isKnownCustomerSource(value){
 return typeof value==='string'&&value.length>0&&CUSTOMER_SOURCE_VALUES.includes(value);
}
export function isCustomerSourceMissing(cameFrom){
 return typeof cameFrom!=='string'||!cameFrom.trim();
}
export function getCustomerSourceLabel(value){
 if(!value)return '';
 const known=CUSTOMER_SOURCE_OPTIONS.find(o=>o.value===value);
 return known?known.label:'مصدر قديم: '+value;
}
export function formatCustomerSourceDisplay(cameFrom,cameFromDetails,referralCode){
 if(isCustomerSourceMissing(cameFrom))return '';
 const label=getCustomerSourceLabel(cameFrom);
 if(cameFrom==='word_of_mouth'&&cameFromDetails&&cameFromDetails.trim())
  return label+' — '+cameFromDetails.trim();
 if(cameFrom==='referral_code'&&referralCode&&referralCode.trim())
  return label+' — '+referralCode.trim();
 return label;
}
export function isCustomerProfileIncomplete(profile){
 return !profile||!profile.birthDate||!profile.address||isCustomerSourceMissing(profile.cameFrom);
}
/** Same rules as Cashier validateCustomerSource (also enforced by the API and SQL031). */
export function validateCustomerSource(cameFrom,cameFromDetails,referralCode){
 const result={cameFrom:null,cameFromDetails:null,referralCode:null,errors:{}};
 const rawSource=typeof cameFrom==='string'?cameFrom.trim():null;
 result.cameFrom=rawSource||null;
 const details=typeof cameFromDetails==='string'?cameFromDetails.trim():'';
 const code=typeof referralCode==='string'?referralCode.trim():'';
 if(!result.cameFrom){result.errors.cameFrom='مصدر العميل مطلوب';return result;}
 if(!isKnownCustomerSource(result.cameFrom)){
  result.errors.cameFrom='مصدر العميل غير صالح';return result;
 }
 if(result.cameFrom==='word_of_mouth'){
  if(!details)result.errors.cameFromDetails='اكتب اسم الشخص اللي رشّح العميل';
  result.cameFromDetails=details||null;result.referralCode=null;
 }else if(result.cameFrom==='referral_code'){
  if(!code)result.errors.referralCode='اكتب كود الإحالة';
  result.referralCode=code||null;result.cameFromDetails=null;
 }
 return result;
}
/** True when the draft carries any CRM field or an explicit consent grant. */
export function profileDraftHasContent(d){
 if(!d||typeof d!=='object')return false;
 return Boolean(d.birthDate||String(d.address||'').trim()||String(d.notes||'').trim()
  ||d.cameFrom||String(d.cameFromDetails||'').trim()||String(d.referralCode||'').trim()
  ||d.grantConsent);
}
/**
 * Build the Customers profile PUT body from a draft.
 * Source is optional, but if present (or detail/code filled) it must validate.
 */
export function buildProfileBody(d,consentAction){
 const errors={};
 const draft=d&&typeof d==='object'?d:{};
 const cameFrom=typeof draft.cameFrom==='string'?draft.cameFrom:'';
 const cameFromDetails=typeof draft.cameFromDetails==='string'?draft.cameFromDetails:'';
 const referralCode=typeof draft.referralCode==='string'?draft.referralCode:'';
 if(cameFrom||cameFromDetails.trim()||referralCode.trim()){
  const checked=validateCustomerSource(cameFrom,cameFromDetails,referralCode);
  Object.assign(errors,checked.errors);
 }
 if(Object.keys(errors).length)return {body:null,errors};
 const body={
  birthDate:draft.birthDate||null,
  address:String(draft.address||'').trim()||null,
  notes:String(draft.notes||'').trim()||null,
  cameFrom:cameFrom||null,
  cameFromDetails:cameFrom==='word_of_mouth'?cameFromDetails.trim()||null:null,
  referralCode:cameFrom==='referral_code'?referralCode.trim()||null:null,
 };
 if(consentAction)body.offersConsentAction=consentAction;
 return {body,errors};
}
