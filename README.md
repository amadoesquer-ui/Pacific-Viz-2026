# Pacific Strata — prototipo

Globo 3D inclinado con las ZEE del Pacífico extruidas como pilas de estratos
anuales: **grosor uniforme por año, color por valor** (inspiración: climate
stripes). **13 indicadores reales** de .STAT Explorer, 2003–2026, sobre las
**ZEE oficiales** de Marine Regions v12. Interfaz en **español, inglés y
francés**. Al hacer clic, la pila crece (la capa base queda pegada al
globo) y dos controles independientes la gobiernan:

- **«Altura del seleccionado»** — cuánto mide la pila, como múltiplo de las no
  seleccionadas: de **1×** (idéntica a las demás) a **10×**, por defecto **3×**.
- **«Separación de estratos»** — reparte esa altura entre losa y hueco, de
  *volumen* (losas pegadas) a *estratos* (losas finas separadas), **sin
  cambiar la altura total**. Esto es lo que mantiene el anclaje del 1×: si la
  separación añadiera altura, a 1× el seleccionado sobresaldría de las demás.

## Estructura

```
pacific-strata/
├─ data_prep/
│  ├─ prepare_geometries.py   # Natural Earth + World EEZ v12 → regiones, países, tierra
│  ├─ generate_data.py        # 13 CSV de .STAT Explorer → dataset.json
│  └─ *.csv                   # series descargadas de .STAT Explorer
└─ web/
   ├─ index.html
   ├─ main.js
   ├─ i18n.js                 # diccionario ES/EN/FR y motor de traducción
   └─ data/                   # salidas generadas (incluidas ya en esta entrega)
```

## Ejecutar (Windows / PowerShell / VS Code)

Los datos ya vienen generados, así que para ver el prototipo basta servir
`web/` por HTTP (los módulos ES no cargan con `file://`):

```powershell
cd pacific-strata\web
python -m http.server 8000
# abrir http://localhost:8000
```

(O con la extensión **Live Server** de VS Code sobre la carpeta `web/`.)
Requiere internet la primera vez: three.js y three-conic-polygon-geometry se
cargan por CDN (unpkg / esm.sh).

## Compartir como un solo archivo

Para mandarlo por correo o enseñarlo sin internet ni servidor:

```powershell
node tools\build_standalone.mjs
# → dist\pacific-strata.html  (~2.3 MB), se abre con doble clic
```

Es el único paso: se ejecuta sobre `web/` tal cual está, así que basta con
volver a lanzarlo cada vez que toques `main.js`, `index.html` o los datos.
La primera vez descarga las dependencias (~1 s); después tira de `.cache/` y
tarda ~0,1 s, sin red.

Incrusta three.js, la librería de geometría, `i18n.js`, los cinco JSON y las
tipografías (subset `latin`, suficiente para los tres idiomas del interfaz). Verificado abriéndolo
por `file://` con la red del navegador cortada: cero peticiones externas.

El generador **no toca `web/`** ni añade un paso de compilación al proyecto: el
código de `main.js` se incrusta tal cual salvo los especificadores de `import`
—que se resuelven contra blob URLs— y los datos se sirven interceptando
`fetch()`, de modo que la versión suelta y la autocontenida no divergen. Las
descargas se cachean en `.cache/`.

Tras una red corporativa con inspección TLS, `node` no conoce la CA y falla al
descargar; el script lo detecta y se relanza solo con `--use-system-ca`, así
que no hay que pasar ninguna bandera a mano.

## Regenerar datos

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install shapely pyogrio

# 1) ZEE oficiales. Descarga World EEZ v12, variante 0-360 grados
#    (obligatoria: Fiyi, Kiribati y Tuvalu cruzan el antimeridiano) desde
#    https://www.marineregions.org/downloads.php  — CC-BY, exige atribución.
#    Se lee el .gpkg directamente, no hace falta convertir a GeoJSON.
python data_prep\prepare_geometries.py World_EEZ_v12_20231025_0_360\eez_v12_0_360.gpkg

# Para rehacer también land.json (siluetas de tierra, Natural Earth 10m, ~13 MB):
curl.exe -L -o ne10.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
python data_prep\prepare_geometries.py ne10.geojson World_EEZ_v12_20231025_0_360\eez_v12_0_360.gpkg

# 2) Mapa base de continentes (Natural Earth 110m, dominio público)
curl.exe -L -o web\data\world.json https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson

# 3) Dataset a partir de los CSV de .STAT Explorer que hay en data_prep/
#    (24 años por defecto; toma los más recientes de los que haya datos)
python data_prep\generate_data.py
python data_prep\generate_data.py --years 10   # series más cortas
```

La descarga de Marine Regions son 354 MB y está excluida del repo
(`.gitignore`).

## Interacción

| Acción | Efecto |
|---|---|
| Arrastrar | girar el globo libremente sobre su propio centro |
| «⊕ alinear norte» (botón) | meridianos verticales en pantalla (eje N-S al «arriba» de la cámara), conservando la longitud que mira a la cámara |
| Clic central (rueda) / dos dedos | mover el globo (X/Y/Z) |
| Rueda | acercar y alejar |
| Clic en un polígono | separar los estratos (la capa base no se mueve) y abrir el panel |
| Clic fuera / `Esc` | soltar |
| «Ver países…» (panel) | bajar al nivel país de esa subregión |
| «← Pacífico» (miga) | volver al nivel subregiones |
| Slider «Altura» | solo la pila seleccionada; 1× (igual que las demás) – 10×, por defecto 3× |
| Slider «Separación» | solo la pila seleccionada; hueco entre losas, 0 % (volumen macizo) – 85 % del paso, sin alterar la altura total |
| Selector «Tema» | claro / oscuro; repinta interfaz y escena 3D y recuerda la preferencia (`localStorage`; por defecto, la del sistema) |
| Slider «Transparencia» | **todas** las pilas; permite ver los estratos interiores, el mapa y las pilas de detrás |
| Flechas / puntos «Indicadores» | pasar páginas del carrusel; 13 indicadores de 3 en 3 |
| Selector «Idioma» | español / inglés / francés; recuerda la preferencia (`localStorage`; por defecto, la del navegador) |
| Cursor sobre una franja o fila del panel | aísla ese año en la pila: se abre un hueco a ambos lados y se atenúan las demás franjas |
| (sin selección) | todas las pilas: volúmenes macizos de altura `STACK_T` (grosor de losa completo, `THICK_MIN`) |

## Decisiones y límites del prototipo

- **ZEE**: los dos niveles salen de las **ZEE oficiales de Marine Regions World
  EEZ v12** (CC-BY, **requiere atribución**), ya delimitadas entre vecinos por
  derecho internacional. Las subregiones ONU M49 se obtienen disolviendo esas
  mismas ZEE por su código M49: la ONU clasifica por lista de países y no
  publica geometría de subregión.
- **Simplificación sin preservar topología**. Con `preserve_topology=True`,
  Douglas-Peucker se niega a tocar estas ZEE —multipieza y con agujeros— y deja
  79 000 vértices por nivel aunque se suba la tolerancia a 1°; multiplicados por
  las 24 losas, la escena no llegaba a construirse. Sin ella bajan a 2 900 con
  un 0,28 % de error de área, invisible a escala de globo, y se repara con
  `buffer(0)` comprobando validez. Además se descartan las 2 730 astillas de
  área nula que trae el dataset (de 2 762 partes, solo 32 suman el área).
- **Dos rampas**: solo 4 de los 13 indicadores se leen contra un cero con
  significado (anomalías de temperatura marina y de superficie, nivel del mar y
  precipitación) y van sobre una **divergente** RdBu con dominio simétrico. Los
  otros 9 solo crecen y van sobre una **secuencial** viridis en su rango real:
  con la divergente quedaban todos en la mitad cálida y la leyenda anunciaba un
  mínimo negativo inexistente.
- **Cobertura desigual**: los CSV de .STAT no cubren todos los países en todos
  los indicadores — el 26 % de los valores son huecos. Un año sin dato se
  guarda como `null`, **no como cero**: la gráfica corta la línea en el hueco
  en vez de bajar a cero, y en el globo la losa va en un gris que no pertenece
  a ninguna de las dos rampas.
- **Antimeridiano**: todo el wrangling se hace en longitudes 0–360 y se parte
  en lon=180 al exportar, como recomienda `three-conic-polygon-geometry`.
- **Mapa base**: las siluetas de tierra (continentes de Natural Earth 110m en
  `world.json`, dominio público, más el detalle insular de `land.json`) se
  rasterizan a un lienzo equirrectangular y se proyectan como textura de la
  esfera; cada anillo se desenrolla en longitud y se dibuja en tres copias
  desplazadas, así los polígonos que cruzan el antimeridiano no dejan costura.
  (Antes se extruían con `ConicPolygonGeometry` y los dos features que cruzan
  el antimeridiano se rellenaban por el lado largo, cubriendo todo el globo.)
- **Tokelau** no existe como entidad propia en Natural Earth admin-0; se
  inyectan sus tres atolones por coordenadas.
- **Animación sin rebuilds**: cada losa se construye una sola vez;
  levantar/separar anima `mesh.scale` (un escalado uniforme equivale a un
  desplazamiento radial con engrosamiento < 12 %, imperceptible). Con esto el
  costo por frame es ~0 y el prototipo va sobrado incluso en móvil.
- **Valores regionales** = media simple de los países **con dato** (declarado
  en el panel); en producción decidir ponderación (área ZEE, población…) y
  declararla.
- **Traducciones**: `web/i18n.js` tiene 44 claves × 3 idiomas. Las claves de
  indicador son el `id` del dataset, así que un indicador nuevo sin traducir
  cae al `name` que trae el JSON en vez de romper el interfaz.
- Con 24 años, si notas carga inicial lenta, baja `CURV.region` de 2.0 a 3.0 en
  `main.js` (menos triángulos por losa).
