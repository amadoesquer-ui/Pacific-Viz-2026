# -*- coding: utf-8 -*-
"""
Prepara las geometrías del prototipo Pacific Strata.

Entrada : ne_10m_admin_0_countries.geojson (Natural Earth, dominio público)
Salida  : web/data/regions.json    (3 subregiones, pseudo-ZEE disueltas)
          web/data/countries.json  (22 países/territorios, pseudo-ZEE)
          web/data/land.json       (siluetas de tierra, para orientación)

NOTA: los "blobs" son buffers de ~200 mn alrededor de la tierra firme como
APROXIMACIÓN visual de la ZEE. Para que no se traslapen, cada buffer se
recorta con una partición tipo Thiessen/Voronoi (celdas de "costa más
cercana"): se siembran puntos a lo largo de la costa de cada país, se
calcula el Voronoi global y cada país se queda solo con la parte de su
buffer que cae en sus propias celdas — equidistancia, como las ZEE reales.
En producción se reemplazan por Marine Regions World EEZ v12 (CC-BY),
disueltos con este mismo pipeline.

Todo el trabajo se hace en longitudes 0–360 (Pacífico-céntrico) para evitar
el antimeridiano; al exportar se parte en lon=180 y se vuelve a -180..180,
como recomienda three-conic-polygon-geometry.

Uso:  python prepare_geometries.py ruta/al/ne_10m_admin_0_countries.geojson
"""
import json
import sys
from pathlib import Path

from shapely import STRtree
from shapely.geometry import (shape, box, mapping, Point, MultiPoint,
                              MultiPolygon, Polygon)
from shapely.ops import unary_union, voronoi_diagram
from shapely.affinity import translate

# ---------------------------------------------------------------- catálogo
# 22 PICTs con subregión ONU M49.
CATALOG = {
    # --- Melanesia
    "Fiji":                            ("FJ", "Melanesia"),
    "Papua New Guinea":                ("PG", "Melanesia"),
    "Solomon Islands":                 ("SB", "Melanesia"),
    "Vanuatu":                         ("VU", "Melanesia"),
    "New Caledonia":                   ("NC", "Melanesia"),
    # --- Polinesia
    "Samoa":                           ("WS", "Polynesia"),
    "American Samoa":                  ("AS", "Polynesia"),
    "Tonga":                           ("TO", "Polynesia"),
    "Tuvalu":                          ("TV", "Polynesia"),
    "Cook Islands":                    ("CK", "Polynesia"),
    "Niue":                            ("NU", "Polynesia"),
    "Tokelau":                         ("TK", "Polynesia"),
    "Wallis and Futuna":               ("WF", "Polynesia"),
    "French Polynesia":                ("PF", "Polynesia"),
    "Pitcairn Islands":                ("PN", "Polynesia"),
    # --- Micronesia
    "Federated States of Micronesia":  ("FM", "Micronesia"),
    "Palau":                           ("PW", "Micronesia"),
    "Marshall Islands":                ("MH", "Micronesia"),
    "Kiribati":                        ("KI", "Micronesia"),
    "Nauru":                           ("NR", "Micronesia"),
    "Guam":                            ("GU", "Micronesia"),
    "Northern Mariana Islands":        ("MP", "Micronesia"),
}

NOMBRE_ES = {
    "Fiji": "Fiyi", "Papua New Guinea": "Papúa Nueva Guinea",
    "Solomon Islands": "Islas Salomón", "Vanuatu": "Vanuatu",
    "New Caledonia": "Nueva Caledonia", "Samoa": "Samoa",
    "American Samoa": "Samoa Americana", "Tonga": "Tonga",
    "Tuvalu": "Tuvalu", "Cook Islands": "Islas Cook", "Niue": "Niue",
    "Tokelau": "Tokelau", "Wallis and Futuna": "Wallis y Futuna",
    "French Polynesia": "Polinesia Francesa",
    "Pitcairn Islands": "Islas Pitcairn",
    "Federated States of Micronesia": "Micronesia (Est. Federados)",
    "Palau": "Palaos", "Marshall Islands": "Islas Marshall",
    "Kiribati": "Kiribati", "Nauru": "Nauru", "Guam": "Guam",
    "Northern Mariana Islands": "Islas Marianas del Norte",
}

REGION_ES = {"Melanesia": "Melanesia", "Polynesia": "Polinesia",
             "Micronesia": "Micronesia"}

# Tokelau no existe como feature propio en Natural Earth admin-0:
# se inyectan sus tres atolones como puntos.
TOKELAU_ATOLLS = [(-172.500, -8.55), (-171.850, -9.17), (-171.216, -9.38)]

BUFFER_DEG = 3.2      # ~200 mn en el ecuador: pseudo-ZEE
VOR_STEP = 0.5        # paso (°) entre puntos semilla a lo largo de la costa
SIMPLIFY_COUNTRY = 0.18
SIMPLIFY_REGION = 0.25
SIMPLIFY_LAND = 0.03
ROUND = 3             # decimales en la salida


# ---------------------------------------------------------------- helpers
def to_pacific(geom):
    """Longitudes negativas -> +360, para trabajar sin antimeridiano."""
    def shift(g):
        if g.geom_type == "Polygon":
            ext = [((x + 360) if x < 0 else x, y) for x, y in g.exterior.coords]
            ints = [[((x + 360) if x < 0 else x, y) for x, y in r.coords]
                    for r in g.interiors]
            return Polygon(ext, ints)
        return MultiPolygon([shift(p) for p in g.geoms])
    return shift(geom) if geom.geom_type in ("Polygon", "MultiPolygon") else geom


def only_polygons(geom):
    """Descarta restos LineString/Point que deja la intersección."""
    if geom.geom_type == "Polygon":
        return geom
    if geom.geom_type == "MultiPolygon":
        return geom
    if geom.geom_type == "GeometryCollection":
        polys = [g for g in geom.geoms
                 if g.geom_type in ("Polygon", "MultiPolygon")]
        return unary_union(polys) if polys else Polygon()
    return Polygon()


def split_antimeridian(geom):
    """Parte una geometría 0–360 en lon=180 y devuelve lon estándar -180..180."""
    west = only_polygons(geom.intersection(box(0, -90, 180, 90)))
    east = only_polygons(geom.intersection(box(180, -90, 360, 90)))
    parts = []
    if not west.is_empty:
        parts.append(west)
    if not east.is_empty:
        parts.append(translate(east, xoff=-360))
    return only_polygons(unary_union(parts))


def seed_points(geom, step=VOR_STEP):
    """Puntos semilla a lo largo del contorno de la tierra, para el Voronoi."""
    pts = []
    boundary = geom.boundary
    lines = getattr(boundary, "geoms", [boundary])
    for ln in lines:
        if ln.is_empty or ln.length == 0:
            continue
        n = max(4, int(ln.length / step))
        for k in range(n):
            p = ln.interpolate(k / n, normalized=True)
            pts.append(Point(p.x, p.y))
    if not pts:
        pts.append(geom.representative_point())
    return pts


def thiessen_territories(land_by_country):
    """Partición del océano por "costa más cercana" (celdas de Voronoi
    sembradas en las costas, unidas por país). Cada punto del mar pertenece
    a UN solo país, así los buffers recortados nunca se traslapan."""
    seeds, owners = [], []
    for name, land in land_by_country.items():
        for p in seed_points(land):
            seeds.append(p)
            owners.append(name)
    minx, miny, maxx, maxy = unary_union(seeds).bounds
    pad = BUFFER_DEG + 5
    env = box(minx - pad, miny - pad, maxx + pad, maxy + pad)
    cells = voronoi_diagram(MultiPoint(seeds), envelope=env)
    tree = STRtree(seeds)
    by_country = {name: [] for name in land_by_country}
    for cell in cells.geoms:
        # todo punto de una celda tiene como semilla más cercana la propia
        owner = owners[tree.nearest(cell.representative_point())]
        by_country[owner].append(cell)
    return {name: unary_union(cs) for name, cs in by_country.items()}


def rounded(geom, nd=ROUND):
    def r_ring(coords):
        return [(round(x, nd), round(y, nd)) for x, y in coords]
    if geom.geom_type == "Polygon":
        return Polygon(r_ring(geom.exterior.coords),
                       [r_ring(i.coords) for i in geom.interiors])
    return MultiPolygon([rounded(p, nd) for p in geom.geoms])


def feature(geom, props):
    return {"type": "Feature", "properties": props,
            "geometry": mapping(rounded(geom))}


def save(path, features):
    fc = {"type": "FeatureCollection", "features": features}
    path.write_text(json.dumps(fc, separators=(",", ":")), encoding="utf-8")
    print(f"  {path.name:<16} {path.stat().st_size/1024:8.1f} KB  "
          f"({len(features)} features)")


# ---------------------------------------------------------------- pipeline
def main(src):
    out = Path(__file__).resolve().parent.parent / "web" / "data"
    out.mkdir(parents=True, exist_ok=True)

    raw = json.loads(Path(src).read_text(encoding="utf-8"))
    land_by_country = {}
    for f in raw["features"]:
        p = f["properties"]
        name = p.get("NAME_EN") or p.get("NAME")
        if name in CATALOG:
            land_by_country[name] = to_pacific(shape(f["geometry"]))

    # Tokelau sintético (tres atolones puntuales, radio nominal de tierra)
    tk = unary_union([Point(((x + 360) if x < 0 else x), y).buffer(0.05)
                      for x, y in TOKELAU_ATOLLS])
    land_by_country["Tokelau"] = tk

    missing = set(CATALOG) - set(land_by_country)
    if missing:
        sys.exit(f"Faltan geometrías para: {missing}")

    print("Partición tipo Thiessen (Voronoi de costas)…")
    territory = thiessen_territories(land_by_country)

    print("Generando pseudo-ZEE por país (buffer recortado al territorio Voronoi)…")
    country_feats, land_feats = [], []
    zones_by_region = {"Melanesia": [], "Polynesia": [], "Micronesia": []}
    territory_by_region = {"Melanesia": [], "Polynesia": [], "Micronesia": []}

    for name, (iso, region) in CATALOG.items():
        land = land_by_country[name]
        blob = land.buffer(BUFFER_DEG, quad_segs=4) \
                   .simplify(SIMPLIFY_COUNTRY, preserve_topology=True)
        # sin traslapes: cada país conserva solo la parte de su buffer que
        # cae en sus propias celdas (equidistancia entre costas)
        zone = only_polygons(blob.intersection(territory[name]))
        zones_by_region[region].append(zone)
        territory_by_region[region].append(territory[name])
        country_feats.append(feature(
            split_antimeridian(zone),
            {"id": iso, "name": NOMBRE_ES[name], "region": region}))
        land_simple = land.simplify(SIMPLIFY_LAND, preserve_topology=True)
        if not land_simple.is_empty:
            land_feats.append(feature(split_antimeridian(land_simple),
                                      {"id": iso}))

    print("Disolviendo subregiones…")
    region_feats = []
    for region, zones in zones_by_region.items():
        merged = unary_union(zones) \
            .buffer(0.4, quad_segs=2).buffer(-0.4, quad_segs=2) \
            .simplify(SIMPLIFY_REGION, preserve_topology=True)
        # el cierre morfológico puede invadir territorio ajeno:
        # recortar al territorio Voronoi de la propia subregión
        merged = only_polygons(
            merged.intersection(unary_union(territory_by_region[region])))
        region_feats.append(feature(
            split_antimeridian(merged),
            {"id": region, "name": REGION_ES[region]}))

    print("Escribiendo salidas:")
    save(out / "regions.json", region_feats)
    save(out / "countries.json", country_feats)
    save(out / "land.json", land_feats)
    print("Listo.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python prepare_geometries.py ne_10m_admin_0_countries.geojson")
    main(sys.argv[1])
