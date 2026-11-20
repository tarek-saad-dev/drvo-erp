import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

// Inventory owns branch on-hand + nonposting receive/adjust docs. No sale COGS, AP, Treasury or GL.
export type InventoryPolicy={allowNegativeStock:boolean;notes:string;updatedAtUtc:string};
export type InventoryItem={
 offeringId:string;displayName:string;categoryId:string|null;categoryName:string|null;
 priceMinor:number;currency:string;isActive:boolean;qtyMilli:number;
 reorderLevelMilli:number|null;lastMovementAtUtc:string|null;
 stockStatus:"OK"|"LOW"|"OUT";
};
export type StockReceive={
 receiveId:string;sourceType:"OPENING"|"PURCHASE";supplierNote:string;
 status:"APPLIED"|"CANCELLED";createdAtUtc:string;lineCount:number;
};
export type StockAdjust={
 adjustId:string;offeringId:string;offeringName:string;deltaMilli:number;
 reason:string;status:"APPLIED"|"CANCELLED";createdAtUtc:string;
};
export type InventoryWorkspace={
 state:"NONPOSTING_BRANCH_STOCK_BALANCES";
 verification:"BALANCES_OWNED";
 posting:"NOT_POSTED";
 stockLedger:"BRANCH_BALANCE_TABLE";
 purchasingPosts:"RECEIVE_DRAFTS_ONLY";
 adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";
 accountingState:"NOT_POSTED";
 policy:InventoryPolicy;
 items:InventoryItem[];
 receives:StockReceive[];
 adjusts:StockAdjust[];
 limitPerSource:200;
 mayBeTruncated:boolean;
};
export type TransferLine={lineNo:number;offeringId:string;offeringName:string;qtyMilli:number};
export type StockTransfer={
 transferId:string;fromBranchId:string;fromBranchName:string;toBranchId:string;
 toBranchName:string;direction:"IN"|"OUT";transferNote:string;
 status:"APPLIED"|"CANCELLED";createdAtUtc:string;cancelledAtUtc:string|null;
 lineCount:number;lines:TransferLine[];
};
export type TransferWorkspace={
 state:"NONPOSTING_BRANCH_TRANSFERS";
 posting:"NOT_POSTED";
 adr031:"NOT_IN_SCOPE";
 treasuryState:"NOT_PAID";
 accountingState:"NOT_POSTED";
 transferModel:"ATOMIC_APPLY_CANCEL_REVERSE";
 sourceStock:"ENFORCED";
 transfers:StockTransfer[];
 destinations:Array<{branchId:string;displayName:string}>;
 items:Array<{offeringId:string;displayName:string;qtyMilli:number}>;
 limitPerSource:50;
 mayBeTruncated:boolean;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
const MAX=9000000000000;
function strictBody(body:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!body||typeof body!=="object"||Array.isArray(body)||
  Object.keys(body).length!==keys.length||
  keys.some(key=>!Object.prototype.hasOwnProperty.call(body,key)))
  throw new BadRequestException("Unexpected inventory fields");
 return body as Record<string,unknown>;
}
function uuid(value:unknown):string{
 if(typeof value!=="string"||!UUID.test(value))throw new BadRequestException("Invalid identifier");
 return value;
}
function milli(value:unknown,allowZero=false):number{
 if(typeof value!=="number"||!Number.isSafeInteger(value)||
  value<-MAX||value>MAX||(!allowZero&&value===0))
  throw new BadRequestException("Invalid quantity milli");
 return value;
}
@Injectable()
export class InventoryService {
 constructor(private readonly db:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_INVENTORY_ENABLED!=="YES"||process.env.DRVO_K5_AUTH_ENABLED!=="YES")
   throw new ServiceUnavailableException("Inventory disabled");
  if(actor.mustChangePassword||!UUID.test(actor.tenantId)||!UUID.test(actor.accountId)||
     !UUID.test(businessId)||!UUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   hash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<InventoryService["scope"]>){
  return this.db.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,scope.tenant)
   .input("BusinessId",sql.UniqueIdentifier,scope.business)
   .input("BranchId",sql.UniqueIdentifier,scope.branch)
   .input("AccountId",sql.UniqueIdentifier,scope.account)
   .input("SessionVersion",sql.Int,scope.version)
   .input("TokenHash",sql.Char(64),scope.hash);
 }
 private async execute(scope:ReturnType<InventoryService["scope"]>,name:string,
  bind?:(request:sql.Request)=>sql.Request){
  try{
   const request=this.request(scope);
   return await (bind?bind(request):request).execute(name);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
     Number(error.number):undefined;
   if(code===51471||code===51474)throw new NotFoundException();
   if(code===51472)throw new BadRequestException("Invalid inventory request");
   if(code===51473||code===51475||code===2601||code===2627)
    throw new ConflictException("Inventory conflict");
   throw new ServiceUnavailableException("Inventory unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<InventoryWorkspace>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadInventoryWorkspace");
  const sets=result.recordsets;
  if(!Array.isArray(sets)||sets.length!==4)
   throw new ServiceUnavailableException("Inventory data unavailable");
  const policyRow=sets[0]?.[0] as Record<string,unknown>|undefined;
  if(!policyRow)throw new ServiceUnavailableException("Inventory policy missing");
  const items:InventoryItem[]=sets[1].map((row:Record<string,unknown>)=>{
   const status=String(row.stockStatus);
   if(!["OK","LOW","OUT"].includes(status))
    throw new ServiceUnavailableException("Invalid stock status");
   return {
    offeringId:String(row.offeringId),displayName:String(row.displayName),
    categoryId:row.categoryId?String(row.categoryId):null,
    categoryName:row.categoryName?String(row.categoryName):null,
    priceMinor:Number(row.priceMinor),currency:String(row.currency),
    isActive:Boolean(row.isActive),qtyMilli:Number(row.qtyMilli),
    reorderLevelMilli:row.reorderLevelMilli==null?null:Number(row.reorderLevelMilli),
    lastMovementAtUtc:row.lastMovementAtUtc instanceof Date?
     row.lastMovementAtUtc.toISOString():row.lastMovementAtUtc?String(row.lastMovementAtUtc):null,
    stockStatus:status as InventoryItem["stockStatus"],
   };
  });
  if(items.some(i=>!Number.isSafeInteger(i.qtyMilli)||!Number.isSafeInteger(i.priceMinor)))
   throw new ServiceUnavailableException("Inventory data invalid");
  const receives:StockReceive[]=sets[2].map((row:Record<string,unknown>)=>{
   const source=String(row.sourceType),status=String(row.status);
   if(!["OPENING","PURCHASE"].includes(source)||!["APPLIED","CANCELLED"].includes(status))
    throw new ServiceUnavailableException("Invalid receive");
   return {
    receiveId:String(row.receiveId),sourceType:source as StockReceive["sourceType"],
    supplierNote:String(row.supplierNote),status:status as StockReceive["status"],
    createdAtUtc:row.createdAtUtc instanceof Date?row.createdAtUtc.toISOString():String(row.createdAtUtc),
    lineCount:Number(row.lineCount),
   };
  });
  const adjusts:StockAdjust[]=sets[3].map((row:Record<string,unknown>)=>{
   const status=String(row.status);
   if(!["APPLIED","CANCELLED"].includes(status))
    throw new ServiceUnavailableException("Invalid adjust");
   return {
    adjustId:String(row.adjustId),offeringId:String(row.offeringId),
    offeringName:String(row.offeringName),deltaMilli:Number(row.deltaMilli),
    reason:String(row.reason),status:status as StockAdjust["status"],
    createdAtUtc:row.createdAtUtc instanceof Date?row.createdAtUtc.toISOString():String(row.createdAtUtc),
   };
  });
  return {
   state:"NONPOSTING_BRANCH_STOCK_BALANCES",verification:"BALANCES_OWNED",
   posting:"NOT_POSTED",stockLedger:"BRANCH_BALANCE_TABLE",
   purchasingPosts:"RECEIVE_DRAFTS_ONLY",adr031:"NOT_IN_SCOPE",
   treasuryState:"NOT_PAID",accountingState:"NOT_POSTED",
   policy:{
    allowNegativeStock:Boolean(policyRow.allowNegativeStock),
    notes:String(policyRow.notes??""),
    updatedAtUtc:policyRow.updatedAtUtc instanceof Date?
     policyRow.updatedAtUtc.toISOString():String(policyRow.updatedAtUtc),
   },
   items,receives,adjusts,limitPerSource:200,
   mayBeTruncated:items.length===200||receives.length===50||adjusts.length===50,
  };
 }
 async upsertPolicy(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["allowNegativeStock","notes"]);
  if(typeof data.allowNegativeStock!=="boolean"||typeof data.notes!=="string"||
     data.notes.length>240)
   throw new BadRequestException("Invalid inventory policy");
  const result=await this.execute(scope,"core.UpsertInventoryStockPolicy",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("AllowNegativeStock",sql.Bit,data.allowNegativeStock)
   .input("Notes",sql.NVarChar(240),data.notes));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Inventory policy not saved");
  return {updated:Boolean(row.updated),allowNegativeStock:Boolean(row.allowNegativeStock),
   posting:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const};
 }
 async createReceive(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["sourceType","supplierNote","lines"]);
  if(data.sourceType!=="OPENING"&&data.sourceType!=="PURCHASE")
   throw new BadRequestException("Invalid receive source");
  if(typeof data.supplierNote!=="string"||data.supplierNote.length>160)
   throw new BadRequestException("Invalid supplier note");
  if(!Array.isArray(data.lines)||data.lines.length<1||data.lines.length>50)
   throw new BadRequestException("Invalid receive lines");
  const lines:Array<{lineNo:number;offeringId:string;qtyMilli:number;unitCostMinor:number}>=[];
  const seenOff=new Set<string>(),seenNo=new Set<number>();
  for(const raw of data.lines){
   if(!raw||typeof raw!=="object"||Array.isArray(raw))
    throw new BadRequestException("Invalid receive line");
   const line=raw as Record<string,unknown>;
   if(Object.keys(line).length!==4||!["lineNo","offeringId","qtyMilli","unitCostMinor"]
    .every(k=>Object.prototype.hasOwnProperty.call(line,k)))
    throw new BadRequestException("Unexpected receive line fields");
   if(typeof line.lineNo!=="number"||!Number.isSafeInteger(line.lineNo)||
      line.lineNo<1||line.lineNo>50||seenNo.has(line.lineNo))
    throw new BadRequestException("Invalid lineNo");
   const offeringId=uuid(line.offeringId).toLowerCase();
   if(seenOff.has(offeringId))throw new BadRequestException("Duplicate offering line");
   const qtyMilli=milli(line.qtyMilli);
   if(typeof line.unitCostMinor!=="number"||!Number.isSafeInteger(line.unitCostMinor)||
      line.unitCostMinor<0||line.unitCostMinor>MAX)
    throw new BadRequestException("Invalid unit cost");
   seenNo.add(line.lineNo);seenOff.add(offeringId);
   lines.push({lineNo:line.lineNo,offeringId,qtyMilli,unitCostMinor:line.unitCostMinor});
  }
  const result=await this.execute(scope,"core.CreateStockReceive",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("SourceType",sql.VarChar(16),data.sourceType)
   .input("SupplierNote",sql.NVarChar(160),data.supplierNote)
   .input("LinesJson",sql.NVarChar(sql.MAX),JSON.stringify(lines)));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock receive not saved");
  return {id:String(row.id),created:Boolean(row.created),
   purchasingPosts:"RECEIVE_DRAFTS_ONLY" as const,treasuryState:"NOT_PAID" as const,
   accountingState:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const};
 }
 async cancelReceive(actor:Actor,token:string,businessId:string,branchId:string,
  receiveId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const receive=uuid(receiveId);strictBody(body,[]);
  const result=await this.execute(scope,"core.CancelStockReceive",r=>r
   .input("ReceiveId",sql.UniqueIdentifier,receive)
   .input("ClientRequestId",sql.UniqueIdentifier,id));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock receive not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const};
 }
 async createAdjust(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["offeringId","deltaMilli","reason"]);
  const offeringId=uuid(data.offeringId);
  const deltaMilli=milli(data.deltaMilli);
  if(typeof data.reason!=="string"||data.reason!==data.reason.trim()||
     data.reason.trim().length<1||data.reason.length>240)
   throw new BadRequestException("Invalid adjust reason");
  const result=await this.execute(scope,"core.CreateStockAdjust",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("OfferingId",sql.UniqueIdentifier,offeringId)
   .input("DeltaMilli",sql.BigInt,deltaMilli)
   .input("Reason",sql.NVarChar(240),data.reason));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock adjust not saved");
  return {id:String(row.id),created:Boolean(row.created),
   posting:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const};
 }
 async cancelAdjust(actor:Actor,token:string,businessId:string,branchId:string,
  adjustId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const adjust=uuid(adjustId);strictBody(body,[]);
  const result=await this.execute(scope,"core.CancelStockAdjust",r=>r
   .input("AdjustId",sql.UniqueIdentifier,adjust)
   .input("ClientRequestId",sql.UniqueIdentifier,id));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock adjust not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),
   posting:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const};
 }
 // INV-03 branch transfers (SQL032): one atomic APPLIED document; cancel reverses both deltas.
 async listTransfers(actor:Actor,token:string,businessId:string,branchId:string):
  Promise<TransferWorkspace>{
  const result=await this.execute(this.scope(actor,token,businessId,branchId),
   "core.ReadStockTransfers");
  const sets=result.recordsets;
  if(!Array.isArray(sets)||sets.length!==4)
   throw new ServiceUnavailableException("Transfer data unavailable");
  const iso=(value:unknown)=>value instanceof Date?value.toISOString():String(value);
  const lines=new Map<string,TransferLine[]>();
  for(const row of sets[1] as Array<Record<string,unknown>>){
   const qtyMilli=Number(row.qtyMilli);
   if(!Number.isSafeInteger(qtyMilli))throw new ServiceUnavailableException("Invalid transfer line");
   const key=String(row.transferId),list=lines.get(key)??[];
   list.push({lineNo:Number(row.lineNo),offeringId:String(row.offeringId),
    offeringName:String(row.offeringName),qtyMilli});
   lines.set(key,list);
  }
  const transfers:StockTransfer[]=(sets[0] as Array<Record<string,unknown>>).map(row=>{
   const status=String(row.status),direction=String(row.direction);
   if(!["APPLIED","CANCELLED"].includes(status)||!["IN","OUT"].includes(direction))
    throw new ServiceUnavailableException("Invalid transfer");
   const transferId=String(row.transferId);
   return {
    transferId,fromBranchId:String(row.fromBranchId),fromBranchName:String(row.fromBranchName),
    toBranchId:String(row.toBranchId),toBranchName:String(row.toBranchName),
    direction:direction as StockTransfer["direction"],transferNote:String(row.transferNote),
    status:status as StockTransfer["status"],createdAtUtc:iso(row.createdAtUtc),
    cancelledAtUtc:row.cancelledAtUtc?iso(row.cancelledAtUtc):null,
    lineCount:Number(row.lineCount),lines:lines.get(transferId)??[],
   };
  });
  const destinations=(sets[2] as Array<Record<string,unknown>>).map(row=>(
   {branchId:String(row.branchId),displayName:String(row.displayName)}));
  const items=(sets[3] as Array<Record<string,unknown>>).map(row=>{
   const qtyMilli=Number(row.qtyMilli);
   if(!Number.isSafeInteger(qtyMilli))throw new ServiceUnavailableException("Invalid stock qty");
   return {offeringId:String(row.offeringId),displayName:String(row.displayName),qtyMilli};
  });
  return {
   state:"NONPOSTING_BRANCH_TRANSFERS",posting:"NOT_POSTED",adr031:"NOT_IN_SCOPE",
   treasuryState:"NOT_PAID",accountingState:"NOT_POSTED",
   transferModel:"ATOMIC_APPLY_CANCEL_REVERSE",sourceStock:"ENFORCED",
   transfers,destinations,items,limitPerSource:50,
   mayBeTruncated:transfers.length===50||items.length===200,
  };
 }
 async createTransfer(actor:Actor,token:string,businessId:string,branchId:string,
  key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const data=strictBody(body,["toBranchId","note","lines"]);
  const toBranchId=uuid(data.toBranchId).toLowerCase();
  if(toBranchId===branchId.toLowerCase())
   throw new BadRequestException("Transfer needs two different branches");
  if(typeof data.note!=="string"||data.note.length>160)
   throw new BadRequestException("Invalid transfer note");
  if(!Array.isArray(data.lines)||data.lines.length<1||data.lines.length>50)
   throw new BadRequestException("Invalid transfer lines");
  const lines:Array<{lineNo:number;offeringId:string;qtyMilli:number}>=[];
  const seenOff=new Set<string>(),seenNo=new Set<number>();
  for(const raw of data.lines){
   if(!raw||typeof raw!=="object"||Array.isArray(raw))
    throw new BadRequestException("Invalid transfer line");
   const line=raw as Record<string,unknown>;
   if(Object.keys(line).length!==3||!["lineNo","offeringId","qtyMilli"]
    .every(k=>Object.prototype.hasOwnProperty.call(line,k)))
    throw new BadRequestException("Unexpected transfer line fields");
   if(typeof line.lineNo!=="number"||!Number.isSafeInteger(line.lineNo)||
      line.lineNo<1||line.lineNo>50||seenNo.has(line.lineNo))
    throw new BadRequestException("Invalid lineNo");
   const offeringId=uuid(line.offeringId).toLowerCase();
   if(seenOff.has(offeringId))throw new BadRequestException("Duplicate offering line");
   const qtyMilli=milli(line.qtyMilli);
   if(qtyMilli<1)throw new BadRequestException("Transfer quantity must be positive");
   seenNo.add(line.lineNo);seenOff.add(offeringId);
   lines.push({lineNo:line.lineNo,offeringId,qtyMilli});
  }
  const result=await this.execute(scope,"core.CreateStockTransfer",r=>r
   .input("ClientRequestId",sql.UniqueIdentifier,id)
   .input("ToBranchId",sql.UniqueIdentifier,toBranchId)
   .input("TransferNote",sql.NVarChar(160),data.note)
   .input("LinesJson",sql.NVarChar(sql.MAX),JSON.stringify(lines)));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock transfer not saved");
  return {id:String(row.id),created:Boolean(row.created),
   posting:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const,
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const};
 }
 async cancelTransfer(actor:Actor,token:string,businessId:string,branchId:string,
  transferId:unknown,key:unknown,body:unknown){
  const scope=this.scope(actor,token,businessId,branchId),id=uuid(key);
  const transfer=uuid(transferId);strictBody(body,[]);
  const result=await this.execute(scope,"core.CancelStockTransfer",r=>r
   .input("TransferId",sql.UniqueIdentifier,transfer)
   .input("ClientRequestId",sql.UniqueIdentifier,id));
  const row=result.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("Stock transfer not cancelled");
  return {id:String(row.id),changed:Boolean(row.changed),
   posting:"NOT_POSTED" as const,adr031:"NOT_IN_SCOPE" as const,
   treasuryState:"NOT_PAID" as const,accountingState:"NOT_POSTED" as const};
 }
}
