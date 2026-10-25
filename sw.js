const C='zombies-v5',F=['./','index.html','game.js','three.module.js','manifest.json','icon-192.png','icon-512.png','lib/loaders/GLTFLoader.js','lib/utils/BufferGeometryUtils.js','lib/utils/SkeletonUtils.js','models/jugador.glb','models/zombie.glb','models/comerciante.glb','CREDITOS.md'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
