'use strict';
/**
 * Portable private Salon Owner/Staff browser REVIEW matrix ONLY.
 * This source never runs a browser, fetch, HTTP, SSH or SQL connection.
 * Outcomes are CONDITIONAL expectations for independent operator review,
 * not attested test results or permission to activate business modules.
 */
const MATRIX=Object.freeze([
 ['AUTH_01','anonymous','private sign-in/workspace under default OFF flags','HTTP_404_DEFAULT_OFF','K5 web flags OFF'],
 ['AUTH_02','unauthenticated','direct private Booking API read','DENY_UNAUTHENTICATED','K5 Auth disabled / no valid cookie'],
 ['OWNER_01','explicit-granted Owner','same-Branch /salon and /booking GET','HTTP_200_IF_GRANTED','K5F + SQL + ADR-032 + explicit scoped read rights'],
 ['OWNER_02','explicit-granted Owner','same-Branch Create Booking with valid Origin','SUCCESS_IF_GRANTED_AND_FREE','booking.manage permission plus available Resource'],
 ['STAFF_01','Staff with booking.read only','same-Branch Booking GET','HTTP_200_IF_GRANTED','active session and booking.read only'],
 ['STAFF_02','Staff with booking.read only','same-Branch Booking POST','DENY_MISSING_MANAGE','no booking.manage grant'],
 ['STAFF_03','Staff without pos.draft.read','same-Branch POS Draft GET','DENY_INDEPENDENT_POS','Booking read does not imply POS access'],
 ['SCOPE_01','Owner Branch A','another Branch B resource/Booking ID','DENY_FOREIGN_BRANCH','no Branch B membership/grant'],
 ['SCOPE_02','Owner Tenant A','Tenant B direct guessed Booking ID','DENY_FOREIGN_TENANT','no Tenant B membership/grant'],
 ['ORIGIN_01','explicit-granted Owner','same-Branch POST forged Origin','DENY_BAD_ORIGIN','K5 exact Origin guard'],
 ['CONFLICT_01','explicit-granted Owner','overlapping same-Resource Booking POST','HTTP_409_CONFLICT','resource lock and committed booking'],
 ['WINDOW_01','explicit-granted Owner','close Resource window with future BOOKED','HTTP_409_CONFLICT','SQL017 protected appointment'],
 ['WINDOW_02','explicit-granted Owner','create when last window CLOSED and no OPEN covers slot','DENY_CLOSED_WINDOW','closed window remains opt-in'],
 ['POS_01','explicit-granted POS user','save new scoped DRAFT only','DRAFT_NOT_POSTED','pos.draft.manage + current Catalog grant'],
]);
const paths=Object.freeze({
 salon:'/workspace/:businessId/:branchId/salon',
 booking:'/api/workspaces/:businessId/branches/:branchId/booking',
 bookingWindows:'/api/workspaces/:businessId/branches/:branchId/booking/windows',
 posDrafts:'/api/workspaces/:businessId/branches/:branchId/pos-drafts',
});
function browserReviewMatrix(){
 return {
  mode:'REVIEW_ONLY_SYNTHETIC_CASE_DEFINITIONS_NOT_EXECUTED',
  authenticatedBrowserTestsExecuted:false,
  independentOperatorApprovalRequired:true,
  canConnectToLiveVps:false,
  canApplySql:false,
  canEnableK5:false,
  canInviteUsers:false,
  canEnableModules:false,
  canPostSale:false,
  requiredBeforeExecution:[
   'trusted root-owned K5F signed operator audit',
   'independently restored encrypted offhost backup',
   'proxy+Origin security signoff and explicit SQL 010-017 approval',
   'separately approved ADR-032 private entitlements and synthetic Owner/Staff accounts',
  ],
  paths,
  cases:MATRIX.map(([id,actor,action,expected,precondition])=>({id,actor,action,expected,precondition})),
 };
}
if(require.main===module){
 if(process.argv.length!==3||process.argv[2]!=='--matrix'){
  process.stderr.write('Review-only usage: node tools/salon-pilot/browser-matrix.cjs --matrix\n');
  process.exitCode=1;
 }else process.stdout.write(JSON.stringify(browserReviewMatrix(),null,2)+'\n');
}
module.exports={browserReviewMatrix};
