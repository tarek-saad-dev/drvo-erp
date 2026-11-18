/**
 * Public SALON DEMO fixtures ONLY. Isolated from all real K5/Catalog/Booking/POS
 * APIs, session cookies, SQL, persistent browser state and commercial entitlement flows.
 * Nothing in this module is a customer booking, invoice, payment or sale.
 */
export type DemoAppointmentStatus="confirmed"|"completed"|"cancelled";
export type DemoSection="overview"|"appointments"|"pos";
export type DemoService={id:string;name:string;category:string;duration:number;priceMinor:number};
export type DemoStaff={id:string;name:string;role:string;initials:string};
export type DemoProduct={id:string;name:string;category:"منتجات";priceMinor:number;stock:number};
export type DemoDiscount={mode:"none"|"fixed"|"percent";value:number};
export type DemoDraftOptions={discount?:DemoDiscount;customerId?:string;staffId?:string;note?:string};
export type DemoTotals={subtotalMinor:number;discountMinor:number;totalMinor:number};
export type DemoCustomer={id:string;name:string;phone:string|null};
export type DemoAppointment={id:number;customerId:string;staffId:string;serviceId:string;time:string;status:DemoAppointmentStatus};
// serviceId is a historic synthetic cart key, now also accepts product IDs.
// This fixture is never an actual Catalog/POS API contract.
export type DemoCartLine={serviceId:string;quantity:number};
export type DemoDraft={id:number;lines:DemoCartLine[];subtotalMinor:number;
 discountMinor:number;totalMinor:number;customerId:string;staffId:string;
 note:string;status:"DRAFT"};
export type DemoData={appointments:DemoAppointment[];drafts:DemoDraft[];customers:DemoCustomer[]};

export const DEMO_SERVICES:readonly DemoService[]=[
 {id:"cut",name:"قص شعر رجالي",category:"حلاقة",duration:30,priceMinor:18000},
 {id:"beard",name:"تحديد الذقن",category:"حلاقة",duration:30,priceMinor:8500},
 {id:"bundle",name:"قص شعر + ذقن",category:"باكدجات",duration:60,priceMinor:24000},
 {id:"facial",name:"تنظيف بشرة",category:"عناية",duration:60,priceMinor:32000},
 {id:"style",name:"تصفيف شعر",category:"تصفيف",duration:30,priceMinor:12000},
 {id:"care",name:"عناية بالشعر",category:"عناية",duration:60,priceMinor:29000},
];
// Synthetic retail inventory: selecting a product is NOT stock deduction.
export const DEMO_PRODUCTS:readonly DemoProduct[]=[
 {id:"wax",name:"واكس تصفيف",category:"منتجات",priceMinor:14000,stock:8},
 {id:"shampoo",name:"شامبو عناية",category:"منتجات",priceMinor:19500,stock:12},
 {id:"oil",name:"زيت للذقن",category:"منتجات",priceMinor:16500,stock:5},
];
export function demoPosItem(id:string):DemoService|DemoProduct{
 const row=DEMO_SERVICES.find(s=>s.id===id)??DEMO_PRODUCTS.find(s=>s.id===id);
 if(!row)throw new Error("صنف غير موجود في الكتالوج التجريبي");
 return row;
}
export const DEMO_STAFF:readonly DemoStaff[]=[
 {id:"mostafa",name:"مصطفى علي",role:"Senior Barber",initials:"مص"},
 {id:"youssef",name:"يوسف حسن",role:"Barber",initials:"يو"},
 {id:"hassan",name:"حسن سمير",role:"Stylist",initials:"حس"},
];
export const DEMO_CUSTOMERS:readonly DemoCustomer[]=[
 {id:"guest",name:"عميل تجريبي",phone:null},
 {id:"omar",name:"عمر (تجريبي)",phone:"01000000001"},
 {id:"ali",name:"علي (تجريبي)",phone:"01000000002"},
 {id:"mahmoud",name:"محمود (تجريبي)",phone:"01000000003"},
 {id:"khaled",name:"خالد (تجريبي)",phone:"01000000004"},
];
// Half-hour preview intervals within the synthetic 10:00–19:00 demo day.
export const DEMO_TIMES=Object.freeze(Array.from({length:18},(_,i)=>{
 const minutes=10*60+i*30;
 return String(Math.floor(minutes/60)).padStart(2,"0")+":"+
  String(minutes%60).padStart(2,"0");
}));
const DEMO_CLOSE_MINUTE=19*60;
function demoMinute(time:string):number{
 if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time))
  throw new Error("Invalid demo time");
 const [h,m]=time.split(":").map(Number);
 return h*60+m;
}
export function demoAvailableTimes(data:DemoData,staffId:string,serviceId:string):string[]{
 demoStaff(staffId);
 const duration=demoService(serviceId).duration;
 return DEMO_TIMES.filter(time=>{
  const start=demoMinute(time),end=start+duration;
  if(end>DEMO_CLOSE_MINUTE)return false;
  return !data.appointments.some(a=>{
   if(a.staffId!==staffId||a.status==="cancelled")return false;
   const bookedStart=demoMinute(a.time);
   const bookedEnd=bookedStart+demoService(a.serviceId).duration;
   return start<bookedEnd&&end>bookedStart;
  });
 });
}

const seededAppointments:DemoAppointment[]=[
 {id:1,customerId:"omar",staffId:"mostafa",serviceId:"bundle",time:"10:00",status:"completed"},
 {id:2,customerId:"ali",staffId:"youssef",serviceId:"cut",time:"11:00",status:"confirmed"},
 {id:3,customerId:"mahmoud",staffId:"hassan",serviceId:"facial",time:"12:00",status:"confirmed"},
 {id:4,customerId:"khaled",staffId:"mostafa",serviceId:"beard",time:"13:00",status:"confirmed"},
 {id:5,customerId:"omar",staffId:"youssef",serviceId:"care",time:"15:00",status:"confirmed"},
];
export function initialDemo():DemoData{
 return {appointments:seededAppointments.map(a=>({...a})),drafts:[],customers:DEMO_CUSTOMERS.map(c=>({...c}))};
}
export function demoMoney(minor:number):string{
 if(!Number.isSafeInteger(minor)||minor<0)throw new Error("Invalid demo money");
 return (minor/100).toLocaleString("ar-EG",{minimumFractionDigits:2,maximumFractionDigits:2})+" ج.م";
}
export function demoService(id:string):DemoService{
 const service=DEMO_SERVICES.find(s=>s.id===id);
 if(!service)throw new Error("Unknown demo service");
 return service;
}
export function demoStaff(id:string):DemoStaff{
 const staff=DEMO_STAFF.find(s=>s.id===id);
 if(!staff)throw new Error("Unknown demo staff");
 return staff;
}
export function demoCustomer(id:string,data?:DemoData):DemoCustomer{
 const customer=(data?.customers??DEMO_CUSTOMERS).find(s=>s.id===id);
 if(!customer)throw new Error("Unknown demo customer");
 return customer;
}
export function bookDemoAppointment(data:DemoData,raw:{
 customerId:string;staffId:string;serviceId:string;time:string;
}):DemoData{
 demoCustomer(raw.customerId,data);
 demoStaff(raw.staffId);
 demoService(raw.serviceId);
 if(!DEMO_TIMES.includes(raw.time))throw new Error("اختار ميعاد متاح في اليوم التجريبي");
 if(!demoAvailableTimes(data,raw.staffId,raw.serviceId).includes(raw.time))
  throw new Error("الحلاق عنده موعد متداخل أو الوقت خارج اليوم التجريبي. اختار وقت تاني.");
 const id=Math.max(0,...data.appointments.map(a=>a.id))+1;
 return {...data,appointments:[...data.appointments,{
  id,customerId:raw.customerId,staffId:raw.staffId,serviceId:raw.serviceId,
  time:raw.time,status:"confirmed",
 }]};
}
export function updateDemoAppointment(data:DemoData,id:number,status:"completed"|"cancelled"):DemoData{
 const row=data.appointments.find(a=>a.id===id);
 if(!row||row.status!=="confirmed")throw new Error("الموعد مش قابل للتعديل");
 return {...data,appointments:data.appointments.map(a=>a.id===id?{...a,status}:a)};
}
export function addDemoCartLine(lines:readonly DemoCartLine[],serviceId:string):DemoCartLine[]{
 const item=demoPosItem(serviceId);
 const current=lines.find(x=>x.serviceId===serviceId);
 const max="stock" in item?Math.min(item.stock,10):10;
 if(current&&current.quantity>=max)throw new Error("الكمية وصلت للحد المتاح في الديمو");
 return current?lines.map(x=>x.serviceId===serviceId?
  {...x,quantity:x.quantity+1}:x):[...lines,{serviceId,quantity:1}];
}
export function changeDemoCartQuantity(lines:readonly DemoCartLine[],serviceId:string,delta:1|-1):DemoCartLine[]{
 if(delta!==1&&delta!==-1)throw new Error("تعديل كمية غير صالح");
 const current=lines.find(x=>x.serviceId===serviceId);
 if(!current)throw new Error("الصنف مش موجود في السلة");
 if(delta===-1&&current.quantity===1)return removeDemoCartLine(lines,serviceId);
 if(delta===1)return addDemoCartLine(lines,serviceId);
 return lines.map(x=>x.serviceId===serviceId?{...x,quantity:x.quantity-1}:x);
}
export function removeDemoCartLine(lines:readonly DemoCartLine[],serviceId:string):DemoCartLine[]{
 return lines.filter(x=>x.serviceId!==serviceId);
}
export function demoSubtotal(lines:readonly DemoCartLine[]):number{
 if(lines.length===0||lines.length>DEMO_SERVICES.length+DEMO_PRODUCTS.length)
  throw new Error("المسودة لازم تحتوي على صنف واحد على الأقل");
 const ids=new Set<string>();
 let subtotal=0;
 for(const row of lines){
  if(ids.has(row.serviceId)||!Number.isSafeInteger(row.quantity)||
     row.quantity<1||row.quantity>10)throw new Error("عناصر المسودة غير صالحة");
  const item=demoPosItem(row.serviceId);
  if("stock" in item&&row.quantity>item.stock)
   throw new Error("الكمية أكبر من المخزون التجريبي");
  ids.add(row.serviceId);
  subtotal+=item.priceMinor*row.quantity;
 }
 if(!Number.isSafeInteger(subtotal)||subtotal>9_000_000_000_000)
  throw new Error("إجمالي غير صالح");
 return subtotal;
}
export function demoDraftTotals(lines:readonly DemoCartLine[],discount:DemoDiscount={mode:"none",value:0}):DemoTotals{
 const subtotalMinor=demoSubtotal(lines);
 if(!discount||!["none","fixed","percent"].includes(discount.mode)||
    !Number.isSafeInteger(discount.value)||discount.value<0)
  throw new Error("الخصم غير صالح");
 let discountMinor=0;
 if(discount.mode==="none"&&discount.value!==0)throw new Error("الخصم غير صالح");
 if(discount.mode==="fixed"){
  if(discount.value>subtotalMinor)throw new Error("الخصم أكبر من إجمالي المسودة");
  discountMinor=discount.value;
 }
 if(discount.mode==="percent"){
  if(discount.value>100)throw new Error("النسبة لازم تكون بين 0 و100");
  discountMinor=Math.round(subtotalMinor*discount.value/100);
 }
 return {subtotalMinor,discountMinor,totalMinor:subtotalMinor-discountMinor};
}
export function demoSplitPreview(totalMinor:number,cashMinor:number):{
 cashMinor:number;electronicMinor:number;state:"NOT_COLLECTED";
}{
 if(!Number.isSafeInteger(totalMinor)||!Number.isSafeInteger(cashMinor)||
   totalMinor<0||cashMinor<0||cashMinor>totalMinor)
  throw new Error("تقسيم المبلغ التجريبي غير صالح");
 return {cashMinor,electronicMinor:totalMinor-cashMinor,state:"NOT_COLLECTED"};
}
export function saveDemoDraft(data:DemoData,lines:readonly DemoCartLine[],
 options:DemoDraftOptions={}):DemoData{
 const discount=options.discount??{mode:"none",value:0};
 const totals=demoDraftTotals(lines,discount);
 const customerId=options.customerId??"guest";
 const staffId=options.staffId??"mostafa";
 const note=options.note??"";
 demoCustomer(customerId,data);demoStaff(staffId);
 if(typeof note!=="string"||note.length>240||note!==note.trim())
  throw new Error("ملاحظات المسودة غير صالحة");
 const id=Math.max(0,...data.drafts.map(x=>x.id))+1;
 return {...data,drafts:[{
  id,lines:lines.map(x=>({...x})),...totals,customerId,staffId,note,status:"DRAFT",
 },...data.drafts]};
}


/** The demo has no real customer or paid-sale source. */
const phoneDigits=(s:string)=>s.replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-1632))
 .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-1776)).replace(/[^0-9]/g,"");
const phoneComparable=(s:string)=>{
 const v=phoneDigits(s);
 return v.startsWith("0020")?"0"+v.slice(4):v.startsWith("20")?"0"+v.slice(2):v;
};
export function searchDemoCustomers(data:DemoData,raw:string):DemoCustomer[]{
 const q=raw.trim().toLocaleLowerCase("ar-EG").slice(0,80);
 if(!q)return [];
 const digits=phoneComparable(q);
 return data.customers.filter(x=>x.name.toLocaleLowerCase("ar-EG").includes(q)||
  Boolean(digits&&x.phone?.includes(digits))).slice(0,20);
}
export function createDemoCustomer(data:DemoData,nameRaw:string,phoneRaw:string):{
 data:DemoData;customer:DemoCustomer;
}{
 const name=nameRaw.trim().replace(/\s+/g," ");
 const phone=phoneComparable(phoneRaw);
 if(name.length<2||name.length>80)throw new Error("اسم العميل لازم يكون من 2 إلى 80 حرف");
 if(!/^01[0-9]{9}$/.test(phone))throw new Error("رقم الموبايل لازم يكون 11 رقم");
 if(data.customers.some(x=>x.phone===phone))throw new Error("الرقم موجود بالفعل؛ اختار العميل من البحث");
 const customer={id:"demo-new-"+(data.customers.length+1),name,phone};
 return {customer,data:{...data,customers:[...data.customers,customer]}};
}
export type DemoVisit={kind:"SAMPLE"|"DRAFT";customerId:string;staffId:string;
 lines:DemoCartLine[];totalMinor:number};
export const DEMO_SAMPLE_VISITS:readonly DemoVisit[]=[
 {kind:"SAMPLE",customerId:"omar",staffId:"mostafa",totalMinor:26500,
  lines:[{serviceId:"cut",quantity:1},{serviceId:"beard",quantity:1}]},
 {kind:"SAMPLE",customerId:"ali",staffId:"youssef",totalMinor:24000,
  lines:[{serviceId:"bundle",quantity:1}]},
 {kind:"SAMPLE",customerId:"mahmoud",staffId:"hassan",totalMinor:32000,
  lines:[{serviceId:"facial",quantity:1}]},
];
export function demoCustomerVisits(data:DemoData,customerId:string):DemoVisit[]{
 demoCustomer(customerId,data);
 const drafts:DemoVisit[]=data.drafts.filter(x=>x.customerId===customerId).map(x=>({
  kind:"DRAFT",customerId,staffId:x.staffId,lines:x.lines.map(l=>({...l})),totalMinor:x.totalMinor
 }));
 const samples=DEMO_SAMPLE_VISITS.filter(x=>x.customerId===customerId)
  .map(x=>({...x,lines:x.lines.map(l=>({...l}))}));
 return [...drafts,...samples];
}
export function repeatDemoLastVisit(data:DemoData,customerId:string):{
 lines:DemoCartLine[];staffId:string;
}{
 const last=demoCustomerVisits(data,customerId)[0];
 if(!last)throw new Error("مفيش زيارة أو مسودة تجريبية سابقة للعميل");
 const lines=last.lines.map(x=>({...x}));
 demoStaff(last.staffId);demoSubtotal(lines); // current demo catalog and simulated stock
 return {lines,staffId:last.staffId}; // no old price/discount/tender
}
