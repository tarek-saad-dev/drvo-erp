import {
 BadRequestException,Injectable,ServiceUnavailableException,
} from "@nestjs/common";
import type {Actor} from "../identity/identity.service";
import {BookingService,type AppointmentView} from "../booking/booking.service";
import {HrService,type HrEmployeeView} from "../hr/hr.service";
import {ExpensesService} from "../expenses/expenses.service";
import {OtherIncomeService} from "../other-income/other-income.service";
import {InventoryService} from "../inventory/inventory.service";

export type BarberOperationsRow={
 employeeId:string;employeeCode:string;displayName:string;
 resourceId:string;resourceName:string;booked:number;completed:number;
 cancelled:number;total:number;
};
export type BarberOperationsReport={
 state:"READ_ONLY_BOOKING_SAMPLE";businessId:string;branchId:string;
 limitPerSource:200;mayBeTruncated:boolean;employeesRead:number;
 appointmentsRead:number;unassignedBookings:number;
 booked:number;completed:number;cancelled:number;
 barbers:BarberOperationsRow[];
};
export type ExpenseDraftsSummaryReport={
 state:"READ_ONLY_EXPENSE_DRAFT_SAMPLE";businessId:string;branchId:string;
 draftCount:number;activeDraftCount:number;cancelledCount:number;
 amountMinorByCurrency:Record<string,number>;categoryCount:number;
 treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";mayBeTruncated:boolean;
};
export type OtherIncomeDraftsSummaryReport={
 state:"READ_ONLY_OTHER_INCOME_DRAFT_SAMPLE";businessId:string;branchId:string;
 draftCount:number;activeDraftCount:number;cancelledCount:number;
 amountMinorByCurrency:Record<string,number>;categoryCount:number;
 notSalesRevenue:true;treasuryState:"NOT_PAID";accountingState:"NOT_POSTED";
 mayBeTruncated:boolean;
};
export type InventoryStockSummaryReport={
 state:"READ_ONLY_INVENTORY_STOCK_SAMPLE";businessId:string;branchId:string;
 productCount:number;activeProductCount:number;unitsMilli:number|null;
 lowStock:number;outOfStock:number;inventoryValueAtCost:"UNKNOWN";
 posting:"NOT_POSTED";adr031:"NOT_IN_SCOPE";mayBeTruncated:boolean;
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validId(id:unknown):string{
 if(typeof id!=="string"||!GUID.test(id))throw new BadRequestException("Invalid report reference");
 return id.toLowerCase();
}
/** A **bounded** read-model of latest authorized Booking rows, NOT revenue or payroll. */
export function buildBarberOperationsReport(
 employees:readonly HrEmployeeView[],appointments:readonly AppointmentView[],
 businessId:string,branchId:string,
):BarberOperationsReport{
 validId(businessId);validId(branchId);
 if(!Array.isArray(employees)||!Array.isArray(appointments)||
    employees.length>200||appointments.length>200)
  throw new BadRequestException("Unbounded report source");
 const rows=new Map<string,BarberOperationsRow>();
 const seenEmployees=new Set<string>();
 for(const e of employees){
  const id=validId(e.employeeId);
  if(seenEmployees.has(id))throw new BadRequestException("Duplicate HR employee");
  seenEmployees.add(id);
  if(!e.isActive||!e.branchActive||!e.isBookable)continue;
  if(e.resourceId===null||typeof e.displayName!=="string"||
     typeof e.employeeCode!=="string"||e.displayName.length>160)
   throw new BadRequestException("Invalid authorized Barber");
  const resource=validId(e.resourceId);
  if(rows.has(resource))throw new BadRequestException("Duplicate active Booking resource");
  rows.set(resource,{
   employeeId:e.employeeId,employeeCode:e.employeeCode,displayName:e.displayName,
   resourceId:e.resourceId,resourceName:e.resourceName??"—",
   booked:0,completed:0,cancelled:0,total:0,
  });
 }
 const seenBookings=new Set<string>();
 let booked=0,completed=0,cancelled=0,unassigned=0;
 for(const a of appointments){
  const booking=validId(a.bookingId),resource=validId(a.resourceId);
  if(seenBookings.has(booking))throw new BadRequestException("Duplicated booking");
  seenBookings.add(booking);
  if(!["BOOKED","COMPLETED","CANCELLED"].includes(a.status))
   throw new BadRequestException("Invalid booking lifecycle");
  if(a.status==="BOOKED")booked++;
  if(a.status==="COMPLETED")completed++;
  if(a.status==="CANCELLED")cancelled++;
  const row=rows.get(resource);
  if(!row){unassigned++;continue;}
  row.total++;
  if(a.status==="BOOKED")row.booked++;
  if(a.status==="COMPLETED")row.completed++;
  if(a.status==="CANCELLED")row.cancelled++;
 }
 return {
  state:"READ_ONLY_BOOKING_SAMPLE",businessId,branchId,limitPerSource:200,
  mayBeTruncated:employees.length===200||appointments.length===200,
  employeesRead:employees.length,appointmentsRead:appointments.length,
  unassignedBookings:unassigned,booked,completed,cancelled,
  barbers:[...rows.values()].sort((a,b)=>
    a.displayName.localeCompare(b.displayName,"ar")||a.employeeId.localeCompare(b.employeeId)),
 };
}
@Injectable()
export class ReportsService {
 constructor(
  private readonly hr:HrService,
  private readonly booking:BookingService,
  private readonly expenses:ExpensesService,
  private readonly otherIncome:OtherIncomeService,
  private readonly inventory:InventoryService,
 ){}
 async barberOperations(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_REPORTS_ENABLED!=="YES"||
     process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Reports disabled");
  const [roster,bookings]=await Promise.all([
   this.hr.list(actor,token,businessId,branchId),
   this.booking.list(actor,token,businessId,branchId),
  ]);
  return buildBarberOperationsReport(roster.employees,bookings.appointments,businessId,branchId);
 }
 async expenseDraftsSummary(actor:Actor,token:string,businessId:string,branchId:string
 ):Promise<ExpenseDraftsSummaryReport>{
  if(process.env.DRVO_REPORTS_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Reports disabled");
  validId(businessId);validId(branchId);
  const workspace=await this.expenses.list(actor,token,businessId,branchId);
  const amounts:Record<string,number>={};
  let active=0,cancelled=0;
  for(const d of workspace.drafts){
   if(d.status==="DRAFT"){
    active++;
    amounts[d.currency]=(amounts[d.currency]??0)+d.amountMinor;
   }else cancelled++;
  }
  return {
   state:"READ_ONLY_EXPENSE_DRAFT_SAMPLE",businessId,branchId,
   draftCount:workspace.drafts.length,activeDraftCount:active,cancelledCount:cancelled,
   amountMinorByCurrency:amounts,categoryCount:workspace.categories.length,
   treasuryState:"NOT_PAID",accountingState:"NOT_POSTED",
   mayBeTruncated:workspace.mayBeTruncated,
  };
 }
 async otherIncomeDraftsSummary(actor:Actor,token:string,businessId:string,branchId:string
 ):Promise<OtherIncomeDraftsSummaryReport>{
  if(process.env.DRVO_REPORTS_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Reports disabled");
  validId(businessId);validId(branchId);
  const workspace=await this.otherIncome.list(actor,token,businessId,branchId);
  const amounts:Record<string,number>={};
  let active=0,cancelled=0;
  for(const d of workspace.drafts){
   if(d.status==="DRAFT"){
    active++;
    amounts[d.currency]=(amounts[d.currency]??0)+d.amountMinor;
   }else cancelled++;
  }
  return {
   state:"READ_ONLY_OTHER_INCOME_DRAFT_SAMPLE",businessId,branchId,
   draftCount:workspace.drafts.length,activeDraftCount:active,cancelledCount:cancelled,
   amountMinorByCurrency:amounts,categoryCount:workspace.categories.length,
   notSalesRevenue:true,treasuryState:"NOT_PAID",accountingState:"NOT_POSTED",
   mayBeTruncated:workspace.mayBeTruncated,
  };
 }
 async inventoryStockSummary(actor:Actor,token:string,businessId:string,branchId:string
 ):Promise<InventoryStockSummaryReport>{
  if(process.env.DRVO_REPORTS_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Reports disabled");
  validId(businessId);validId(branchId);
  const workspace=await this.inventory.list(actor,token,businessId,branchId);
  let units=0,low=0,out=0,active=0;
  for(const item of workspace.items){
   if(item.isActive)active++;
   units+=item.qtyMilli;
   if(item.stockStatus==="LOW")low++;
   if(item.stockStatus==="OUT")out++;
  }
  return {
   state:"READ_ONLY_INVENTORY_STOCK_SAMPLE",businessId,branchId,
   productCount:workspace.items.length,activeProductCount:active,
   unitsMilli:units,lowStock:low,outOfStock:out,inventoryValueAtCost:"UNKNOWN",
   posting:"NOT_POSTED",adr031:"NOT_IN_SCOPE",mayBeTruncated:workspace.mayBeTruncated,
  };
 }
}
