import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";
import {buildPosDraftReceipt,renderPosDraftReceiptHtml} from "./draft-print";

/**
 * POS V2: exact Cashier pricing inputs are server-repriced and snapshotted in
 * SQL022 alongside existing immutable core.PosDraft; no paid/posted transitions.
 * Important: current Catalog and Customer/HR scoped SQL guards are applied
 * atomically INSIDE the draft transaction (not only via prior GET in browser).
 */
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const MAX=9_000_000_000_000;
const uuid=(v:unknown):v is string=>typeof v==="string"&&GUID.test(v);
type InputLine={
 offeringId:string;quantity:number;lineDiscountMinor?:number|null;
 lineDiscountPercentBps?:number|null;executorEmployeeId?:string|null;
};
type RichInput={lines:InputLine[];customerId:string|null;
 headerDiscountMinor:number|null;headerDiscountPercentBps:number|null;
 expectedTotalMinor:number};
function shape(v:unknown,required:readonly string[],optional:readonly string[]=[]){
 if(!v||typeof v!=="object"||Array.isArray(v))throw new BadRequestException("Invalid POS V2 body");
 const input=v as Record<string,unknown>;
 if(required.some(k=>!Object.prototype.hasOwnProperty.call(input,k))||
  Object.keys(input).some(k=>!required.includes(k)&&!optional.includes(k)))
  throw new BadRequestException("Unknown POS V2 fields");
 return input;
}
function money(v:unknown,nullable=false):number|null{
 if(nullable&&(v===null||v===undefined))return null;
 if(typeof v!=="number"||!Number.isSafeInteger(v)||v<0||v>MAX)
  throw new BadRequestException("Invalid integer minor amount");
 return v;
}
function bps(v:unknown,nullable=false):number|null{
 if(nullable&&(v===null||v===undefined))return null;
 if(typeof v!=="number"||!Number.isSafeInteger(v)||v<0||v>10000)
  throw new BadRequestException("Invalid discount basis points");
 return v;
}
export function parseCashierRichDraftInput(body:unknown){
 const b=shape(body,["lines","expectedTotalMinor"],
  ["customerId","headerDiscountMinor","headerDiscountPercentBps"]);
 if(!Array.isArray(b.lines)||b.lines.length<1||b.lines.length>20)
  throw new BadRequestException("POS V2 lines must be 1..20");
 const seen=new Set<string>();
 const lines:InputLine[]=b.lines.map((raw:unknown)=>{
  const l=shape(raw,["offeringId","quantity"],
   ["lineDiscountMinor","lineDiscountPercentBps","executorEmployeeId"]);
  if(!uuid(l.offeringId)||typeof l.quantity!=="number"||
     !Number.isSafeInteger(l.quantity)||l.quantity<1||l.quantity>20||
     seen.has(l.offeringId.toLowerCase()))
   throw new BadRequestException("Invalid POS V2 offering/quantity");
  const offeringId=l.offeringId.toLowerCase();seen.add(offeringId);
  const executorEmployeeId=l.executorEmployeeId===undefined||l.executorEmployeeId===null?
   null:uuid(l.executorEmployeeId)?l.executorEmployeeId.toLowerCase():
    (()=>{throw new BadRequestException("Invalid assigned employee")})();
  const lineDiscountMinor=money(l.lineDiscountMinor,true);
  const lineDiscountPercentBps=bps(l.lineDiscountPercentBps,true);
  return {
   offeringId,quantity:l.quantity as number,
   lineDiscountMinor,lineDiscountPercentBps,executorEmployeeId,
  };
 });
 const customerId=b.customerId===undefined||b.customerId===null?null:
  uuid(b.customerId)?b.customerId.toLowerCase():
  (()=>{throw new BadRequestException("Invalid POS customer")})();
 const data:RichInput={
  lines,customerId,headerDiscountMinor:money(b.headerDiscountMinor,true),
  headerDiscountPercentBps:bps(b.headerDiscountPercentBps,true),
  expectedTotalMinor:money(b.expectedTotalMinor,false)!,
 };
 const json=JSON.stringify(data.lines);
 if(json.length>8000)throw new BadRequestException("POS V2 payload too long");
 const hash=createHash("sha256").update(JSON.stringify(data)).digest("hex");
 return {data,linesJson:json,hash};
}
function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_CATALOG_ENABLED!=="YES"||
    process.env.DRVO_POS_DRAFTS_ENABLED!=="YES"||
    process.env.DRVO_POS_RICH_ENABLED!=="YES")
  throw new ServiceUnavailableException("POS Cashier drafts disabled");
}
type Scope={tenantId:string;businessId:string;branchId:string;
 accountId:string;sessionVersion:number;tokenHash:string};
@Injectable()
export class PosRichService{
 constructor(private readonly db:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string):Scope{
  enabled();
  if(actor.mustChangePassword||!uuid(actor.tenantId)||!uuid(actor.accountId)||
     !uuid(businessId)||!uuid(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenantId:actor.tenantId,businessId,branchId,accountId:actor.accountId,
   sessionVersion:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(s:Scope){
  return this.db.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,s.tenantId)
   .input("BusinessId",sql.UniqueIdentifier,s.businessId)
   .input("BranchId",sql.UniqueIdentifier,s.branchId)
   .input("AccountId",sql.UniqueIdentifier,s.accountId)
   .input("SessionVersion",sql.Int,s.sessionVersion)
   .input("TokenHash",sql.Char(64),s.tokenHash);
 }
 private async execute(s:Scope,proc:string,bind?:(r:sql.Request)=>sql.Request){
  try{
   const r=this.request(s);
   return await (bind?bind(r):r).execute(proc);
  }catch(e){
   const code=typeof e==="object"&&e!==null&&"number" in e?Number(e.number):0;
   if([51401,51101,51131,51181,51424].includes(code))throw new NotFoundException();
   if(code===51423||code===2601||code===2627)
    throw new ConflictException("Draft request/approved quote changed; reprice");
   if(code===51422)throw new BadRequestException("Invalid Cashier POS draft");
   throw new ServiceUnavailableException("POS Cashier drafts unavailable");
  }
 }
 async create(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const s=this.scope(actor,token,businessId,branchId);
  if(!uuid(key))throw new BadRequestException("Idempotency-Key must be UUID");
  const parsed=parseCashierRichDraftInput(body),d=parsed.data;
  const res=await this.execute(s,"core.CreateBranchPosCashierDraft",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,key)
   .input("PayloadHash",sql.Char(64),parsed.hash)
   .input("LinesJson",sql.NVarChar(sql.MAX),parsed.linesJson)
   .input("CustomerId",sql.UniqueIdentifier,d.customerId)
   .input("HeaderDiscountMinor",sql.BigInt,d.headerDiscountMinor)
   .input("HeaderDiscountBps",sql.Int,d.headerDiscountPercentBps)
   .input("ExpectedTotalMinor",sql.BigInt,d.expectedTotalMinor));
  const row=res.recordset?.[0];
  if(!row||!uuid(String(row.id))||!Number.isSafeInteger(Number(row.grandTotalMinor)))
   throw new ServiceUnavailableException("Missing POS V2 draft result");
  return {id:String(row.id),created:Boolean(row.created),version:1,status:"DRAFT" as const,
   grandTotalMinor:Number(row.grandTotalMinor),
   paymentState:"NOT_COLLECTED" as const,accountingState:"NOT_POSTED" as const,
   inventoryState:"NOT_DECREMENTED" as const,discountsPersisted:true as const};
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string){
  const s=this.scope(actor,token,businessId,branchId);
  const result=await this.execute(s,"core.ReadBranchPosCashierDrafts");
  const sets=result.recordsets as Array<Array<Record<string,unknown>>>;
  if(!Array.isArray(sets)||sets.length!==2)
   throw new ServiceUnavailableException("POS V2 data missing");
  const drafts=(sets[0]??[]).map(row=>({
   draftId:String(row.draftId),createdAtUtc:
    row.createdAtUtc instanceof Date?row.createdAtUtc.toISOString():String(row.createdAtUtc),
   currency:String(row.currency).trim(),subtotalMinor:Number(row.subtotalMinor),
   customerId:row.customerId===null?null:String(row.customerId),
   headerDiscountMinor:Number(row.headerDiscountMinor),
   linesNetMinor:Number(row.linesNetMinor),
   totalDiscountMinor:Number(row.totalDiscountMinor),
   grandTotalMinor:Number(row.grandTotalMinor),
   status:"DRAFT" as const,version:1,
   lines:[] as Array<Record<string,unknown>>,
  }));
  const index=new Map(drafts.map(d=>[d.draftId.toLowerCase(),d]));
  for(const row of sets[1]??[]){
   const parent=index.get(String(row.draftId).toLowerCase());
   if(!parent)throw new ServiceUnavailableException("Orphan POS V2 line");
   parent.lines.push({
    lineNo:Number(row.lineNo),offeringId:String(row.offeringId),
    displayName:String(row.displayName),kind:String(row.kind),quantity:Number(row.quantity),
    unitPriceMinor:Number(row.unitPriceMinor),grossMinor:Number(row.grossMinor),
    executorEmployeeId:row.executorEmployeeId===null?null:String(row.executorEmployeeId),
    discountMinor:Number(row.discountMinor),netMinor:Number(row.netMinor),
   });
  }
  for(const d of drafts){
   if(!uuid(d.draftId)||!Number.isSafeInteger(d.grandTotalMinor)||d.grandTotalMinor<0||
     d.grandTotalMinor>MAX||!["EGP","SAR","AED","USD"].includes(d.currency)||
     d.lines.length<1||d.lines.length>20||
     d.lines.reduce((sum,l)=>sum+Number(l.netMinor),0)-d.headerDiscountMinor!==d.grandTotalMinor)
    throw new ServiceUnavailableException("Invalid POS V2 snapshot");
  }
  return {state:"CASHIER_PRICE_SNAPSHOT_DRAFTS_ONLY" as const,drafts,
   limit:50,mayBeTruncated:drafts.length===50,
   discountsPersisted:true as const,paymentState:"NOT_COLLECTED" as const,
   accountingState:"NOT_POSTED" as const,inventoryState:"NOT_DECREMENTED" as const};
 }
 /**
  * NON-POSTING DRAFT print preview. Reuses scoped ReadBranchPosCashierDrafts (no new SQL).
  * Labels are optional caller-supplied display strings already authorized in the private UI;
  * Nest never invents paid/posted fields or touches GL/payment/stock.
  */
 async printPreview(actor:Actor,token:string,businessId:string,branchId:string,
  draftId:string,labels?:{
   customerDisplayName?:string|null;customerPhone?:string|null;
   branchLabel?:string|null;businessLabel?:string|null;
   executorNames?:Record<string,string>;
  }){
  if(!uuid(draftId))throw new BadRequestException("Invalid draft id");
  const listed=await this.list(actor,token,businessId,branchId);
  const draft=listed.drafts.find(d=>d.draftId.toLowerCase()===draftId.toLowerCase());
  if(!draft)throw new NotFoundException();
  const executorNames=labels?.executorNames&&typeof labels.executorNames==="object"&&
   !Array.isArray(labels.executorNames)?labels.executorNames:{};
  const receipt=buildPosDraftReceipt({
   draftId:draft.draftId,createdAtUtc:draft.createdAtUtc,currency:draft.currency,
   customerId:draft.customerId,customerDisplayName:labels?.customerDisplayName??null,
   customerPhone:labels?.customerPhone??null,
   headerDiscountMinor:draft.headerDiscountMinor,subtotalMinor:draft.subtotalMinor,
   linesNetMinor:draft.linesNetMinor,totalDiscountMinor:draft.totalDiscountMinor,
   grandTotalMinor:draft.grandTotalMinor,
   branchLabel:labels?.branchLabel??null,businessLabel:labels?.businessLabel??null,
   lines:draft.lines.map(l=>{
    const executorId=l.executorEmployeeId===null||l.executorEmployeeId===undefined?null:
     String(l.executorEmployeeId);
    const nameKey=executorId?executorId.toLowerCase():"";
    const executorDisplayName=nameKey&&typeof executorNames[nameKey]==="string"?
     executorNames[nameKey]:null;
    return {
     lineNo:Number(l.lineNo),offeringId:String(l.offeringId),
     displayName:String(l.displayName),kind:String(l.kind),quantity:Number(l.quantity),
     unitPriceMinor:Number(l.unitPriceMinor),grossMinor:Number(l.grossMinor),
     discountMinor:Number(l.discountMinor),netMinor:Number(l.netMinor),
     executorEmployeeId:executorId,executorDisplayName,
    };
   }),
  });
  return {
   state:"POS_DRAFT_PRINT_PREVIEW" as const,
   sourceState:listed.state,
   receipt,
   html:renderPosDraftReceiptHtml(receipt),
   paymentState:"NOT_COLLECTED" as const,
   accountingState:"NOT_POSTED" as const,
   inventoryState:"NOT_DECREMENTED" as const,
  };
 }
}
