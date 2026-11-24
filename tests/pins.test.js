const {packTruck}=require('../src/engine.js');
const truck={L:311,W:97,H:103,doorW:92,doorH:96};
const types=[{id:'a',l:48,w:24,h:30,wt:300,qty:6,group:1},{id:'b',l:44,w:26,h:34,wt:360,qty:4,group:1,maxStack:2},{id:'c',l:30,w:24,h:22,wt:150,qty:4,group:2,sitOn:'any'}];
const r=packTruck(truck,types,{restraints:{1:3}});
const pins=r.placed.map(p=>({type:p.type,idx:p.idx,x:p.x,y:p.y,z:p.z,L:p.L,W:p.W}));
const r2=packTruck(truck,types,{restraints:{1:3},pins});
const same=r.placed.every(p=>{const q=r2.placed.find(q=>q.type===p.type&&q.idx===p.idx);return q&&q.x===p.x&&q.y===p.y&&q.z===p.z&&q.pinned});
console.log('repin identical',same, r2.restraints, r.restraints);
// rotate a floor case with nothing on it: last c
const last=pins.find(p=>p.type==='c'&&p.z===0); const t=last.L; last.L=last.W; last.W=t;
const r3=packTruck(truck,types,{pins});console.log('after rotate',r3.placed.find(q=>q.type===last.type&&q.idx===last.idx), r3.unplaced);
// units subset + overflow
const r4=packTruck({L:120,W:97,H:103,doorW:92,doorH:96},[{id:'a',l:48,w:24,h:30,qty:20,units:[3,5,7,9,11,13,15,17,19],of:20,sitOn:'any'}],{});
console.log('units',r4.placed.map(p=>p.idx+'/'+p.of).join(' '), r4.unplaced.length);
