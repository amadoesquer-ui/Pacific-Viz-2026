import geopandas as gpd
from shapely.geometry import LineString
from shapely.ops import split

print("1/4 Cargando datos GeoPackage...")
gdf_eez = gpd.read_file('eez_v12.gpkg')
gdf_lines = gpd.read_file('eez_boundaries_v12.gpkg')

print("2/4 Partiendo polígonos por el Antimeridiano (-180/180)...")
antimeridiano = LineString([(180, -90), (180, 90)])

def partir_antimeridiano(geom):
    if geom is not None and geom.intersects(antimeridiano):
        try:
            return split(geom, antimeridiano)
        except Exception:
            return geom
    return geom

gdf_eez['geometry'] = gdf_eez['geometry'].apply(partir_antimeridiano)

print("3/4 Simplificando geometrías para optimizar peso en web...")
# 0.01 simplifica los vértices para reducir el tamaño de 160MB a unos pocos MB
gdf_eez['geometry'] = gdf_eez['geometry'].simplify(tolerance=0.01, preserve_topology=True)
gdf_lines['geometry'] = gdf_lines['geometry'].simplify(tolerance=0.01, preserve_topology=True)

print("4/4 Guardando archivos GeoJSON para el visor web...")
gdf_eez.to_file('zee_poligonos_web.geojson', driver='GeoJSON')
gdf_lines.to_file('zee_lineas_web.geojson', driver='GeoJSON')

print("¡Proceso terminado exitosamente! Archivos listos para usar en la web.")
