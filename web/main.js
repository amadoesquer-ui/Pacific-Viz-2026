/* Pacific Strata — prototipo
 * Globo inclinado + pseudo-ZEE extruidas como pilas de estratos anuales.
 * Grosor uniforme por año, color por valor (inspiración: climate stripes).
 */
import * as THREE from "three";
import ConicPolygonGeometry from "three-conic-polygon-geometry";

// ------------------------------------------------------------------ config
const R = 100;                               // radio del globo
const BASE_ALT = 1.2;                        // separación del fondo de la pila
const STACK_T = 7;                           // grosor total de la pila
const SEP_MIN = 0.10;                        // separación con slider al mínimo
const SEP_MAX = 1.50;                        // separación con slider al máximo
const THICK_MIN = 0.15;                      // grosor sin seleccionar
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
  selected: null,           // unit seleccionada
  hoveredYearIndex: null,   // índice del año destacado con el cursor
  separation: 0,            // 0 volumen … 1 estratos
  thickness: 1,             // grosor de losa como fracción del paso
  opacity: 1.0,             // transparencia global de las losas
  domain: {},               // por indicador: {min, max, abs}
};
const units = { region: [], country: [] };
const unitById = {};

// ------------------------------------------------------------------ escena
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color("#060d18");

const camera = new THREE.PerspectiveCamera(38, 1, 1, 3000);
placeCamera();

const ZOOM_MIN = 150, ZOOM_MAX = 650, ROT_SPEED = 0.005;

scene.add(new THREE.AmbientLight(0xbfd4e6, 0.85));
const sun = new THREE.DirectionalLight(0xffffff, 1.35);
sun.position.set(-320, 260, 180);
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6ba0d6, 0.35);
fill.position.set(280, -140, -220);
scene.add(fill);

const globe = new THREE.Group();
scene.add(globe);

const globeMesh = new THREE.Mesh(
  new THREE.SphereGeometry(R, 96, 64),
  new THREE.MeshStandardMaterial({ color: "#0e2036", roughness: 0.92, metalness: 0.05 })
);
globe.add(globeMesh);
globe.add(graticule());

// ------------------------------------------------------------------ utils
function polar2Cartesian(lat, lng, r) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (90 - lng) * Math.PI / 180;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta));
}

function placeCamera() {
  camera.position.copy(polar2Cartesian(VIEW.tiltLat, VIEW.lon, VIEW.dist));
  camera.lookAt(0, 0, 0);
}

function graticule() {
  const g = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0x7fb4e0, transparent: true, opacity: 0.08 });
  const mk = pts => g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
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

function colorFor(v, dom) {
  const t = Math.min(1, Math.max(0, (v / dom.abs + 1) / 2));
  const i = Math.min(RAMP.length - 2, Math.floor(t * (RAMP.length - 1)));
  const f = t * (RAMP.length - 1) - i;
  return new THREE.Color(RAMP[i]).lerp(new THREE.Color(RAMP[i + 1]), f);
}

function getDict() {
  const lang = window.currentLang || "es";
  return (window.i18nDict && window.i18nDict[lang]) ? window.i18nDict[lang] : {};
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

for (const ind of INDICATORS) {
  let abs = 0;
  for (const series of Object.values(dataset.values)) {
    if (series[ind.id]) {
      for (const v of series[ind.id]) abs = Math.max(abs, Math.abs(v));
    }
  }
  state.domain[ind.id] = { abs: abs || 1 };
}

let landMesh = null;
{
  const mat = new THREE.MeshBasicMaterial({ color: 0x3a5a78, side: THREE.DoubleSide });
  const landGroup = new THREE.Group();
  for (const f of land.features) {
    for (const poly of asPolys(f.geometry)) {
      const geo = new ConicPolygonGeometry(poly, R, R + 0.35, false, true, false, 1.5);
      landGroup.add(new THREE.Mesh(geo, mat));
    }
  }
  globe.add(landGroup);
  landMesh = landGroup;
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
        const geo = new ConicPolygonGeometry(
          poly, r0, r0 + slabT * THICK_MIN, true, true, true, CURV[level]);
        const mat = new THREE.MeshStandardMaterial({
          roughness: 0.55, metalness: 0.0,
          emissive: 0x000000, emissiveIntensity: 0.55,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: state.opacity
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
function applyThickness() {
  if (thicknessQueued || !state.selected) return;
  thicknessQueued = true;
  requestAnimationFrame(() => {
    thicknessQueued = false;
    if (state.selected) rebuildUnit(state.selected);
  });
}

function applyOpacity() {
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      for (const s of u.slabs) {
        for (const m of s.meshes) {
          m.material.opacity = state.opacity;
          m.material.transparent = state.opacity < 0.99;
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
      const rawSeries = dataset.values[u.id] ? dataset.values[u.id][state.indicator] : null;
      if (!rawSeries) continue;

      const series = [];
      let lastValid = 0;
      for (let i = 0; i < rawSeries.length; i++) {
        const val = rawSeries[i];
        if (val !== null && val !== undefined && !isNaN(val) && val !== 0) {
          lastValid = val;
        }
        series.push(lastValid);
      }

      const isSelectedUnit = state.selected === u;
      const noSelectionActive = state.selected === null;

      u.slabs.forEach((s, i) => {
        let slabColor = colorFor(series[i], dom);

        if (!noSelectionActive && !isSelectedUnit) {
          slabColor = slabColor.clone().multiplyScalar(0.35);
        }

        for (const m of s.meshes) {
          if (Array.isArray(m.material)) {
            m.material.forEach(mat => mat.color.copy(slabColor));
          } else {
            m.material.color.copy(slabColor);
          }
        }
      });
    }
  }
  
  paintLegend();
  if (state.selected) fillPanel(state.selected);
}

// Vector reutilizable para cálculos de posición radial
const _dir = new THREE.Vector3();

// ------------------------------------------------------------------ animación de pilas
function animate() {
  requestAnimationFrame(animate);

  if (northTarget) {
    globe.quaternion.slerp(northTarget, 0.12);
    if (globe.quaternion.angleTo(northTarget) < 0.002) {
      globe.quaternion.copy(northTarget);
      northTarget = null;
    }
  }

  const sepGap = lerp(SEP_MIN, SEP_MAX, state.separation) * slabT;
  const GAP_PADDING = slabT * 2.2;

  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.group.visible) continue;
      const isSel = state.selected === u;
      const gap = isSel ? sepGap : 0;
      const hIdx = state.hoveredYearIndex;
      
      for (const s of u.slabs) {
        const isHoveredSlab = isSel && hIdx === s.yearIndex;
        
        let targetRadialOffset = s.yearIndex * gap;
        
        // --- HUECO ARRIBA Y ABAJO SIN MOVER LA LOSA SELECCIONADA ---
        if (isSel && hIdx !== null) {
          if (s.yearIndex > hIdx) {
            targetRadialOffset += GAP_PADDING; // Sube las losas superiores
          } else if (s.yearIndex < hIdx) {
            targetRadialOffset -= GAP_PADDING; // Baja las losas inferiores
          }
          // Para s.yearIndex === hIdx, targetRadialOffset se mantiene en s.yearIndex * gap
        }

        let emissiveColor = 0x000000;
        let emissiveIntensity = 0.55;

        if (isHoveredSlab) {
          emissiveColor = 0xffea70; // Amarillo radiante deslumbrante
          emissiveIntensity = 2.2;
        } else if (u.hover && !isSel) {
          emissiveColor = 0x222222;
        }

        for (const m of s.meshes) {
          // Asegurar que la escala no se deforme
          m.scale.set(1, 1, 1);

          // Obtener la dirección radial (hacia afuera del centro del globo)
          if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
          _dir.copy(m.geometry.boundingSphere.center).normalize();

          // Calcular la posición objetivo sin alterar la forma
          const targetPos = _dir.clone().multiplyScalar(targetRadialOffset);

          // Interpolar suavemente la posición
          if (REDUCED) {
            m.position.copy(targetPos);
          } else {
            m.position.lerp(targetPos, 0.16);
          }

          m.material.emissive.setHex(emissiveColor);
          m.material.emissiveIntensity = emissiveIntensity;
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

const _right = new THREE.Vector3(), _up = new THREE.Vector3();
const _q = new THREE.Quaternion();
const pointers = new Map();
let northTarget = null;

function rotateGlobe(dx, dy) {
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  globe.quaternion.premultiply(_q.setFromAxisAngle(_up, dx * ROT_SPEED));
  globe.quaternion.premultiply(_q.setFromAxisAngle(_right, dy * ROT_SPEED));
}

function panGlobe(dx, dy) {
  const k = 2 * camera.position.length() * Math.tan(camera.fov * Math.PI / 360)
          / canvas.clientHeight;
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  globe.position.addScaledVector(_right, dx * k).addScaledVector(_up, -dy * k);
}

document.getElementById("north-btn").addEventListener("click", () => {
  const yWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(globe.quaternion);
  const dq = new THREE.Quaternion()
    .setFromUnitVectors(yWorld, new THREE.Vector3(0, 1, 0));
  northTarget = dq.multiply(globe.quaternion);
  if (REDUCED) { globe.quaternion.copy(northTarget); northTarget = null; }
});

canvas.addEventListener("pointerdown", e => {
  if (e.button === 1) e.preventDefault();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
  if (e.button === 0 && pointers.size === 1) downAt = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup", e => {
  pointers.delete(e.pointerId);
  if (e.button !== 0 || !downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;
  select(unitAt(e.clientX, e.clientY));
});
canvas.addEventListener("pointercancel", e => pointers.delete(e.pointerId));
canvas.addEventListener("pointermove", e => {
  const p = pointers.get(e.pointerId);
  if (p) {
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pointers.size >= 2) panGlobe(dx / 2, dy / 2);
    else if (p.button === 1) panGlobe(dx, dy);
    else { rotateGlobe(dx, dy); northTarget = null; }
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

// ------------------------------------------------------------------ selección / paneles
const panel = document.getElementById("panel");
const drillBtn = document.getElementById("p-drill");
const crumb = document.getElementById("crumb");

function select(u) {
  const prev = state.selected;
  state.selected = u;
  state.hoveredYearIndex = null;
  if (prev && prev !== u) rebuildUnit(prev);
  if (u && u !== prev) rebuildUnit(u);
  recolor();
  panel.classList.toggle("open", !!u);
  if (u) fillPanel(u);
}

function setHoveredYear(index) {
  state.hoveredYearIndex = index;
  const stripesContainer = document.getElementById("p-stripes");
  if (!stripesContainer) return;

  const stripes = stripesContainer.querySelectorAll("div");
  const rows = document.querySelectorAll("#p-readout .row");
  const hasActive = index !== null;

  stripesContainer.classList.toggle("has-active", hasActive);
  stripes.forEach((stripe, i) => stripe.classList.toggle("active", i === index));
  rows.forEach((row, i) => row.classList.toggle("active", i === index));
}

function updateDrillBtnUI() {
  if (!drillBtn) return;
  const dict = getDict();
  if (state.level === "country") {
    drillBtn.hidden = false;
    drillBtn.dataset.state = "back";
    drillBtn.textContent = dict.btn_drill_back || "← Volver a subregiones";
  } else {
    drillBtn.dataset.state = "drill";
    drillBtn.textContent = dict.btn_drill || "Ver países de la subregión →";
    drillBtn.hidden = !state.selected || state.selected.level !== "region";
  }
}

function fillPanel(u) {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const series = dataset.values[u.id] ? dataset.values[u.id][state.indicator] : [];
  const dom = state.domain[state.indicator];
  const dict = getDict();

  const regionEl = document.getElementById("p-region");
  if (regionEl) {
    regionEl.dataset.type = u.level;
    regionEl.textContent = u.level === "region" 
      ? (dict.region_label || "Subregión") 
      : (dict.country_label || "País / Territorio");
  }

  document.getElementById("p-name").textContent = u.name;

  const stripes = document.getElementById("p-stripes");
  stripes.innerHTML = "";
  series.forEach((v, i) => {
    const d = document.createElement("div");
    d.style.background = "#" + colorFor(v, dom).getHexString();
    d.title = `${YEARS[i]}: ${v} ${ind.unit}`;
    d.addEventListener("mouseenter", () => setHoveredYear(i));
    d.addEventListener("mouseleave", () => setHoveredYear(null));
    stripes.appendChild(d);
  });

  const ro = document.getElementById("p-readout");
  ro.innerHTML = "";
  YEARS.forEach((y, i) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="y">${y}</span><span>${series[i]} ${ind.unit}</span>`;
    row.addEventListener("mouseenter", () => setHoveredYear(i));
    row.addEventListener("mouseleave", () => setHoveredYear(null));
    ro.appendChild(row);
  });

  document.getElementById("p-note").textContent =
    u.level === "region"
      ? `Agregación: ${dataset.meta.aggregation}. Datos climáticos unificados.`
      : "Datos climáticos sobre pseudo-ZEE.";
      
  updateDrillBtnUI();
}

drillBtn.addEventListener("click", () => {
  if (state.level === "country") {
    exitRegion();
  } else if (state.selected && state.selected.level === "region") {
    enterRegion(state.selected.id);
  }
});

function updateBreadcrumb() {
  const dict = getDict();
  if (state.level === "country" && state.regionId) {
    crumb.dataset.view = "countries";
    const name = unitById[state.regionId] ? unitById[state.regionId].name : "";
    crumb.innerHTML = "";
    const back = document.createElement("button");
    back.textContent = "← Pacífico";
    back.addEventListener("click", exitRegion);
    const suffix = dict.crumb_countries ? dict.crumb_countries.replace("Pacífico · ", "") : "países y territorios";
    crumb.append(back, ` · ${name} · ${suffix}`);
  } else {
    crumb.dataset.view = "regions";
    crumb.textContent = dict.crumb || "Pacífico · subregiones";
  }
}

function enterRegion(regionId) {
  state.level = "country";
  state.regionId = regionId;
  select(null);
  for (const u of units.region) u.group.visible = false;
  for (const u of units.country) u.group.visible = u.region === regionId;
  updateBreadcrumb();
  updateDrillBtnUI();
}

function exitRegion() {
  state.level = "region";
  state.regionId = null;
  select(null);
  for (const u of units.country) u.group.visible = false;
  for (const u of units.region) u.group.visible = true;
  updateBreadcrumb();
  updateDrillBtnUI();
}

// ------------------------------------------------------------------ controles e indicadores
const seg = document.getElementById("seg-ind");
seg.innerHTML = "";

function updateIndicatorButtonsText() {
  const dict = getDict();
  const allIndButtons = document.querySelectorAll("button[data-ind]");
  
  allIndButtons.forEach(btn => {
    const key = btn.dataset.ind;
    if (dict && dict[key]) {
      btn.textContent = dict[key];
    } else {
      const ind = INDICATORS.find(i => i.id === key);
      if (ind) btn.textContent = ind.name;
    }
  });
}

INDICATORS.forEach(ind => {
  const b = document.createElement("button");
  b.dataset.ind = ind.id;
  b.dataset.key = ind.id;
  b.setAttribute("aria-pressed", ind.id === state.indicator ? "true" : "false");
  seg.appendChild(b);
});

if (typeof window.distributeIndicators === "function") {
  window.distributeIndicators();
}

updateIndicatorButtonsText();

const carouselContainer = document.getElementById("carousel-container");
if (carouselContainer) {
  carouselContainer.addEventListener("click", e => {
    const btn = e.target.closest("button[data-ind]");
    if (!btn) return;

    const indId = btn.dataset.ind;
    if (!indId || state.indicator === indId) return;

    state.indicator = indId;

    carouselContainer.querySelectorAll("button[data-ind]").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.ind === indId ? "true" : "false");
    });

    recolor();
  });
}

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
  const dict = getDict();
  state.thickness = lerp(THICK_MIN, 1, +thick.value);
  thickVal.textContent = +thick.value > 0.98 ? (dict.val_touching || "se tocan")
                                          : Math.round(state.thickness * 100) + " %";
  applyThickness();
});

const opacityInput = document.getElementById("opacity");
const opacityVal = document.getElementById("opacity-val");
if (opacityInput) {
  opacityInput.addEventListener("input", () => {
    const dict = getDict();
    state.opacity = +opacityInput.value;
    opacityVal.textContent = state.opacity < 0.2 ? (dict.val_opaque || "opacas") : Math.round(state.opacity * 100) + " %";
    applyOpacity();
  });
}

function paintLegend() {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const dom = state.domain[state.indicator];
  document.getElementById("ramp").style.background =
    `linear-gradient(90deg, ${RAMP.join(",")})`;
  document.getElementById("ramp-min").textContent = `−${dom.abs} ${ind.unit}`;
  document.getElementById("ramp-max").textContent = `+${dom.abs} ${ind.unit}`;
}

// ------------------------------------------------------------------ tema y arranque
function update3DTheme() {
  const styles = getComputedStyle(document.documentElement);
  const spaceColor = styles.getPropertyValue('--space').trim();
  const oceanColor = styles.getPropertyValue('--ocean').trim();

  if (scene) scene.background = new THREE.Color(spaceColor);
  if (globeMesh && globeMesh.material) globeMesh.material.color.set(oceanColor);
}

window.addEventListener("themechanged", update3DTheme);

window.addEventListener("langchanged", (e) => {
  updateBreadcrumb();
  updateDrillBtnUI();
  updateIndicatorButtonsText();
  paintLegend();
  if (state.selected) fillPanel(state.selected);
});

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);

resize();
update3DTheme();
recolor();
requestAnimationFrame(animate);

window.__ps = { state, units, globe, camera };