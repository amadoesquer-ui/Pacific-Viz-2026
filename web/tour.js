/* Pacific Strata — tutorial guiado de las interacciones.
 *
 * Un recorrido con foco (spotlight) sobre el elemento del que se habla y una
 * tarjeta que lo explica. Dos decisiones que marcan el resto del módulo:
 *
 * 1. Los gestos se muestran SIEMPRE en los dos modos, ratón y dedo, no solo el
 *    del aparato en el que se abre. El que corresponde al aparato se marca
 *    como «tú estás aquí», pero el otro sigue visible: media sala mira el
 *    tablero en un proyector y lo usará luego en el móvil, y esconderles la
 *    mitad de los gestos convertiría el tutorial en una trampa.
 * 2. Los gestos no se pueden explicar solo con palabras. «Arrastra con dos
 *    dedos» y «pellizca» se leen casi igual y se hacen distinto, así que cada
 *    uno lleva un dibujo animado que lo representa.
 *
 * El recorrido toca el estado del tablero (abre paneles, selecciona una
 * unidad) porque explicar la gráfica con la gráfica vacía no serviría de nada.
 * Todo lo que toca lo devuelve a como estaba al terminar o al saltarse.
 */
import { t } from "./i18n.js";

// El aparato manda en qué modo se marca como propio, pero no oculta el otro.
const TACTIL = matchMedia("(pointer: coarse)").matches;
const ESTRECHO = () => matchMedia("(max-width: 900px)").matches;
const REDUCIDO = matchMedia("(prefers-reduced-motion: reduce)").matches;
const CLAVE = "ps.tour.v1";

const $ = id => document.getElementById(id);

// -------------------------------------------------------------- los pasos
//
// `objetivo` puede ser un id, una función que devuelve un elemento, o null
// para una tarjeta centrada sin foco. `preparar` deja el tablero en el estado
// en el que el paso tiene sentido. `gestos` lista las dos formas de hacer lo
// mismo; sin `gestos`, el paso es solo texto.
//
// Los textos viven en i18n.js: aquí solo van las claves y la mecánica.
const PASOS = [
  {
    id: "bienvenida",
    objetivo: null,
    preparar: api => { api.cerrarPaneles(); api.seleccionar(null); },
  },
  {
    id: "girar",
    objetivo: "scene",
    foco: "centro",              // el lienzo ocupa todo: se enfoca el centro
    gestos: [["raton", "arrastrar"], ["dedo", "arrastrar"]],
  },
  {
    id: "zoom",
    objetivo: "scene",
    foco: "centro",
    gestos: [["raton", "rueda"], ["dedo", "pellizco"]],
  },
  {
    id: "mover",
    objetivo: "scene",
    foco: "centro",
    gestos: [["raton", "central"], ["dedo", "dos-dedos"]],
  },
  {
    id: "seleccionar",
    objetivo: "scene",
    foco: "centro",
    gestos: [["raton", "clic"], ["dedo", "toque"]],
    preparar: api => api.seleccionarEjemplo("region"),
  },
  {
    id: "profundizar",
    objetivo: "p-drill",
    gestos: [["raton", "doble-clic"], ["dedo", "doble-toque"]],
    preparar: api => { api.abrirPanel("dock", "tab-data"); api.seleccionarEjemplo("region"); },
  },
  {
    id: "norte",
    objetivo: "north-btn",
  },
  {
    id: "indicadores",
    objetivo: "ribbon",
    preparar: api => api.abrirPanel("dock", "tab-data"),
  },
  {
    id: "grafica",
    objetivo: "chart-wrap",
    gestos: [["raton", "señalar"], ["dedo", "toque"]],
    preparar: api => { api.abrirPanel("dock", "tab-data"); api.seleccionarEjemplo("region"); },
  },
  {
    id: "controles",
    objetivo: "pane-ctrl",
    preparar: api => api.abrirPanel("dock", "tab-ctrl"),
  },
  {
    id: "relato",
    objetivo: "story",
    preparar: api => api.abrirPanel("story"),
  },
  {
    id: "final",
    objetivo: "lang",
    preparar: api => api.cerrarPaneles(),
  },
];

// ------------------------------------------------------- dibujos de gestos
//
// Un SVG por gesto. Son deliberadamente esquemáticos —un rectángulo por la
// pantalla, círculos por los dedos— porque lo que tiene que quedar claro es
// el MOVIMIENTO, y un dibujo bonito de una mano lo taparía. La animación va en
// CSS para que «reducir movimiento» la pueda congelar en una pose legible.
const RATON = `<path class="g-cuerpo" d="M13 4h6a7 7 0 0 1 7 7v10a7 7 0 0 1-7 7h-6a7 7 0 0 1-7-7V11a7 7 0 0 1 7-7z"/>`;

const GLIFOS = {
  // ---- ratón
  arrastrar_raton: `<svg viewBox="0 0 96 40" class="glifo">
    <g class="g-mueve"><g transform="translate(6 4)">${RATON}
      <path class="g-boton" d="M13 4h3v7h-3a7 7 0 0 1-7-7 7 7 0 0 1 7-4z" fill="currentColor" opacity=".55"/>
    </g></g>
    <path class="g-flecha" d="M40 20h44M78 14l6 6-6 6"/></svg>`,

  rueda_raton: `<svg viewBox="0 0 96 40" class="glifo">
    <g transform="translate(30 4)">${RATON}
      <line class="g-rueda" x1="16" y1="8" x2="16" y2="15"/></g>
    <path class="g-flecha" d="M74 12v16M70 16l4-5 4 5M70 24l4 5 4-5"/></svg>`,

  central_raton: `<svg viewBox="0 0 96 40" class="glifo">
    <g class="g-mueve"><g transform="translate(6 4)">${RATON}
      <line class="g-rueda g-lat" x1="16" y1="8" x2="16" y2="15"/></g></g>
    <path class="g-flecha" d="M40 20h44M78 14l6 6-6 6"/></svg>`,

  clic_raton: `<svg viewBox="0 0 96 40" class="glifo">
    <g transform="translate(30 4)">${RATON}
      <path class="g-boton g-lat" d="M13 4h3v7h-3a7 7 0 0 1-7-7 7 7 0 0 1 7-4z" fill="currentColor"/>
    </g><circle class="g-onda" cx="46" cy="10" r="6"/></svg>`,

  "doble-clic_raton": `<svg viewBox="0 0 96 40" class="glifo">
    <g transform="translate(30 4)">${RATON}
      <path class="g-boton g-lat2" d="M13 4h3v7h-3a7 7 0 0 1-7-7 7 7 0 0 1 7-4z" fill="currentColor"/>
    </g><circle class="g-onda" cx="46" cy="10" r="6"/>
    <circle class="g-onda g-onda2" cx="46" cy="10" r="6"/></svg>`,

  señalar_raton: `<svg viewBox="0 0 96 40" class="glifo">
    <g class="g-vaiven"><g transform="translate(20 4)">${RATON}</g></g>
    <path class="g-guia" d="M8 34h80"/></svg>`,

  // ---- dedo
  arrastrar_dedo: `<svg viewBox="0 0 96 40" class="glifo">
    <circle class="g-dedo g-mueve" cx="22" cy="20" r="8"/>
    <path class="g-guia" d="M22 20h56"/>
    <path class="g-flecha" d="M72 14l6 6-6 6"/></svg>`,

  pellizco_dedo: `<svg viewBox="0 0 96 40" class="glifo">
    <circle class="g-dedo g-abre-i" cx="38" cy="20" r="8"/>
    <circle class="g-dedo g-abre-d" cx="58" cy="20" r="8"/></svg>`,

  "dos-dedos_dedo": `<svg viewBox="0 0 96 40" class="glifo">
    <g class="g-mueve">
      <circle class="g-dedo" cx="20" cy="12" r="7"/>
      <circle class="g-dedo" cx="20" cy="28" r="7"/></g>
    <path class="g-flecha" d="M74 20h10M78 14l6 6-6 6"/></svg>`,

  toque_dedo: `<svg viewBox="0 0 96 40" class="glifo">
    <circle class="g-dedo" cx="48" cy="20" r="8"/>
    <circle class="g-onda" cx="48" cy="20" r="8"/></svg>`,

  "doble-toque_dedo": `<svg viewBox="0 0 96 40" class="glifo">
    <circle class="g-dedo" cx="48" cy="20" r="8"/>
    <circle class="g-onda" cx="48" cy="20" r="8"/>
    <circle class="g-onda g-onda2" cx="48" cy="20" r="8"/></svg>`,
};

// ------------------------------------------------------------------ montaje
let capa, foco, tarjeta, api, i = 0, previo = null, activo = false;

function construir() {
  capa = document.createElement("div");
  capa.className = "tour";
  capa.innerHTML = `
    <div class="tour-foco" hidden></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tour-t">
      <button class="tour-x" type="button" aria-label="${t("tour_skip")}">&times;</button>
      <p class="tour-n"></p>
      <h2 class="tour-t" id="tour-t"></h2>
      <div class="tour-b"></div>
      <div class="tour-gestos"></div>
      <div class="tour-pies">
        <div class="tour-puntos" role="presentation"></div>
        <div class="tour-btns">
          <button class="tour-prev" type="button"></button>
          <button class="tour-next primary" type="button"></button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(capa);
  foco = capa.querySelector(".tour-foco");
  tarjeta = capa.querySelector(".tour-card");

  capa.querySelector(".tour-x").addEventListener("click", () => cerrar(false));
  capa.querySelector(".tour-prev").addEventListener("click", () => ir(i - 1));
  capa.querySelector(".tour-next").addEventListener("click", () => ir(i + 1));
  // El clic FUERA de la tarjeta no cierra: en un tutorial de gestos el usuario
  // toca la pantalla sin parar —está probando lo que acaba de leer— y cerrarse
  // solo sería exasperante.
  //
  // El teclado se escucha en el documento y no en la capa justamente por eso:
  // en cuanto se prueba un gesto sobre el globo el foco se va de la tarjeta, y
  // escuchando solo en ella las flechas dejaban de avanzar.
  document.addEventListener("keydown", teclado);
  addEventListener("resize", recolocar);
  addEventListener("scroll", recolocar, true);
}

function teclado(e) {
  if (e.key === "Escape") { e.preventDefault(); cerrar(false); }
  else if (e.key === "ArrowRight") { e.preventDefault(); ir(i + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); ir(i - 1); }
}

// --------------------------------------------------------------- pintar uno
function pintar() {
  const paso = PASOS[i];
  paso.preparar?.(api);

  capa.querySelector(".tour-n").textContent =
    t("tour_step", { n: i + 1, total: PASOS.length });
  capa.querySelector(".tour-t").textContent = t(`tour_${paso.id}_t`);
  capa.querySelector(".tour-b").innerHTML = t(`tour_${paso.id}_b`);

  // ---- gestos: los dos modos, con el del aparato marcado
  const caja = capa.querySelector(".tour-gestos");
  caja.innerHTML = "";
  if (paso.gestos) {
    for (const [modo, gesto] of paso.gestos) {
      const propio = (modo === "dedo") === TACTIL;
      const fila = document.createElement("div");
      fila.className = "tour-gesto" + (propio ? " propio" : "");
      fila.innerHTML = `
        ${GLIFOS[`${gesto}_${modo}`] ?? ""}
        <div class="tour-gesto-txt">
          <b>${t(modo === "dedo" ? "tour_touch" : "tour_mouse")}</b>
          <span>${t(`tour_${paso.id}_${modo}`)}</span>
        </div>`;
      caja.appendChild(fila);
    }
  }

  // ---- puntos de avance
  capa.querySelector(".tour-puntos").innerHTML = PASOS
    .map((p, n) => `<i class="${n === i ? "on" : ""}"${n < i ? ' data-hecho="1"' : ""}></i>`)
    .join("");

  const prev = capa.querySelector(".tour-prev");
  prev.textContent = t("tour_prev");
  prev.disabled = i === 0;
  capa.querySelector(".tour-next").textContent =
    i === PASOS.length - 1 ? t("tour_done") : t("tour_next");

  colocarCuandoAsiente();
}

// Los paneles entran DESLIZÁNDOSE, así que su caja tarda en ser la definitiva.
// Medir a los dos cuadros daba el panel del relato todavía en x=-308 y el botón
// de profundizar en y=1196: fuera de pantalla los dos, con el foco señalando el
// vacío. En vez de adivinar una espera, se remide cada cuadro hasta que la caja
// deja de moverse, con un tope por si algo anima para siempre.
function colocarCuandoAsiente() {
  let anterior = null, quietos = 0, cuadros = 0;
  const tic = () => {
    if (!activo) return;
    const el = elementoDe(PASOS[i]);
    const r = el?.getBoundingClientRect();
    const clave = r ? `${r.x},${r.y},${r.width},${r.height}` : "centrada";
    recolocar();
    // CUATRO cuadros seguidos quietos, no uno: al arrancar una transición CSS
    // hay un cuadro en el que todavía no se ha movido nada, y dándolo por
    // asentado se medía el panel aún plegado, fuera de la pantalla.
    quietos = clave === anterior ? quietos + 1 : 0;
    anterior = clave;
    if (quietos < 4 && cuadros++ < 60) requestAnimationFrame(tic);
  };
  requestAnimationFrame(tic);
}

// ------------------------------------------------------------- colocación
// Un objetivo que está oculto (el botón de profundizar sin selección, un panel
// plegado) no se puede enfocar: se devuelve null y el paso cae en tarjeta
// centrada en vez de dibujar un foco sobre una caja de tamaño cero.
function elementoDe(paso) {
  if (!paso.objetivo) return null;
  const el = typeof paso.objetivo === "function" ? paso.objetivo() : $(paso.objetivo);
  if (!el || el.hidden || !el.getClientRects().length) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

function recolocar() {
  if (!activo) return;
  const paso = PASOS[i];
  const el = elementoDe(paso);

  if (!el) {                                  // tarjeta centrada, sin foco
    foco.hidden = true;
    tarjeta.className = "tour-card centrada";
    tarjeta.style.cssText = "";
    return;
  }

  let r = el.getBoundingClientRect();
  // El lienzo ocupa toda la ventana: enfocarlo entero no destaca nada, así que
  // se enfoca un recuadro en el centro, que es donde está el globo.
  if (paso.foco === "centro") {
    const lado = Math.min(r.width, r.height) * (ESTRECHO() ? .62 : .5);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2 - (ESTRECHO() ? r.height * .08 : 0);
    r = { left: cx - lado / 2, top: cy - lado / 2, width: lado, height: lado,
          right: cx + lado / 2, bottom: cy + lado / 2 };
  }

  const pad = paso.foco === "centro" ? 0 : 6;
  foco.hidden = false;
  foco.style.left = `${r.left - pad}px`;
  foco.style.top = `${r.top - pad}px`;
  foco.style.width = `${r.width + pad * 2}px`;
  foco.style.height = `${r.height + pad * 2}px`;
  foco.style.borderRadius = paso.foco === "centro" ? "50%" : "10px";

  colocarTarjeta(r);
}

// La tarjeta va en el primer lado donde quepa ENTERA: abajo, arriba, derecha o
// izquierda. Probar solo arriba y abajo no bastaba: con el foco redondo en
// mitad de la pantalla no cabía ni encima ni debajo, la tarjeta se recortaba
// contra el borde y acababa encima justo de lo que señalaba. A los lados
// sobraba sitio. Si no cabe en ninguno, va donde más hueco haya.
function colocarTarjeta(r) {
  tarjeta.className = "tour-card";
  tarjeta.style.cssText = "";
  const vw = innerWidth, vh = innerHeight, M = 12;
  const w = tarjeta.offsetWidth, h = tarjeta.offsetHeight;
  const enX = Math.max(M, Math.min(r.left + r.width / 2 - w / 2, vw - w - M));
  const enY = Math.max(M, Math.min(r.top + r.height / 2 - h / 2, vh - h - M));

  const lados = [
    { cls: "bajo",  hueco: vh - r.bottom - M * 2, falta: h, top: r.bottom + M, left: enX },
    { cls: "sobre", hueco: r.top - M * 2,         falta: h, top: r.top - h - M, left: enX },
    { cls: "dcha",  hueco: vw - r.right - M * 2,  falta: w, top: enY, left: r.right + M },
    { cls: "izda",  hueco: r.left - M * 2,        falta: w, top: enY, left: r.left - w - M },
  ];
  const elegido = lados.find(l => l.hueco >= l.falta)
    ?? lados.reduce((a, b) => (b.hueco - b.falta > a.hueco - a.falta ? b : a));

  tarjeta.style.top = `${Math.max(M, Math.min(elegido.top, vh - h - M))}px`;
  tarjeta.style.left = `${Math.max(M, Math.min(elegido.left, vw - w - M))}px`;
  tarjeta.classList.add(elegido.cls);
}

// ------------------------------------------------------------- navegación
function ir(n) {
  if (n < 0) return;
  if (n >= PASOS.length) return cerrar(true);
  i = n;
  pintar();
}

function cerrar(completado) {
  activo = false;
  document.removeEventListener("keydown", teclado);
  removeEventListener("resize", recolocar);
  removeEventListener("scroll", recolocar, true);
  capa.classList.remove("visible");
  const quitar = () => { capa.remove(); capa = null; };
  if (REDUCIDO) quitar(); else setTimeout(quitar, 200);
  api.restaurar(previo);
  try { localStorage.setItem(CLAVE, completado ? "hecho" : "saltado"); } catch { /* privado */ }
  $("tour-btn")?.focus();
}

// ------------------------------------------------------------------ público
export function iniciarTour(apiTablero) {
  if (activo) return;
  api = apiTablero;
  previo = api.instantanea();
  activo = true;
  i = 0;
  construir();
  pintar();
  requestAnimationFrame(() => {
    capa.classList.add("visible");
    capa.querySelector(".tour-next").focus();
  });
}

/** Arranca solo la primera vez. Nunca en medio de una carga: se llama cuando
 *  el tablero ya tiene datos, o el foco señalaría cajas vacías. */
export function tourPendiente() {
  try { return !localStorage.getItem(CLAVE); } catch { return false; }
}
