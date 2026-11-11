import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import {createHash} from "node:crypto";
import * as sql from "mssql";
import {FoundationDatabaseService} from "../data/foundation-database.service";
import type {Actor} from "../identity/identity.service";

export type CustomerView={customerId:string;displayName:string;phoneE164:string|null;isActive:boolean};
export type CreatedCustomer={id:string;created:boolean};
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
 async list(actor:Actor,token:string,businessId:string,branchId:string):Promise<CustomerView[]>{
  const r=await this.execute(this.scope(actor,token,businessId,branchId),"core.ReadCustomers");
  return r.recordset.map(row=>({
   customerId:String(row.customerId),
   displayName:String(row.displayName),
   phoneE164:row.phoneE164==null?null:String(row.phoneE164),
   isActive:Boolean(row.isActive),
  }));
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
  const phone=value.phoneE164??null;
  if(phone!==null&&(typeof phone!=="string"||!/^\+[1-9][0-9]{6,14}$/.test(phone)))
    throw new BadRequestException("Phone must use E.164 format");
  const result=await this.execute(scope,"core.CreateCustomer",request=>request
    .input("ClientRequestId",sql.UniqueIdentifier,requestId)
    .input("DisplayName",sql.NVarChar(160),value.displayName)
    .input("PhoneE164",sql.VarChar(16),phone));
  const row=result.recordset[0];
  if(!row)throw new ServiceUnavailableException("Customer creation unavailable");
  return {id:String(row.id),created:Boolean(row.created)};
 }
}
