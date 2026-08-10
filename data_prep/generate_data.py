# -*- coding: utf-8 -*-
"""
Genera web/data/dataset.json con datos sintéticos.

Por defecto: 10 años -> 10 x 2 x 22 = 440 puntos país
                        + 10 x 2 x 3 = 60 puntos región.
Con --years N genera series largas para ver el efecto "climate stripes"
en los estratos (recomendado N=24 para probar la lectura visual).

Uso:  python generate_data.py [--years N] [--seed S]
"""
import argparse
import json
import math
import random
from pathlib import Path

COUNTRIES = {
    "Melanesia":  ["FJ", "PG", "SB", "VU", "NC"],
    "Polynesia":  ["WS", "AS", "TO", "TV", "CK", "NU", "TK", "WF", "PF", "PN"],
    "Micronesia": ["FM", "PW", "MH", "KI", "NR", "GU", "MP"],
}

INDICATORS = [
    {"id": "temp_anomaly", "name": "Anomalía de temperatura", "unit": "°C",
     "diverging": True},
    {"id": "sea_level", "name": "Nivel del mar (anomalía)", "unit": "mm",
     "diverging": True},
]


def synth_series(rng, years, scale, trend):
    """Serie con tendencia + ruido, estilo anomalía climática."""
    n = len(years)
    base = rng.uniform(-0.3, 0.3) * scale
    out = []
    for i in range(n):
        t = i / max(n - 1, 1)
        val = base + trend * t * scale \
            + math.sin(i * 1.7 + rng.random() * 6) * 0.15 * scale \
            + rng.gauss(0, 0.12 * scale)
        out.append(round(val, 2))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--years", type=int, default=10)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    rng = random.Random(args.seed)
    end = 2024
    years = list(range(end - args.years + 1, end + 1))

    values = {}
    for region, isos in COUNTRIES.items():
        per_indicator_children = {ind["id"]: [] for ind in INDICATORS}
        for iso in isos:
            values[iso] = {}
            for ind in INDICATORS:
                scale = 1.0 if ind["id"] == "temp_anomaly" else 60.0
                serie = synth_series(rng, years, scale, trend=rng.uniform(0.6, 1.4))
                values[iso][ind["id"]] = serie
                per_indicator_children[ind["id"]].append(serie)
        # región = media simple de sus países (declararlo en la UI)
        values[region] = {}
        for ind in INDICATORS:
            series = per_indicator_children[ind["id"]]
            values[region][ind["id"]] = [
                round(sum(s[i] for s in series) / len(series), 2)
                for i in range(len(years))
            ]

    n_country = len(years) * len(INDICATORS) * sum(len(v) for v in COUNTRIES.values())
    n_region = len(years) * len(INDICATORS) * len(COUNTRIES)

    out = Path(__file__).resolve().parent.parent / "web" / "data" / "dataset.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "meta": {
            "synthetic": True,
            "aggregation": "media simple de países",
            "years": years,
            "indicators": INDICATORS,
        },
        "values": values,
    }
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    print(f"dataset.json escrito: {n_country} puntos país + {n_region} puntos "
          f"región, años {years[0]}–{years[-1]}")


if __name__ == "__main__":
    main()
