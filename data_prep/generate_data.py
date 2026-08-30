# -*- coding: utf-8 -*-
"""
Lee los CSVs filtrados de .STAT Explorer y genera web/data/dataset.json
con los datos reales y unidades corregidas.

Uso:  python generate_data.py [--years N]
"""
import argparse
import csv
import json
from pathlib import Path

COUNTRIES = {
    "Melanesia":  ["FJ", "PG", "SB", "VU", "NC"],
    "Polynesia":  ["WS", "AS", "TO", "TV", "CK", "NU", "TK", "WF", "PF", "PN"],
    "Micronesia": ["FM", "PW", "MH", "KI", "NR", "GU", "MP"],
}

GEO_MAP = {
    "FJ": "FJ", "PG": "PG", "SB": "SB", "VU": "VU", "NC": "NC",
    "WS": "WS", "AS": "AS", "TO": "TO", "TV": "TV", "CK": "CK",
    "NU": "NU", "TK": "TK", "WF": "WF", "PF": "PF", "PN": "PN",
    "FM": "FM", "PW": "PW", "MH": "MH", "KI": "KI", "NR": "NR",
    "GU": "GU", "MP": "MP", "FSM": "FM"
}

# --- UNIDADES Y NOMBRES CORREGIDOS DE TUS INDICADORES ---
INDICATORS = [
    {"id": "temp_anomaly", "name": "Anomalía temp. marina", "unit": "°C", "diverging": True},
    {"id": "surface_temp_anomaly", "name": "Anomalía temp. superficie", "unit": "°C", "diverging": True},
    {"id": "sea_level", "name": "Nivel del mar (anomalía)", "unit": "m", "diverging": True},
    {"id": "rainfall_anomaly", "name": "Anomalías en precipitaciones", "unit": "mm", "diverging": True},
    {"id": "calci", "name": "Índice CALCI", "unit": "%", "diverging": False},
    {"id": "crop_yield", "name": "Rendimiento agrícola", "unit": "kg/ha", "diverging": False},
    {"id": "env_taxes", "name": "Impuestos ambientales", "unit": "%", "diverging": False},
    {"id": "fisheries", "name": "Gestión pesquera", "unit": "units", "diverging": False},
    {"id": "ghg_emissions", "name": "Emisiones GEI por cápita", "unit": "t", "diverging": False},
    {"id": "livestock_yield", "name": "Rendimiento ganadero", "unit": "kg/animal", "diverging": False},
    {"id": "met_network", "name": "Red meteorológica", "unit": "units", "diverging": False},
    {"id": "power_gen", "name": "Generación de energía", "unit": "GWh", "diverging": False},
    {"id": "tourism", "name": "Llegada de turistas", "unit": "units", "diverging": False},
]


def load_filtered_csv(filepath, ind_type="sea_level"):
    data = {}
    if not filepath or not filepath.exists():
        if filepath:
            print(f"[Advertencia] No se encontró el archivo: {filepath.name}")
        return data

    with open(filepath, mode="r", encoding="utf-8-sig", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            geo = row.get("GEO_PICT", "").strip().upper()
            year_raw = row.get("TIME_PERIOD", "").strip()
            val_raw = row.get("OBS_VALUE", "").strip()

            iso = GEO_MAP.get(geo)

            if iso and year_raw.isdigit() and val_raw != "":
                yr = int(year_raw)
                
                # Ignorar datos antiguos anteriores a 2000
                if yr < 2000:
                    continue

                val_clean = val_raw.replace(",", ".")
                try:
                    val = float(val_clean)

                    # Filtros de seguridad para evitar picos aberrantes de lectura
                    if ind_type in ["temp_anomaly", "surface_temp_anomaly"] and (val < -10 or val > 10):
                        continue
                    
                    if iso not in data:
                        data[iso] = {}
                    data[iso][yr] = round(val, 2)
                except ValueError:
                    pass
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, default=24)
    args = ap.parse_args()

    base_dir = Path(__file__).resolve().parent

    files = {
        "sea_level": base_dir / "Sea Level Anomalies.csv",
        "temp_anomaly": base_dir / "Sea Surface Temperature anomalies.csv",
        "surface_temp_anomaly": base_dir / "Surface Temperature anomalies.csv",
        "rainfall_anomaly": base_dir / "Precipitation Anomalies.csv",
        "calci": base_dir / "Climate Altering Land Cover Index (CALCI).csv",
        "crop_yield": base_dir / "Crop Yield.csv",
        "env_taxes": base_dir / "Environmental Taxes.csv",
        "fisheries": base_dir / "Fisheries management.csv",
        "ghg_emissions": base_dir / "Greenhouse gaz.csv",
        "livestock_yield": base_dir / "Livestock Yield.csv",
        "met_network": base_dir / "Meteorological monitoring network.csv",
        "power_gen": base_dir / "Power generation.csv",
        "tourism": base_dir / "Tourism Arrivals.csv",
    }

    # Búsqueda alternativa por nombre de archivo si difiere en mayúsculas/minúsculas
    for f in base_dir.glob("*.csv"):
        fname = f.name.lower()
        if "precipitation" in fname and not files["rainfall_anomaly"].exists():
            files["rainfall_anomaly"] = f

    sources = {
        ind_id: load_filtered_csv(path, ind_type=ind_id)
        for ind_id, path in files.items()
    }

    all_years = set()
    for d in sources.values():
        for iso_dict in d.values():
            all_years.update(iso_dict.keys())

    if not all_years:
        print("[Error] No se encontraron datos válidos en la carpeta.")
        return

    sorted_years = sorted(list(all_years))
    years = sorted_years[-args.years:]

    values = {}
    for region, isos in COUNTRIES.items():
        per_indicator_children = {ind["id"]: [] for ind in INDICATORS}

        for iso in isos:
            values[iso] = {}
            for ind in INDICATORS:
                ind_id = ind["id"]
                source = sources.get(ind_id, {})
                iso_data = source.get(iso, {})
                # None, no 0.0: un año sin dato no es un cero. Rellenarlo con
                # cero pintaba un valor falso en la gráfica y en el globo, y
                # obligaba a tratar el 0 como "sin dato" más abajo, con lo que
                # una anomalía de exactamente 0.00 —que es dato real— se perdía.
                serie = [iso_data.get(yr) for yr in years]
                values[iso][ind_id] = serie
                per_indicator_children[ind_id].append(serie)

        # Región = media simple de los países CON dato ese año
        values[region] = {}
        for ind in INDICATORS:
            ind_id = ind["id"]
            series = per_indicator_children[ind_id]
            
            avg_series = []
            for i in range(len(years)):
                valid_vals = [s[i] for s in series if s[i] is not None]
                avg_series.append(
                    round(sum(valid_vals) / len(valid_vals), 2) if valid_vals else None)

            values[region][ind_id] = avg_series

    # Guardar resultado en web/data/dataset.json
    out = base_dir.parent / "web" / "data" / "dataset.json"
    out.parent.mkdir(parents=True, exist_ok=True)

    doc = {
        "meta": {
            "synthetic": False,
            "aggregation": "media simple de países",
            "years": years,
            "indicators": INDICATORS,
        },
        "values": values,
    }

    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"¡dataset.json exportado con éxito! {len(INDICATORS)} indicadores. Años: {years[0]}–{years[-1]}")


if __name__ == "__main__":
    main()