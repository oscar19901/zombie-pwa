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
const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),M(0x5a9e3a));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
const WORLD=100,BASE=9,obst=[];
// Casa
const house=new THREE.Group();const wall=box(6,3.5,6,0xc9a26b);wall.position.y=1.75;const roof=new THREE.Mesh(new THREE.ConeGeometry(5,2.5,4),M(0xb03a2e));roof.position.y=4.7;roof.rotation.y=Math.PI/4;
const door=box(1.4,2.4,.1,0x6b3e1e);door.position.set(0,1.2,3.01);house.add(wall,roof,door);house.position.set(0,0,-3);scene.add(house);obst.push({x:0,z:-3,r:3.6});
for(let i=0;i<48;i++){const a=i/48*Math.PI*2;if(Math.abs(a-Math.PI/2)<.2)continue;const p=box(.3,1.4,.3,0x8d6e4a);p.position.set(Math.cos(a)*BASE,.7,Math.sin(a)*BASE);scene.add(p)}
const ring=new THREE.Mesh(new THREE.RingGeometry(BASE-.2,BASE+.2,64),new THREE.MeshBasicMaterial({color:0xffee88}));ring.rotation.x=-Math.PI/2;ring.position.y=.02;scene.add(ring);
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
for(let i=0;i<110;i++){let x=(rnd()-.5)*2*WORLD,z=(rnd()-.5)*2*WORLD;if(Math.hypot(x,z)<16)continue;
 const t=new THREE.Group();const tr=box(.6,2,.6,0x6d4c2f);tr.position.y=1;const lf=new THREE.Mesh(new THREE.ConeGeometry(2,4,7),M(0x2e7d32));lf.position.y=3.8;lf.castShadow=true;t.add(tr,lf);t.position.set(x,0,z);scene.add(t);obst.push({x,z,r:1})}
for(let i=0;i<25;i++){let x=(rnd()-.5)*2*WORLD,z=(rnd()-.5)*2*WORLD;if(Math.hypot(x,z)<16)continue;const r=box(2+rnd()*2,1+rnd()*1.5,2+rnd()*2,0x888888);r.position.set(x,.6,z);scene.add(r);obst.push({x,z,r:1.8})}
const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(Array.from({length:900},()=>(Math.random()-.5)*400).map((v,i)=>i%3==1?Math.abs(v)/2+60:v),3)),new THREE.PointsMaterial({color:0xffffff,size:.8}));scene.add(stars);
// Jugador
const player=new THREE.Group();const body=box(.9,1.1,.5,0x1e88e5);body.position.y=1.25;const head=box(.6,.6,.6,0xffcc99);head.position.y=2.1;
const cap=box(.65,.2,.65,0xe53935);cap.position.y=2.45;const legs=box(.8,.7,.45,0x37474f);legs.position.y=.35;player.add(body,head,cap,legs);scene.add(player);
// Estado
let S,zombies=[],crates=[],balls=[],yaw=0,pitch=.25,keys={},playing=false,fireCD=0,msgT=0,dmgCD=0;
const fresh=()=>({day:1,t:.3,hp:100,food:100,score:0,got:0,x:0,z:4,yaw:Math.PI,nextRun:4,cratesDay:0});
function msg(s,t=3){$('msg').textContent=s;msgT=t}
function save(){if(!S)return;S.x=player.position.x;S.z=player.position.z;S.yaw=yaw;S.crates=crates.map(c=>[c.position.x,c.position.z]);localStorage.setItem('zsave',JSON.stringify(S))}
function free(x,z){return !obst.some(o=>Math.hypot(o.x-x,o.z-z)<o.r+.6)}
function spawnCrates(n){for(let i=0;i<n;i++){let x,z;do{const a=Math.random()*6.28,d=25+Math.random()*70;x=Math.cos(a)*d;z=Math.sin(a)*d}while(!free(x,z));addCrate(x,z)}}
function addCrate(x,z){const c=new THREE.Group();const b=box(1,1,1,0xa0522d);b.position.y=.5;const a=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),M(0xff1744));a.position.y=1.3;c.add(b,a);c.position.set(x,0,z);scene.add(c);crates.push(c)}
function makeZ(){const g=new THREE.Group();const c=[0x7cb342,0x9ccc65,0x689f38][zombies.length%3];
 const b=box(.9,1.1,.5,0x6a4c93);b.position.y=1.25;const h=box(.65,.65,.65,c);h.position.y=2.1;
 const e1=box(.12,.12,.05,0xffeb3b);e1.position.set(-.15,2.15,.33);const e2=e1.clone();e2.position.x=.15;
 const a1=box(.25,.25,.9,c);a1.position.set(-.55,1.6,.4);const a2=a1.clone();a2.position.x=.55;const l=box(.8,.7,.45,0x455a64);l.position.y=.35;
 g.add(b,h,e1,e2,a1,a2,l);let x,z;do{const a=Math.random()*6.28,d=45+Math.random()*40;x=player.position.x+Math.cos(a)*d;z=player.position.z+Math.sin(a)*d}while(Math.hypot(x,z)<BASE+5||Math.abs(x)>WORLD||Math.abs(z)>WORLD);
 g.position.set(x,0,z);g.userData={hp:3,sp:1.6+Math.random()*1.2+S.day*.1,hit:0};scene.add(g);zombies.push(g)}
function start(load){zombies.forEach(z=>scene.remove(z));crates.forEach(c=>scene.remove(c));balls.forEach(b=>scene.remove(b));zombies=[];crates=[];balls=[];
 const sv=load&&JSON.parse(localStorage.getItem('zsave')||'null');S=sv||fresh();player.position.set(S.x,0,S.z);yaw=S.yaw;
 if(sv&&sv.crates)sv.crates.forEach(([x,z])=>addCrate(x,z));else spawnCrates(8);
 $('start').style.display=$('over').style.display='none';playing=true;msg(sv?'¡Partida cargada!':'¡Sobrevive! Encuentra comida cada 3 días 📦');
 if(!touch)renderer.domElement.requestPointerLock?.()}
$('bNew').onclick=()=>start(false);$('bCont').onclick=()=>start(true);$('bRe').onclick=()=>start(false);
if(localStorage.getItem('zsave'))$('bCont').style.display='';
function gameOver(why){playing=false;localStorage.removeItem('zsave');document.exitPointerLock?.();$('bCont').style.display='none';
 $('overTxt').innerHTML=why+'<br>Sobreviviste <b>'+S.day+'</b> días · ⭐ '+S.score+' zombies dormidos · 📦 '+S.got+' cajas';$('over').style.display='flex'}
// Controles
const touch='ontouchstart' in window;if(touch){$('joy').style.display='block';$('fire').style.display=$('run').style.display='flex';$('cross').style.display='none'}
addEventListener('keydown',e=>{keys[e.code]=1;if(e.code=='Space')shoot()});addEventListener('keyup',e=>keys[e.code]=0);
renderer.domElement.addEventListener('mousedown',()=>{if(!playing)return;if(document.pointerLockElement)shoot();else renderer.domElement.requestPointerLock?.()});
addEventListener('mousemove',e=>{if(document.pointerLockElement){yaw-=e.movementX*.003;pitch=Math.max(-.3,Math.min(1.1,pitch+e.movementY*.003))}});
let jv={x:0,y:0},jid=null,lid=null,lx=0,ly=0,runT=false;
$('joy').addEventListener('touchstart',e=>{jid=e.changedTouches[0].identifier;e.preventDefault()});
$('fire').addEventListener('touchstart',e=>{shoot();e.preventDefault()});
$('run').addEventListener('touchstart',e=>{runT=true;e.preventDefault()});$('run').addEventListener('touchend',()=>runT=false);
addEventListener('touchstart',e=>{for(const t of e.changedTouches)if(t.identifier!==jid&&t.clientX>innerWidth/2&&lid===null&&e.target===renderer.domElement){lid=t.identifier;lx=t.clientX;ly=t.clientY}});
addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===jid){const r=$('joy').getBoundingClientRect();let dx=t.clientX-r.left-65,dy=t.clientY-r.top-65,d=Math.hypot(dx,dy);if(d>50){dx*=50/d;dy*=50/d}jv={x:dx/50,y:dy/50};$('knob').style.transform=`translate(${dx}px,${dy}px)`}
 if(t.identifier===lid){yaw-=(t.clientX-lx)*.006;pitch=Math.max(-.3,Math.min(1.1,pitch+(t.clientY-ly)*.004));lx=t.clientX;ly=t.clientY}}e.preventDefault()},{passive:false});
addEventListener('touchend',e=>{for(const t of e.changedTouches){if(t.identifier===jid){jid=null;jv={x:0,y:0};$('knob').style.transform=''}if(t.identifier===lid)lid=null}});
function shoot(){if(!playing||fireCD>0)return;fireCD=.3;const b=new THREE.Mesh(new THREE.SphereGeometry(.2,8,6),new THREE.MeshBasicMaterial({color:0x40c4ff}));
 const dir=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));b.position.copy(player.position).add(new THREE.Vector3(0,1.5,0)).addScaledVector(dir,.8);b.userData={v:dir.multiplyScalar(28),life:1.4};scene.add(b);balls.push(b)}
// Bucle
const clock=new THREE.Clock();let saveT=0;
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);if(playing)update(dt);
 const cp=player.position;cam.position.set(cp.x+Math.sin(yaw)*6*Math.cos(pitch),2+6*Math.sin(pitch)+1,cp.z+Math.cos(yaw)*6*Math.cos(pitch));cam.lookAt(cp.x,cp.y+1.8,cp.z);
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
 let mx=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)+jv.x,mz=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0)+jv.y;
 if(keys.KeyQ)yaw+=dt*2;if(keys.KeyE)yaw-=dt*2;
 const sp=(keys.ShiftLeft||runT?9:5.5)*dt,l=Math.hypot(mx,mz);if(l>.1){if(l>1){mx/=l;mz/=l}
  const s=Math.sin(yaw),c=Math.cos(yaw);let nx=player.position.x+(mx*c+mz*s)*sp,nz=player.position.z+(-mx*s+mz*c)*sp;
  if(free(nx,player.position.z))player.position.x=Math.max(-WORLD,Math.min(WORLD,nx));if(free(player.position.x,nz))player.position.z=Math.max(-WORLD,Math.min(WORLD,nz));
  legs.scale.y=1+Math.sin(performance.now()/80)*.15}
 player.rotation.y=yaw;
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
  for(const z of zombies)if(!z.userData.sleep&&Math.hypot(z.position.x-b.position.x,z.position.z-b.position.z)<.9){z.userData.hp--;z.userData.hit=.15;hit=true;if(z.userData.hp<=0){z.userData.sleep=.6;S.score++;msg('💤 ¡Zombie dormido!',1)}break}
  if(hit||b.userData.life<=0||!free(b.position.x,b.position.z)){scene.remove(b);balls.splice(i,1)}}
 // HUD
 $('day').textContent=S.day;$('hp').style.width=Math.max(0,S.hp)+'%';$('fd').style.width=S.food+'%';$('run3').textContent=Math.max(0,S.nextRun-S.day);$('score').textContent=S.score;$('crates').textContent=crates.length;
 if((saveT+=dt)>3){saveT=0;save()}
 if(S.hp<=0)gameOver(S.food<=0?'Te quedaste sin comida 🍎':'¡Los zombies te atraparon! 🧟')}
addEventListener('visibilitychange',save);
loop();window.__ok=true;
