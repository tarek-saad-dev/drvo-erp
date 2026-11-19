import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import * as sql from "mssql";
import { FoundationDatabaseService } from "../data/foundation-database.service";
import type { Actor } from "../identity/identity.service";

export type CatalogCategory = { categoryId: string; displayName: string; isActive: boolean };
export type CatalogOffering = {
  offeringId: string; categoryId: string | null; kind: "PRODUCT" | "SERVICE";
  displayName: string; priceMinor: number; currency: string;
  durationMinutes: number | null; isActive: boolean;
};
export type CatalogPackageItem = {
  offeringId: string; sortOrder: number; isRequired: boolean;
};
export type CatalogPackage = {
  packageId: string; kind: "REGULAR" | "GROOM"; displayName: string;
  description: string | null; priceMinor: number; currency: string;
  durationMinutes: number | null; isPopular: boolean; isActive: boolean;
  items: CatalogPackageItem[];
};
export type CatalogData = { categories: CatalogCategory[]; offerings: CatalogOffering[] };
export type CatalogPackagesData = { packages: CatalogPackage[] };
export type CatalogCreateResult = { id: string; created: boolean };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
function exactObject(value: unknown, keys: string[], required: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException("Invalid request");
  }
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).some(k => !keys.includes(k)) ||
      required.some(k => !Object.prototype.hasOwnProperty.call(obj,k))) {
    throw new BadRequestException("Invalid request fields");
  }
  return obj;
}
function name(value: unknown, max: number): string {
  if (typeof value !== "string" || value !== value.trim() ||
      value.length < 1 || value.length > max || !value.trim()) {
    throw new BadRequestException("Invalid display name");
  }
  return value;
}
function guid(value: unknown, required: boolean): string | null {
  if (value === null && !required) return null;
  if (typeof value !== "string" || !GUID.test(value)) {
    throw new BadRequestException("Invalid identifier");
  }
  return value;
}
function resultRow(row: Record<string, unknown> | undefined): CatalogCreateResult {
  if (!row) throw new ServiceUnavailableException("Catalog write unavailable");
  return { id:String(row.id), created:Boolean(row.created) };
}
@Injectable()
export class CatalogService {
  constructor(private readonly database: FoundationDatabaseService) {}

  private scope(actor: Actor, token: string, businessId: string, branchId: string) {
    if (process.env.DRVO_K5_AUTH_ENABLED !== "YES" ||
        process.env.DRVO_CATALOG_ENABLED !== "YES") {
      throw new ServiceUnavailableException("Catalog is not enabled");
    }
    if (actor.mustChangePassword || !GUID.test(actor.tenantId) ||
        !GUID.test(actor.accountId) || !GUID.test(businessId) ||
        !GUID.test(branchId) || !TOKEN.test(token) ||
        !Number.isSafeInteger(actor.sessionVersion) || actor.sessionVersion < 1) {
      throw new NotFoundException();
    }
    return {
      TenantId:actor.tenantId, BusinessId:businessId, BranchId:branchId,
      AccountId:actor.accountId, SessionVersion:actor.sessionVersion,
      TokenHash:createHash("sha256").update(token).digest("hex"),
    };
  }
  private request(scope: ReturnType<CatalogService["scope"]>): sql.Request {
    return this.database.getInternalPool().request()
      .input("TenantId",sql.UniqueIdentifier,scope.TenantId)
      .input("BusinessId",sql.UniqueIdentifier,scope.BusinessId)
      .input("BranchId",sql.UniqueIdentifier,scope.BranchId)
      .input("AccountId",sql.UniqueIdentifier,scope.AccountId)
      .input("SessionVersion",sql.Int,scope.SessionVersion)
      .input("TokenHash",sql.Char(64),scope.TokenHash);
  }
  private async execute(scope: ReturnType<CatalogService["scope"]>,
    procedure: string, bind?: (request: sql.Request) => sql.Request
  ): Promise<sql.IProcedureResult<Record<string, unknown>>> {
    try {
      return await (bind ? bind(this.request(scope)) : this.request(scope)).execute(procedure);
    } catch(error) {
      const code=typeof error === "object" && error !== null && "number" in error
        ? Number(error.number) : undefined;
      if (code===51101) throw new NotFoundException();
      if (code===51111) throw new BadRequestException("Invalid Catalog data");
      if (code===51112) throw new ConflictException("Request ID already used with different data");
      throw new ServiceUnavailableException("Catalog unavailable");
    }
  }

  async list(actor: Actor, token: string, businessId: string, branchId: string): Promise<CatalogData> {
    const scope=this.scope(actor,token,businessId,branchId);
    const result=await this.execute(scope,"core.ReadCatalog");
    const categories=(result.recordsets?.[0] ?? []).map(row=>({
      categoryId:String(row.categoryId),displayName:String(row.displayName),
      isActive:Boolean(row.isActive),
    }));
    const offerings=(result.recordsets?.[1] ?? []).map(row=>({
      offeringId:String(row.offeringId),
      categoryId:row.categoryId==null?null:String(row.categoryId),
      kind:row.kind as "PRODUCT"|"SERVICE",
      displayName:String(row.displayName),
      priceMinor:Number(row.priceMinor), currency:String(row.currency).trim(),
      durationMinutes:row.durationMinutes==null?null:Number(row.durationMinutes),
      isActive:Boolean(row.isActive),
    }));
    return {categories,offerings};
  }
  async addCategory(actor:Actor,token:string,businessId:string,branchId:string,
    requestId:unknown, body:unknown):Promise<CatalogCreateResult> {
    const scope=this.scope(actor,token,businessId,branchId);
    const reqId=guid(requestId,true)!;
    const obj=exactObject(body,["displayName"],["displayName"]);
    const displayName=name(obj.displayName,100);
    const result=await this.execute(scope,"core.CreateCatalogCategory",r=>r
      .input("ClientRequestId",sql.UniqueIdentifier,reqId)
      .input("DisplayName",sql.NVarChar(100),displayName));
    return resultRow(result.recordset?.[0]);
  }
  async addOffering(actor:Actor,token:string,businessId:string,branchId:string,
    requestId:unknown,body:unknown):Promise<CatalogCreateResult> {
    const scope=this.scope(actor,token,businessId,branchId);
    const reqId=guid(requestId,true)!;
    const obj=exactObject(body,
      ["kind","displayName","priceMinor","currency","categoryId","durationMinutes"],
      ["kind","displayName","priceMinor","currency"]);
    if (obj.kind!=="SERVICE" && obj.kind!=="PRODUCT") {
      throw new BadRequestException("Invalid offering kind");
    }
    const kind=obj.kind;
    const displayName=name(obj.displayName,160);
    const priceMinor=obj.priceMinor;
    if (typeof priceMinor!=="number" || !Number.isSafeInteger(priceMinor) ||
        priceMinor<0 || priceMinor>9000000000000) {
      throw new BadRequestException("Invalid price");
    }
    if (typeof obj.currency!=="string" || !/^[A-Z]{3}$/.test(obj.currency)) {
      throw new BadRequestException("Invalid currency");
    }
    const currency=obj.currency;
    const categoryId=guid(obj.categoryId ?? null,false);
    const duration=obj.durationMinutes ?? null;
    if ((kind==="SERVICE" &&
        (typeof duration!=="number" || !Number.isInteger(duration) ||
          duration<1 || duration>1440)) ||
        (kind==="PRODUCT" && duration!==null)) {
      throw new BadRequestException("Invalid service duration");
    }
    const result=await this.execute(scope,"core.CreateCatalogOffering",r=>r
      .input("ClientRequestId",sql.UniqueIdentifier,reqId)
      .input("CategoryId",sql.UniqueIdentifier,categoryId)
      .input("Kind",sql.VarChar(7),kind)
      .input("DisplayName",sql.NVarChar(160),displayName)
      .input("PriceMinor",sql.BigInt,priceMinor)
      .input("Currency",sql.Char(3),currency)
      .input("DurationMinutes",sql.Int,duration));
    return resultRow(result.recordset?.[0]);
  }

  async listPackages(actor: Actor, token: string, businessId: string, branchId: string
  ): Promise<CatalogPackagesData> {
    const scope=this.scope(actor,token,businessId,branchId);
    const result=await this.execute(scope,"core.ReadCatalogPackages");
    const headers=(result.recordsets?.[0] ?? []).map(row=>({
      packageId:String(row.packageId),
      kind:row.kind as "REGULAR"|"GROOM",
      displayName:String(row.displayName),
      description:row.description==null?null:String(row.description),
      priceMinor:Number(row.priceMinor),
      currency:String(row.currency).trim(),
      durationMinutes:row.durationMinutes==null?null:Number(row.durationMinutes),
      isPopular:Boolean(row.isPopular),
      isActive:Boolean(row.isActive),
      items:[] as CatalogPackageItem[],
    }));
    const byId=new Map(headers.map(p=>[p.packageId,p]));
    for(const row of result.recordsets?.[1] ?? []){
      const pkg=byId.get(String(row.packageId));
      if(!pkg)continue;
      pkg.items.push({
        offeringId:String(row.offeringId),
        sortOrder:Number(row.sortOrder),
        isRequired:Boolean(row.isRequired),
      });
    }
    for(const pkg of headers){
      pkg.items.sort((a,b)=>a.sortOrder-b.sortOrder||a.offeringId.localeCompare(b.offeringId));
    }
    return {packages:headers};
  }

  async addPackage(actor:Actor,token:string,businessId:string,branchId:string,
    requestId:unknown,body:unknown):Promise<CatalogCreateResult> {
    const scope=this.scope(actor,token,businessId,branchId);
    const reqId=guid(requestId,true)!;
    const obj=exactObject(body,[
      "kind","displayName","priceMinor","currency","items",
      "description","durationMinutes","isPopular",
    ],["kind","displayName","priceMinor","currency","items"]);
    if(obj.kind!=="REGULAR"&&obj.kind!=="GROOM"){
      throw new BadRequestException("Invalid package kind");
    }
    const kind=obj.kind;
    const displayName=name(obj.displayName,160);
    const priceMinor=obj.priceMinor;
    if(typeof priceMinor!=="number"||!Number.isSafeInteger(priceMinor)||
        priceMinor<0||priceMinor>9000000000000){
      throw new BadRequestException("Invalid price");
    }
    if(typeof obj.currency!=="string"||!/^[A-Z]{3}$/.test(obj.currency)){
      throw new BadRequestException("Invalid currency");
    }
    const currency=obj.currency;
    let description:string|null=null;
    if(obj.description!==undefined&&obj.description!==null){
      if(typeof obj.description!=="string"||obj.description!==obj.description.trim()||
          obj.description.length<1||obj.description.length>400){
        throw new BadRequestException("Invalid description");
      }
      description=obj.description;
    }
    const duration=obj.durationMinutes??null;
    if(duration!==null&&(typeof duration!=="number"||!Number.isInteger(duration)||
        duration<1||duration>1440)){
      throw new BadRequestException("Invalid duration");
    }
    const isPopular=obj.isPopular===undefined?false:obj.isPopular===true;
    if(obj.isPopular!==undefined&&typeof obj.isPopular!=="boolean"){
      throw new BadRequestException("Invalid popular flag");
    }
    if(!Array.isArray(obj.items)||obj.items.length<1||obj.items.length>20){
      throw new BadRequestException("Invalid package items");
    }
    const items:Array<{offeringId:string;sortOrder:number;isRequired:boolean}>=[];
    const seen=new Set<string>();
    for(const raw of obj.items){
      const item=exactObject(raw,["offeringId","sortOrder","isRequired"],
        ["offeringId","sortOrder"]);
      const offeringId=guid(item.offeringId,true)!;
      if(seen.has(offeringId.toLowerCase())){
        throw new BadRequestException("Duplicate package offering");
      }
      seen.add(offeringId.toLowerCase());
      const sortOrder=item.sortOrder;
      if(typeof sortOrder!=="number"||!Number.isInteger(sortOrder)||
          sortOrder<0||sortOrder>40){
        throw new BadRequestException("Invalid sort order");
      }
      const isRequired=item.isRequired===undefined?true:item.isRequired===true;
      if(item.isRequired!==undefined&&typeof item.isRequired!=="boolean"){
        throw new BadRequestException("Invalid required flag");
      }
      items.push({offeringId,sortOrder,isRequired});
    }
    const result=await this.execute(scope,"core.CreateCatalogPackage",r=>r
      .input("ClientRequestId",sql.UniqueIdentifier,reqId)
      .input("Kind",sql.VarChar(7),kind)
      .input("DisplayName",sql.NVarChar(160),displayName)
      .input("Description",sql.NVarChar(400),description)
      .input("PriceMinor",sql.BigInt,priceMinor)
      .input("Currency",sql.Char(3),currency)
      .input("DurationMinutes",sql.Int,duration)
      .input("IsPopular",sql.Bit,isPopular)
      .input("ItemsJson",sql.NVarChar(sql.MAX),JSON.stringify(items)));
    return resultRow(result.recordset?.[0]);
  }
}
