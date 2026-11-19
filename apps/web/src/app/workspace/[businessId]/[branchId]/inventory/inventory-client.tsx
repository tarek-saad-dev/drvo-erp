"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {
 buildDraftStockPreview,
 type CatalogOfferingInput,
} from "./inventory-stock-preview";

type Category={categoryId:string;displayName:string;isActive:boolean};
type Offering={
 offeringId:string;categoryId:string|null;kind:"SERVICE"|"PRODUCT";
 displayName:string;priceMinor:number;currency:string;
 durationMinutes:number|null;isActive:boolean;
};
type CatalogPayload={categories:Category[];offerings:Offering[]};
type UiState="loading"|"ready"|"denied"|"unavailable";

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money=(minor:number,currency:string)=>
 (minor/100).toFixed(2)+" "+currency;

export default function InventoryClient({businessId,branchId}:{
 businessId:string;branchId:string;
}){
 const router=useRouter();
 const home="/workspace/"+encodeURIComponent(businessId)+"/"+encodeURIComponent(branchId);
 const catalogApi="/api/workspaces/"+encodeURIComponent(businessId)+
  "/branches/"+encodeURIComponent(branchId)+"/catalog";
 const [state,setState]=useState<UiState>("loading");
 const [offerings,setOfferings]=useState<CatalogOfferingInput[]>([]);
 const [categories,setCategories]=useState<Category[]>([]);
 const [query,setQuery]=useState("");

 const load=useCallback(async()=>{
  if(!GUID.test(businessId)||!GUID.test(branchId)){setState("denied");return;}
  try{
   const resp=await fetch(catalogApi,{credentials:"same-origin",cache:"no-store"});
   if(resp.status===401){router.replace("/sign-in");return;}
   if(resp.status===403||resp.status===404){setState("denied");return;}
   if(!resp.ok){setState("unavailable");return;}
   const payload=await resp.json() as CatalogPayload;
   if(!Array.isArray(payload.categories)||!Array.isArray(payload.offerings)){
    setState("unavailable");return;
   }
   const byCat=new Map(payload.categories.map(c=>[c.categoryId,c.displayName]));
   const mapped:CatalogOfferingInput[]=payload.offerings.map(o=>({
    offeringId:o.offeringId,
    kind:o.kind,
    displayName:o.displayName,
    priceMinor:o.priceMinor,
    currency:o.currency,
    isActive:o.isActive,
    categoryId:o.categoryId,
    categoryName:o.categoryId?byCat.get(o.categoryId)??null:null,
   }));
   setCategories(payload.categories);
   setOfferings(mapped);
   setState("ready");
  }catch{setState("unavailable");}
 },[catalogApi,businessId,branchId,router]);

 useEffect(()=>{void load();},[load]);

 const preview=useMemo(()=>{
  try{return buildDraftStockPreview(offerings,query);}
  catch{return null;}
 },[offerings,query]);

 return <main className="k5-workspace">
  <header className="k5-workspace-header">
   <div className="k5-brand"><span className="brandmark">D</span> DRVO <b>ERP</b></div>
   <nav className="k5-head-actions">
    <Link href={home}>مساحة الفرع</Link>
    <Link href={home+"/catalog"}>الكتالوج</Link>
   </nav>
  </header>

  {state==="loading"&&<p className="k5-table-state" role="status">جاري تحميل معاينة المخزون…</p>}
  {state==="denied"&&<p className="k5-error" role="alert">المخزون غير متاح لحسابك في هذا الفرع.</p>}
  {state==="unavailable"&&<p className="k5-error" role="alert">تعذر قراءة كتالوج المنتجات. حاول مرة أخرى.</p>}

  {state==="ready"&&preview&&<>
   <div className="k5-page-title drvo-workspace-title">
    <div>
     <span className="k5-eyebrow">INVENTORY · SHARED MODULE</span>
     <h1>معاينة المخزون (مسودة)</h1>
     <p className="k5-muted">
      مفاهيم Cashier للمخزون بدون خصم رصيد أو مشتريات أو ADR-031.
      المصدر: عروض Catalog من نوع PRODUCT فقط.
     </p>
    </div>
   </div>

   <div className="drvo-inventory-banner" role="status">
    <strong>DRAFT / UNVERIFIED</strong>
    <span>on-hand = UNKNOWN · لا أرصدة مخترعة · stockLedger NOT_AVAILABLE · posting NOT_POSTED</span>
   </div>

   <section className="k5-admin-card drvo-inventory-kpis" aria-label="مؤشرات مسودة">
    <div><span className="k5-muted">منتجات نشطة</span><strong>{preview.kpis.activeProducts}</strong></div>
    <div><span className="k5-muted">وحدات متاحة</span><strong>UNKNOWN</strong></div>
    <div><span className="k5-muted">قيمة التكلفة</span><strong>UNKNOWN</strong></div>
    <div><span className="k5-muted">منخفض / نافد</span><strong>UNKNOWN</strong></div>
   </section>

   <section className="k5-admin-card">
    <div className="drvo-inventory-toolbar">
     <label>
      بحث المنتجات
      <input
       value={query}
       onChange={e=>setQuery(e.target.value)}
       placeholder="اسم المنتج أو بادئة offeringId"
       maxLength={200}
       autoComplete="off"
      />
     </label>
     <p className="k5-muted">
      التصنيفات المقروءة: {categories.length} · لا تحويلات فروع ولا سياسة مخزون في هذه الشاشة.
     </p>
    </div>

    {preview.items.length===0?
     <p className="k5-table-state">لا توجد عروض PRODUCT مطابقة. أضف منتجات من الكتالوج أولاً.</p>:
     <div className="k5-table-wrap">
      <table className="k5-table">
       <thead>
        <tr>
         <th>المنتج</th>
         <th>التصنيف</th>
         <th>السعر</th>
         <th>الرصيد</th>
         <th>الحالة</th>
         <th>باركود</th>
        </tr>
       </thead>
       <tbody>
        {preview.items.map(row=>(
         <tr key={row.offeringId}>
          <td>
           {row.displayName}
           {!row.isActive&&<span className="k5-muted"> · غير نشط</span>}
          </td>
          <td>{row.categoryName??"—"}</td>
          <td dir="ltr">{money(row.priceMinor,row.currency)}</td>
          <td><span className="drvo-inventory-unknown">UNKNOWN</span></td>
          <td><span className="drvo-inventory-unknown">UNKNOWN</span></td>
          <td className="k5-muted">غير متاح في CatalogOffering</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>}
   </section>

   <p className="drvo-workspace-note">
    state={preview.state} · verification={preview.verification} ·
    purchasingPosts={preview.purchasingPosts} · adr031={preview.adr031}
   </p>
  </>}
 </main>;
}
