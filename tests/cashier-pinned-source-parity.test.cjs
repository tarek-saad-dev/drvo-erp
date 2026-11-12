const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { createHash } = require("node:crypto");
const vm = require("node:vm");
const ts = require("typescript");

function legacyPureModule(filename, expectedGitBlob) {
  // Static files committed with this PR, NOT remote fetched/executed at test runtime.
  const source = readFileSync(resolve(__dirname, "fixtures/cashier", filename), "utf8");
  const actual = createHash("sha1").update("blob "+Buffer.byteLength(source)+"\0").update(source).digest("hex");
  assert.equal(actual, expectedGitBlob, "Pinned Cashier source changed: "+filename);
  const code = ts.transpileModule(source, {compilerOptions:{
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const exports = {};
  // Original pure modules have zero runtime imports; execute in an isolated test context.
  vm.runInNewContext(code, { exports }, {filename, timeout:1000});
  return exports;
}
const businessDay = legacyPureModule("businessDayReconciliation.ts", "e86e49fa7dea5f871c305d250622dea6f4d0fd0f");
const payroll = legacyPureModule("payrollAgreementMath.ts", "9cc11108ffcfc1dcbe80a3574c37c8d15279f9ec");

function candidateDayPlan({openDayDate, expectedDate, pastRolloverWindow}) {
  const date = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s+"T00:00:00Z")) &&
    new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
  if (!date(expectedDate) || (openDayDate!==null && !date(openDayDate)) ||
      typeof pastRolloverWindow!=="boolean") throw new TypeError("Invalid DRVO date fixture");
  if (openDayDate===expectedDate || (openDayDate!==null && openDayDate>expectedDate))return "NO_OP";
  if(openDayDate!==null && openDayDate<expectedDate)
    return pastRolloverWindow?"ROLLED_OVER":"NO_OP";
  return "OPENED_MISSING_DAY";
}

test("CU-1: real pinned Cashier BusinessDay source matches proposed DRVO day decisions on supported inputs",()=>{
  const cases=[
    {openDayDate:"2026-11-12",expectedDate:"2026-11-12",pastRolloverWindow:true},
    {openDayDate:"2026-11-11",expectedDate:"2026-11-12",pastRolloverWindow:false},
    {openDayDate:"2026-11-11",expectedDate:"2026-11-12",pastRolloverWindow:true},
    {openDayDate:"2026-11-13",expectedDate:"2026-11-12",pastRolloverWindow:true},
    {openDayDate:null,expectedDate:"2026-11-12",pastRolloverWindow:false},
    {openDayDate:null,expectedDate:"2026-11-12",pastRolloverWindow:true},
    {openDayDate:"2026-10-01",expectedDate:"2026-11-12",pastRolloverWindow:true},
  ];
  for(const c of cases) assert.equal(candidateDayPlan(c),businessDay.planBusinessDayReconciliation(c));
});

test("CU-1: DRVO deliberately hardens malformed dates that original Cashier pure function does not validate",()=>{
  const invalid={openDayDate:null,expectedDate:"2026-02-30",pastRolloverWindow:true};
  assert.equal(businessDay.planBusinessDayReconciliation(invalid),"OPENED_MISSING_DAY");
  assert.throws(()=>candidateDayPlan(invalid),TypeError);
});

test("CU-1: pinned Cashier payroll source golden arithmetic in ordinary exact cases",()=>{
  const cases=[
    ["2026-11-16",30000,15,30,15000],
    ["2028-02-15",2900,15,29,1500],
    ["2027-02-15",2800,14,28,1400],
  ];
  for(const [date,salary,days,monthDays,amount] of cases){
    const result=payroll.prorateSalary(date,salary);
    assert.equal(result.days,days);assert.equal(result.monthDays,monthDays);
    assert.equal(result.amount,amount);
  }
});

test("CU-1: legacy payroll branch impact sample and input validation",()=>{
  const impact=payroll.calculateRetroBranchImpacts("2026-11-16",
    [{branchId:1,enabled:true,monthlySalary:3000}],
    [{branchId:1,amount:200,ledgerAmount:300}]);
  assert.equal(impact.length,1);
  assert.equal(impact[0].newEntitlement,1500);
  assert.equal(impact[0].difference,1200);
  assert.throws(()=>payroll.validateRetroInput({
    effectiveFrom:"2026-02-30",
    branches:[{branchId:1,enabled:true,monthlySalary:1000}],
    reason:"Documented change",
  }));
});
