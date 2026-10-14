import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function engine(){const c={window:{}};vm.createContext(c);vm.runInContext(readFileSync('apps/web/scripts/investment.js','utf8'),c);return c.window.InvestmentEngine;}
const base=()=>({accounts:[{id:'a',balance:1000000}],holdings:[{id:'h',name:'종목',account:'a',qty:10,cost:50000,price:50000,targetPct:15}],transactions:[]});
const trade=(id,type,qty,unitPrice,more={})=>({id,holdingId:'h',type,qty,unitPrice,fee:0,tax:0,date:'2026-10-01',...more});
test('buys update weighted cost including fees; sells realize net profit and cash',()=>{
const e=engine(),input=base();
let d=e.record(input,trade('b','매수',5,60000,{fee:1000}));
assert.equal(input.holdings[0].qty,10);assert.equal(d.holdings[0].qty,15);assert.equal(d.accounts[0].balance,699000);
assert(Math.abs(d.holdings[0].cost-801000/15)<1e-8);
d=e.record(d,trade('s','매도',3,70000,{fee:500,tax:100}));
assert.equal(d.holdings[0].qty,12);assert.equal(d.accounts[0].balance,908400);assert(Math.abs(d.holdings[0].realizedProfit-49200)<1e-8);
const again=e.replay(d);assert.equal(again.accounts[0].balance,d.accounts[0].balance);assert.equal(again.holdings[0].qty,12);
});
test('edit and deletion replay ledger; overselling and insufficient cash are rejected atomically',()=>{
const e=engine();let d=e.record(base(),trade('b','매수',5,60000));
d=e.record(d,trade('s','매도',14,70000));
assert.throws(()=>e.remove(d,'b'));assert.equal(d.holdings[0].qty,1);
const changed=e.record(d,trade('s','매도',2,70000));assert.equal(changed.holdings[0].qty,13);
const removed=e.remove(changed,'s');assert.equal(removed.holdings[0].qty,15);
assert.throws(()=>e.record(base(),trade('x','매도',11,50000)));
assert.throws(()=>e.record(base(),trade('x','매수',100,50000)));
});
test('old unlinked history stays record-only, linked deletion restores opening balance',()=>{
const e=engine(),b=base();b.transactions.push({id:'old',type:'매수',amount:999999,date:'2026-09-01'});
let d=e.record(b,trade('new','매수',1,50000));assert.equal(d.holdings[0].qty,11);
d=e.remove(d,'new');assert.equal(d.holdings[0].qty,10);assert.equal(d.accounts[0].balance,1000000);assert.equal(d.transactions.length,1);
});
test('zero position, liquidation, same-day ordering and backdated invalid trades',()=>{
const e=engine(),b=base();b.holdings[0].qty=0;b.holdings[0].cost=0;
let d=e.record(b,trade('b','매수',2,50000));d=e.record(d,trade('s','매도',2,60000));assert.equal(d.holdings[0].qty,0);assert.equal(d.holdings[0].cost,0);assert.equal(d.holdings[0].realizedProfit,20000);
assert.throws(()=>e.record(d,trade('bad','매수',1,50000,{date:'2026-09-30'})));
assert.throws(()=>e.record(d,trade('bad','매수',1,50000,{date:'2099-01-01'})));
});
test('target edits and minus ten percent stop are evaluated against weighted average cost',()=>{
const e=engine(),h=base().holdings[0];
h.price=45000;assert.equal(e.decision(h).status,'손절 기준 도달');
h.price=57500;assert.equal(e.decision(h).status,'목표 수익률 도달');
h.targetPct=20;assert.equal(e.decision(h).status,'보유 중');assert.equal(e.decision(h).targetPrice,60000);
h.price=90000;h.qty=0;assert.equal(e.decision(h).status,'관심 종목');
});
test('quote updates preserve ledger and reject stale, zero and invalid prices',()=>{
const e=engine(),b=base(),at=new Date().toISOString();
const d=e.quote(b,'h',57500,at,'직접 입력');assert.equal(e.decision(d.holdings[0]).status,'목표 수익률 도달');assert.equal(d.accounts[0].balance,1000000);assert.equal(d.holdings[0].qty,10);
assert.throws(()=>e.quote(d,'h',50000,'2000-01-01T00:00:00.000Z','old'));
assert.throws(()=>e.quote(d,'h',0,at,'bad'));assert.throws(()=>e.quote(d,'h',Infinity,at,'bad'));
});

test('buy review signal only follows a user supplied buy price',()=>{
const e=engine(),h=base().holdings[0];assert.equal(e.decision(h).buySignal,false);
h.buyPrice=48000;h.price=48000;assert.equal(e.decision(h).buySignal,true);
h.price=49000;assert.equal(e.decision(h).buySignal,false);
});
