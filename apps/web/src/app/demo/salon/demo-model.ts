/**
 * Public SALON DEMO fixtures ONLY. Isolated from all real K5/Catalog/Booking/POS
 * APIs, session cookies, SQL, persistent browser state and commercial entitlement flows.
 * Nothing in this module is a customer booking, invoice, payment or sale.
 */
export type DemoAppointmentStatus="confirmed"|"completed"|"cancelled";
export type DemoSection="overview"|"appointments"|"pos";
export type DemoService={id:string;name:string;category:string;duration:number;priceMinor:number};
export type DemoStaff={id:string;name:string;role:string;initials:string};
export type DemoCustomer={id:string;name:string};
export type DemoAppointment={id:number;customerId:string;staffId:string;serviceId:string;time:string;status:DemoAppointmentStatus};
export type DemoCartLine={serviceId:string;quantity:number};
export type DemoDraft={id:number;lines:DemoCartLine[];subtotalMinor:number;status:"DRAFT"};
export type DemoData={appointments:DemoAppointment[];drafts:DemoDraft[]};

export const DEMO_SERVICES:readonly DemoService[]=[
 {id:"cut",name:"قص شعر رجالي",category:"حلاقة",duration:30,priceMinor:18000},
 {id:"beard",name:"تحديد الذقن",category:"حلاقة",duration:30,priceMinor:8500},
 {id:"bundle",name:"قص شعر + ذقن",category:"باكدجات",duration:60,priceMinor:24000},
 {id:"facial",name:"تنظيف بشرة",category:"عناية",duration:60,priceMinor:32000},
 {id:"style",name:"تصفيف شعر",category:"تصفيف",duration:30,priceMinor:12000},
 {id:"care",name:"عناية بالشعر",category:"عناية",duration:60,priceMinor:29000},
];
export const DEMO_STAFF:readonly DemoStaff[]=[
 {id:"mostafa",name:"مصطفى علي",role:"Senior Barber",initials:"مص"},
 {id:"youssef",name:"يوسف حسن",role:"Barber",initials:"يو"},
 {id:"hassan",name:"حسن سمير",role:"Stylist",initials:"حس"},
];
export const DEMO_CUSTOMERS:readonly DemoCustomer[]=[
 {id:"guest",name:"عميل تجريبي"},
 {id:"omar",name:"عمر (تجريبي)"},
 {id:"ali",name:"علي (تجريبي)"},
 {id:"mahmoud",name:"محمود (تجريبي)"},
 {id:"khaled",name:"خالد (تجريبي)"},
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
 return {appointments:seededAppointments.map(a=>({...a})),drafts:[]};
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
export function demoCustomer(id:string):DemoCustomer{
 const customer=DEMO_CUSTOMERS.find(s=>s.id===id);
 if(!customer)throw new Error("Unknown demo customer");
 return customer;
}
export function bookDemoAppointment(data:DemoData,raw:{
 customerId:string;staffId:string;serviceId:string;time:string;
}):DemoData{
 demoCustomer(raw.customerId);
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
 demoService(serviceId);
 const current=lines.find(x=>x.serviceId===serviceId);
 if(current?.quantity===10)throw new Error("الحد الأقصى 10 من الخدمة الواحدة");
 return current?lines.map(x=>x.serviceId===serviceId?
  {...x,quantity:x.quantity+1}:x):[...lines,{serviceId,quantity:1}];
}
export function removeDemoCartLine(lines:readonly DemoCartLine[],serviceId:string):DemoCartLine[]{
 return lines.filter(x=>x.serviceId!==serviceId);
}
export function demoSubtotal(lines:readonly DemoCartLine[]):number{
 if(lines.length===0||lines.length>DEMO_SERVICES.length)
  throw new Error("المسودة لازم تحتوي على خدمة واحدة على الأقل");
 const ids=new Set<string>();
 let subtotal=0;
 for(const row of lines){
  if(ids.has(row.serviceId)||!Number.isSafeInteger(row.quantity)||
     row.quantity<1||row.quantity>10)throw new Error("عناصر المسودة غير صالحة");
  ids.add(row.serviceId);
  subtotal+=demoService(row.serviceId).priceMinor*row.quantity;
 }
 if(!Number.isSafeInteger(subtotal)||subtotal>9_000_000_000_000)
  throw new Error("إجمالي غير صالح");
 return subtotal;
}
export function saveDemoDraft(data:DemoData,lines:readonly DemoCartLine[]):DemoData{
 const subtotalMinor=demoSubtotal(lines);
 const id=Math.max(0,...data.drafts.map(x=>x.id))+1;
 return {...data,drafts:[{id,lines:lines.map(x=>({...x})),subtotalMinor,
  status:"DRAFT"},...data.drafts]};
}
