const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),ctx={};vm.runInNewContext(read('js/stock.js'),ctx);const ST=ctx.ST;let cases=0;
for(const r of [-.99,-.9,-.5,0,.01,.1,1,4,10])for(const scale of [1e-12,1e-6,1,100,1e6,1e12])for(const n of [1,2,6,12]){const flows=Array(n+1).fill(0);flows[0]=-scale;flows[n]=scale*(1+r)**n;const actual=ST.irr(flows);assert(Number.isFinite(actual)&&Math.abs(actual-r)<1e-10,JSON.stringify({r,scale,n,actual}));cases++;}
assert.equal(ST.irr([-100,50],-.5,1),-.5);
for(const flows of [[],[0,0],[100,100],[-100,-20],[-1,100],[NaN,1],[-1,Infinity]]){assert(Number.isNaN(ST.irr(flows)));cases++;}
assert(Number.isNaN(ST.irr([-1,2],-1,10)));assert(Number.isNaN(ST.irr([-1,2],1,1)));
// Several contributions plus a final withdrawal constructed at a known periodic yield.
for(const r of [-.2,0,.03,.5])for(const scale of [1e-12,1,1e12]){const flows=[-2,-1,-3,-1,0].map(x=>x*scale);flows[4]=-flows.reduce((s,c,t)=>s+c*(1+r)**(4-t),0);assert(Math.abs(ST.irr(flows)-r)<1e-10);cases++;}
let scripts=0;for(const file of fs.readdirSync(path.join(root,'chapters')).filter(f=>f.endsWith('.html')))for(const m of read('chapters/'+file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('src='))continue;if(m[1].includes('ld+json'))JSON.parse(m[2]);else new vm.Script(m[2],{filename:file});scripts++;}console.log({irrCases:cases,compiledScriptBlocks:scripts});
