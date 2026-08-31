/* Prueba de humo táctil: arrastrar, tocar y dos dedos sobre dist/.
 *
 *   npm run build && node tools/smoke-touch.mjs
 *
 * Usa eventos táctiles reales por CDP y no PointerEvent sintéticos: solo así
 * el gesto pasa por el mismo camino del navegador que decide si el toque se lo
 * queda la página o la aplicación. Con PointerEvent inventados desde JS la
 * prueba habría pasado incluso con el fallo presente.
 *
 * Existe porque ese fallo llegó a producción: sin `touch-action: none` en el
 * lienzo, el navegador reclamaba el gesto a los pocos milisegundos, emitía
 * pointercancel y el globo giraba unos grados y se paraba.
 *
 * Sale con código 1 si el arrastre no llega entero.
 */
import { chromium, devices } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
if (!existsSync(join(DIST, "pacific-strata.html")))
  throw new Error("falta dist/pacific-strata.html — lanza antes: npm run build");

const srv = createServer(async (q, r) => {
  const f = q.url === "/" ? join(DIST, "pacific-strata.html") : join(DIST, q.url);
  try { r.writeHead(200, { "Content-Type": "text/html" }); r.end(await readFile(f)); }
  catch { r.writeHead(404); r.end(); }
});
const port = await new Promise(k => srv.listen(0, () => k(srv.address().port)));

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"], colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(`http://localhost:${port}/`, { waitUntil: "commit" });
await page.waitForFunction(() => !!window.__ps, null, { timeout: 30000 });
await page.waitForTimeout(2500);

await page.evaluate(() => {
  window.__ev = { move: 0, cancel: 0 };
  const c = document.getElementById("scene");
  c.addEventListener("pointermove", () => window.__ev.move++);
  c.addEventListener("pointercancel", () => window.__ev.cancel++);
});

const cdp = await ctx.newCDPSession(page);
const { width, height } = page.viewportSize();
const cx = Math.round(width / 2), cy = Math.round(height * 0.28);
const touch = (type, pts) =>
  cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });

// ---- arrastrar con un dedo ----
const q0 = await page.evaluate(() => window.__ps.globe.quaternion.toArray());
const PASOS = 24;
await touch("touchStart", [{ x: cx, y: cy, id: 1 }]);
for (let i = 1; i <= PASOS; i++) {
  await touch("touchMove", [{ x: cx + i * 6, y: cy + i * 2, id: 1 }]);
  await page.waitForTimeout(16);
}
await touch("touchEnd", []);
await page.waitForTimeout(300);

const q1 = await page.evaluate(() => window.__ps.globe.quaternion.toArray());
const ev = await page.evaluate(() => window.__ev);
const dot = Math.abs(q0.reduce((a, v, i) => a + v * q1[i], 0));
const grados = 2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI;

// ---- toque simple: selecciona, no se confunde con arrastre ----
await page.evaluate(() => window.__ps.select(null));
await page.waitForTimeout(400);
// se apunta a una etiqueta y no al centro de la pantalla: la vista de arranque
// encuadra los datos, así que el centro puede caer en mar abierto
const blanco = await page.evaluate(() => {
  const el = [...document.querySelectorAll("#labels div")].find(x => x.style.display !== "none");
  return el ? { x: Math.round(parseFloat(el.style.left)),
                y: Math.round(parseFloat(el.style.top)) } : { x: cx, y: cy };
});
await touch("touchStart", [{ x: blanco.x, y: blanco.y, id: 1 }]);
await page.waitForTimeout(60);
await touch("touchEnd", []);
await page.waitForTimeout(800);
const sel = await page.evaluate(() => window.__ps.state.selected?.name ?? null);

// ---- dos dedos: desplazar ----
const p0 = await page.evaluate(() => window.__ps.globe.position.toArray());
await touch("touchStart", [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }]);
for (let i = 1; i <= 10; i++) {
  await touch("touchMove", [{ x: cx - 40 + i * 5, y: cy + i * 4, id: 1 },
                            { x: cx + 40 + i * 5, y: cy + i * 4, id: 2 }]);
  await page.waitForTimeout(16);
}
await touch("touchEnd", []);
await page.waitForTimeout(300);
const p1 = await page.evaluate(() => window.__ps.globe.position.toArray());
const movido = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);

// ---- doble toque: baja a los países de la subregión ----
// El punto se calcula proyectando el ancla de una subregión visible: tras el
// desplazamiento con dos dedos, el centro de la pantalla ya no cae sobre
// ninguna, y la prueba fallaría por apuntar mal y no por el gesto.
const diana = await page.evaluate(() => {
  const el = [...document.querySelectorAll("#labels div")]
    .find(d => d.style.display !== "none");
  if (!el) return null;
  return { x: Math.round(parseFloat(el.style.left)),
           y: Math.round(parseFloat(el.style.top)), quien: el.textContent };
});
const nivel0 = await page.evaluate(() => window.__ps.state.level);
let nivel1 = "sin diana";
if (diana) {
  // sin esperas ni consultas entre los dos toques: cada ida y vuelta a la
  // página cuesta cientos de milisegundos y se saldría de la ventana del
  // doble toque, haciendo fallar la prueba por lenta y no por el código
  // cada toque por CDP cuesta cientos de ms; se ensancha la ventana para que
  // la prueba mida el gesto y no la latencia del protocolo
  await page.evaluate(() => window.__ps.setDobleMs(4000));
  const p = [{ x: diana.x, y: diana.y, id: 1 }];
  await touch("touchStart", p);
  await touch("touchEnd", []);
  await touch("touchStart", p);
  await touch("touchEnd", []);
  await page.waitForTimeout(1000);
  nivel1 = await page.evaluate(() => window.__ps.state.level);
  await page.evaluate(() => window.__ps.setDobleMs(500));
}

// ---- pellizco: separar los dedos acerca, juntarlos aleja ----
// El zoom gasta primero el campo de visión, así que medir la distancia ya no
// dice si amplió: se mide el aumento, que es lo que se ve.
const aumento = () => page.evaluate(() => {
  const c = window.__ps.camera;
  return +(1 / (c.position.length() * Math.tan(c.fov * Math.PI / 360))).toFixed(6);
});
const d0 = await aumento();
await touch("touchStart", [{ x: cx - 30, y: cy, id: 1 }, { x: cx + 30, y: cy, id: 2 }]);
for (let i = 1; i <= 12; i++) {
  await touch("touchMove", [{ x: cx - 30 - i * 8, y: cy, id: 1 },
                            { x: cx + 30 + i * 8, y: cy, id: 2 }]);
  await page.waitForTimeout(16);
}
await touch("touchEnd", []);
await page.waitForTimeout(200);
const d1 = await aumento();

const ta = await page.evaluate(() =>
  getComputedStyle(document.getElementById("scene")).touchAction);

console.log(`touch-action        : ${ta}`);
console.log(`pointermove         : ${ev.move} de ${PASOS} · cancelaciones: ${ev.cancel}`);
console.log(`giro con un dedo    : ${grados.toFixed(1)}°`);
console.log(`toque simple        : ${sel ?? "no seleccionó nada"}`);
console.log(`dos dedos           : ${movido.toFixed(1)} unidades desplazado`);
console.log(`pellizco            : aumento x${(d1 / d0).toFixed(2)} (${d1 > d0 ? "amplía" : "NO amplía"})`);
console.log(`doble toque         : ${diana?.quien ?? "?"} · ${nivel0} → ${nivel1}`);

const ok = ev.cancel === 0 && ev.move >= PASOS - 2 && grados > 20 && sel && movido > 1
        && d1 > d0 * 1.05 && nivel1 === "country";
console.log(ok ? "\n  táctil correcto" : "\n  FALLO: el gesto no llega entero");

await browser.close();
srv.close();
process.exit(ok ? 0 : 1);
