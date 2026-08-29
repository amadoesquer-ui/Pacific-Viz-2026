import json
import shapely.geometry
import shapely.ops
from shapely.geometry import box, MultiPolygon, Polygon
import geopandas as gpd

print("1/5 Cargando dataset.json y GeoJSON oficial de ZEE...")
with open('web/data/dataset.json', 'r', encoding='utf-8') as f:
    dataset = json.load(f)

# IDs válidos esperados por main.js
valid_region_ids = set(dataset['meta']['regions'].keys())
valid_country_ids = set(dataset['meta']['countries'].keys())

# Cargar Marine Regions ZEE (asegúrate de que el nombre coincida)
gdf_raw = gpd.read_file('zee_poligonos_web.geojson')

print("2/5 Mapeando atributos y filtrando zona del Pacífico...")
# Mapeo de columnas de Marine Regions a id, name y region
# Si las columnas de tu GeoJSON tienen otros nombres (ej. MRGID), ajusta aquí:
if 'ISO_TER1' in gdf_raw.columns:
    gdf_raw['id'] = gdf_raw['ISO_TER1']
elif 'MRGID' in gdf_raw.columns:
    gdf_raw['id'] = gdf_raw['MRGID'].astype(str)
else:
    gdf_raw['id'] = gdf_raw.index.astype(str)

gdf_raw['name'] = gdf_raw.get('GEONAME', gdf_raw.get('TERRITORY1', 'Desconocido'))

# Asignar subregión del Pacífico según metadata de dataset.json
country_to_region = {}
for r_id, r_info in dataset['meta']['regions'].items():
    for c_id in r_info.get('countries', []):
        country_to_region[c_id] = r_id

gdf_raw['region'] = gdf_raw['id'].map(country_to_region).fillna('melanesia')

print("3/5 Simplificando geometrías (respetando CURV y rendimiento)...")
gdf_raw['geometry'] = gdf_raw['geometry'].simplify(tolerance=0.08, preserve_topology=True)

print("4/5 Procesando división en el Antimeridiano (lon=180)...")
def split_antimeridian(geom):
    """Corta geometrías que cruzan el antimeridiano lon=180 para three-conic-polygon-geometry."""
    if geom is None or geom.is_empty:
        return None
    # Cortar en el meridiano 180 usando dos cajas (-180 a 180)
    left_box = box(-180, -90, 180, 90)
    return geom.intersection(left_box)

gdf_raw['geometry'] = gdf_raw['geometry'].apply(split_antimeridian)

print("5/5 Generando regions.json y countries.json...")

# 1. Archivo de Países (countries.json)
countries_gdf = gdf_raw[['id', 'name', 'region', 'geometry']].copy()
countries_gdf.to_file('web/data/countries.json', driver='GeoJSON')

# 2. Archivo de Subregiones ONU M49 disueltas (regions.json)
regions_gdf = gdf_raw.dissolve(by='region', aggfunc={'name': 'first'}).reset_index()
regions_gdf['id'] = regions_gdf['region']
regions_gdf['name'] = regions_gdf['id'].map(lambda r: dataset['meta']['regions'].get(r, {}).get('name', r.title()))
regions_gdf = regions_gdf[['id', 'name', 'geometry']]
regions_gdf.to_file('web/data/regions.json', driver='GeoJSON')

print("¡Éxito! Archivos 'regions.json' y 'countries.json' creados en web/data/")
