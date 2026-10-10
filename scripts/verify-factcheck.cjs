const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),ctx={};vm.runInNewContext(read('js/stock.js'),ctx);const ST=ctx.ST;let cases=0;
for(const r of [-.99,-.9,-.5,0,.01,.1,1,4,10])for(const scale of [1e-12,1e-6,1,100,1e6,1e12])for(const n of [1,2,6,12]){const flows=Array(n+1).fill(0);flows[0]=-scale;flows[n]=scale*(1+r)**n;const actual=ST.irr(flows);assert(Number.isFinite(actual)&&Math.abs(actual-r)<1e-10,JSON.stringify({r,scale,n,actual}));cases++;}
assert.equal(ST.irr([-100,50],-.5,1),-.5);
for(const flows of [[],[0,0],[100,100],[-100,-20],[-1,100],[NaN,1],[-1,Infinity]]){assert(Number.isNaN(ST.irr(flows)));cases++;}
assert(Number.isNaN(ST.irr([-1,2],-1,10)));assert(Number.isNaN(ST.irr([-1,2],1,1)));
// Several contributions plus a final withdrawal constructed at a known periodic yield.
for(const r of [-.2,0,.03,.5])for(const scale of [1e-12,1,1e12]){const flows=[-2,-1,-3,-1,0].map(x=>x*scale);flows[4]=-flows.reduce((s,c,t)=>s+c*(1+r)**(4-t),0);assert(Math.abs(ST.irr(flows)-r)<1e-10);cases++;}
let scripts=0;for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html')))for(const m of read('chapters/'+file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('src='))continue;if(m[1].includes('ld+json'))JSON.parse(m[2]);else new vm.Script(m[2],{filename:file});scripts++;}console.log({irrCases:cases,compiledScriptBlocks:scripts});
// SEC Section 31: actual buy/sell expense must agree with the round-trip helper.
let additionalCases=0;
const close=(a,b,tol=1e-7)=>assert(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),JSON.stringify({a,b}));
close(ST.KR.secFee,20.60/1e6,1e-16);
for(const market of ['US','KOSPI','KOSDAQ'])for(const amount of [1,1000,1e6])for(const fee of [0,.001,.0025]){
 const buy=ST.cost({side:'buy',price:amount,market,fee}),sell=ST.cost({side:'sell',price:amount,market,fee});
 close((buy.total-sell.total)/amount,ST.roundTrip(market,fee));additionalCases++;
}
// Zero-volatility European prices: deterministic forward payoff discounted to today.
for(const S of [80,100,120])for(const T of [.1,.5,1])for(const r of [-.02,0,.05])for(const q of [0,.02,.08])for(const type of ['call','put']){
 const o={S,K:100,T,r,q,type,sigma:0},actual=ST.bs(o);
 const forward=S*Math.exp((r-q)*T),payoff=type==='call'?Math.max(0,forward-100):Math.max(0,100-forward);
 close(actual.price,Math.exp(-r*T)*payoff,1e-12);additionalCases++;
 if(Math.abs(forward-100)<.001)continue; // Greeks are not differentiable at the zero-volatility strike.
 close(actual.price,ST.bs({...o,sigma:1e-6}).price,1e-10);
 const h=1e-5,price=changes=>ST.bs({...o,...changes}).price;
 close(actual.delta,(price({S:S+h})-price({S:S-h}))/(2*h),1e-8);
 close(actual.rho,(price({r:r+h})-price({r:r-h}))/(2*h*100),1e-8);
 close(actual.theta,-(price({T:T+h})-price({T:T-h}))/(2*h*365),1e-8);
}
close(ST.bs({S:100,K:100,T:1,r:.05,sigma:0}).price,4.8770575499286,1e-12);
// NTS 2026-03-09 published cumulative formulas, including local income tax.
const national=x=>x<=20e6?x*.14:x<=300e6?2.8e6+(x-20e6)*.20:x<=5e9?58.8e6+(x-300e6)*.25:1233.8e6+(x-5e9)*.30;
for(const x of [0,1,20e6-1,20e6,20e6+1,30e6,300e6-1,300e6,300e6+1,5e9-1,5e9,5e9+1,10e9]){close(ST.highDividendTax(x),national(x)*1.1,1e-12);additionalCases++;}
for(const [fin,special,tax,comprehensive] of [[50e6,30e6,8.36e6,false],[30e6,30e6,5.28e6,false],[30e6,100e6,5.28e6,false],[30e6,0,4.73e6,true]]){
 const result=ST.finIncomeTax(fin,30e6,{specialDividend:special});close(result.tax,tax,1e-12);assert.equal(result.comprehensive,comprehensive);additionalCases++;
}
assert.equal(ST.finIncomeTax(51e6,30e6,{specialDividend:30e6}).comprehensive,true);
console.log({additionalCases});
