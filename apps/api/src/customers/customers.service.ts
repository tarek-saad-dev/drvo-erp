import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";
import {canonicalizeEgyptPhoneE164,phoneSearchDigits} from "./egyptian-phone";
import {isCustomerProfileIncomplete,validateCustomerSource} from "./customer-source";

/** CRM profile (SQL031). Consent is evidence-based; a stored phone is never consent. */
export type CustomerProfileView={
 customerId:string;displayName:string;phoneE164:string|null;profileExists:boolean;
 birthDate:string|null;address:string|null;notes:string|null;
 cameFrom:string|null;cameFromDetails:string|null;referralCode:string|null;
 offersConsentActive:boolean;offersConsentedAtUtc:string|null;
 offersConsentEvidence:string|null;offersConsentRevokedAtUtc:string|null;
 updatedAtUtc:string|null;incomplete:boolean;
};
const PROFILE_KEYS=["birthDate","address","notes","cameFrom","cameFromDetails",
 "referralCode","offersConsentAction"];
const DATE_ONLY=/^\d{4}-\d{2}-\d{2}$/;

export type CustomerView={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};
export type CreatedCustomer={id:string;created:boolean};
export type CustomerSearchResult={
 customers:CustomerView[];
 query:string;
 limit:20;
 mayBeTruncated:boolean;
 searchScope:"BUSINESS";
};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[A-Za-z0-9_-]{43}$/;
@Injectable()
export class CustomersService {
 constructor(private readonly database:FoundationDatabaseService){}
 private scope(actor:Actor,token:string,businessId:string,branchId:string){
  if(process.env.DRVO_K5_AUTH_ENABLED!=="YES" ||
     process.env.DRVO_CUSTOMERS_ENABLED!=="YES")
    throw new ServiceUnavailableException("Customers are not enabled");
  if(actor.mustChangePassword||!GUID.test(actor.tenantId)||!GUID.test(actor.accountId)||
     !GUID.test(businessId)||!GUID.test(branchId)||!TOKEN.test(token)||
     !Number.isSafeInteger(actor.sessionVersion)||actor.sessionVersion<1)
    throw new NotFoundException();
  return {tenant:actor.tenantId,business:businessId,branch:branchId,
    account:actor.accountId,version:actor.sessionVersion,
    tokenHash:createHash("sha256").update(token).digest("hex")};
 }
 private request(scope:ReturnType<CustomersService["scope"]>){
  return this.database.getInternalPool().request()
    .input("TenantId",sql.UniqueIdentifier,scope.tenant)
    .input("BusinessId",sql.UniqueIdentifier,scope.business)
    .input("BranchId",sql.UniqueIdentifier,scope.branch)
    .input("AccountId",sql.UniqueIdentifier,scope.account)
    .input("SessionVersion",sql.Int,scope.version)
    .input("TokenHash",sql.Char(64),scope.tokenHash);
 }
 private async execute(scope:ReturnType<CustomersService["scope"]>,procedure:string,
   extra?:(r:sql.Request)=>sql.Request){
  try{
   const request=this.request(scope);
   return await (extra?extra(request):request).execute(procedure);
  }catch(error){
   const code=typeof error==="object"&&error!==null&&"number" in error
      ? Number(error.number):undefined;
   if(code===51131)throw new NotFoundException();
   if(code===51132)throw new BadRequestException("Invalid Customer");
   if(code===51133)throw new ConflictException("Request ID used with different data");
   throw new ServiceUnavailableException("Customers unavailable");
  }
 }
 private mapRows(rows:Array<Record<string,unknown>>):CustomerView[]{
  return rows.map(row=>({
   customerId:String(row.customerId),
   displayName:String(row.displayName),
   phoneE164:row.phoneE164==null?null:String(row.phoneE164),
   isActive:Boolean(row.isActive),
  }));
 }
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<CustomerView[]>{
  const r=await this.execute(this.scope(actor,token,businessId,branchId),"core.ReadCustomers");
  return this.mapRows(r.recordset);
 }
 async search(actor:Actor,token:string,businessId:string,branchId:string,
   query:unknown):Promise<CustomerSearchResult>{
  if(typeof query!=="string")throw new BadRequestException("Invalid Customer search");
  const trimmed=query.normalize("NFKC").trim().slice(0,80);
  if(trimmed.length<1)throw new BadRequestException("Invalid Customer search");
  const digits=phoneSearchDigits(trimmed);
  const scope=this.scope(actor,token,businessId,branchId);
  const r=await this.execute(scope,"core.SearchCustomers",request=>request
    .input("Query",sql.NVarChar(80),trimmed)
    .input("PhoneDigits",sql.VarChar(16),digits));
  const customers=this.mapRows(r.recordset);
  return {customers,query:trimmed,limit:20,mayBeTruncated:customers.length===20,
   searchScope:"BUSINESS"};
 }
 async create(actor:Actor,token:string,businessId:string,branchId:string,
   requestId:unknown,body:unknown):Promise<CreatedCustomer>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(typeof requestId!=="string"||!GUID.test(requestId))
    throw new BadRequestException("Missing or invalid Idempotency-Key");
  if(!body||typeof body!=="object"||Array.isArray(body))
    throw new BadRequestException("Invalid Customer");
  const value=body as Record<string,unknown>;
  if(Object.keys(value).some(key=>!["displayName","phoneE164"].includes(key))||
     !Object.prototype.hasOwnProperty.call(value,"displayName")||
     typeof value.displayName!=="string"||
     value.displayName!==value.displayName.trim()||
     value.displayName.length<1||value.displayName.length>160)
    throw new BadRequestException("Invalid Customer");
  let phone:string|null=value.phoneE164===undefined?null:value.phoneE164 as string|null;
  if(phone!==null){
   if(typeof phone!=="string")throw new BadRequestException("Phone must use E.164 format");
   if(/^\+[1-9][0-9]{6,14}$/.test(phone)){
    /* already E.164 */
   }else{
    const canon=canonicalizeEgyptPhoneE164(phone);
    if(!canon)throw new BadRequestException("Phone must use E.164 format");
    phone=canon;
   }
  }
  const result=await this.execute(scope,"core.CreateCustomer",request=>request
    .input("ClientRequestId",sql.UniqueIdentifier,requestId)
    .input("DisplayName",sql.NVarChar(160),value.displayName)
    .input("PhoneE164",sql.VarChar(16),phone));
  const row=result.recordset[0];
  if(!row)throw new ServiceUnavailableException("Customer creation unavailable");
  if(Boolean(row.phoneConflict)&&row.existingCustomerId){
   throw new ConflictException({
    code:"CUSTOMER_PHONE_EXISTS",
    message:"Customer phone already exists in this Business",
    existingCustomerId:String(row.existingCustomerId),
   });
  }
  return {id:String(row.id),created:Boolean(row.created)};
 }
 private iso(value:unknown):string|null{
  if(value==null)return null;
  return value instanceof Date?value.toISOString():String(value);
 }
 private profileView(row:Record<string,unknown>):CustomerProfileView{
  const text=(v:unknown)=>v==null?null:String(v);
  const view={
   customerId:String(row.customerId),displayName:String(row.displayName),
   phoneE164:text(row.phoneE164),profileExists:Boolean(row.profileExists),
   birthDate:text(row.birthDate),address:text(row.address),notes:text(row.notes),
   cameFrom:text(row.cameFrom),cameFromDetails:text(row.cameFromDetails),
   referralCode:text(row.referralCode),
   offersConsentActive:Boolean(row.offersConsentActive),
   offersConsentedAtUtc:this.iso(row.offersConsentedAtUtc),
   offersConsentEvidence:text(row.offersConsentEvidence),
   offersConsentRevokedAtUtc:this.iso(row.offersConsentRevokedAtUtc),
   updatedAtUtc:this.iso(row.updatedAtUtc),
  };
  return {...view,incomplete:isCustomerProfileIncomplete(view)};
 }
 async getProfile(actor:Actor,token:string,businessId:string,branchId:string,
   customerId:string):Promise<CustomerProfileView>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(typeof customerId!=="string"||!GUID.test(customerId))throw new NotFoundException();
  const r=await this.execute(scope,"core.ReadCustomerProfile",request=>request
    .input("CustomerId",sql.UniqueIdentifier,customerId));
  const row=r.recordset[0];
  if(!row)throw new NotFoundException();
  return this.profileView(row);
 }
 /**
  * Full-replace CRM profile write (idempotent PUT). Source rules are Cashier
  * `validateCustomerSource`; WhatsApp-offers consent changes ONLY through an explicit
  * `offersConsentAction` GRANT/REVOKE (never inferred from a phone number).
  */
 async upsertProfile(actor:Actor,token:string,businessId:string,branchId:string,
   customerId:string,body:unknown):Promise<CustomerProfileView>{
  const scope=this.scope(actor,token,businessId,branchId);
  if(typeof customerId!=="string"||!GUID.test(customerId))throw new NotFoundException();
  if(!body||typeof body!=="object"||Array.isArray(body))
   throw new BadRequestException("Invalid Customer profile");
  const value=body as Record<string,unknown>;
  if(Object.keys(value).some(key=>!PROFILE_KEYS.includes(key)))
   throw new BadRequestException("Invalid Customer profile");
  const optional=(key:string,max:number):string|null=>{
   const raw=value[key];
   if(raw===undefined||raw===null)return null;
   if(typeof raw!=="string")throw new BadRequestException("Invalid Customer profile");
   const text=raw.normalize("NFKC").trim();
   if(text.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))
    throw new BadRequestException("Invalid Customer profile");
   return text.length?text:null;
  };
  const birthDate=optional("birthDate",10);
  if(birthDate!==null){
   const date=new Date(birthDate+"T00:00:00Z");
   if(!DATE_ONLY.test(birthDate)||Number.isNaN(date.getTime())||
      date.toISOString().slice(0,10)!==birthDate||birthDate<"1900-01-01"||
      date.getTime()>Date.now())
    throw new BadRequestException("Invalid Customer profile");
  }
  const address=optional("address",200);
  const notes=optional("notes",500);
  const rawSource=optional("cameFrom",50);
  const rawDetails=optional("cameFromDetails",150);
  const rawReferral=optional("referralCode",50);
  let cameFrom:string|null=null,cameFromDetails:string|null=null,referralCode:string|null=null;
  if(rawSource!==null){
   const checked=validateCustomerSource(rawSource,rawDetails,rawReferral);
   if(Object.keys(checked.errors).length>0)
    throw new BadRequestException("Invalid Customer source");
   ({cameFrom,cameFromDetails,referralCode}=checked);
  }else if(rawDetails!==null||rawReferral!==null){
   // Details without a source are ambiguous provenance: refuse instead of dropping.
   throw new BadRequestException("Invalid Customer source");
  }
  const action=value.offersConsentAction;
  if(action!==undefined&&action!==null&&action!=="GRANT"&&action!=="REVOKE")
   throw new BadRequestException("Invalid Customer profile");
  const result=await this.execute(scope,"core.UpsertCustomerProfile",request=>request
    .input("CustomerId",sql.UniqueIdentifier,customerId)
    .input("BirthDate",sql.VarChar(10),birthDate)
    .input("Address",sql.NVarChar(200),address)
    .input("Notes",sql.NVarChar(500),notes)
    .input("CameFrom",sql.VarChar(50),cameFrom)
    .input("CameFromDetails",sql.NVarChar(150),cameFromDetails)
    .input("ReferralCode",sql.NVarChar(50),referralCode)
    .input("ConsentAction",sql.VarChar(10),action??null));
  const row=result.recordset[0];
  if(!row)throw new ServiceUnavailableException("Customer profile unavailable");
  return this.profileView(row);
 }
}
