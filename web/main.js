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
const BASE_ALT = 1.2;                // separación del fondo de la pila
const STACK_T = 7;                   // grosor total de la pila (todas las losas)
const SEP_MIN = 0.10;                // separación con el slider al mínimo (× paso)
const SEP_MAX = 1.50;                // separación con el slider al máximo (× paso)
const THICK_MIN = 0.15;              // grosor de losa sin seleccionar (fracción del paso)
const CURV = { region: 2.0, country: 3.5 }; // resolución de curvatura (°)
const VIEW = { lat: -14, lon: 187, dist: 305, tiltLat: -46 }; // cámara inicial

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Rampa divergente estilo climate stripes (RdBu invertida), 9 paradas.
const RAMP = ["#08306b", "#2166ac", "#4393c3", "#92c5de", "#f7f7f7",
              "#f4a582", "#d6604d", "#b2182b", "#67001f"];

// ------------------------------------------------------------------ estado
const state = {
  level: "region",          // "region" | "country"
  regionId: null,           // subregión activa en nivel país
  indicator: null,          // id del indicador
  selected: null,           // unit seleccionada (objeto unit)
  separation: 0,            // 0 volumen … 1 estratos
  thickness: 1,             // grosor de losa como fracción del paso (1 = se tocan)
  domain: {},               // por indicador: {min, max, abs}
};
const units = { region: [], country: [] };   // {id, name, region?, group, slabs[]}
const unitById = {};

// ------------------------------------------------------------------ escena
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#060d18");

const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
placeCamera();

// Sin OrbitControls: arrastrar gira el PROPIO globo (libre, ambos ejes);
// el botón «alinear norte» endereza el eje N-S; el botón central / dos
// dedos lo desplazan y la rueda hace zoom moviendo la cámara.
const ZOOM_MIN = 150, ZOOM_MAX = 650, ROT_SPEED = 0.005;

scene.add(new THREE.AmbientLight(0xbfd4e6, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(-320, 260, 180);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6ba0d6, 0.35);
fill.position.set(280, -140, -220);
scene.add(fill);

// grupo del globo: todo lo geográfico cuelga de aquí para poder
// desplazarlo/inclinarlo con los sliders de vista
const globe = new THREE.Group();
scene.add(globe);

// esfera oceánica opaca (evita ver a través del globo)
globe.add(new THREE.Mesh(
  new THREE.SphereGeometry(R, 96, 64),
  new THREE.MeshStandardMaterial({ color: "#0e2036", roughness: 0.92, metalness: 0.05 })
));
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
  const mat = new THREE.LineBasicMaterial({ color: 0x7fb4e0, transparent: true, opacity: 0.08 });
  const mk = pts => g.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts), mat));
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
  // dominio simétrico alrededor de 0 → t ∈ [0,1]
  const t = Math.min(1, Math.max(0, (v / dom.abs + 1) / 2));
  const i = Math.min(RAMP.length - 2, Math.floor(t * (RAMP.length - 1)));
  const f = t * (RAMP.length - 1) - i;
  return new THREE.Color(RAMP[i]).lerp(new THREE.Color(RAMP[i + 1]), f);
}

// ------------------------------------------------------------------ carga
const [regions, countries, land, dataset] = await Promise.all(
  ["regions", "countries", "land", "dataset"]
    .map(f => fetch(`data/${f}.json`).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar data/${f}.json`);
      return r.json();
    }))
).catch(err => { alert(err.message + "\n¿Ejecutaste los scripts de data_prep/?"); throw err; });

const YEARS = dataset.meta.years;
const INDICATORS = dataset.meta.indicators;
state.indicator = INDICATORS[0].id;

// dominios simétricos por indicador (todas las unidades, todos los años)
for (const ind of INDICATORS) {
  let abs = 0;
  for (const series of Object.values(dataset.values)) {
    for (const v of series[ind.id]) abs = Math.max(abs, Math.abs(v));
  }
  state.domain[ind.id] = { abs: abs || 1 };
}

// siluetas de tierra (orientación)
{
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a5a78, side: THREE.DoubleSide });
  for (const f of land.features) {
    for (const poly of asPolys(f.geometry)) {
      const geo = new ConicPolygonGeometry(poly, R, R + 0.35, false, true, false, 1.5);
      globe.add(new THREE.Mesh(geo, mat));
    }
  }
}

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
    const unit = { id, name, region, level, group, slabs: [], hover: false };

    YEARS.forEach((year, i) => {
      const r0 = R + BASE_ALT + i * slabT;
      const slabMeshes = [];
      for (const poly of asPolys(f.geometry)) {
        // sin seleccionar, las losas se dibujan al grosor mínimo
        const geo = new ConicPolygonGeometry(
          poly, r0, r0 + slabT * THICK_MIN, true, true, true, CURV[level]);
        const mat = new THREE.MeshStandardMaterial({
          roughness: 0.55, metalness: 0.0,
          emissive: 0x000000, emissiveIntensity: 0.55,
          // DoubleSide: las paredes laterales de la librería quedan con la
          // normal hacia dentro según el sentido del anillo; con culling se
          // "pierde" la cara que miras de frente
          side: THREE.DoubleSide,
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

// -------- grosor de estratos: reconstruye la geometría de las losas.
// El slider solo aplica a la unidad SELECCIONADA; el resto se dibuja
// siempre al grosor mínimo (THICK_MIN).
function rebuildUnit(u) {
  const t = slabT * (state.selected === u ? state.thickness : THICK_MIN);
  for (const s of u.slabs) {
    for (const m of s.meshes) {
      m.geometry.dispose();
      m.geometry = new ConicPolygonGeometry(
        m.userData.poly, s.r0, s.r0 + t, true, true, true, CURV[u.level]);
    }
  }
}

let thicknessQueued = false;
function applyThickness() {         // 1 rebuild por frame como mucho
  if (thicknessQueued || !state.selected) return;
  thicknessQueued = true;
  requestAnimationFrame(() => {
    thicknessQueued = false;
    if (state.selected) rebuildUnit(state.selected);
  });
}

function recolor() {
  const dom = state.domain[state.indicator];
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      const series = dataset.values[u.id][state.indicator];
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

  const sepGap = lerp(SEP_MIN, SEP_MAX, state.separation) * slabT;
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.group.visible) continue;
      const isSel = state.selected === u;
      const gap = isSel ? sepGap : 0;
      const emissive = isSel ? 0x223b46 : (u.hover ? 0x14343c : 0x000000);
      for (const s of u.slabs) {
        const target = (s.r0 + s.yearIndex * gap) / s.r0;
        for (const m of s.meshes) {
          const cur = m.scale.x;
          const next = REDUCED ? target : lerp(cur, target, 0.14);
          m.scale.setScalar(Math.abs(next - target) < 1e-4 ? target : next);
          m.material.emissive.setHex(emissive);
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
  // rotación mínima que lleva el eje Y local del globo al Y del mundo
  const yWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(globe.quaternion);
  const dq = new THREE.Quaternion()
    .setFromUnitVectors(yWorld, new THREE.Vector3(0, 1, 0));
  northTarget = dq.multiply(globe.quaternion);
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
  const u = unitAt(e.clientX, e.clientY);
  for (const lv of ["region", "country"]) for (const x of units[lv]) x.hover = false;
  if (u) u.hover = true;
  canvas.style.cursor = u ? "pointer" : "grab";
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
  const series = dataset.values[u.id][state.indicator];
  const dom = state.domain[state.indicator];

  document.getElementById("p-region").textContent =
    u.level === "region" ? "Subregión" : u.region;
  document.getElementById("p-name").textContent = u.name;

  const stripes = document.getElementById("p-stripes");
  stripes.innerHTML = "";
  series.forEach(v => {
    const d = document.createElement("div");
    d.style.background = "#" + colorFor(v, dom).getHexString();
    d.title = v;
    stripes.appendChild(d);
  });

  const ro = document.getElementById("p-readout");
  ro.innerHTML = "";
  YEARS.forEach((y, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="y">${y}</span><span>${series[i]} ${ind.unit}</span>`;
    ro.appendChild(row);
  });

  document.getElementById("p-note").textContent =
    u.level === "region"
      ? `Agregación: ${dataset.meta.aggregation}. Datos sintéticos de demostración.`
      : "Datos sintéticos de demostración sobre pseudo-ZEE.";
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
const seg = document.getElementById("seg-ind");
INDICATORS.forEach(ind => {
  const b = document.createElement("button");
  b.textContent = ind.name;
  b.setAttribute("aria-pressed", ind.id === state.indicator);
  b.addEventListener("click", () => {
    state.indicator = ind.id;
    seg.querySelectorAll("button").forEach(x =>
      x.setAttribute("aria-pressed", x === b));
    recolor();
  });
  seg.appendChild(b);
});

const sep = document.getElementById("sep");
const sepVal = document.getElementById("sep-val");
sep.addEventListener("input", () => {
  state.separation = +sep.value;
  sepVal.textContent =
    Math.round(lerp(SEP_MIN, SEP_MAX, state.separation) * 100) + " %";
});

const thick = document.getElementById("thick");
const thickVal = document.getElementById("thick-val");
thick.addEventListener("input", () => {
  state.thickness = lerp(THICK_MIN, 1, +thick.value);
  thickVal.textContent = +thick.value > 0.98 ? "se tocan"
                       : Math.round(state.thickness * 100) + " %";
  applyThickness();
});


function paintLegend() {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const dom = state.domain[state.indicator];
  document.getElementById("ramp").style.background =
    `linear-gradient(90deg, ${RAMP.join(",")})`;
  document.getElementById("ramp-min").textContent = `−${dom.abs} ${ind.unit}`;
  document.getElementById("ramp-max").textContent = `+${dom.abs} ${ind.unit}`;
}

// ------------------------------------------------------------------ arranque
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();
recolor();
requestAnimationFrame(animate);

// hook de depuración (consola / pruebas automatizadas)
window.__ps = { state, units, globe, camera };
