'use strict';
/**
 * CI-ONLY HTTPS loopback reverse proxy for a real Next + Nest + SQL browser
 * exercise. Never binds a public interface, discovers hosts or forwards
 * outside the two fixed localhost listeners. Do NOT deploy as a reverse proxy.
 */
const https=require('node:https');
const http=require('node:http');
const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.BOOKING_SQL_DISPOSABLE!=='YES'||
  process.env.BOOKING_BROWSER_DISPOSABLE!=='YES'||
  process.env.BOOKING_TEST_PORT!=='14342')
 throw new Error('Disposable CI-only HTTPS gateway refused');
const tlsKey=process.env.DRVO_BROWSER_TEST_KEY_FILE;
const tlsCert=process.env.DRVO_BROWSER_TEST_CERT_FILE;
if(!tlsKey||!tlsCert||!process.env.RUNNER_TEMP||
 !tlsKey.startsWith(process.env.RUNNER_TEMP+'/')||
 !tlsCert.startsWith(process.env.RUNNER_TEMP+'/'))
 throw new Error('Only runner-private generated test TLS materials allowed');
const server=https.createServer({
 key:fs.readFileSync(tlsKey),cert:fs.readFileSync(tlsCert),
},(request,response)=>{
 if(typeof request.url!=='string'||!request.url.startsWith('/')||
  request.url.startsWith('//')||request.url.includes('\\')){
  response.writeHead(400);response.end();return;
 }
 // Exact and fixed local-only upstreams. Never forward an absolute client URL.
 const port=request.url.startsWith('/api/')?3403:3100;
 const upstream=http.request({
  hostname:'127.0.0.1',port,path:request.url,
  method:request.method,headers:{...request.headers,host:'drvo-ci.test'},
  timeout:20000,
 },r=>{
  response.writeHead(r.statusCode||502,r.headers);r.pipe(response);
 });
 upstream.on('timeout',()=>upstream.destroy());
 upstream.on('error',()=>{
  if(!response.headersSent)response.writeHead(502);
  response.end();
 });
 request.pipe(upstream);
});
server.on('error',()=>{process.stderr.write('CI HTTPS gateway failed\n');process.exitCode=1;});
server.listen(443,'127.0.0.1',()=>process.stdout.write('CI_LOOPBACK_GATEWAY_READY\n'));
