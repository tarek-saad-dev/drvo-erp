import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";
import {lineExtMinor,previewPurchaseAp} from "./ap-preview";

// Purchasing owns Business suppliers + branch purchase receives with AP preview.
// Stock qty applies via SQL027 ApplyBranchStockDelta; no payable/Treasury/GL (ADR-031).
export type Supplier={
 supplierId:string;displayName:string;phoneNote:string;notes:string;isActive:boolean;
};
export type PurchasingProduct={
 offeringId:string;displayName:string;isActive:boolean;qtyMilli:number;
};
export type PurchaseReceive={
 receiveId:string;supplierId:string|null;supplierName:string|null;supplierNote:string;
 currency:"EGP"|"SAR"|"AED"|"USD";status:"APPLIED"|"CANCELLED";createdAtUtc:string;
 lineCount:number;apTotalMinor:number;
};
export type PurchasingWorkspace={
 state:"NONPOSTING_PURCHASE_RECEIVES_AP_PREVIEW";
 purchasingPosts:"RECEIVE_DRAFTS_ONLY";
 adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";
 accountingState:"NOT_POSTED";
 apPreview:{
  state:"AP_PREVIEW_ONLY";openApMinor:number;lifetimeApMinor:number;openReceiveCount:number;
 };
 suppliers:Supplier[];products:PurchasingProduct[];receives:PurchaseReceive[];
 limitPerSource:200;mayBeTruncated:boolean;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const CURRENCIES=["EGP","SAR","AED","USD"] as const;
const MAX=9000000000000;
function strictBody(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
  Object.keys(body).length!==keys.length||
  keys.some(key=>!Object.prototype.hasOwnProperty.call(body,key)))
  throw new BadRequestException("Unexpected purchasing fields");
 return body as Record<string,unknown>;
}
function uuid(value:unknown):string{
 if(typeof value!=="string"||!UUID.test(value))throw new BadRequestException("Invalid identifier");
 return value;
}
function optionalUuid(value:unknown):string|null{
 if(value===null)return null;
 return uuid(value);
}
@Injectable()
export class PurchasingService {
 constructor(private readonly db:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_PURCHASING_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Purchasing disabled");
  if(actor.mustChangePassword||!UUID.test(actor.tenantId)||!UUID.test(actor.accountId)||
     !UUID.test(businessId)||!UUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   hash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<PurchasingService["scope"]>){
  return this.db.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.hash);
 }
 private async execute(scope:ReturnType<PurchasingService["scope"]>,name:string,
  bind?:(request:sql.Request)=>sql.Request){
  try{
   const request=this.request(scope);
   return await (bind?bind(request):request).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
     Number(error.number):undefined;
   if(code===51511||code===51514)throw new NotFoundException();
   if(code===51512)throw new BadRequestException("Invalid purchasing request");
   if(code===51513||code===2601||code===2627)
    throw new ConflictException("Purchasing conflict");
   if(code===51475)throw new ConflictException("Purchasing stock conflict");
   throw new ServiceUnavailableException("Purchasing unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<PurchasingWorkspace>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadPurchasingWorkspace");
  const sets=result.recordsets;
  if(!Array.isArray(sets)||sets.length!==4)
   throw new ServiceUnavailableException("Purchasing data unavailable");
  const suppliers:Supplier[]=sets[0].map((row:Record<string,unknown>)=>({
   supplierId:String(row.supplierId),displayName:String(row.displayName),
   phoneNote:String(row.phoneNote),notes:String(row.notes),isActive:Boolean(row.isActive),
  }));
  const products:PurchasingProduct[]=sets[1].map((row:Record<string,unknown>)=>({
   offeringId:String(row.offeringId),displayName:String(row.displayName),
   isActive:Boolean(row.isActive),qtyMilli:Number(row.qtyMilli),
  }));
  const receives:PurchaseReceive[]=sets[2].map((row:Record<string,unknown>)=>({
   receiveId:String(row.receiveId),
   supplierId:row.supplierId==null?null:String(row.supplierId),
   supplierName:row.supplierName==null?null:String(row.supplierName),
   supplierNote:String(row.supplierNote),
   currency:row.currency as PurchaseReceive["currency"],
   status:row.status as PurchaseReceive["status"],
   createdAtUtc:row.createdAtUtc instanceof Date?row.createdAtUtc.toISOString():String(row.createdAtUtc),
   lineCount:Number(row.lineCount),apTotalMinor:Number(row.apTotalMinor),
  }));
  const ap=sets[3][0] as Record<string,unknown>|undefined;
  if(!ap||receives.some(r=>!CURRENCIES.includes(r.currency)||
    !["APPLIED","CANCELLED"].includes(r.status)||!Number.isSafeInteger(r.apTotalMinor)))
   throw new ServiceUnavailableException("Purchasing data invalid");
  return {
   state:"NONPOSTING_PURCHASE_RECEIVES_AP_PREVIEW",
   purchasingPosts:"RECEIVE_DRAFTS_ONLY",
   adr031:"NOT_IN_SCOPE",
   treasuryState:"NOT_PAID",
   accountingState:"NOT_POSTED",
   apPreview:{
    state:"AP_PREVIEW_ONLY",
    openApMinor:Number(ap.openApMinor),
    lifetimeApMinor:Number(ap.lifetimeApMinor),
    openReceiveCount:Number(ap.openReceiveCount),
   },
   suppliers,products,receives,
   limitPerSource:200,
   mayBeTruncated:suppliers.length===200||products.length===200||receives.length===50,
  };
 }
 async createSupplier(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["displayName","phoneNote","notes"]);
  if(typeof data.displayName!=="string"||data.displayName.trim().length<1||
     data.displayName.trim().length>120||data.displayName!==data.displayName.trim()||
     typeof data.phoneNote!=="string"||data.phoneNote.length>40||
     typeof data.notes!=="string"||data.notes.length>240)
   throw new BadRequestException("Invalid supplier payload");
  const result=await this.execute(scope,"core.CreateSupplier",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("DisplayName",sql.NVarChar(120),data.displayName)
   .input("PhoneNote",sql.NVarChar(40),data.phoneNote)
   .input("Notes",sql.NVarChar(240),data.notes));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Supplier not saved");
  return {id:String(row.id),created:Boolean(row.created)};
 }
 async createReceive(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["supplierId","supplierNote","currency","lines"]);
  const supplierId=optionalUuid(data.supplierId);
  if(typeof data.supplierNote!=="string"||data.supplierNote.length>160||
     typeof data.currency!=="string"||
     !CURRENCIES.includes(data.currency as typeof CURRENCIES[number])||
     !Array.isArray(data.lines))
   throw new BadRequestException("Invalid purchase receive payload");
  const rawLines=data.lines as unknown[];
  if(rawLines.length<1||rawLines.length>50)
   throw new BadRequestException("Invalid purchase receive lines");
  const lines=rawLines.map((line,index)=>{
   if(!line||typeof line!=="object"||Array.isArray(line))
    throw new BadRequestException("Invalid purchase receive line");
   const row=line as Record<string,unknown>;
   if(Object.keys(row).length!==3||
      !Object.prototype.hasOwnProperty.call(row,"offeringId")||
      !Object.prototype.hasOwnProperty.call(row,"qtyMilli")||
      !Object.prototype.hasOwnProperty.call(row,"unitCostMinor"))
    throw new BadRequestException("Unexpected purchase receive line fields");
   const offeringId=uuid(row.offeringId);
   if(typeof row.qtyMilli!=="number"||!Number.isSafeInteger(row.qtyMilli)||
      row.qtyMilli<1||row.qtyMilli>MAX)
    throw new BadRequestException("Invalid qtyMilli");
   if(typeof row.unitCostMinor!=="number"||!Number.isSafeInteger(row.unitCostMinor)||
      row.unitCostMinor<0||row.unitCostMinor>MAX)
    throw new BadRequestException("Invalid unitCostMinor");
   // Validate AP math locally before SQL (same formula as SQL037 LineExtMinor).
   lineExtMinor(row.qtyMilli,row.unitCostMinor);
   return {lineNo:index+1,offeringId,qtyMilli:row.qtyMilli,unitCostMinor:row.unitCostMinor};
  });
  let preview;
  try{preview=previewPurchaseAp(lines);}
  catch{throw new BadRequestException("Invalid purchase receive lines");}
  const result=await this.execute(scope,"core.CreatePurchaseReceive",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("SupplierId",sql.UniqueIdentifier,supplierId)
   .input("SupplierNote",sql.NVarChar(160),data.supplierNote)
   .input("Currency",sql.Char(3),data.currency)
   .input("LinesJson",sql.NVarChar(sql.MAX),JSON.stringify(lines)));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Purchase receive not saved");
  return {
   id:String(row.id),created:Boolean(row.created),
   apTotalMinor:Number(row.apTotalMinor??preview.apTotalMinor),
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const,
   apPreviewState:"AP_PREVIEW_ONLY" as const,adr031:"NOT_IN_SCOPE" as const,
  };
 }
 async cancelReceive(actor:Actor,token:string,businessId:string,branchId:string,
  receiveId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const receive=uuid(receiveId);strictBody(body,[]);
  const result=await this.execute(scope,"core.CancelPurchaseReceive",r=>r
   .input("ReceiveId",sql.UniqueIdentifier,receive)
   .input("ClientRequestId",sql.UniqueIdentifier,id));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Purchase receive not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const};
 }
}
