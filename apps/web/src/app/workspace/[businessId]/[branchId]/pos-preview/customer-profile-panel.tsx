"use client";
/**
 * CRM profile (DOB / address / notes / acquisition source / WhatsApp-offers consent).
 * ADAPTED from Cashier pin 046bf19b0d5833a07fe4b2891cbf3032d03b7cef:
 *  QuickCustomerModal.tsx, CompleteCustomerModal.tsx, CustomerSourceFields.tsx.
 * Writes go ONLY to the DRVO Customers API (SQL031 EXECUTE-only); a stored phone is never
 * treated as marketing consent and nothing is sent to the customer from here.
 */
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {
 CUSTOMER_SOURCE_OPTIONS,formatCustomerSourceDisplay,isCustomerProfileIncomplete,
 buildProfileBody as buildProfileBodyImpl,
 profileDraftHasContent as profileDraftHasContentImpl,
} from "../customers/customer-source.mjs";

export type ProfileDraft={
 birthDate:string;address:string;notes:string;
 cameFrom:string;cameFromDetails:string;referralCode:string;grantConsent:boolean;
};
export const EMPTY_PROFILE_DRAFT:ProfileDraft={
 birthDate:"",address:"",notes:"",cameFrom:"",cameFromDetails:"",referralCode:"",
 grantConsent:false,
};
type ProfileView={
 customerId:string;displayName:string;phoneE164:string|null;profileExists:boolean;
 birthDate:string|null;address:string|null;notes:string|null;
 cameFrom:string|null;cameFromDetails:string|null;referralCode:string|null;
 offersConsentActive:boolean;offersConsentedAtUtc:string|null;
 offersConsentRevokedAtUtc:string|null;incomplete:boolean;
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function profileDraftHasContent(d:ProfileDraft):boolean{
 return profileDraftHasContentImpl(d);
}
/** Cashier rules: source is optional, but if present it must validate. */
export function buildProfileBody(d:ProfileDraft,consentAction?:"GRANT"|"REVOKE"):
 {body:Record<string,unknown>|null;errors:Record<string,string>}{
 const result=buildProfileBodyImpl(d,consentAction) as {
  body:Record<string,unknown>|null;errors:Record<string,string>;
 };
 return {body:result.body??null,errors:result.errors??{}};
}

/** Controlled field set shared by quick-create and complete/edit. */
export function CustomerProfileFields({draft,onChange,errors,phone,consentLocked}:{
 draft:ProfileDraft;onChange:(next:ProfileDraft)=>void;errors:Record<string,string>;
 phone:string|null;consentLocked?:boolean;
}){
 const set=(patch:Partial<ProfileDraft>)=>onChange({...draft,...patch});
 return <div className="catalog-form" data-customer-profile-fields="cashier-crm">
  <label>تاريخ الميلاد<input type="date" dir="ltr" value={draft.birthDate}
   max={new Date().toISOString().slice(0,10)} min="1900-01-01"
   onChange={e=>set({birthDate:e.target.value})}/></label>
  <label>العنوان<input maxLength={200} value={draft.address}
   onChange={e=>set({address:e.target.value})} placeholder="عنوان العميل..."/></label>
  <fieldset aria-label="عرفنا منين؟">
   <legend>عرفنا منين؟</legend>
   <div className="k5-booking-actions">
    {CUSTOMER_SOURCE_OPTIONS.map((option:{value:string;label:string})=>
     <button key={option.value} type="button" aria-pressed={draft.cameFrom===option.value}
      className={draft.cameFrom===option.value?"k5-save":undefined}
      onClick={()=>set({
       cameFrom:option.value,
       cameFromDetails:option.value==="word_of_mouth"?draft.cameFromDetails:"",
       referralCode:option.value==="referral_code"?draft.referralCode:"",
      })}>{option.label}</button>)}
    {draft.cameFrom&&<button type="button"
     onClick={()=>set({cameFrom:"",cameFromDetails:"",referralCode:""})}>مسح المصدر</button>}
   </div>
   {errors.cameFrom&&<p role="alert" className="k5-error">{errors.cameFrom}</p>}
  </fieldset>
  {draft.cameFrom==="word_of_mouth"&&<label>مين اللي قاله عنّا؟
   <input maxLength={150} value={draft.cameFromDetails}
    onChange={e=>set({cameFromDetails:e.target.value})}
    placeholder="اكتب اسم الشخص اللي رشّح العميل"/>
   {errors.cameFromDetails&&<span role="alert" className="k5-error">{errors.cameFromDetails}</span>}
  </label>}
  {draft.cameFrom==="referral_code"&&<label>كود الإحالة
   <input dir="ltr" maxLength={50} value={draft.referralCode}
    onChange={e=>set({referralCode:e.target.value})} placeholder="اكتب كود الإحالة"/>
   {errors.referralCode&&<span role="alert" className="k5-error">{errors.referralCode}</span>}
  </label>}
  <label>ملاحظات<textarea rows={2} maxLength={500} value={draft.notes}
   onChange={e=>set({notes:e.target.value})}
   placeholder="أي معلومات إضافية عن العميل..."/></label>
  {!consentLocked&&<label className="k5-consent">
   <input type="checkbox" checked={draft.grantConsent}
    disabled={!phone} aria-label="تأكيد موافقة العميل على استقبال عروض المحل على واتساب"
    onChange={e=>set({grantConsent:e.target.checked})}/>
   <span>أؤكد إن العميل وافق صراحةً وقت التسجيل إنه يستقبل عروض المحل على واتساب على
    الرقم المسجّل. ممكن يوقف العروض في أي وقت. عدم التأكيد لا يمنع تسجيل العميل،
    ووجود الرقم لوحده مش موافقة.</span>
  </label>}
 </div>;
}

function draftFromProfile(p:ProfileView):ProfileDraft{
 return {
  birthDate:p.birthDate??"",address:p.address??"",notes:p.notes??"",
  cameFrom:p.cameFrom??"",cameFromDetails:p.cameFromDetails??"",
  referralCode:p.referralCode??"",grantConsent:false,
 };
}
function validProfile(p:unknown):p is ProfileView{
 if(!p||typeof p!=="object")return false;
 const row=p as ProfileView;
 return GUID.test(row.customerId)&&typeof row.displayName==="string"
  &&typeof row.profileExists==="boolean"&&typeof row.offersConsentActive==="boolean"
  &&typeof row.incomplete==="boolean";
}

/** Complete/edit CRM profile for the customer selected in POS (Cashier CompleteCustomerModal). */
export default function CustomerProfilePanel({apiRoot,customerId,phoneE164}:{
 apiRoot:string;customerId:string;phoneE164:string|null;
}){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [profile,setProfile]=useState<ProfileView|null>(null);
 const [draft,setDraft]=useState<ProfileDraft>(EMPTY_PROFILE_DRAFT);
 const [errors,setErrors]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const url=apiRoot+"/customers/"+encodeURIComponent(customerId)+"/profile";

 useEffect(()=>{
  setProfile(null);setOpen(false);setMessage("");setErrors({});
  if(!GUID.test(customerId))return;
  let cancelled=false;
  (async()=>{
   try{
    const r=await fetch(url,{credentials:"same-origin",cache:"no-store"});
    if(cancelled)return;
    if(r.status===401){router.replace("/sign-in");return;}
    if(!r.ok){setMessage("بيانات العميل (CRM) غير متاحة بالصلاحيات الحالية.");return;}
    const data=await r.json() as unknown;
    if(cancelled)return;
    if(!validProfile(data)||data.customerId.toLowerCase()!==customerId.toLowerCase()){
     setMessage("استجابة CRM غير صالحة.");return;
    }
    setProfile(data);setDraft(draftFromProfile(data));
   }catch{if(!cancelled)setMessage("الاتصال غير متاح لقراءة بيانات العميل.");}
  })();
  return ()=>{cancelled=true;};
 },[customerId,url,router]);

 async function save(action?:"GRANT"|"REVOKE"){
  if(busy||!profile)return;
  const consent=action??(draft.grantConsent&&!profile.offersConsentActive?"GRANT":undefined);
  const {body,errors:found}=buildProfileBody(draft,consent);
  if(!body){setErrors(found);return;}
  setErrors({});setBusy(true);setMessage("");
  try{
   const r=await fetch(url,{method:"PUT",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   if(r.status===401){router.replace("/sign-in");return;}
   if(r.status===400){setMessage("بيانات غير صالحة؛ راجع الحقول.");return;}
   if(r.status===403||r.status===404){setMessage("مفيش صلاحية لتعديل بيانات العميل.");return;}
   if(!r.ok){setMessage("الحفظ غير مؤكد؛ أعد المحاولة (نفس البيانات بدون تكرار).");return;}
   const data=await r.json() as unknown;
   if(!validProfile(data)){setMessage("استجابة غير صالحة.");return;}
   setProfile(data);setDraft(draftFromProfile(data));
   setMessage(action==="REVOKE"?"اتسجل إيقاف عروض واتساب للعميل."
    :"اتحفظت بيانات العميل في Customers Core.");
  }catch{setMessage("الاتصال غير متاح. أعد المحاولة بنفس البيانات.");}
  finally{setBusy(false);}
 }

 if(!GUID.test(customerId))return null;
 const sourceText=profile?formatCustomerSourceDisplay(
  profile.cameFrom,profile.cameFromDetails,profile.referralCode):"";
 const incomplete=profile?isCustomerProfileIncomplete(profile):false;
 return <section className="k5-admin-card" aria-label="بيانات العميل CRM"
  data-customer-profile="crm-v1">
  <div className="k5-admin-summary"><h3>بيانات العميل</h3>
   {profile&&incomplete&&<span className="k5-muted" role="status"
    data-customer-incomplete="yes">بيانات ناقصة (ميلاد / عنوان / مصدر)</span>}
  </div>
  {profile&&<p className="k5-muted">
   {sourceText?"المصدر: "+sourceText:"المصدر غير مسجّل"}
   {profile.offersConsentActive?" · موافقة عروض واتساب مسجّلة":
    profile.offersConsentRevokedAtUtc?" · العميل أوقف عروض واتساب":
    " · لا توجد موافقة عروض واتساب"}
  </p>}
  {profile&&<button type="button" className="k5-salon-refresh"
   onClick={()=>setOpen(!open)} aria-expanded={open}>
   {open?"إخفاء":incomplete?"تكملة بيانات العميل":"تعديل بيانات العميل"}</button>}
  {profile&&open&&<form className="catalog-form" onSubmit={e=>{e.preventDefault();void save();}}>
   <CustomerProfileFields draft={draft} onChange={setDraft} errors={errors}
    phone={phoneE164} consentLocked={profile.offersConsentActive}/>
   {profile.offersConsentActive&&<div className="k5-booking-actions">
    <span className="k5-muted">موافقة عروض واتساب مسجّلة على {profile.phoneE164}.</span>
    <button type="button" disabled={busy} onClick={()=>void save("REVOKE")}>
     تسجيل إيقاف العروض</button>
   </div>}
   <button className="k5-save" type="submit" disabled={busy}>حفظ بيانات العميل</button>
  </form>}
  {message&&<p role="status" className="k5-notice">{message}</p>}
 </section>;
}
