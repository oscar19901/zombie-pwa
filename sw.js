const C='zombies-v9',F=['./','index.html','game.js','three.module.js','manifest.json','icon-192.png','icon-512.png','lib/loaders/GLTFLoader.js','lib/utils/BufferGeometryUtils.js','lib/utils/SkeletonUtils.js','models/jugador.glb','models/zombie.glb','models/comerciante.glb','CREDITOS.md'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET')return;
 if(e.request.mode==='navigate'||/\.(html|js)$/.test(u.pathname)&&!u.pathname.includes('three.module')){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));return}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
