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
// `lang` es un binding vivo del módulo: setLang lo reasigna y aquí se ve
import { t, setLang, initialLang, LANGS, lang } from "./i18n.js";

// ------------------------------------------------------------------ config
const R = 100;                       // radio del globo
const BASE_ALT = 0;                // separación del fondo de la pila
const STACK_T = 2;                   // grosor total de la pila (todas las losas)
const THICK_MIN = 1;                 // grosor de losa sin seleccionar (fracción del paso)
// Altura de la pila SELECCIONADA, como múltiplo de la de las no seleccionadas:
// a 1× se ve exactamente igual que las demás; a 10×, diez veces más alta.
const H_MIN = 1, H_MAX = 10, H_DEF = 5;
// Hueco máximo entre losas, como fracción del paso. No llega a 1 porque ahí la
// losa tendría grosor cero; a 0.85 queda un estrato del 15 % del paso.
const SEP_MAX_FRAC = 0.85;
const CURV = { region: 2.0, country: 3.5 }; // resolución de curvatura (°)
const VIEW = { lat: -14, lon: 187, dist: 305, tiltLat: -46 }; // cámara inicial

// Con «reducir movimiento» activado NO se suprime la animación de la pila: se
// acorta. Aquí la extrusión no es adorno, es la codificación del dato —lo que
// dice cuánto mide cada año—, y quitarla dejaba la aplicación pareciendo rota.
// WCAG 2.3.3 exime justamente al movimiento esencial. Android enciende esa
// preferencia solo con el ahorro de batería, así que muchos la tienen puesta
// sin saberlo. Lo que sí se respeta es la intención: nada de recorridos largos.
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const LERP_PILA = REDUCED ? 0.40 : 0.14;   // fracción por cuadro
const DUR_TRAZO = REDUCED ? 220 : 700;     // ms del trazado de la gráfica

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
    bg: 0x060d18, ocean: 0x0e2036, land: 0x3a5a78, noData: 0x2b3a4a,
    outline: 0xffffff, outlineOpacity: 0.55,
    grid: 0x7fb4e0, gridOpacity: 0.08,
    ambient: 0xbfd4e6, ambientI: 0.85, sunI: 1.35, fillI: 0.35,
  },
  light: {
    bg: 0xeaf1f7, ocean: 0xc3d8e8, land: 0x87a2ba, noData: 0xb9c4cf,
    // en claro, el blanco puro sobre el océano claro no se ve: se sube la
    // opacidad y se apoya en el contraste contra el relleno del polígono
    outline: 0xffffff, outlineOpacity: 0.9,
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
  hoveredYear: null,        // índice del año bajo el cursor, en la gráfica
  pinnedYear: null,         // año fijado con un clic: sobrevive al puntero
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
const ZOOM_MIN = 150, ZOOM_MAX = 650;

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

// Un año sin dato NO es un cero: se pinta con un gris neutro que no pertenece
// a ninguna de las dos rampas, para que no se confunda con un valor bajo.
function colorFor(v, dom) {
  if (v === null || v === undefined) return new THREE.Color(theme.noData);
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
      if (v === null) continue;
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

// -------- punto de anclaje de la etiqueta: el centroide de la parte MAYOR del
// polígono, no el del conjunto. Estas ZEE llegan partidas por el antimeridiano
// y repartidas en archipiélagos, y el centroide global de Kiribati o de la
// Polinesia Francesa cae en mar de nadie, a veces dentro de la ZEE vecina.
function anchorOf(feature) {
  let mejor = null, mejorArea = -1;
  for (const poly of asPolys(feature.geometry)) {
    const ring = poly[0];
    // shoelace: área con signo y centroide del anillo exterior
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[(i + 1) % ring.length];
      const f = x0 * y1 - x1 * y0;
      a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a /= 2;
    const area = Math.abs(a);
    if (area > mejorArea) {
      mejorArea = area;
      mejor = area < 1e-9
        ? [ring[0][1], ring[0][0]]                    // anillo degenerado
        : [cy / (6 * a), cx / (6 * a)];               // [lat, lon]
    }
  }
  return { ll: mejor, area: mejorArea };
}

// -------- contorno de la unidad, pegado al globo. Sin él las 22 ZEE vecinas
// se leen como una sola mancha: comparten frontera exacta —son particiones del
// mismo mar— y en la vista plana no hay sombra ni hueco que las separe.
//
// Los anillos vienen en lon/lat con tramos largos y rectos (las ZEE están
// simplificadas), y una recta en lon/lat no es una recta sobre la esfera: se
// densifican para que el contorno se pegue a la superficie en vez de cortar
// por dentro.
const OUTLINE_R = R + 0.5;         // justo por encima de la textura del mapa
const OUTLINE_STEP = 1.5;          // grados por tramo al densificar

function outlineOf(feature, mat) {
  const g = new THREE.Group();
  for (const poly of asPolys(feature.geometry)) {
    for (const ring of poly) {
      const pts = [];
      for (let i = 0; i < ring.length; i++) {
        const [lon0, lat0] = ring[i];
        const [lon1, lat1] = ring[(i + 1) % ring.length];
        const n = Math.max(1, Math.ceil(
          Math.hypot(lon1 - lon0, lat1 - lat0) / OUTLINE_STEP));
        for (let k = 0; k < n; k++) {
          const f = k / n;
          pts.push(polar2Cartesian(lat0 + (lat1 - lat0) * f,
                                   lon0 + (lon1 - lon0) * f, OUTLINE_R));
        }
      }
      pts.push(pts[0]);
      g.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  return g;
}

const outlineMat = new THREE.LineBasicMaterial(
  { color: theme.outline, transparent: true, opacity: theme.outlineOpacity });

// ------------------------------------------------------------------ pilas
function buildUnits(fc, level) {
  const slabT = STACK_T / YEARS.length;
  for (const f of fc.features) {
    const { id, name, region } = f.properties;
    // los topónimos viajan en el GeoJSON, no en i18n.js: son datos, y tenerlos
    // en los dos sitios obligaría a mantener dos listas de los mismos lugares
    const nombres = { es: name, en: f.properties.name_en ?? name,
                      fr: f.properties.name_fr ?? name };
    const group = new THREE.Group();
    group.visible = level === "region";
    // flatIndex: qué estrato representa a la unidad en la vista plana. Lo
    // recalcula recolor() por indicador; el último año sirve de arranque para
    // las unidades que .STAT no cubre y que recolor() se salta.
    const unit = { id, name, nombres, region, level, group, slabs: [],
                   flatIndex: YEARS.length - 1 };

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

    group.add(outlineOf(f, outlineMat));
    const anc = anchorOf(f);
    unit.anchor = anc.ll;
    unit.anchorArea = anc.area;      // prioridad al resolver solapes

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

// Con una unidad seleccionada, el resto se atenúa: con 22 pilas encima de las
// ZEE oficiales, la seleccionada se perdía entre las vecinas. Es un cambio de
// luminosidad, no de tono, así que la posición en la rampa se sigue leyendo.
const DIM = 0.35;

function recolor() {
  const dom = state.domain[state.indicator];
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      const series = dataset.values[u.id]?.[state.indicator];
      if (!series) continue;           // .STAT no cubre todos los indicadores
      // El estrato que representa a la unidad en la vista plana es el último
      // AÑO CON DATO, no el último año: 2026 casi no tiene cobertura y el mapa
      // habría salido gris entero.
      u.flatIndex = series.reduce((best, v, i) => v === null ? best : i, 0);
      const dim = state.selected && state.selected !== u;
      u.slabs.forEach((s, i) => {
        // Un año sin dato no se dibuja, pero su sitio en la pila se respeta:
        // las alturas salen del índice, así que queda el hueco. Antes se
        // pintaba de gris y, como los huecos se concentran en los años
        // recientes, al seleccionar una unidad su cara superior pasaba del
        // color del dato a un gris: hacías clic en algo rojo y se volvía gris.
        // Ocultándolos, la losa de arriba vuelve a ser la que se veía plana.
        s.hasData = series[i] !== null && series[i] !== undefined;
        const c = colorFor(series[i], dom);
        if (dim) c.multiplyScalar(DIM);
        for (const m of s.meshes) m.material.color.copy(c);
      });
    }
  }
  paintLegend();
  drawChart();
}

// ------------------------------------------------------------------ animación de pilas
// objetivo de escala por losa: (r0 + i*gap) / r0
// La losa base (i = 0) queda siempre pegada al globo: la pila no se levanta,
// solo se abren los estratos superiores. La separación del slider aplica
// SOLO a la seleccionada; el resto queda con separación 0 (cada losa en su
// punto de extrusión).
// -------- año bajo el cursor. Al pasar por una franja o una fila del panel se
// abre un hueco alrededor de esa losa en la pila seleccionada, para poder
// aislarla visualmente sin perder el contexto de la serie.
//
// El hueco se reparte en dos: todo lo que está de la losa hacia arriba sube
// PAD (abre por debajo) y todo lo estrictamente superior sube otro PAD (abre
// por encima). Así la losa destacada queda flotando entre dos huecos iguales
// sin que ninguna baje —que la hundiría dentro del globo— y sin romper el
// anclaje de la base. El caso h = 0 se trata aparte por eso mismo: si subiera
// «de la base hacia arriba», la base dejaría de estar pegada al globo.
const HOVER_PAD = 1.6;                 // en unidades de radio, ~1 losa base
// Destello: la losa se enciende en blanco y se apaga sola hasta su color real.
// Es un pulso y no un resaltado permanente porque el color ES el dato; el
// amarillo fijo que había antes lo tapaba justo mientras lo estabas mirando.
const FLASH_MS = 900;
const _flashColor = new THREE.Color();

function padFor(i, h) {
  if (h === null) return 0;
  if (h === 0) return i > 0 ? HOVER_PAD : 0;
  return (i >= h ? HOVER_PAD : 0) + (i > h ? HOVER_PAD : 0);
}

function animate(now) {
  requestAnimationFrame(animate);

  if (northTarget) {                  // animación del botón «alinear norte»
    globe.quaternion.slerp(northTarget, 0.12);
    if (globe.quaternion.angleTo(northTarget) < 0.002) {
      globe.quaternion.copy(northTarget);
      northTarget = null;
    }
  }

  // Sin resaltado por color de la pila entera: la seleccionada se distingue por
  // su altura, y teñirla falseaba la lectura de la rampa (el emisivo desaturaba
  // el color del dato, que es justo lo que hay que comparar contra la leyenda).
  // El único emisivo es el del año bajo el cursor, y es transitorio.
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.group.visible) continue;
      const gap = gapOf(u);
      const isSel = state.selected === u;
      const h = isSel ? activeYear() : null;
      for (const s of u.slabs) {
        const i = s.yearIndex;
        // Sin seleccionar, la unidad se lee como un mapa plano: un solo
        // estrato —el más reciente CON dato— a ras del globo. La pila entera
        // aparece al seleccionar. Antes se dibujaban las 24 losas siempre, y
        // 22 ZEE vecinas apiladas eran una única masa.
        //
        // Las losas ocultas SIGUEN animándose hacia la posición plana en vez
        // de congelarse: si se les salta la interpolación se quedan en escala
        // 1, que es justo su posición ya apilada, y al seleccionar aparecían
        // colocadas de golpe, sin crecer. Manteniéndolas plegadas en la base,
        // la selección las hace subir desde el mapa.
        const plano = R / s.r0;              // a ras: el escalado la baja
        const target = isSel
          ? (s.r0 + i * gap + padFor(i, h)) / s.r0
          : plano;
        const lit = h === i;
        let escala = 0;
        for (const m of s.meshes) {
          const cur = m.scale.x;
          const next = lerp(cur, target, LERP_PILA);
          escala = Math.abs(next - target) < 1e-4 ? target : next;
          m.scale.setScalar(escala);
          // easeOut invertido: arranca fuerte y se apaga suave
          const k = lit ? 1 - Math.min(1, (now - flashT0) / FLASH_MS) : 0;
          m.material.emissive.copy(_flashColor.setScalar(k * k * 0.9));
        }
        // se oculta al terminar de plegarse, no al deseleccionar: si no, la
        // pila desaparecería de golpe en vez de bajar
        const visible = s.hasData !== false &&
                        (isSel || i === u.flatIndex ||
                         Math.abs(escala - plano) > 1e-4);
        for (const m of s.meshes) m.visible = visible;
      }
    }
  }
  placeLabels();
  renderer.render(scene, camera);
}

// -------- etiquetas: se proyecta el ancla de cada unidad a coordenadas de
// pantalla en cada cuadro. Se ocultan las de la cara oculta del globo —el
// producto escalar con la dirección a la cámara da la vuelta— porque si no
// aparecerían los nombres del otro lado flotando sobre el hemisferio visible.
const labelBox = document.getElementById("labels");
const _lp = new THREE.Vector3();

function buildLabels() {
  labelBox.innerHTML = "";
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.anchor) continue;
      const el = document.createElement("div");
      el.textContent = nameOf(u);
      labelBox.appendChild(el);
      u.label = el;
      // el ancho se mide una vez y se guarda: consultarlo en cada cuadro
      // forzaría un recálculo de estilo por etiqueta, 60 veces por segundo
      u.labelW = el.offsetWidth;
    }
  }
}

const LABEL_H = 15;             // alto de la caja, en píxeles

// Al cambiar de idioma no basta con reescribir el texto: el ancho guardado
// serviría para el idioma anterior y la supresión de solapes fallaría.
function relabel() {
  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.label) continue;
      u.label.textContent = nameOf(u);
      u.labelW = u.label.offsetWidth;
    }
  }
}

function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const candidatas = [];

  for (const level of ["region", "country"]) {
    for (const u of units[level]) {
      if (!u.label) continue;
      if (!u.group.visible) { u.label.style.display = "none"; continue; }

      const [lat, lon] = u.anchor;
      _lp.copy(polar2Cartesian(lat, lon, R)).applyMatrix4(globe.matrixWorld);
      // de espaldas: el ancla mira al lado contrario de la cámara
      const haciaCamara = _lp.clone().sub(globe.position).normalize()
        .dot(camera.position.clone().sub(_lp).normalize());
      _lp.project(camera);

      if (haciaCamara <= 0.06 || Math.abs(_lp.x) > 1 || Math.abs(_lp.y) > 1) {
        u.label.style.display = "none";
        continue;
      }
      candidatas.push({
        u, haciaCamara,
        x: (_lp.x * 0.5 + 0.5) * w,
        y: (-_lp.y * 0.5 + 0.5) * h,
      });
    }
  }

  // Se colocan de mayor a menor superficie y se descarta la que choque con una
  // ya puesta. Sin esto, «Papúa Nueva Guinea» e «Islas Salomón» se pisaban y no
  // se leía ninguna de las dos. El orden por área es estable al girar el globo,
  // así que una etiqueta no parpadea por cambios de prioridad.
  candidatas.sort((a, b) => b.u.anchorArea - a.u.anchorArea);
  const puestas = [];
  for (const c of candidatas) {
    const mitad = c.u.labelW / 2;
    const caja = { x0: c.x - mitad, x1: c.x + mitad,
                   y0: c.y - LABEL_H / 2, y1: c.y + LABEL_H / 2 };
    const choca = puestas.some(q =>
      caja.x0 < q.x1 && caja.x1 > q.x0 && caja.y0 < q.y1 && caja.y1 > q.y0);
    if (choca) { c.u.label.style.display = "none"; continue; }
    puestas.push(caja);
    c.u.label.style.display = "block";
    c.u.label.style.left = `${c.x}px`;
    c.u.label.style.top = `${c.y}px`;
    // se apagan al acercarse al borde, donde el globo se ve de canto
    c.u.label.style.opacity = Math.min(1, (c.haciaCamara - 0.06) * 6).toFixed(2);
  }
}

// ------------------------------------------------------------------ picking
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downAt = null;

function pickables() {
  const list = [];
  for (const u of units[state.level === "region" ? "region" : "country"]) {
    // solo las losas visibles: el contorno es un Group de líneas sin userData,
    // y por el hueco de un año sin dato no debería poder seleccionarse nada
    if (u.group.visible)
      for (const s of u.slabs)
        for (const m of s.meshes) if (m.visible) list.push(m);
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

// Radio del globo tal como se ve, en píxeles. Un objeto de tamaño R a la
// distancia d ocupa R/d radianes, y media pantalla cubre tan(fov/2)·d unidades
// de mundo repartidas en la mitad de la altura del lienzo.
function radioEnPixeles() {
  const d = camera.position.length();
  const pxPorUnidad = canvas.clientHeight /
    (2 * Math.tan(camera.fov * Math.PI / 360) * d);
  return R * pxPorUnidad;
}

// El giro se mide contra ese radio, no con una constante de radianes por
// píxel. Antes eran 0,005 rad/px fijos: más del doble de lo que corresponde,
// así que el globo se adelantaba al dedo, y además giraba igual de rápido
// estuviera lejos o acercado. Ahora arrastrar un radio gira un radián, de modo
// que el punto que tocas se queda debajo del dedo y al acercarte el giro se
// vuelve proporcionalmente más fino.
function rotateGlobe(dx, dy) {
  const k = 1 / Math.max(radioEnPixeles(), 1);
  _right.setFromMatrixColumn(camera.matrixWorld, 0);
  _up.setFromMatrixColumn(camera.matrixWorld, 1);
  globe.quaternion.premultiply(_q.setFromAxisAngle(_up, dx * k));
  globe.quaternion.premultiply(_q.setFromAxisAngle(_right, dy * k));
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
});

canvas.addEventListener("pointerdown", e => {
  if (e.button === 1) e.preventDefault();  // sin autoscroll del botón central
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, button: e.button });
  if (e.button === 0 && pointers.size === 1) downAt = [e.clientX, e.clientY];
  canvas.setPointerCapture(e.pointerId);
});
// Doble activación: dos clics o dos toques seguidos sobre la MISMA unidad
// bajan a sus países. Se detecta aquí y no con el evento `dblclick` porque ese
// no llega de forma fiable desde el táctil, y así ratón y dedo comparten
// exactamente el mismo camino y la misma ventana de tiempo.
// 500 ms, la misma ventana que usan Windows y macOS para el doble clic. Con
// 350 se quedaban fuera los dobles toques de dedo, que son más lentos que los
// de ratón.
let DOBLE_MS = 500;
let ultimoClic = { unidad: null, t: 0 };

function activar(u) {
  const ahora = performance.now();
  const doble = u && u === ultimoClic.unidad && ahora - ultimoClic.t < DOBLE_MS;
  ultimoClic = { unidad: u, t: ahora };
  if (doble && u.level === "region") { enterRegion(u.id); return; }
  select(u);
}

canvas.addEventListener("pointerup", e => {
  pointers.delete(e.pointerId);
  pinch = null;                        // se rompió el par de dedos
  if (e.button !== 0 || !downAt) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > 6) return;               // fue arrastre, no clic
  activar(unitAt(e.clientX, e.clientY));
});
canvas.addEventListener("pointercancel", e => {
  pointers.delete(e.pointerId);
  pinch = null;
});

// -------- dos dedos: mover y hacer zoom a la vez.
// El desplazamiento del punto medio mueve el globo y la variación de la
// distancia entre los dedos lo acerca o lo aleja, igual que la rueda. Van
// juntos a propósito: al pellizcar los dedos casi nunca se quedan quietos, y
// separar los dos gestos obligaría a un pulso imposible.
let pinch = null;                      // { dist, cx, cy } del cuadro anterior

const dosDedos = () => {
  const [a, b] = [...pointers.values()];
  return { dist: Math.hypot(b.x - a.x, b.y - a.y),
           cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
};

canvas.addEventListener("pointermove", e => {
  const p = pointers.get(e.pointerId);
  if (!p) {
    // el cursor es toda la respuesta al hover: no se tiñe la geometría
    canvas.style.cursor = unitAt(e.clientX, e.clientY) ? "pointer" : "grab";
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  canvas.style.cursor = "grabbing";

  if (pointers.size === 2) {
    const ahora = dosDedos();
    if (pinch) {
      panGlobe(ahora.cx - pinch.cx, ahora.cy - pinch.cy);
      // el factor es la razón de distancias: separar los dedos acerca
      if (pinch.dist > 8 && ahora.dist > 8) zoomPor(pinch.dist / ahora.dist);
    }
    pinch = ahora;
    return;
  }
  pinch = null;
  if (p.button === 1) panGlobe(dx, dy);               // botón central: mover
  else { rotateGlobe(dx, dy); northTarget = null; }   // giro libre
});
// la rueda y el pellizco acaban en el mismo sitio, para que los topes de zoom
// sean los mismos por los dos caminos
function zoomPor(factor) {
  zoomManual = true;          // a partir de aquí manda el usuario, no el encuadre
  camera.position.setLength(THREE.MathUtils.clamp(
    camera.position.length() * factor, ZOOM_MIN, ZOOM_MAX));
}

canvas.addEventListener("wheel", e => {
  e.preventDefault();
  zoomPor(Math.exp(e.deltaY * 0.001));
}, { passive: false });
addEventListener("keydown", e => { if (e.key === "Escape") select(null); });

// ------------------------------------------------------------------ selección / niveles
const drillBtn = document.getElementById("p-drill");
const crumb = document.getElementById("crumb");

function select(u) {
  const prev = state.selected;
  state.selected = u;
  // el año fijado pertenece a la unidad que estaba abierta: al cambiar de
  // unidad o soltarla, los estratos vuelven a juntarse
  state.hoveredYear = null;
  state.pinnedYear = null;
  flashYear = null;
  // el grosor del slider solo aplica a la selección: reconstruir la que
  // sale (vuelve a THICK_MIN) y la que entra (toma el valor del slider)
  if (prev && prev !== u) rebuildUnit(prev);
  if (u && u !== prev) rebuildUnit(u);
  recolor();            // cambia qué pilas van atenuadas; ya rehace la gráfica
  paintDrill();         // recolor solo llega aquí si hay gráfica que pintar
}

// Hay dos años en juego: el que está bajo el puntero, que es una vista previa
// y se va con él, y el que se ha fijado con un clic, que se queda. El fijado es
// lo que permite abrir el hueco, cerrar el panel y quedarse mirando la pila.
const activeYear = () => state.hoveredYear ?? state.pinnedYear;

function setHoveredYear(i) {
  state.hoveredYear = i;
  marcarAño();
}

function togglePinnedYear(i) {
  state.pinnedYear = state.pinnedYear === i ? null : i;
  marcarAño();
}

// El destello se dispara cuando cambia el año activo, no en cada cuadro: es un
// pulso de luz que se apaga, no un resaltado permanente. El amarillo fijo que
// había antes le robaba el color al dato, que es justo lo que hay que leer.
let flashYear = null, flashT0 = 0;

function marcarAño() {
  const i = activeYear();
  if (i !== flashYear) { flashYear = i; flashT0 = performance.now(); }
  paintTip(i);
}

// El botón de bajar y el de volver son el mismo, porque nunca hacen falta a la
// vez: en el nivel Pacífico baja a los países de la subregión seleccionada, y
// en el nivel país vuelve. En el nivel país está siempre disponible, aunque no
// haya nada seleccionado —por eso vive fuera de la gráfica, que ahí está
// oculta—, que era lo que faltaba: se podía entrar y no salir más que por la
// miga de navegación.
// «(hover: none)» distingue el dedo del ratón mejor que mirar el ancho: un
// portátil con pantalla táctil tiene los dos, y lo que importa es qué gesto
// nombrar en la pista.
const SIN_RATON = matchMedia("(hover: none)").matches;
const drillHint = document.getElementById("p-drill-hint");

function paintDrill() {
  if (state.level === "country") {
    drillBtn.hidden = false;
    drillBtn.dataset.mode = "back";
    drillBtn.textContent = t("btn_drill_back");
    drillHint.hidden = true;
    return;
  }
  drillBtn.dataset.mode = "drill";
  drillBtn.textContent = t("btn_drill");
  drillBtn.hidden = state.selected?.level !== "region";
  drillHint.hidden = drillBtn.hidden;
  drillHint.textContent = t(SIN_RATON ? "drill_hint_touch" : "drill_hint_mouse");
}

drillBtn.addEventListener("click", () => {
  if (drillBtn.dataset.mode === "back") return exitRegion();
  if (state.selected?.level === "region") enterRegion(state.selected.id);
});

function enterRegion(regionId) {
  state.level = "country";
  state.regionId = regionId;
  select(null);
  for (const u of units.region) u.group.visible = false;
  for (const u of units.country) u.group.visible = u.region === regionId;
  paintCrumb();
  paintDrill();
}

// La miga se pinta aparte de enterRegion/exitRegion porque también hay que
// rehacerla al cambiar de idioma, y esas dos deseleccionan de paso.
function paintCrumb() {
  if (state.level !== "country") { crumb.textContent = t("crumb"); return; }
  crumb.innerHTML = "";
  const back = document.createElement("button");
  back.textContent = t("crumb_back");
  back.addEventListener("click", exitRegion);
  crumb.append(back, ` · ${nameOf(unitById[state.regionId])} · ${t("crumb_suffix")}`);
}

function exitRegion() {
  state.level = "region";
  state.regionId = null;
  select(null);
  for (const u of units.country) u.group.visible = false;
  for (const u of units.region) u.group.visible = true;
  paintCrumb();
  paintDrill();
}

// ------------------------------------------------------------------ controles
// -------- cintillo de indicadores: los 13 a la vista, con desplazamiento
// horizontal. Sustituye al carrusel paginado: con una sola fila se compara de
// un vistazo qué indicador hay activo sin tener que pasar páginas.
const ribbon = document.getElementById("ribbon");

for (const ind of INDICATORS) {
  const b = document.createElement("button");
  b.dataset.ind = ind.id;              // clave de traducción del nombre
  b.textContent = t(ind.id, null, ind.name);
  b.title = ind.unit;
  b.setAttribute("aria-pressed", ind.id === state.indicator);
  b.addEventListener("click", () => {
    if (state.indicator === ind.id) return;
    state.indicator = ind.id;
    for (const x of ribbon.children) x.setAttribute("aria-pressed", x === b);
    // el activo puede quedar fuera de la parte visible del cintillo
    b.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    recolor();
  });
  ribbon.appendChild(b);
}

// -------- pestañas del panel inferior
const panes = { "tab-data": "pane-data", "tab-ctrl": "pane-ctrl" };

function openTab(id) {
  for (const [tab, pane] of Object.entries(panes)) {
    document.getElementById(tab).setAttribute("aria-selected", tab === id);
    document.getElementById(pane).hidden = tab !== id;
  }
  if (id === "tab-data") drawChart();   // el SVG necesita ancho visible
}

for (const tab of Object.keys(panes))
  document.getElementById(tab).addEventListener("click", () => openTab(tab));

// -------- colapsar los paneles para dejar el globo limpio. El botón de
// cerrar vive dentro del panel, donde se espera encontrarlo, así que se va con
// él; el de restaurar vive fuera y solo aparece cuando hace falta.
// En pantalla estrecha los dos paneles ocupan el mismo sitio —ancho completo,
// pegados abajo—, así que abrir uno cierra el otro. En pantalla ancha caben
// lado a lado y son independientes. El umbral es el mismo de la media query.
const ESTRECHO = () => matchMedia("(max-width: 900px)").matches;
const paneles = {};

for (const [panelId, ocultar, mostrar] of
     [["story", "hide-story", "show-story"], ["dock", "hide-dock", "show-dock"]]) {
  const el = document.getElementById(panelId);
  const btnMostrar = document.getElementById(mostrar);
  const set = colapsado => {
    el.classList.toggle("collapsed", colapsado);
    btnMostrar.hidden = !colapsado;          // en estrecho el CSS lo mantiene
    btnMostrar.setAttribute("aria-expanded", !colapsado);
    // el SVG se dibuja al ancho que tenga: al volver, hay que rehacerlo
    if (!colapsado && panelId === "dock") drawChart();
    // el panel acaba de cambiar de tamaño: hay que rehacer el encuadre después
    // de que el navegador reajuste el diseño, no antes
    requestAnimationFrame(ajustarEncuadre);
  };
  paneles[panelId] = set;
  document.getElementById(ocultar).addEventListener("click", () => set(true));
  // En estrecho los dos botones están siempre a la vista, así que el suyo
  // también tiene que servir para cerrar: si no, quedaría muerto al abrirse.
  btnMostrar.addEventListener("click", () => {
    if (!el.classList.contains("collapsed")) return set(true);
    if (ESTRECHO()) paneles[panelId === "story" ? "dock" : "story"](true);
    set(false);
  });
}

// Al arrancar en estrecho se deja solo el de datos: es el que responde al
// globo. Y si se pasa a estrecho redimensionando, se resuelve el solape.
function ajustarPaneles() {
  if (!ESTRECHO()) return;
  const story = document.getElementById("story");
  const dock = document.getElementById("dock");
  if (!story.classList.contains("collapsed") && !dock.classList.contains("collapsed"))
    paneles.story(true);
}

// -------- encuadre: en móvil los paneles se abren ARRIBA, así que el globo se
// baja por el hueco que queda libre en lugar de quedarse debajo del panel.
//
// Se hace con setViewOffset y no moviendo el globo ni la cámara: el
// desplazamiento entra en la matriz de proyección, con lo que el rayo del
// picking y la proyección de las etiquetas se corrigen solos. Moviendo
// globe.position habría chocado con el desplazamiento manual de dos dedos.
let distGuardada = null;      // la que había antes de abrir un panel
let zoomManual = false;       // el usuario tocó la rueda o pellizcó desde entonces

function ajustarEncuadre() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  let bajar = 0, tapadoHasta = 0;
  if (ESTRECHO()) {
    for (const id of ["story", "dock"]) {
      const el = document.getElementById(id);
      if (el.classList.contains("collapsed")) continue;
      // offsetTop + offsetHeight y NO getBoundingClientRect: el segundo
      // incluye la transformación, y como el panel entra deslizándose, en el
      // instante en que se mide todavía está fuera de la pantalla —daba un
      // borde negativo y el encuadre no se movía nunca—. La caja de diseño ya
      // es la definitiva desde el primer cuadro.
      const abajo = el.offsetTop + el.offsetHeight;
      tapadoHasta = Math.max(tapadoHasta, abajo);
      // el centro del hueco libre queda a la mitad de ese borde respecto del
      // centro de la pantalla, así que ese es el desplazamiento
      bajar = Math.max(bajar, abajo / 2);
    }
  }

  if (bajar < 1) {
    camera.clearViewOffset();
    // al cerrar se devuelve el acercamiento que había, salvo que se haya
    // pellizcado con el panel abierto: entonces manda lo que hizo el usuario
    if (distGuardada !== null && !zoomManual) camera.position.setLength(distGuardada);
    distGuardada = null;
    return;
  }

  camera.setViewOffset(w, h, 0, -bajar, w, h);

  // Desplazar no basta: en un teléfono el globo mide 399 px de radio sobre una
  // pantalla de 412, o sea que es más ancho que la pantalla, y bajarlo solo
  // mueve el recorte. Con un panel abierto se aleja lo justo para que quepa en
  // la franja que queda libre; nunca se acerca, para no deshacer un pellizco.
  const objetivo = (h - tapadoHasta) * 0.46;         // radio deseado, con aire
  const necesaria = R * h /
    (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(objetivo, 1));
  const actual = camera.position.length();
  if (necesaria > actual + 1) {
    if (distGuardada === null) { distGuardada = actual; zoomManual = false; }
    camera.position.setLength(Math.min(necesaria, ZOOM_MAX));
  }
}

// -------- relato por pasos: un párrafo a la vez, con Anterior / Siguiente.
// Los pasos son las claves story_p1, story_p2… del diccionario, así que
// añadir uno es añadir una clave en los tres idiomas y nada más.
const storyBody = document.getElementById("story-body");
const storyN = document.getElementById("story-n");
const storyPrev = document.getElementById("story-prev");
const storyNext = document.getElementById("story-next");
let storyStep = 0;

const storySteps = () => {
  const out = [];
  for (let n = 1; ; n++) {
    const k = `story_p${n}`;
    if (t(k, null, "") === "") break;
    out.push(k);
  }
  return out;
};

function paintStory() {
  const pasos = storySteps();
  storyStep = Math.min(storyStep, pasos.length - 1);
  storyBody.innerHTML = "";
  const par = document.createElement("p");
  par.textContent = t(pasos[storyStep]);
  storyBody.appendChild(par);
  storyBody.scrollTop = 0;
  storyN.textContent = t("story_step", { n: storyStep + 1, total: pasos.length });
  storyPrev.disabled = storyStep === 0;
  storyNext.disabled = storyStep === pasos.length - 1;
}

storyPrev.addEventListener("click", () => { storyStep--; paintStory(); });
storyNext.addEventListener("click", () => { storyStep++; paintStory(); });

// ------------------------------------------------------------------ gráfica
// Serie de tiempo en SVG a mano: sin dependencias, y así el generador del
// HTML autocontenido no tiene que incrustar ni resolver una librería más.
//
// El trazado se anima con stroke-dasharray/offset: se fija el guion a la
// longitud total de la línea y se lleva el desfase de esa longitud a cero, con
// lo que la línea «avanza» de izquierda a derecha sin recalcular la ruta en
// cada cuadro. Los puntos aparecen detrás del trazo, cada uno a su tiempo.
// Nombre del lugar en el idioma activo. Cae al español si un territorio nuevo
// llega sin traducir, igual que hace t() con los indicadores.
const nameOf = u => u.nombres[lang] ?? u.name;

const SVG_NS = "http://www.w3.org/2000/svg";
const chart = document.getElementById("chart");
const chartWrap = document.getElementById("chart-wrap");
const chartEmpty = document.getElementById("chart-empty");
const chartTip = document.getElementById("chart-tip");
const PAD = { t: 10, r: 12, b: 22, l: 46 };

const mk = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

let chartPts = [];        // {x, y, v, year} en coordenadas del SVG, para el hover

function drawChart() {
  const u = state.selected;
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const serie = u ? dataset.values[u.id]?.[state.indicator] : null;

  chartWrap.hidden = !u || !serie;
  chartEmpty.hidden = !chartWrap.hidden;
  if (chartWrap.hidden) {
    chartEmpty.textContent = u
      ? t("chart_nodata", { who: nameOf(u) })  // seleccionado pero sin serie
      : t("chart_empty");
    return;
  }

  document.getElementById("chart-ind").textContent = t(ind.id, null, ind.name);
  document.getElementById("chart-who").textContent = nameOf(u);
  document.getElementById("chart-uom").textContent = ind.unit;

  const w = chart.clientWidth || 600, h = chart.clientHeight || 176;
  chart.setAttribute("viewBox", `0 0 ${w} ${h}`);
  chart.innerHTML = "";
  chartTip.hidden = true;

  // Escala vertical con un 8 % de aire arriba y abajo. Si el indicador es
  // divergente se fuerza a incluir el cero: una anomalía se lee respecto a él,
  // y una serie que no lo cruce daría una gráfica que miente por encuadre.
  const dom = state.domain[state.indicator];
  const conDato = serie.filter(v => v !== null);
  if (!conDato.length) {                 // la serie existe pero está vacía
    chartWrap.hidden = true;
    chartEmpty.hidden = false;
    chartEmpty.textContent = t("chart_nodata", { who: nameOf(u) });
    return;
  }
  let lo = Math.min(...conDato), hi = Math.max(...conDato);
  if (dom.diverging) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (lo === hi) { lo -= 1; hi += 1; }            // serie plana
  const aire = (hi - lo) * 0.08;
  lo -= aire; hi += aire;

  const x = i => PAD.l + i * (w - PAD.l - PAD.r) / Math.max(YEARS.length - 1, 1);
  const y = v => PAD.t + (hi - v) * (h - PAD.t - PAD.b) / (hi - lo);

  // ejes y rótulos
  chart.appendChild(mk("line", { class: "axis", x1: PAD.l, y1: PAD.t, x2: PAD.l, y2: h - PAD.b }));
  chart.appendChild(mk("line", { class: "axis", x1: PAD.l, y1: h - PAD.b, x2: w - PAD.r, y2: h - PAD.b }));
  if (lo < 0 && hi > 0)
    chart.appendChild(mk("line", { class: "zero", x1: PAD.l, y1: y(0), x2: w - PAD.r, y2: y(0) }));

  for (const v of [hi - aire, lo + aire]) {
    const tx = mk("text", { class: "tick", x: PAD.l - 6, y: y(v) + 3, "text-anchor": "end" });
    tx.textContent = nf.format(v);
    chart.appendChild(tx);
  }
  // primer y último año; con 24 años, uno cada 6 para que no se amontonen
  YEARS.forEach((yr, i) => {
    if (i !== 0 && i !== YEARS.length - 1 && i % 6 !== 0) return;
    const tx = mk("text", { class: "tick", x: x(i), y: h - PAD.b + 13, "text-anchor": "middle" });
    tx.textContent = yr;
    chart.appendChild(tx);
  });

  chartPts = serie.map((v, i) => ({
    x: x(i), y: v === null ? null : y(v), v, year: YEARS[i],
  }));

  // La línea se corta en los huecos —un «M» reinicia el trazo— en vez de
  // saltarlos con un segmento recto, que insinuaría una interpolación que
  // nadie ha hecho. Un año suelto entre dos huecos queda sin segmento, y por
  // eso se dibuja igualmente su punto.
  let corte = true;
  const d = chartPts.map(p => {
    if (p.y === null) { corte = true; return ""; }
    const cmd = corte ? "M" : "L";
    corte = false;
    return `${cmd}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }).filter(Boolean).join(" ");

  const linea = mk("path", { class: "line", d });
  chart.appendChild(linea);

  const guia = mk("line", { class: "guide", y1: PAD.t, y2: h - PAD.b, opacity: 0 });
  chart.appendChild(guia);

  chartPts.forEach((p, i) => {
    if (p.y !== null) {
      const c = mk("circle", { class: "dot", cx: p.x, cy: p.y, r: 3, opacity: 0 });
      c.style.fill = "#" + colorFor(p.v, dom).getHexString();
      chart.appendChild(c);
      p.dot = c;
    }

    // zona de captura ancha: acertar un círculo de 3 px con el ratón es un
    // suplicio, así que cada punto tiene su franja vertical
    const hit = mk("rect", {
      class: "hit", x: p.x - (w - PAD.l - PAD.r) / (2 * Math.max(YEARS.length - 1, 1)),
      y: PAD.t, width: (w - PAD.l - PAD.r) / Math.max(YEARS.length - 1, 1), height: h - PAD.t - PAD.b,
    });
    hit.addEventListener("mouseenter", () => setHoveredYear(i));
    hit.addEventListener("mouseleave", () => setHoveredYear(null));
    // el clic fija el año: el hueco se queda abierto aunque se cierre el panel
    hit.addEventListener("click", () => togglePinnedYear(i));
    chart.appendChild(hit);
  });

  chart._guia = guia;
  animarTrazo(linea);
  paintTip(activeYear());       // el año fijado sobrevive al redibujado
  paintDrill();
}

// Trazado que avanza. Con reduced-motion se pinta de golpe.
function animarTrazo(linea) {
  const total = linea.getTotalLength();
  const puntos = chartPts;
  linea.style.strokeDasharray = total;
  linea.style.strokeDashoffset = total;
  const DUR = DUR_TRAZO;
  const t0 = performance.now();
  (function paso(now) {
    const k = Math.min(1, (now - t0) / DUR);
    linea.style.strokeDashoffset = total * (1 - easeOut(k));
    // cada punto se enciende cuando el trazo lo alcanza
    for (const p of puntos)
      p.dot?.setAttribute("opacity", (p.x - PAD.l) / (total || 1) <= k * 1.6 ? 1 : 0);
    if (k < 1) requestAnimationFrame(paso);
    else for (const p of puntos) p.dot?.setAttribute("opacity", 1);
  })(t0);
}

// Globito con el valor exacto del año señalado, y la guía vertical.
function paintTip(i) {
  const p = i === null ? null : chartPts[i];
  const guia = chart._guia;
  // el punto fijado se queda marcado aunque el puntero se haya ido
  for (const [k, q] of chartPts.entries())
    q.dot?.setAttribute("r", k === state.pinnedYear ? 5 : 3);
  if (!p) {
    chartTip.hidden = true;
    if (guia) guia.setAttribute("opacity", 0);
    return;
  }
  const ind = INDICATORS.find(x => x.id === state.indicator);
  chartTip.innerHTML = `<span class="y">${p.year}</span>` +
    (p.v === null ? t("val_nodata") : `${nf.format(p.v)} ${ind.unit}`);
  // el SVG escala con el ancho del panel: hay que pasar de coordenadas del
  // viewBox a píxeles reales antes de colocar el globito
  const k = chart.clientWidth / (chart.viewBox.baseVal.width || 1);
  const py = p.y ?? chart.viewBox.baseVal.height / 2;   // el hueco no tiene y
  chartTip.style.top = `${py * k + chart.offsetTop}px`;
  chartTip.hidden = false;
  // El globito va centrado sobre el punto, pero en los años de los extremos se
  // saldría del panel: se acota al ancho de la gráfica midiéndolo ya visible.
  const mitad = chartTip.offsetWidth / 2;
  chartTip.style.left =
    `${Math.min(Math.max(p.x * k, mitad), chart.clientWidth - mitad)}px`;
  if (guia) { guia.setAttribute("x1", p.x); guia.setAttribute("x2", p.x); guia.setAttribute("opacity", 1); }
  p.dot?.setAttribute("r", 5);
}

// -------- sliders (pestaña Controles). Los tres son estado, no plantilla:
// su texto se recalcula, no se traduce con data-i18n, y por eso applyLang los
// vuelve a disparar con un evento «input» sintético.
const sep = document.getElementById("sep");
const sepVal = document.getElementById("sep-val");
sep.addEventListener("input", () => {
  state.separation = +sep.value;
  sepVal.textContent = state.separation < 0.01 ? t("val_volume")
                     : Math.round(sepFrac() * 100) + " %";
  queueRebuild();   // la separación reparte el paso: cambia el grosor de la losa
});

const hgt = document.getElementById("height");
const hgtVal = document.getElementById("height-val");
hgt.addEventListener("input", () => {
  state.height = +hgt.value;
  hgtVal.textContent = state.height < 1.05 ? t("val_equal")
                     : (+state.height.toFixed(1)) + " ×";
  queueRebuild();
});

const opa = document.getElementById("opacity");
const opaVal = document.getElementById("opacity-val");
opa.addEventListener("input", () => {
  state.opacity = +opa.value;
  opaVal.textContent = state.opacity >= 1 ? t("val_opaque")
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
  recolor();                         // el gris de «sin dato» es del tema
  gridMat.color.setHex(theme.grid);
  gridMat.opacity = theme.gridOpacity;
  outlineMat.color.setHex(theme.outline);
  outlineMat.opacity = theme.outlineOpacity;
  ambient.color.setHex(theme.ambient);
  ambient.intensity = theme.ambientI;
  sun.intensity = theme.sunI;
  fill.intensity = theme.fillI;

  segTheme.querySelectorAll("button").forEach(b =>
    b.setAttribute("aria-pressed", b.dataset.theme === name));
  try { localStorage.setItem(THEME_KEY, name); } catch { /* modo privado */ }
}

[["dark", "theme_dark"], ["light", "theme_light"]].forEach(([id, key]) => {
  const b = document.createElement("button");
  b.dataset.i18n = key;            // setLang repinta su texto
  b.textContent = t(key);
  b.dataset.theme = id;
  b.addEventListener("click", () => applyTheme(id));
  segTheme.appendChild(b);
});

// Con datos reales los extremos van de 0,2 m a 1 058 000 turistas, así que se
// formatean en vez de volcarse crudos. El separador decimal y el de millares
// dependen del idioma, así que el formateador se rehace al cambiarlo.
let nf = new Intl.NumberFormat("es", { maximumSignificantDigits: 3 });

function paintLegend() {
  const ind = INDICATORS.find(i => i.id === state.indicator);
  const dom = state.domain[state.indicator];
  document.getElementById("ramp").style.background =
    `linear-gradient(90deg, ${rampOf(dom).join(",")})`;
  const [lo, hi] = dom.diverging ? [-dom.abs, dom.abs] : [dom.min, dom.max];
  document.getElementById("ramp-min").textContent = `${nf.format(lo)} ${ind.unit}`;
  document.getElementById("ramp-max").textContent = `${nf.format(hi)} ${ind.unit}`;
}

// ------------------------------------------------------------------ idioma
// setLang repinta los nodos marcados con data-i18n en el HTML. Lo que genera
// este archivo no lleva marca, asi que se repinta aqui: nombres del cintillo,
// valores de los sliders (que ademas son estado, no plantilla), el relato,
// la miga y la grafica, que rehace recolor().
//
// El selector es de dos letras y sin bandera: Windows no dibuja los emoji de
// bandera, con lo que se verian como las dos letras sueltas de todos modos.
const langBox = document.getElementById("lang");
for (const [id] of LANGS) {
  const b = document.createElement("button");
  b.dataset.lang = id;
  b.textContent = id.toUpperCase();
  b.addEventListener("click", () => applyLang(id));
  langBox.appendChild(b);
}

function applyLang(next) {
  setLang(next, () => {
    nf = new Intl.NumberFormat(next, { maximumSignificantDigits: 3 });

    for (const b of ribbon.querySelectorAll("button[data-ind]")) {
      const ind = INDICATORS.find(i => i.id === b.dataset.ind);
      b.textContent = t(ind.id, null, ind.name);
    }

    sep.dispatchEvent(new Event("input"));
    hgt.dispatchEvent(new Event("input"));
    opa.dispatchEvent(new Event("input"));

    relabel();          // los topónimos también cambian de idioma
    paintStory();
    paintCrumb();
    paintDrill();
    recolor();                      // leyenda y grafica
  });
  for (const b of langBox.children)
    b.setAttribute("aria-pressed", b.dataset.lang === next);
}

// ------------------------------------------------------------------ arranque
function resize() {
  const w = innerWidth, h = innerHeight;
  // updateStyle EN true (el valor por omisión): hay que dejar que three fije
  // también el tamaño CSS del lienzo. Con false solo tocaba el búfer de
  // dibujo, así que con devicePixelRatio 2 el atributo width quedaba en el
  // doble; y un elemento reemplazado con inset:0 y width:auto usa su tamaño
  // intrínseco, con lo que el lienzo medía 824 px CSS en una ventana de 412 y
  // se salía de la pantalla. En el teléfono se veía un cuarto de la escena,
  // las etiquetas caían fuera y el picking iba desplazado. En escritorio con
  // densidad 1 coincidían los números y no se notaba.
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  ajustarPaneles();    // al estrechar, los dos paneles pasan a competir por el sitio
  ajustarEncuadre();   // el hueco libre para el globo cambia con la ventana
  drawChart();         // el SVG se dibuja al ancho del panel, que cambio
}
addEventListener("resize", resize);
resize();
{ // preferencia guardada; si no la hay, claro (el mapa se lee mejor sobre él)
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch { /* modo privado */ }
  applyTheme(saved ?? "light");
}
buildLabels();
paintStory();
openTab("tab-data");
// Los dos paneles arrancan cerrados: lo primero que se ve es el globo entero,
// y los botones de abajo dicen qué hay detrás de cada uno.
paneles.story(true);
paneles.dock(true);
applyLang(initialLang());     // ya llama a recolor(), que pinta leyenda y gráfica
requestAnimationFrame(animate);

// hook de depuración (consola / pruebas automatizadas)
window.__ps = {
  state, units, globe, camera, select, applyLang, openTab, drawChart,
  // Costura de prueba: cada toque enviado por CDP cuesta ~300 ms de ida y
  // vuelta, así que un doble toque automatizado nunca cabe en la ventana real.
  // Ensancharla desde la prueba permite ejercitar el gesto de verdad —los
  // mismos eventos táctiles, el mismo camino— sin relajarla para la gente.
  setDobleMs: ms => { DOBLE_MS = ms; },
};
