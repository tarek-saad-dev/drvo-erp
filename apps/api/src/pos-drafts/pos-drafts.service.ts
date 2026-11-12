import {
 BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FULL_GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
type InputLine={offeringId:string;quantity:number};
type DraftLine=InputLine&{lineNo:number;kind:string;displayName:string;unitPriceMinor:number;lineSubtotalMinor:number};
type StoredDraft={draftId:string;status:"DRAFT";version:number;currency:string;
 subtotalMinor:number;createdAtUtc:string;lines:DraftLine[]};
export type PosDraftRead={drafts:StoredDraft[]};

export function parsePosDraftInput(body:unknown):{lines:InputLine[];json:string;hash:string}{
 if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).length!==1||!Object.prototype.hasOwnProperty.call(body,"lines"))
   throw new BadRequestException("Unexpected draft payload");
 const rows=(body as {lines:unknown}).lines;
 if(!Array.isArray(rows)||rows.length<1||rows.length>20)
   throw new BadRequestException("Invalid line count");
 const seen=new Set<string>(),lines:InputLine[]=[];
 for(const value of rows){
  if(!value||typeof value!=="object"||Array.isArray(value)||
     Object.keys(value).length!==2||
     !Object.prototype.hasOwnProperty.call(value,"offeringId")||
     !Object.prototype.hasOwnProperty.call(value,"quantity"))
    throw new BadRequestException("Invalid draft line");
  const o=value as Record<string,unknown>;
  if(typeof o.offeringId!=="string"||!FULL_GUID.test(o.offeringId)||
     typeof o.quantity!=="number"||!Number.isSafeInteger(o.quantity)||
     o.quantity<1||o.quantity>20)
    throw new BadRequestException("Invalid offering or quantity");
  const offeringId=o.offeringId.toLowerCase();
  if(seen.has(offeringId))throw new BadRequestException("Duplicate offering");
  seen.add(offeringId);lines.push({offeringId,quantity:o.quantity});
 }
 const json=JSON.stringify(lines);
 return {lines,json,hash:createHash("sha256").update(json).digest("hex")};
}
function enabled(){
 if(process.env.DRVO_K5_AUTH_ENABLED!=="YES"||
    process.env.DRVO_CATALOG_ENABLED!=="YES"||
    process.env.DRVO_POS_DRAFTS_ENABLED!=="YES")
  throw new ServiceUnavailableException("POS drafts disabled");
}
@Injectable()
export class PosDraftsService {
 constructor(private readonly db:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  enabled();
  if(actor.mustChangePassword||!FULL_GUID.test(actor.tenantId)||
     !FULL_GUID.test(actor.accountId)||!FULL_GUID.test(businessId)||
     !FULL_GUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
   throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
   account:actor.accountId,version:actor.sessionVersion,
   tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(s:ReturnType<PosDraftsService["scope"]>){
  return this.db.getInternalPool().request()
   .input("TenantId",sql.UniqueIdentifier,s.tenant)
   .input("BusinessId",sql.UniqueIdentifier,s.business)
   .input("BranchId",sql.UniqueIdentifier,s.branch)
   .input("AccountId",sql.UniqueIdentifier,s.account)
   .input("SessionVersion",sql.Int,s.version)
   .input("TokenHash",sql.Char(64),s.tokenHash);
 }
 private async execute(s:ReturnType<PosDraftsService["scope"]>,proc:string,params?:(r:sql.Request)=>sql.Request){
  try{
   const req=this.request(s);
   return await (params?params(req):req).execute(proc);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error?
    Number(error.number):undefined;
   if(code===51401||code===51101)throw new NotFoundException();
   if(code===51412)throw new ConflictException("Draft request ID reused with new payload");
   if(code===51413)throw new BadRequestException("Invalid draft or Catalog reference");
   throw new ServiceUnavailableException("POS drafts unavailable");
  }
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<PosDraftRead>{
  const s=this.scope(actor,token,businessId,branchId);
  const r=await this.execute(s,"core.ReadBranchPosDrafts");
  const sets=r.recordsets as Array<Array<Record<string,unknown>>>;
  const drafts=(sets[0]??[]).map(row=>({
   draftId:String(row.draftId),status:"DRAFT" as const,version:Number(row.version),
   currency:String(row.currency).trim(),subtotalMinor:Number(row.subtotalMinor),
   createdAtUtc:new Date(String(row.createdAtUtc)).toISOString(),lines:[] as DraftLine[],
  }));
  const byId=new Map(drafts.map(d=>[d.draftId.toLowerCase(),d]));
  for(const row of (sets[1]??[])){
   const target=byId.get(String(row.draftId).toLowerCase());
   if(!target)throw new ServiceUnavailableException("Draft list integrity error");
   target.lines.push({
    lineNo:Number(row.lineNo),offeringId:String(row.offeringId),
    kind:String(row.kind),displayName:String(row.displayName),quantity:Number(row.quantity),
    unitPriceMinor:Number(row.unitPriceMinor),lineSubtotalMinor:Number(row.lineSubtotalMinor),
   });
  }
  return {drafts};
 }
 async create(actor:Actor,token:string,businessId:string,branchId:string,
  requestId:unknown,body:unknown){
  const s=this.scope(actor,token,businessId,branchId);
  if(typeof requestId!=="string"||!FULL_GUID.test(requestId))
   throw new BadRequestException("Idempotency-Key must be a UUID");
  const parsed=parsePosDraftInput(body);
  const r=await this.execute(s,"core.CreateBranchPosDraft",req=>req
    .input("ClientRequestId",sql.UniqueIdentifier,requestId)
    .input("PayloadHash",sql.Char(64),parsed.hash)
    .input("LinesJson",sql.NVarChar(sql.MAX),parsed.json));
  const row=r.recordset?.[0];
  if(!row)throw new ServiceUnavailableException("POS draft result missing");
  return {id:String(row.id),created:Boolean(row.created),version:Number(row.version),
   status:"DRAFT" as const,posted:false};
 }
}
