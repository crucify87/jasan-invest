const response=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default {
async fetch(request,env,ctx){
const url=new URL(request.url);
if(url.pathname!=='/api/quotes')return env.ASSETS.fetch(request);
if(request.method!=='GET')return response({error:'허용되지 않은 요청'},405);
if(!env.TWELVE_DATA_API_KEY)return response({error:'시세 공급자 미연결: 관리자 서버 키 설정이 필요합니다.'},503);
let allowed;try{allowed=JSON.parse(env.QUOTE_INSTRUMENTS||'[]');}catch{return response({error:'서버 종목 설정 오류'},503);}
const symbol=url.searchParams.get('symbol')||'',exchange=url.searchParams.get('exchange')||'';
if(!symbol||symbol.length>32||exchange.length>32||!Array.isArray(allowed)||!allowed.some(x=>x.symbol===symbol&&(x.exchange||'')===exchange))return response({error:'서버 허용 목록에 등록되지 않은 종목입니다.'},400);
const cacheKey=new Request(url.origin+'/api/quotes?'+new URLSearchParams({symbol,exchange}));
const cached=await caches.default.match(cacheKey);if(cached)return cached;
async function upstream(path,params){
const target=new URL('https://api.twelvedata.com/'+path);
for(const [k,v]of Object.entries(params))if(v)target.searchParams.set(k,v);
target.searchParams.set('apikey',env.TWELVE_DATA_API_KEY);
const res=await fetch(target,{signal:AbortSignal.timeout(10000)});const data=await res.json();
if(!res.ok||data.status==='error')throw Error('공급자 응답 실패: 종목 지원·API 권한·호출 한도를 확인해주세요.');
return data;
}
try{
const q=await upstream('quote',{symbol,exchange,timezone:'UTC'});
if(String(q.symbol).toUpperCase()!==symbol.toUpperCase()||(exchange&&![q.exchange,q.mic_code].some(x=>String(x).toUpperCase()===exchange.toUpperCase())))throw Error('종목 불일치');
const price=Number(q.close),seconds=Number(q.timestamp);
if(!Number.isFinite(price)||price<=0||!Number.isFinite(seconds)||seconds<=0||seconds*1000>Date.now()+300000||!q.currency)throw Error('시세 가격·기준 시각·통화를 확인할 수 없습니다.');
let rate=1,fxAt=null;
if(q.currency!=='KRW'){
if(!['USD','EUR','JPY','GBP','HKD','CAD','AUD','CHF'].includes(q.currency))throw Error('원화 환산을 지원하지 않는 통화입니다.');
const fx=await upstream('exchange_rate',{symbol:q.currency+'/KRW'});
rate=Number(fx.rate);const at=Number(fx.timestamp);
if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(at)||at<=0||at*1000>Date.now()+300000)throw Error('환율을 확인할 수 없습니다.');
fxAt=new Date(at*1000).toISOString();
}
const out=Response.json({symbol,exchange,currency:'KRW',price:price*rate,at:new Date(seconds*1000).toISOString(),fxAt,source:'Twelve Data · '+q.currency+(q.currency==='KRW'?'':'→KRW')+' · 지연 가능'},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
ctx.waitUntil(caches.default.put(cacheKey,out.clone()));return out;
}catch(error){return response({error:error.message==='시세 가격·기준 시각·통화를 확인할 수 없습니다.'?error.message:error.message.startsWith('환율')?error.message:'시세 조회 실패: 공급자 권한·종목 코드·호출 한도를 확인해주세요.'},502);}
}
};
