import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

// Expenses owns business documents. Neither Treasury cash nor GL is mutated here.
// Money is always integer minor currency units, never JS floating-point cash.
export type ExpenseCategory={categoryId:string;displayName:string;isActive:boolean};
export type ExpenseDraft={draftId:string;categoryId:string;categoryName:string;
 amountMinor:number;currency:"EGP"|"SAR"|"AED"|"USD";note:string;
 status:"DRAFT"|"CANCELLED";createdAtUtc:string};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const CURRENCIES=["EGP","SAR","AED","USD"] as const;
const MAX_MINOR=9000000000000;
function strictBody(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
  Object.keys(body).length!==keys.length||
  keys.some(key=>!Object.prototype.hasOwnProperty.call(body,key)))
  throw new BadRequestException("Unexpected expense fields");
 return body as Record<string,unknown>;
}
function uuid(value:unknown):string{
 if(typeof value!=="string"||!UUID.test(value))throw new BadRequestException("Invalid identifier");
 return value;
}
function parseAmount(value:unknown):number{
 if(typeof value!=="number"||!Number.isSafeInteger(value)||
    value<1||value>MAX_MINOR)throw new BadRequestException("Invalid minor amount");
 return value;
}
@Injectable()
export class ExpensesService {
 constructor(private readonly db:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_EXPENSES_ENABLED!=="YES"||
     process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Expenses disabled");
  if(actor.mustChangePassword||!UUID.test(actor.tenantId)||!UUID.test(actor.accountId)||
     !UUID.test(businessId)||!UUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   hash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<ExpensesService["scope"]>){
  return this.db.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.hash);
 }
 private async execute(scope:ReturnType<ExpensesService["scope"]>,name:string,
  bind?:(request:sql.Request)=>sql.Request){
  try{
   const request=this.request(scope);
   return await (bind?bind(request):request).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
     Number(error.number):undefined;
   if(code===51281||code===51284)throw new NotFoundException();
   if(code===51282)throw new BadRequestException("Invalid expense request");
   if(code===51283||code===2601||code===2627)
    throw new ConflictException("Expense idempotency or category conflict");
   throw new ServiceUnavailableException("Expenses unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string){
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadExpenseWorkspace");
  const sets=result.recordsets;
  if(!Array.isArray(sets)||sets.length!==2)throw new ServiceUnavailableException("Expense data unavailable");
  const categories:ExpenseCategory[]=sets[0].map((row:Record<string,unknown>)=>({
   categoryId:String(row.categoryId),displayName:String(row.displayName),isActive:Boolean(row.isActive),
  }));
  const drafts:ExpenseDraft[]=sets[1].map((row:Record<string,unknown>)=>({
   draftId:String(row.draftId),categoryId:String(row.categoryId),
   categoryName:String(row.categoryName),amountMinor:Number(row.amountMinor),
   currency:row.currency as ExpenseDraft["currency"],note:String(row.note),
   status:row.status as ExpenseDraft["status"],
   createdAtUtc:row.createdAtUtc instanceof Date?row.createdAtUtc.toISOString():String(row.createdAtUtc),
  }));
  if(drafts.some(d=>!Number.isSafeInteger(d.amountMinor)||!CURRENCIES.includes(d.currency)||
    !["DRAFT","CANCELLED"].includes(d.status)))
   throw new ServiceUnavailableException("Expense data invalid");
  return {state:"NONPOSTING_EXPENSE_DRAFTS_ONLY" as const,categories,drafts,
   limitPerSource:200,mayBeTruncated:categories.length===200||drafts.length===200,
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const};
 }
 async createCategory(actor:Actor,token:string,businessId:string,branchId:string,
   key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["displayName"]);
  if(typeof data.displayName!=="string"||
     data.displayName.trim().length<1||data.displayName.trim().length>100||
     data.displayName!==data.displayName.trim())
   throw new BadRequestException("Invalid category name");
  const result=await this.execute(scope,"core.CreateExpenseCategory",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("DisplayName",sql.NVarChar(100),data.displayName));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Expense category not saved");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async createDraft(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["categoryId","amountMinor","currency","note"]);
  const categoryId=uuid(data.categoryId),amountMinor=parseAmount(data.amountMinor);
  if(typeof data.currency!=="string"||
    !CURRENCIES.includes(data.currency as typeof CURRENCIES[number])||
    typeof data.note!=="string"||data.note.length>240||data.note!==data.note.trim())
   throw new BadRequestException("Invalid expense draft payload");
  const result=await this.execute(scope,"core.CreateExpenseDraft",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("CategoryId",sql.UniqueIdentifier,categoryId)
   .input("AmountMinor",sql.BigInt,amountMinor)
   .input("Currency",sql.Char(3),data.currency)
   .input("Note",sql.NVarChar(240),data.note));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Expense draft not saved");
  return {id:String(row.id),created:Boolean(row.created),treasuryState:"NOT_PAID" as const,
   accountingState:"NOT_POSTED" as const};
 }
 async cancelDraft(actor:Actor,token:string,businessId:string,branchId:string,
  draftId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const draft=uuid(draftId);strictBody(body,[]);
  const result=await this.execute(scope,"core.CancelExpenseDraft",r=>r
   .input("DraftId",sql.UniqueIdentifier,draft)
   .input("ClientRequestId",sql.UniqueIdentifier,id));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Expense draft not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),treasuryState:"NOT_PAID" as const,
   accountingState:"NOT_POSTED" as const};
 }
}
