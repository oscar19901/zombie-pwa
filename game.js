import * as THREE from './three.module.js';
const $=id=>document.getElementById(id);
const DAY=90; // segundos reales por día
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0x88bbee,30,120);
const cam=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,300);
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()});
const hemi=new THREE.HemisphereLight(0xffffff,0x446633,.6);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40});scene.add(sun,sun.target);
const M=c=>new THREE.MeshLambertMaterial({color:c});
const box=(w,h,d,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c));m.castShadow=m.receiveShadow=true;return m};
const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),M(0x55585c));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const WORLD=100,BASE=9,obst=[],rects=[],hidePts=[];
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
// pasto de la casa segura
const lawn=new THREE.Mesh(new THREE.CircleGeometry(BASE+1,40),M(0x5a9e3a));lawn.rotation.x=-Math.PI/2;lawn.position.y=.025;lawn.receiveShadow=true;scene.add(lawn);
const house=new THREE.Group();const wall=box(6,3.5,6,0xc9a26b);wall.position.y=1.75;const roof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,4),M(0xb03a2e));roof.position.y=4.7;roof.rotation.y=Math.PI/4;
const door=box(1.4,2.4,.1,0x6b3e1e);door.position.set(0,1.2,3.01);house.add(wall,roof,door);house.position.set(0,0,-3);scene.add(house);obst.push({x:0,z:-3,r:3.6});
for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(Math.abs(a-Math.PI/2)<.2)continue;const p=box(.3,1.4,.3,0x8d6e4a);p.position.set(Math.cos(a)*BASE,.7,Math.sin(a)*BASE);scene.add(p)}
const ring=new THREE.Mesh(new THREE.RingGeometry(BASE-.2,BASE+.2,64),new THREE.MeshBasicMaterial({color:0xffee88}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;scene.add(ring);
// calles: cuadrícula cada 30, calles de 10 de ancho en x,z = -90,-60,...,90
const G=30;for(let k=-3;k<=3;k++){for(const v of[0,1]){const st=new THREE.Mesh(new THREE.PlaneGeometry(v?10:200,v?200:10),M(0x2f3236));st.rotation.x=-Math.PI/2;st.position.set(v?k*G:0,.015,v?0:k*G);st.receiveShadow=true;scene.add(st);
 for(let j=-95;j<95;j+=8){const l=new THREE.Mesh(new THREE.PlaneGeometry(v?.3:3,v?3:.3),new THREE.MeshBasicMaterial({color:0xd8c860}));l.rotation.x=-Math.PI/2;l.position.set(v?k*G:j,.02,v?j:k*G);scene.add(l)}}}
const bcol=[0x8a7f74,0x6f7378,0x9b8b6e,0x7a6a63,0x5f6b6d];
function building(x,z,w,d,h){const g=new THREE.Group();const b=box(w,h,d,bcol[Math.floor(rnd()*5)]);b.position.y=h/2;g.add(b);
 const wm=M(0x1a1f26);for(let y=2;y<h-1;y+=3)for(let i=-w/2+1.5;i<w/2-1;i+=2.5){if(rnd()<.8){const wn=new THREE.Mesh(new THREE.PlaneGeometry(1.2,1.4),wm);wn.position.set(i,y,d/2+.01);g.add(wn);const w2=wn.clone();w2.position.z=-d/2-.01;w2.rotation.y=Math.PI;g.add(w2)}}
 if(rnd()<.5){const c=box(w*.4,1.5,d*.4,0x5a5148);c.position.set(w*.2,h+.3,0);c.rotation.z=.3;g.add(c)} // techo roto
 // puerta abierta (hueco oscuro)
 const dr=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.4),M(0x0d0d0d));dr.position.set(0,1.2,d/2+.02);g.add(dr);
 g.position.set(x,0,z);scene.add(g);rects.push({x,z,w:w/2+.5,d:d/2+.5});hidePts.push([x+(rnd()-.5)*w*.6,z+d/2+1.6])}
for(let i=-3;i<3;i++)for(let j=-3;j<3;j++){const cx=i*G+G/2,cz=j*G+G/2;
 for(const[ox,oz]of[[-6,-6],[6,-6],[-6,6],[6,6]]){const x=cx+ox,z=cz+oz;if(Math.hypot(x,z)<BASE+8)continue;if(rnd()<.15)continue;building(x,z,7+rnd()*3,7+rnd()*3,4+rnd()*12)}}
// autos abandonados
const ccol=[0xc62828,0x1565c0,0xf9a825,0x2e7d32,0x6d4c41,0xeeeeee];
for(let i=0;i<40;i++){const k=Math.floor(rnd()*7)-3,v=rnd()<.5,t=(rnd()-.5)*180;let x=v?k*G+(rnd()<.5?-2.5:2.5):t,z=v?t:k*G+(rnd()<.5?-2.5:2.5);if(Math.hypot(x,z)<BASE+4)continue;
 const g=new THREE.Group();const b=box(2,1,4,ccol[i%6]);b.position.y=.7;const tp=box(1.8,.7,2,0x37474f);tp.position.set(0,1.5,-.2);g.add(b,tp);
 for(const[wx,wz]of[[-1,1.3],[1,1.3],[-1,-1.3],[1,-1.3]]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.4,.4,.3,10),M(0x111111));w.rotation.z=Math.PI/2;w.position.set(wx,.4,wz);g.add(w)}
 g.position.set(x,0,z);g.rotation.y=(v?0:Math.PI/2)+(rnd()-.5)*.6;if(rnd()<.2)g.rotation.z=.15;scene.add(g);rects.push({x,z,w:v?1.4:2.4,d:v?2.4:1.4});hidePts.push([x+(v?2:0),z+(v?0:2)])}
// escombros y postes de luz
for(let i=0;i<80;i++){const x=(rnd()-.5)*190,z=(rnd()-.5)*190;if(Math.hypot(x,z)<BASE+3)continue;const r=box(.5+rnd(),.3+rnd()*.5,.5+rnd(),0x777066);r.position.set(x,.2,z);r.rotation.y=rnd()*3;scene.add(r)}
const lamps=[];for(let k=-3;k<=3;k++)for(let j=-3;j<3;j++){const x=k*G+5.5,z=j*G+G/2;if(Math.hypot(x,z)<BASE+3)continue;const g=new THREE.Group();const p=box(.2,5,.2,0x444444);p.position.y=2.5;const arm=box(1.2,.15,.15,0x444444);arm.position.set(-.6,5,0);
 const bulb=new THREE.Mesh(new THREE.SphereGeometry(.25,8,6),new THREE.MeshBasicMaterial({color:0x555555}));bulb.position.set(-1.2,4.85,0);g.add(p,arm,bulb);g.position.set(x,0,z);scene.add(g);obst.push({x,z,r:.3});lamps.push(bulb)}
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
player.add(body,head,cap,legs,arm);scene.add(player);let swing=0;
// Estado
let camYaw=0,S,zombies=[],crates=[],balls=[],yaw=0,pitch=.25,keys={},playing=false,fireCD=0,msgT=0,dmgCD=0;
const fresh=()=>({weap:[0],cur:0,day:1,t:.3,hp:100,food:100,score:0,got:0,x:0,z:7,yaw:Math.PI,nextRun:4,cratesDay:0});
function msg(s,t=3){$('msg').textContent=s;msgT=t}
function save(){if(!S)return;S.x=player.position.x;S.z=player.position.z;S.yaw=yaw;S.crates=crates.map(c=>[c.position.x,c.position.z]);S.pick=pickups.map(p=>[p.userData.w,p.position.x,p.position.z]);localStorage.setItem('zsave',JSON.stringify(S))}
function free(x,z){return !obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6)&&!rects.some(r=>Math.abs(r.x-x)<r.w&&Math.abs(r.z-z)<r.d)}
function spawnCrates(n){for(let i=0;i<n;i++){let x,z;do{const a=Math.random()*6.28,d=25+Math.random()*70;x=Math.cos(a)*d;z=Math.sin(a)*d}while(!free(x,z));addCrate(x,z)}}
function addCrate(x,z){const c=new THREE.Group();const b=box(1,1,1,0xa0522d);b.position.y=.5;const a=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),M(0xff1744));a.position.y=1.3;c.add(b,a);c.position.set(x,0,z);scene.add(c);crates.push(c)}
function makeZ(){const g=new THREE.Group();const c=[0x7cb342,0x9ccc65,0x689f38][zombies.length%3];
 const b=box(.9,1.1,.5,0x6a4c93);b.position.y=1.25;const h=box(.65,.65,.65,c);h.position.y=2.1;
 const e1=box(.12,.12,.05,0xffeb3b);e1.position.set(-.15,2.15,.33);const e2=e1.clone();e2.position.x=.15;
 const a1=box(.25,.25,.9,c);a1.position.set(-.55,1.6,.4);const a2=a1.clone();a2.position.x=.55;const l=box(.8,.7,.45,0x455a64);l.position.y=.35;
 g.add(b,h,e1,e2,a1,a2,l);let x,z;do{const a=Math.random()*6.28,d=45+Math.random()*40;x=player.position.x+Math.cos(a)*d;z=player.position.z+Math.sin(a)*d}while(!free(x,z)||Math.hypot(x,z)<BASE+5||Math.abs(x)>WORLD||Math.abs(z)>WORLD);
 g.position.set(x,0,z);g.userData={hp:3,sp:1.6+Math.random()*1.2+S.day*.1,hit:0};scene.add(g);zombies.push(g)}
function start(load){zombies.forEach(z=>scene.remove(z));crates.forEach(c=>scene.remove(c));balls.forEach(b=>scene.remove(b));zombies=[];crates=[];balls=[];
 const sv=load&&JSON.parse(localStorage.getItem('zsave')||'null');S=sv||fresh();player.position.set(S.x,0,S.z);yaw=S.yaw;
 pickups.forEach(p=>scene.remove(p));pickups.length=0;if(sv&&sv.crates)sv.crates.forEach(([x,z])=>addCrate(x,z));else spawnCrates(8);
 if(sv&&sv.pick)sv.pick.forEach(([w,x,z])=>addPickup(w,x,z));else{const pts=hidePts.filter(p=>free(p[0],p[1])).sort(()=>Math.random()-.5);[1,1,2,2,3,4,4,5].forEach((w,i)=>pts[i]&&addPickup(w,pts[i][0],pts[i][1]))}
 S.weap=S.weap||[0];S.cur=S.cur||0;camYaw=yaw;updW();
 $('start').style.display=$('over').style.display='none';playing=true;msg(sv?'¡Partida cargada!':'¡Sobrevive! Encuentra comida cada 3 días 📦');
 if(!touch)renderer.domElement.requestPointerLock?.()}
$('bNew').onclick=()=>start(false);$('bCont').onclick=()=>start(true);$('bRe').onclick=()=>start(false);
if(localStorage.getItem('zsave'))$('bCont').style.display='';
function gameOver(why){playing=false;localStorage.removeItem('zsave');document.exitPointerLock?.();$('bCont').style.display='none';
 $('overTxt').innerHTML=why+'<br>Sobreviviste <b>'+S.day+'</b> días · ⭐ '+S.score+' zombies dormidos · 📦 '+S.got+' cajas';$('over').style.display='flex'}
// Controles
const touch='ontouchstart' in window;if(touch){$('joy').style.display='block';$('fire').style.display=$('run').style.display=$('hit').style.display=$('sw').style.display='flex';$('cross').style.display='none'}
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code=='Space'){attack();e.preventDefault()}if(e.code=='KeyF')melee();if(e.code=='KeyR'||e.code=='Tab'){nextW();e.preventDefault()}
 const n=+e.key;if(n>=1&&n<=6&&S&&S.weap.includes(n-1)){S.cur=n-1;updW()}});addEventListener('keyup',e=>keys[e.code]=0);
renderer.domElement.addEventListener('mousedown',()=>{if(!playing)return;if(document.pointerLockElement)attack();else renderer.domElement.requestPointerLock?.()});
addEventListener('mousemove',e=>{if(document.pointerLockElement){yaw-=e.movementX*.003;pitch=Math.max(-.3,Math.min(1.1,pitch+e.movementY*.003))}});
let jv={x:0,y:0},jid=null,lid=null,lx=0,ly=0,runT=false;
$('joy').addEventListener('touchstart',e=>{jid=e.changedTouches[0].identifier;e.preventDefault()});
$('fire').addEventListener('touchstart',e=>{shoot();e.preventDefault()});$('hit').addEventListener('touchstart',e=>{melee();e.preventDefault()});$('sw').addEventListener('touchstart',e=>{nextW();e.preventDefault()});
$('run').addEventListener('touchstart',e=>{runT=true;e.preventDefault()});$('run').addEventListener('touchend',()=>runT=false);
addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(t.identifier!==jid&&t.clientX>innerWidth/2&&lid===null&&e.target===renderer.domElement){lid=t.identifier;lx=t.clientX;ly=t.clientY}});
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid){const r=$('joy').getBoundingClientRect();let dx=t.clientX-r.left-65,dy=t.clientY-r.top-65,d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d}jv={x:dx/50,y:dy/50};$('knob').style.transform=`translate(${dx}px,${dy}px)`}
 if(t.identifier===lid){yaw-=(t.clientX-lx)*.006;pitch=Math.max(-.3,Math.min(1.1,pitch+(t.clientY-ly)*.004));lx=t.clientX;ly=t.clientY}}e.preventDefault()},{passive:false});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===jid){jid=null;jv={x:0,y:0};$('knob').style.transform=''}if(t.identifier===lid)lid=null}});
function updW(){const W=WEAP[S.cur];$('wpn').textContent=W.i+' '+W.n;held.visible=!!W.m&&S.cur>0;if(W.m&&S.cur>0){held.material.color.set(W.c);held.scale.y=W.len}if(!W.m){held.visible=true;held.material.color.set(S.cur==4?0x29b6f6:0xff7043);held.scale.y=.5}}
function nextW(){if(!S)return;const i=S.weap.indexOf(S.cur);S.cur=S.weap[(i+1)%S.weap.length];updW();msg(WEAP[S.cur].i+' '+WEAP[S.cur].n,1)}
function attack(){WEAP[S.cur].m?melee():shoot()}
function melee(){if(!playing||fireCD>0)return;let W=WEAP[S.cur];if(!W.m){const best=S.weap.filter(w=>WEAP[w].m).pop();W=WEAP[best]}fireCD=W.cd;swing=.3;
 const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
 for(const z of zombies){if(z.userData.sleep)continue;const dx=z.position.x-player.position.x,dz=z.position.z-player.position.z,d=Math.hypot(dx,dz);
  if(d<W.rng+.5&&(dx*f.x+dz*f.z)/d>.4){hurtZ(z,W.dmg);let nx=z.position.x+dx/d*W.kb,nz=z.position.z+dz/d*W.kb;if(free(nx,nz)){z.position.x=nx;z.position.z=nz}}}}
function hurtZ(z,n){z.userData.hp-=n;z.userData.hit=.15;if(z.userData.hp<=0&&!z.userData.sleep){z.userData.sleep=.6;S.score++;msg('💤 ¡Zombie dormido!',1)}}
function shoot(){if(!playing||fireCD>0)return;let W=WEAP[S.cur];if(W.m){const r=S.weap.filter(w=>!WEAP[w].m).pop();if(r===undefined){melee();return}W=WEAP[r]}fireCD=W.cd;const b=new THREE.Mesh(new THREE.SphereGeometry(W.sz,8,6),new THREE.MeshBasicMaterial({color:0x40c4ff}));
 const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));b.position.copy(player.position).add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,.8);b.userData={v:dir.multiplyScalar(W.sp),life:1.4,dmg:W.dmg};scene.add(b);balls.push(b)}
// Bucle
const clock=new THREE.Clock();let saveT=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(playing)update(dt);else{}
 const cp=player.position;camYaw+=(yaw-camYaw)*Math.min(1,dt*8);const tgt=new THREE.Vector3(cp.x+Math.sin(camYaw)*6*Math.cos(pitch),3+6*Math.sin(pitch),cp.z+Math.cos(camYaw)*6*Math.cos(pitch));cam.position.lerp(tgt,Math.min(1,dt*10));cam.lookAt(cp.x,cp.y+1.8,cp.z);
 renderer.render(scene,cam)}
function update(dt){fireCD-=dt;dmgCD-=dt;if((msgT-=dt)<=0)$('msg').textContent='';
 // tiempo
 const prevDay=S.day;S.t+=dt/DAY;if(S.t>=1){S.t-=1;S.day++;msg('☀️ ¡Día '+S.day+'!');if(S.day>=S.nextRun){S.nextRun=S.day+3;spawnCrates(6);msg('📦 ¡Aparecieron nuevas cajas de comida! Sal a buscarlas.',5)}}
 const ang=S.t*Math.PI*2-Math.PI/2,sh=Math.sin(ang),light=Math.max(0,Math.min(1,sh*2+.5));
 sun.position.set(player.position.x+Math.cos(ang)*50,Math.max(5,sh*60),player.position.z+20);sun.target.position.copy(player.position);
 sun.intensity=.15+light*.95;hemi.intensity=.25+light*.45;const sky=new THREE.Color(0x0b1026).lerp(new THREE.Color(0x88bbee),light);scene.background=sky;scene.fog.color=sky;stars.material.opacity=1-light;stars.visible=light<.6;
 const night=light<.4;$('tod').textContent=night?'🌙 Noche':'☀️ Día';
 // comida: se vacía en 3 días
 S.food=Math.max(0,S.food-dt*100/(3*DAY));const inBase=Math.hypot(player.position.x,player.position.z)<BASE;
 if(S.food<=0){S.hp-=dt*4;if(msgT<=0)msg('😫 ¡Tienes hambre! Busca cajas de comida 📦',2)}else if(inBase&&S.hp<100)S.hp=Math.min(100,S.hp+dt*3);
 // movimiento
 let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+jv.x,mz=(keys.KeyS?1:0)-(keys.KeyW?1:0)+jv.y;
 if(keys.KeyQ||keys.ArrowLeft)yaw+=dt*2.2;if(keys.KeyE||keys.ArrowRight)yaw-=dt*2.2;if(keys.ArrowUp)pitch=Math.max(-.3,pitch-dt);if(keys.ArrowDown)pitch=Math.min(1.1,pitch+dt);
 const sp=(keys.ShiftLeft||runT?9:5.5)*dt,l=Math.hypot(mx,mz);if(l>.1){if(l>1){mx/=l;mz/=l}
  const s=Math.sin(yaw),c=Math.cos(yaw);let nx=player.position.x+(mx*c+mz*s)*sp,nz=player.position.z+(-mx*s+mz*c)*sp;
  if(free(nx,player.position.z))player.position.x=Math.max(-WORLD,Math.min(WORLD,nx));if(free(player.position.x,nz))player.position.z=Math.max(-WORLD,Math.min(WORLD,nz));
  legs.scale.y=1+Math.sin(performance.now()/80)*.15}
 player.rotation.y=yaw;if(swing>0){swing-=dt;arm.rotation.x=-Math.sin((.3-swing)/.3*Math.PI)*1.6;arm.rotation.y=Math.sin((.3-swing)/.3*Math.PI)*.8}else{arm.rotation.x=arm.rotation.y=0}
 lamps.forEach(l=>l.material.color.set(night?0xfff3b0:0x555555));
 for(let i=pickups.length-1;i>=0;i--){const p=pickups[i];p.rotation.y+=dt*2;if(p.position.distanceTo(player.position)<1.5){const w=p.userData.w;scene.remove(p);pickups.splice(i,1);if(!S.weap.includes(w))S.weap.push(w);S.cur=w;updW();msg('¡Encontraste: '+WEAP[w].i+' '+WEAP[w].n+'!',3)}}
 // cajas
 for(let i=crates.length-1;i>=0;i--){const c=crates[i];c.rotation.y+=dt;if(c.position.distanceTo(player.position)<1.6){scene.remove(c);crates.splice(i,1);S.food=Math.min(100,S.food+40);S.got++;S.score+=0;msg('🍎 ¡Comida encontrada! +40')}}
 // zombies
 const want=Math.min(30,(night?6:2)+S.day*(night?2:1));if(zombies.length<want&&Math.random()<dt*(night?1.2:.4))makeZ();
 for(let i=zombies.length-1;i>=0;i--){const z=zombies[i],u=z.userData;
  if(u.sleep){u.sleep-=dt;z.scale.multiplyScalar(1-dt*2);z.rotation.z+=dt*3;if(u.sleep<=0){scene.remove(z);zombies.splice(i,1)}continue}
  const dx=player.position.x-z.position.x,dz=player.position.z-z.position.z,d=Math.hypot(dx,dz);z.rotation.y=Math.atan2(dx,dz);
  if(d>1.2){let nx=z.position.x+dx/d*u.sp*dt,nz=z.position.z+dz/d*u.sp*dt;if(Math.hypot(nx,nz)<BASE+1){const a=Math.atan2(z.position.z,z.position.x)+dt*.5;nx=Math.cos(a)*(BASE+1);nz=Math.sin(a)*(BASE+1)}
   if(free(nx,nz)){z.position.x=nx;z.position.z=nz}else{z.position.x+=dz/d*u.sp*dt;z.position.z-=dx/d*u.sp*dt}}
  else if(dmgCD<=0){S.hp-=12;dmgCD=.8;msg('¡Ay! 🧟')}
  z.position.y=Math.abs(Math.sin(performance.now()/200+i))*.15;if(u.hit>0){u.hit-=dt;z.children[1].material.color.set(u.hit>0?0xffffff:0x7cb342)}
  if(!night&&d>70&&Math.random()<dt*.2){scene.remove(z);zombies.splice(i,1)}}
 // bolas
 for(let i=balls.length-1;i>=0;i--){const b=balls[i];b.position.addScaledVector(b.userData.v,dt);b.userData.life-=dt;let hit=false;
  for(const z of zombies)if(!z.userData.sleep&&Math.hypot(z.position.x-b.position.x,z.position.z-b.position.z)<.9){hurtZ(z,b.userData.dmg);hit=true;break}
  if(hit||b.userData.life<=0||!free(b.position.x,b.position.z)){scene.remove(b);balls.splice(i,1)}}
 // HUD
 $('day').textContent=S.day;$('hp').style.width=Math.max(0,S.hp)+'%';$('fd').style.width=S.food+'%';$('run3').textContent=Math.max(0,S.nextRun-S.day);$('score').textContent=S.score;$('crates').textContent=crates.length;
 if((saveT+=dt)>3){saveT=0;save()}
 if(S.hp<=0)gameOver(S.food<=0?'Te quedaste sin comida 🍎':'¡Los zombies te atraparon! 🧟')}
addEventListener('visibilitychange',save);
loop();window.__ok=true;
