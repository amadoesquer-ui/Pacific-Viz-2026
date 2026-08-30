/* Pacific Strata — prototipo
 * Globo inclinado + pseudo-ZEE extruidas como pilas de estratos anuales.
 * Grosor uniforme por año, color por valor (inspiración: climate stripes).
 * Separar estratos anima mesh.scale (escalado uniforme ≈ desplazamiento
 * radial; error de grosor < 12 %, invisible); la losa base nunca se mueve.
 * Cambiar el grosor sí reconstruye geometrías (solo las unidades visibles;
 * las ocultas se marcan sucias y se reconstruyen al mostrarse).
 */
import * as THREE from "three";
import ConicPolygonGeometry from "three-conic-polygon-geometry";

// ------------------------------------------------------------------ config
const R = 100;                       // radio del globo
const BASE_ALT = 0;                // separación del fondo de la pila
const STACK_T = 2;                   // grosor total de la pila (todas las losas)
const THICK_MIN = 1;                 // grosor de losa sin seleccionar (fracción del paso)
// Altura de la pila SELECCIONADA, como múltiplo de la de las no seleccionadas:
// a 1× se ve exactamente igual que las demás; a 10×, diez veces más alta.
const H_MIN = 1, H_MAX = 10, H_DEF = 3;
// Hueco máximo entre losas, como fracción del paso. No llega a 1 porque ahí la
// losa tendría grosor cero; a 0.85 queda un estrato del 15 % del paso.
const SEP_MAX_FRAC = 0.85;
const CURV = { region: 2.0, country: 3.5 }; // resolución de curvatura (°)
const VIEW = { lat: -14, lon: 187, dist: 305, tiltLat: -46 }; // cámara inicial

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Dos rampas, porque los 13 indicadores no son del mismo tipo:
//   · DIVERGENTE (RdBu invertida, estilo climate stripes) para los que se leen
//     contra un cero con significado —anomalías de temperatura, nivel del mar,
//     precipitación—: dominio simétrico ±abs, blanco en el cero.
//   · SECUENCIAL (viridis) para los que solo crecen —turismo, energía, GEI,
//     rendimientos—. Con la divergente su dominio simétrico ±max dejaba todos
//     los valores en la mitad cálida y la leyenda anunciaba un −1 058 000
//     turistas que no existe.
// Ambas son legibles en daltonismo y sobre los dos temas.
const RAMP_DIV = ["#08306b", "#2166ac", "#4393c3", "#92c5de", "#f7f7f7",
                  "#f4a582", "#d6604d", "#b2182b", "#67001f"];
const RAMP_SEQ = ["#440154", "#472d7b", "#3b528b", "#2c728e", "#21918c",
                  "#28ae80", "#5ec962", "#addc30", "#fde725"];
const rampOf = dom => dom.diverging ? RAMP_DIV : RAMP_SEQ;

// Paletas de la escena 3D. Las del interfaz (HTML) viven en las variables
// CSS de index.html; aquí solo lo que pinta WebGL.
const THEMES = {
  dark: {
    bg: 0x060d18, ocean: 0x0e2036, land: 0x3a5a78,
    grid: 0x7fb4e0, gridOpacity: 0.08,
    ambient: 0xbfd4e6, ambientI: 0.85, sunI: 1.35, fillI: 0.35,
  },
  light: {
    bg: 0xeaf1f7, ocean: 0xc3d8e8, land: 0x87a2ba,
    grid: 0x2f6288, gridOpacity: 0.12,
    ambient: 0xffffff, ambientI: 1.05, sunI: 1.0, fillI: 0.25,
  },
};
let theme = THEMES.dark;

// ------------------------------------------------------------------ estado
const state = {
  level: "region",          // "region" | "country"
  regionId: null,           // subregión activa en nivel país
  indicator: null,          // id del indicador
  selected: null,           // unit seleccionada (objeto unit)
  separation: 0,            // 0 volumen … 1 estratos (reparte, no añade altura)
  height: H_DEF,            // altura del seleccionado, × la de los no seleccionados
  opacity: 1,               // opacidad de las losas (1 = opacas)
  domain: {},               // por indicador: {min, max, abs}
};
const units = { region: [], country: [] };   // {id, name, region?, group, slabs[]}
const unitById = {};

// ------------------------------------------------------------------ escena
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(theme.bg);

const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
placeCamera();

// Sin OrbitControls: arrastrar gira el PROPIO globo (libre, ambos ejes);
// el botón «alinear norte» endereza el eje N-S; el botón central / dos
// dedos lo desplazan y la rueda hace zoom moviendo la cámara.
const ZOOM_MIN = 150, ZOOM_MAX = 650, ROT_SPEED = 0.005;

const ambient = new THREE.AmbientLight(theme.ambient, theme.ambientI);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, theme.sunI);
sun.position.set(-320, 260, 180);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6ba0d6, theme.fillI);
fill.position.set(280, -140, -220);
scene.add(fill);

// grupo del globo: todo lo geográfico cuelga de aquí para poder
// desplazarlo/inclinarlo con los sliders de vista
const globe = new THREE.Group();
scene.add(globe);

// esfera oceánica opaca con el mapa base proyectado como textura
// (drawBaseMap la dibuja cuando cargan las geometrías y al cambiar de tema)
const mapCanvas = Object.assign(document.createElement("canvas"),
  { width: 4096, height: 2048 });
const mapTexture = new THREE.CanvasTexture(mapCanvas);
mapTexture.colorSpace = THREE.SRGBColorSpace;
mapTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
globe.add(new THREE.Mesh(
  new THREE.SphereGeometry(R, 96, 64),
  new THREE.MeshStandardMaterial({ map: mapTexture, roughness: 0.92, metalness: 0.05 })
));

const gridMat = new THREE.LineBasicMaterial(
  { color: theme.grid, transparent: true, opacity: theme.gridOpacity });
globe.add(graticule());

// ------------------------------------------------------------------ utils
function polar2Cartesian(lat, lng, r) { // misma convención que la librería
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta));
}

function placeCamera() {
  camera.position.copy(polar2Cartesian(VIEW.tiltLat, VIEW.lon, VIEW.dist));
  // sesgo hacia el centro del Pacífico: mira ligeramente por encima del origen
  camera.lookAt(0, 0, 0);
}

function graticule() {
  const g = new THREE.Group();
  const mk = pts => g.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  for (let lat = -60; lat <= 60; lat += 15) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 4) pts.push(polar2Cartesian(lat, lon, R + 0.15));
    mk(pts);
  }
  for (let lon = -180; lon < 180; lon += 15) {
    const pts = [];
    for (let lat = -85; lat <= 85; lat += 4) pts.push(polar2Cartesian(lat, lon, R + 0.15));
    mk(pts);
  }
  return g;
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function colorFor(v, dom) {
  // divergente: dominio simétrico alrededor de 0. secuencial: [min, max].
  const raw = dom.diverging ? (v / dom.abs + 1) / 2
                            : (v - dom.min) / (dom.max - dom.min);
  const t = Math.min(1, Math.max(0, raw));
  const ramp = rampOf(dom);
  const i = Math.min(ramp.length - 2, Math.floor(t * (ramp.length - 1)));
  const f = t * (ramp.length - 1) - i;
  return new THREE.Color(ramp[i]).lerp(new THREE.Color(ramp[i + 1]), f);
}

// ------------------------------------------------------------------ carga
const [regions, countries, land, world, dataset] = await Promise.all(
  ["regions", "countries", "land", "world", "dataset"]
    .map(f => fetch(`data/${f}.json`).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar data/${f}.json`);
      return r.json();
    }))
).catch(err => { alert(err.message + "\n¿Ejecutaste los scripts de data_prep/?"); throw err; });

const YEARS = dataset.meta.years;
const INDICATORS = dataset.meta.indicators;
state.indicator = INDICATORS[0].id;

// dominio por indicador (todas las unidades, todos los años). Los divergentes
// usan `abs` (simétrico); los secuenciales, `min`/`max`. Se calculan los tres
// en la misma pasada. Los CSV de .STAT no cubren todos los países, así que hay
// series ausentes: se saltan en vez de reventar el recorrido.
for (const ind of INDICATORS) {
  let abs = 0, min = Infinity, max = -Infinity;
  for (const series of Object.values(dataset.values)) {
    if (!series[ind.id]) continue;
    for (const v of series[ind.id]) {
      abs = Math.max(abs, Math.abs(v));
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  if (min > max) { min = 0; max = 1; }        // indicador sin ningún dato
  state.domain[ind.id] = {
    abs: abs || 1, min, max,
    diverging: ind.diverging !== false,
  };
}

// -------- mapa base: siluetas de tierra rasterizadas a un lienzo
// equirrectangular y proyectadas como textura de la esfera. Cada anillo se
// desenrolla en longitud (sin saltos de ±360°) y se dibuja en tres copias
// desplazadas un ancho de lienzo, con lo que los polígonos que cruzan el
// antimeridiano no dejan costura ni se rellenan por el lado largo (el bug
// que tenía la versión extruida con ConicPolygonGeometry).
// u = (lon + 90)/360 casa el UV de SphereGeometry con polar2Cartesian.
function drawBaseMap() {
  const W = mapCanvas.width, H = mapCanvas.height;
  const ctx = mapCanvas.getContext("2d");
  const hex = c => "#" + c.toString(16).padStart(6, "0");
  ctx.fillStyle = hex(theme.ocean);
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = hex(theme.land);
  // continentes (Natural Earth 110m) debajo; encima las siluetas detalladas
  // de los países del Pacífico (a 110m los atolones desaparecen)
  for (const f of [...world.features, ...land.features]) {
    for (const poly of asPolys(f.geometry)) {
      const path = new Path2D();
      let polar = false;
      for (const ring of poly) {
        const pts = [];
        let prev = null;
        for (const [lon, lat] of ring) {
          const l = prev === null ? lon : lon + Math.round((prev - lon) / 360) * 360;
          prev = l;
          pts.push([(l + 90) / 360 * W, (90 - lat) / 180 * H]);
        }
        // Un anillo que rodea un polo (Antártida) no cierra sobre sí mismo al
        // desenrollarlo: da una vuelta completa y acaba un ancho de lienzo a la
        // derecha de donde empezó. Cerrarlo en línea recta lo convertiría en una
        // banda con los colores invertidos, así que se remata por el borde del
        // lienzo, que es el polo: bajar, cruzar y cerrar.
        const first = pts[0], last = pts[pts.length - 1];
        if (Math.abs(last[0] - first[0]) > W / 2) {
          polar = true;
          const lats = ring.map(p => p[1]);
          const alNorte = 90 - Math.max(...lats);   // lo que le falta para el N
          const alSur = Math.min(...lats) + 90;     // …y para el S
          const yPole = alSur < alNorte ? H : 0;    // encierra el más cercano
          pts.push([last[0], yPole], [first[0], yPole]);
        }
        for (const dx of [-W, 0, W]) {
          path.moveTo(pts[0][0] + dx, pts[0][1]);
          for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0] + dx, pts[i][1]);
          path.closePath();
        }
      }
      // evenodd respeta los anillos-agujero, pero anularía el solape entre las
      // tres copias de un anillo polar (más ancho que el lienzo): ahí, nonzero.
      ctx.fill(path, polar ? "nonzero" : "evenodd");
    }
  }
  mapTexture.needsUpdate = true;
}
drawBaseMap();

function asPolys(geometry) {
  return geometry.type === "Polygon" ? [geometry.coordinates]
                                     : geometry.coordinates;
}

// ------------------------------------------------------------------ pilas
function buildUnits(fc, level) {
  const slabT = STACK_T / YEARS.length;
  for (const f of fc.features) {
    const { id, name, region } = f.properties;
    const group = new THREE.Group();
    group.visible = level === "region";
    const unit = { id, name, region, level, group, slabs: [] };

    YEARS.forEach((year, i) => {
      const r0 = R + BASE_ALT + i * slabT;
      const slabMeshes = [];
      for (const poly of asPolys(f.geometry)) {
        // sin seleccionar, las losas se dibujan al grosor mínimo
        const geo = new ConicPolygonGeometry(
          poly, r0, r0 + slabT * THICK_MIN, true, true, true, CURV[level]);
        const mat = new THREE.MeshStandardMaterial({
          roughness: 0.55, metalness: 0.0,
          // DoubleSide: las paredes laterales de la librería quedan con la
          // normal hacia dentro según el sentido del anillo; con culling se
          // "pierde" la cara que miras de frente
          side: THREE.DoubleSide,
          opacity: state.opacity,
          transparent: state.opacity < 1,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.userData = { unit, yearIndex: i, r0, poly };
        slabMeshes.push(mesh);
        group.add(mesh);
      }
      unit.slabs.push({ year, yearIndex: i, meshes: slabMeshes, r0 });
    });

    units[level].push(unit);
    unitById[id] = unit;
    globe.add(group);
  }
}
buildUnits(regions, "region");
buildUnits(countries, "country");

const slabT = STACK_T / YEARS.length;

// -------- geometría de la pila. Los dos sliders solo afectan a la unidad
// SELECCIONADA; el resto se dibuja siempre con el paso base y grosor completo.
//
// Los dos controles son independientes por diseño:
//   · ALTURA fija cuánto mide la pila: su paso es state.height veces el paso
//     base, así que a 1× ocupa exactamente lo mismo que las no seleccionadas
//     y a 10× es diez veces más alta.
//   · SEPARACIÓN reparte ese paso entre losa y hueco (0 = volumen macizo,
//     1 = estratos finos), sin cambiar la altura total. Si añadiera altura,
//     a 1× el seleccionado sobresaldría de las demás y se rompería el anclaje.
const sepFrac = () => state.separation * SEP_MAX_FRAC;

// La pila acaba en el techo de su última losa, que con hueco es más fina; sin
// corregirlo la altura encogería hasta un 8 % al separar. Como
// alto = paso·(n − sepFrac), se despeja el paso para que el techo caiga
// siempre en state.height × la altura de las no seleccionadas.
const pitchOf = u => state.selected === u
  ? slabT * state.height * YEARS.length / (YEARS.length - sepFrac())
  : slabT;
// desplazamiento radial extra por índice: lleva la losa desde el paso con el
// que se construyó la geometría (slabT) hasta el paso que le toca ahora
const gapOf = u => pitchOf(u) - slabT;

// La animación desplaza cada losa escalándola por k = (r0 + i·gap)/r0, y ese
// escalado uniforme multiplica también su grosor; por eso la geometría se
// extruye a t/k, para que el grosor final sea exactamente t.
function rebuildUnit(u) {
  const isSel = state.selected === u;
  const pitch = pitchOf(u), gap = gapOf(u);
  const t = isSel ? pitch * (1 - sepFrac()) : pitch * THICK_MIN;
  for (const s of u.slabs) {
    const k = (s.r0 + s.yearIndex * gap) / s.r0;
    for (const m of s.meshes) {
      m.geometry.dispose();
      m.geometry = new ConicPolygonGeometry(
        m.userData.poly, s.r0, s.r0 + t / k, true, true, true, CURV[u.level]);
    }
  }
}

let rebuildQueued = false;
function queueRebuild() {           // 1 rebuild por frame como mucho
  if (rebuildQueued || !state.selected) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    if (state.selected) rebuildUnit(state.selected);
  });
}

// -------- transparencia: se aplica a TODAS las pilas (a diferencia de los
// otros dos sliders), porque su utilidad es ver a través del volumen —los
// estratos interiores, el mapa y las pilas de detrás—. Con las losas
// translúcidas se desactiva depthWrite: si no, la losa que se dibuja primero
// tapa por profundidad a las de atrás y la pila se ve hueca en vez de
// estratificada.
function applyOpacity() {
  const opaque = state.opacity >= 1;
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      for (const s of u.slabs) {
        for (const m of s.meshes) {
          m.material.opacity = state.opacity;
          m.material.transparent = !opaque;
          m.material.depthWrite = opaque;
          m.material.needsUpdate = true;
        }
      }
    }
  }
}

function recolor() {
  const dom = state.domain[state.indicator];
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      const series = dataset.values[u.id]?.[state.indicator];
      if (!series) continue;           // .STAT no cubre todos los indicadores
      u.slabs.forEach((s, i) => {
        const c = colorFor(series[i], dom);
        for (const m of s.meshes) m.material.color.copy(c);
      });
    }
  }
  paintLegend();
  if (state.selected) fillPanel(state.selected);
}

// ------------------------------------------------------------------ animación de pilas
// objetivo de escala por losa: (r0 + i*gap) / r0
// La losa base (i = 0) queda siempre pegada al globo: la pila no se levanta,
// solo se abren los estratos superiores. La separación del slider aplica
// SOLO a la seleccionada; el resto queda con separación 0 (cada losa en su
// punto de extrusión).
function animate(now) {
  requestAnimationFrame(animate);

  if (northTarget) {                  // animación del botón «alinear norte»
    globe.quaternion.slerp(northTarget, 0.12);
    if (globe.quaternion.angleTo(northTarget) < 0.002) {
      globe.quaternion.copy(northTarget);
      northTarget = null;
    }
  }

  // Sin resaltado por color: la pila seleccionada se distingue por su altura,
  // y teñirla falseaba la lectura de la rampa (el emisivo desaturaba el color
  // del dato, que es justo lo que hay que comparar contra la leyenda).
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.group.visible) continue;
      const gap = gapOf(u);
      for (const s of u.slabs) {
        const target = (s.r0 + s.yearIndex * gap) / s.r0;
        for (const m of s.meshes) {
          const cur = m.scale.x;
          const next = REDUCED ? target : lerp(cur, target, 0.14);
          m.scale.setScalar(Math.abs(next - target) < 1e-4 ? target : next);
        }
      }
    }
  }
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ picking
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downAt = null;

function pickables() {
  const list = [];
  for (const u of units[state.level === "region" ? "region" : "country"]) {
    if (u.group.visible) list.push(...u.group.children);
  }
  return list;
}

function unitAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  ptr.set(((clientX - rect.left) / rect.width) * 2 - 1,
          -((clientY - rect.top) / rect.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(pickables(), false)[0];
  return hit ? hit.object.userData.unit : null;
}

// -------- arrastre:
//   · arrastre normal → rotación LIBRE del globo sobre su propio centro
//     (ambos ejes, en coordenadas de cámara)
//   · botón central (rueda) o dos dedos → mueve el globo en el plano de la cámara
//   · botón «alinear norte» → endereza el eje N-S con una animación corta
const _right = new THREE.Vector3(), _up = new THREE.Vector3();
const _q = new THREE.Quaternion();
const pointers = new Map();            // pointerId -> {x, y, button}
let northTarget = null;                // cuaternión objetivo de «alinear norte»

function rotateGlobe(dx, dy) {
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  globe.quaternion.premultiply(_q.setFromAxisAngle(_up, dx * ROT_SPEED));
  globe.quaternion.premultiply(_q.setFromAxisAngle(_right, dy * ROT_SPEED));
}

function panGlobe(dx, dy) {
  // unidades de mundo por pixel a la distancia actual de la cámara
  const k = 2 * camera.position.length() * Math.tan(camera.fov * Math.PI / 360)
          / canvas.clientHeight;
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  globe.position.addScaledVector(_right, dx * k).addScaledVector(_up, -dy * k);
}

document.getElementById("north-btn").addEventListener("click", () => {
  // Meridianos verticales EN PANTALLA: lleva el eje N-S del globo al «arriba»
  // de la cámara. (Al Y del mundo no sirve: la cámara está inclinada y
  // quedaría el casquete polar de frente, con los meridianos en abanico.)
  // Conserva la longitud que mira a la cámara para que el globo no dé
  // bandazos: solo rueda hasta poner el ecuador de frente.
  const v = camera.position.clone().sub(globe.position).normalize(); // globo→cámara
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  up.addScaledVector(v, -up.dot(v)).normalize();  // arriba de pantalla, ⟂ v
  // punto que mira a la cámara, en coordenadas locales del globo…
  const faceL = v.clone().applyQuaternion(_q.copy(globe.quaternion).invert());
  faceL.setY(0);                                  // …bajado a su longitud del ecuador
  if (faceL.lengthSq() < 1e-6) faceL.set(1, 0, 0); // mirando un polo: da igual cuál
  faceL.normalize();
  const north = new THREE.Vector3(0, 1, 0);
  // rotación que lleva la base local (longitud, norte) a la de pantalla (v, up)
  const mLocal = new THREE.Matrix4().makeBasis(
    faceL, north, new THREE.Vector3().crossVectors(faceL, north));
  const mView = new THREE.Matrix4().makeBasis(
    v, up, new THREE.Vector3().crossVectors(v, up));
  northTarget = new THREE.Quaternion()
    .setFromRotationMatrix(mView.multiply(mLocal.transpose()));
  if (REDUCED) { globe.quaternion.copy(northTarget); northTarget = null; }
});

canvas.addEventListener("pointerdown", e => {
  if (e.button === 1) e.preventDefault();  // sin autoscroll del botón central
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
  if (e.button === 0 && pointers.size === 1) downAt = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", e => {
  pointers.delete(e.pointerId);
  if (e.button !== 0 || !downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;               // fue arrastre, no clic
  select(unitAt(e.clientX, e.clientY));
});
canvas.addEventListener("pointercancel", e => pointers.delete(e.pointerId));
canvas.addEventListener("pointermove", e => {
  const p = pointers.get(e.pointerId);
  if (p) {
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) panGlobe(dx / 2, dy / 2);   // dos dedos: mover
    else if (p.button === 1) panGlobe(dx, dy);          // botón central: mover
    else { rotateGlobe(dx, dy); northTarget = null; }   // giro libre
    canvas.style.cursor = "grabbing";
    return;
  }
  // el cursor es toda la respuesta al hover: no se tiñe la geometría
  canvas.style.cursor = unitAt(e.clientX, e.clientY) ? "pointer" : "grab";
});
canvas.addEventListener("wheel", e => {
  e.preventDefault();
  const len = THREE.MathUtils.clamp(
    camera.position.length() * Math.exp(e.deltaY * 0.001), ZOOM_MIN, ZOOM_MAX);
  camera.position.setLength(len);
}, { passive: false });
addEventListener("keydown", e => { if (e.key === "Escape") select(null); });

// ------------------------------------------------------------------ selección / niveles
const panel = document.getElementById("panel");
const drillBtn = document.getElementById("p-drill");
const crumb = document.getElementById("crumb");

function select(u) {
  const prev = state.selected;
  state.selected = u;
  // el grosor del slider solo aplica a la selección: reconstruir la que
  // sale (vuelve a THICK_MIN) y la que entra (toma el valor del slider)
  if (prev && prev !== u) rebuildUnit(prev);
  if (u && u !== prev) rebuildUnit(u);
  panel.classList.toggle("open", !!u);
  if (u) fillPanel(u);
}

function fillPanel(u) {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const series = dataset.values[u.id]?.[state.indicator] ?? [];
  const dom = state.domain[state.indicator];

  document.getElementById("p-region").textContent =
    u.level === "region" ? "Subregión" : u.region;
  document.getElementById("p-name").textContent = u.name;

  const stripes = document.getElementById("p-stripes");
  stripes.innerHTML = "";
  series.forEach((v, i) => {
    const d = document.createElement("div");
    d.style.background = "#" + colorFor(v, dom).getHexString();
    d.title = `${YEARS[i]}: ${nf.format(v)} ${ind.unit}`;
    stripes.appendChild(d);
  });

  const ro = document.getElementById("p-readout");
  ro.innerHTML = "";
  YEARS.forEach((y, i) => {
    const row = document.createElement("div");
    row.className = "row";
    const v = series[i];
    row.innerHTML = `<span class="y">${y}</span><span>${
      v === undefined ? "—" : `${nf.format(v)} ${ind.unit}`}</span>`;
    ro.appendChild(row);
  });

  // El nivel país ya son EEZ oficiales (Marine Regions v12); el de subregión
  // sigue disuelto de las pseudo-ZEE, así que no se anuncia lo que no es.
  document.getElementById("p-note").textContent =
    u.level === "region"
      ? `Agregación: ${dataset.meta.aggregation}, sobre pseudo-ZEE.`
      : "ZEE oficial (Marine Regions v12).";
  drillBtn.hidden = u.level !== "region";
}

drillBtn.addEventListener("click", () => {
  if (!state.selected || state.selected.level !== "region") return;
  enterRegion(state.selected.id);
});

function enterRegion(regionId) {
  state.level = "country";
  state.regionId = regionId;
  select(null);
  for (const u of units.region) u.group.visible = false;
  for (const u of units.country) u.group.visible = u.region === regionId;
  const name = unitById[regionId].name;
  crumb.innerHTML = "";
  const back = document.createElement("button");
  back.textContent = "← Pacífico";
  back.addEventListener("click", exitRegion);
  crumb.append(back, ` · ${name} · países y territorios`);
}

function exitRegion() {
  state.level = "region";
  state.regionId = null;
  select(null);
  for (const u of units.country) u.group.visible = false;
  for (const u of units.region) u.group.visible = true;
  crumb.textContent = "Pacífico · subregiones";
}

// ------------------------------------------------------------------ controles
// -------- carrusel de indicadores. Con 13 indicadores la fila de botones ya
// no cabe en el panel, así que se paginan de PER_PAGE en PER_PAGE. Las páginas
// y los puntos se generan aquí desde INDICATORS: así el número de puntos no
// puede desincronizarse del de indicadores al añadir uno.
const PER_PAGE = 3;
const carousel = document.getElementById("carousel");
const dots = document.getElementById("carousel-dots");
const prevBtn = document.getElementById("carousel-prev");
const nextBtn = document.getElementById("carousel-next");
const nPages = Math.ceil(INDICATORS.length / PER_PAGE);

for (let p = 0; p < nPages; p++) {
  const page = document.createElement("div");
  page.className = "carousel-page";
  const grp = document.createElement("div");
  grp.className = "seg";
  for (const ind of INDICATORS.slice(p * PER_PAGE, (p + 1) * PER_PAGE)) {
    const b = document.createElement("button");
    b.textContent = ind.name;
    b.title = ind.unit;
    b.setAttribute("aria-pressed", ind.id === state.indicator);
    b.addEventListener("click", () => {
      if (state.indicator === ind.id) return;
      state.indicator = ind.id;
      carousel.querySelectorAll("button").forEach(x =>
        x.setAttribute("aria-pressed", x === b));
      recolor();
    });
    grp.appendChild(b);
  }
  page.appendChild(grp);
  carousel.appendChild(page);

  const dot = document.createElement("button");
  dot.setAttribute("role", "tab");
  dot.setAttribute("aria-label", `Página ${p + 1} de ${nPages}`);
  dot.setAttribute("aria-current", p === 0);
  dot.addEventListener("click", () => goToPage(p));
  dots.appendChild(dot);
}

// La página se deduce del scroll en vez de llevarse en una variable aparte:
// el contenedor también se desplaza arrastrando o con la rueda, y así flechas
// y puntos siguen contando lo mismo que se ve.
const pageOf = () => Math.round(carousel.scrollLeft / carousel.clientWidth);

function goToPage(p) {
  carousel.scrollTo({ left: p * carousel.clientWidth, behavior: "smooth" });
}

function syncCarousel() {
  const p = pageOf();
  dots.querySelectorAll("button").forEach((d, i) =>
    d.setAttribute("aria-current", i === p));
  prevBtn.disabled = p <= 0;
  nextBtn.disabled = p >= nPages - 1;
}

prevBtn.addEventListener("click", () => goToPage(pageOf() - 1));
nextBtn.addEventListener("click", () => goToPage(pageOf() + 1));
carousel.addEventListener("scroll", syncCarousel, { passive: true });
syncCarousel();

const sep = document.getElementById("sep");
const sepVal = document.getElementById("sep-val");
sep.addEventListener("input", () => {
  state.separation = +sep.value;
  sepVal.textContent = state.separation < 0.01 ? "volumen"
                     : Math.round(sepFrac() * 100) + " %";
  queueRebuild();   // la separación reparte el paso: cambia el grosor de la losa
});

const hgt = document.getElementById("height");
const hgtVal = document.getElementById("height-val");
hgt.addEventListener("input", () => {
  state.height = +hgt.value;
  hgtVal.textContent = state.height < 1.05 ? "igual"
                     : (+state.height.toFixed(1)) + " ×";
  queueRebuild();
});

const opa = document.getElementById("opacity");
const opaVal = document.getElementById("opacity-val");
opa.addEventListener("input", () => {
  state.opacity = +opa.value;
  opaVal.textContent = state.opacity >= 1 ? "opacas"
                     : Math.round((1 - state.opacity) * 100) + " %";
  applyOpacity();
});


// -------- tema claro / oscuro: repinta el interfaz (atributo en <html>, que
// conmuta las variables CSS) y los materiales de la escena 3D.
const THEME_KEY = "pacific-strata:theme";
const segTheme = document.getElementById("seg-theme");

function applyTheme(name) {
  theme = THEMES[name] || THEMES.dark;
  document.documentElement.dataset.theme = name;

  scene.background.setHex(theme.bg);
  drawBaseMap();                     // océano + tierra viven en la textura
  gridMat.color.setHex(theme.grid);
  gridMat.opacity = theme.gridOpacity;
  ambient.color.setHex(theme.ambient);
  ambient.intensity = theme.ambientI;
  sun.intensity = theme.sunI;
  fill.intensity = theme.fillI;

  segTheme.querySelectorAll("button").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.theme === name));
  try { localStorage.setItem(THEME_KEY, name); } catch { /* modo privado */ }
}

[["dark", "Oscuro"], ["light", "Claro"]].forEach(([id, label]) => {
  const b = document.createElement("button");
  b.textContent = label;
  b.dataset.theme = id;
  b.addEventListener("click", () => applyTheme(id));
  segTheme.appendChild(b);
});

// Con datos reales los extremos van de 0,2 m a 1 058 000 turistas, así que se
// formatean en vez de volcarse crudos.
const nf = new Intl.NumberFormat("es", { maximumSignificantDigits: 3 });

function paintLegend() {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const dom = state.domain[state.indicator];
  document.getElementById("ramp").style.background =
    `linear-gradient(90deg, ${rampOf(dom).join(",")})`;
  const [lo, hi] = dom.diverging ? [-dom.abs, dom.abs] : [dom.min, dom.max];
  document.getElementById("ramp-min").textContent = `${nf.format(lo)} ${ind.unit}`;
  document.getElementById("ramp-max").textContent = `${nf.format(hi)} ${ind.unit}`;
}

// ------------------------------------------------------------------ arranque
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  syncCarousel();      // la página se deduce de clientWidth, que acaba de cambiar
}
addEventListener("resize", resize);
resize();
{ // preferencia guardada; si no la hay, la del sistema
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* modo privado */ }
  applyTheme(saved ?? (matchMedia("(prefers-color-scheme: light)").matches
    ? "light" : "dark"));
}
recolor();
requestAnimationFrame(animate);

// hook de depuración (consola / pruebas automatizadas)
window.__ps = { state, units, globe, camera, select };
