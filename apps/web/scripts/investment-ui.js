'use strict';
const investmentNumber=(value,label)=>{const raw=String(value??'').replace(/,/g,'').trim();if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))throw Error(label+'을 확인해주세요.');const n=Number(raw);if(!Number.isFinite(n)||n<0)throw Error(label+'을 확인해주세요.');return n;};
const numericField=(name,label,value)=>'<label class="field">'+label+'<input name="'+name+'" type="text" inputmode="decimal" data-grouped-number="true" value="'+esc(formatNumberInput(value))+'" required></label>';
function prepareHoldingFields(h){
$('#fields').insertAdjacentHTML('beforeend',numericField('targetPct','목표 수익률 (%) · 직접 변경',h.targetPct??15)+numericField('buyPrice','매수 검토가 (원) · 0은 미설정',h.buyPrice??0)+'<label class="field">시세 종목 코드 (선택)<input name="quoteSymbol" maxlength="32" value="'+esc(h.quoteSymbol||'')+'" placeholder="예: AAPL"></label><label class="field">거래소 코드 (선택)<input name="quoteExchange" maxlength="32" value="'+esc(h.quoteExchange||'')+'" placeholder="예: NASDAQ"></label>');
if(h.openingQty!==undefined)for(const k of ['qty','cost','account']){const el=$('#fields').querySelector('[name="'+k+'"]');if(el)el.disabled=true;}
$('#form-note').textContent='수량 0으로 관심 종목을 등록할 수 있습니다. 금액은 원화 기준이며 손절 기준은 평균 매입가 대비 −10%입니다.'+(h.openingQty!==undefined?' 자동 반영을 시작한 자산의 수량·평균 매입가·계좌는 거래로 관리합니다.':' 기존 보유 수량·평균 매입가를 입력한 뒤 새 거래부터 기록하세요.');
}
function investmentPanel(holdings){
return '<section class="investment-section"><div class="card"><div class="card-head"><h2>매수·매도 판단 기준</h2><button id="refresh-quotes">연결 시세 갱신</button></div><p>목표 수익률은 종목별로 수정할 수 있습니다. 손절 기준은 −10%입니다. 기준 도달은 검토 알림이며 주문을 실행하지 않습니다.</p><label class="check investment-auto"><input type="checkbox" id="auto-quotes" '+(autoQuotes?'checked':'')+'>앱을 보고 있는 동안 5분마다 시세 갱신</label><p class="muted" id="quote-status">자동 시세는 공급자 연결과 종목 코드 등록 후 사용할 수 있습니다. 연결 전에는 현재가를 직접 갱신하세요.</p></div><div class="investment-cards">'+holdings.map(h=>{
const d=window.InvestmentEngine.decision(h),stale=!h.quoteAt||Date.now()-Date.parse(h.quoteAt)>86400000;
return '<article class="card investment-card"><div class="card-head"><h2>'+esc(h.name)+'</h2><span class="trade-status '+(d.status==='손절 기준 도달'?'negative':d.status==='목표 수익률 도달'?'positive':'')+'">'+esc(d.status)+'</span></div><div class="row"><span>현재가</span><strong>'+won(h.price)+'</strong></div><div class="row"><span>평균 매입가</span><strong>'+Number(h.cost).toLocaleString('ko-KR',{maximumFractionDigits:4})+'원</strong></div><div class="row"><span>목표 '+d.target+'%</span><strong>'+(d.targetPrice===null?'미정':won(d.targetPrice))+'</strong></div><div class="row"><span>손절 −10%</span><strong>'+(d.stopPrice===null?'미정':won(d.stopPrice))+'</strong></div><div class="row"><span>수익률</span><strong>'+(d.pct===null?'계산 전':d.pct.toFixed(2)+'%')+'</strong></div><div class="row"><span>매수 검토가</span><strong>'+(d.buyPrice?won(d.buyPrice)+(d.buySignal?' · 기준 도달':''):'미설정')+'</strong></div><div class="row"><span>누적 실현손익</span><strong>'+won(h.realizedProfit||0)+'</strong></div><p class="muted">시세: '+esc(h.quoteSource||'기존 직접 입력')+' · '+esc(h.quoteAt?new Date(h.quoteAt).toLocaleString('ko-KR'):'기준 시각 미기록')+(h.quoteFxAt?' · 환율 '+new Date(h.quoteFxAt).toLocaleString('ko-KR'):'')+(stale?' · 최신 가격 확인 필요':'')+'</p><p class="muted">표시 금액은 원 단위 반올림 · 판단은 반올림 전 단가 기준</p>'+priceFlow(h)+'<div class="toolbar"><button data-trade-holding="'+esc(h.id)+'" data-trade-type="매수">매수 기록</button><button data-trade-holding="'+esc(h.id)+'" data-trade-type="매도">매도 기록</button><button data-quote-holding="'+esc(h.id)+'">현재가 입력</button><button data-edit="holdings" data-id="'+esc(h.id)+'">목표·자산 수정</button></div></article>';
}).join('')+'</div></section>';
}
function priceFlow(h){
const points=(h.priceHistory||[]).map(x=>({date:x.at.slice(0,10),price:x.price,type:'시세'}));
for(const t of db.transactions.filter(t=>t.linked&&t.holdingId===h.id))points.push({date:t.date,price:t.unitPrice,type:t.type});
points.sort((a,b)=>a.date.localeCompare(b.date));if(!points.length)return '<p class="muted">현재가와 거래를 기록하면 가격 흐름에 매수·매도 지점이 표시됩니다.</p>';
const lo=Math.min(...points.map(x=>x.price)),hi=Math.max(...points.map(x=>x.price)),span=hi-lo||1;
const dates=points.map(x=>Date.parse(x.date)),first=Math.min(...dates),last=Math.max(...dates);
const xy=points.map((p,i)=>[20+(dates[i]-first)/(last-first||1)*280,95-(p.price-lo)/span*75]);
return '<svg class="trade-chart" viewBox="0 0 320 120" role="img" aria-label="기록된 가격 흐름과 매수 매도 지점"><polyline points="'+xy.map(x=>x.join(',')).join(' ')+'" fill="none" stroke="#6d8b5d" stroke-width="2"/>'+points.map((p,i)=>'<circle cx="'+xy[i][0]+'" cy="'+xy[i][1]+'" r="'+(p.type==='시세'?3:5)+'" fill="'+(p.type==='매수'?'#2371bb':p.type==='매도'?'#b64b3e':'#6d8b5d')+'"><title>'+esc(p.date+' '+p.type+' '+won(p.price))+'</title></circle>').join('')+'</svg><p class="muted">파랑: 매수 · 빨강: 매도 · 초록: 저장 시세 (시장 전체 차트 아님)</p>';
}
function openTradeForm(id,holdingId,type){
if(!db.holdings.length){toast('연결 계좌와 종목을 먼저 등록해주세요. 수량 0도 가능합니다.');return;}
const t=id?db.transactions.find(x=>x.id===id):{},h=db.holdings.find(x=>x.id===(t.holdingId||holdingId))||db.holdings[0];
editing={key:'linkedTrade',id};$('#modal-title').textContent='매수·매도 '+(id?'수정':'기록');
$('#fields').innerHTML='<label class="field">연결 종목<select name="holdingId" required '+(id?'disabled':'')+'>'+db.holdings.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===h.id?'selected':'')+'>'+esc(x.name+' · '+account(x.account))+'</option>').join('')+'</select></label><label class="field">유형<select name="type"><option '+((t.type||type)==='매수'?'selected':'')+'>매수</option><option '+((t.type||type)==='매도'?'selected':'')+'>매도</option></select></label>'+numericField('qty','수량',t.qty??'')+numericField('unitPrice','체결 단가 (원화 환산)',t.unitPrice??h.price)+numericField('fee','수수료 (원)',t.fee??0)+numericField('tax','세금 (원)',t.tax??0)+'<label class="field">거래일<input name="date" type="date" value="'+esc(t.date||today())+'" max="'+today()+'" required></label>';
$('#form-note').textContent='매수 비용은 평균 매입가에 포함합니다. 매도 시 수수료·세금을 차감한 실현손익을 계산합니다. 같은 날짜 거래는 최초 등록 순서입니다. 기존 기록용 거래와 중복 입력하지 마세요.';
$('#modal').showModal();
}
function saveTrade(fields){
const previous=editing.id?db.transactions.find(t=>t.id===editing.id):null;
const t={id:editing.id||uid(),holdingId:previous?.holdingId||fields.holdingId,type:fields.type,date:fields.date,qty:investmentNumber(fields.qty,'수량'),unitPrice:investmentNumber(fields.unitPrice,'체결 단가'),fee:investmentNumber(fields.fee,'수수료'),tax:investmentNumber(fields.tax,'세금')};
db=window.InvestmentEngine.record(db,t);save();$('#modal').close();render();toast('매매 기록을 반영하고 서버에 저장 중입니다.');
}
function openQuoteForm(id){
const h=db.holdings.find(x=>x.id===id);editing={key:'quote',id};$('#modal-title').textContent=h.name+' 현재가 갱신';
$('#fields').innerHTML=numericField('price','현재가 (원화 환산)',h.price);
$('#form-note').textContent='입력한 현재가로 평가금액·수익률·목표 도달 상태가 즉시 다시 계산됩니다. 가격 출처는 직접 입력으로 표시합니다.';$('#modal').showModal();
}
function saveQuote(fields){db=window.InvestmentEngine.quote(db,editing.id,investmentNumber(fields.price,'현재가'),new Date().toISOString(),'직접 입력');save();$('#modal').close();render();}
let autoQuotes=false,quoteBusy=false,quoteTimer=null;
async function refreshInvestmentQuotes(){
if(quoteBusy||!window.assetCloud)return;const instruments=db.holdings.filter(h=>h.quoteSymbol);const node=$('#quote-status');
if(!instruments.length){if(node)node.textContent='자산 수정에서 시세 종목 코드를 먼저 입력해주세요.';return;}
quoteBusy=true;const session=window.assetCloud;const results=[];
try{
for(const h of instruments){
try{
const response=await fetch('/api/quotes?'+new URLSearchParams({symbol:h.quoteSymbol,exchange:h.quoteExchange||''}),{signal:AbortSignal.timeout(15000)});
const data=await response.json();if(!response.ok)throw Error(data.error||'시세 연결 실패');
if(window.assetCloud!==session)return;
const current=db.holdings.find(x=>x.id===h.id);if(!current||current.quoteSymbol!==h.quoteSymbol||current.quoteExchange!==h.quoteExchange)continue;
if(data.symbol!==h.quoteSymbol||data.exchange!==(h.quoteExchange||'')||data.currency!=='KRW')throw Error('종목·통화가 일치하지 않습니다.');
db=window.InvestmentEngine.quote(db,h.id,data.price,data.at,data.source);if(data.fxAt)db.holdings.find(x=>x.id===h.id).quoteFxAt=data.fxAt;results.push(h.name+': 갱신');
}catch(error){results.push(h.name+': '+(error instanceof SyntaxError?'시세 서버 미연결':error.message));}
}
if(window.assetCloud!==session)return;save();render();const status=$('#quote-status');if(status)status.textContent=results.join(' / ');
}finally{quoteBusy=false;}
}
function bindInvestment(){
document.querySelectorAll('[data-trade-holding]').forEach(b=>b.onclick=()=>openTradeForm(null,b.dataset.tradeHolding,b.dataset.tradeType));
document.querySelectorAll('[data-quote-holding]').forEach(b=>b.onclick=()=>openQuoteForm(b.dataset.quoteHolding));
$('#refresh-quotes')?.addEventListener('click',refreshInvestmentQuotes);
$('#auto-quotes')?.addEventListener('change',e=>{autoQuotes=e.target.checked;clearInterval(quoteTimer);if(autoQuotes){refreshInvestmentQuotes();quoteTimer=setInterval(()=>{if(!document.hidden&&page==='holdings')refreshInvestmentQuotes();},300000);}});
}
window.addEventListener('asset-lock',()=>{autoQuotes=false;clearInterval(quoteTimer);});
