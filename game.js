import * as THREE from 'three';
import {GLTFLoader} from './lib/loaders/GLTFLoader.js';import * as SkeletonUtils from './lib/utils/SkeletonUtils.js';import {mergeGeometries} from './lib/utils/BufferGeometryUtils.js';
const $=id=>document.getElementById(id);
const DAY=90; // segundos reales por día
const LOW=('ontouchstart' in window)||innerWidth<900||(navigator.hardwareConcurrency||4)<=4;
const renderer=new THREE.WebGLRenderer({antialias:!LOW,powerPreference:'high-performance'});renderer.setPixelRatio(LOW?Math.min(devicePixelRatio,1.25):Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=LOW?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfe3ff,22,LOW?70:85);
const cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,400);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x4a4033,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048);sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:200});scene.add(sun,sun.target);
const moon=new THREE.DirectionalLight(0x8fa8ff,0);scene.add(moon,moon.target);
const MC=new Map(),GC=new Map(),TC=new Map();let GEN=false;
const M=c=>{if(!GEN)return new THREE.MeshLambertMaterial({color:c});let m=MC.get(c);if(!m){m=new THREE.MeshLambertMaterial({color:c});MC.set(c,m);SHARED?.add(m)}return m};
const cg=(k,f)=>{let g=GC.get(k);if(!g){g=f();GC.set(k,g);SHARED.add(g)}return g};
// Cielo con degradado
const skyU={top:{value:new THREE.Color(0x4a90e2)},hor:{value:new THREE.Color(0xbfe3ff)},bot:{value:new THREE.Color(0x6b6560)}};
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(300,24,12),new THREE.ShaderMaterial({uniforms:skyU,side:THREE.BackSide,depthWrite:false,fog:false,
 vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform vec3 top,hor,bot;varying vec3 vP;void main(){float h=vP.y;vec3 c=h>0.?mix(hor,top,pow(clamp(h*1.6,0.,1.),.7)):mix(hor,bot,clamp(-h*4.,0.,1.));gl_FragColor=vec4(c,1.);}'}));
skyDome.renderOrder=-1;scene.add(skyDome);
const sunBall=new THREE.Mesh(new THREE.SphereGeometry(8,16,10),new THREE.MeshBasicMaterial({color:0xfff2b0,fog:false}));scene.add(sunBall);
const moonBall=new THREE.Mesh(new THREE.SphereGeometry(5,16,10),new THREE.MeshBasicMaterial({color:0xe8ecff,fog:false}));scene.add(moonBall);
// Texturas procedurales
function tex(w,h,draw,rx=1,ry=1){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=LOW?1:4;return t}
const noise=(x,w,h,n,a)=>{for(let i=0;i<n;i++){const v=Math.random()*255|0;x.fillStyle=`rgba(${v},${v},${v},${a})`;x.fillRect(Math.random()*w,Math.random()*h,2,2)}};
const T={
 brick:tex(128,128,(x,w,h)=>{x.fillStyle='#b7aca0';x.fillRect(0,0,w,h);for(let r=0;r<16;r++)for(let c=-1;c<5;c++){const l=180+Math.random()*50|0;x.fillStyle=`rgb(${l},${l*.8|0},${l*.7|0})`;x.fillRect(c*32+(r%2)*16+1,r*8+1,30,6)}noise(x,w,h,800,.15)}),
 concrete:tex(128,128,(x,w,h)=>{x.fillStyle='#c9c6c0';x.fillRect(0,0,w,h);noise(x,w,h,2500,.12);x.strokeStyle='rgba(0,0,0,.25)';for(let i=0;i<4;i++){x.beginPath();x.moveTo(0,i*32+.5);x.lineTo(w,i*32+.5);x.stroke()}x.strokeStyle='rgba(60,50,40,.3)';x.beginPath();x.moveTo(20,0);x.lineTo(35,40);x.lineTo(28,80);x.stroke()}),
 asphalt:tex(256,256,(x,w,h)=>{x.fillStyle='#3a3d42';x.fillRect(0,0,w,h);noise(x,w,h,6000,.18);x.strokeStyle='rgba(15,15,15,.6)';x.lineWidth=1.5;for(let i=0;i<3;i++){x.beginPath();let a=Math.random()*w,b=Math.random()*h;x.moveTo(a,b);for(let j=0;j<6;j++){a+=(Math.random()-.5)*50;b+=(Math.random()-.5)*50;x.lineTo(a,b)}x.stroke()}},2,40),
 side:tex(128,128,(x,w,h)=>{x.fillStyle='#9a978f';x.fillRect(0,0,w,h);noise(x,w,h,2000,.12);x.strokeStyle='rgba(40,40,40,.45)';x.lineWidth=2;for(let i=0;i<=4;i++){x.beginPath();x.moveTo(i*32,0);x.lineTo(i*32,h);x.moveTo(0,i*32);x.lineTo(w,i*32);x.stroke()}},90,90),
 grass:tex(128,128,(x,w,h)=>{x.fillStyle='#5a9e3a';x.fillRect(0,0,w,h);for(let i=0;i<1500;i++){x.fillStyle=Math.random()<.5?'#4c8c30':'#6fb24a';x.fillRect(Math.random()*w,Math.random()*h,1,3)}},6,6)};
const TM=(t,rx,ry,c=0xffffff)=>{if(GEN){rx=Math.max(.5,Math.round(rx*2)/2);ry=Math.max(.5,Math.round(ry*2)/2);const k=t.uuid+rx+'_'+ry+'_'+c;let m=TC.get(k);if(!m){const tx=t.clone();tx.needsUpdate=true;tx.repeat.set(rx,ry);m=new THREE.MeshLambertMaterial({map:tx,color:c});TC.set(k,m);SHARED.add(m);SHARED.add(tx)}return m}const k=t.clone();k.needsUpdate=true;k.repeat.set(rx,ry);return new THREE.MeshLambertMaterial({map:k,color:c})};
// Partículas
const parts=[],pGeo=new THREE.BoxGeometry(1,1,1),pMats={};
function puff(p,col,n,spd,size,grav=9,life=.6){if(LOW)n=Math.ceil(n/2);for(let i=0;i<n;i++){const m=new THREE.Mesh(pGeo,pMats[col]||(pMats[col]=new THREE.MeshBasicMaterial({color:col,transparent:true})));m.scale.setScalar(size*(.6+Math.random()*.6));m.position.copy(p);
 m.userData={v:new THREE.Vector3((Math.random()-.5)*spd,Math.random()*spd*.8,(Math.random()-.5)*spd),g:grav,l:life,L:life};scene.add(m);parts.push(m)}}
function updParts(dt){for(let i=parts.length-1;i>=0;i--){const m=parts[i],u=m.userData;u.l-=dt;u.v.y-=u.g*dt;m.position.addScaledVector(u.v,dt);if(m.position.y<.05){m.position.y=.05;u.v.multiplyScalar(.5)}m.rotation.x+=dt*5;m.scale.multiplyScalar(1-dt*1.2);if(u.l<=0){scene.remove(m);parts.splice(i,1)}}}
const box=(w,h,d,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.castShadow=m.receiveShadow=true;return m};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshLambertMaterial({map:T.side}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const PERF=window.__perf=[];const WORLD=1e9,BASE=9,CH=60,obst=[],rects=[],doors=[],ladders=[],zips=[],lamps=[],lampPos=[];
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const G=30;let CUR=null;const chunks=new Map();
ground.material.map.repeat.set(60,60);
// pasto de la casa segura
const lawn=new THREE.Mesh(new THREE.CircleGeometry(BASE+1,40),new THREE.MeshLambertMaterial({map:T.grass}));lawn.rotation.x=-Math.PI/2;lawn.position.y=.025;lawn.receiveShadow=true;scene.add(lawn);
const house=new THREE.Group();const wall=box(6,3.5,6,0xc9a26b);wall.position.y=1.75;const roof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,4),M(0xb03a2e));roof.position.y=4.7;roof.rotation.y=Math.PI/4;
const door=box(1.4,2.4,.1,0x6b3e1e);door.position.set(0,1.2,3.01);house.add(wall,roof,door);house.position.set(0,0,-3);scene.add(house);obst.push({x:0,z:-3,r:3.6});
for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(Math.abs(a-Math.PI/2)<.2)continue;const p=box(.3,1.4,.3,0x8d6e4a);p.position.set(Math.cos(a)*BASE,.7,Math.sin(a)*BASE);scene.add(p)}
const ring=new THREE.Mesh(new THREE.RingGeometry(BASE-.2,BASE+.2,64),new THREE.MeshBasicMaterial({color:0xffee88}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;scene.add(ring);
const bcol=[0x8a7f74,0x6f7378,0x9b8b6e,0x7a6a63,0x5f6b6d];
const winDark=new THREE.MeshLambertMaterial({color:0x1a2433}),winLit=new THREE.MeshLambertMaterial({color:0x1a2433,emissive:0xffc66b,emissiveIntensity:0}),winGeo=new THREE.PlaneGeometry(1.2,1.4),frGeo=new THREE.BoxGeometry(1.5,.15,.3),frMat=M(0xd7ccc8);
function building(x,z,w,d,h){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),TM(rnd()<.5?T.brick:T.concrete,w/4,h/4,bcol[Math.floor(rnd()*5)]|0x404040));b.castShadow=b.receiveShadow=true;b.position.y=h/2;g.add(b);
 for(let y=3;y<h-.5;y+=3){const ld=box(w+.3,.18,d+.3,0x9e9890);ld.castShadow=false;ld.position.y=y-.4;g.add(ld)}
 const cr=box(w+.4,.5,d+.4,0x7d766d);cr.position.y=h+.1;g.add(cr);
 if(rnd()<.6){const ac=box(1.4,1,1.2,0xb0bec5);ac.position.set(-w/4,h+.8,d/5);g.add(ac)}
 if(rnd()<.4){const tk=new THREE.Mesh(cg('tank',()=>new THREE.CylinderGeometry(.9,.9,1.6,10)),M(0x8d6e63));tk.position.set(w/4,h+1.2,-d/5);tk.castShadow=true;g.add(tk)}
 if(rnd()<.3){const an=box(.08,3,.08,0x333333);an.position.set(0,h+1.8,0);g.add(an)}
 const wm=winDark;for(let y=2;y<h-1;y+=3)for(let i=-w/2+1.5;i<w/2-1;i+=2.5){if(rnd()<.8){const wn=new THREE.Mesh(winGeo,rnd()<.3?winLit:wm);const fr=new THREE.Mesh(frGeo,frMat);fr.position.set(i,y-.8,d/2+.08);g.add(fr);wn.position.set(i,y,d/2+.01);g.add(wn);const w2=wn.clone();w2.position.z=-d/2-.01;w2.rotation.y=Math.PI;g.add(w2)}}
 if(rnd()<.5){const c=box(w*.4,1.5,d*.4,0x5a5148);c.position.set(w*.2,h+.3,0);c.rotation.z=.3;g.add(c)} // techo roto
 // puerta abierta (hueco oscuro)
 const dr=new THREE.Mesh(cg('door',()=>new THREE.PlaneGeometry(1.6,2.4)),M(0x0d0d0d));dr.position.set(0,1.2,d/2+.02);g.add(dr);
 const dRing=new THREE.Mesh(cg('dring',()=>new THREE.RingGeometry(.7,.95,24)),dRingM);dRing.rotation.x=-Math.PI/2;dRing.position.set(0,.06,d/2+1.3);g.add(dRing);
 CUR.doors.push({x,z:z+d/2+1.3,id:CUR.key+'|b'+CUR.doors.length,ring:dRing});
 const top=h+.35;CUR.blds.push({x,z,w,d,top});
 if(rnd()<.7){const lh=top+.7;for(const sz of[-.38,.38]){const rl=box(.09,lh,.09,0x8d6e63);rl.position.set(w/2+.32,lh/2,sz);g.add(rl)}for(let y=.4;y<lh;y+=.45){const rg=new THREE.Mesh(cg('rung',()=>new THREE.BoxGeometry(.07,.07,.8)),M(0xa1887f));rg.position.set(w/2+.32,y,0);g.add(rg)}CUR.ladders.push({x:x+w/2+.65,z,top,rx:x+w/2-.9});CUR.blds[CUR.blds.length-1].lad=1}
 g.position.set(x,0,z);CUR.g.add(g);CUR.rects.push({x,z,w:w/2+.5,d:d/2+.5,h:top});CUR.hide.push([x+(rnd()-.5)*w*.6,z+d/2+1.6])}
const dRingM=new THREE.MeshBasicMaterial({color:0x76ff03,side:2,transparent:true,opacity:.8});const ccol=[0xc62828,0x1565c0,0xf9a825,0x2e7d32,0x6d4c41,0xeeeeee];
const SHARED=new Set([dRingM,winDark,winLit,frMat,winGeo,frGeo]);const lampBulbM=new THREE.MeshBasicMaterial({color:0x555555});SHARED.add(lampBulbM);
function hseed(i,j){let h=Math.imul(i|0,73856093)^Math.imul(j|0,19349663)^0x5bd1e995;h=(h>>>0)%2147483646+1;return h}
function hstr(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)%2147483646+1}
const nearBase=(x,z,r)=>Math.hypot(x,z)<BASE+r;
function cfree(x,z){return !CUR.obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6)&&!CUR.rects.some(r=>Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d)&&!nearBase(x,z,3)&&!(CUR.doors||[]).some(d=>Math.hypot(d.x-x,d.z-z)<3.5)}
const BIOS=[{n:'ciudad',l:'🏙️ Ciudad',t:0xbfe3ff},{n:'barrio',l:'🏘️ Barrio',t:0xffd9b0},{n:'colonia',l:'🏡 Colonia',t:0xd4f5c8,gr:0x8bc34a},{n:'selva',l:'🌴 Selva',t:0x9fdc9a,gr:0x2e7d32},{n:'desierto',l:'🏜️ Desierto',t:0xffd28a,gr:0xe3c58a}];
function bioAt(x,z){const d=Math.hypot(x,z);if(d<300)return 0;if(d<600)return 1;if(d<900)return 2;if(d<1300)return 3;if(d<1700)return 4;const band=Math.floor((d-1700)/400),sec=Math.floor((Math.atan2(z,x)+Math.PI)/(Math.PI/4));return 1+Math.abs(band*7+sec*3+(band*sec)%5)%4}
function bioOfChunk(x,z){return bioAt((Math.floor(x/CH)+.5)*CH,(Math.floor(z/CH)+.5)*CH)}
window.__bio=bioAt;
function nature(bio,X0,Z0){const N=bio==3?(LOW?26:40):(LOW?14:22);
 const gp=new THREE.Mesh(new THREE.PlaneGeometry(CH,CH),M(BIOS[bio].gr));gp.rotation.x=-Math.PI/2;gp.position.set(X0+CH/2,.012,Z0+CH/2);gp.receiveShadow=true;CUR.g.add(gp);
 for(let i=0;i<N;i++){const x=X0+2+rnd()*(CH-4),z=Z0+2+rnd()*(CH-4),r=rnd();if(!cfree(x,z)){rnd();continue}const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rnd()*6;
  if(bio==3){if(r<.55){const h=3+rnd()*3;if(prop('palmera',x,z,h+3,rnd()*6)){for(let j=0;j<2;j++){const vl=1+rnd()*2;const v=box(.07,vl,.07,0x558b2f);v.position.set(x+(rnd()-.5)*1.5,h+1-vl/2,z+(rnd()-.5)*1.5);CUR.g.add(v)}CUR.obst.push({x,z,r:.45});CUR.hide.push([x+1.2,z]);continue}const tr=box(.35,h,.35,0x5d4037);tr.position.y=h/2;g.add(tr);for(let j=0;j<4;j++){const lf=box(1.6+rnd(),.5,1.6+rnd(),[0x1b5e20,0x2e7d32,0x388e3c][j%3]);lf.position.set((rnd()-.5)*1.2,h-.2+j*.45,(rnd()-.5)*1.2);lf.rotation.y=rnd()*3;g.add(lf)}
    for(let j=0;j<3;j++){const vl=1+rnd()*2;const v=box(.06,vl,.06,0x558b2f);v.position.set((rnd()-.5)*2,h-vl/2,(rnd()-.5)*2);g.add(v)}CUR.obst.push({x,z,r:.45});CUR.hide.push([x+1.2,z])}
   else if(r<.85){for(let j=0;j<3;j++){const bu=box(.9,.7+rnd()*.5,.9,[0x33691e,0x43a047][j%2]);bu.position.set((rnd()-.5)*1.4,.4,(rnd()-.5)*1.4);bu.rotation.y=rnd()*3;g.add(bu)}}
   else{const lg=box(.6,.6,3,0x6d4c41);lg.position.y=.3;g.add(lg);CUR.obst.push({x,z,r:.8,h:.6})}}
  else{if(r<.4&&prop(rnd()<.5?'cactus':'cactus2',x,z,1.6+rnd()*1.8,rnd()*6)){CUR.obst.push({x,z,r:.45});continue}if(r<.75&&r>=.4&&prop(rnd()<.6?'roca':'roca2',x,z,.7+rnd()*1.3,rnd()*6)){CUR.obst.push({x,z,r:.8,h:.8});continue}if(r<.4){const h=1.4+rnd()*1.6;const c=box(.45,h,.45,0x558b2f);c.position.y=h/2;g.add(c);for(const sx of[-1,1]){if(rnd()<.3)continue;const a=box(.6,.3,.3,0x558b2f);a.position.set(sx*.45,h*.55,0);const a2=box(.28,.7,.28,0x558b2f);a2.position.set(sx*.7,h*.55+.3,0);g.add(a,a2)}CUR.obst.push({x,z,r:.4})}
   else if(r<.75){const k=.6+rnd()*1.2;const ro=box(k*1.3,k,k,[0xa1887f,0x8d6e63,0xbcaaa4][i%3]);ro.position.y=k/2;ro.rotation.set(rnd(),rnd()*3,0);g.add(ro);CUR.obst.push({x,z,r:k*.6,h:k})}
   else{const L=2+rnd()*3,h=.8+rnd()*1.8;const w=box(L,h,.5,0xd7b98a);w.position.y=h/2;g.add(w);const w2=box(.5,h*.7,1.8,0xc9a56f);w2.position.set(L/2,h*.35,.9);g.add(w2);CUR.obst.push({x,z,r:L/2,h});CUR.hide.push([x,z+1.4])}}
  CUR.g.add(g)}}
function fence(x,z,w,d){for(const[sx,sz,L,vx]of[[0,-1,w,1],[0,1,w,1],[-1,0,d,0],[1,0,d,0]]){if(sz==1&&rnd()<.6)continue;const n=Math.floor(L/.6);for(let k=0;k<n;k++){const p=box(.12,.9,.12,0xfafafa);p.position.set(x+(vx?-L/2+k*.6:sx*w/2),.45,z+(vx?sz*d/2:-L/2+k*.6));CUR.g.add(p)}const rl=box(vx?L:.08,.08,vx?.08:L,0xeeeeee);rl.position.set(x+(vx?0:sx*w/2),.7,z+(vx?sz*d/2:0));CUR.g.add(rl)}}
function mkZip(b1,b2,vx){b1.zip=b2.zip=1;
   const A={x:vx?b1.x+b1.w/2-1.1:b1.x,z:vx?b1.z:b1.z+b1.d/2-1.1,top:b1.top},Bq={x:vx?b2.x-b2.w/2+1.1:b2.x,z:vx?b2.z:b2.z-b2.d/2+1.1,top:b2.top};
   for(const e of[A,Bq]){const po=box(.18,3.6,.18,0x455a64);po.position.set(e.x,e.top+1.8,e.z);CUR.g.add(po);const bs=box(.7,.14,.7,0xff9800);bs.position.set(e.x,e.top+.07,e.z);CUR.g.add(bs);const fl=box(1.3,.8,.04,0xff6d00);fl.position.set(e.x+(vx?0:.68),e.top+3.15,e.z+(vx?.68:0));fl.rotation.y=vx?Math.PI/2:0;CUR.g.add(fl);const f2=box(.9,.25,.05,0xffeb3b);f2.position.set(fl.position.x,e.top+3.15,fl.position.z);f2.rotation.y=fl.rotation.y;CUR.g.add(f2);e.y=e.top+3.3}
   const L=Math.hypot(Bq.x-A.x,Bq.y-A.y,Bq.z-A.z),cb=new THREE.Mesh(cg('cable',()=>new THREE.BoxGeometry(.06,.06,1)),M(0x212121));cb.scale.z=L;cb.position.set((A.x+Bq.x)/2,(A.y+Bq.y)/2,(A.z+Bq.z)/2);cb.lookAt(Bq.x,Bq.y,Bq.z);CUR.g.add(cb);
   CUR.zips.push({a:A,b:Bq,len:L})}
function* genChunkG(ci,cj){const key=ci+','+cj;const ch={key,ci,cj,g:new THREE.Group(),obst:[],rects:[],doors:[],lamps:[],hide:[],ladders:[],zips:[],blds:[]};CUR=ch;seed=hseed(ci,cj);yield ch;const X0=ci*CH,Z0=cj*CH;const bio=ch.bio=bioAt(X0+CH/2,Z0+CH/2);
 // calles
 if(bio>=3)nature(bio,X0,Z0);else for(const o of[0,G])for(const v of[0,1]){const st=new THREE.Mesh(cg('st'+v,()=>new THREE.PlaneGeometry(v?10:CH,v?CH:10)),v?TM(T.asphalt,2,12):TM(T.asphalt,12,2));st.rotation.x=-Math.PI/2;st.position.set(v?X0+o:X0+CH/2,v?.015:.017,v?Z0+CH/2:Z0+o);st.receiveShadow=true;ch.g.add(st);
  for(let j=2;j<CH;j+=8){const l=new THREE.Mesh(v?lineGV:lineGH,lineM);l.rotation.x=-Math.PI/2;l.position.set(v?X0+o:X0+j,.02,v?Z0+j:Z0+o);ch.g.add(l)}}
 yield;
 // edificios
 for(const bi of[0,1])for(const bj of[0,1]){const cx=X0+bi*G+G/2,cz=Z0+bj*G+G/2;
  for(const[ox,oz]of[[-6,-6],[6,-6],[-6,6],[6,6]]){const x=cx+ox,z=cz+oz;let a=rnd(),w=7+rnd()*3,d=7+rnd()*3,h=4+rnd()*12;if(bio>=3)continue;if(bio==1){w-=2;d-=2;h=3+h*.25}if(bio==2){w=6;d=6;h=3+h*.1;if(a<.4)continue}if(nearBase(x,z,8)||a<.15)continue;if(bio==2){const yd=new THREE.Mesh(new THREE.PlaneGeometry(10,10),M(0x7cb342));yd.rotation.x=-Math.PI/2;yd.position.set(x,.014,z);CUR.g.add(yd);const hn=['casa','casa2','casa3'][Math.floor(rnd()*3)],HH=5+rnd()*1.5,P=prop(hn,x,z,HH,[0,Math.PI/2,Math.PI,-Math.PI/2][Math.floor(rnd()*4)]);if(P){const e=Math.max(P.w,P.d)*HH/2;CUR.rects.push({x,z,w:e,d:e,h:HH});CUR.hide.push([x+e+1,z]);fence(x,z,e*2+3,e*2+3);continue}}building(x,z,w,d,h);if(bio>=1)fence(x,z,w+(bio==2?3:1.6),d+(bio==2?3:1.6));CUR.blds[CUR.blds.length-1].k=[bi,bj,ox,oz];yield}}
 for(const bi of[0,1])for(const bj of[0,1]){if(bio>=2)continue;const B=CUR.blds.filter(b=>b.k[0]==bi&&b.k[1]==bj);const at=(ox,oz)=>B.find(b=>b.k[2]==ox&&b.k[3]==oz);let nz=0;
  for(const[p,q]of[[[-6,-6],[6,-6]],[[-6,6],[6,6]],[[-6,-6],[-6,6]],[[6,-6],[6,6]]]){const b1=at(...p),b2=at(...q),r=rnd();if(!b1||!b2||r>.55||nz>=2)continue;nz++;const vx=p[0]!=q[0];
   mkZip(b1,b2,vx)}}
 for(const[p,q,vx]of[[[0,0,6,-6],[1,0,-6,-6],1],[[0,0,6,6],[1,0,-6,6],1],[[0,1,6,-6],[1,1,-6,-6],1],[[0,1,6,6],[1,1,-6,6],1],[[0,0,-6,6],[0,1,-6,-6],0],[[0,0,6,6],[0,1,6,-6],0],[[1,0,-6,6],[1,1,-6,-6],0],[[1,0,6,6],[1,1,6,-6],0]]){const f=k=>CUR.blds.find(b=>b.k.join()==k.join());const b1=f(p),b2=f(q),r=rnd();if(bio<2&&b1&&b2&&r<.3)mkZip(b1,b2,vx)}
 // botín en techos (alcanzables: escalera o tirolesa)
 ch.rl=[];CUR.blds.forEach((b,n)=>{const r=rnd(),t=rnd();if(!(b.lad||b.zip)||r>.5)return;const ox=(rnd()-.5)*(b.w-3),oz=(rnd()-.5)*(b.d-3);ch.rl.push([t<.3?'caja':t<.55?'moneda':t<.75?'fruta':t<.9?'arma':'armadura',b.x+ox,b.top,b.z+oz,n,[1,2,3,4,5][Math.floor(rnd()*5)]])})
 // autos
 for(let i=0;i<(bio>=3?0:bio==2?2:5);i++){const v=rnd()<.5,o=rnd()<.5?0:G,t=rnd()*CH,sd=rnd()<.5?-2.5:2.5;let x=v?X0+o+sd:X0+t,z=v?Z0+t:Z0+o+sd;if(nearBase(x,z,4)){rnd();continue}
 const g=new THREE.Group();if(CARS.length){const cv=CARS[Math.abs(i*7+Math.round(X0/CH)*3+Math.round(Z0/CH)*5)%CARS.length];const cm=new THREE.Mesh(cv,CARM);cm.castShadow=true;cm.receiveShadow=!LOW;g.add(cm)}else{const b=box(2,1,4,ccol[i%6]);b.position.y=.7;const tp=box(1.8,.7,2,0x8fb3c9);tp.position.set(0,1.5,-.2);const rf=box(1.84,.12,2.04,ccol[i%6]);rf.position.set(0,1.88,-.2);
 const bm=box(2.05,.25,.2,0x9e9e9e);bm.position.set(0,.45,2.05);const bm2=bm.clone();bm2.position.z=-2.05;const hl=box(.4,.2,.05,0xfff59d);hl.position.set(-.6,.8,2.01);const hl2=hl.clone();hl2.position.x=.6;
 const tl=box(.4,.2,.05,0xd32f2f);tl.position.set(-.6,.8,-2.01);const tl2=tl.clone();tl2.position.x=.6;g.add(b,tp,rf,bm,bm2,hl,hl2,tl,tl2);
 for(const[wx,wz]of[[-1,1.3],[1,1.3],[-1,-1.3],[1,-1.3]]){const w=new THREE.Mesh(cg('wheel',()=>new THREE.CylinderGeometry(.4,.4,.3,10)),M(0x111111));w.rotation.z=Math.PI/2;w.position.set(wx,.4,wz);g.add(w)}}
 g.position.set(x,0,z);g.rotation.y=(v?0:Math.PI/2)+(rnd()-.5)*.6;if(rnd()<.2)g.rotation.z=.15;CUR.g.add(g);CUR.rects.push({x,z,w:v?1.4:2.4,d:v?2.4:1.4,h:1.5});CUR.hide.push([x+(v?2:0),z+(v?0:2)])}
 yield;
 // escombros
 for(let i=0;i<10;i++){const x=X0+rnd()*CH,z=Z0+rnd()*CH;const r=box(.5+rnd(),.3+rnd()*.5,.5+rnd(),0x777066);if(nearBase(x,z,3))continue;r.position.set(x,.2,z);r.rotation.y=rnd()*3;ch.g.add(r)}
 // postes de luz
 if(bio<3)for(const o of[0,G])for(const j of[G/2,G+G/2]){const x=X0+o+5.5,z=Z0+j;if(nearBase(x,z,3))continue;const g=new THREE.Group();const p=box(.2,5,.2,0x444444);p.position.y=2.5;const arm=box(1.2,.15,.15,0x444444);arm.position.set(-.6,5,0);
  const bulb=new THREE.Mesh(lampBulbG,lampBulbM);bulb.position.set(-1.2,4.85,0);g.add(p,arm,bulb);g.position.set(x,0,z);ch.g.add(g);ch.obst.push({x,z,r:.3});ch.lamps.push(new THREE.Vector3(x-1.2,4.85,z))}
 yield;if(bio<3)decor(X0,Z0);yield;
 // armas, cajas y frutas del chunk (ids persistentes por chunk)
 const hp=ch.hide.filter(p=>cfree(p[0],p[1]));ch.wp=null;ch.cr=null;
 if(rnd()<.55&&hp.length){const p=hp[Math.floor(rnd()*hp.length)];ch.wp=[[1,1,2,2,3,4,5][Math.floor(rnd()*7)],p[0],p[1]]}
 if(rnd()<.4){for(let n=0;n<20;n++){const x=X0+5+rnd()*50,z=Z0+5+rnd()*50;if(cfree(x,z)){ch.cr=[x,z];break}}}
 ch.ar=null;if(rnd()<(bio>=3?.35:.22)){const kd=['casco','chaleco','escudo'][Math.floor(rnd()*3)],tr=rnd()<[.05,.1,.2,.35,.45][bio]?2:1;for(let n=0;n<12;n++){const x=X0+5+rnd()*50,z=Z0+5+rnd()*50;if(cfree(x,z)){ch.ar=[kd,tr,x,z];break}}}
 ch.fr=[];for(let k=0;k<3;k++){if(rnd()>=.6)continue;for(let n=0;n<8;n++){const x=X0+5+rnd()*50,z=Z0+5+rnd()*50;if(cfree(x,z)){ch.fr.push([x,z,k]);break}}}
 yield* mergeChunk(ch);CUR=null;return ch}
function genChunk(ci,cj){const it=genChunkG(ci,cj);const pg=GEN;GEN=true;let r;while(!(r=it.next()).done);GEN=pg;return r.value}
const lineGV=new THREE.PlaneGeometry(.3,3),lineGH=new THREE.PlaneGeometry(3,.3),lineM=new THREE.MeshBasicMaterial({color:0xd8c860}),lampBulbG=new THREE.SphereGeometry(.25,8,6);SHARED.add(lineGV).add(lineGH).add(lineM).add(lampBulbG);
function* mergeChunk(ch){ch.g.updateMatrixWorld(true);const groups=new Map(),rm=[];const inv=new THREE.Matrix4().copy(ch.g.matrixWorld).invert();
 ch.g.traverse(o=>{if(!o.isMesh||o.material===dRingM||o.geometry===lampBulbG||Array.isArray(o.material))return;const k=o.material.uuid+(o.castShadow?'s':'');let a=groups.get(k);if(!a)groups.set(k,a={m:o.material,s:o.castShadow,r:o.receiveShadow,list:[]});a.list.push(o)});
 yield;let n=0;for(const a of groups.values()){if(a.list.length<2)continue;const gs=a.list.map(o=>{let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld));for(const k of Object.keys(g.attributes))if(!['position','normal',a.m===PROPM?'color':'uv'].includes(k))g.deleteAttribute(k);return g});
  const mg=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!mg)continue;const mm=new THREE.Mesh(mg,a.m);mm.castShadow=a.s;mm.receiveShadow=a.r;ch.g.add(mm);a.list.forEach(o=>{o.parent.remove(o);if(!SHARED.has(o.geometry))o.geometry.dispose()});if(++n%6==0)yield}
 // quitar grupos vacíos
 const empty=[];ch.g.traverse(o=>{if(o!==ch.g&&o.isGroup&&!o.children.length)empty.push(o)});empty.forEach(o=>o.parent.remove(o))}
const genQ=[];function stepGen(budget){const t0=performance.now();while(genQ.length&&performance.now()-t0<budget){const j=genQ[0];if(chunks.has(j.key)){genQ.shift();continue}const pc=CUR,ps=seed;if(j.seed!==undefined){seed=j.seed;CUR=j.ch}GEN=true;let r;try{r=j.it.next()}finally{GEN=false}if(!j.ch)j.ch=r.value;j.seed=seed;CUR=pc;seed=ps;if(r.done){genQ.shift();finishChunk(r.value)}}}
function queueChunk(ci,cj){const key=ci+','+cj;if(chunks.has(key)||genQ.some(j=>j.key==key))return;genQ.push({key,ci,cj,it:genChunkG(ci,cj)})}
function chunkKeyOf(id){return String(id).split('|')[0]}
function isTaken(id){return !!(S&&S.ck&&S.ck[chunkKeyOf(id)]?.includes(id))||!!(S&&S.looted&&S.looted.includes(id))}
function markTaken(id){if(!id)return;S.ck??={};(S.ck[chunkKeyOf(id)]??=[]).push(id);if(NET)netSend({t:'tk',id})}
function chunkFruits(ch){const per=S?Math.floor(S.day/3):0;ch.fr.forEach(([x,z,k])=>{const id=ch.key+'|f'+k+'_'+per;if(!isTaken(id)&&!loot.some(l=>l.userData.id==id)){const l=addLoot('fruta',x,z,id);l.userData.ck=ch.key}})}
function loadChunk(ci,cj){const k=ci+','+cj;const qi=genQ.findIndex(j=>j.key==k);if(qi>=0)genQ.splice(qi,1);return finishChunk(genChunk(ci,cj))}
function finishChunk(ch){scene.add(ch.g);chunks.set(ch.key,ch);
 ch.obst.forEach(o=>{o.ck=ch.key;obst.push(o)});ch.rects.forEach(r=>{r.ck=ch.key;rects.push(r)});ch.doors.forEach(d=>{d.ck=ch.key;doors.push(d)});ch.lamps.forEach(p=>{p.ck=ch.key;lampPos.push(p)});ch.ladders.forEach(p=>{p.ck=ch.key;ladders.push(p)});ch.zips.forEach(p=>{p.ck=ch.key;zips.push(p)});
 ch.g.traverse(o=>{if(o.geometry===lampBulbG)lamps.push(o)});
 if(ch.wp&&!isTaken(ch.key+'|w')){addPickup(...ch.wp);const p=pickups[pickups.length-1];p.userData.ck=ch.key;p.userData.id=ch.key+'|w'}
 (ch.rl||[]).forEach(([t,x,y,z,n,w])=>{const id=ch.key+'|r'+n;if(isTaken(id))return;if(t=='caja'){addCrate(x,z);const c=crates.at(-1);c.position.y=y;c.userData.ck=ch.key;c.userData.id=id}else if(t=='armadura'){addArmor(['casco','chaleco','escudo'][w%3],ch.bio>=3?2:1,x,z,id,y,ch.key)}else if(t=='arma'){addPickup(w,x,z);const p=pickups.at(-1);p.position.y=y;p.userData.ck=ch.key;p.userData.id=id}else if(!loot.some(l=>l.userData.id==id)){const l=addLoot(t,x,z,id);l.position.y=y;l.userData.ck=ch.key}});
 if(ch.ar&&!isTaken(ch.key+'|a'))addArmor(ch.ar[0],ch.ar[1],ch.ar[2],ch.ar[3],ch.key+'|a',0,ch.key);
 if(ch.cr&&!isTaken(ch.key+'|c')){addCrate(...ch.cr);const c=crates[crates.length-1];c.userData.ck=ch.key;c.userData.id=ch.key+'|c'}
 chunkFruits(ch);return ch}
const keep=(arr,f)=>{let j=0;for(let i=0;i<arr.length;i++)if(f(arr[i]))arr[j++]=arr[i];arr.length=j};
function disposeObj(root){root.traverse(o=>{if(o.geometry&&!SHARED.has(o.geometry))o.geometry.dispose();const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(m=>{if(SHARED.has(m)||Object.values(pMats).includes(m))return;if(m.map&&!Object.values(T).includes(m.map))m.map.dispose();m.dispose()});if(o.isLight&&o.dispose)o.dispose()})}
function unloadChunk(ch){scene.remove(ch.g);disposeObj(ch.g);chunks.delete(ch.key);const k=ch.key,nk=o=>o.ck!==k;
 keep(obst,nk);keep(rects,nk);keep(ladders,nk);keep(zips,nk);keep(doors,nk);keep(lampPos,nk);keep(lamps,b=>{let p=b;while(p.parent)p=p.parent;return p===scene});
 for(let i=armors.length-1;i>=0;i--)if(armors[i].userData.ck===k){scene.remove(armors[i]);armors.splice(i,1)}
 for(const arr of[loot,pickups,crates])keep(arr,o=>{if(o.userData.ck===k){scene.remove(o);disposeObj(o);return false}return true})}
const CR=1;let chT=0;
function updChunks(force){const ci=Math.floor(player.position.x/CH),cj=Math.floor(player.position.z/CH);
 for(const ch of[...chunks.values()])if(Math.max(Math.abs(ch.ci-ci),Math.abs(ch.cj-cj))>CR+1)unloadChunk(ch);
 const need=[];for(let i=-CR;i<=CR;i++)for(let j=-CR;j<=CR;j++)if(!chunks.has((ci+i)+','+(cj+j)))need.push([ci+i,cj+j,i*i+j*j]);need.sort((a,b)=>a[2]-b[2]);
 if(force)need.forEach(n=>loadChunk(n[0],n[1]));else{need.forEach(n=>queueChunk(n[0],n[1]));const vx=player.position.x-(updChunks.px??player.position.x),vz=player.position.z-(updChunks.pz??player.position.z);if(Math.hypot(vx,vz)>.3){const ax=player.position.x+vx/Math.hypot(vx,vz)*CH*.9,az=player.position.z+vz/Math.hypot(vx,vz)*CH*.9;const ai=Math.floor(ax/CH),aj=Math.floor(az/CH);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)if(Math.max(Math.abs(ai+i-ci),Math.abs(aj+j-cj))<=CR+1)queueChunk(ai+i,aj+j)}}
 keep(genQ,j=>Math.max(Math.abs(j.ci-ci),Math.abs(j.cj-cj))<=CR+1);updChunks.px=player.position.x;updChunks.pz=player.position.z;
 // limpia cosas sueltas muy lejos (monedas, cajas globales)
 const far=o=>Math.hypot(o.position.x-player.position.x,o.position.z-player.position.z)>CH*(CR+2);
 keep(loot,o=>{if(!o.userData.ck&&!o.userData.room&&far(o)){scene.remove(o);disposeObj(o);return false}return true})}
function resetChunks(){genQ.length=0;for(const ch of[...chunks.values()])unloadChunk(ch)}
const lampL=[];for(let i=0;i<(LOW?3:8);i++){const l=new THREE.PointLight(0xffb866,0,20,1.4);scene.add(l);lampL.push(l)}
function decor(X0,Z0){const spots=[];for(let n=0;n<60&&spots.length<(LOW?12:20);n++){const v=rnd()<.5,o=rnd()<.5?0:G,t=rnd()*CH,of=(rnd()<.5?-1:1)*(6+rnd()*1.5);const x=v?X0+o+of:X0+t,z=v?Z0+t:Z0+o+of;if(!cfree(x,z))continue;spots.push([x,z,v])}
 spots.forEach(([x,z,v],i)=>{const r=i%5,g=new THREE.Group();g.position.set(x,0,z);
  if(r==0){const tr=new THREE.Mesh(cg('trunk',()=>new THREE.CylinderGeometry(.18,.25,2.2,7)),M(0x6d4c2f));tr.position.y=1.1;tr.castShadow=true;g.add(tr);for(let j=0;j<3;j++){const lf=new THREE.Mesh(cg('leaf'+j,()=>new THREE.IcosahedronGeometry(1.1-j*.2,0)),M([0x388e3c,0x43a047,0x2e7d32][j]));lf.position.set((rnd()-.5)*.6,2.4+j*.7,(rnd()-.5)*.6);lf.castShadow=true;g.add(lf)}CUR.obst.push({x,z,r:.4})}
  else if(r==1){for(let j=0;j<3;j++){const bu=new THREE.Mesh((q=>cg('bush'+q,()=>new THREE.IcosahedronGeometry(.5+q*.1,0)))(Math.floor(rnd()*3)),M(0x558b2f));bu.position.set((rnd()-.5)*1.2,.4,(rnd()-.5)*1.2);bu.castShadow=true;g.add(bu)}}
  else if(r==2){const tc=new THREE.Mesh(cg('tc',()=>new THREE.CylinderGeometry(.4,.35,1,10)),M(0x546e7a));tc.position.y=.5;tc.castShadow=true;const lid=new THREE.Mesh(cg('lid',()=>new THREE.CylinderGeometry(.45,.45,.1,10)),M(0x37474f));lid.position.set(.2,1.05,0);lid.rotation.z=rnd()<.5?.5:0;g.add(tc,lid);CUR.obst.push({x,z,r:.4,h:1.1})}
  else if(r==3){for(let j=0;j<5;j++){if(rnd()<.35)continue;const pl=box(.12,1.2,.6,0xa1887f);pl.position.set(0,.6,j*.65-1.3);pl.rotation.x=(rnd()-.5)*.5;if(rnd()<.25){pl.rotation.z=1.4;pl.position.y=.1}g.add(pl)}const rl=box(.08,.1,3,0x8d6e63);rl.position.set(0,.9,0);rl.rotation.x=.12;g.add(rl);g.rotation.y=v?0:Math.PI/2}
  else if(i%10==4){const cs=box(1.2,1.2,1.2,0xa1662f);cs.position.y=.6;const c2=box(.8,.8,.8,0x8d5524);c2.position.set(.1,1.6,.1);c2.rotation.y=.4;const br=new THREE.Mesh(cg('barrel',()=>new THREE.CylinderGeometry(.42,.42,1.1,12)),M(0xc62828));br.position.set(1.3,.55,0);br.castShadow=true;g.add(cs,c2,br);CUR.rects.push({x,z,w:.9,d:.9,h:1.2});CUR.obst.push({x:x+1.3,z,r:.42,h:1.1})}
  else{for(let j=0;j<4;j++){const d=box(.3+rnd()*.5,.2+rnd()*.3,.3+rnd()*.5,[0x795548,0x9e9e9e,0x6d6d6d][j%3]);d.position.set((rnd()-.5)*1.5,.15,(rnd()-.5)*1.5);d.rotation.y=rnd()*3;g.add(d)}}
  CUR.g.add(g)})}
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:900},()=>(Math.random()-.5)*400).map((v,i)=>i%3==1?Math.abs(v)/2+60:v),3)),new THREE.PointsMaterial({color:0xffffff,size:.8}));scene.add(stars);
// armas
const WEAP=[{n:'Puños',i:'👊',m:1,dmg:1,rng:1.7,cd:.4,kb:2},{n:'Bate',i:'🏏',m:1,dmg:2,rng:2.3,cd:.5,kb:4,c:0xc49a6c,len:1.3},{n:'Tubo',i:'🔧',m:1,dmg:2,rng:2.4,cd:.4,kb:3,c:0x9e9e9e,len:1.4},
 {n:'Palo-machete',i:'🗡️',m:1,dmg:3,rng:2.5,cd:.45,kb:3,c:0x8bc34a,len:1.5},{n:'Pistola de agua',i:'🔫',m:0,dmg:1,cd:.3,sz:.2,sp:28},{n:'Lanzador gigante',i:'💦',m:0,dmg:3,cd:.7,sz:.45,sp:22}];
const pickups=[];
function addPickup(w,x,z){const g=new THREE.Group();const W=WEAP[w];const m=W.m?box(.2,W.len,.2,W.c):box(.8,.5,.3,w==4?0x29b6f6:0xff7043);m.position.y=1;m.rotation.z=.6;
 const glow=new THREE.Mesh(new THREE.RingGeometry(.6,.8,24),new THREE.MeshBasicMaterial({color:0xffeb3b,side:2}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;g.add(m,glow);g.position.set(x,0,z);g.userData.w=w;scene.add(g);pickups.push(g);refreshPickup(g)}
// Jugador
const player=new THREE.Group();const body=box(.9,1.1,.5,0x1e88e5);body.position.y=1.25;const head=box(.6,.6,.6,0xffcc99);head.position.y=2.1;
const cap=box(.65,.2,.65,0xe53935);cap.position.y=2.45;const legs=box(.8,.7,.45,0x37474f);legs.position.y=.35;const arm=new THREE.Group();arm.position.set(.6,1.6,0);const armM=box(.25,.25,.8,0xffcc99);armM.position.z=-.4;arm.add(armM);const held=box(.15,1,.15,0xffffff);held.position.set(0,.4,-.8);held.visible=false;arm.add(held);
legs.visible=false;const mkLimb=(w,h,c,px,py)=>{const p=new THREE.Group();p.position.set(px,py,0);const m=box(w,h,w,c);m.position.y=-h/2;p.add(m);return p};
const legL=mkLimb(.35,.75,0x37474f,-.22,.75),legR=mkLimb(.35,.75,0x37474f,.22,.75),armL=mkLimb(.25,.8,0x1e88e5,-.6,1.75);
const shoe=box(.38,.15,.45,0x212121);shoe.position.set(0,-.72,.05);legL.add(shoe);const shoe2=shoe.clone();legR.add(shoe2);const hand=box(.28,.28,.28,0xffcc99);hand.position.z=-.85;arm.add(hand);
const eyeP=box(.1,.1,.05,0x222222);eyeP.position.set(-.13,2.15,-.31);const eyeP2=eyeP.clone();eyeP2.position.x=.13;const bp=box(.6,.7,.3,0xff9800);bp.position.set(0,1.3,.38);
player.add(body,head,cap,legs,arm,legL,legR,armL,eyeP,eyeP2,bp);let walkT=0;scene.add(player);let swing=0;
// ===== Modelos 3D (GLB) con respaldo a los modelos de bloques =====
const MOD={};const mixers=new Set();const _v=new THREE.Vector3();
function fitModel(o,h){o.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(o);const sc=h/Math.max(.01,bb.max.y-bb.min.y);o.scale.multiplyScalar(sc);o.updateMatrixWorld(true);const b2=new THREE.Box3().setFromObject(o);o.position.y-=b2.min.y;
 o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=!LOW;m.frustumCulled=false}})}
function rig(o,clips){const mx=new THREE.AnimationMixer(o);const acts={};clips.forEach(c=>acts[c.name]=mx.clipAction(c));mixers.add(mx);
 const r={mx,acts,cur:null,play(n,fade=.2,once=false,ts=1){const a=acts[n];if(!a)return;a.timeScale=ts;if(r.cur===a&&!once)return;if(once){a.reset();a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true}else a.setLoop(THREE.LoopRepeat);
  a.enabled=true;a.setEffectiveWeight(1);if(r.cur&&r.cur!==a)a.crossFadeFrom(r.cur,fade,false);a.play();r.cur=a;r.lock=once?a.getClip().duration/ts:0}};return r}
const blocky=[body,head,cap,armM,hand,legL,legR,armL,eyeP,eyeP2,bp];let pRig=null,pModel=null;
const loader=new GLTFLoader();const loadM=u=>new Promise((ok,ko)=>loader.load(u,ok,undefined,ko));
// autos Kenney (CC0): una geometría fusionada por variante + 1 material compartido
const XM={},PROPS={},PROPM=new THREE.MeshLambertMaterial({vertexColors:true});SHARED.add(PROPM);
const XURL={serpiente:'animales/snake',mono:'animales/mono',arana:'animales/arana',cactoro:'animales/cactoro',zorro:'animales/zorro',casco:'armadura/casco',chaleco:'armadura/chaleco',chaleco2:'armadura/chaleco2',escudo:'armadura/escudo',escudo2:'armadura/escudo2'},PURL=['palmera','cactus','cactus2','roca','roca2','casa','casa2','casa3'];
const _tp=new Map();function texPx(t){if(_tp.has(t))return _tp.get(t);let r=null;try{const im=t.image,w=im.width,h=im.height,cv=document.createElement('canvas');cv.width=w;cv.height=h;const x=cv.getContext('2d');x.drawImage(im,0,0);r={w,h,d:x.getImageData(0,0,w,h).data}}catch(e){}_tp.set(t,r);return r}
function bakeProp(gl){const sc=gl.scene;sc.updateMatrixWorld(true);const gs=[];sc.traverse(o=>{if(!o.isMesh)return;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);const ms=Array.isArray(o.material)?o.material:[o.material];const n=g.attributes.position.count,col=new Float32Array(n*3);
 const grp=g.groups.length?g.groups:[{start:0,count:n,materialIndex:0}];const uv=g.attributes.uv;for(const gr of grp){const m=ms[gr.materialIndex]||ms[0];const c=(m.color||new THREE.Color(1,1,1)).clone();const px=m.map&&uv?texPx(m.map):null;const t=new THREE.Color();for(let i=gr.start;i<gr.start+gr.count&&i<n;i++){if(px){let u=uv.getX(i)%1,v=uv.getY(i)%1;if(u<0)u+=1;if(v<0)v+=1;const X=Math.min(px.w-1,Math.floor(u*px.w)),Y=Math.min(px.h-1,Math.floor(v*px.h)),o=(Y*px.w+X)*4;t.setRGB(px.d[o]/255,px.d[o+1]/255,px.d[o+2]/255,THREE.SRGBColorSpace).multiply(c);t.toArray(col,i*3)}else c.toArray(col,i*3)}}
 for(const k of Object.keys(g.attributes))if(!['position','normal'].includes(k))g.deleteAttribute(k);g.setAttribute('color',new THREE.BufferAttribute(col,3));g.clearGroups();gs.push(g)});
 if(!gs.length)return null;const geo=mergeGeometries(gs,false);geo.computeBoundingBox();const bb=geo.boundingBox,H=bb.max.y-bb.min.y;geo.translate(-(bb.max.x+bb.min.x)/2,-bb.min.y,-(bb.max.z+bb.min.z)/2);geo.scale(1/H,1/H,1/H);SHARED.add(geo);return{geo,w:(bb.max.x-bb.min.x)/H,d:(bb.max.z-bb.min.z)/H}}
function prop(n,x,z,h,ry=0){const P=PROPS[n];if(!P)return null;const m=new THREE.Mesh(P.geo,PROPM);m.scale.setScalar(h);m.position.set(x,0,z);m.rotation.y=ry;m.castShadow=true;m.receiveShadow=true;CUR.g.add(m);return P}
const xReady=Promise.all(Object.entries(XURL).map(([k,u])=>loadM('models/'+u+'.glb').then(g=>XM[k]=g).catch(e=>console.warn('Modelo extra no cargado:',u,e.message)))).then(()=>{window.__xm=Object.keys(XM);zombies.forEach(attachZ);armors.forEach(refreshArmor);wearArm()});
const propsReady=Promise.all(PURL.map(n=>loadM('models/bioma/'+n+'.glb').then(g=>{const r=bakeProp(g);if(r)PROPS[n]=r}).catch(e=>console.warn('Prop no cargado:',n,e.message)))).then(()=>{window.__props=Object.keys(PROPS);if([...chunks.values()].some(c=>c.bio>=2)){if(inside)carsPend=true;else{resetChunks();updChunks(true)}}});
const CARS=[],CAR_NAMES=['sedan','taxi','police','van','truck','suv'];let CARM=null,carsPend=false;
function bakeCar(gl){const sc=gl.scene;sc.updateMatrixWorld(true);const gs=[];let map=null;
 sc.traverse(o=>{if(!o.isMesh)return;if(!map&&o.material?.map)map=o.material.map;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(!g.attributes.uv)return;gs.push(g)});
 const mg=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!mg)return null;mg.computeBoundingBox();let b=mg.boundingBox;
 if(b.max.x-b.min.x>b.max.z-b.min.z){mg.rotateY(Math.PI/2);mg.computeBoundingBox();b=mg.boundingBox}
 const s=4.3/(b.max.z-b.min.z);mg.translate(-(b.max.x+b.min.x)/2,-b.min.y,-(b.max.z+b.min.z)/2);mg.scale(s,s,s);mg.computeBoundingSphere();SHARED.add(mg);
 if(!CARM&&map){map.colorSpace=THREE.SRGBColorSpace;CARM=new THREE.MeshStandardMaterial({map,roughness:.65,metalness:.15});SHARED.add(CARM);SHARED.add(map)}return mg}
// armas 3D: Kenney Blaster Kit / Survival Kit (CC0) + bate y tubo procedurales compartidos
const WGEO={},WMAT={};const WURL={3:'models/armas/survival/tool-axe.glb',4:'models/armas/blaster/blaster-k.glb',5:'models/armas/blaster/blaster-b.glb'};
function bakeW(gl,size){const sc=gl.scene;sc.updateMatrixWorld(true);const gs=[];let map=null;
 sc.traverse(o=>{if(!o.isMesh)return;if(!map&&o.material?.map)map=o.material.map;let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);if(g.attributes.uv)gs.push(g)});
 const mg=mergeGeometries(gs,false);gs.forEach(g=>g.dispose());if(!mg)return null;mg.computeBoundingBox();const b=mg.boundingBox,sz=new THREE.Vector3();b.getSize(sz);
 const s=size/Math.max(sz.x,sz.y,sz.z);mg.translate(-(b.max.x+b.min.x)/2,-(b.max.y+b.min.y)/2,-(b.max.z+b.min.z)/2);mg.scale(s,s,s);mg.computeBoundingSphere();SHARED.add(mg);
 let mat=null;if(map){const k=map.image?.src||'m';mat=WMAT[k];if(!mat){map.colorSpace=THREE.SRGBColorSpace;mat=WMAT[k]=new THREE.MeshStandardMaterial({map,roughness:.6});SHARED.add(mat);SHARED.add(map)}}return mat?{geo:mg,mat}:null}
(function procW(){// bate: torno de madera; tubo: tubería con codos
 const bp=[[0,0],[.05,0],[.055,.03],[.04,.06],[.04,.45],[.07,.85],[.085,1.15],[.08,1.25],[0,1.27]].map(([x,y])=>new THREE.Vector2(x,y));const bat=new THREE.LatheGeometry(bp,10);bat.translate(0,-.6,0);
 const bm=new THREE.MeshStandardMaterial({color:0xc49a6c,roughness:.7});const tape=new THREE.CylinderGeometry(.047,.047,.3,10);tape.translate(0,-.35,0);
 WGEO[1]={geo:mergeGeometries([bat.toNonIndexed(),tape.toNonIndexed()].map(g=>{g.deleteAttribute('uv');return g}),true),mat:[bm,new THREE.MeshStandardMaterial({color:0x212121,roughness:.9})]};
 const p=new THREE.CylinderGeometry(.06,.06,1.3,10);const j1=new THREE.CylinderGeometry(.085,.085,.14,10);j1.translate(0,.62,0);const j2=j1.clone();j2.translate(0,-1.24,0);const v=new THREE.TorusGeometry(.09,.025,6,12);v.rotateX(Math.PI/2);v.translate(0,.72,0);
 WGEO[2]={geo:mergeGeometries([p,j1,j2,v].map(g=>{g=g.index?g.toNonIndexed():g;g.deleteAttribute('uv');return g}),true),mat:[new THREE.MeshStandardMaterial({color:0x9e9e9e,metalness:.7,roughness:.35}),new THREE.MeshStandardMaterial({color:0x616161,metalness:.6,roughness:.4}),new THREE.MeshStandardMaterial({color:0x616161,metalness:.6,roughness:.4}),new THREE.MeshStandardMaterial({color:0xd32f2f,roughness:.5})]};
 for(const k of[1,2]){SHARED.add(WGEO[k].geo);WGEO[k].mat.forEach(m=>SHARED.add(m))}})();
const weapReady=Promise.all(Object.entries(WURL).map(([w,u])=>loadM(u).then(gl=>{const r=bakeW(gl,w==3?1.3:w==5?1.2:.8);if(r)WGEO[w]=r}).catch(e=>console.warn('Arma no cargada, uso bloques:',u,e.message)))).then(()=>{window.__weap=Object.keys(WGEO);pickups.forEach(refreshPickup);handW=-1;if(S)updW()});
// orientación: rot del modelo para "mano" (eje largo hacia delante) y para el suelo
const WROT={1:[Math.PI/2,0,0],2:[Math.PI/2,0,0],3:[Math.PI/2,0,0],4:[0,Math.PI,0],5:[0,Math.PI,0]};
// agarre por arma en el hueso Wrist.R (ejes del hueso: Y=dedos, -X=delante, Z=afuera). b=[img X,img Y,img Z] de los ejes del modelo
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
const GRIP={1:{b:[V3(0,0,1),V3(-1,0,0),V3(0,-1,0)],p:[-.45,.09,0]},2:{b:[V3(0,0,1),V3(-1,0,0),V3(0,-1,0)],p:[-.5,.09,0]},3:{b:[V3(0,0,1),V3(-1,0,0),V3(0,-1,0)],p:[-.45,.09,0]},
 4:{b:[V3(0,0,1),V3(0,-1,0),V3(1,0,0)],p:[0,.0,0]},5:{b:[V3(0,0,1),V3(0,-1,0),V3(1,0,0)],p:[0,0,0]}};
function gripApply(m,w){const g=GRIP[w];if(!g)return;const M4=new THREE.Matrix4().makeBasis(...g.b);m.quaternion.setFromRotationMatrix(M4);m.position.set(...g.p);m.scale.setScalar(g.s||1)}
window.__GRIP=GRIP;window.__regrip=()=>{handW=-1;updHeld()};
function wMesh(w){const d=WGEO[w];if(!d)return null;const m=new THREE.Mesh(d.geo,d.mat);m.castShadow=true;m.userData.wm=1;return m}
function refreshPickup(pk){const w=pk.userData.w;if(w===undefined||!WGEO[w]||pk.userData.has3d)return;const old=pk.children[0];const m=wMesh(w);if(!m||!old)return;m.position.copy(old.position);m.rotation.set(w>=4?0:0,0,w>=4?0:.6);if(w>=4){m.rotation.y=Math.PI/2}pk.remove(old);if(!SHARED.has(old.geometry))old.geometry.dispose?.();pk.add(m);pk.userData.has3d=1}
let handG=null,handW=-1;
function updHeld(){if(!S)return;const w=S.cur;if(!handG&&pModel){let bone=null;pModel.traverse(o=>{if(!bone&&/Wrist\.?R|Hand_?R|RightHand/i.test(o.name))bone=o});if(bone){handG=new THREE.Group();bone.add(handG);bone.updateMatrixWorld(true);const ws=new THREE.Vector3();bone.getWorldScale(ws);handG.scale.setScalar(1/ws.x)}}
 if(!handG){window.__held='box';return}if(handW===w)return;handW=w;while(handG.children.length)handG.remove(handG.children[0]);const m=w>0?wMesh(w):null;
 if(m){gripApply(m,w);handG.add(m)}window.__held=m?'3d':'none';held.userData.off=!!m||w==0}
const carsReady=Promise.all(CAR_NAMES.map(n=>loadM('models/autos/'+n+'.glb').then(bakeCar).catch(e=>{console.warn('Auto no cargado, uso cajas:',n,e.message);return null}))).then(gs=>{
 if(!CARM)return;gs.forEach(g=>g&&CARS.push(g));window.__cars=CARS.length;if(CARS.length&&chunks.size){if(inside)carsPend=true;else{resetChunks();updChunks(true)}}});
const modelsReady=Promise.all([['jugador','models/jugador.glb'],['zombie','models/zombie.glb'],['comerciante','models/comerciante.glb']].map(([k,u])=>loadM(u).then(g=>MOD[k]=g).catch(e=>console.warn('Modelo no cargado, uso bloques:',u,e.message)))).then(()=>{
 if(MOD.jugador){MOD.pSrc=SkeletonUtils.clone(MOD.jugador.scene);pModel=MOD.jugador.scene;fitModel(pModel,2.3);pModel.rotation.y=Math.PI;player.add(pModel);blocky.forEach(b=>b.visible=false);pRig=rig(pModel,MOD.jugador.animations);setTimeout(wearArm,0);pRig.play('Idle')}
 if(MOD.comerciante){const m=MOD.comerciante.scene;fitModel(m,2.3);merchant.add(m);merchantBlock.visible=false;merchant.userData.rig=rig(m,MOD.comerciante.animations);merchant.userData.rig.play('Idle')}
 zombies.forEach(attachZ);window.__models=Object.keys(MOD);if(!MOD.zombie)retryZ(1)});
function retryZ(n){if(n>4||MOD.zombie)return;setTimeout(()=>loadM('models/zombie.glb?r='+n).then(g=>{MOD.zombie=g;zombies.forEach(attachZ)}).catch(()=>retryZ(n+1)),1500*n)}
// Comerciante junto a la casa
const merchant=new THREE.Group();const merchantBlock=new THREE.Group();{const b1=box(.9,1.1,.5,0x8d6e63);b1.position.y=1.25;const h1=box(.6,.6,.6,0xffcc99);h1.position.y=2.1;const ht=box(1,.12,1,0xd7b56d);ht.position.y=2.45;const l1=box(.8,.7,.45,0x5d4037);l1.position.y=.35;merchantBlock.add(b1,h1,ht,l1)}
merchant.add(merchantBlock);const stall=box(2.2,1,1,0x8d6e63);stall.position.set(0,.5,1.1);const awn=box(2.6,.1,1.6,0xe53935);awn.position.set(0,2.6,1.1);merchant.add(stall,awn);
merchant.position.set(4.5,0,2);merchant.rotation.y=-.6;scene.add(merchant);const mObst={x:4.5,z:2,r:1.2};obst.push(mObst);let merchantT=0;
const RIGA={Walk:/walk|gallop/i,Run:/gallop|run|walk/i,Idle:/idle/i,Attack:/attack|bite|punch/i,HitRecieve:/hit/i,Death:/death/i};
function attachZ(g){const K=EK[g.userData.kind||'zombie']||{};const src=K.m?XM[K.m]:MOD.zombie;if(!src||g.userData.model)return;const m=SkeletonUtils.clone(src.scene);fitModel(m,K.fh||2.2);m.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.castShadow=true;if(K.sc)o.frustumCulled=false;if(K.tint&&o.material.color)o.material.color.multiply(new THREE.Color(K.tint))}});
 g.children.forEach(c=>c.visible=false);g.add(m);g.userData.model=m;g.userData.rig=rig(m,src.animations);{const r=g.userData.rig;for(const[n,re]of Object.entries(RIGA))if(!r.acts[n]){const c=src.animations.find(a=>re.test(a.name)&&!/jump/i.test(a.name));if(c)r.acts[n]=r.mx.clipAction(c)}}
 if(K.bat){let hb=null;m.traverse(o=>{if(!hb&&o.isBone&&/(Hand|Wrist|Fist)\.?_?R$/i.test(o.name))hb=o});if(hb){m.updateMatrixWorld(true);const ws=new THREE.Vector3();hb.getWorldScale(ws);const bt=new THREE.Group();bt.scale.setScalar(1/ws.x);const b=box(.14,1.2,.14,0x8d5a2b);b.position.y=.5;const tip=box(.2,.4,.2,0x6d4c2f);tip.position.y=1;bt.add(b,tip);bt.rotation.x=Math.PI/2;hb.add(bt)}}g.userData.rig.play('Walk',0,false,1);g.userData.rig.mx.setTime(Math.random()*2)}window.__mkZ=k=>{makeZ(k);return zombies.at(-1)};
function zFlash(z,on){z.userData.model?.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissive.setHex(on?0x666666:(z.userData.boss?0x4a0072:0))})}
// Burbuja de mordida caricaturesca
const bite=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.strokeStyle='#222';x.lineWidth=6;x.beginPath();x.ellipse(128,60,118,50,0,0,7);x.fill();x.stroke();
 x.fillStyle='#e53935';x.font='bold 54px Arial';x.textAlign='center';x.fillText('¡ÑAM!',128,78);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(2,1,1);sp.visible=false;scene.add(sp);return sp})();let biteT=0;
// ===== Botín, interiores, monedas y tienda =====
const loot=[];let inside=null,shopOpen=false,hintT=0;const rooms={};
const LT={lata:{i:'🥫',n:'Lata de comida'},moneda:{i:'🪙',n:'Monedas'},agua:{i:'💧',n:'Agua para la pistola'},venda:{i:'🩹',n:'Venda'},arma:{i:'🎁',n:'Arma'}};
let COIN=null;function coinMesh(){if(!COIN){const gold=new THREE.MeshStandardMaterial({color:0xffc107,metalness:1,roughness:.25,emissive:0x8a5a00,emissiveIntensity:.6}),dark=new THREE.MeshStandardMaterial({color:0xe6a100,metalness:1,roughness:.35,emissive:0x5a3a00,emissiveIntensity:.5});
 const pr=[];const R=.32,T=.05;[[0,-T],[R-.03,-T],[R,-T+.03],[R,T-.03],[R-.03,T],[0,T]].forEach(p=>pr.push(new THREE.Vector2(p[0],p[1])));const body=new THREE.LatheGeometry(pr,28);
 const rim=new THREE.TorusGeometry(R-.025,.022,8,28);const st=new THREE.Shape();for(let k=0;k<10;k++){const a=k/10*Math.PI*2+Math.PI/2,r=k%2?.075:.17;k?st.lineTo(Math.cos(a)*r,Math.sin(a)*r):st.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
 const star=new THREE.ExtrudeGeometry(st,{depth:.02,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1});const spk=new THREE.SpriteMaterial({color:0xfff8c0,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending});
 COIN={body,rim,star,gold,dark,spk};[body,rim,star].forEach(x=>SHARED.add(x));[gold,dark,spk].forEach(x=>SHARED.add(x))}
 const g=new THREE.Group();const b=new THREE.Mesh(COIN.body,COIN.gold);b.rotation.x=Math.PI/2;g.add(b);[1,-1].forEach(sd=>{const r=new THREE.Mesh(COIN.rim,COIN.dark);r.position.z=sd*.05;g.add(r);const s=new THREE.Mesh(COIN.star,COIN.dark);s.position.z=sd*.05;if(sd<0)s.rotation.y=Math.PI;g.add(s)});
 for(let k=0;k<2;k++){const sp=new THREE.Sprite(COIN.spk);sp.scale.setScalar(.12);sp.userData.spark=k;g.add(sp)}g.userData.coin=1;g.castShadow=true;return g}

// ===== Modelos 3D de comida (geometrías/materiales compartidos) =====
const FG={},FMt={};const fg=(k,f)=>FG[k]||(FG[k]=f(),SHARED.add(FG[k]),FG[k]);const fm=(k,o)=>FMt[k]||(FMt[k]=new THREE.MeshStandardMaterial(typeof o=='function'?o():o),SHARED.add(FMt[k]),FMt[k]);
function labelTex(bg,fg_,txt){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,256,64);x.fillStyle=fg_;x.fillRect(0,6,256,6);x.fillRect(0,52,256,6);x.font='bold 30px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(txt,128,33);x.fillText(txt,0,33);x.fillText(txt,256,33);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
function canMesh(){const g=new THREE.Group();const tin=fm('tin',{color:0xcfd8dc,metalness:.9,roughness:.3});
 const body=new THREE.Mesh(fg('canB',()=>new THREE.CylinderGeometry(.2,.2,.42,18,1,true)),fm('canL',()=>({map:labelTex('#e53935','#ffeb3b','SOPA'),roughness:.6,side:2})));
 const top=new THREE.Mesh(fg('canT',()=>new THREE.CylinderGeometry(.205,.205,.03,18)),tin);top.position.y=.22;const bot=top.clone();bot.position.y=-.22;
 const rim=new THREE.Mesh(fg('canR',()=>new THREE.TorusGeometry(.19,.015,6,18)),tin);rim.rotation.x=Math.PI/2;rim.position.y=.235;const tab=new THREE.Mesh(fg('tab',()=>new THREE.TorusGeometry(.05,.012,5,10)),tin);tab.rotation.x=Math.PI/2;tab.position.set(.07,.24,0);
 g.add(body,top,bot,rim,tab);return g}
function bottleMesh(){const g=new THREE.Group();const b=new THREE.Mesh(fg('btl',()=>new THREE.LatheGeometry([[0,0],[.16,0],[.18,.04],[.18,.42],[.12,.52],[.07,.58],[.07,.66],[0,.66]].map(p=>new THREE.Vector2(p[0],p[1])),16)),fm('btlM',{color:0x4fc3f7,transparent:true,opacity:.7,roughness:.05,metalness:.1,emissive:0x01579b,emissiveIntensity:.3}));
 const w=new THREE.Mesh(fg('btlW',()=>new THREE.CylinderGeometry(.16,.16,.3,16)),fm('water',{color:0x0288d1,transparent:true,opacity:.8,emissive:0x01579b,emissiveIntensity:.5}));w.position.y=.18;
 const cap=new THREE.Mesh(fg('cap',()=>new THREE.CylinderGeometry(.08,.08,.07,12)),fm('capM',{color:0x0d47a1,roughness:.5}));cap.position.y=.69;const lb=new THREE.Mesh(fg('btlLb',()=>new THREE.CylinderGeometry(.185,.185,.14,16,1,true)),fm('btlLbM',()=>({map:labelTex('#ffffff','#29b6f6','AGUA'),side:2})));lb.position.y=.26;
 g.add(b,w,cap,lb);g.position.y=-.3;const o=new THREE.Group();o.add(g);return o}
function medMesh(){const g=new THREE.Group();const b=new THREE.Mesh(fg('medB',()=>new THREE.BoxGeometry(.55,.34,.4)),fm('medW',{color:0xfafafa,roughness:.5}));
 const red=fm('medR',{color:0xe53935,emissive:0x5a0000,emissiveIntensity:.4});const c1=new THREE.Mesh(fg('medC1',()=>new THREE.BoxGeometry(.28,.08,.02)),red),c2=new THREE.Mesh(fg('medC2',()=>new THREE.BoxGeometry(.08,.28,.02)),red);c1.position.z=c2.position.z=.205;const c3=c1.clone(),c4=c2.clone();c3.position.z=c4.position.z=-.205;
 const h=new THREE.Mesh(fg('medH',()=>new THREE.TorusGeometry(.09,.02,6,12,Math.PI)),fm('medG',{color:0x9e9e9e,metalness:.6}));h.position.y=.17;const lid=new THREE.Mesh(fg('medL',()=>new THREE.BoxGeometry(.57,.04,.42)),red);lid.position.y=.15;
 const roll=new THREE.Mesh(fg('roll',()=>new THREE.CylinderGeometry(.07,.07,.2,12)),fm('rollM',{color:0xfff8e1}));roll.rotation.z=Math.PI/2;roll.position.set(.12,.24,.1);
 g.add(b,c1,c2,c3,c4,h,lid,roll);return g}
// frutas mágicas
const leafGeo=()=>{const s=new THREE.Shape();s.moveTo(0,0);s.quadraticCurveTo(.1,.08,0,.22);s.quadraticCurveTo(-.1,.08,0,0);return new THREE.ShapeGeometry(s)};const FRUITS=['manzana','platano','uvas','carambola','sandia'];
function fruitMesh(kind){const g=new THREE.Group();const glow=(c,i=.7)=>fm('fr'+c,{color:c,emissive:c,emissiveIntensity:i,roughness:.35});const stemM=fm('stem',{color:0x6d4c41}),leafM=fm('leaf',{color:0x76ff03,emissive:0x2e7d32,emissiveIntensity:.6,side:2});let col;
 if(kind=='manzana'){col=0xff1744;const a=new THREE.Mesh(fg('apple',()=>{const p=[];for(let i=0;i<=16;i++){const t=i/16*Math.PI;p.push(new THREE.Vector2(Math.sin(t)*.3*(1-.12*Math.cos(t*2))+.001,-Math.cos(t)*.28-.04*Math.sin(t*3)))}return new THREE.LatheGeometry(p,20)}),glow(col));
  const st=new THREE.Mesh(fg('stemG',()=>new THREE.CylinderGeometry(.02,.025,.16,6)),stemM);st.position.y=.32;st.rotation.z=.2;const lf=new THREE.Mesh(fg('leafG',leafGeo),leafM);lf.position.set(.03,.36,0);lf.rotation.z=-1;g.add(a,st,lf)}
 else if(kind=='platano'){col=0xffea00;const cv=new THREE.QuadraticBezierCurve3(new THREE.Vector3(-.35,.15,0),new THREE.Vector3(0,-.25,0),new THREE.Vector3(.35,.15,0));
  for(let k=0;k<3;k++){const b=new THREE.Mesh(fg('ban',()=>new THREE.TubeGeometry(cv,16,.075,7,false)),glow(col));b.position.z=(k-1)*.12;b.rotation.x=(k-1)*.25;g.add(b)}const tip=new THREE.Mesh(fg('banT',()=>new THREE.CylinderGeometry(.03,.05,.1,6)),stemM);tip.position.set(.37,.19,0);tip.rotation.z=-.8;g.add(tip)}
 else if(kind=='uvas'){col=0xb388ff;const gr=fg('grape',()=>new THREE.SphereGeometry(.09,10,8));const rows=[4,3,3,2,1];let y=.15;rows.forEach((n,r)=>{for(let k=0;k<n;k++){const a=k/n*6.28+r;const b=new THREE.Mesh(gr,glow(col,.9));b.position.set(Math.cos(a)*.035*n,y,Math.sin(a)*.035*n);g.add(b)}y-=.12});
  const st=new THREE.Mesh(fg('stemG',()=>new THREE.CylinderGeometry(.02,.025,.16,6)),stemM);st.position.y=.27;const lf=new THREE.Mesh(fg('leafG',leafGeo),leafM);lf.position.set(.05,.28,0);lf.rotation.z=-1.2;lf.scale.setScalar(1.4);g.add(st,lf)}
 else if(kind=='carambola'){col=0xffd600;const st=fg('star',()=>{const s=new THREE.Shape();for(let k=0;k<10;k++){const a=k/10*6.283+Math.PI/2,r=k%2?.13:.3;k?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}const g=new THREE.ExtrudeGeometry(s,{depth:.5,bevelEnabled:true,bevelSize:.05,bevelThickness:.05,bevelSegments:2});g.translate(0,0,-.25);return g});const m=new THREE.Mesh(st,glow(col,.8));m.rotation.x=Math.PI/2;g.add(m)}
 else{col=0x69f0ae;const w=new THREE.Mesh(fg('melon',()=>new THREE.SphereGeometry(.3,18,14)),glow(0x2e7d32,.5));w.scale.set(1,.85,1.25);const sl=new THREE.Mesh(fg('melSl',()=>new THREE.CylinderGeometry(.3,.3,.06,18,1,false,0,Math.PI)),glow(0xff5252,.9));sl.rotation.x=Math.PI/2;sl.position.set(.38,-.05,0);sl.rotation.z=.3;g.add(w,sl)}
 const halo=new THREE.Mesh(fg('halo',()=>new THREE.SphereGeometry(.55,14,10)),fm('halo'+col,{color:col,emissive:col,transparent:true,opacity:.18,depthWrite:false}));g.add(halo);
 for(let k=0;k<4;k++){const sp=new THREE.Sprite((FMt['sp'+col]||(FMt['sp'+col]=new THREE.SpriteMaterial({color:col,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),SHARED.add(FMt['sp'+col]),FMt['sp'+col])));sp.scale.setScalar(.1);sp.userData.spark=k;g.add(sp)}
 g.userData.col=col;g.userData.coin=1;return g}
function crateMesh(){const g=new THREE.Group();const wood=fm('wood',{map:T.wood||null,color:0xb07a45,roughness:.85}),dark=fm('woodD',{color:0x6d4c41,roughness:.9});
 for(let k=0;k<4;k++){const p=new THREE.Mesh(fg('plank',()=>new THREE.BoxGeometry(1,.2,.06)),wood);p.position.set(0,.12+k*.25,.47);g.add(p);const p2=p.clone();p2.position.z=-.47;g.add(p2);const p3=p.clone();p3.rotation.y=Math.PI/2;p3.position.set(.47,.12+k*.25,0);g.add(p3);const p4=p3.clone();p4.position.x=-.47;g.add(p4)}
 const bt=new THREE.Mesh(fg('crB',()=>new THREE.BoxGeometry(1,.06,1)),dark);bt.position.y=.03;g.add(bt);for(const[x,z]of[[.47,.47],[-.47,.47],[.47,-.47],[-.47,-.47]]){const c=new THREE.Mesh(fg('post',()=>new THREE.BoxGeometry(.1,1,.1)),dark);c.position.set(x,.5,z);g.add(c)}
 const cs=[[-.2,-.15],[.15,.18],[.2,-.2]];cs.forEach(([x,z])=>{const c=canMesh();c.position.set(x,.95,z);g.add(c)});const a=fruitMesh('manzana');a.children.forEach(c=>{if(c.isSprite||c.material?.opacity<.5)c.visible=false});a.position.set(-.15,1.05,.2);a.scale.setScalar(.8);g.add(a);
 const br=new THREE.Mesh(fg('bread',()=>new THREE.CapsuleGeometry(.12,.3,4,10)),fm('bread',{color:0xd4a056,roughness:.8}));br.rotation.z=Math.PI/2;br.position.set(.05,1.0,-.05);g.add(br);g.traverse(o=>{if(o.isMesh)o.castShadow=true});return g}
function lootMesh(t){const g=new THREE.Group();let m;
 if(t=='lata'){m=canMesh()}
 else if(t=='moneda'){m=coinMesh()}
 else if(t=='agua'){m=bottleMesh()}
 else if(t=='venda'){m=medMesh()}
 else if(t=='fruta'){m=fruitMesh(FRUITS[Math.floor(Math.random()*FRUITS.length)]);const col=m.userData.col;m.position.y=1.1;const gl=new THREE.Mesh(fg('frRing',()=>new THREE.RingGeometry(.45,.65,20)),FMt['ring'+col]||(FMt['ring'+col]=new THREE.MeshBasicMaterial({color:col,side:2,transparent:true,opacity:.7}),SHARED.add(FMt['ring'+col]),FMt['ring'+col]));gl.rotation.x=-Math.PI/2;gl.position.y=.04;g.add(m,gl);g.userData.t=t;g.userData.fruit=m;g.userData.ph=Math.random()*6;return g}
 else{m=box(.6,.6,.6,0xab47bc);const rb=box(.65,.15,.65,0xffeb3b);m.add(rb)}
 m.position.y=.7;m.castShadow=true;const gl=new THREE.Mesh(new THREE.RingGeometry(.45,.6,20),new THREE.MeshBasicMaterial({color:0xffeb3b,side:2}));gl.rotation.x=-Math.PI/2;gl.position.y=.04;g.add(m,gl);g.userData.t=t;return g}
const FRC=[0xff4081,0x00e5ff,0xffea00,0xb388ff,0x69f0ae,0xff9100];
function spawnFruits(){chunks.forEach(chunkFruits)}
function oldFruits(){const r=srnd(777+S.day*13);for(let k=0;k<10;k++){const id='f'+S.day+'_'+k;let x,z,n=0;do{const a=r()*6.28,d=14+r()*80;x=Math.cos(a)*d;z=Math.sin(a)*d}while(!free(x,z)&&++n<30);if(!S.looted.includes(id)&&!loot.some(l=>l.userData.id==id))addLoot('fruta',x,z,id)}}
function gainXP(n){S.xp+=n;let need=S.lvl*30;while(S.xp>=need){S.xp-=need;S.lvl++;S.maxHp+=20;S.hp=S.maxHp;need=S.lvl*30;banner('⭐ ¡SUBISTE AL NIVEL '+S.lvl+'!<br><small>Vida máxima: ❤️ '+S.maxHp+' · 💪 +8% daño · ¡Salud llena!</small>',5);puff(player.position.clone().setY(1.5),0xffeb3b,30,6,.2,-2,1.2)}}
function addLoot(t,x,z,id,auto){const g=lootMesh(t);g.position.set(x,0,z);g.userData.id=id;g.userData.auto=auto;scene.add(g);loot.push(g);return g}
function srnd(seed){return()=>{seed=(seed*16807)%2147483647;return seed/2147483647}}
function buildRoom(rid){const i=hstr(rid)%100000,RX=100000,W=14,D=10,r=srnd(i*97+13);const g=new THREE.Group();g.position.set(RX,0,0);
 const wallM=TM(r()<.5?T.brick:T.concrete,3,1,[0xd7ccc8,0xc5cae9,0xffe0b2,0xdcedc8][i%4]);const flM=TM(T.side,4,3,0xa1887f);
 const pl=(w,h,mat,x,y,z,ry,rx=0)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);p.position.set(x,y,z);p.rotation.set(rx,ry,0);p.receiveShadow=true;g.add(p);return p};
 pl(W,D,flM,0,0,0,0,-Math.PI/2);pl(W,D,M(0x5d5d5d),0,3.5,0,0,Math.PI/2);
 pl(W,3.5,wallM,0,1.75,-D/2,0);pl(W,3.5,wallM,0,1.75,D/2,Math.PI);pl(D,3.5,wallM,-W/2,1.75,0,Math.PI/2);pl(D,3.5,wallM,W/2,1.75,0,-Math.PI/2);
 pl(1.6,2.4,new THREE.MeshStandardMaterial({color:0x2e7d32,emissive:0x0b3d0b}),0,1.2,D/2-.03,Math.PI);pl(1.4,.4,new THREE.MeshBasicMaterial({color:0x76ff03}),0,2.75,D/2-.04,Math.PI);
 for(let k=0;k<3;k++){const sh=box(2.6,2.2,.6,0x6d4c41);sh.position.set(-5+k*3.4,1.1,-D/2+.35);g.add(sh);for(let y=.5;y<2.2;y+=.7){const bx=box(.4,.35,.35,[0xff7043,0x42a5f5,0xffca28,0x66bb6a][(k+Math.floor(y*3))%4]);bx.position.set(-5.8+k*3.4+r()*1.4,y+.2,-D/2+.4);g.add(bx)}}
 const tb=box(2.2,.9,1.2,0x8d6e63);tb.position.set(3.5,.45,0);const ch=box(.6,.5,.6,0x5d4037);ch.position.set(3.5,.25,1);const sofa=box(3,.8,1.1,0x7e57c2);sofa.position.set(-4.5,.4,1.5);
 const rug=new THREE.Mesh(new THREE.CircleGeometry(1.8,24),M(0xc62828));rug.rotation.x=-Math.PI/2;rug.position.set(0,.02,-.5);g.add(tb,ch,sofa,rug);
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.2,10,8),new THREE.MeshBasicMaterial({color:0xfff3b0}));bulb.position.set(0,3.2,0);const L=new THREE.PointLight(0xffe0a0,LOW?20:35,22,1.6);L.position.set(0,3,0);g.add(bulb,L);
 scene.add(g);const spots=[[-5,-3.4],[-1.6,-3.4],[1.8,-3.4],[3.5,-1.2],[-3,0],[5.5,2.5],[-5.5,3.2],[1.5,1.8]].sort(()=>r()-.5);const n=3+Math.floor(r()*3);const items=[];
 const ts=['lata','moneda','agua','venda','moneda','lata'];for(let k=0;k<n;k++){let t=ts[Math.floor(r()*ts.length)];if(k==0&&r()<.4)t='arma';items.push([t,RX+spots[k][0],spots[k][1],rid+'|r'+k])}if(r()<.45)items.push(['fruta',RX+spots[n][0],spots[n][1],rid+'|rf'])
 return {g,RX,W,D,items,L}}
let hiddenW=[];function hideWorld(rm){showWorld();hiddenW=scene.children.filter(o=>o.visible&&!o.isLight&&!o.isCamera&&o!==player&&o!==rm.g&&o!==roomFill&&!o.userData.room);hiddenW.forEach(o=>o.visible=false)}
function showWorld(){hiddenW.forEach(o=>o.visible=true);hiddenW=[]}
function enter(dr){for(const k in rooms)if(k!=dr.id){scene.remove(rooms[k].g);disposeObj(rooms[k].g);delete rooms[k]}const rm=rooms[dr.id]||(rooms[dr.id]=buildRoom(dr.id));rm.g.visible=true;inside={rm,ret:{x:dr.x,z:dr.z},door:dr};hideWorld(rm);S.lastDoor={x:dr.x,z:dr.z};
 rm.items.forEach(([t,x,z,id],k)=>{if(k>0&&(hstr(id+'|'+Math.floor(S.day/3))%1000)/1000<DIF.rare())return;if(!isTaken(id)&&!loot.some(l=>l.userData.id==id))addLoot(t,x,z,id).userData.room=1});
 player.position.set(rm.RX,0,rm.D/2-2.6);yaw=0;camYaw=0;cam.position.set(rm.RX,4,rm.D/2+3);roomFill.visible=true;$('exitBtn').style.display='block';document.exitPointerLock?.();doorCD=1;msg('🏚️ Entraste. Agarra cosas con E. Para salir: botón 🚪 SALIR, tecla X, o camina a la puerta verde',4)}
function leave(){if(!inside)return;setTimeout(()=>{if(carsPend&&!inside){carsPend=false;resetChunks();updChunks(true)}},0);const dr=inside.door;inside.rm.g.visible=false;roomFill.visible=false;$('exitBtn').style.display='none';doorCD=1.5;loot.filter(l=>l.userData.room).forEach(l=>{scene.remove(l);loot.splice(loot.indexOf(l),1)});inside=null;showWorld();let ez=dr.z+2.2;for(let k=0;k<6&&!free(dr.x,ez);k++)ez+=1;player.position.set(dr.x,0,ez);yaw=Math.PI;camYaw=Math.PI;cam.position.set(dr.x,4,ez-3);msg('🌆 De vuelta en la ciudad',2)}
const roomFill=new THREE.PointLight(0xfff2d8,LOW?30:45,16,1.4);roomFill.visible=false;scene.add(roomFill);let doorCD=0,lastAct=0;
function take(l){const t=l.userData.t;scene.remove(l);loot.splice(loot.indexOf(l),1);if(l.userData.id)markTaken(l.userData.id);puff(l.position.clone().setY(.8),0xffeb3b,10,4,.15,6,.5);let txt='';
 if(t=='lata'){S.food=Math.min(100,S.food+25);txt='🥫 ¡Lata de comida! +25 comida'}
 else if(t=='moneda'){const n=l.userData.auto?1+Math.floor(Math.random()*3):3+Math.floor(Math.random()*4);S.coins+=n;txt='🪙 +'+n+' monedas'}
 else if(t=='agua'){S.ammo+=10;txt='💧 +10 agua para la pistola'}
 else if(t=='fruta'){S.regen=(S.regen||0)+50;txt='✨ ¡Fruta mágica! Recuperas salud poco a poco';puff(l.position.clone().setY(1),0xff80ff,24,4,.18,-3,1.2)}
 else if(t=='venda'){S.hp=Math.min(S.maxHp,S.hp+30);txt='🩹 ¡Venda! +30 salud'}
 else{const opts=[1,2,3,4,5].filter(w=>!S.weap.includes(w));if(opts.length){const w=opts[Math.floor(Math.random()*opts.length)];S.weap.push(w);S.cur=w;txt='🎁 ¡Arma escondida: '+WEAP[w].i+' '+WEAP[w].n+'!'}else{S.coins+=8;txt='🎁 ¡Caja sorpresa! +8 🪙'}}
 updW();msg(txt,2.5)}
const merchantHere=()=>S&&S.day%3===0;
const SHOP=[{k:'lata',i:'🥫',n:'Lata de comida (+35 comida)',p:5},{k:'venda',i:'🩹',n:'Venda (+30 salud)',p:4},{k:'agua',i:'💧',n:'Agua x15 para la pistola',p:3},{k:'arma',i:'🗡️',n:'Arma nueva',p:12}];
function shopWeapon(){return [1,2,3,4,5].find(w=>!S.weap.includes(w))}
function openShop(){shopOpen=true;document.exitPointerLock?.();renderShop();$('shop').style.display='flex';merchant.userData.rig?.play('Wave',.2,true)}
function closeShop(){shopOpen=false;$('shop').style.display='none'}
function renderShop(){const w=shopWeapon();$('shopCoins').textContent=S.coins;$('shopList').innerHTML=SHOP.map((it,k)=>{let n=it.n,ok=S.coins>=it.p;if(it.k=='arma'){if(w===undefined){n='Arma nueva (¡ya tienes todas!)';ok=false}else n='Arma: '+WEAP[w].n}
 return `<button class="sbtn" data-k="${k}" ${ok?'':'disabled'}><span>${it.i} ${n}</span><b>${it.p} 🪙</b></button>`}).join('');
 $('shopList').querySelectorAll('.sbtn').forEach(b=>b.onclick=()=>buy(+b.dataset.k))}
function buy(k){const it=SHOP[k];if(S.coins<it.p){msg('No tienes suficientes monedas 🪙',2);return}S.coins-=it.p;
 if(it.k=='lata')S.food=Math.min(100,S.food+35);else if(it.k=='venda')S.hp=Math.min(S.maxHp,S.hp+30);else if(it.k=='agua')S.ammo+=15;else{const w=shopWeapon();if(w===undefined){S.coins+=it.p;return}S.weap.push(w);S.cur=w}
 updW();msg('🛒 ¡Compraste '+it.i+'! Gracias, vuelve pronto.',2);renderShop()}
function nearest(arr,max,f=o=>o.position){let b=null,bd=max;for(const o of arr){const p=f(o),d=Math.hypot(p.x-player.position.x,p.z-player.position.z)+(Math.abs((p.y||0)-player.position.y)>1.6?99:0);if(d<bd){bd=d;b=o}}return b}
function nearMerchant(){return merchantHere()&&!inside&&Math.hypot(merchant.position.x-player.position.x,merchant.position.z-player.position.z)<4.5}
function interact(){if(!playing)return;const now=performance.now();if(now-lastAct<350)return;lastAct=now;if(shopOpen){closeShop();return}
 const l=nearest(loot,inside?1.6:2);if(l){take(l);return}
 if(inside){leave();return}
 if(startZip())return;if(player.position.y>1){msg('Busca la tirolesa 🛝 o baja por la escalera 🪜',1.2);return}
 if(nearMerchant()){openShop();return}const dr=nearest(doors,2.4,d=>d);if(dr){enter(dr);return}msg('No hay nada cerca para agarrar',1.2)}
function useLabel(){if(!S)return'✋<br>AGARRAR';if(shopOpen)return'✖<br>CERRAR';if(nearest(loot,inside?1.6:2))return'✋<br>AGARRAR';if(inside)return'🚪<br>SALIR';if(zipNear())return'🛝<br>USAR';if(nearMerchant())return'🛒<br>COMPRAR';if(!inside&&nearest(doors,2.4,d=>d))return'🚪<br>ENTRAR';return'✋<br>AGARRAR'}
function banner(t,s=5){$('banner').innerHTML=t;$('banner').style.display='block';clearTimeout(banner.h);banner.h=setTimeout(()=>$('banner').style.display='none',s*1000)}
// Estado
const DK=()=>Math.min(29,Math.max(0,(S?.day||1)-1));const DIF={hp:()=>1+.06*DK(),sp:()=>1+.02*DK(),dmg:()=>1+.04*DK(),rate:()=>1+.04*DK(),det:()=>1+.03*DK(),food:()=>1+.015*DK(),rare:()=>.012*DK()};
const BOSSHP=23;let boss=null,bossPend=false;let lampT=0,camYaw=0,S,zombies=[],crates=[],balls=[],yaw=0,pitch=.25,keys={},playing=false,fireCD=0,msgT=0,dmgCD=0;
const fresh=()=>({ck:{},coins:0,ammo:20,looted:[],weap:[0],cur:0,day:1,t:.3,hp:100,maxHp:100,lvl:1,xp:0,food:100,score:0,got:0,x:0,z:7,yaw:Math.PI,nextRun:4,cratesDay:0});
function msg(s,t=3){$('msg').textContent=s;msgT=t}
function save(){if(!S)return;S.x=inside?inside.ret.x:player.position.x;S.y=inside||zip?0:player.position.y;S.z=inside?inside.ret.z:player.position.z;S.yaw=yaw;S.crates=crates.filter(c=>!c.userData.ck).map(c=>[c.position.x,c.position.z]);delete S.pick;localStorage.setItem('zsave',JSON.stringify(S))}
function pfree(x,z,y){const ok=o=>o.h!==undefined&&y>=o.h-.3;return !obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6&&!ok(o))&&!rects.some(r=>Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d&&!ok(r))}
function gH(x,z,y){let g=0;for(const o of obst)if(o.h!==undefined&&o.h<=y+.3&&o.h>g&&Math.hypot(o.x-x,o.z-z)<o.r+.35)g=o.h;for(const r of rects)if(r.h!==undefined&&r.h<=y+.3&&r.h>g&&Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d)g=r.h;return g}
let curBio=-1;const bioC=new THREE.Color(0xbfe3ff),_bc=new THREE.Color();let zip=null,climbing=false,climbT=0;const _qa=new THREE.Quaternion(),_qb=new THREE.Quaternion(),_va=new THREE.Vector3(),_vb=new THREE.Vector3(),_vt=new THREE.Vector3();let climbBones=null;
function aimBone(b,c,dir){b.updateWorldMatrix(true,false);c.updateWorldMatrix(false,false);b.getWorldPosition(_va);c.getWorldPosition(_vb);const cur=_vb.sub(_va).normalize();_vt.copy(dir).applyQuaternion(player.quaternion).normalize();_qa.setFromUnitVectors(cur,_vt);b.getWorldQuaternion(_qb);_qb.premultiply(_qa);b.parent.getWorldQuaternion(_qa);b.quaternion.copy(_qa.invert().multiply(_qb));b.updateWorldMatrix(false,true)}
function climbPose(){if(!pModel)return;if(!climbBones){const g=n=>pModel.getObjectByName(n);climbBones=['UpperArmL','LowerArmL','WristL','UpperArmR','LowerArmR','WristR','UpperLegL','LowerLegL','FootL','UpperLegR','LowerLegR','FootR'].map(g);if(climbBones.some(b=>!b)){climbBones=[];return}}if(!climbBones.length)return;const B=climbBones,s=Math.sin(climbT);
 for(const[k,sx,ph]of[[0,-1,s],[3,1,-s]]){const th=.45+.35*ph;aimBone(B[k],B[k+1],_vt.set(sx*.25,Math.cos(th),-Math.sin(th)).clone());aimBone(B[k+1],B[k+2],_vt.set(sx*.05,.55+.25*ph,-.85).clone())}
 for(const[k,ph]of[[6,-s],[9,s]]){const fi=.5+.5*ph;aimBone(B[k],B[k+1],_vt.set(0,-Math.cos(fi),-Math.sin(fi)).clone());aimBone(B[k+1],B[k+2],_vt.set(0,-1,.35).clone())}}
window.__climbPose=climbPose;const zipH=new THREE.Mesh(new THREE.BoxGeometry(.7,.1,.1),new THREE.MeshStandardMaterial({color:0xff9800}));zipH.visible=false;
function zipNear(){if(inside||zip)return null;const P=player.position;let best=null,bd=4.5;for(const Z of zips)for(const[A,B]of[[Z.a,Z.b],[Z.b,Z.a]]){const d=Math.hypot(A.x-P.x,A.z-P.z);if(d<bd&&Math.abs(P.y-A.top)<1.3){bd=d;best={A,B,len:Z.len}}}return best}
function startZip(){const n=zipNear();if(!n)return false;zip={...n,t:0};if(!zipH.parent)scene.add(zipH);zipH.visible=true;msg('🛝 ¡Wiii! Tirolesa',1.5);return true}
function free(x,z){return !obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6)&&!rects.some(r=>Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d)}
function spawnCrates(n){for(let i=0;i<n;i++){let x,z,t=0;do{const a=Math.random()*6.28,d=20+Math.random()*50;x=player.position.x+Math.cos(a)*d;z=player.position.z+Math.sin(a)*d}while((!free(x,z)||Math.hypot(x,z)<BASE+3)&&++t<40);addCrate(x,z)}}
function addCrate(x,z){const c=new THREE.Group();c.add(crateMesh());c.position.set(x,0,z);scene.add(c);crates.push(c)}
const armors=[];const ARM={casco:{p:.15,dur:60,i:'⛑️',n:'Casco'},chaleco:{p:.3,dur:90,i:'🦺',n:'Chaleco'},escudo:{p:.2,dur:70,i:'🛡️',n:'Escudo'}};
const armKey=(k,t)=>k=='casco'?'casco':k+(t==2?'2':'');
function armModel(k,t,h){const g=XM[armKey(k,t)];if(!g)return null;const m=SkeletonUtils.clone(g.scene);m.traverse(o=>{if(o.isMesh){o.castShadow=true;if(t==2&&k=='casco'){o.material=o.material.clone();o.material.color?.lerp(new THREE.Color(0xffd54f),.6)}}});const w=new THREE.Group();w.add(m);m.updateMatrixWorld(true);const bb=new THREE.Box3().setFromObject(m),sz=bb.getSize(new THREE.Vector3()),c=bb.getCenter(new THREE.Vector3());m.position.sub(c);w.scale.setScalar(h/Math.max(sz.x,sz.y,sz.z));return w}
function refreshArmor(a){const u=a.userData;if(u.m3)return;const m=armModel(u.k,u.t,.9);if(!m)return;a.remove(u.fb);m.position.y=.9;a.add(m);u.m3=m}
function addArmor(k,t,x,z,id,y=0,ck){if(armors.some(a=>a.userData.id==id))return;const a=new THREE.Group();const fb=box(.6,.6,.3,t==2?0xffd54f:0x90a4ae);fb.position.y=.9;a.add(fb);const rg=new THREE.Mesh(cg('armRing',()=>new THREE.TorusGeometry(.7,.06,6,20)),M(t==2?0xffca28:0x4fc3f7));rg.rotation.x=Math.PI/2;rg.position.y=.08;a.add(rg);a.userData={k,t,id,ck,fb};a.position.set(x,y,z);scene.add(a);armors.push(a);refreshArmor(a);return a}
const WORN={};function wearArm(){if(!pModel||!S)return;const bones={};pModel.traverse(o=>{if(o.isBone){if(!bones.casco&&/^Head$/i.test(o.name))bones.casco=o;if(!bones.chaleco&&/^(Chest|Torso)$/i.test(o.name))bones.chaleco=o;if(!bones.escudo&&/^LowerArm\.?L$/i.test(o.name))bones.escudo=o}});
 for(const k in ARM){const a=S.arm?.[k],key=a?armKey(k,a.t)+a.t:null;if(WORN[k]?.userData.key===key)continue;if(WORN[k]){WORN[k].parent?.remove(WORN[k]);delete WORN[k]}if(!a||!bones[k])continue;const m=armModel(k,a.t,k=='casco'?.75:k=='chaleco'?.95:.85);if(!m)continue;const b=bones[k];b.updateMatrixWorld(true);const ws=new THREE.Vector3();b.getWorldScale(ws);const g=new THREE.Group();g.scale.setScalar(1/ws.x);g.add(m);
  if(k=='casco'){m.position.set(0,.32,0)}else if(k=='chaleco'){m.position.set(0,.05,.04);m.rotation.y=Math.PI}else{m.position.set(-.12,.15,0);m.rotation.set(0,-Math.PI/2,0)}g.userData.key=key;b.add(g);WORN[k]=g}}
function updArm(){if(!S)return;const A=S.arm||{};let p=0,dd=0,n=0;for(const k in A){p+=ARM[k].p*(A[k].t==2?1.5:1);dd+=A[k].d/(ARM[k].dur*(A[k].t==2?1.6:1));n++}$('arm').textContent=n?Math.round(Math.min(.7,p)*100)+'% · '+Math.round(dd/n*100)+'❤️‍🩹':'0%';$('armP').style.opacity=n?1:.55}
function hurtP(n){const A=S.arm||(S.arm={});let p=0;for(const k in A)p+=ARM[k].p*(A[k].t==2?1.5:1);p=Math.min(.7,p);const ab=n*p;for(const k in A){const sh=ab*(ARM[k].p*(A[k].t==2?1.5:1))/(p||1);A[k].d-=sh;if(A[k].d<=0){delete A[k];msg('💥 ¡Se rompió tu '+ARM[k].n+'!',1.5)}}S.hp-=n-ab;updArm();wearArm();return n-ab}
function takeArmor(a){const u=a.userData;scene.remove(a);armors.splice(armors.indexOf(a),1);if(u.id)markTaken(u.id);S.arm??={};const cur=S.arm[u.k],dur=ARM[u.k].dur*(u.t==2?1.6:1);if(!cur||cur.t<u.t||cur.d<dur)S.arm[u.k]={t:u.t,d:dur};puff(a.position.clone().setY(1),0x4fc3f7,12,4,.15,6,.5);msg('🛡️ ¡'+ARM[u.k].i+' '+ARM[u.k].n+(u.t==2?' de oro':'')+'! Te protege de los golpes',2.5);updArm();wearArm()}
// ---- enemigos por zona
const EK={zombie:{},bate:{hp:1.4,dm:1.7,tint:0xbcaaa4,bat:1,say:'¡Pum! 🧟🏏'},flaco:{hp:.6,sp:1.7,sx:.78,tint:0xdcedc8,say:'¡Zas! 🧟💨'},momia:{hp:1.6,sp:.8,tint:0xfff3d6,say:'¡Ay! 🧻 Momia'},
 serpiente:{m:'serpiente',fh:.8,len:1,hp:1.1,sp:1.3,dm:.9,say:'¡Ssss! 🐍'},mono:{m:'mono',fh:1.3,hp:1,sp:1.6,dm:.8,say:'¡Uh uh! 🐒'},arana:{m:'arana',fh:.9,hp:1.3,sp:1.4,dm:1,say:'¡Araña! 🕷️'},
 cactoro:{m:'cactoro',fh:1.5,hp:1.8,sp:.9,dm:1.3,say:'¡Pincha! 🌵'},zorro:{m:'zorro',fh:1.1,hp:1,sp:1.9,dm:1,say:'¡Coyote! 🦊'},gigante:{hp:6,sp:.5,dm:2.5,sc:2.7,tint:0xd1c4e9,reach:2.9,coins:5,say:'¡BUM! 🦍 ¡Zombie gigante!'}};
const BIOK=[['zombie'],['zombie','bate','bate'],['zombie','flaco','flaco'],['serpiente','mono','arana','serpiente','mono','arana','zombie'],['cactoro','zorro','momia','cactoro','zorro']];
let shakeT=0;window.__EK=EK;
function makeZ(force){const g=new THREE.Group();const c=[0x7cb342,0x9ccc65,0x689f38][zombies.length%3];
 const b=box(.9,1.1,.5,[0x6a4c93,0x8d6e63,0x00897b][zombies.length%3]);b.position.y=1.35;const h=box(.65,.65,.65,c);h.position.y=2.2;h.material=h.material.clone();
 const e1=box(.14,.14,.05,0xffeb3b);e1.position.set(-.15,2.25,.33);const e2=e1.clone();e2.position.x=.15;const mo=box(.3,.08,.05,0x33691e);mo.position.set(0,2.02,.33);
 const hair=box(.5,.12,.5,0x4e342e);hair.position.y=2.58;const tear=box(.3,.25,.05,0x4527a0);tear.position.set(.2,1.1,.26);
 const limb=(w,hh,col,px,py)=>{const p=new THREE.Group();p.position.set(px,py,0);const m=box(w,hh,w,col);m.position.y=-hh/2;p.add(m);return p};
 const a1=limb(.25,.85,c,-.58,1.8),a2=limb(.25,.85,c,.58,1.8);a1.rotation.x=a2.rotation.x=-1.4;const l1=limb(.36,.8,0x455a64,-.22,.8),l2=limb(.36,.8,0x455a64,.22,.8);
 g.userData.limbs=[a1,a2,l1,l2];const l=mo;g.add(b,h,e1,e2,a1,a2,l1,l2,hair,tear);g.add(l);let x,z,tr=0;do{const a=(tr<25?yaw+(Math.random()-.5)*3.2:Math.random()*6.28),d=24+Math.random()*32;x=(ZC||player.position).x+Math.sin(a)*d;z=(ZC||player.position).z+Math.cos(a)*d;tr++}while(tr<60&&(!free(x,z)||Math.hypot(x,z)<BASE+5));
 g.position.set(x,0,z);const bio=bioOfChunk(x,z);let kind=force||BIOK[bio][Math.floor(Math.random()*BIOK[bio].length)];if(!force&&Math.random()<Math.min(.22,.015+DK()*.006+Math.hypot(x,z)/9000)&&zombies.filter(q=>q.userData.kind=='gigante').length<2)kind='gigante';const K=EK[kind];
 g.userData={limbs:g.userData.limbs,wt:Math.random()*6,hp:Math.round(3*DIF.hp()*(K.hp||1)*10)/10,sp:(1.6+Math.random()*1.2)*DIF.sp()*(K.sp||1),hit:0,kind,dm:K.dm||1,reach:K.reach||1.2,coins:K.coins||0,say:K.say,nid:++ZID};if(K.sc)g.scale.setScalar(K.sc);if(K.sx)g.scale.set(K.sx,1,K.sx);scene.add(g);zombies.push(g);attachZ(g)}
function start(load){zombies.forEach(z=>scene.remove(z));crates.forEach(c=>scene.remove(c));balls.forEach(b=>scene.remove(b));zombies=[];crates=[];balls=[];
 const sv=load&&JSON.parse(localStorage.getItem('zsave')||'null');S=sv||fresh();player.position.set(S.x,S.y||0,S.z);onGround=false;vy=0;zip=null;climbing=false;zipH.visible=false;yaw=S.yaw;
 pickups.forEach(p=>scene.remove(p));pickups.length=0;loot.forEach(l=>scene.remove(l));loot.length=0;if(inside){inside.rm.g.visible=false;inside=null}showWorld();for(const k in rooms)rooms[k].g.visible=false;roomFill.visible=false;$('exitBtn').style.display='none';closeShop();if(sv&&sv.crates)sv.crates.forEach(([x,z])=>addCrate(x,z));else spawnCrates(8);
 S.weap=S.weap||[0];S.lvl??=1;S.xp??=0;S.maxHp??=100;S.regen=0;if(boss){scene.remove(boss.userData.bar);boss=null}$('bossHud').style.display='none';S.coins??=0;S.ck??={};resetChunks();updChunks(true);S.ammo??=20;S.looted??=[];S.cur=S.cur||0;camYaw=yaw;S.arm??={};S.down=0;if(S.hp<=0)S.hp=Math.round(S.maxHp*.5);updArm();wearArm();curBio=-1;updW();
 $('start').style.display=$('over').style.display='none';playing=true;msg(sv?'¡Partida cargada!':'¡Sobrevive! Encuentra comida cada 3 días 📦');
 if(!touch)try{renderer.domElement.requestPointerLock?.()?.catch?.(()=>{})}catch(e){}}
$('bNew').onclick=()=>start(false);$('bCont').onclick=()=>start(true);$('bRe').onclick=()=>start(false);
if(localStorage.getItem('zsave'))$('bCont').style.display='';
function gameOver(why){playing=false;pRig?.play('Death',.1,true);localStorage.removeItem('zsave');document.exitPointerLock?.();$('bCont').style.display='none';
 $('overTxt').innerHTML=why+'<br>Sobreviviste <b>'+S.day+'</b> días · ⭐ '+S.score+' zombies dormidos · 📦 '+S.got+' cajas';$('over').style.display='flex'}
// Controles
const touch='ontouchstart' in window;if(touch){$('joy').style.display='block';$('fire').style.display=$('run').style.display=$('hit').style.display=$('jump').style.display=$('sw').style.display=$('use').style.display='flex';$('cross').style.display='none'}
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code.startsWith('Arrow'))e.preventDefault();if(e.code=='Space'){if(!e.repeat)jumpQ=true;e.preventDefault()}if(e.code=='Enter'&&playing)attack();if(e.code=='KeyF')melee();if(e.code=='KeyE'&&!e.repeat)interact();if(e.code=='KeyX'&&inside)leave();if(e.code=='Escape'&&shopOpen)closeShop();if(e.code=='KeyR'||e.code=='Tab'){nextW();e.preventDefault()}
 const n=+e.key;if(n>=1&&n<=6&&S&&S.weap.includes(n-1)){S.cur=n-1;updW()}});addEventListener('keyup',e=>keys[e.code]=0);
renderer.domElement.addEventListener('mousedown',()=>{if(!playing)return;if(document.pointerLockElement)attack();else renderer.domElement.requestPointerLock?.()});
addEventListener('mousemove',e=>{if(document.pointerLockElement){yaw-=e.movementX*.003;pitch=Math.max(-.3,Math.min(1.1,pitch+e.movementY*.003))}});
let jv={x:0,y:0},jid=null,lid=null,lx=0,ly=0,runT=false;
$('joy').addEventListener('touchstart',e=>{jid=e.changedTouches[0].identifier;e.preventDefault()});
$('fire').addEventListener('touchstart',e=>{shoot();e.preventDefault()});$('hit').addEventListener('touchstart',e=>{melee();e.preventDefault()});$('jump').addEventListener('touchstart',e=>{jumpQ=true;e.preventDefault()});$('sw').addEventListener('touchstart',e=>{nextW();e.preventDefault()});$('use').addEventListener('touchstart',e=>{interact();e.preventDefault()});$('use').addEventListener('click',()=>interact());const xb=$('exitBtn');xb.addEventListener('touchstart',e=>{leave();e.preventDefault()});xb.addEventListener('click',()=>leave());
$('run').addEventListener('touchstart',e=>{runT=true;e.preventDefault()});$('run').addEventListener('touchend',()=>runT=false);
addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(t.identifier!==jid&&t.clientX>innerWidth/2&&lid===null&&e.target===renderer.domElement){lid=t.identifier;lx=t.clientX;ly=t.clientY}});
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid){const r=$('joy').getBoundingClientRect();let dx=t.clientX-r.left-65,dy=t.clientY-r.top-65,d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d}jv={x:dx/50,y:dy/50};$('knob').style.transform=`translate(${dx}px,${dy}px)`}
 if(t.identifier===lid){yaw-=(t.clientX-lx)*.006;pitch=Math.max(-.3,Math.min(1.1,pitch+(t.clientY-ly)*.004));lx=t.clientX;ly=t.clientY}}e.preventDefault()},{passive:false});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===jid){jid=null;jv={x:0,y:0};$('knob').style.transform=''}if(t.identifier===lid)lid=null}});
function updW(){updHeld();const W=WEAP[S.cur];$('wpn').textContent=W.i+' '+W.n+(W.m?'':' (💧'+S.ammo+')');$('coins').textContent=S.coins;$('ammo').textContent=S.ammo;held.visible=!!W.m&&S.cur>0&&!held.userData.off;if(W.m&&S.cur>0){held.material.color.set(W.c);held.scale.y=W.len}if(!W.m&&!held.userData.off){held.visible=true;held.material.color.set(S.cur==4?0x29b6f6:0xff7043);held.scale.y=.5}}
function nextW(){if(!S)return;const i=S.weap.indexOf(S.cur);S.cur=S.weap[(i+1)%S.weap.length];updW();msg(WEAP[S.cur].i+' '+WEAP[S.cur].n,1)}
let vy=0,onGround=true,jumpQ=false,face=0,faceTgt=0,faceLock=0,manT=0,lastYaw=0;
function aimFace(){let b=null,bd=12;zombies.forEach(z=>{const d=z.position.distanceTo(player.position);if(d<bd){bd=d;b=z}});faceTgt=b?Math.atan2(-(b.position.x-player.position.x),-(b.position.z-player.position.z)):yaw;faceLock=.45}
function attack(){aimFace();WEAP[S.cur].m?melee():shoot()}
function melee(){if(!playing||fireCD>0||S.down)return;if(NET)NET.atk++;aimFace();let W=WEAP[S.cur];if(!W.m){const best=S.weap.filter(w=>WEAP[w].m).pop();W=WEAP[best]}fireCD=W.cd;swing=.3;pRig?.play(W===WEAP[0]?'Punch_Right':'Sword_Slash',.08,true,1.8);
 const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 for(const z of zombies){if(z.userData.sleep)continue;const dx=z.position.x-player.position.x,dz=z.position.z-player.position.z,d=Math.hypot(dx,dz);
  if(d<W.rng+.5&&(dx*f.x+dz*f.z)/d>.4){hurtZ(z,W.dmg);let nx=z.position.x+dx/d*W.kb,nz=z.position.z+dz/d*W.kb;if(free(nx,nz)){z.position.x=nx;z.position.z=nz}}}}
function hurtZ(z,n,by){if(NET?.cl){n*=1+.08*((S?.lvl||1)-1);puff(z.position.clone().setY(1.8),0xffeb3b,8,6,.15,8,.4);z.userData.hit=.15;zFlash(z,1);setTimeout(()=>zFlash(z,0),150);if(z.userData.rig)z.userData.rig.play('HitRecieve',.1,true,1.5);netSend({t:'hit',id:z.userData.nid,n});return}if(!by)n*=1+.08*((S?.lvl||1)-1);puff(z.position.clone().setY(1.8),0xffeb3b,8,6,.15,8,.4);z.userData.hp-=n;z.userData.hit=.15;zFlash(z,1);setTimeout(()=>zFlash(z,0),150);if(z.userData.rig&&z.userData.hp>0)z.userData.rig.play('HitRecieve',.1,true,1.5);if(z.userData.hp<=0&&!z.userData.sleep){z.userData.sleep=z.userData.rig?1.4:.6;z.userData.rig?.play('Death',.1,true,1.3);puff(z.position.clone().setY(1.5),0xe1f5fe,14,4,.3,-1,1);if(by){sendTo(by,{t:'kill',b:z.userData.boss?1:0});if(z.userData.boss){bossDown(z)}else{if(Math.random()<.5)addLoot('moneda',z.position.x,z.position.z,null,true);for(let k=0;k<(z.userData.coins||0);k++)addLoot('moneda',z.position.x+Math.cos(k*1.3)*1.4,z.position.z+Math.sin(k*1.3)*1.4,null,true)}return}S.score++;if(z.userData.boss){bossDown(z)}else{msg('💤 ¡Zombie dormido! +10 XP',1);if(Math.random()<.5)addLoot('moneda',z.position.x,z.position.z,null,true);for(let k=0;k<(z.userData.coins||0);k++)addLoot('moneda',z.position.x+Math.cos(k*1.3)*1.4,z.position.z+Math.sin(k*1.3)*1.4,null,true);if(z.userData.kind=='gigante')msg('🦍💤 ¡Gigante dormido! Soltó monedas 🪙',2)}gainXP(z.userData.boss?120:10)}}
function spawnBoss(){if(boss||inside)return;makeZ('zombie');const z=zombies[zombies.length-1];const a=Math.random()*6.28;let x=player.position.x+Math.cos(a)*22,zz=player.position.z+Math.sin(a)*22;if(free(x,zz)&&Math.hypot(x,zz)>BASE+5&&Math.abs(x)<WORLD&&Math.abs(zz)<WORLD)z.position.set(x,0,zz);
 const u=z.userData;u.boss=1;{const nb=S.bossesBeaten||0;u.hp=u.max=Math.round(BOSSHP*(1+.25*nb)*DIF.hp()**.5);u.sp=Math.min(3.2,2.1+.15*nb);u.bdmg=Math.round(25*(1+.12*Math.min(nb,8)))}z.scale.setScalar(2.2);z.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color?.lerp(new THREE.Color(0x9c27b0),.55);if(o.material.emissive)o.material.emissive.setHex(0x4a0072)}});
 const gl=new THREE.PointLight(0xe040fb,LOW?8:14,9,1.5);gl.position.y=1.6;z.add(gl);for(const sx of[-.18,.18]){const ey=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xff1744}));ey.position.set(sx,.98,.18);z.add(ey)}
 const bar=new THREE.Group();const bg=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.35),new THREE.MeshBasicMaterial({color:0x222222,depthTest:false}));const fg=new THREE.Mesh(new THREE.PlaneGeometry(3,.22),new THREE.MeshBasicMaterial({color:0xff1744,depthTest:false}));fg.position.z=.01;bg.renderOrder=fg.renderOrder=10;bar.add(bg,fg);bar.userData.fg=fg;scene.add(bar);u.bar=bar;boss=z;
 $('bossHud').style.display='block';banner('👹 ¡CUIDADO! ¡Llegó el MONSTRUO JEFE!<br><small>Tiene 200 de vida más que un zombie y pega fuerte. ¡Duérmelo para ganar muchas 🪙 y una fruta mágica!</small>',7);msg('👹 ¡El monstruo jefe te busca!',3)}
function bossDown(z){scene.remove(z.userData.bar);boss=null;$('bossHud').style.display='none';S.bossesBeaten=(S.bossesBeaten||0)+1;for(let k=0;k<8;k++)addLoot('moneda',z.position.x+Math.cos(k*.8)*2.6,z.position.z+Math.sin(k*.8)*2.6,null,true);addLoot('fruta',z.position.x+3.4,z.position.z,'boss'+S.day+'_'+S.bossesBeaten);banner('🏆 ¡Dormiste al MONSTRUO JEFE!<br><small>Dejó muchas monedas 🪙 y una fruta mágica ✨ (+120 XP)</small>',6);puff(z.position.clone().setY(2),0xe040fb,40,7,.3,-2,1.5)}
function shoot(){if(!playing||fireCD>0||S.down)return;if(NET)NET.atk++;aimFace();let W=WEAP[S.cur];if(W.m){const r=S.weap.filter(w=>!WEAP[w].m).pop();if(r===undefined){melee();return}W=WEAP[r]}if(S.ammo<=0){msg('💧 ¡Sin agua! Busca botellas o cómprale al comerciante',1.5);fireCD=.4;return}S.ammo--;fireCD=W.cd;pRig?.play('Gun_Shoot',.08,true,2);const b=new THREE.Mesh(new THREE.SphereGeometry(W.sz,8,6),new THREE.MeshBasicMaterial({color:0x40c4ff}));
 const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));b.position.copy(player.position).add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,.8);b.userData={v:dir.multiplyScalar(W.sp),life:1.4,dmg:W.dmg};scene.add(b);balls.push(b)}
// Bucle
const clock=new THREE.Clock();let saveT=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(playing&&!shopOpen)update(dt);else skyDome.position.copy(cam.position);updParts(dt);netTick(dt);mixers.forEach(m=>m.update(dt));if(climbing&&playing)climbPose();
 const cp=player.position;camYaw+=(yaw-camYaw)*Math.min(1,dt*8);const tgt=new THREE.Vector3(cp.x+Math.sin(camYaw)*6*Math.cos(pitch),cp.y+3+6*Math.sin(pitch),cp.z+Math.cos(camYaw)*6*Math.cos(pitch));cam.position.lerp(tgt,Math.min(1,dt*10));cam.lookAt(cp.x,cp.y+1.8,cp.z);if(shakeT>0){shakeT-=dt;cam.position.x+=(Math.random()-.5)*shakeT*1.2;cam.position.y+=(Math.random()-.5)*shakeT*1.2}
 renderer.render(scene,cam)}
function update(dt){fireCD-=dt;dmgCD-=dt;if((msgT-=dt)<=0)$('msg').textContent='';
 // tiempo
 const prevDay=S.day;S.t+=dt/DAY;if(S.t>=1){S.t-=1;S.day++;msg('☀️ ¡Día '+S.day+'!');if(S.day>1&&S.day%5&&S.day%3)banner('☀️ Día '+S.day+': los zombies son más fuertes 💀<br><small>Dificultad ×'+DIF.hp().toFixed(2)+(DK()>=29?' (máxima)':'')+' · ¡sube de nivel para aguantar!</small>',4);spawnFruits();if(S.day%5===0){bossPend=true;banner('⚠️ Esta NOCHE vendrá el MONSTRUO JEFE 👹<br><small>¡Prepárate con tus mejores armas!</small>',6)}else if(S.day%3===0)banner('🧑‍🌾 ¡El COMERCIANTE llegó a la base!<br><small>Solo por hoy: compra comida, vendas, agua y armas con tus 🪙 (pulsa E / COMPRAR)</small>',7);else if(S.day%3===1&&S.day>1){banner('👋 El comerciante se fue.<br><small>Volverá en 3 días</small>',5);if(shopOpen)closeShop()}if(S.day>=S.nextRun){S.nextRun=S.day+3;spawnCrates(6);msg('📦 ¡Aparecieron nuevas cajas de comida! Sal a buscarlas.',5)}}
 const ang=S.t*Math.PI*2-Math.PI/2,sh=Math.sin(ang),light=Math.max(0,Math.min(1,sh*2+.5));
 sun.position.set(player.position.x+Math.cos(ang)*50,Math.max(5,sh*60),player.position.z+20);sun.target.position.copy(player.position);
 const tint=Math.max(0,1-Math.abs(sh)*3.2);const cp0=player.position;
 sunBall.position.set(cp0.x+Math.cos(ang)*220,sh*220,cp0.z-80);moonBall.position.set(cp0.x-Math.cos(ang)*220,-sh*220,cp0.z-80);skyDome.position.copy(cam.position);
 sun.intensity=Math.min(1,Math.max(0,sh)*2.5)*1.5*(1-tint*.3);sun.color.setHex(0xffffff).lerp(new THREE.Color(0xff9a5a),tint);
 moon.intensity=Math.max(0,-sh)*.45;moon.position.set(cp0.x-Math.cos(ang)*50,Math.max(5,-sh*60),cp0.z+20);moon.target.position.copy(cp0);
 hemi.intensity=.25+light*.75;hemi.color.setHex(0x5060a0).lerp(new THREE.Color(0xcfe8ff),light);
 skyU.top.value.setHex(0x050a1e).lerp(new THREE.Color(0x3d86e0),light);const hz=new THREE.Color(0x141c3c).lerp(new THREE.Color(0xbfe3ff),light).lerp(new THREE.Color(0xff8a50),tint*.85);skyU.hor.value.copy(hz);skyU.bot.value.copy(hz).multiplyScalar(.5);
 bioC.lerp(_bc.setHex(BIOS[Math.max(0,curBio)].t),Math.min(1,dt*.7));hz.lerp(bioC,.5*light);skyU.top.value.lerp(bioC,.15*light);scene.fog.color.copy(hz);renderer.setClearColor(hz);winLit.emissiveIntensity=(1-light)*1.1;
 if((lampT-=dt)<=0){lampT=.5;const near=lampPos.map(p=>[p,p.distanceToSquared(cp0)]).sort((a,b)=>a[1]-b[1]);lampL.forEach((l,i)=>near[i]&&l.position.copy(near[i][0]))}lampL.forEach(l=>l.intensity=(1-light)*(LOW?18:25));stars.material.opacity=1-light;stars.visible=light<.6;
 const night=light<.4;$('tod').textContent=(night?'🌙 Noche':'☀️ Día')+(DK()?' · 💀×'+DIF.hp().toFixed(2):'');
 // comida: se vacía en 3 días
 S.food=Math.max(0,S.food-dt*100/(3*DAY)*DIF.food());const inBase=Math.hypot(player.position.x,player.position.z)<BASE;
 if(bossPend&&night&&!inside&&!boss&&!NET?.cl){bossPend=false;spawnBoss()}if(S.regen>0&&!S.down){const g=Math.min(S.regen,dt*15);S.regen-=g;S.hp=Math.min(S.maxHp,S.hp+g);if(Math.random()<dt*14)puff(player.position.clone().add(new THREE.Vector3(Math.random()-.5,1+Math.random(),Math.random()-.5)),[0xff80ff,0xffff8d,0x84ffff][Math.floor(Math.random()*3)],2,2,.12,-3,.8)}
 for(let i=loot.length-1;i>=0;i--){const l=loot[i],f=l.userData.fruit;if(f){l.userData.ph+=dt*2;f.position.y=1.1+Math.sin(l.userData.ph)*.2;f.rotation.y+=dt*1.5;f.children.forEach(c=>{if(c.isSprite){const a=performance.now()/350+c.userData.spark*1.6+i;c.position.set(Math.cos(a)*.5,Math.sin(a*1.3)*.35,Math.sin(a)*.5);c.scale.setScalar(.06+.09*Math.abs(Math.sin(a*2.2)))}})}if((f||l.userData.auto)&&Math.hypot(l.position.x-player.position.x,l.position.z-player.position.z)<1.3&&Math.abs(l.position.y-player.position.y)<1.6)take(l)}
 if(S.food<=0){S.hp-=dt*4;if(msgT<=0)msg('😫 ¡Tienes hambre! Busca cajas de comida 📦',2)}else if(inBase&&!S.down&&S.hp<S.maxHp)S.hp=Math.min(S.maxHp,S.hp+dt*3);
 // movimiento
 let mx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0)+jv.x,mz=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0)+jv.y;if(S.down){mx=mz=0;jumpQ=false}
 if(yaw!==lastYaw)manT=1;if(keys.KeyQ||keys.KeyA||keys.KeyD)manT=1;manT-=dt; if(keys.KeyQ||keys.KeyA)yaw+=dt*2.2;if(keys.KeyD)yaw-=dt*2.2;if(keys.KeyW)pitch=Math.max(-.3,pitch-dt);if(keys.KeyS)pitch=Math.min(1.1,pitch+dt);
 climbing=false;if(zip){mx=mz=0;jumpQ=false;zip.t+=dt*9/zip.len;const t=Math.min(1,zip.t),A=zip.A,B=zip.B;const hx=A.x+(B.x-A.x)*t,hz=A.z+(B.z-A.z)*t,hy=A.y+(B.y-A.y)*t-Math.sin(Math.PI*t)*.35;player.position.set(hx,Math.max(hy-2.6,gH(hx,hz,99)+.03),hz);zipH.position.set(hx,hy-.05,hz);zipH.rotation.y=Math.atan2(B.x-A.x,B.z-A.z)+Math.PI/2;faceTgt=Math.atan2(-(B.x-A.x),-(B.z-A.z));vy=0;onGround=false;
  if(t>=1){const dl=Math.hypot(B.x-A.x,B.z-A.z)||1;player.position.set(B.x-(B.x-A.x)/dl*1.2,B.top,B.z-(B.z-A.z)/dl*1.2);zip=null;zipH.visible=false;onGround=true;puff(player.position.clone().setY(B.top+.2),0xffffff,6,2,.12,1,.3)}}
 const sp=(keys.ShiftLeft||runT?9:5.5)*dt,l=Math.hypot(mx,mz);if(!inside&&!zip){const P=player.position;const Ld=ladders.find(L=>Math.hypot(L.x-P.x,L.z-P.z)<1.1&&P.y<L.top-.02);if(Ld){const s=Math.sin(yaw),c=Math.cos(yaw),wx=l>.1?(mx*c+mz*s)/Math.max(1,l):0;if(wx<-.3||P.y>.05){climbing=true;faceTgt=Math.PI/2;if(wx<-.3){climbT+=dt*7;P.set(Ld.x,P.y+3.2*dt,Ld.z);faceTgt=Math.PI/2;walkT+=dt*6;if(P.y>=Ld.top){P.set(Ld.rx,Ld.top,Ld.z);climbing=false;onGround=true;vy=0;msg('🏢 ¡Estás en el techo! Busca la tirolesa 🛝',2)}mx=mz=0}else if(wx>.3&&P.y>.05){climbing=false}}}}
 if(l>.1&&!climbing&&!zip){if(l>1){mx/=l;mz/=l}
  const s=Math.sin(yaw),c=Math.cos(yaw);let nx=player.position.x+(mx*c+mz*s)*sp,nz=player.position.z+(-mx*s+mz*c)*sp;
  if(faceLock<=0)faceTgt=Math.atan2(-(mx*c+mz*s),-(-mx*s+mz*c));const py0=player.position.y;if(pfree(nx,player.position.z,py0))player.position.x=nx;if(pfree(player.position.x,nz,py0))player.position.z=nz;
  /* v11: sin auto-rotación de cámara (mareaba) */
  walkT+=sp*1.7;legL.rotation.x=Math.sin(walkT)*.7;legR.rotation.x=-legL.rotation.x;armL.rotation.x=-legL.rotation.x*.8;if(Math.random()<dt*(sp>.1?14:6))puff(player.position.clone().setY(.1),0xb0a48a,1,1.5,.18,2,.5)}else{legL.rotation.x*=.8;legR.rotation.x*=.8;armL.rotation.x*=.8}
 {const P=player.position,gh=inside?0:gH(P.x,P.z,P.y);if(zip||climbing){jumpQ=false;vy=0;if(climbing)onGround=true}else{if(jumpQ&&onGround&&playing){vy=9.5;onGround=false;pRig?.acts?.Jump?pRig.play('Jump',.1,true):0;puff(player.position.clone().setY(.2),0xffffff,5,2,.12,1,.3)}jumpQ=false;if(onGround&&P.y>gh+.05){onGround=false;vy=0}if(!onGround){const py=P.y;vy-=24*dt;player.position.y+=vy*dt;if(pModel&&!pRig?.acts?.Jump)pModel.rotation.x=Math.max(-.35,Math.min(.35,-vy*.04));const g2=inside?0:gH(P.x,P.z,Math.max(py,P.y));if(vy<=0&&P.y<=g2){P.y=g2;vy=0;onGround=true;if(pModel)pModel.rotation.x=0}}else P.y=gh}}lastYaw=yaw;
 if(pRig){if(pRig.lock>0)pRig.lock-=dt;else pRig.play(l>.1?(sp>6*dt?'Run':'Walk'):'Idle',.2,false,l>.1?1.2:1)}
 if(biteT>0){biteT-=dt;bite.visible=true;bite.position.copy(player.position).add(_v.set(0,3.1,0));bite.scale.setScalar(1.6+Math.sin(biteT*30)*.15).setY(.8)}else bite.visible=false;
 if((merchantT-=dt)<=0&&merchantHere()&&!inside&&merchant.position.distanceTo(player.position)<4){merchantT=8;merchant.userData.rig?.play('Wave',.2,true);msg('🧑‍🌾 Comerciante: ¡Hola! Pulsa E / COMPRAR para ver mi tienda 🛒',4)}
 if(merchant.userData.rig&&merchant.userData.rig.lock>0){merchant.userData.rig.lock-=dt;if(merchant.userData.rig.lock<=0)merchant.userData.rig.play('Idle')}
 if(merchant.visible&&merchant.position.distanceTo(player.position)<9){let t=Math.atan2(player.position.x-merchant.position.x,player.position.z-merchant.position.z),d=t-merchant.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));merchant.rotation.y+=d*Math.min(1,dt*4)}
 const mh=merchantHere();merchant.visible=mh;mObst.r=mh?1.2:0;
 doorCD-=dt;if(inside){const rm=inside.rm;roomFill.position.set(player.position.x+Math.sin(camYaw)*2.5,3.2,player.position.z+Math.cos(camYaw)*2.5);if(doorCD<=0&&player.position.z>rm.D/2-1.1&&Math.abs(player.position.x-rm.RX)<2.2){leave()}else{player.position.x=Math.max(rm.RX-rm.W/2+.6,Math.min(rm.RX+rm.W/2-.6,player.position.x));player.position.z=Math.max(-rm.D/2+.9,Math.min(rm.D/2-.6,player.position.z))}}
 for(let i=loot.length-1;i>=0;i--){const lo=loot[i];if(lo.userData.fruit)continue;lo.children[0].rotation.y+=dt*2;lo.children[0].position.y=.7+Math.sin(performance.now()/300+i)*.1;if(lo.children[0].userData.coin){lo.children[0].rotation.y+=dt*2;lo.children[0].children.forEach(c=>{if(c.isSprite){const a=performance.now()/400+c.userData.spark*3+i;c.position.set(Math.cos(a)*.38,Math.sin(a*1.7)*.3,.08);c.material.opacity=.5+.5*Math.sin(a*3);c.scale.setScalar(.08+.08*Math.abs(Math.sin(a*2)))}})}if(lo.userData.auto&&lo.position.distanceTo(player.position)<1.3)take(lo)}
 dRingM.opacity=.5+Math.sin(performance.now()/250)*.3;
 if((hintT-=dt)<=0){hintT=.3;const ul=useLabel();$('use').innerHTML=ul;if(msgT<=0&&ul.includes('USAR')&&zipNear())msg(touch?'🛝 Toca USAR para usar la tirolesa':'🛝 Presiona E para usar la tirolesa',.5);else if(msgT<=0&&!ul.includes('AGARRAR')||msgT<=0&&nearest(loot,2))msg('Pulsa E: '+ul.replace('<br>',' '),.5)}
 if(faceLock>0)faceLock-=dt;{let d=faceTgt-face;d=Math.atan2(Math.sin(d),Math.cos(d));face+=d*Math.min(1,dt*12)}player.rotation.y=face;if(swing>0){swing-=dt;arm.rotation.x=-Math.sin((.3-swing)/.3*Math.PI)*1.6;arm.rotation.y=Math.sin((.3-swing)/.3*Math.PI)*.8}else{arm.rotation.x=arm.rotation.y=0}
 lamps.forEach(l=>l.material.color.set(night?0xfff3b0:0x555555));
 for(let i=armors.length-1;i>=0;i--){const a=armors[i];a.children.forEach(c=>{if(c.geometry?.type!=='TorusGeometry')c.rotation.y+=dt*2});if(Math.hypot(a.position.x-player.position.x,a.position.z-player.position.z)<1.5&&Math.abs(a.position.y-player.position.y)<1.6)takeArmor(a)}
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.rotation.y+=dt*2;if(p.position.distanceTo(player.position)<1.5){const w=p.userData.w;scene.remove(p);pickups.splice(i,1);markTaken(p.userData.id);if(!S.weap.includes(w))S.weap.push(w);S.cur=w;updW();msg('¡Encontraste: '+WEAP[w].i+' '+WEAP[w].n+'!',3)}}
 // cajas
 for(let i=crates.length-1;i>=0;i--){const c=crates[i];c.rotation.y+=dt;if(c.position.distanceTo(player.position)<1.6){scene.remove(c);crates.splice(i,1);markTaken(c.userData.id);S.food=Math.min(100,S.food+40);S.got++;puff(c.position.clone().setY(1),0xff5252,12,5,.2,9,.7);S.score+=0;msg('🍎 ¡Comida encontrada! +40')}}
 // zombies
 const want=Math.min(30,Math.round(((night?8:5)+S.day*(night?2:1))*Math.min(1.6,DIF.rate())));const nearN=zombies.filter(q=>!q.userData.sleep&&Math.hypot(q.position.x-player.position.x,q.position.z-player.position.z)<60).length;if(!NET?.cl&&!inside&&zombies.length<want+4+(NET?NET.rp.size*4:0)&&Math.random()<dt*(nearN<want/2?3:1)*(night?1.2:.6)*DIF.rate()*(NET?1+NET.rp.size*.7:1)){const fr=NET?[...NET.rp.values()].filter(R=>!R.inside):[];if(fr.length&&Math.random()<fr.length/(fr.length+1)){const R=fr[Math.floor(Math.random()*fr.length)];ZC=R.g.position;makeZ();ZC=null}else if(nearN<want)makeZ()}window.__nearZ=nearN;
 for(let i=zombies.length-1;i>=0;i--){const z=zombies[i],u=z.userData;if(inside){u.rig?.play('Idle');continue}
  if(u.sleep){u.sleep-=dt;if(!u.rig){z.scale.multiplyScalar(1-dt*2);z.rotation.z+=dt*3}else if(u.sleep<.4)z.scale.multiplyScalar(1-dt*3);if(u.sleep<=0){scene.remove(z);zombies.splice(i,1)}continue}
  if(NET?.cl){if(u.tx!==undefined){const k=Math.min(1,dt*10),ox=z.position.x,oz=z.position.z;if(Math.hypot(u.tx-ox,u.tz-oz)>12)z.position.set(u.tx,0,u.tz);else{z.position.x+=(u.tx-ox)*k;z.position.z+=(u.tz-oz)*k}let dr=u.try-z.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));z.rotation.y+=dr*k;const mv=Math.hypot(u.tx-ox,u.tz-oz);if(u.rig&&!(u.rig.lock>0))u.rig.play(mv>.03?(u.sp>2.6?'Run':'Walk'):'Idle',.25,false,1);if(u.rig&&u.rig.lock>0)u.rig.lock-=dt;u.wt+=dt*u.sp*2.2*(mv>.03?1:0);const [a1,a2,l1,l2]=u.limbs;l1.rotation.x=Math.sin(u.wt)*.6;l2.rotation.x=-l1.rotation.x}continue}
  let T=player.position,tid=null;if(NET?.host){let bd=S.down?1e9:Math.hypot(T.x-z.position.x,T.z-z.position.z);for(const [id,R] of NET.rp){if(R.down||R.inside)continue;const q=Math.hypot(R.g.position.x-z.position.x,R.g.position.z-z.position.z);if(q<bd){bd=q;T=R.g.position;tid=id}}}
  const dx=T.x-z.position.x,dz=T.z-z.position.z,d=Math.hypot(dx,dz);z.rotation.y=Math.atan2(dx,dz);
  if(!u.boss&&d>90){scene.remove(z);zombies.splice(i,1);if(u.bar)scene.remove(u.bar);continue}if(u.boss&&d>60){const a=yaw+(Math.random()-.5);for(let k=0;k<12;k++){const bx=player.position.x+Math.sin(a+k*.5)*28,bz=player.position.z+Math.cos(a+k*.5)*28;if(free(bx,bz)&&Math.hypot(bx,bz)>BASE+6){z.position.set(bx,0,bz);break}}}
  const det=(u.boss?999:34*(night?1.4:1)*DIF.det());if(d>det&&!u.boss){{const tg=Math.atan2(dx,dz);u.wa=(u.wa??tg)+(Math.random()-.5)*dt;let dd=tg-u.wa;dd=Math.atan2(Math.sin(dd),Math.cos(dd));u.wa+=dd*dt*.4}const wx=z.position.x+Math.sin(u.wa)*u.sp*.35*dt,wz=z.position.z+Math.cos(u.wa)*u.sp*.35*dt;if(free(wx,wz)&&Math.hypot(wx,wz)>BASE+1){z.position.x=wx;z.position.z=wz}else u.wa+=2;z.rotation.y=u.wa;u.rig?.play('Walk',.3,false,.5);continue}
  if(d>u.reach){let nx=z.position.x+dx/d*u.sp*dt,nz=z.position.z+dz/d*u.sp*dt;{const RB=BASE+(u.boss?3:1);if(Math.hypot(nx,nz)<RB){const a=Math.atan2(z.position.z,z.position.x)+dt*.5;nx=Math.cos(a)*RB;nz=Math.sin(a)*RB}}
   if(u.boss||free(nx,nz)){z.position.x=nx;z.position.z=nz}else{z.position.x+=dz/d*u.sp*dt;z.position.z-=dx/d*u.sp*dt}}
  else if(tid&&T.y<1.3&&d<=u.reach&&!((u.cdR??={})[tid]>performance.now())){u.cdR[tid]=performance.now()+(u.boss?1200:800);sendTo(tid,{t:'hurt',n:u.boss?(u.bdmg||25):Math.round(12*DIF.dmg()*(u.dm||1)),s:u.boss?'👹 ¡GRRR! ¡El jefe pega fuerte!':u.say,g:u.kind=='gigante'?1:0});u.rig?.play('Attack',.1,true,1.4)}
  else if(!tid&&!S.down&&dmgCD<=0&&player.position.y<1.3){hurtP(u.boss?(u.bdmg||25):Math.round(12*DIF.dmg()*(u.dm||1)));if(u.kind=='gigante')shakeT=.6;if(u.boss)msg('👹 ¡GRRR! ¡El jefe pega fuerte!',1.5);else dmgCD=.8;msg(u.say||'¡Ay! 🧟');u.rig?.play('Attack',.1,true,1.4);biteT=.6;pRig?.play('HitRecieve',.1,true,1.5);puff(player.position.clone().setY(1.6),0xff80ab,6,3,.15,2,.5)}
  if(u.rig&&!(u.rig.lock>0)){u.rig.play(d>u.reach?(u.sp>2.6?'Run':'Walk'):'Idle',.25,false,d>u.reach?u.sp/1.8:1)}if(u.rig&&u.rig.lock>0)u.rig.lock-=dt;
  u.wt+=dt*u.sp*2.2;const [a1,a2,l1,l2]=u.limbs;l1.rotation.x=Math.sin(u.wt)*.6;l2.rotation.x=-l1.rotation.x;a1.rotation.x=-1.4+Math.sin(u.wt)*.25;a2.rotation.x=-1.4-Math.sin(u.wt)*.25;z.rotation.z=Math.sin(u.wt*.5)*.06;if(u.hit>0){u.hit-=dt;z.children[1].material.color.set(u.hit>0?0xffffff:0x7cb342)}
  if(u.bar){u.bar.position.set(z.position.x,5.6,z.position.z);u.bar.quaternion.copy(cam.quaternion);const p=Math.max(0,u.hp/u.max);u.bar.userData.fg.scale.x=Math.max(.001,p);u.bar.userData.fg.position.x=-1.5*(1-p);$('bossBar').style.width=p*100+'%';$('bossTxt').textContent=Math.ceil(u.hp*10)}
  }
 // bolas
 for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.position.addScaledVector(b.userData.v,dt);b.userData.life-=dt;let hit=false;
  for(const z of zombies)if(!z.userData.sleep&&Math.hypot(z.position.x-b.position.x,z.position.z-b.position.z)<.9){hurtZ(z,b.userData.dmg);hit=true;break}
  if(hit||b.userData.life<=0||!free(b.position.x,b.position.z)){puff(b.position,0x4fc3f7,10,5,.14,12,.5);scene.remove(b);balls.splice(i,1)}}
 // HUD
 if(!inside&&Math.abs(player.position.x)>50000){for(const k in rooms)rooms[k].g.visible=false;showWorld();roomFill.visible=false;$('exitBtn').style.display='none';const r=S.lastDoor||{x:0,z:7};player.position.set(r.x,0,r.z+2.5);resetChunks();updChunks(true)}
 if(!inside&&(chT-=dt)<=0){chT=.25;updChunks(false);const bb=bioOfChunk(player.position.x,player.position.z);if(bb!==curBio){if(curBio>=0)banner('<b style="font-size:1.6em">'+BIOS[bb].l+'</b>',3);curBio=bb}}if(!inside){const _t=performance.now();stepGen(4);const _d=performance.now()-_t;if(_d>.05)PERF.push(_d)}ground.position.set(Math.round(player.position.x/4)*4,0,Math.round(player.position.z/4)*4);stars.position.set(player.position.x,0,player.position.z);
 {const dx=-player.position.x,dz=-player.position.z,dd=Math.hypot(dx,dz);const hb=$('home');hb.style.display=inside?'none':'';if(!inside){const fx=-Math.sin(camYaw),fz=-Math.cos(camYaw),rx=Math.cos(camYaw),rz=-Math.sin(camYaw);$('homeArr').style.transform='rotate('+Math.atan2(dx*rx+dz*rz,dx*fx+dz*fz)+'rad)';$('homeD').textContent=dd<BASE?'¡Estás en casa!':Math.round(dd)+' m'}}
 $('day').textContent=S.day;$('hp').style.width=Math.max(0,S.hp/S.maxHp*100)+'%';$('hpTxt').textContent=Math.max(0,Math.ceil(S.hp))+'/'+S.maxHp;$('lvl').textContent=S.lvl;$('xp').style.width=Math.min(100,S.xp/(S.lvl*30)*100)+'%';$('fd').style.width=S.food+'%';$('run3').textContent=Math.max(0,S.nextRun-S.day);$('score').textContent=S.score;$('crates').textContent=crates.length;
 if((saveT+=dt)>3){saveT=0;save()}
 if(NET&&S.hp<=0){S.hp=0;if(!S.down){S.down=1;pRig?.play('Death',.1,true);if(pRig)pRig.lock=1e9;document.exitPointerLock?.();banner('😴 ¡Te quedaste dormido!<br><small>Espera a que un amigo se acerque para despertarte 💫</small>',4)}else if(msgT<=0)msg('😴 Dormido… pide a un amigo que se acerque 💫',1)}
 else if(S.hp<=0)gameOver(S.food<=0?'Te quedaste sin comida 🍎':'¡Los zombies te atraparon! 🧟')}
addEventListener('visibilitychange',save);
// ---- v18 multijugador (PeerJS P2P, el anfitrión manda)
let NET=null,ZC=null,ZID=0;const RCOL=[0x42a5f5,0xef5350,0x66bb6a,0xffca28];const CODEC='ACDEFHJKMNPRTUVWXY34679';
function mpCode(){let s='';for(let i=0;i<5;i++)s+=CODEC[Math.floor(Math.random()*CODEC.length)];return s}
function loadPeer(){return window.Peer?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='lib/peerjs.min.js';s.onload=ok;s.onerror=()=>no(new Error('No se pudo cargar PeerJS'));document.head.appendChild(s)})}
function peerOpts(){return Object.assign({debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}]}},window.__PEERCFG||{})}
function myName(){return ($('mpName')?.value||'').trim().slice(0,12)||localStorage.getItem('zname')||'Jugador'}
function mpStatus(t){const e=$('mpStat');if(e)e.innerHTML=t}
function animName(){if(S.down)return'Death';if(zip)return'zip';if(climbing)return'climb';return pRig?.cur?._clip?.name||'Idle'}
function myState(){const P=player.position;return{id:NET.id,n:NET.name,c:NET.col,x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+face.toFixed(2),a:animName(),w:S.cur,ar:Object.fromEntries(Object.entries(S.arm||{}).map(([k,v])=>[k,v.t])),hp:Math.max(0,Math.round(S.hp)),mx:S.maxHp,d:S.down?1:0,k:NET.atk|0}}
function mkTag(txt,col){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 30px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='rgba(0,0,0,.55)';x.beginPath();x.roundRect?x.roundRect(8,6,240,52,20):x.rect(8,6,240,52);x.fill();x.fillStyle='#'+col.toString(16).padStart(6,'0');x.fillText(txt,128,33);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true}));s.scale.set(1.7,.42,1);s.position.y=2.75;s.renderOrder=12;return s}
function mkRemote(st){const col=RCOL[st.c%4];const g=new THREE.Group();let m=null,rg=null;
 if(MOD.jugador){m=SkeletonUtils.clone(MOD.pSrc||MOD.jugador.scene);fitModel(m,2.3);m.rotation.y=Math.PI;m.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color?.lerp(new THREE.Color(col),.5);o.castShadow=true;o.frustumCulled=false}});g.add(m);rg=rig(m,MOD.jugador.animations);rg.play('Idle')}else{const b=box(.9,2,.5,col);b.position.y=1;g.add(b)}
 const tag=mkTag(st.n||'Amigo',col);g.add(tag);const zz=new THREE.Mesh(new THREE.PlaneGeometry(.01,.01),new THREE.MeshBasicMaterial({visible:false}));g.add(zz);
 g.position.set(st.x,st.y,st.z);scene.add(g);return{g,m,rg,tag,st,tx:st.x,ty:st.y,tz:st.z,tr:st.r,w:-1,ar:'',k:st.k|0,hand:null,worn:{},revT:0,col}}
function remoteGear(R){const st=R.st;if(!R.m)return;if(!R.hand){let bone=null;R.m.traverse(o=>{if(!bone&&/Wrist\.?R|Hand_?R|RightHand/i.test(o.name))bone=o});if(bone){R.hand=new THREE.Group();bone.add(R.hand);bone.updateMatrixWorld(true);const ws=new THREE.Vector3();bone.getWorldScale(ws);R.hand.scale.setScalar(1/ws.x)}}
 if(R.hand&&R.w!==st.w){R.w=st.w;while(R.hand.children.length)R.hand.remove(R.hand.children[0]);const wm=st.w>0?wMesh(st.w):null;if(wm){gripApply(wm,st.w);R.hand.add(wm)}}
 const ak=JSON.stringify(st.ar||{});if(ak!==R.ar){R.ar=ak;for(const k in R.worn){R.worn[k].parent?.remove(R.worn[k])}R.worn={};const bones={};R.m.traverse(o=>{if(o.isBone){if(!bones.casco&&/^Head$/i.test(o.name))bones.casco=o;if(!bones.chaleco&&/^(Chest|Torso)$/i.test(o.name))bones.chaleco=o;if(!bones.escudo&&/^LowerArm\.?L$/i.test(o.name))bones.escudo=o}});
  for(const k in (st.ar||{})){const b=bones[k];if(!b||!ARM[k])continue;const m=armModel(k,st.ar[k],k=='casco'?.75:k=='chaleco'?.95:.85);if(!m)continue;b.updateMatrixWorld(true);const ws=new THREE.Vector3();b.getWorldScale(ws);const g=new THREE.Group();g.scale.setScalar(1/ws.x);g.add(m);if(k=='casco')m.position.set(0,.32,0);else if(k=='chaleco'){m.position.set(0,.05,.04);m.rotation.y=Math.PI}else{m.position.set(-.12,.15,0);m.rotation.set(0,-Math.PI/2,0)}b.add(g);R.worn[k]=g}}}
function upRemote(st){if(!NET||st.id===NET.id)return;let R=NET.rp.get(st.id);if(!R){R=mkRemote(st);NET.rp.set(st.id,R);if(NET.host)msg('👋 ¡'+(st.n||'Un amigo')+' entró a tu sala!',3);updMpHud()}const was=R.st;R.st=st;R.tx=st.x;R.ty=st.y;R.tz=st.z;R.tr=st.r;R.seen=performance.now();R.down=!!st.d;R.inside=Math.abs(st.x)>50000;
 if(st.n!==was.n){R.g.remove(R.tag);R.tag=mkTag(st.n,R.col);R.g.add(R.tag)}}
function rmRemote(id){const R=NET?.rp.get(id);if(!R)return;scene.remove(R.g);if(R.rg)mixers.delete(R.rg.mx);NET.rp.delete(id);updMpHud()}
function animRemote(R,dt){const k=Math.min(1,dt*10),g=R.g;const mv=Math.hypot(R.tx-g.position.x,R.tz-g.position.z);if(mv>25)g.position.set(R.tx,R.ty,R.tz);else{g.position.x+=(R.tx-g.position.x)*k;g.position.y+=(R.ty-g.position.y)*k;g.position.z+=(R.tz-g.position.z)*k}let d=R.tr-g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));g.rotation.y+=d*k;
 g.visible=Math.abs(R.tx-player.position.x)<300&&Math.abs(R.tz-player.position.z)<300;remoteGear(R);const st=R.st;if(R.m){R.m.rotation.x=0;R.m.position.y=st.a=='zip'?0:R.m.position.y}
 if(R.rg){if((st.k|0)!==R.k){R.k=st.k|0;R.rg.play(st.w==0?'Punch_Right':WEAP[st.w]?.m?'Sword_Slash':'Gun_Shoot',.08,true,1.8)}if(R.rg.lock>0)R.rg.lock-=dt;else{const a=st.a=='zip'?'Idle':st.a=='climb'?'Walk':st.a;if(a=='Death'){if(R.rg.cur!==R.rg.acts.Death)R.rg.play('Death',.1,true),R.rg.lock=0}else R.rg.play(R.rg.acts[a]?a:'Idle',.2)}}
 R.tag.material.opacity=1;}
function updMpHud(){const h=$('mpHud');if(!h)return;if(!NET){h.style.display='none';return}h.style.display='';h.innerHTML='👥 '+(NET.rp.size+1)+'/4'+(NET.host?' · Sala <b>'+NET.code+'</b>':'')}
function netSend(o){if(!NET)return;if(NET.host){for(const c of NET.conns.values())if(c.open)c.send(o)}else if(NET.conn?.open)NET.conn.send(o)}
function sendTo(id,o){const c=NET?.conns.get(id);if(c&&c.open)c.send(o)}
function applyTaken(id){if(!S||!id)return;if(!isTaken(id)){S.ck??={};(S.ck[chunkKeyOf(id)]??=[]).push(id)}for(const arr of [loot,pickups,armors,crates]){for(let i=arr.length-1;i>=0;i--)if(arr[i].userData.id===id){scene.remove(arr[i]);arr.splice(i,1)}}}
function reviveMe(){if(!S.down)return;S.down=0;S.hp=Math.round(S.maxHp*.5);pRig?.play('Idle',.2);if(pRig)pRig.lock=0;puff(player.position.clone().setY(1.5),0xffff8d,20,4,.2,-2,1);banner('💫 ¡Un amigo te despertó!',2.5)}
function wipeAll(){S.down=0;S.hp=Math.round(S.maxHp*.5);if(pRig)pRig.lock=0;pRig?.play('Idle',.2);if(inside)leave();player.position.set((Math.random()-.5)*4,0,3+(Math.random()-.5)*4);banner('😴 Todos se durmieron…<br><small>¡Despiertan juntos en casa! 🏠</small>',4)}
function onMsg(from,d){if(!d||!NET||(!S||!playing&&!NET.host)&&d.t!='hi'&&d.t!='full')return;const t=d.t;
 if(t=='p'){if(NET.host){d.id=from;upRemote(d)}}
 else if(t=='s'){NET.last=performance.now();if(!NET.host){if(Math.abs(S.t-d.tm)>.01||S.day!==d.dy){S.t=d.tm}if(d.dy>S.day)S.day=d.dy;
   const seen=new Set();for(const a of d.z){const [id,ki,x,z,r,sl,bs]=a;seen.add(id);let q=zombies.find(o=>o.userData.nid===id);if(!q){if(sl)continue;ZC={x,z};makeZ(ki);ZC=null;q=zombies[zombies.length-1];q.userData.nid=id;q.position.set(x,0,z);q.rotation.y=r;if(bs){q.userData.boss=1;q.scale.setScalar(2.2);q.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color?.lerp(new THREE.Color(0x9c27b0),.55)}})}}
    const u=q.userData;u.tx=x;u.tz=z;u.try=r;if(sl&&!u.sleep){u.sleep=u.rig?1.4:.6;u.rig?.play('Death',.1,true,1.3);puff(q.position.clone().setY(1.5),0xe1f5fe,14,4,.3,-1,1);if(!u.boss){if(Math.random()<.5)addLoot('moneda',x,z,null,true);for(let k=0;k<(u.coins||0);k++)addLoot('moneda',x+Math.cos(k*1.3)*1.4,z+Math.sin(k*1.3)*1.4,null,true)}}}
   for(let i=zombies.length-1;i>=0;i--){const q=zombies[i];if(!seen.has(q.userData.nid)&&!q.userData.sleep){scene.remove(q);zombies.splice(i,1)}}
   const ids=new Set();for(const p of d.pl){ids.add(p.id);upRemote(p)}for(const id of [...NET.rp.keys()])if(!ids.has(id))rmRemote(id)}}
 else if(t=='hi'){NET.id=d.id;NET.col=d.c;NET.code=d.code;start(!!localStorage.getItem('zsave'));for(const k in d.ck||{})for(const id of d.ck[k])applyTaken(id);S.t=d.tm;S.day=Math.max(S.day,d.dy);player.position.set(d.x+2,d.y||0,d.z+2);resetChunks();updChunks(true);$('mp').style.display='none';NET.last=performance.now();banner('👥 ¡Entraste a la sala <b>'+d.code+'</b>!<br><small>Jueguen juntos. Si alguien se queda dormido 😴, acérquense para despertarlo.</small>',5);updMpHud()}
 else if(t=='full'){mpStatus('😕 La sala está llena (máximo 4 jugadores)');NET.conn?.close();}
 else if(t=='hit'){if(NET.host){const q=zombies.find(o=>o.userData.nid===d.id);if(q)hurtZ(q,d.n,from)}}
 else if(t=='kill'){S.score++;gainXP(d.b?120:10);msg(d.b?'🏆 ¡Dormiste al MONSTRUO JEFE! +120 XP':'💤 ¡Zombie dormido! +10 XP',1.5)}
 else if(t=='hurt'){if(S.down)return;hurtP(d.n);if(d.g)shakeT=.6;msg(d.s||'¡Ay! 🧟');biteT=.6;pRig?.play('HitRecieve',.1,true,1.5);puff(player.position.clone().setY(1.6),0xff80ab,6,3,.15,2,.5)}
 else if(t=='tk'){applyTaken(d.id);if(NET.host)for(const [id,c] of NET.conns)if(id!==from&&c.open)c.send(d)}
 else if(t=='rev'){if(d.to===NET.id)reviveMe();else if(NET.host)sendTo(d.to,d)}
 else if(t=='wipe'){wipeAll()}
 else if(t=='bye'){if(NET.host)rmRemote(from);else netEnd('👋 El anfitrión cerró la sala')}}
function netEnd(why){if(!NET)return;const n=NET;NET=null;try{for(const id of [...n.rp.keys()]){const R=n.rp.get(id);scene.remove(R.g);if(R.rg)mixers.delete(R.rg.mx)}n.peer?.destroy()}catch(e){}updMpHud();if(n.host)return;
 if(S){S.down=0;if(S.hp<=0)S.hp=Math.round(S.maxHp*.5);save()}playing=false;document.exitPointerLock?.();zombies.forEach(z=>scene.remove(z));zombies=[];$('start').style.display='flex';$('mp').style.display='flex';$('mpLobby').style.display='none';$('mpMain').style.display='';mpStatus('⚠️ '+why+'. Tu progreso se guardó.');if(localStorage.getItem('zsave'))$('bCont').style.display=''}
function netTick(dt){if(!NET||!S)return;NET.acc+=dt;
 for(const R of NET.rp.values())animRemote(R,dt);
 if(playing&&!S.down){for(const [id,R] of NET.rp){if(R.down&&R.g.visible&&Math.hypot(R.g.position.x-player.position.x,R.g.position.z-player.position.z)<2.6){R.revT+=dt;if(Math.random()<dt*10)puff(R.g.position.clone().setY(1+Math.random()),0xffff8d,2,2,.12,-2,.8);msg('💫 Despertando a '+(R.st.n||'tu amigo')+'… '+Math.min(100,Math.round(R.revT/2.5*100))+'%',.3);if(R.revT>=2.5){R.revT=0;R.down=false;R.st.d=0;if(NET.host)sendTo(id,{t:'rev',to:id});else netSend({t:'rev',to:id});msg('💫 ¡Despertaste a '+(R.st.n||'tu amigo')+'!',2)}}else R.revT=0}}
 if(NET.acc<1/12)return;NET.acc=0;const me=myState();
 if(NET.host){for(const [id,R] of NET.rp)if(performance.now()-R.seen>15000){rmRemote(id);NET.conns.get(id)?.close();NET.conns.delete(id)}
  const pl=[me,...[...NET.rp.values()].map(R=>R.st)];const z=zombies.slice(0,60).map(q=>{const u=q.userData;return[u.nid,u.kind||'zombie',+q.position.x.toFixed(2),+q.position.z.toFixed(2),+q.rotation.y.toFixed(2),u.sleep?1:0,u.boss?1:0]});
  netSend({t:'s',tm:S.t,dy:S.day,z,pl});
  if(NET.rp.size&&S.down&&[...NET.rp.values()].every(R=>R.down)){netSend({t:'wipe'});wipeAll();for(const R of NET.rp.values()){R.down=false;R.st.d=0}}}
 else{netSend(Object.assign({t:'p'},me));if(performance.now()-NET.last>12000)netEnd('📡 Se perdió la conexión con el anfitrión')}}
function hostConn(c){c.on('open',()=>{if(NET.conns.size>=3){c.send({t:'full'});setTimeout(()=>c.close(),500);return}const id=c.peer;NET.conns.set(id,c);const used=new Set([0,...[...NET.rp.values()].map(R=>R.st.c)]);let col=1;while(used.has(col))col++;const P=player.position;
  c.send({t:'hi',id,c:col%4,code:NET.code,ck:S.ck||{},tm:S.t,dy:S.day,x:P.x,y:inside?0:P.y,z:P.z});
  c.on('data',d=>onMsg(id,d));c.on('close',()=>{const R=NET?.rp.get(id);if(R)msg('👋 '+(R.st.n||'Un amigo')+' salió de la sala',3);if(NET){rmRemote(id);NET.conns.delete(id)}});c.on('error',()=>{})})}
async function mpCreate(tries=0){mpStatus('⏳ Creando sala…');try{await loadPeer()}catch(e){mpStatus('⚠️ '+e.message);return}localStorage.setItem('zname',myName());const code=mpCode();
 const peer=new Peer('zpwa-'+code,peerOpts());NET={host:true,peer,code,id:'host',name:myName(),col:0,conns:new Map(),rp:new Map(),acc:0,atk:0};
 peer.on('open',()=>{$('mpMain').style.display='none';$('mpLobby').style.display='';$('mpCode').textContent=code;mpStatus('Comparte este código con tus amigos. Pueden entrar en cualquier momento (máx. 4).');updMpHud()});
 peer.on('connection',hostConn);peer.on('error',e=>{if(e.type=='unavailable-id'&&tries<4){peer.destroy();NET=null;mpCreate(tries+1)}else if(!playing)mpStatus('⚠️ No se pudo crear la sala ('+(e.type||e.message)+'). Revisa tu internet.');else msg('⚠️ Problema de conexión: '+(e.type||''),3)});
 peer.on('disconnected',()=>{try{peer.reconnect()}catch(e){}})}
async function mpJoin(){const code=($('mpIn').value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/O/g,'0');if(code.length<5){mpStatus('Escribe el código de 5 letras');return}mpStatus('⏳ Buscando la sala '+code+'…');try{await loadPeer()}catch(e){mpStatus('⚠️ '+e.message);return}localStorage.setItem('zname',myName());
 const peer=new Peer(undefined,peerOpts());NET={host:false,cl:true,peer,code,id:null,name:myName(),col:1,conns:new Map(),rp:new Map(),acc:0,atk:0,last:performance.now()+20000};
 peer.on('open',()=>{const c=peer.connect('zpwa-'+code,{reliable:true,serialization:'json'});NET.conn=c;c.on('data',d=>onMsg('host',d));c.on('close',()=>{if(NET&&!NET.host)netEnd(playing?'👋 El anfitrión salió de la sala':'No se pudo entrar')});c.on('error',()=>{});setTimeout(()=>{if(NET&&!NET.id)mpStatus('😕 No encontramos esa sala. Revisa el código.')},12000)});
 peer.on('error',e=>{if(e.type=='peer-unavailable'){mpStatus('😕 No existe una sala con el código '+code);peer.destroy();NET=null}else if(!playing){mpStatus('⚠️ Error de conexión ('+(e.type||e.message)+')')}})}
function mpPlay(){$('mp').style.display='none';start(!!localStorage.getItem('zsave'));updMpHud()}
$('bMulti').onclick=()=>{$('mp').style.display='flex';$('mpMain').style.display='';$('mpLobby').style.display='none';$('mpName').value=localStorage.getItem('zname')||'';mpStatus('')};
$('mpBack').onclick=()=>{$('mp').style.display='none';if(NET&&!playing){NET.peer?.destroy();NET=null;updMpHud()}};$('mpNew').onclick=()=>mpCreate();$('mpGo').onclick=()=>mpJoin();$('mpIn').addEventListener('keydown',e=>{if(e.key=='Enter')mpJoin()});$('mpPlay').onclick=mpPlay;
$('mpCopy').onclick=async()=>{const c=NET?.code||'';const txt='¡Juega conmigo a Sobrevive a los Zombies! 🧟 Código de sala: '+c+' — '+location.href.split('#')[0];try{if(navigator.share&&touch)await navigator.share({title:'Sala zombie',text:txt});else{await navigator.clipboard.writeText(c);$('mpCopy').textContent='✅ ¡Copiado!';setTimeout(()=>$('mpCopy').textContent='📋 Copiar / Compartir',1500)}}catch(e){}};
addEventListener('pagehide',()=>{if(NET)netSend({t:'bye'})});setInterval(()=>{if(NET&&document.hidden){NET.acc=1;netTick(0)}},1000);

loop();window.__ok=true;

window.__saveGame=()=>save();window.__cam=cam;window.__scene=scene;window.__g={net:()=>NET,mpCreate,mpJoin,netEnd,hurtZ,rp:()=>NET?[...NET.rp.values()].map(R=>({id:R.st.id,n:R.st.n,x:R.g.position.x,z:R.g.position.z,d:R.down,w:R.st.w,ar:R.st.ar,vis:R.g.visible,hasM:!!R.m})):[],armors:()=>armors,addArmor,hurtP,bio:()=>curBio,shake:()=>shakeT,pm:()=>pModel,lootA:()=>loot,pickA:()=>pickups,startZip,zipNear,climbT:()=>climbT,rl:()=>[...chunks.values()].flatMap(c=>c.rl.map(r=>[...r,c.key])),crates:()=>crates,ladders,zips,zip:()=>zip,gH,onGround:()=>onGround,climbing:()=>climbing,rects,obst,WGEO:()=>Object.fromEntries(Object.entries(WGEO).map(([k,v])=>{v.geo.computeBoundingBox();const b=v.geo.boundingBox;return[k,[b.min.toArray().map(x=>+x.toFixed(2)),b.max.toArray().map(x=>+x.toFixed(2))]]})),nearZ:()=>window.__nearZ,BASE,addPickup,pickups,setW:n=>{S.cur=n;updW()},jump:()=>{jumpQ=true},py:()=>player.position.y,held:()=>window.__held,handG:()=>handG,draws:()=>renderer.info.render.calls,genQ:()=>genQ.length,face:()=>face,addLoot,merchant,free,chunks:()=>chunks,objCount:()=>{let n=0;scene.traverse(()=>n++);return n},info:()=>renderer.info.memory,spawnBoss,boss:()=>boss,gainXP,spawnFruits,take,yaw:()=>yaw,save,S:()=>S,doors,enter,leave,interact,openShop,buy,player,makeZ,zombies:()=>zombies,loot,merchant,setYaw:v=>{yaw=v;camYaw=v},inside:()=>inside};
