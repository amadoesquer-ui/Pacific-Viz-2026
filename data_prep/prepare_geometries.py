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

# World EEZ v12 trae 2762 polígonos sueltos para estos 22 territorios, pero solo
# 32 de ellos suman el 100,000 % del área: los otros 2730 son astillas de
# topología, de área nula, casi todas en el antimeridiano. Simplificar no las
# quita —Douglas-Peucker adelgaza un anillo pero no lo borra— y cada una acaba
# siendo un polígono extruido más por cada uno de los 24 años, con lo que la
# escena no llegaba ni a construirse. Se descartan por área.
MIN_PART_AREA = 0.001     # grados cuadrados

# Se simplifica SIN preserve_topology y se repara después con buffer(0). Con
# topología preservada, Douglas-Peucker se niega a tocar estas ZEE —multipieza
# y con agujeros— y deja 79 000 vértices por nivel aunque se suba la tolerancia
# a 1°: son 27 veces más de lo necesario, y multiplicados por 24 losas la
# escena no llega a construirse. Sin ella bajan a 2 900 con un error de área
# del 0,28 %, invisible a escala de globo, y las 22 geometrías siguen siendo
# válidas (se comprueba en simplificar()).
SIMPLIFY_COUNTRY = 0.05
SIMPLIFY_REGION = 0.08
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


def simplificar(geom, tol):
    """Douglas-Peucker sin preservar topología, reparando con buffer(0)."""
    out = geom.simplify(tol, preserve_topology=False).buffer(0)
    if out.is_empty or not out.is_valid:      # nunca ha pasado, pero por si
        return geom.simplify(tol, preserve_topology=True)
    return out


def drop_slivers(geom, min_area=MIN_PART_AREA):
    """Quita las partes por debajo de min_area. Devuelve la mayor si no
    quedara ninguna, para no perder nunca un territorio entero."""
    if geom.geom_type == "Polygon":
        return geom
    partes = [g for g in geom.geoms if g.area >= min_area]
    if not partes:
        partes = [max(geom.geoms, key=lambda g: g.area)]
    return unary_union(partes)


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
def _read_eez_records(eez_path):
    """Devuelve (propiedades, geometría shapely) de cada rasgo del EEZ.

    Acepta GeoJSON y también los formatos en los que Marine Regions publica de
    verdad —GeoPackage y shapefile—, que es lo que se descarga del sitio: no
    ofrecen GeoJSON, y convertir los 164 MB a mano solo para volver a leerlos
    era un paso de más que además obligaba a tener ogr2ogr instalado.
    """
    path = Path(eez_path)
    if path.suffix.lower() == ".geojson" or path.suffix.lower() == ".json":
        raw = json.loads(path.read_text(encoding="utf-8"))
        for f in raw["features"]:
            yield f["properties"], shape(f["geometry"])
        return

    try:
        import pyogrio
        from shapely import from_wkb
    except ImportError:
        sys.exit("Para leer .gpkg/.shp hace falta pyogrio:\n"
                 "  pip install pyogrio shapely")

    campos = [EEZ_ISO_FIELD, EEZ_ISO_FALLBACK, "POL_TYPE"]
    meta, _, geoms, valores = pyogrio.raw.read(str(path), columns=campos)
    cols = dict(zip(list(meta["fields"]), valores))
    for i in range(len(geoms)):
        props = {c: cols[c][i] for c in cols}
        yield props, from_wkb(geoms[i])


def load_eez_by_iso(eez_path):
    """Lee World EEZ v12 y agrupa (disuelve) geometría por ISO3, ya en
    coordenadas 0-360 para evitar el antimeridiano."""
    by_iso = {}
    skipped_pol_types = set()

    for p, geom in _read_eez_records(eez_path):
        pol_type = p.get("POL_TYPE") or p.get("Pol_type") or ""
        if pol_type in EXCLUDE_POL_TYPES:
            skipped_pol_types.add(pol_type)
            continue

        iso = p.get(EEZ_ISO_FIELD) or p.get(EEZ_ISO_FIELD.title()) \
              or p.get(EEZ_ISO_FALLBACK) or p.get(EEZ_ISO_FALLBACK.title())
        if iso not in CATALOG:
            continue

        by_iso.setdefault(iso, []).append(to_pacific(geom))

    if skipped_pol_types:
        print(f"  (omitidos por régimen en disputa: {skipped_pol_types})")

    return {iso: drop_slivers(unary_union(geoms))
            for iso, geoms in by_iso.items()}


def main(land_src, eez_src):
    out = Path(__file__).resolve().parent.parent / "web" / "data"
    out.mkdir(parents=True, exist_ok=True)

    # land.json es independiente de las ZEE y ya está generado: se rehace solo
    # si se pasa la fuente de Natural Earth, para no obligar a bajar 13 MB cada
    # vez que se quiere reconstruir countries.json y regions.json.
    if land_src is None:
        print("(sin fuente de tierra: se conserva el land.json existente)")
        return main_eez_only(out, eez_src)

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
        zone = simplificar(eez_by_iso[iso], SIMPLIFY_COUNTRY)
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
        merged = simplificar(drop_slivers(unary_union(zones)), SIMPLIFY_REGION)
        region_feats.append(feature(
            split_antimeridian(merged),
            {"id": region, "name": REGION_ES[region]}))

    print("Escribiendo salidas:")
    save(out / "regions.json", region_feats)
    save(out / "countries.json", country_feats)
    save(out / "land.json", land_feats)
    print("Listo.")


def main_eez_only(out, eez_src):
    """countries.json y regions.json desde la misma fuente, sin tocar land."""
    print("Leyendo World EEZ v12…")
    eez_by_iso = load_eez_by_iso(eez_src)

    missing = set(CATALOG) - set(eez_by_iso)
    if missing:
        sys.exit(f"Faltan EEZ oficiales para: {missing}")

    country_feats = []
    zones_by_region = {"Melanesia": [], "Polynesia": [], "Micronesia": []}
    for iso, (name, region) in CATALOG.items():
        zone = simplificar(eez_by_iso[iso], SIMPLIFY_COUNTRY)
        zones_by_region[region].append(zone)
        country_feats.append(feature(split_antimeridian(zone),
                                     {"id": iso, "name": NOMBRE_ES[name],
                                      "region": region}))

    print("Disolviendo subregiones (misma fuente que los países)…")
    region_feats = []
    for region, zones in zones_by_region.items():
        merged = simplificar(drop_slivers(unary_union(zones)), SIMPLIFY_REGION)
        region_feats.append(feature(split_antimeridian(merged),
                                    {"id": region, "name": REGION_ES[region]}))

    print("Escribiendo salidas:")
    save(out / "regions.json", region_feats)
    save(out / "countries.json", country_feats)
    print("Listo.")


if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) == 2:
        main(args[0], args[1])          # tierra + ZEE
    elif len(args) == 1:
        main(None, args[0])             # solo ZEE, conservando land.json
    else:
        sys.exit(
            "Uso:\n"
            "  python prepare_geometries.py <eez>                 # solo ZEE\n"
            "  python prepare_geometries.py <ne10.geojson> <eez>  # todo\n"
            "\n<eez> acepta .gpkg, .shp o .geojson de World EEZ v12.")