const {packTruck}=require('../src/engine.js');
const truck={L:311,W:97,H:103,doorW:92,doorH:96};
const types=[
 {id:'a',name:'Moving light 2-pack',l:48,w:27,h:39,wt:380,qty:8,group:2},
 {id:'b',name:'LED wash 4-pack',l:46,w:24,h:30,wt:300,qty:6,group:2},
 {id:'c',name:'Power distro rack',l:30,w:24,h:48,wt:450,qty:2,group:1},
 {id:'d',name:'Lighting console',l:60,w:30,h:22,wt:180,qty:1,group:3,stack:false},
 {id:'e',name:'Cable trunk',l:48,w:24,h:30,wt:350,qty:6,group:1},
 {id:'f',name:'LED panel case',l:44,w:26,h:34,wt:420,qty:8,group:1},
 {id:'g',name:'Video rack 8RU',l:30,w:24,h:22,wt:150,qty:2,group:3},
 {id:'h',name:'Chain motor 1T',l:24,w:20,h:26,wt:140,qty:8,group:4},
 {id:'i',name:'Line array 4-pack',l:50,w:30,h:36,wt:450,qty:4,group:2},
];
let t=Date.now();const r=packTruck(truck,types,{});console.log('ms',Date.now()-t);
console.log(r.stats, r.unplaced);
// verify no overlaps, bounds, support order
const P=r.placed;let bad=0;
for(const a of P){ if(a.x<0||a.y<0||a.z<0||a.x+a.L>truck.L+1e-6||a.y+a.W>truck.W+1e-6||a.z+a.H>truck.H+1e-6){bad++;console.log('oob',a)}
 for(const b of P){ if(a===b)continue; if(a.x<b.x+b.L-0.01&&b.x<a.x+a.L-0.01&&a.y<b.y+b.W-0.01&&b.y<a.y+a.W-0.01&&a.z<b.z+b.H-0.01&&b.z<a.z+a.H-0.01){bad++;}}
 for(const s of a.on) if(s>=a.seq){bad++;console.log('seq',a.seq,s)}
 if(a.z>0&&!a.on.length){bad++;console.log('float',a)}}
console.log('bad',bad);
P.slice(0,12).forEach(p=>console.log(p.seq,p.type,p.x,p.y,p.z,p.L,p.W,p.H,p.on));
// stress
const big=[];for(let i=0;i<20;i++)big.push({id:'t'+i,l:20+((i*7)%40),w:18+((i*5)%20),h:20+((i*11)%30),wt:100+i*10,qty:20});
t=Date.now();const r2=packTruck({L:630,W:100,H:110,doorW:98,doorH:106},big,{});console.log('stress ms',Date.now()-t,r2.stats.count,r2.stats.total,(r2.stats.volume/r2.stats.truckVol).toFixed(2), r2.stats.usedL);
// like-on-like + restraints
const t3=[{id:'a',l:48,w:24,h:30,wt:300,qty:5,group:1},{id:'b',l:48,w:24,h:30,wt:200,qty:3,group:1},{id:'c',l:30,w:24,h:22,wt:100,qty:4,group:2,sitOn:'any'},{id:'d',l:40,w:30,h:40,wt:200,qty:2,group:3}];
const r3=packTruck(truck,t3,{restraints:{1:3,3:1}});
console.log('restraints',r3.restraints, r3.unplaced.length);
let bad3=0;const byS={};r3.placed.forEach(p=>byS[p.seq]=p);
r3.placed.forEach(p=>{ if(p.on.length){ const t=t3.find(t=>t.id===p.type); p.on.forEach(s=>{const q=byS[s]; if((t.sitOn||'same')==='same'&&(q.type!==p.type||q.x!==p.x||q.y!==p.y))bad3++;});}
 if(p.grp>1 && p.x < r3.restraints[0].x+3-1e-6) bad3++; });
console.log('like/barrier violations',bad3); r3.placed.forEach(p=>console.log(p.seq,p.type,p.grp,p.x,p.y,p.z,p.on));
const t4=[{id:'a',l:48,w:24,h:20,qty:8,group:1,maxStack:2},{id:'b',l:48,w:24,h:20,qty:6,group:1,sitOn:'any'},{id:'c',l:48,w:24,h:20,qty:6,group:1,sitOn:'any',maxStack:3}];
const r4=packTruck(truck,t4,{});const mx={};r4.placed.forEach(p=>mx[p.type]=Math.max(mx[p.type]||0,p.level));
const by={};r4.placed.forEach(p=>by[p.seq]=p);
let v4=0;r4.placed.forEach(p=>{const lim={a:2,b:99,c:3}[p.type];if(p.level>lim)v4++;let q=p;while(q.on.length){q=by[q.on[0]];if(p.level>({a:2,b:99,c:3}[q.type]))v4++;}});
console.log('max levels',mx,'stack-limit violations',v4,r4.unplaced.length);
