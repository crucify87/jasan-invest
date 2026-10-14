import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/quotes.js';
const req=()=>new Request('https://app.example/api/quotes?symbol=AAPL&exchange=NASDAQ');
const env={TWELVE_DATA_API_KEY:'test-secret',QUOTE_INSTRUMENTS:JSON.stringify([{symbol:'AAPL',exchange:'NASDAQ'}]),ASSETS:{fetch:async()=>new Response('asset')}};
test('quote route refuses unconfigured provider and unapproved symbols; static assets remain available',async()=>{
assert.equal((await worker.fetch(req(),{},{})).status,503);
assert.equal((await worker.fetch(req(),{TWELVE_DATA_API_KEY:'x',QUOTE_INSTRUMENTS:'[]'},{})).status,400);
assert.equal(await (await worker.fetch(new Request('https://app.example/'),env,{})).text(),'asset');
});
test('provider key stays server-side; USD quote is converted to KRW with actual source timestamps',async()=>{
const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;const calls=[];const timestamp=Math.floor(Date.now()/1000)-300;
globalThis.caches={default:{match:async()=>null,put:async()=>{}}};
globalThis.fetch=async url=>{const u=new URL(url);calls.push(u);return Response.json(u.pathname==='/quote'?{symbol:'AAPL',exchange:'NASDAQ',currency:'USD',close:'100',timestamp}:{rate:1300,timestamp});};
try{const res=await worker.fetch(req(),env,{waitUntil(){}}),data=await res.json();assert.equal(res.status,200);assert.equal(data.price,130000);assert.equal(data.currency,'KRW');assert.equal(data.at,new Date(timestamp*1000).toISOString());assert(data.fxAt);assert(!JSON.stringify(data).includes('test-secret'));assert.equal(calls.length,2);}
finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
test('wrong-symbol quotes are rejected instead of changing asset prices',async()=>{
const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
globalThis.caches={default:{match:async()=>null}};globalThis.fetch=async()=>Response.json({symbol:'WRONG',exchange:'NASDAQ',currency:'KRW',close:'100',timestamp:Math.floor(Date.now()/1000)});
try{assert.equal((await worker.fetch(req(),env,{waitUntil(){}})).status,502);}
finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
});
