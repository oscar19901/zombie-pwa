import * as THREE from 'three';
import {GLTFLoader} from './lib/loaders/GLTFLoader.js';import * as SkeletonUtils from './lib/utils/SkeletonUtils.js';
const $=id=>document.getElementById(id);
const DAY=90; // segundos reales por día
const LOW=('ontouchstart' in window)||innerWidth<900||(navigator.hardwareConcurrency||4)<=4;
const renderer=new THREE.WebGLRenderer({antialias:!LOW,powerPreference:'high-performance'});renderer.setPixelRatio(LOW?Math.min(devicePixelRatio,1.25):Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=LOW?THREE.PCFShadowMap:THREE.PCFSoftShadowMap;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xbfe3ff,25,LOW?85:130);
const cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,400);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
const hemi=new THREE.HemisphereLight(0xcfe8ff,0x4a4033,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048);sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;
Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:200});scene.add(sun,sun.target);
const moon=new THREE.DirectionalLight(0x8fa8ff,0);scene.add(moon,moon.target);
const M=c=>new THREE.MeshLambertMaterial({color:c});
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
const TM=(t,rx,ry,c=0xffffff)=>{const k=t.clone();k.needsUpdate=true;k.repeat.set(rx,ry);return new THREE.MeshLambertMaterial({map:k,color:c})};
// Partículas
const parts=[],pGeo=new THREE.BoxGeometry(1,1,1),pMats={};
function puff(p,col,n,spd,size,grav=9,life=.6){if(LOW)n=Math.ceil(n/2);for(let i=0;i<n;i++){const m=new THREE.Mesh(pGeo,pMats[col]||(pMats[col]=new THREE.MeshBasicMaterial({color:col,transparent:true})));m.scale.setScalar(size*(.6+Math.random()*.6));m.position.copy(p);
 m.userData={v:new THREE.Vector3((Math.random()-.5)*spd,Math.random()*spd*.8,(Math.random()-.5)*spd),g:grav,l:life,L:life};scene.add(m);parts.push(m)}}
function updParts(dt){for(let i=parts.length-1;i>=0;i--){const m=parts[i],u=m.userData;u.l-=dt;u.v.y-=u.g*dt;m.position.addScaledVector(u.v,dt);if(m.position.y<.05){m.position.y=.05;u.v.multiplyScalar(.5)}m.rotation.x+=dt*5;m.scale.multiplyScalar(1-dt*1.2);if(u.l<=0){scene.remove(m);parts.splice(i,1)}}}
const box=(w,h,d,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.castShadow=m.receiveShadow=true;return m};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshLambertMaterial({map:T.side}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const WORLD=100,BASE=9,obst=[],rects=[],hidePts=[],doors=[];
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
// pasto de la casa segura
const lawn=new THREE.Mesh(new THREE.CircleGeometry(BASE+1,40),new THREE.MeshLambertMaterial({map:T.grass}));lawn.rotation.x=-Math.PI/2;lawn.position.y=.025;lawn.receiveShadow=true;scene.add(lawn);
const house=new THREE.Group();const wall=box(6,3.5,6,0xc9a26b);wall.position.y=1.75;const roof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,4),M(0xb03a2e));roof.position.y=4.7;roof.rotation.y=Math.PI/4;
const door=box(1.4,2.4,.1,0x6b3e1e);door.position.set(0,1.2,3.01);house.add(wall,roof,door);house.position.set(0,0,-3);scene.add(house);obst.push({x:0,z:-3,r:3.6});
for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(Math.abs(a-Math.PI/2)<.2)continue;const p=box(.3,1.4,.3,0x8d6e4a);p.position.set(Math.cos(a)*BASE,.7,Math.sin(a)*BASE);scene.add(p)}
const ring=new THREE.Mesh(new THREE.RingGeometry(BASE-.2,BASE+.2,64),new THREE.MeshBasicMaterial({color:0xffee88}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;scene.add(ring);
// calles: cuadrícula cada 30, calles de 10 de ancho en x,z = -90,-60,...,90
const G=30;for(let k=-3;k<=3;k++){for(const v of[0,1]){const st=new THREE.Mesh(new THREE.PlaneGeometry(v?10:200,v?200:10),v?TM(T.asphalt,2,40):TM(T.asphalt,40,2));st.rotation.x=-Math.PI/2;st.position.set(v?k*G:0,v?.015:.017,v?0:k*G);st.receiveShadow=true;scene.add(st);
 for(let j=-95;j<95;j+=8){const l=new THREE.Mesh(new THREE.PlaneGeometry(v?.3:3,v?3:.3),new THREE.MeshBasicMaterial({color:0xd8c860}));l.rotation.x=-Math.PI/2;l.position.set(v?k*G:j,.02,v?j:k*G);scene.add(l)}}}
const bcol=[0x8a7f74,0x6f7378,0x9b8b6e,0x7a6a63,0x5f6b6d];
const winDark=new THREE.MeshLambertMaterial({color:0x1a2433}),winLit=new THREE.MeshLambertMaterial({color:0x1a2433,emissive:0xffc66b,emissiveIntensity:0}),winGeo=new THREE.PlaneGeometry(1.2,1.4),frGeo=new THREE.BoxGeometry(1.5,.15,.3),frMat=M(0xd7ccc8);
function building(x,z,w,d,h){const g=new THREE.Group();const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),TM(rnd()<.5?T.brick:T.concrete,w/4,h/4,bcol[Math.floor(rnd()*5)]|0x404040));b.castShadow=b.receiveShadow=true;b.position.y=h/2;g.add(b);
 for(let y=3;y<h-.5;y+=3){const ld=box(w+.3,.18,d+.3,0x9e9890);ld.castShadow=false;ld.position.y=y-.4;g.add(ld)}
 const cr=box(w+.4,.5,d+.4,0x7d766d);cr.position.y=h+.1;g.add(cr);
 if(rnd()<.6){const ac=box(1.4,1,1.2,0xb0bec5);ac.position.set(-w/4,h+.8,d/5);g.add(ac)}
 if(rnd()<.4){const tk=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,1.6,10),M(0x8d6e63));tk.position.set(w/4,h+1.2,-d/5);tk.castShadow=true;g.add(tk)}
 if(rnd()<.3){const an=box(.08,3,.08,0x333333);an.position.set(0,h+1.8,0);g.add(an)}
 const wm=winDark;for(let y=2;y<h-1;y+=3)for(let i=-w/2+1.5;i<w/2-1;i+=2.5){if(rnd()<.8){const wn=new THREE.Mesh(winGeo,rnd()<.3?winLit:wm);const fr=new THREE.Mesh(frGeo,frMat);fr.position.set(i,y-.8,d/2+.08);g.add(fr);wn.position.set(i,y,d/2+.01);g.add(wn);const w2=wn.clone();w2.position.z=-d/2-.01;w2.rotation.y=Math.PI;g.add(w2)}}
 if(rnd()<.5){const c=box(w*.4,1.5,d*.4,0x5a5148);c.position.set(w*.2,h+.3,0);c.rotation.z=.3;g.add(c)} // techo roto
 // puerta abierta (hueco oscuro)
 const dr=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.4),M(0x0d0d0d));dr.position.set(0,1.2,d/2+.02);g.add(dr);
 const dRing=new THREE.Mesh(new THREE.RingGeometry(.7,.95,24),new THREE.MeshBasicMaterial({color:0x76ff03,side:2,transparent:true,opacity:.8}));dRing.rotation.x=-Math.PI/2;dRing.position.set(0,.06,d/2+1.3);g.add(dRing);
 doors.push({x,z:z+d/2+1.3,id:doors.length,ring:dRing});
 g.position.set(x,0,z);scene.add(g);rects.push({x,z,w:w/2+.5,d:d/2+.5});hidePts.push([x+(rnd()-.5)*w*.6,z+d/2+1.6])}
for(let i=-3;i<3;i++)for(let j=-3;j<3;j++){const cx=i*G+G/2,cz=j*G+G/2;
 for(const[ox,oz]of[[-6,-6],[6,-6],[-6,6],[6,6]]){const x=cx+ox,z=cz+oz;if(Math.hypot(x,z)<BASE+8)continue;if(rnd()<.15)continue;building(x,z,7+rnd()*3,7+rnd()*3,4+rnd()*12)}}
// autos abandonados
const ccol=[0xc62828,0x1565c0,0xf9a825,0x2e7d32,0x6d4c41,0xeeeeee];
for(let i=0;i<40;i++){const k=Math.floor(rnd()*7)-3,v=rnd()<.5,t=(rnd()-.5)*180;let x=v?k*G+(rnd()<.5?-2.5:2.5):t,z=v?t:k*G+(rnd()<.5?-2.5:2.5);if(Math.hypot(x,z)<BASE+4)continue;
 const g=new THREE.Group();const b=box(2,1,4,ccol[i%6]);b.position.y=.7;const tp=box(1.8,.7,2,0x8fb3c9);tp.position.set(0,1.5,-.2);const rf=box(1.84,.12,2.04,ccol[i%6]);rf.position.set(0,1.88,-.2);
 const bm=box(2.05,.25,.2,0x9e9e9e);bm.position.set(0,.45,2.05);const bm2=bm.clone();bm2.position.z=-2.05;const hl=box(.4,.2,.05,0xfff59d);hl.position.set(-.6,.8,2.01);const hl2=hl.clone();hl2.position.x=.6;
 const tl=box(.4,.2,.05,0xd32f2f);tl.position.set(-.6,.8,-2.01);const tl2=tl.clone();tl2.position.x=.6;g.add(b,tp,rf,bm,bm2,hl,hl2,tl,tl2);
 for(const[wx,wz]of[[-1,1.3],[1,1.3],[-1,-1.3],[1,-1.3]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.3,10),M(0x111111));w.rotation.z=Math.PI/2;w.position.set(wx,.4,wz);g.add(w)}
 g.position.set(x,0,z);g.rotation.y=(v?0:Math.PI/2)+(rnd()-.5)*.6;if(rnd()<.2)g.rotation.z=.15;scene.add(g);rects.push({x,z,w:v?1.4:2.4,d:v?2.4:1.4});hidePts.push([x+(v?2:0),z+(v?0:2)])}
// escombros y postes de luz
for(let i=0;i<80;i++){const x=(rnd()-.5)*190,z=(rnd()-.5)*190;if(Math.hypot(x,z)<BASE+3)continue;const r=box(.5+rnd(),.3+rnd()*.5,.5+rnd(),0x777066);r.position.set(x,.2,z);r.rotation.y=rnd()*3;scene.add(r)}
const lamps=[];for(let k=-3;k<=3;k++)for(let j=-3;j<3;j++){const x=k*G+5.5,z=j*G+G/2;if(Math.hypot(x,z)<BASE+3)continue;const g=new THREE.Group();const p=box(.2,5,.2,0x444444);p.position.y=2.5;const arm=box(1.2,.15,.15,0x444444);arm.position.set(-.6,5,0);
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.25,8,6),new THREE.MeshBasicMaterial({color:0x555555}));bulb.position.set(-1.2,4.85,0);g.add(p,arm,bulb);g.position.set(x,0,z);scene.add(g);obst.push({x,z,r:.3});lamps.push(bulb)}
const lampPos=lamps.map(b=>b.getWorldPosition(new THREE.Vector3()));const lampL=[];for(let i=0;i<(LOW?3:8);i++){const l=new THREE.PointLight(0xffb866,0,20,1.4);scene.add(l);lampL.push(l)}
function decor(){const spots=[];for(let n=0;n<400&&spots.length<(LOW?90:160);n++){const k=Math.floor(rnd()*7)-3,v=rnd()<.5,t=(rnd()-.5)*180,o=(rnd()<.5?-1:1)*(6+rnd()*1.5);const x=v?k*G+o:t,z=v?t:k*G+o;if(Math.hypot(x,z)<BASE+3||!free(x,z))continue;spots.push([x,z,v])}
 spots.forEach(([x,z,v],i)=>{const r=i%5,g=new THREE.Group();g.position.set(x,0,z);
  if(r==0){const tr=new THREE.Mesh(new THREE.CylinderGeometry(.18,.25,2.2,7),M(0x6d4c2f));tr.position.y=1.1;tr.castShadow=true;g.add(tr);for(let j=0;j<3;j++){const lf=new THREE.Mesh(new THREE.IcosahedronGeometry(1.1-j*.2,0),M([0x388e3c,0x43a047,0x2e7d32][j]));lf.position.set((rnd()-.5)*.6,2.4+j*.7,(rnd()-.5)*.6);lf.castShadow=true;g.add(lf)}obst.push({x,z,r:.4})}
  else if(r==1){for(let j=0;j<3;j++){const bu=new THREE.Mesh(new THREE.IcosahedronGeometry(.5+rnd()*.3,0),M(0x558b2f));bu.position.set((rnd()-.5)*1.2,.4,(rnd()-.5)*1.2);bu.castShadow=true;g.add(bu)}}
  else if(r==2){const tc=new THREE.Mesh(new THREE.CylinderGeometry(.4,.35,1,10),M(0x546e7a));tc.position.y=.5;tc.castShadow=true;const lid=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.1,10),M(0x37474f));lid.position.set(.2,1.05,0);lid.rotation.z=rnd()<.5?.5:0;g.add(tc,lid);obst.push({x,z,r:.4})}
  else if(r==3){for(let j=0;j<5;j++){if(rnd()<.35)continue;const pl=box(.12,1.2,.6,0xa1887f);pl.position.set(0,.6,j*.65-1.3);pl.rotation.x=(rnd()-.5)*.5;if(rnd()<.25){pl.rotation.z=1.4;pl.position.y=.1}g.add(pl)}const rl=box(.08,.1,3,0x8d6e63);rl.position.set(0,.9,0);rl.rotation.x=.12;g.add(rl);g.rotation.y=v?0:Math.PI/2}
  else{for(let j=0;j<4;j++){const d=box(.3+rnd()*.5,.2+rnd()*.3,.3+rnd()*.5,[0x795548,0x9e9e9e,0x6d6d6d][j%3]);d.position.set((rnd()-.5)*1.5,.15,(rnd()-.5)*1.5);d.rotation.y=rnd()*3;g.add(d)}}
  scene.add(g)})}
decor();
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:900},()=>(Math.random()-.5)*400).map((v,i)=>i%3==1?Math.abs(v)/2+60:v),3)),new THREE.PointsMaterial({color:0xffffff,size:.8}));scene.add(stars);
// armas
const WEAP=[{n:'Puños',i:'👊',m:1,dmg:1,rng:1.7,cd:.4,kb:2},{n:'Bate',i:'🏏',m:1,dmg:2,rng:2.3,cd:.5,kb:4,c:0xc49a6c,len:1.3},{n:'Tubo',i:'🔧',m:1,dmg:2,rng:2.4,cd:.4,kb:3,c:0x9e9e9e,len:1.4},
 {n:'Palo-machete',i:'🗡️',m:1,dmg:3,rng:2.5,cd:.45,kb:3,c:0x8bc34a,len:1.5},{n:'Pistola de agua',i:'🔫',m:0,dmg:1,cd:.3,sz:.2,sp:28},{n:'Lanzador gigante',i:'💦',m:0,dmg:3,cd:.7,sz:.45,sp:22}];
const pickups=[];
function addPickup(w,x,z){const g=new THREE.Group();const W=WEAP[w];const m=W.m?box(.2,W.len,.2,W.c):box(.8,.5,.3,w==4?0x29b6f6:0xff7043);m.position.y=1;m.rotation.z=.6;
 const glow=new THREE.Mesh(new THREE.RingGeometry(.6,.8,24),new THREE.MeshBasicMaterial({color:0xffeb3b,side:2}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;g.add(m,glow);g.position.set(x,0,z);g.userData.w=w;scene.add(g);pickups.push(g)}
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
const modelsReady=Promise.all([['jugador','models/jugador.glb'],['zombie','models/zombie.glb'],['comerciante','models/comerciante.glb']].map(([k,u])=>loadM(u).then(g=>MOD[k]=g).catch(e=>console.warn('Modelo no cargado, uso bloques:',u,e.message)))).then(()=>{
 if(MOD.jugador){pModel=MOD.jugador.scene;fitModel(pModel,2.3);pModel.rotation.y=Math.PI;player.add(pModel);blocky.forEach(b=>b.visible=false);pRig=rig(pModel,MOD.jugador.animations);pRig.play('Idle')}
 if(MOD.comerciante){const m=MOD.comerciante.scene;fitModel(m,2.3);merchant.add(m);merchantBlock.visible=false;merchant.userData.rig=rig(m,MOD.comerciante.animations);merchant.userData.rig.play('Idle')}
 zombies.forEach(attachZ);window.__models=Object.keys(MOD)});
// Comerciante junto a la casa
const merchant=new THREE.Group();const merchantBlock=new THREE.Group();{const b1=box(.9,1.1,.5,0x8d6e63);b1.position.y=1.25;const h1=box(.6,.6,.6,0xffcc99);h1.position.y=2.1;const ht=box(1,.12,1,0xd7b56d);ht.position.y=2.45;const l1=box(.8,.7,.45,0x5d4037);l1.position.y=.35;merchantBlock.add(b1,h1,ht,l1)}
merchant.add(merchantBlock);const stall=box(2.2,1,1,0x8d6e63);stall.position.set(0,.5,1.1);const awn=box(2.6,.1,1.6,0xe53935);awn.position.set(0,2.6,1.1);merchant.add(stall,awn);
merchant.position.set(4.5,0,2);merchant.rotation.y=-.6;scene.add(merchant);const mObst={x:4.5,z:2,r:1.2};obst.push(mObst);let merchantT=0;
function attachZ(g){if(!MOD.zombie||g.userData.model)return;const m=SkeletonUtils.clone(MOD.zombie.scene);fitModel(m,2.2);m.traverse(o=>{if(o.isMesh){o.material=o.material.clone()}});
 g.children.forEach(c=>c.visible=false);g.add(m);g.userData.model=m;g.userData.rig=rig(m,MOD.zombie.animations);g.userData.rig.play('Walk',0,false,1);g.userData.rig.mx.setTime(Math.random()*2)}
function zFlash(z,on){z.userData.model?.traverse(o=>{if(o.isMesh&&o.material.emissive)o.material.emissive.setHex(on?0x666666:(z.userData.boss?0x4a0072:0))})}
// Burbuja de mordida caricaturesca
const bite=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.strokeStyle='#222';x.lineWidth=6;x.beginPath();x.ellipse(128,60,118,50,0,0,7);x.fill();x.stroke();
 x.fillStyle='#e53935';x.font='bold 54px Arial';x.textAlign='center';x.fillText('¡ÑAM!',128,78);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(2,1,1);sp.visible=false;scene.add(sp);return sp})();let biteT=0;
// ===== Botín, interiores, monedas y tienda =====
const loot=[];let inside=null,shopOpen=false,hintT=0;const rooms={};
const LT={lata:{i:'🥫',n:'Lata de comida'},moneda:{i:'🪙',n:'Monedas'},agua:{i:'💧',n:'Agua para la pistola'},venda:{i:'🩹',n:'Venda'},arma:{i:'🎁',n:'Arma'}};
function lootMesh(t){const g=new THREE.Group();let m;
 if(t=='lata'){m=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.45,14),M(0xe53935));const lb=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.2,14),M(0xfff59d));m.add(lb)}
 else if(t=='moneda'){m=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.08,18),new THREE.MeshStandardMaterial({color:0xffd54f,metalness:.8,roughness:.3,emissive:0x6d4c00}));m.rotation.x=Math.PI/2}
 else if(t=='agua'){m=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,.6,12),new THREE.MeshStandardMaterial({color:0x29b6f6,transparent:true,opacity:.85,emissive:0x01579b}));const cp=box(.15,.12,.15,0x0d47a1);cp.position.y=.36;m.add(cp)}
 else if(t=='venda'){m=box(.5,.3,.4,0xffffff);const c1=box(.3,.32,.08,0xe53935),c2=box(.08,.32,.3,0xe53935);m.add(c1,c2)}
 else if(t=='fruta'){const col=FRC[Math.floor(Math.random()*FRC.length)];m=new THREE.Mesh(new THREE.SphereGeometry(.32,16,12),new THREE.MeshStandardMaterial({color:col,emissive:col,emissiveIntensity:.8,roughness:.3}));const lf=new THREE.Mesh(new THREE.ConeGeometry(.12,.3,6),new THREE.MeshStandardMaterial({color:0x76ff03,emissive:0x2e7d32}));lf.position.y=.38;lf.rotation.z=.5;m.add(lf);const halo=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.25,depthWrite:false}));m.add(halo);m.position.y=1.1;m.castShadow=false;const gl=new THREE.Mesh(new THREE.RingGeometry(.45,.65,20),new THREE.MeshBasicMaterial({color:col,side:2,transparent:true,opacity:.7}));gl.rotation.x=-Math.PI/2;gl.position.y=.04;g.add(m,gl);g.userData.t=t;g.userData.fruit=m;g.userData.ph=Math.random()*6;return g}
 else{m=box(.6,.6,.6,0xab47bc);const rb=box(.65,.15,.65,0xffeb3b);m.add(rb)}
 m.position.y=.7;m.castShadow=true;const gl=new THREE.Mesh(new THREE.RingGeometry(.45,.6,20),new THREE.MeshBasicMaterial({color:0xffeb3b,side:2}));gl.rotation.x=-Math.PI/2;gl.position.y=.04;g.add(m,gl);g.userData.t=t;return g}
const FRC=[0xff4081,0x00e5ff,0xffea00,0xb388ff,0x69f0ae,0xff9100];
function spawnFruits(){const r=srnd(777+S.day*13);for(let k=0;k<10;k++){const id='f'+S.day+'_'+k;let x,z,n=0;do{const a=r()*6.28,d=14+r()*80;x=Math.cos(a)*d;z=Math.sin(a)*d}while(!free(x,z)&&++n<30);if(!S.looted.includes(id)&&!loot.some(l=>l.userData.id==id))addLoot('fruta',x,z,id)}}
function gainXP(n){S.xp+=n;let need=S.lvl*30;while(S.xp>=need){S.xp-=need;S.lvl++;S.maxHp+=20;S.hp=S.maxHp;need=S.lvl*30;banner('⭐ ¡SUBISTE AL NIVEL '+S.lvl+'!<br><small>Vida máxima: ❤️ '+S.maxHp+' · ¡Salud llena!</small>',5);puff(player.position.clone().setY(1.5),0xffeb3b,30,6,.2,-2,1.2)}}
function addLoot(t,x,z,id,auto){const g=lootMesh(t);g.position.set(x,0,z);g.userData.id=id;g.userData.auto=auto;scene.add(g);loot.push(g);return g}
function srnd(seed){return()=>{seed=(seed*16807)%2147483647;return seed/2147483647}}
function buildRoom(i){const RX=1000+i*40,W=14,D=10,r=srnd(i*97+13);const g=new THREE.Group();g.position.set(RX,0,0);
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
 const ts=['lata','moneda','agua','venda','moneda','lata'];for(let k=0;k<n;k++){let t=ts[Math.floor(r()*ts.length)];if(k==0&&r()<.4)t='arma';items.push([t,RX+spots[k][0],spots[k][1],'r'+i+'_'+k])}if(r()<.45)items.push(['fruta',RX+spots[n][0],spots[n][1],'r'+i+'_f'])
 return {g,RX,W,D,items,L}}
function enter(dr){const rm=rooms[dr.id]||(rooms[dr.id]=buildRoom(dr.id));rm.g.visible=true;inside={rm,ret:{x:dr.x,z:dr.z},door:dr};
 rm.items.forEach(([t,x,z,id])=>{if(!S.looted.includes(id)&&!loot.some(l=>l.userData.id==id))addLoot(t,x,z,id)});
 player.position.set(rm.RX,0,rm.D/2-2.6);yaw=0;camYaw=0;cam.position.set(rm.RX,4,rm.D/2+3);roomFill.visible=true;$('exitBtn').style.display='block';document.exitPointerLock?.();doorCD=1;msg('🏚️ Entraste. Agarra cosas con E. Para salir: botón 🚪 SALIR, tecla X, o camina a la puerta verde',4)}
function leave(){if(!inside)return;const dr=inside.door;inside.rm.g.visible=false;roomFill.visible=false;$('exitBtn').style.display='none';doorCD=1.5;loot.filter(l=>l.position.x>900).forEach(l=>{scene.remove(l);loot.splice(loot.indexOf(l),1)});inside=null;let ez=dr.z+2.2;for(let k=0;k<6&&!free(dr.x,ez);k++)ez+=1;player.position.set(dr.x,0,ez);yaw=Math.PI;camYaw=Math.PI;cam.position.set(dr.x,4,ez-3);msg('🌆 De vuelta en la ciudad',2)}
const roomFill=new THREE.PointLight(0xfff2d8,LOW?30:45,16,1.4);roomFill.visible=false;scene.add(roomFill);let doorCD=0,lastAct=0;
function take(l){const t=l.userData.t;scene.remove(l);loot.splice(loot.indexOf(l),1);if(l.userData.id)S.looted.push(l.userData.id);puff(l.position.clone().setY(.8),0xffeb3b,10,4,.15,6,.5);let txt='';
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
function nearest(arr,max,f=o=>o.position){let b=null,bd=max;for(const o of arr){const p=f(o),d=Math.hypot(p.x-player.position.x,p.z-player.position.z);if(d<bd){bd=d;b=o}}return b}
function nearMerchant(){return merchantHere()&&!inside&&Math.hypot(merchant.position.x-player.position.x,merchant.position.z-player.position.z)<4.5}
function interact(){if(!playing)return;const now=performance.now();if(now-lastAct<350)return;lastAct=now;if(shopOpen){closeShop();return}
 const l=nearest(loot,inside?1.6:2);if(l){take(l);return}
 if(inside){leave();return}
 if(nearMerchant()){openShop();return}const dr=nearest(doors,2.4,d=>d);if(dr){enter(dr);return}msg('No hay nada cerca para agarrar',1.2)}
function useLabel(){if(!S)return'✋<br>AGARRAR';if(shopOpen)return'✖<br>CERRAR';if(nearest(loot,inside?1.6:2))return'✋<br>AGARRAR';if(inside)return'🚪<br>SALIR';if(nearMerchant())return'🛒<br>COMPRAR';if(!inside&&nearest(doors,2.4,d=>d))return'🚪<br>ENTRAR';return'✋<br>AGARRAR'}
function banner(t,s=5){$('banner').innerHTML=t;$('banner').style.display='block';clearTimeout(banner.h);banner.h=setTimeout(()=>$('banner').style.display='none',s*1000)}
// Estado
const BOSSHP=23;let boss=null,bossPend=false;let lampT=0,camYaw=0,S,zombies=[],crates=[],balls=[],yaw=0,pitch=.25,keys={},playing=false,fireCD=0,msgT=0,dmgCD=0;
const fresh=()=>({coins:0,ammo:20,looted:[],weap:[0],cur:0,day:1,t:.3,hp:100,maxHp:100,lvl:1,xp:0,food:100,score:0,got:0,x:0,z:7,yaw:Math.PI,nextRun:4,cratesDay:0});
function msg(s,t=3){$('msg').textContent=s;msgT=t}
function save(){if(!S)return;S.x=inside?inside.ret.x:player.position.x;S.z=inside?inside.ret.z:player.position.z;S.yaw=yaw;S.crates=crates.map(c=>[c.position.x,c.position.z]);S.pick=pickups.map(p=>[p.userData.w,p.position.x,p.position.z]);localStorage.setItem('zsave',JSON.stringify(S))}
function free(x,z){return !obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6)&&!rects.some(r=>Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d)}
function spawnCrates(n){for(let i=0;i<n;i++){let x,z;do{const a=Math.random()*6.28,d=25+Math.random()*70;x=Math.cos(a)*d;z=Math.sin(a)*d}while(!free(x,z));addCrate(x,z)}}
function addCrate(x,z){const c=new THREE.Group();const b=box(1,1,1,0xa0522d);b.position.y=.5;const a=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),M(0xff1744));a.position.y=1.3;c.add(b,a);c.position.set(x,0,z);scene.add(c);crates.push(c)}
function makeZ(){const g=new THREE.Group();const c=[0x7cb342,0x9ccc65,0x689f38][zombies.length%3];
 const b=box(.9,1.1,.5,[0x6a4c93,0x8d6e63,0x00897b][zombies.length%3]);b.position.y=1.35;const h=box(.65,.65,.65,c);h.position.y=2.2;h.material=h.material.clone();
 const e1=box(.14,.14,.05,0xffeb3b);e1.position.set(-.15,2.25,.33);const e2=e1.clone();e2.position.x=.15;const mo=box(.3,.08,.05,0x33691e);mo.position.set(0,2.02,.33);
 const hair=box(.5,.12,.5,0x4e342e);hair.position.y=2.58;const tear=box(.3,.25,.05,0x4527a0);tear.position.set(.2,1.1,.26);
 const limb=(w,hh,col,px,py)=>{const p=new THREE.Group();p.position.set(px,py,0);const m=box(w,hh,w,col);m.position.y=-hh/2;p.add(m);return p};
 const a1=limb(.25,.85,c,-.58,1.8),a2=limb(.25,.85,c,.58,1.8);a1.rotation.x=a2.rotation.x=-1.4;const l1=limb(.36,.8,0x455a64,-.22,.8),l2=limb(.36,.8,0x455a64,.22,.8);
 g.userData.limbs=[a1,a2,l1,l2];const l=mo;g.add(b,h,e1,e2,a1,a2,l1,l2,hair,tear);g.add(l);let x,z;do{const a=Math.random()*6.28,d=45+Math.random()*40;x=player.position.x+Math.cos(a)*d;z=player.position.z+Math.sin(a)*d}while(!free(x,z)||Math.hypot(x,z)<BASE+5||Math.abs(x)>WORLD||Math.abs(z)>WORLD);
 g.position.set(x,0,z);g.userData={limbs:g.userData.limbs,wt:Math.random()*6,hp:3,sp:1.6+Math.random()*1.2+S.day*.1,hit:0};scene.add(g);zombies.push(g);attachZ(g)}
function start(load){zombies.forEach(z=>scene.remove(z));crates.forEach(c=>scene.remove(c));balls.forEach(b=>scene.remove(b));zombies=[];crates=[];balls=[];
 const sv=load&&JSON.parse(localStorage.getItem('zsave')||'null');S=sv||fresh();player.position.set(S.x,0,S.z);yaw=S.yaw;
 pickups.forEach(p=>scene.remove(p));pickups.length=0;loot.forEach(l=>scene.remove(l));loot.length=0;if(inside){inside.rm.g.visible=false;inside=null}roomFill.visible=false;$('exitBtn').style.display='none';closeShop();if(sv&&sv.crates)sv.crates.forEach(([x,z])=>addCrate(x,z));else spawnCrates(8);
 if(sv&&sv.pick)sv.pick.forEach(([w,x,z])=>addPickup(w,x,z));else{const pts=hidePts.filter(p=>free(p[0],p[1])).sort(()=>Math.random()-.5);[1,1,2,2,3,4,4,5].forEach((w,i)=>pts[i]&&addPickup(w,pts[i][0],pts[i][1]))}
 S.weap=S.weap||[0];S.lvl??=1;S.xp??=0;S.maxHp??=100;S.regen=0;if(boss){scene.remove(boss.userData.bar);boss=null}$('bossHud').style.display='none';spawnFruits();S.coins??=0;S.ammo??=20;S.looted??=[];S.cur=S.cur||0;camYaw=yaw;updW();
 $('start').style.display=$('over').style.display='none';playing=true;msg(sv?'¡Partida cargada!':'¡Sobrevive! Encuentra comida cada 3 días 📦');
 if(!touch)renderer.domElement.requestPointerLock?.()}
$('bNew').onclick=()=>start(false);$('bCont').onclick=()=>start(true);$('bRe').onclick=()=>start(false);
if(localStorage.getItem('zsave'))$('bCont').style.display='';
function gameOver(why){playing=false;pRig?.play('Death',.1,true);localStorage.removeItem('zsave');document.exitPointerLock?.();$('bCont').style.display='none';
 $('overTxt').innerHTML=why+'<br>Sobreviviste <b>'+S.day+'</b> días · ⭐ '+S.score+' zombies dormidos · 📦 '+S.got+' cajas';$('over').style.display='flex'}
// Controles
const touch='ontouchstart' in window;if(touch){$('joy').style.display='block';$('fire').style.display=$('run').style.display=$('hit').style.display=$('sw').style.display=$('use').style.display='flex';$('cross').style.display='none'}
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code.startsWith('Arrow'))e.preventDefault();if(e.code=='Space'){attack();e.preventDefault()}if(e.code=='KeyF')melee();if(e.code=='KeyE'&&!e.repeat)interact();if(e.code=='KeyX'&&inside)leave();if(e.code=='Escape'&&shopOpen)closeShop();if(e.code=='KeyR'||e.code=='Tab'){nextW();e.preventDefault()}
 const n=+e.key;if(n>=1&&n<=6&&S&&S.weap.includes(n-1)){S.cur=n-1;updW()}});addEventListener('keyup',e=>keys[e.code]=0);
renderer.domElement.addEventListener('mousedown',()=>{if(!playing)return;if(document.pointerLockElement)attack();else renderer.domElement.requestPointerLock?.()});
addEventListener('mousemove',e=>{if(document.pointerLockElement){yaw-=e.movementX*.003;pitch=Math.max(-.3,Math.min(1.1,pitch+e.movementY*.003))}});
let jv={x:0,y:0},jid=null,lid=null,lx=0,ly=0,runT=false;
$('joy').addEventListener('touchstart',e=>{jid=e.changedTouches[0].identifier;e.preventDefault()});
$('fire').addEventListener('touchstart',e=>{shoot();e.preventDefault()});$('hit').addEventListener('touchstart',e=>{melee();e.preventDefault()});$('sw').addEventListener('touchstart',e=>{nextW();e.preventDefault()});$('use').addEventListener('touchstart',e=>{interact();e.preventDefault()});$('use').addEventListener('click',()=>interact());const xb=$('exitBtn');xb.addEventListener('touchstart',e=>{leave();e.preventDefault()});xb.addEventListener('click',()=>leave());
$('run').addEventListener('touchstart',e=>{runT=true;e.preventDefault()});$('run').addEventListener('touchend',()=>runT=false);
addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(t.identifier!==jid&&t.clientX>innerWidth/2&&lid===null&&e.target===renderer.domElement){lid=t.identifier;lx=t.clientX;ly=t.clientY}});
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid){const r=$('joy').getBoundingClientRect();let dx=t.clientX-r.left-65,dy=t.clientY-r.top-65,d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d}jv={x:dx/50,y:dy/50};$('knob').style.transform=`translate(${dx}px,${dy}px)`}
 if(t.identifier===lid){yaw-=(t.clientX-lx)*.006;pitch=Math.max(-.3,Math.min(1.1,pitch+(t.clientY-ly)*.004));lx=t.clientX;ly=t.clientY}}e.preventDefault()},{passive:false});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===jid){jid=null;jv={x:0,y:0};$('knob').style.transform=''}if(t.identifier===lid)lid=null}});
function updW(){const W=WEAP[S.cur];$('wpn').textContent=W.i+' '+W.n+(W.m?'':' (💧'+S.ammo+')');$('coins').textContent=S.coins;$('ammo').textContent=S.ammo;held.visible=!!W.m&&S.cur>0;if(W.m&&S.cur>0){held.material.color.set(W.c);held.scale.y=W.len}if(!W.m){held.visible=true;held.material.color.set(S.cur==4?0x29b6f6:0xff7043);held.scale.y=.5}}
function nextW(){if(!S)return;const i=S.weap.indexOf(S.cur);S.cur=S.weap[(i+1)%S.weap.length];updW();msg(WEAP[S.cur].i+' '+WEAP[S.cur].n,1)}
function attack(){WEAP[S.cur].m?melee():shoot()}
function melee(){if(!playing||fireCD>0)return;let W=WEAP[S.cur];if(!W.m){const best=S.weap.filter(w=>WEAP[w].m).pop();W=WEAP[best]}fireCD=W.cd;swing=.3;pRig?.play(W===WEAP[0]?'Punch_Right':'Sword_Slash',.08,true,1.8);
 const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 for(const z of zombies){if(z.userData.sleep)continue;const dx=z.position.x-player.position.x,dz=z.position.z-player.position.z,d=Math.hypot(dx,dz);
  if(d<W.rng+.5&&(dx*f.x+dz*f.z)/d>.4){hurtZ(z,W.dmg);let nx=z.position.x+dx/d*W.kb,nz=z.position.z+dz/d*W.kb;if(free(nx,nz)){z.position.x=nx;z.position.z=nz}}}}
function hurtZ(z,n){puff(z.position.clone().setY(1.8),0xffeb3b,8,6,.15,8,.4);z.userData.hp-=n;z.userData.hit=.15;zFlash(z,1);setTimeout(()=>zFlash(z,0),150);if(z.userData.rig&&z.userData.hp>0)z.userData.rig.play('HitRecieve',.1,true,1.5);if(z.userData.hp<=0&&!z.userData.sleep){z.userData.sleep=z.userData.rig?1.4:.6;z.userData.rig?.play('Death',.1,true,1.3);puff(z.position.clone().setY(1.5),0xe1f5fe,14,4,.3,-1,1);S.score++;if(z.userData.boss){bossDown(z)}else{msg('💤 ¡Zombie dormido! +10 XP',1);if(Math.random()<.5)addLoot('moneda',z.position.x,z.position.z,null,true)}gainXP(z.userData.boss?120:10)}}
function spawnBoss(){if(boss||inside)return;makeZ();const z=zombies[zombies.length-1];const a=Math.random()*6.28;let x=player.position.x+Math.cos(a)*22,zz=player.position.z+Math.sin(a)*22;if(free(x,zz)&&Math.hypot(x,zz)>BASE+5&&Math.abs(x)<WORLD&&Math.abs(zz)<WORLD)z.position.set(x,0,zz);
 const u=z.userData;u.boss=1;u.hp=u.max=BOSSHP;u.sp=2.1;z.scale.setScalar(2.2);z.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone();o.material.color?.lerp(new THREE.Color(0x9c27b0),.55);if(o.material.emissive)o.material.emissive.setHex(0x4a0072)}});
 const gl=new THREE.PointLight(0xe040fb,LOW?8:14,9,1.5);gl.position.y=1.6;z.add(gl);for(const sx of[-.18,.18]){const ey=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xff1744}));ey.position.set(sx,.98,.18);z.add(ey)}
 const bar=new THREE.Group();const bg=new THREE.Mesh(new THREE.PlaneGeometry(3.2,.35),new THREE.MeshBasicMaterial({color:0x222222,depthTest:false}));const fg=new THREE.Mesh(new THREE.PlaneGeometry(3,.22),new THREE.MeshBasicMaterial({color:0xff1744,depthTest:false}));fg.position.z=.01;bg.renderOrder=fg.renderOrder=10;bar.add(bg,fg);bar.userData.fg=fg;scene.add(bar);u.bar=bar;boss=z;
 $('bossHud').style.display='block';banner('👹 ¡CUIDADO! ¡Llegó el MONSTRUO JEFE!<br><small>Tiene 200 de vida más que un zombie y pega fuerte. ¡Duérmelo para ganar muchas 🪙 y una fruta mágica!</small>',7);msg('👹 ¡El monstruo jefe te busca!',3)}
function bossDown(z){scene.remove(z.userData.bar);boss=null;$('bossHud').style.display='none';S.bossesBeaten=(S.bossesBeaten||0)+1;for(let k=0;k<8;k++)addLoot('moneda',z.position.x+Math.cos(k*.8)*2.6,z.position.z+Math.sin(k*.8)*2.6,null,true);addLoot('fruta',z.position.x+3.4,z.position.z,'boss'+S.day+'_'+S.bossesBeaten);banner('🏆 ¡Dormiste al MONSTRUO JEFE!<br><small>Dejó muchas monedas 🪙 y una fruta mágica ✨ (+120 XP)</small>',6);puff(z.position.clone().setY(2),0xe040fb,40,7,.3,-2,1.5)}
function shoot(){if(!playing||fireCD>0)return;let W=WEAP[S.cur];if(W.m){const r=S.weap.filter(w=>!WEAP[w].m).pop();if(r===undefined){melee();return}W=WEAP[r]}if(S.ammo<=0){msg('💧 ¡Sin agua! Busca botellas o cómprale al comerciante',1.5);fireCD=.4;return}S.ammo--;fireCD=W.cd;pRig?.play('Gun_Shoot',.08,true,2);const b=new THREE.Mesh(new THREE.SphereGeometry(W.sz,8,6),new THREE.MeshBasicMaterial({color:0x40c4ff}));
 const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));b.position.copy(player.position).add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,.8);b.userData={v:dir.multiplyScalar(W.sp),life:1.4,dmg:W.dmg};scene.add(b);balls.push(b)}
// Bucle
const clock=new THREE.Clock();let saveT=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(playing&&!shopOpen)update(dt);else skyDome.position.copy(cam.position);updParts(dt);mixers.forEach(m=>m.update(dt));
 const cp=player.position;camYaw+=(yaw-camYaw)*Math.min(1,dt*8);const tgt=new THREE.Vector3(cp.x+Math.sin(camYaw)*6*Math.cos(pitch),3+6*Math.sin(pitch),cp.z+Math.cos(camYaw)*6*Math.cos(pitch));cam.position.lerp(tgt,Math.min(1,dt*10));cam.lookAt(cp.x,cp.y+1.8,cp.z);
 renderer.render(scene,cam)}
function update(dt){fireCD-=dt;dmgCD-=dt;if((msgT-=dt)<=0)$('msg').textContent='';
 // tiempo
 const prevDay=S.day;S.t+=dt/DAY;if(S.t>=1){S.t-=1;S.day++;msg('☀️ ¡Día '+S.day+'!');spawnFruits();if(S.day%5===0){bossPend=true;banner('⚠️ Esta NOCHE vendrá el MONSTRUO JEFE 👹<br><small>¡Prepárate con tus mejores armas!</small>',6)}else if(S.day%3===0)banner('🧑‍🌾 ¡El COMERCIANTE llegó a la base!<br><small>Solo por hoy: compra comida, vendas, agua y armas con tus 🪙 (pulsa E / COMPRAR)</small>',7);else if(S.day%3===1&&S.day>1){banner('👋 El comerciante se fue.<br><small>Volverá en 3 días</small>',5);if(shopOpen)closeShop()}if(S.day>=S.nextRun){S.nextRun=S.day+3;spawnCrates(6);msg('📦 ¡Aparecieron nuevas cajas de comida! Sal a buscarlas.',5)}}
 const ang=S.t*Math.PI*2-Math.PI/2,sh=Math.sin(ang),light=Math.max(0,Math.min(1,sh*2+.5));
 sun.position.set(player.position.x+Math.cos(ang)*50,Math.max(5,sh*60),player.position.z+20);sun.target.position.copy(player.position);
 const tint=Math.max(0,1-Math.abs(sh)*3.2);const cp0=player.position;
 sunBall.position.set(cp0.x+Math.cos(ang)*220,sh*220,cp0.z-80);moonBall.position.set(cp0.x-Math.cos(ang)*220,-sh*220,cp0.z-80);skyDome.position.copy(cam.position);
 sun.intensity=Math.min(1,Math.max(0,sh)*2.5)*1.5*(1-tint*.3);sun.color.setHex(0xffffff).lerp(new THREE.Color(0xff9a5a),tint);
 moon.intensity=Math.max(0,-sh)*.45;moon.position.set(cp0.x-Math.cos(ang)*50,Math.max(5,-sh*60),cp0.z+20);moon.target.position.copy(cp0);
 hemi.intensity=.25+light*.75;hemi.color.setHex(0x5060a0).lerp(new THREE.Color(0xcfe8ff),light);
 skyU.top.value.setHex(0x050a1e).lerp(new THREE.Color(0x3d86e0),light);const hz=new THREE.Color(0x141c3c).lerp(new THREE.Color(0xbfe3ff),light).lerp(new THREE.Color(0xff8a50),tint*.85);skyU.hor.value.copy(hz);skyU.bot.value.copy(hz).multiplyScalar(.5);
 scene.fog.color.copy(hz);renderer.setClearColor(hz);winLit.emissiveIntensity=(1-light)*1.1;
 if((lampT-=dt)<=0){lampT=.5;const near=lampPos.map(p=>[p,p.distanceToSquared(cp0)]).sort((a,b)=>a[1]-b[1]);lampL.forEach((l,i)=>near[i]&&l.position.copy(near[i][0]))}lampL.forEach(l=>l.intensity=(1-light)*(LOW?18:25));stars.material.opacity=1-light;stars.visible=light<.6;
 const night=light<.4;$('tod').textContent=night?'🌙 Noche':'☀️ Día';
 // comida: se vacía en 3 días
 S.food=Math.max(0,S.food-dt*100/(3*DAY));const inBase=Math.hypot(player.position.x,player.position.z)<BASE;
 if(bossPend&&night&&!inside&&!boss){bossPend=false;spawnBoss()}if(S.regen>0){const g=Math.min(S.regen,dt*15);S.regen-=g;S.hp=Math.min(S.maxHp,S.hp+g);if(Math.random()<dt*14)puff(player.position.clone().add(new THREE.Vector3(Math.random()-.5,1+Math.random(),Math.random()-.5)),[0xff80ff,0xffff8d,0x84ffff][Math.floor(Math.random()*3)],2,2,.12,-3,.8)}
 for(let i=loot.length-1;i>=0;i--){const l=loot[i],f=l.userData.fruit;if(f){l.userData.ph+=dt*2;f.position.y=1.1+Math.sin(l.userData.ph)*.2;f.rotation.y+=dt*1.5}if((f||l.userData.auto)&&Math.hypot(l.position.x-player.position.x,l.position.z-player.position.z)<1.3)take(l)}
 if(S.food<=0){S.hp-=dt*4;if(msgT<=0)msg('😫 ¡Tienes hambre! Busca cajas de comida 📦',2)}else if(inBase&&S.hp<S.maxHp)S.hp=Math.min(S.maxHp,S.hp+dt*3);
 // movimiento
 let mx=(keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0)+jv.x,mz=(keys.ArrowDown?1:0)-(keys.ArrowUp?1:0)+jv.y;
 if(keys.KeyQ||keys.KeyA)yaw+=dt*2.2;if(keys.KeyD)yaw-=dt*2.2;if(keys.KeyW)pitch=Math.max(-.3,pitch-dt);if(keys.KeyS)pitch=Math.min(1.1,pitch+dt);
 const sp=(keys.ShiftLeft||runT?9:5.5)*dt,l=Math.hypot(mx,mz);if(l>.1){if(l>1){mx/=l;mz/=l}
  const s=Math.sin(yaw),c=Math.cos(yaw);let nx=player.position.x+(mx*c+mz*s)*sp,nz=player.position.z+(-mx*s+mz*c)*sp;
  const LIM=inside?1e5:WORLD;if(free(nx,player.position.z))player.position.x=Math.max(-LIM,Math.min(LIM,nx));if(free(player.position.x,nz))player.position.z=Math.max(-LIM,Math.min(LIM,nz));
  walkT+=sp*1.7;legL.rotation.x=Math.sin(walkT)*.7;legR.rotation.x=-legL.rotation.x;armL.rotation.x=-legL.rotation.x*.8;if(Math.random()<dt*(sp>.1?14:6))puff(player.position.clone().setY(.1),0xb0a48a,1,1.5,.18,2,.5)}else{legL.rotation.x*=.8;legR.rotation.x*=.8;armL.rotation.x*=.8}
 if(pRig){if(pRig.lock>0)pRig.lock-=dt;else pRig.play(l>.1?(sp>6*dt?'Run':'Walk'):'Idle',.2,false,l>.1?1.2:1)}
 if(biteT>0){biteT-=dt;bite.visible=true;bite.position.copy(player.position).add(_v.set(0,3.1,0));bite.scale.setScalar(1.6+Math.sin(biteT*30)*.15).setY(.8)}else bite.visible=false;
 if((merchantT-=dt)<=0&&merchantHere()&&!inside&&merchant.position.distanceTo(player.position)<4){merchantT=8;merchant.userData.rig?.play('Wave',.2,true);msg('🧑‍🌾 Comerciante: ¡Hola! Pulsa E / COMPRAR para ver mi tienda 🛒',4)}
 if(merchant.userData.rig&&merchant.userData.rig.lock>0){merchant.userData.rig.lock-=dt;if(merchant.userData.rig.lock<=0)merchant.userData.rig.play('Idle')}
 const mh=merchantHere();merchant.visible=mh;mObst.r=mh?1.2:0;
 doorCD-=dt;if(inside){const rm=inside.rm;roomFill.position.set(player.position.x+Math.sin(camYaw)*2.5,3.2,player.position.z+Math.cos(camYaw)*2.5);if(doorCD<=0&&player.position.z>rm.D/2-1.1&&Math.abs(player.position.x-rm.RX)<2.2){leave()}else{player.position.x=Math.max(rm.RX-rm.W/2+.6,Math.min(rm.RX+rm.W/2-.6,player.position.x));player.position.z=Math.max(-rm.D/2+.9,Math.min(rm.D/2-.6,player.position.z))}}
 for(let i=loot.length-1;i>=0;i--){const lo=loot[i];lo.children[0].rotation.y+=dt*2;lo.children[0].position.y=.7+Math.sin(performance.now()/300+i)*.1;if(lo.userData.auto&&lo.position.distanceTo(player.position)<1.3)take(lo)}
 doors.forEach(d=>d.ring.material.opacity=.5+Math.sin(performance.now()/250)*.3);
 if((hintT-=dt)<=0){hintT=.3;const ul=useLabel();$('use').innerHTML=ul;if(msgT<=0&&!ul.includes('AGARRAR')||msgT<=0&&nearest(loot,2))msg('Pulsa E: '+ul.replace('<br>',' '),.5)}
 player.rotation.y=yaw;if(swing>0){swing-=dt;arm.rotation.x=-Math.sin((.3-swing)/.3*Math.PI)*1.6;arm.rotation.y=Math.sin((.3-swing)/.3*Math.PI)*.8}else{arm.rotation.x=arm.rotation.y=0}
 lamps.forEach(l=>l.material.color.set(night?0xfff3b0:0x555555));
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.rotation.y+=dt*2;if(p.position.distanceTo(player.position)<1.5){const w=p.userData.w;scene.remove(p);pickups.splice(i,1);if(!S.weap.includes(w))S.weap.push(w);S.cur=w;updW();msg('¡Encontraste: '+WEAP[w].i+' '+WEAP[w].n+'!',3)}}
 // cajas
 for(let i=crates.length-1;i>=0;i--){const c=crates[i];c.rotation.y+=dt;if(c.position.distanceTo(player.position)<1.6){scene.remove(c);crates.splice(i,1);S.food=Math.min(100,S.food+40);S.got++;puff(c.position.clone().setY(1),0xff5252,12,5,.2,9,.7);S.score+=0;msg('🍎 ¡Comida encontrada! +40')}}
 // zombies
 const want=Math.min(30,(night?6:2)+S.day*(night?2:1));if(!inside&&zombies.length<want&&Math.random()<dt*(night?1.2:.4))makeZ();
 for(let i=zombies.length-1;i>=0;i--){const z=zombies[i],u=z.userData;if(inside){u.rig?.play('Idle');continue}
  if(u.sleep){u.sleep-=dt;if(!u.rig){z.scale.multiplyScalar(1-dt*2);z.rotation.z+=dt*3}else if(u.sleep<.4)z.scale.multiplyScalar(1-dt*3);if(u.sleep<=0){scene.remove(z);zombies.splice(i,1)}continue}
  const dx=player.position.x-z.position.x,dz=player.position.z-z.position.z,d=Math.hypot(dx,dz);z.rotation.y=Math.atan2(dx,dz);
  if(d>1.2){let nx=z.position.x+dx/d*u.sp*dt,nz=z.position.z+dz/d*u.sp*dt;if(Math.hypot(nx,nz)<BASE+1){const a=Math.atan2(z.position.z,z.position.x)+dt*.5;nx=Math.cos(a)*(BASE+1);nz=Math.sin(a)*(BASE+1)}
   if(free(nx,nz)){z.position.x=nx;z.position.z=nz}else{z.position.x+=dz/d*u.sp*dt;z.position.z-=dx/d*u.sp*dt}}
  else if(dmgCD<=0){S.hp-=u.boss?25:12;if(u.boss)msg('👹 ¡GRRR! ¡El jefe pega fuerte!',1.5);else dmgCD=.8;msg('¡Ay! 🧟');u.rig?.play('Attack',.1,true,1.4);biteT=.6;pRig?.play('HitRecieve',.1,true,1.5);puff(player.position.clone().setY(1.6),0xff80ab,6,3,.15,2,.5)}
  if(u.rig&&!(u.rig.lock>0)){u.rig.play(d>1.2?(u.sp>2.6?'Run':'Walk'):'Idle',.25,false,d>1.2?u.sp/1.8:1)}if(u.rig&&u.rig.lock>0)u.rig.lock-=dt;
  u.wt+=dt*u.sp*2.2;const [a1,a2,l1,l2]=u.limbs;l1.rotation.x=Math.sin(u.wt)*.6;l2.rotation.x=-l1.rotation.x;a1.rotation.x=-1.4+Math.sin(u.wt)*.25;a2.rotation.x=-1.4-Math.sin(u.wt)*.25;z.rotation.z=Math.sin(u.wt*.5)*.06;if(u.hit>0){u.hit-=dt;z.children[1].material.color.set(u.hit>0?0xffffff:0x7cb342)}
  if(u.bar){u.bar.position.set(z.position.x,5.6,z.position.z);u.bar.quaternion.copy(cam.quaternion);const p=Math.max(0,u.hp/u.max);u.bar.userData.fg.scale.x=Math.max(.001,p);u.bar.userData.fg.position.x=-1.5*(1-p);$('bossBar').style.width=p*100+'%';$('bossTxt').textContent=Math.ceil(u.hp*10)}
  if(!u.boss&&!night&&d>70&&Math.random()<dt*.2){scene.remove(z);zombies.splice(i,1)}}
 // bolas
 for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.position.addScaledVector(b.userData.v,dt);b.userData.life-=dt;let hit=false;
  for(const z of zombies)if(!z.userData.sleep&&Math.hypot(z.position.x-b.position.x,z.position.z-b.position.z)<.9){hurtZ(z,b.userData.dmg);hit=true;break}
  if(hit||b.userData.life<=0||!free(b.position.x,b.position.z)){puff(b.position,0x4fc3f7,10,5,.14,12,.5);scene.remove(b);balls.splice(i,1)}}
 // HUD
 $('day').textContent=S.day;$('hp').style.width=Math.max(0,S.hp/S.maxHp*100)+'%';$('hpTxt').textContent=Math.max(0,Math.ceil(S.hp))+'/'+S.maxHp;$('lvl').textContent=S.lvl;$('xp').style.width=Math.min(100,S.xp/(S.lvl*30)*100)+'%';$('fd').style.width=S.food+'%';$('run3').textContent=Math.max(0,S.nextRun-S.day);$('score').textContent=S.score;$('crates').textContent=crates.length;
 if((saveT+=dt)>3){saveT=0;save()}
 if(S.hp<=0)gameOver(S.food<=0?'Te quedaste sin comida 🍎':'¡Los zombies te atraparon! 🧟')}
addEventListener('visibilitychange',save);
loop();window.__ok=true;

window.__g={spawnBoss,boss:()=>boss,gainXP,spawnFruits,take,yaw:()=>yaw,save,S:()=>S,doors,enter,leave,interact,openShop,buy,player,makeZ,zombies:()=>zombies,loot,merchant,setYaw:v=>{yaw=v;camYaw=v},inside:()=>inside};
