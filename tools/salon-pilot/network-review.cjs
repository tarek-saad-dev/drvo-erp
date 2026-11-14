'use strict';
/**
 * P3 network/security REDACTED EVIDENCE REVIEW ONLY.
 * Never probes the target network, reads env/certs, accesses VPS, creates an
 * account or attests real Nginx/SMTP/K5 behavior. External authorized test
 * evidence must be reviewed outside this process.
 */
const {readFileSync}=require('node:fs');
const SHA=/^[a-f0-9]{40}$/;
const REF=/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;
const HASH=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const ORIGIN='https://erp-stage.drvotech.com';
const CONTROLS=Object.freeze([
 'externalHttpsCertificateAndHsts',
 'trustedNginxProxyAndRealIp',
 'strictOriginCsrfAndCookie',
 'sensitiveResponseNoStore',
 'privateK5EndpointsUnavailablePublicly',
 'verifiedSenderOrApprovedInviteAlternative',
 'crossTenantAndCrossBusinessNegativeHttp',
 'revokedSessionAndRoleNegativeHttp',
 'externalNetworkWitness',
]);
function exact(v,keys){
 if(!v||typeof v!=='object'||Array.isArray(v)||
    Object.keys(v).sort().join(',')!==[...keys].sort().join(','))
  throw new TypeError('Unexpected P3 summary shape');
}
function template(reviewedSha='0000000000000000000000000000000000000000'){
 if(!SHA.test(reviewedSha))throw new TypeError('Invalid source SHA');
 return {
  reviewedSha,expectedOrigin:ORIGIN,
  observedOrigin:null,externalWitnessReference:null,
  observedAtUtc:null,proxyPolicyDigest:null,
  controls:Object.fromEntries(CONTROLS.map(c=>[c,'MISSING'])),
 };
}
function reviewNetworkEvidence(e){
 exact(e,['reviewedSha','expectedOrigin','observedOrigin',
  'externalWitnessReference','observedAtUtc','proxyPolicyDigest','controls']);
 if(typeof e.reviewedSha!=='string'||!SHA.test(e.reviewedSha)||
    e.expectedOrigin!==ORIGIN)
  throw new TypeError('Reviewed SHA or expected HTTPS Origin mismatch');
 if(e.observedOrigin!==null&&e.observedOrigin!==ORIGIN)
  throw new TypeError('Observed HTTPS Origin mismatch');
 if(e.externalWitnessReference!==null&&
   (typeof e.externalWitnessReference!=='string'||!REF.test(e.externalWitnessReference)))
  throw new TypeError('Invalid opaque witness reference');
 if(e.proxyPolicyDigest!==null&&
   (typeof e.proxyPolicyDigest!=='string'||!HASH.test(e.proxyPolicyDigest)))
  throw new TypeError('Invalid proxy policy digest');
 if(e.observedAtUtc!==null&&
   (typeof e.observedAtUtc!=='string'||!ISO.test(e.observedAtUtc)||
    !Number.isFinite(Date.parse(e.observedAtUtc))||
    new Date(e.observedAtUtc).toISOString()!==e.observedAtUtc))
  throw new TypeError('Invalid observed UTC time');
 exact(e.controls,CONTROLS);
 for(const key of CONTROLS){
  if(!['MISSING','OPERATOR_REPORTED'].includes(e.controls[key]))
   throw new TypeError('Invalid controlled evidence state');
 }
 const missing=[
  ...(e.observedOrigin===null?['NO_EXTERNAL_ORIGIN_OBSERVED']:[]),
  ...(e.externalWitnessReference===null?['NO_INDEPENDENT_WITNESS_REF']:[]),
  ...(e.observedAtUtc===null?['NO_NETWORK_OBSERVATION_TIME']:[]),
  ...(e.proxyPolicyDigest===null?['NO_PROXY_POLICY_DIGEST']:[]),
  ...CONTROLS.filter(k=>e.controls[k]==='MISSING').map(k=>'MISSING_'+k),
 ];
 return Object.freeze({
  mode:'OFFLINE_REDACTED_NETWORK_REVIEW_ONLY',
  status:missing.length?'BLOCKED_INCOMPLETE_EVIDENCE':'REPORTED_REQUIRES_INDEPENDENT_REVIEW',
  evidenceOrigin:'SELF_REPORTED_NOT_NETWORK_ATTESTED',
  externalRequestsPerformed:false,independentSecurityAttestationPerformed:false,
  missing:Object.freeze(missing),
  canEnablePublicK5:false,canInviteSalon:false,
  canApplySql:false,canApproveP3:false,
 });
}
function runCli(args){
 try{
  if(args.length===1&&args[0]==='--template'){
   process.stdout.write(JSON.stringify(template(),null,2)+'\n');return;
  }
  if(args.length===2&&args[0]==='--input'&&
     typeof args[1]==='string'&&!args[1].startsWith('-')){
   const raw=readFileSync(args[1]);
   if(!raw.length||raw.length>8192)throw new TypeError('Evidence too large');
   process.stdout.write(JSON.stringify(reviewNetworkEvidence(JSON.parse(raw.toString('utf8'))),null,2)+'\n');
   return;
  }
  throw new TypeError('Invalid args');
 }catch{
  process.stderr.write('P3 NETWORK REVIEW: INVALID EVIDENCE; NO ACCESS AUTHORIZED.\n');
  process.exitCode=1;
 }
}
if(require.main===module)runCli(process.argv.slice(2));
module.exports={CONTROLS,ORIGIN,template,reviewNetworkEvidence,runCli};
