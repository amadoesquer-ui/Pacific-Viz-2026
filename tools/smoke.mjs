/* Prueba de humo en navegador: levanta web/ por HTTP, carga la página en
 * Chromium sin cabeza, recoge errores de consola y guarda capturas.
 *
 *   node tools/smoke.mjs                 # prueba dist/pacific-strata.html
 *   node tools/smoke.mjs --tema oscuro   # fuerza el tema
 *   node tools/smoke.mjs --reducido      # simula «reducir movimiento»
 *   node tools/smoke.mjs --web           # prueba web/ (three.js por CDN)
 *
 * Por defecto prueba el HTML autocontenido y no web/: es lo que se entrega, y
 * sobre todo no depende del CDN —tras una red corporativa, unpkg puede no
 * responder y el módulo no llega ni a ejecutarse, con lo que la prueba falla
 * por la red y no por el código—. Con --web se prueba la versión suelta,
 * recordando que necesita internet.
 *
 * Sale con código 1 si hubo cualquier error de página o de consola, para que
 * sirva tal cual en CI.
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "web");
const SHOTS = join(ROOT, "dist", "shots");

const arg = n => process.argv.includes(n);
const val = n => process.argv[process.argv.indexOf(n) + 1];

const MIME = { ".html": "text/html", ".js": "text/javascript",
               ".json": "application/json", ".css": "text/css" };

// Servidor mínimo: los módulos ES no cargan por file://
function serve(dir) {
  const s = createServer(async (req, res) => {
    const p = join(dir, decodeURIComponent(req.url.split("?")[0]));
    try {
      const body = await readFile(req.url === "/" ? join(dir, "index.html") : p);
      res.writeHead(200, { "Content-Type": MIME[extname(p)] ?? "text/plain" });
      res.end(body);
    } catch { res.writeHead(404); res.end("no"); }
  });
  return new Promise(ok => s.listen(0, () => ok([s, s.address().port])));
}

const usaWeb = arg("--web");
if (!usaWeb && !existsSync(join(ROOT, "dist", "pacific-strata.html")))
  throw new Error("falta dist/pacific-strata.html — lanza antes: npm run build");

// también el autocontenido se sirve por HTTP en vez de abrirse por file://:
// así las dos rutas se prueban igual y no entran las rarezas de file://
const [server, port] = await serve(usaWeb ? WEB : join(ROOT, "dist"));
const url = `http://localhost:${port}/${usaWeb ? "" : "pacific-strata.html"}`;

const tema = arg("--tema") ? val("--tema") : null;
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  colorScheme: tema === "oscuro" ? "dark" : tema === "claro" ? "light" : "light",
  // con «reducir movimiento» la extrusión no debe suprimirse, solo acortarse:
  // es la codificación del dato, y al suprimirla la aplicación parecía rota
  reducedMotion: arg("--reducido") ? "reduce" : "no-preference",
});

const errores = [];
page.on("pageerror", e => errores.push(`pageerror: ${e.message}`));
page.on("console", m => m.type() === "error" && errores.push(`console: ${m.text()}`));
page.on("requestfailed", r => errores.push(`request: ${r.url()} — ${r.failure()?.errorText}`));

// Ni «load» ni «networkidle»: three.js y las tipografías vienen de CDN y tras
// una red corporativa pueden tardar o no terminar nunca, y entonces el goto
// caduca aunque la aplicación ya esté viva. La señal buena es window.__ps, que
// main.js publica al final de su arranque, así que se espera solo eso.
await page.goto(url, { waitUntil: "commit", timeout: 60000 });
try {
  await page.waitForFunction(() => !!window.__ps, null, { timeout: 20000 });
} catch {
  // sin __ps no hay nada que medir, pero lo útil es POR QUÉ no arrancó
  console.error("la aplicación no arrancó (window.__ps nunca apareció)");
  for (const e of errores) console.error("  " + e);
  await browser.close();
  server.close();
  process.exit(1);
}
await page.waitForTimeout(3000);          // que asiente la animación de entrada

const estado = await page.evaluate(() => ({
  indicadores: Object.keys(window.__ps.state.domain).length,
  subregiones: window.__ps.units.region.length,
  paises: window.__ps.units.country.length,
  idioma: document.documentElement.lang,
  tema: document.documentElement.dataset.theme,
}));

// la pila tiene que CRECER, no aparecer colocada: se muestrea mientras sube
const escalaTope = () => page.evaluate(() =>
  +window.__ps.units.region[0].slabs.at(-2).meshes[0].scale.x.toFixed(4));
const antesDeSubir = await escalaTope();
await page.evaluate(() => window.__ps.select(window.__ps.units.region[0]));
const muestras = [];
for (let i = 0; i < 4; i++) { await page.waitForTimeout(60); muestras.push(await escalaTope()); }
await page.waitForTimeout(1200);
const alFinal = await escalaTope();
const anima = muestras.some((v, i) => i && v > muestras[i - 1]) && muestras[0] < alFinal;
console.log(`extrusión: ${antesDeSubir} → ${muestras.join(" ")} → ${alFinal}` +
            (anima ? "  (anima)" : "  ¡SALTA, sin animación!"));
if (!anima) errores.push("la extrusión no se anima");
await page.evaluate(() => window.__ps.select(null));
await page.waitForTimeout(900);

await mkdir(SHOTS, { recursive: true });
const sufijo = (usaWeb ? "web" : "dist") + "-" + estado.tema;
await page.screenshot({ path: join(SHOTS, `inicio-${sufijo}.png`) });

// selecciona la primera subregión y captura el panel abierto
await page.evaluate(() => window.__ps.select(window.__ps.units.region[0]));
await page.waitForTimeout(1200);
await page.screenshot({ path: join(SHOTS, `seleccion-${sufijo}.png`) });

console.log("estado :", JSON.stringify(estado));
console.log("capturas:", SHOTS);
console.log("errores :", errores.length ? errores : "ninguno");

await browser.close();
server.close();
process.exit(errores.length ? 1 : 0);
