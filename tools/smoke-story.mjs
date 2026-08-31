/* Recorre el relato y comprueba que cada paso lleva la escena a donde dice.
 *
 * Lo importante que verifica: que el botón «Ir a» deja seleccionada la unidad
 * correcta CON el indicador correcto, y que las cifras que afirma el texto
 * salen del dataset. Un relato que cita números es una promesa; esto la revisa.
 *
 *   node tools/smoke-story.mjs [--movil]
 */
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MOVIL = process.argv.includes("--movil");
const D = JSON.parse(await readFile(join(ROOT, "web/data/dataset.json"), "utf8"));
const Y = D.meta.years;
const V = D.values;
const fallos = [];

// ---------------------------------------------- 1) las cifras que cita el texto
const at = (u, i, año) => V[u]?.[i]?.[Y.indexOf(año)];
const maxDe = (u, i) => {
  const s = (V[u]?.[i] ?? []).filter(v => v !== null);
  return s.length ? Math.max(...s) : null;
};
const afirma = (etiqueta, real, esperado) => {
  const ok = Math.abs(real - esperado) < 1e-9;
  console.log(`  ${ok ? "✓" : "✗"} ${etiqueta.padEnd(46)} ${real} (dice ${esperado})`);
  if (!ok) fallos.push(`cifra falsa en el relato: ${etiqueta} = ${real}, dice ${esperado}`);
};

console.log("Cifras que el relato afirma, contra dataset.json:\n");
afirma("PNG temp. marina 2025 = su máximo", at("PG", "temp_anomaly", 2025), 1.1);
afirma("PNG 2025 es el máximo de la serie", maxDe("PG", "temp_anomaly"), 1.1);
afirma("Fiyi temp. marina 2015", at("FJ", "temp_anomaly", 2015), -0.1);
afirma("Vanuatu temp. marina 2015", at("VU", "temp_anomaly", 2015), -0.1);
afirma("Tonga temp. marina 2015", at("TO", "temp_anomaly", 2015), -0.1);
afirma("Niue temp. marina 2015", at("NU", "temp_anomaly", 2015), 0);
afirma("Tonga turistas 2019", at("TO", "tourism", 2019), 94000);
afirma("Tonga turistas 2021", at("TO", "tourism", 2021), 200);
afirma("N. Caledonia turistas 2022", at("NC", "tourism", 2022), 138748);
afirma("N. Caledonia turistas 2023", at("NC", "tourism", 2023), 125097);
afirma("N. Caledonia turistas 2024", at("NC", "tourism", 2024), 59399);

// porcentajes de recuperación
const recup = (u) => {
  const s = V[u].tourism;
  const pico = Math.max(...s.filter(v => v !== null));
  const ult = [...s].reverse().find(v => v !== null);
  return Math.round(ult / pico * 100);
};
afirma("Fiyi, % del pico", recup("FJ"), 88);
afirma("Polinesia Fr., % del pico", recup("PF"), 93);
afirma("N. Caledonia, % del pico", recup("NC"), 9);

// «los 4 estratos de arriba no existen» con CALCI, para los 22 países
const paises = Object.keys(V).filter(u => !["Melanesia", "Polynesia", "Micronesia"].includes(u));
const finCalci = new Set(paises
  .filter(u => V[u].calci)
  .map(u => Y[V[u].calci.findLastIndex(v => v !== null)]));
console.log(`  ${finCalci.size === 1 && finCalci.has(2022) ? "✓" : "✗"} `
  + `CALCI termina el mismo año en todos    ${[...finCalci].join(",")} (dice 2022, 4 huecos)`);
if (!(finCalci.size === 1 && finCalci.has(2022)))
  fallos.push("CALCI no termina en 2022 para todos");

// cobertura 79 % -> 14 %
const cob = a => {
  const k = Y.indexOf(a);
  let con = 0, tot = 0;
  for (const u of Object.keys(V)) for (const s of Object.values(V[u])) {
    tot++; if (s[k] !== null) con++;
  }
  return Math.round(con / tot * 100);
};
afirma("cobertura 2022", cob(2022), 79);
afirma("cobertura 2026", cob(2026), 14);

// ---------------------------------------------- 2) el relato en el navegador
const b = await chromium.launch();
const p = await b.newPage(MOVIL
  ? { viewport: { width: 412, height: 839 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => {
  try { localStorage.setItem("ps.tour.v1", "hecho"); } catch { /* privado */ }
});
p.on("pageerror", e => fallos.push(`pageerror: ${e.message}`));
p.on("console", m => m.type() === "error" && fallos.push(`console: ${m.text()}`));

await p.goto(pathToFileURL(join(ROOT, "dist", "pacific-strata.html")).href);
await p.waitForFunction(() => window.__ps, null, { timeout: 30000 });
await p.waitForTimeout(1500);

// esperado por paso, en el orden de RELATO
const ESPERADO = [
  { unidad: "Melanesia", ind: "temp_anomaly" },
  { unidad: "PG", ind: "temp_anomaly" },
  { unidad: "FJ", ind: "temp_anomaly", anio: 2015 },
  { unidad: "NC", ind: "tourism" },
  { unidad: "Melanesia", ind: "calci" },
  null,
];

await p.click("#show-story");
await p.waitForTimeout(500);

console.log(`\nRelato · ${MOVIL ? "móvil" : "escritorio"}\n`);
const total = await p.evaluate(() =>
  +document.getElementById("story-n").textContent.match(/(\d+)\s*$/)[1]);
if (total !== ESPERADO.length)
  fallos.push(`${total} pasos, se esperaban ${ESPERADO.length}`);

for (let n = 0; n < total; n++) {
  const info = await p.evaluate(() => {
    const body = document.getElementById("story-body");
    return {
      n: document.getElementById("story-n").textContent,
      titulo: body.querySelector("h3")?.textContent ?? "",
      parrafos: body.querySelectorAll("p").length,
      largo: body.textContent.length,
      accion: body.querySelector(".story-go")?.querySelector("b")?.textContent ?? null,
      desbordado: body.scrollHeight > body.clientHeight,
    };
  });

  const esp = ESPERADO[n];
  console.log(`${info.n.padEnd(9)} ${info.titulo.slice(0, 40).padEnd(41)}`
    + `${info.parrafos}p ${String(info.largo).padStart(4)}car`
    + `${info.desbordado ? " ⇕" : "  "}  ${info.accion ?? "(sin acción)"}`);

  if (!info.titulo) fallos.push(`paso ${n + 1}: sin título`);
  if (info.largo < 80) fallos.push(`paso ${n + 1}: cuerpo demasiado corto`);
  if (/^story_/.test(info.titulo)) fallos.push(`paso ${n + 1}: falta traducción`);

  if (esp) {
    if (!info.accion) fallos.push(`paso ${n + 1}: debería tener botón de acción`);
    else {
      await p.click(".story-go");
      await p.waitForTimeout(700);
      const st = await p.evaluate(() => ({
        sel: window.__ps.state.selected?.id ?? null,
        ind: window.__ps.state.indicator,
        fijado: window.__ps.state.pinnedYear,
      }));
      const anioFijado = st.fijado === null ? null : Y[st.fijado];
      const ok = st.sel === esp.unidad && st.ind === esp.ind
                 && anioFijado === (esp.anio ?? null);
      console.log(`          → ${ok ? "✓" : "✗"} deja: ${st.sel} / ${st.ind}`
        + `${anioFijado ? ` / ${anioFijado} fijado` : ""}`);
      if (!ok) fallos.push(`paso ${n + 1}: deja ${st.sel}/${st.ind}/${anioFijado},`
        + ` se esperaba ${esp.unidad}/${esp.ind}/${esp.anio ?? null}`);
    }
  } else if (info.accion) {
    fallos.push(`paso ${n + 1}: la metodología no debería tener acción`);
  }

  if (n < total - 1) { await p.click("#story-next"); await p.waitForTimeout(350); }
}

// el último paso tiene que desbordar: es el que se lee con la barra
const ultimoDesborda = await p.evaluate(() => {
  const b = document.getElementById("story-body");
  return b.scrollHeight > b.clientHeight + 20;
});
console.log(`\nmetodología desplaza vertical : ${ultimoDesborda ? "sí" : "NO"}`);
if (!ultimoDesborda) fallos.push("la metodología cabe entera: no ejercita el desplazamiento");

// idiomas
console.log("");
for (const l of ["fr", "en", "es"]) {
  await p.evaluate(x => window.__ps.applyLang(x), l);
  await p.waitForTimeout(250);
  const r = await p.evaluate(() => ({
    t: document.querySelector("#story-body h3")?.textContent ?? "",
    n: document.getElementById("story-n").textContent,
  }));
  console.log(`  ${l}: ${r.n} · ${r.t.slice(0, 46)}`);
  if (!r.t || /^story_/.test(r.t)) fallos.push(`${l}: falta traducción del relato`);
}

await p.screenshot({ path: join(ROOT, "dist", "shots",
  `relato-${MOVIL ? "movil" : "escritorio"}.png`) });
await b.close();

console.log(fallos.length ? `\n✗ ${fallos.length} FALLOS:\n  ` + fallos.join("\n  ")
                          : "\n✓ relato correcto");
process.exit(fallos.length ? 1 : 0);
