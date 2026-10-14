'use strict';
window.InvestmentEngine=(()=>{
const clone=x=>JSON.parse(JSON.stringify(x)),EPS=1e-8;
function nonnegative(n,label){if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw Error(label+'을 확인해주세요.');return n;}
function linked(t){return t.linked===true;}
function replay(input){
const data=clone(input),events=data.transactions.filter(linked).sort((a,b)=>a.date.localeCompare(b.date)||(a.sequence||0)-(b.sequence||0)||a.id.localeCompare(b.id));
const holdings=new Map(data.holdings.map(h=>[h.id,h])),accounts=new Map(data.accounts.map(a=>[a.id,a]));
for(const h of data.holdings){
if(h.buyPrice!==undefined)nonnegative(h.buyPrice,'매수 검토가');
if(h.targetPct!==undefined&&(typeof h.targetPct!=='number'||!Number.isFinite(h.targetPct)||h.targetPct<0||h.targetPct>10000))throw Error('목표 수익률을 확인해주세요.');
if(h.priceHistory!==undefined&&(!Array.isArray(h.priceHistory)||h.priceHistory.length>120||h.priceHistory.some(q=>!q||!Number.isFinite(Date.parse(q.at))||typeof q.price!=='number'||!Number.isFinite(q.price)||q.price<=0)))throw Error('저장된 시세 이력을 확인해주세요.');
if(h.openingQty!==undefined&&(!/^\d{4}-\d{2}-\d{2}$/.test(h.openingDate)||isNaN(Date.parse(h.openingDate))))throw Error('기초 자산 기준일을 확인해주세요.');
if(h.openingQty!==undefined){h.qty=nonnegative(h.openingQty,'기초 수량');h.cost=nonnegative(h.openingCost,'기초 단가');h.realizedProfit=0;}}
for(const a of data.accounts)if(a.tradeOpeningBalance!==undefined)a.balance=nonnegative(a.tradeOpeningBalance,'기초 현금');
for(const t of events){
const h=holdings.get(t.holdingId),a=accounts.get(t.account);
if(!h||!a||h.account!==a.id||h.openingQty===undefined||a.tradeOpeningBalance===undefined)throw Error('거래에 연결된 자산·계좌의 기초 정보가 없습니다.');
if(!['매수','매도'].includes(t.type)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||isNaN(Date.parse(t.date))||t.date>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'}))throw Error('거래일과 유형을 확인해주세요. 미래 거래는 등록할 수 없습니다.');
if(t.date<h.openingDate||t.date<a.tradeOpeningDate)throw Error('기초 잔액 기준일보다 이전의 거래는 입력할 수 없습니다.');
const qty=nonnegative(t.qty,'거래 수량'),price=nonnegative(t.unitPrice,'거래 단가'),fee=nonnegative(t.fee,'수수료'),tax=nonnegative(t.tax,'세금');
if(qty<=0||price<=0)throw Error('거래 수량과 단가는 0보다 커야 합니다.');
const gross=qty*price;nonnegative(gross,'거래 금액');t.amount=gross;t.realizedProfit=0;
if(t.type==='매수'){
const total=gross+fee+tax;if(a.balance+EPS<total)throw Error(h.name+': 계좌 현금이 부족합니다. 기초 현금 잔액을 확인해주세요.');
h.cost=(h.qty*h.cost+total)/(h.qty+qty);h.qty+=qty;a.balance-=total;
}else{
if(h.qty+EPS<qty)throw Error(h.name+': 매도 수량이 당시 보유 수량을 초과합니다.');
if(gross<fee+tax)throw Error('매도 대금보다 수수료·세금이 큽니다.');
t.realizedProfit=gross-fee-tax-qty*h.cost;h.realizedProfit+=t.realizedProfit;
h.qty-=qty;if(Math.abs(h.qty)<EPS){h.qty=0;h.cost=0;}a.balance+=gross-fee-tax;
}
if(Math.abs(a.balance)<EPS)a.balance=0;
}
return data;
}
function record(input,trade){
const data=clone(input),h=data.holdings.find(h=>h.id===trade.holdingId);if(!h)throw Error('종목을 먼저 등록해주세요.');
const a=data.accounts.find(a=>a.id===h.account);if(!a)throw Error('연결 계좌가 없습니다.');
if(h.openingQty===undefined){h.openingQty=h.qty;h.openingCost=h.cost;h.openingDate=trade.date;}
if(a.tradeOpeningBalance===undefined){a.tradeOpeningBalance=a.balance;a.tradeOpeningDate=trade.date;}
const previous=data.transactions.find(t=>t.id===trade.id);
if(previous&&!previous.linked)throw Error('기존 기록용 거래는 자동 반영 거래로 변경할 수 없습니다.');
const next={...trade,name:h.name,account:h.account,linked:true,sequence:previous?.sequence??Math.max(0,...data.transactions.map(t=>t.sequence||0))+1};
data.transactions=data.transactions.filter(t=>t.id!==next.id);data.transactions.push(next);return replay(data);
}
function remove(input,id){const data=clone(input);data.transactions=data.transactions.filter(t=>t.id!==id);return replay(data);}
function decision(h){
const target=Number.isFinite(h.targetPct)?h.targetPct:15,stop=-10;
const pct=h.cost>0?(h.price/h.cost-1)*100:null;
const status=h.qty<=0?'관심 종목':pct===null?'기준가 없음':pct<=stop+1e-9?'손절 기준 도달':pct>=target-1e-9?'목표 수익률 도달':'보유 중';
return {target,stop,pct,status,buySignal:h.buyPrice>0&&h.price<=h.buyPrice,buyPrice:h.buyPrice||0,targetPrice:h.cost>0?h.cost*(1+target/100):null,stopPrice:h.cost>0?h.cost*.9:null};
}
function quote(input,id,price,at,source){
nonnegative(price,'현재가');if(price<=0)throw Error('현재가는 0보다 커야 합니다.');
const data=clone(input),h=data.holdings.find(h=>h.id===id);if(!h)throw Error('종목을 찾을 수 없습니다.');
if(!at||!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()+300000)throw Error('시세 기준 시각을 확인해주세요.');
if(h.quoteAt&&Date.parse(at)<Date.parse(h.quoteAt))throw Error('기존 시세보다 오래된 시세입니다.');
h.price=price;h.quoteAt=at;h.quoteSource=source;
h.priceHistory=[...(h.priceHistory||[]).filter(q=>q.at!==at),{at,price}].sort((a,b)=>a.at.localeCompare(b.at)).slice(-120);
return data;
}
return {replay,record,remove,decision,quote,linked};
})();
