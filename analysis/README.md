# Exploración de datos

`explorar_datos.ipynb` busca ganchos narrativos en `web/data/dataset.json`
para el panel de historia del tablero.

## Correr

```bash
pip install -r requirements.txt
jupyter lab analysis/explorar_datos.ipynb
```

El cuaderno encuentra la raíz del repositorio solo, así que da igual si se
lanza desde `analysis/` o desde la raíz.

Se guarda **con las salidas dentro**: se puede leer entero sin ejecutarlo.

## Qué contiene

| § | |
|---|---|
| 1 | Cobertura, series planas, granularidad y magnitudes implausibles |
| 2 | Theil–Sen, Mann-Kendall y atipicidad robusta |
| 3 | Mínimos y máximos · qué tocó techo en la última medición |
| 4 | Cuánto hace que no se veía un valor así |
| 5 | Tendencia, estabilidad y si el último punto fue atípico |
| 6 | `ficha(pais, indicador)` y `panel(indicador)` — el explorador |
| 7 | Años sincronizados (solo extremos interiores) |
| 8 | Choque y recuperación |
| 9 | Convergencia o divergencia entre países |
| 10 | Correlación entre indicadores |
| 11 | Países atípicos |
| 12–13 | Ganchos narrativos y recomendación |

## Las tres reglas

Salen de mirar estos datos, y saltárselas produce afirmaciones falsas:

1. **«La última medición» no es 2026.** Cada serie termina en un año distinto,
   de 2019 a 2026. Se usa siempre el último valor no nulo y se reporta su año.
2. **Nada de porcentajes sobre anomalías.** En `temp_anomaly`, `sea_level`,
   `rainfall_anomaly` y `surface_temp_anomaly` el cero es una línea base
   convencional: un «−83 %» entre 0.6 °C y 0.1 °C no significa nada.
3. **Un récord en una serie corta no es noticia.** `N_MIN = 8` observaciones
   como mínimo, y `n` siempre a la vista.

## Salidas

`analysis/salida/*.csv` (regenerables; no se versionan):
`resumen_series.csv` es la tabla base, una fila por país × indicador.

## Advertencias que el cuaderno detecta

- La cobertura cae del ~79 % al 14 % entre 2022 y 2026.
- 58 series son planas o casi planas (Kiribati tiene CALCI clavado en 100
  durante 20 años; Samoa Americana, 0.2 t de GEI durante 22).
- El nivel del mar viene redondeado a 0.1 m sobre un rango de 0.3 m: **cuatro
  valores posibles**. La dirección de la tendencia es sólida; la magnitud no.
- Palau declara ~87 t de GEI por cápita, por encima de Qatar (~35 t), el país
  más emisor del mundo. Revisar unidades en la fuente antes de usarlo.
