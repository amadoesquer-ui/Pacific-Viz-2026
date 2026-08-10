# Pacific Strata — prototipo

Globo 3D inclinado con las pseudo-ZEE del Pacífico extruidas como pilas de
estratos anuales: **grosor uniforme por año, color por valor** (inspiración:
climate stripes). Al hacer clic, los estratos de la pila se separan (la capa
base queda pegada al globo); el control «Separación de estratos» va de
*volumen* (losas pegadas) a *estratos* (losas separadas), y «Grosor de
estratos» regula el grosor de cada losa (al máximo, las capas se tocan).

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

## Regenerar datos

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install shapely

# 1) Geometrías (descarga Natural Earth 10m una vez, ~13 MB)
curl.exe -L -o ne10.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
python data_prep\prepare_geometries.py ne10.geojson

# 2) Dataset sintético — 10 años por defecto (440 + 60 puntos)
python data_prep\generate_data.py

# Para evaluar la lectura tipo "stripes" con series largas:
python data_prep\generate_data.py --years 24
```

## Interacción

| Acción | Efecto |
|---|---|
| Arrastrar | girar el globo libremente sobre su propio centro |
| «⊕ alinear norte» (botón) | enderezar el eje norte-sur con animación |
| Clic central (rueda) / dos dedos | mover el globo (X/Y/Z) |
| Rueda | acercar y alejar |
| Clic en un polígono | separar los estratos (la capa base no se mueve) y abrir el panel |
| Clic fuera / `Esc` | soltar |
| «Ver países…» (panel) | bajar al nivel país de esa subregión |
| «← Pacífico» (miga) | volver al nivel subregiones |
| Slider «Separación» | solo la pila seleccionada; 10 %–150 % del paso |
| Slider «Grosor» | solo la pila seleccionada; al máximo las capas se tocan |
| (sin selección) | todas las pilas: separación 0 y grosor mínimo (15 %) |

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
