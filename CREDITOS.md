# CRÉDITOS Y LICENCIAS

## Modelos 3D (todos CC0 1.0 – dominio público)
Autor: **Quaternius** (https://quaternius.com) – "Ultimate Animated Character Pack" / packs de personajes animados.
Descargados de Poly Pizza el 25-oct-2026, con la licencia "CC0 1.0" indicada en cada página.
Optimizados con gltf-transform: solo se dejaron las animaciones que se usan, y se aplicaron remuestreo, prune, dedup y quantize.

| Archivo | Original | Página | Animaciones usadas |
|---|---|---|---|
| models/jugador.glb | "Adventurer" | https://poly.pizza/m/5EGWBMpuXq | Idle, Walk, Run, Punch_Right, Sword_Slash, Gun_Shoot, HitRecieve, Death |
| models/zombie.glb | "Zombie" | https://poly.pizza/m/JoBvxIUpZP | Idle, Walk, Run, Attack (mordida), HitRecieve, Death |
| models/comerciante.glb | "Farmer" | https://poly.pizza/m/7pn3R6hPvE | Idle, Wave |

CC0: https://creativecommons.org/publicdomain/zero/1.0/

## Código
- three.js r160 (three.module.js, GLTFLoader, SkeletonUtils, BufferGeometryUtils) – Licencia MIT, © 2010-2023 three.js authors – https://github.com/mrdoob/three.js
- Texturas, sonidos/efectos, iconos y lógica del juego: creados de forma procedural para este proyecto.

## Vehículos (CC0 1.0 – dominio público)
Autor: **Kenney** (https://kenney.nl) – "Car Kit" (v3.1), https://kenney.nl/assets/car-kit. Descargado el 25-oct-2026 con licencia CC0 (archivo License.txt del pack).
Archivos: models/autos/sedan.glb, taxi.glb, police.glb, van.glb, truck.glb, suv.glb y models/autos/Textures/colormap.png. En el juego cada modelo se fusiona en una sola geometría que comparte un único material.

## Armas (CC0 1.0 – dominio público)
Autor: **Kenney** (https://kenney.nl). Descargadas el 25-oct-2026; licencia CC0 según el License.txt de cada pack.
- "Blaster Kit" (v2.1), https://kenney.nl/assets/blaster-kit: models/armas/blaster/blaster-k.glb (Pistola de agua), blaster-b.glb (Lanzador gigante) y Textures/colormap.png.
- "Survival Kit", https://kenney.nl/assets/survival-kit: models/armas/survival/tool-axe.glb (Palo-machete, mostrado como hacha) y Textures/colormap.png.
- El Bate y el Tubo son modelos procedurales hechos para este proyecto: ningún pack CC0 traía esas armas.

## Biomas, animales y armaduras (v17)
Descargados el 25-oct-2026 desde https://poly.pizza (modelos GLB con texturas incrustadas, sin carpeta Textures).
- **Quaternius** (https://quaternius.com), CC0 1.0: models/animales/snake.glb, mono.glb, arana.glb, cactoro.glb, zorro.glb; models/bioma/palmera.glb, cactus.glb, cactus2.glb, roca.glb, roca2.glb; models/armadura/chaleco.glb, chaleco2.glb, escudo.glb, escudo2.glb.
- **Kenney** (https://kenney.nl), CC0 1.0: models/bioma/casa.glb, casa2.glb, casa3.glb (casas de la colonia).
- **"Football helmet" de Poly by Google**, licencia CC-BY 3.0 (https://creativecommons.org/licenses/by/3.0/), vía https://poly.pizza: models/armadura/casco.glb. Se usa como casco de armadura; los colores se pasaron a colores de vértice.
- El juego convierte los colores de los props en colores de vértice y fusiona cada prop en una sola geometría.

## v18 Multijugador
- PeerJS 1.5.5 (lib/peerjs.min.js) — MIT, Michelle Bu y Eric Zhang. https://peerjs.com
- Servidor de señal gratuito de PeerJS y STUN público de Google.

## Novedades v19
- **Personajes extra** (Obrero, SWAT, Astronauta, Rey, Chico casual, Ejecutivo): *Ultimate Animated Character Pack* de **Quaternius** — CC0 (dominio público). Descargados de poly.pizza: Worker `Yg2bQZO6Hj`, SWAT `Btfn3G5Xv4`, Astronaut `3hC2i0CTuO`, King `I1gTjmuK2m`, Casual Character `kZ3DmIoGip`, Business Man `JFrLIKqvCH` (https://poly.pizza/m/<id>). Optimizados con gltf-transform.
- **Moto**: "Cartoony Purple Motorcycle" de **AliceCassie** — CC0 — https://poly.pizza/m/j20srJUjpB
- **Autos**: Kenney Car Kit (CC0), ya incluidos.
- **Música y efectos de sonido**: generados por código (WebAudio) dentro del juego; sin archivos de audio de terceros.
