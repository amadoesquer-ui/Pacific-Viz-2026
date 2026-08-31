/* Genera dist/pacific-strata.html: un único archivo autocontenido que se abre
 * con doble clic, sin servidor ni internet.
 *
 * No hay paso de compilación en el proyecto: esto se ejecuta solo cuando
 * quieres compartirlo, y NO toca web/. El código de main.js se incrusta tal
 * cual salvo los especificadores de import; los datos se sirven interceptando
 * fetch(), de modo que la versión suelta y la autocontenida no divergen.
 *
 *   node tools/build_standalone.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "web");
const CACHE = join(ROOT, ".cache");     // descargas, para no repetirlas

const DATA = ["regions", "countries", "land", "world", "dataset"];
const THREE_URL = "https://unpkg.com/three@0.164.1/build/three.module.js";
const CONIC_URL = "https://esm.sh/three-conic-polygon-geometry@2.1.3" +
                  "/X-ZXRocmVl/es2022/three-conic-polygon-geometry.bundle.mjs";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800" +
                  "&family=IBM+Plex+Mono:wght@400;500&display=swap";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
// El subset «latin» cubre todo lo que usa el prototipo: U+0000-00FF (acentos
// del español), U+2000-206F (raya, puntos suspensivos) y U+2212 (el menos de
// la leyenda). «latin-ext» solo añade caracteres centroeuropeos que no
// aparecen, y duplicaría el peso de las tipografías. Las flechas (→ ← ⊕) no
// están en ningún subset y caen en la fuente del sistema, igual que en la
// versión servida por CDN.
const SUBSETS = ["latin"];

const kb = n => (n / 1024).toFixed(1).padStart(7) + " KB";

// En redes con inspección TLS, node no conoce la CA corporativa y falla al
// descargar. Node sabe leer el almacén de certificados del sistema, pero solo
// si la bandera está puesta al arrancar el proceso, así que el script se
// relanza a sí mismo una vez con ella en lugar de obligar a recordarla.
const ERR_CERT = new Set(["UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "DEPTH_ZERO_SELF_SIGNED_CERT"]);

function relanzarConCaDelSistema(err) {
  if (process.env.PS_REEXEC || !ERR_CERT.has(err?.cause?.code)) return;
  console.log("  (CA corporativa: reintentando con --use-system-ca)");
  const r = spawnSync(process.execPath,
    ["--use-system-ca", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, PS_REEXEC: "1" } });
  process.exit(r.status ?? 1);
}

async function grab(url, name, binary = false) {
  const file = join(CACHE, name);
  if (existsSync(file)) return readFile(file, binary ? null : "utf8");
  let r;
  try {
    r = await fetch(url, { headers: { "User-Agent": UA } });
  } catch (err) {
    relanzarConCaDelSistema(err);   // si relanza, no vuelve de aquí
    throw err;
  }
  if (!r.ok) throw new Error(`${r.status} al descargar ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(CACHE, { recursive: true });
  await writeFile(file, buf);
  return binary ? buf : buf.toString("utf8");
}

// -------- tipografías: se quedan los subsets latinos y cada woff2 se
// incrusta como data URI dentro del propio @font-face.
async function inlineFonts() {
  const css = await grab(FONTS_URL, "fonts.css");
  const bloques = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  const out = [];
  let bytes = 0;
  for (const [, subset, bloque] of bloques) {
    if (!SUBSETS.includes(subset)) continue;
    const url = bloque.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;
    const woff2 = await grab(url, url.split("/").pop(), true);
    bytes += woff2.length;
    out.push(bloque.replace(url, `data:font/woff2;base64,${woff2.toString("base64")}`));
  }
  console.log(`  tipografías  ${kb(bytes)}  (${out.length} de ${bloques.length} caras, subsets ${SUBSETS.join(" + ")})`);
  return out.join("\n");
}

// -------- arranque: resuelve los import a blob URLs y sirve los JSON
// interceptando fetch(). Se inyecta al final del <body>.
const BOOTSTRAP = `
(async () => {
  const txt = id => document.getElementById(id).textContent;
  const blob = code => URL.createObjectURL(new Blob([code], { type: "text/javascript" }));

  // los datos viajan en <script type="application/json">: se devuelven como
  // si vinieran de la red, así main.js no necesita ningún cambio
  const real = window.fetch.bind(window);
  window.fetch = (input, ...rest) => {
    const m = typeof input === "string" && input.match(/^data\\/([\\w-]+)\\.json$/);
    const el = m && document.getElementById("d-" + m[1]);
    return el
      ? Promise.resolve(new Response(el.textContent,
          { headers: { "Content-Type": "application/json" } }))
      : real(input, ...rest);
  };

  // el especificador largo primero: "three-conic…" también empieza por "three"
  const three = blob(txt("src-three"));
  const conic = blob(txt("src-conic")
    .replace(/(from\\s*)(["'])three\\2/g, \`$1"\${three}"\`));
  // módulos propios: el import relativo de main.js no resolvería desde una
  // blob URL (su base es blob:), así que también se sustituyen por sus blobs.
  // tour.js importa i18n.js, así que se construye DESPUÉS de tener su blob.
  const i18n = blob(txt("src-i18n"));
  const tour = blob(txt("src-tour")
    .replace(/(from\\s*)(["'])\\.\\/i18n\\.js\\2/g, \`$1"\${i18n}"\`));
  await import(blob(txt("src-main")
    .replace(/(from\\s*)(["'])\\.\\/i18n\\.js\\2/g, \`$1"\${i18n}"\`)
    .replace(/(from\\s*)(["'])\\.\\/tour\\.js\\2/g, \`$1"\${tour}"\`)
    .replace(/(from\\s*)(["'])three-conic-polygon-geometry\\2/g, \`$1"\${conic}"\`)
    .replace(/(from\\s*)(["'])three\\2/g, \`$1"\${three}"\`)));
})();`;

// ------------------------------------------------------------------ build
console.log("Pacific Strata → HTML autocontenido\n");

const [html, main, i18n, tour, three, conic, fontCss] = await Promise.all([
  readFile(join(WEB, "index.html"), "utf8"),
  readFile(join(WEB, "main.js"), "utf8"),
  readFile(join(WEB, "i18n.js"), "utf8"),
  readFile(join(WEB, "tour.js"), "utf8"),
  grab(THREE_URL, "three.module.js"),
  grab(CONIC_URL, "conic.bundle.mjs"),
  inlineFonts(),
]);
const datos = Object.fromEntries(await Promise.all(
  DATA.map(async n => [n, await readFile(join(WEB, "data", `${n}.json`), "utf8")])));

console.log(`  three.js     ${kb(three.length)}`);
console.log(`  conic        ${kb(conic.length)}`);
console.log(`  datos        ${kb(Object.values(datos).reduce((a, s) => a + s.length, 0))}`);
console.log(`  main.js      ${kb(main.length)}`);
console.log(`  i18n.js      ${kb(i18n.length)}`);
console.log(`  tour.js      ${kb(tour.length)}`);

// ningún archivo contiene "</script"; se comprueba por si cambian las versiones
for (const [nombre, src] of [["three.js", three], ["conic", conic], ["main.js", main], ["i18n.js", i18n], ["tour.js", tour],
                             ...Object.entries(datos)]) {
  if (/<\/script/i.test(src)) throw new Error(
    `${nombre} contiene "</script": habría que escaparlo o pasar a base64`);
}

const tag = (id, tipo, cuerpo) =>
  `<script type="${tipo}" id="${id}">\n${cuerpo}\n</script>`;

// Ojo: el reemplazo se pasa SIEMPRE como función. Como string, las secuencias
// $&, $` y $' del código incrustado se interpretarían como referencias al
// match y multiplicarían el tamaño del archivo.
const incrustado = [
  ...DATA.map(n => tag(`d-${n}`, "application/json", datos[n])),
  tag("src-three", "text/plain", three),
  tag("src-conic", "text/plain", conic),
  tag("src-i18n", "text/plain", i18n),
  tag("src-tour", "text/plain", tour),
  tag("src-main", "text/plain", main),
  `<script>${BOOTSTRAP}\n</script>`,
].join("\n");

let out = html
  // las tipografías pasan a estar incrustadas: fuera preconnect y <link>
  .replace(/\s*<link rel="preconnect"[^>]*>/g, "")
  .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com[^>]*>/, "")
  .replace("<style>", () => `<style>\n${fontCss}\n`)
  // el importmap y el <script src> se sustituyen por las fuentes incrustadas
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, "")
  .replace(/<script type="module" src="main\.js"><\/script>/, () => incrustado)
  .replace("<title>Pacific Strata — prototipo</title>",
           () => "<title>Pacific Strata — prototipo (autocontenido)</title>");

// las sustituciones anteriores tienen que haber ocurrido todas
for (const resto of ['src="main.js"', "importmap", "fonts.googleapis.com"]) {
  if (out.includes(resto)) throw new Error(`el HTML aún contiene «${resto}»`);
}

await mkdir(join(ROOT, "dist"), { recursive: true });
const dest = join(ROOT, "dist", "pacific-strata.html");
await writeFile(dest, out);
console.log(`\n  → dist/pacific-strata.html  ${kb(Buffer.byteLength(out))}`);
