import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function boot(){const nodes=new Map(),events=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',style:{},setAttribute(){},close(){this.closed=true;},addEventListener(){}});return nodes.get(id);};const ctx={document:{querySelector:node,getElementById:node,querySelectorAll(sel){if(sel!=='[data-page]')return [];return [...nodes.values()].flatMap(n=>[...n.innerHTML.matchAll(/data-page="([^"]+)"/g)].map(m=>({dataset:{page:m[1]}})));}},window:{addEventListener:(k,f)=>events.set(k,[...(events.get(k)||[]),f]),scrollTo(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console,crypto:{randomUUID:()=> 'new-id'}};vm.createContext(ctx);vm.runInContext(readFileSync('apps/web/scripts/investment.js','utf8'),ctx);vm.runInContext(readFileSync('apps/web/scripts/app.js','utf8'),ctx);vm.runInContext(readFileSync('apps/web/scripts/investment-ui.js','utf8'),ctx);return {ctx,node,emit:(type,detail)=>events.get(type).forEach(f=>f({detail})),eval:s=>vm.runInContext(s,ctx)};}
test('app starts without localStorage, account lock removes all loaded data',()=>{const b=boot();assert.equal(b.eval('db.accounts.length'),0);b.emit('asset-load',null);assert(b.node('#content').innerHTML.includes('data-page="history"'));b.eval("db.accounts.push({id:'a',name:'비밀',bank:'은행',balance:100});");b.emit('asset-lock');assert.equal(b.eval('db.accounts.length'),0);assert.equal(b.node('content').innerHTML,'');});
test('summary destinations and imported identifiers are escaped',()=>{const b=boot();const html=b.eval('metrics()');for(const p of ['history','accounts','debts','holdings'])assert(html.includes('data-page="'+p+'"'));assert(b.eval('actions("holdings",\'x" onclick="alert(1)\')').includes('&quot;'));});
test('failed server save rolls back optimistic changes',async()=>{const b=boot();b.emit('asset-load',null);b.ctx.window.assetCloud={save:async()=>{throw Error('denied');}};b.eval("db.accounts.push({id:'a',name:'새 계좌',bank:'은행',balance:100});save();");await new Promise(resolve=>setImmediate(resolve));assert.equal(b.eval('db.accounts.length'),0);assert.equal(b.node('app-shell').inert,false);});

test('numeric input groups amounts and preserves decimal precision and editing position',()=>{
const b=boot();
assert.equal(b.eval("formatNumberInput('1000000')"),'1,000,000');
assert.equal(b.eval("formatNumberInput('1234567.050')"),'1,234,567.050');
assert.equal(b.eval("formatNumberInput('1000.')"),'1,000.');
assert.equal(b.eval("formatNumberInput('')"),'');
const input={value:'1234567.50',selectionStart:4,selectionEnd:4,setCustomValidity(v){this.error=v},setSelectionRange(a,z){this.start=a;this.end=z}};
b.ctx.input=input;b.eval('groupNumberField(input)');
assert.equal(input.value,'1,234,567.50');assert.equal(input.start,5);assert.equal(input.error,'');
input.value='-100';b.eval('groupNumberField(input)');assert(input.error);assert.equal(input.value,'-100');
});
test('comma formatted amounts save as numbers and invalid amounts are rejected',()=>{
const b=boot();assert.equal(b.eval("validate('flows',{name:'급여',type:'수입',amount:'1,000,000.50',date:'2026-10-07'}).amount"),1000000.5);
assert.throws(()=>b.eval("validate('flows',{name:'급여',type:'수입',amount:'-100',date:'2026-10-07'})"));
assert.throws(()=>b.eval("validate('flows',{name:'급여',type:'수입',amount:'abc',date:'2026-10-07'})"));
});

test('investment screen exposes target, stop, trade actions and quote source without breaking old data',()=>{
const b=boot();b.emit('asset-load',null);b.eval("db.accounts.push({id:'a',name:'증권',bank:'증권',balance:1000000});db.holdings.push({id:'h',name:'종목',category:'ETF',account:'a',qty:10,cost:50000,price:45000});page='holdings';render();");
const html=b.node('#content').innerHTML;assert(html.includes('손절 기준 도달'));assert(html.includes('목표 15%'));assert(html.includes('현재가 입력'));assert(html.includes('매수 기록'));assert(html.includes('기준 시각 미기록'));
});

test('trade entry and holding edit retain opening ledger while changing targets and quotes',async()=>{
const b=boot();b.emit('asset-load',null);b.ctx.window.assetCloud={save:async()=>{}};
b.eval("db.accounts.push({id:'a',name:'증권',bank:'증권',balance:1000000});db.holdings.push({id:'h',name:'종목',category:'ETF',account:'a',qty:10,cost:50000,price:50000});editing={key:'linkedTrade',id:null};saveTrade({holdingId:'h',type:'매수',qty:'5',unitPrice:'60,000',fee:'1,000',tax:'0',date:'2026-10-01'});");
await new Promise(resolve=>setImmediate(resolve));assert.equal(b.eval('db.holdings[0].qty'),15);assert.equal(b.eval('db.accounts[0].balance'),699000);
b.ctx.FormData=class{constructor(v){this.v=v;}*[Symbol.iterator](){yield*Object.entries(this.v);}};
b.eval("editing={key:'holdings',id:'h'}");
b.node('#form').onsubmit({preventDefault(){},target:{name:'종목',category:'ETF',price:'60,000',targetPct:'20',buyPrice:'45,000',quoteSymbol:'AAPL',quoteExchange:'NASDAQ'}});
await new Promise(resolve=>setImmediate(resolve));assert.equal(b.eval('db.holdings[0].qty'),15);assert.equal(b.eval('db.holdings[0].openingQty'),10);assert.equal(b.eval('db.holdings[0].targetPct'),20);assert.equal(b.eval('db.holdings[0].buyPrice'),45000);assert.equal(b.eval('db.holdings[0].quoteSymbol'),'AAPL');assert.equal(b.eval('db.accounts[0].balance'),699000);
});
