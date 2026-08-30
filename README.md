# Pacific Strata — prototipo

Globo 3D inclinado con las pseudo-ZEE del Pacífico extruidas como pilas de
estratos anuales: **grosor uniforme por año, color por valor** (inspiración:
climate stripes). Al hacer clic, la pila crece (la capa base queda pegada al
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
│  ├─ prepare_geometries.py   # Natural Earth → pseudo-ZEE (regiones, países, tierra)
│  └─ generate_data.py        # dataset sintético (2 indicadores × N años)
└─ web/
   ├─ index.html
   ├─ main.js
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
# → dist\pacific-strata.html  (~1.8 MB), se abre con doble clic
```

Es el único paso: se ejecuta sobre `web/` tal cual está, así que basta con
volver a lanzarlo cada vez que toques `main.js`, `index.html` o los datos.
La primera vez descarga las dependencias (~1 s); después tira de `.cache/` y
tarda ~0,1 s, sin red.

Incrusta three.js, la librería de geometría, los cinco JSON y las tipografías
(subset `latin`, suficiente para el interfaz en español). Verificado abriéndolo
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
pip install shapely

# 1) Geometrías (descarga Natural Earth 10m una vez, ~13 MB)
curl.exe -L -o ne10.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
python data_prep\prepare_geometries.py ne10.geojson

# 2) Mapa base de continentes (Natural Earth 110m, dominio público)
curl.exe -L -o web\data\world.json https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson

# 3) Dataset sintético — 10 años por defecto (440 + 60 puntos)
python data_prep\generate_data.py

# Para evaluar la lectura tipo "stripes" con series largas:
python data_prep\generate_data.py --years 24
```

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
| (sin selección) | todas las pilas: volúmenes macizos de altura `STACK_T` (grosor de losa completo, `THICK_MIN`) |

## Decisiones y límites del prototipo

- **Pseudo-ZEE**: buffers de ~200 mn sobre Natural Earth como *placeholder*
  visual, recortados con una **partición tipo Thiessen/Voronoi** (celdas de
  "costa más cercana", sembradas a lo largo de los litorales): en cada punto
  del mar hay un solo polígono, sin traslapes — equidistancia, como las ZEE
  reales. En producción se sustituyen por **Marine Regions World EEZ v12**
  (CC-BY, requiere atribución) pasando por el mismo pipeline: disolver por
  país y subregión ONU M49 → partir en el antimeridiano → simplificar.
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
- **Valores regionales** = media simple de los países (declarado en el panel);
  en producción decidir ponderación (área ZEE, población…) y declararla.
- Con `--years 24`, si notas carga inicial lenta, baja `CURV.region` de 2.0 a
  3.0 en `main.js` (menos triángulos por losa).
