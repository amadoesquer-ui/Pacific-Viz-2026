# -*- coding: utf-8 -*-
"""
Prepara las geometrías del prototipo Pacific Strata — VERSIÓN CON EEZ OFICIAL.

Entradas:
  1) ne_10m_admin_0_countries.geojson   (Natural Earth, dominio público)
     -> se usa SOLO para land.json (siluetas de tierra firme, sin cambios).
  2) World_EEZ_v12.geojson              (Marine Regions, CC-BY)
     -> https://www.marineregions.org/eez.php
     -> se usa para countries.json y regions.json: ZEE OFICIALES, ya
        delimitadas entre países vecinos por derecho internacional.
        Ya NO se generan buffers ni particiones Voronoi.

Salida (mismo esquema que la versión anterior, compatible con main.js):
  web/data/regions.json    (3 subregiones, EEZ disueltas)
  web/data/countries.json  (22 países/territorios, EEZ oficial)
  web/data/land.json       (siluetas de tierra, para orientación)

Campos esperados en World EEZ v12 (ajustar EEZ_ISO_FIELD/EEZ_NAME_FIELD si tu
descarga trae otros nombres de columna — revisa con:
  python -c "import json;d=json.load(open('World_EEZ_v12.geojson'));print(d['features'][0]['properties'])"
):
  ISO_TER1     -> ISO3 del territorio (ej. "FJI", "PYF", "GUM"...)
  POL_TYPE     -> tipo de régimen ("200NM", "Joint regime", "Overlapping claim"...)

Uso:
  python prepare_geometries_eez.py ne_10m_admin_0_countries.geojson World_EEZ_v12.geojson
"""
import json
import sys
from pathlib import Path

from shapely.geometry import shape, box, mapping, MultiPolygon, Polygon, Point
from shapely.ops import unary_union
from shapely.affinity import translate

# ---------------------------------------------------------------- catálogo
# 22 PICTs con subregión ONU M49. Clave = ISO3 usado en World EEZ v12.
CATALOG = {
    # --- Melanesia
    "FJI": ("Fiji",                          "Melanesia"),
    "PNG": ("Papua New Guinea",               "Melanesia"),
    "SLB": ("Solomon Islands",                "Melanesia"),
    "VUT": ("Vanuatu",                        "Melanesia"),
    "NCL": ("New Caledonia",                  "Melanesia"),
    # --- Polinesia
    "WSM": ("Samoa",                          "Polynesia"),
    "ASM": ("American Samoa",                 "Polynesia"),
    "TON": ("Tonga",                          "Polynesia"),
    "TUV": ("Tuvalu",                         "Polynesia"),
    "COK": ("Cook Islands",                   "Polynesia"),
    "NIU": ("Niue",                           "Polynesia"),
    "TKL": ("Tokelau",                        "Polynesia"),
    "WLF": ("Wallis and Futuna",              "Polynesia"),
    "PYF": ("French Polynesia",               "Polynesia"),
    "PCN": ("Pitcairn Islands",               "Polynesia"),
    # --- Micronesia
    "FSM": ("Federated States of Micronesia", "Micronesia"),
    "PLW": ("Palau",                          "Micronesia"),
    "MHL": ("Marshall Islands",               "Micronesia"),
    "KIR": ("Kiribati",                       "Micronesia"),
    "NRU": ("Nauru",                          "Micronesia"),
    "GUM": ("Guam",                           "Micronesia"),
    "MNP": ("Northern Mariana Islands",       "Micronesia"),
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

# Nombre de campo ISO3 en tu descarga de World EEZ v12. Verifica con el
# comando del docstring; versiones antiguas usaban "ISO_Ter1" o "Iso_Ter1".
EEZ_ISO_FIELD = "ISO_TER1"
# Si el territorio no tiene ISO_TER1 (raro) probar con SOVEREIGN/ISO_SOV1.
EEZ_ISO_FALLBACK = "ISO_SOV1"

# Regímenes que NO queremos (aguas en disputa activa, evitar problemas
# geopolíticos en una viz pública). "Joint regime" se conserva porque
# corresponde a acuerdos formales entre las partes.
EXCLUDE_POL_TYPES = {"Overlapping claim"}

SIMPLIFY_COUNTRY = 0.08   # EEZ oficial ya es más "limpio": simplificar menos
SIMPLIFY_REGION = 0.12
SIMPLIFY_LAND = 0.03
ROUND = 3


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
    if geom.geom_type in ("Polygon", "MultiPolygon"):
        return geom
    if geom.geom_type == "GeometryCollection":
        polys = [g for g in geom.geoms
                 if g.geom_type in ("Polygon", "MultiPolygon")]
        return unary_union(polys) if polys else Polygon()
    return Polygon()


def split_antimeridian(geom):
    west = only_polygons(geom.intersection(box(0, -90, 180, 90)))
    east = only_polygons(geom.intersection(box(180, -90, 360, 90)))
    parts = []
    if not west.is_empty:
        parts.append(west)
    if not east.is_empty:
        parts.append(translate(east, xoff=-360))
    return only_polygons(unary_union(parts))


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
def load_eez_by_iso(eez_path):
    """Lee World EEZ v12 y agrupa (disuelve) geometría por ISO3, ya en
    coordenadas 0-360 para evitar el antimeridiano."""
    raw = json.loads(Path(eez_path).read_text(encoding="utf-8"))
    by_iso = {}
    skipped_pol_types = set()

    for f in raw["features"]:
        p = f["properties"]
        pol_type = p.get("POL_TYPE") or p.get("Pol_type") or ""
        if pol_type in EXCLUDE_POL_TYPES:
            skipped_pol_types.add(pol_type)
            continue

        iso = p.get(EEZ_ISO_FIELD) or p.get(EEZ_ISO_FIELD.title()) \
              or p.get(EEZ_ISO_FALLBACK) or p.get(EEZ_ISO_FALLBACK.title())
        if iso not in CATALOG:
            continue

        geom = to_pacific(shape(f["geometry"]))
        by_iso.setdefault(iso, []).append(geom)

    if skipped_pol_types:
        print(f"  (omitidos por régimen en disputa: {skipped_pol_types})")

    return {iso: unary_union(geoms) for iso, geoms in by_iso.items()}


def main(land_src, eez_src):
    out = Path(__file__).resolve().parent.parent / "web" / "data"
    out.mkdir(parents=True, exist_ok=True)

    # --- land.json: sin cambios, geometría real sin buffer ---
    raw_land = json.loads(Path(land_src).read_text(encoding="utf-8"))
    land_by_iso3_ne = {}
    # Natural Earth usa nombres en inglés; mapeamos vía el CATALOG (nombre->iso)
    name_to_iso = {name: iso for iso, (name, _) in CATALOG.items()}
    for f in raw_land["features"]:
        p = f["properties"]
        name = p.get("NAME_EN") or p.get("NAME")
        if name in name_to_iso:
            land_by_iso3_ne[name_to_iso[name]] = to_pacific(shape(f["geometry"]))

    # Tokelau sintético para land.json (no existe como feature en NE)
    TOKELAU_ATOLLS = [(-172.500, -8.55), (-171.850, -9.17), (-171.216, -9.38)]
    land_by_iso3_ne["TKL"] = unary_union(
        [Point(((x + 360) if x < 0 else x), y).buffer(0.05)
         for x, y in TOKELAU_ATOLLS])

    missing_land = set(CATALOG) - set(land_by_iso3_ne)
    if missing_land:
        print(f"  AVISO: sin silueta de tierra para {missing_land} "
              f"(revisar nombres NAME_EN en {land_src})")

    # --- countries.json / regions.json: EEZ oficial, sin buffer ---
    print("Leyendo World EEZ v12…")
    eez_by_iso = load_eez_by_iso(eez_src)

    missing_eez = set(CATALOG) - set(eez_by_iso)
    if missing_eez:
        sys.exit(f"Faltan EEZ oficiales para: {missing_eez}\n"
                  f"Revisa el campo ISO en tu descarga (EEZ_ISO_FIELD="
                  f"'{EEZ_ISO_FIELD}') con:\n"
                  f"  python -c \"import json;d=json.load(open('{eez_src}'));"
                  f"print(d['features'][0]['properties'])\"")

    country_feats, land_feats = [], []
    zones_by_region = {"Melanesia": [], "Polynesia": [], "Micronesia": []}

    for iso, (name, region) in CATALOG.items():
        zone = eez_by_iso[iso].simplify(SIMPLIFY_COUNTRY, preserve_topology=True)
        zones_by_region[region].append(zone)
        country_feats.append(feature(
            split_antimeridian(zone),
            {"id": iso, "name": NOMBRE_ES[name], "region": region}))

        land = land_by_iso3_ne.get(iso)
        if land is not None:
            land_simple = land.simplify(SIMPLIFY_LAND, preserve_topology=True)
            if not land_simple.is_empty:
                land_feats.append(feature(split_antimeridian(land_simple),
                                          {"id": iso}))

    print("Disolviendo subregiones (EEZ oficiales, sin cierre morfológico)…")
    region_feats = []
    for region, zones in zones_by_region.items():
        merged = unary_union(zones).simplify(SIMPLIFY_REGION,
                                              preserve_topology=True)
        region_feats.append(feature(
            split_antimeridian(merged),
            {"id": region, "name": REGION_ES[region]}))

    print("Escribiendo salidas:")
    save(out / "regions.json", region_feats)
    save(out / "countries.json", country_feats)
    save(out / "land.json", land_feats)
    print("Listo.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Uso: python prepare_geometries_eez.py "
                  "ne_10m_admin_0_countries.geojson World_EEZ_v12.geojson")
    main(sys.argv[1], sys.argv[2])