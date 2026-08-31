/* Recorre el tutorial entero y comprueba lo que no se ve en una captura:
 * que cada paso encuentra su objetivo, que el foco cae DENTRO de la pantalla,
 * que la tarjeta no tapa al elemento que está señalando, que los dos modos de
 * gesto aparecen siempre, y que al terminar el tablero vuelve a como estaba.
 *
 *   node tools/smoke-tour.mjs [--web] [--movil]
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = process.argv.includes("--web");
const MOVIL = process.argv.includes("--movil");

const MIME = { ".html": "text/html", ".js": "text/javascript",
               ".json": "application/json", ".css": "text/css" };

async function servir(dir) {
  const s = createServer(async (req, res) => {
    try {
      const ruta = join(dir, decodeURIComponent(req.url.split("?")[0]));
      const cuerpo = await readFile(ruta);
      res.writeHead(200, { "Content-Type": MIME[extname(ruta)] ?? "application/octet-stream" });
      res.end(cuerpo);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => s.listen(0, r));
  return { url: `http://localhost:${s.address().port}`, cerrar: () => s.close() };
}

const nav = MOVIL
  ? { viewport: { width: 412, height: 839 }, deviceScaleFactor: 2.6,
      isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 } };

const b = await chromium.launch();
const p = await b.newPage(nav);
const errores = [];
p.on("pageerror", e => errores.push(`pageerror: ${e.message}`));
p.on("console", m => m.type() === "error" && errores.push(`console: ${m.text()}`));

let srv = null, url;
if (WEB) { srv = await servir(join(ROOT, "web")); url = `${srv.url}/index.html`; }
else url = pathToFileURL(join(ROOT, "dist", "pacific-strata.html")).href;

await p.goto(url);
await p.waitForFunction(() => window.__ps, null, { timeout: 30000 });
await p.waitForTimeout(1600);

console.log(`Tutorial · ${MOVIL ? "móvil 412×839" : "escritorio 1440×900"} · ${WEB ? "web/" : "dist/"}\n`);

// ---------------------------------------------------- arranque automático
const auto = await p.locator(".tour").count();
console.log(`arranque solo (1ª visita) : ${auto ? "sí" : "NO — debería"}`);
if (!auto) await p.click("#tour-btn");
await p.waitForSelector(".tour.visible", { timeout: 5000 });

// estado previo que el tutorial deberá restaurar
const antes = await p.evaluate(() => ({
  sel: window.__ps.state.selected?.id ?? null,
  nivel: window.__ps.state.level,
  story: document.getElementById("story").classList.contains("collapsed"),
  dock: document.getElementById("dock").classList.contains("collapsed"),
}));

const total = await p.locator(".tour-puntos i").count();
console.log(`pasos                     : ${total}\n`);

// El foco se DESPLAZA de un paso al siguiente (transición de 220 ms) y el
// panel que se abre tarda otros 300 ms en entrar. Medir a un tiempo fijo daba
// lecturas a media animación —el panel del relato en x=-41 camino de x=22— y
// las contaba como fallo del producto. Se espera a que la caja deje de moverse.
async function asentado() {
  await p.waitForFunction(() => {
    const el = document.querySelector(".tour-foco");
    const r = el && !el.hidden ? el.getBoundingClientRect() : null;
    const clave = r ? `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}` : "nada";
    const w = window.__quieto ??= { clave: null, n: 0 };
    w.n = clave === w.clave ? w.n + 1 : 0;
    w.clave = clave;
    return w.n >= 5;
  }, null, { timeout: 4000 });
  await p.evaluate(() => { window.__quieto = null; });
}

const fallos = [];
for (let n = 1; n <= total; n++) {
  await asentado();
  const r = await p.evaluate(() => {
    const foco = document.querySelector(".tour-foco");
    const card = document.querySelector(".tour-card");
    const vis = foco && !foco.hidden;
    const f = vis ? foco.getBoundingClientRect() : null;
    const c = card.getBoundingClientRect();
    const solapa = (a, z) => a && !(a.right <= z.left || a.left >= z.right ||
                                    a.bottom <= z.top || a.top >= z.bottom);
    return {
      titulo: card.querySelector(".tour-t").textContent,
      paso: card.querySelector(".tour-n").textContent,
      cuerpo: card.querySelector(".tour-b").textContent.length,
      gestos: [...card.querySelectorAll(".tour-gesto")].map(g => ({
        propio: g.classList.contains("propio"),
        modo: g.querySelector("b").textContent,
        txt: g.querySelector("span").textContent,
        glifo: !!g.querySelector("svg"),
      })),
      foco: f && { x: Math.round(f.left), y: Math.round(f.top),
                   w: Math.round(f.width), h: Math.round(f.height) },
      focoDentro: !f || (f.left >= -1 && f.top >= -1 &&
                         f.right <= innerWidth + 1 && f.bottom <= innerHeight + 1),
      cardDentro: c.left >= -1 && c.top >= -1 &&
                  c.right <= innerWidth + 1 && c.bottom <= innerHeight + 1,
      tapa: solapa(f, c),
    };
  });

  const marca = [];
  if (!r.focoDentro) { marca.push("FOCO FUERA"); fallos.push(`${n}: foco fuera de pantalla`); }
  if (!r.cardDentro) { marca.push("TARJETA FUERA"); fallos.push(`${n}: tarjeta fuera de pantalla`); }
  if (r.tapa) { marca.push("TAPA EL FOCO"); fallos.push(`${n}: la tarjeta tapa lo que señala`); }
  if (r.cuerpo < 40) { marca.push("SIN TEXTO"); fallos.push(`${n}: cuerpo vacío`); }

  const g = r.gestos.length
    ? "  " + r.gestos.map(x => `${x.propio ? "▶" : " "}${x.modo}: ${x.txt}${x.glifo ? "" : " (SIN GLIFO)"}`).join(" | ")
    : "";
  console.log(`${String(n).padStart(2)}. ${r.titulo.padEnd(30)} `
    + `foco ${r.foco ? `${r.foco.w}×${r.foco.h} @${r.foco.x},${r.foco.y}` : "centrada"}`
    + (marca.length ? `  ✗ ${marca.join(" ")}` : ""));
  if (g) console.log(g);

  if (r.gestos.length) {
    if (r.gestos.length !== 2) fallos.push(`${n}: ${r.gestos.length} gestos, deberían ser 2`);
    if (r.gestos.filter(x => x.propio).length !== 1)
      fallos.push(`${n}: debería haber exactamente un gesto marcado como propio`);
    if (r.gestos.some(x => !x.glifo)) fallos.push(`${n}: falta el dibujo de un gesto`);
  }

  if (n < total) await p.click(".tour-next");
}

// ---------------------------------------------------- cierre y restauración
await p.click(".tour-next");                    // el último botón cierra
await p.waitForTimeout(500);
const abierto = await p.locator(".tour").count();
const despues = await p.evaluate(() => ({
  sel: window.__ps.state.selected?.id ?? null,
  nivel: window.__ps.state.level,
  story: document.getElementById("story").classList.contains("collapsed"),
  dock: document.getElementById("dock").classList.contains("collapsed"),
}));

console.log(`\ncierra al terminar        : ${abierto ? "NO" : "sí"}`);
console.log(`estado antes              : ${JSON.stringify(antes)}`);
console.log(`estado después            : ${JSON.stringify(despues)}`);
if (abierto) fallos.push("no se cerró al terminar");
if (JSON.stringify(antes) !== JSON.stringify(despues))
  fallos.push("no restauró el estado del tablero");

// ---------------------------------------------------- no se repite solo
await p.reload();
await p.waitForFunction(() => window.__ps, null, { timeout: 30000 });
await p.waitForTimeout(1500);
const repite = await p.locator(".tour").count();
console.log(`no vuelve a salir solo    : ${repite ? "NO — vuelve a salir" : "sí"}`);
if (repite) fallos.push("vuelve a arrancar tras haberlo completado");

// el botón ? lo vuelve a abrir
await p.click("#tour-btn");
await p.waitForSelector(".tour.visible", { timeout: 5000 });
console.log(`el botón ? lo reabre      : sí`);

// ---------------------------------------------------- idiomas
await p.click(".tour-x");
await p.waitForTimeout(300);
for (const lang of ["fr", "es", "en"]) {
  await p.evaluate(l => window.__ps.applyLang(l), lang);
  await p.click("#tour-btn");
  await p.waitForSelector(".tour.visible");
  const txt = await p.evaluate(() => ({
    t: document.querySelector(".tour-t").textContent,
    n: document.querySelector(".tour-n").textContent,
    sig: document.querySelector(".tour-next").textContent,
  }));
  console.log(`  ${lang}: ${txt.n} · ${txt.t} · [${txt.sig}]`);
  if (/^tour_/.test(txt.t) || /^tour_/.test(txt.sig))
    fallos.push(`${lang}: falta traducción (se ve la clave)`);
  await p.click(".tour-x");
  await p.waitForTimeout(250);
}

await p.screenshot({ path: join(ROOT, "dist", "shots",
  `tour-${MOVIL ? "movil" : "escritorio"}.png`) });

console.log(`\nerrores de página         : ${errores.length ? errores.join(" · ") : "ninguno"}`);
if (errores.length) fallos.push(...errores);
console.log(fallos.length ? `\n✗ ${fallos.length} FALLOS:\n  ` + fallos.join("\n  ")
                          : "\n✓ tutorial correcto");

await b.close();
srv?.cerrar();
process.exit(fallos.length ? 1 : 0);
