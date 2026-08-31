/* Pacific Strata — traducciones ES / EN / FR
 *
 * Base tomada de la rama mejora-visualizacion, completada con todo lo que esta
 * rama añadió después (altura, carrusel, tema, rampas, relato) y corregida
 * donde la original describía cosas que ya no son ciertas: no hay slider de
 * grosor, los datos no son sintéticos y solo 4 de los 13 indicadores son
 * térmicos.
 *
 * Las claves de indicador son el id del dataset, así que `t(ind.id)` traduce
 * el nombre del indicador y cae al `ind.name` del JSON si falta la clave.
 */
// El orden del selector: inglés, francés y español al final. El idioma por
// omisión sigue siendo el inglés (lo decide initialLang, no este orden).
export const LANGS = [
  ["en", "English"],
  ["fr", "Français"],
  ["es", "Español"],
];

export const DICT = {
  es: {
    crumb: "Pacífico · subregiones",
    crumb_suffix: "países y territorios",
    crumb_back: "← Pacífico",
    lbl_indicators: "Indicadores",
    lbl_height: "Altura del seleccionado",
    lbl_opacity: "Transparencia de capas",
    lbl_theme: "Tema",
    lbl_lang: "Idioma",
    lbl_scale: "Escala",
    theme_dark: "Oscuro",
    theme_light: "Claro",
    val_equal: "igual",
    val_opaque: "opacas",
    nav_prev: "Indicadores anteriores",
    nav_next: "Indicadores siguientes",
    dots_page: "Página {n} de {total}",
    btn_north: "⊕ alinear norte",
    title_north: "Poner los meridianos verticales",
    btn_drill: "Ver países de la subregión →",
    btn_drill_back: "← Regresar a la subregión",
    region_label: "Subregión",
    note_region: "Agregación: {agg}. ZEE oficial disuelta por subregión M49.",
    note_country: "ZEE oficial (Marine Regions v12).",
    drill_hint_mouse: "o doble clic en la subregión",
    drill_hint_touch: "o doble toque en la subregión",
    badge: "datos .STAT 2003–2026 · ZEE oficial (Marine Regions v12) · CC-BY",
    val_nodata: "sin dato",
    story_prev: "← Anterior",
    story_next: "Siguiente →",
    story_go: "Ir a",
    story_step: "{n} de {total}",

    story_leer_t: "Una columna por lugar, un estrato por año",
    story_leer_b: "<p>Cada polígono es la Zona Económica Exclusiva de un país o de una subregión. Sin seleccionar nada ves un mapa plano: solo el último año con dato.</p><p>Al seleccionar, ese lugar se levanta en veinticuatro estratos, uno por año, de 2003 abajo a 2026 arriba. El color de cada estrato es el valor de ese año. Los años sin medición no se dibujan: dejan el hueco a la vista, porque un hueco no es un cero.</p><p>Ponla de canto contra el horizonte y haz zoom. Ahí es donde se lee la columna.</p>",

    story_nadie_t: "Nadie se enfría",
    story_nadie_b: "<p>En veintitrés años, <b>ningún</b> país del Pacífico registra una tendencia a la baja en temperatura marina ni en nivel del mar. No es que suban todos: muchas series son demasiado cortas o ruidosas para afirmarlo. Es que ninguna baja.</p><p>Doce de veintiún países suben en nivel del mar y cero bajan. Diez de veintiuno en temperatura marina, y cero bajan.</p><p>Papúa Nueva Guinea termina en 2025 en su máximo: <b>1,1 °C</b>. Mira su columna de canto y verás que el rojo gana altura sin volver atrás.</p>",

    story_muesca_t: "La muesca de 2015",
    story_muesca_b: "<p>En 2015, seis países del Pacífico suroccidental tocaron a la vez el mínimo de toda su serie. Fiyi, Vanuatu y Tonga cayeron a <b>−0,1 °C</b>; Niue a cero. El año anterior y el siguiente rondaban 0,3–0,5.</p><p>En Fiyi está fijado 2015: es el único estrato azul de la columna, un corte limpio entre veintitrés años cálidos. Cambia a Vanuatu y a Tonga: la misma muesca, el mismo año.</p><p>Coincide con El Niño de 2015-16. El tablero no lo demuestra —esa comprobación no está hecha—, pero es la pregunta que deja abierta.</p>",

    story_turismo_t: "El mismo golpe, destinos opuestos",
    story_turismo_b: "<p>Todos los destinos del Pacífico se desplomaron entre 2020 y 2021. Tonga pasó de 94.000 visitantes a <b>200</b>.</p><p>La salida no se parece en nada. Fiyi ha vuelto al 88 % de su máximo y la Polinesia Francesa al 93 %. Nueva Caledonia está en el <b>9 %</b>, y además cayendo: 138.748 en 2022, 125.097 en 2023, 59.399 en 2024.</p><p>Mira la columna de Nueva Caledonia de canto: el hueco de 2020-2021 la parte en dos y lo que viene después no la vuelve a levantar. Compárala con Fiyi, que sí se recompone.</p>",

    story_huecos_t: "Los huecos también son dato",
    story_huecos_b: "<p>Mira cualquier columna con el Índice CALCI: los cuatro estratos de arriba no existen. La serie se corta en 2022 para los veintidós países a la vez.</p><p>No es un fallo del tablero. La cobertura del conjunto cae del <b>79 % en 2022 al 14 % en 2026</b>: los años recientes están casi vacíos. Con Impuestos ambientales el corte es aún antes, en 2020, y faltan seis estratos.</p><p>Por eso los años sin dato se dejan invisibles en vez de pintarlos de cero. Lo que no se midió tiene que verse que no se midió.</p>",

    story_metodo_t: "Metodología y análisis",
    story_metodo_b: "<p>Cada estrato es una losa temporal sobre la Zona Económica Exclusiva. La altura de la pila seleccionada es un multiplicador visual (1× a 10×), no una magnitud: lo que codifica el dato es el <b>color</b> de cada estrato, no su grosor.</p><p><b>Fuentes.</b> Las series proceden de .STAT Explorer y cubren 2003–2026. Las ZEE son las oficiales de Marine Regions v12 (CC-BY). Las subregiones ONU M49 —Melanesia, Polinesia, Micronesia— se obtienen disolviendo esas mismas ZEE por su código M49: la ONU clasifica por lista de países, no publica geometría. El valor de una subregión es la media simple de sus países.</p><p><b>Escalas.</b> Las cuatro anomalías —temperatura marina y de superficie, nivel del mar y precipitación— se pintan sobre una rampa divergente centrada en cero. El resto, sobre una rampa secuencial en su rango real.</p><p><b>Qué no hay que creerse.</b> Tres cosas que este relato deja fuera a propósito, y que el cuaderno de análisis documenta:</p><p>· <b>Gestión pesquera sube en 21 de 22 países.</b> Es el número más llamativo del conjunto y no significa nada: la serie solo crece o se queda igual, nunca baja, y se estanca cuando deja de reportarse. Es un recuento acumulado de medidas adoptadas, no una medición del estado del mar. Una tendencia al alza en algo que no puede bajar no es un hallazgo.</p><p>· <b>Récord en generación eléctrica en nueve países.</b> Los nueve son de 2023, y la serie entera acaba en 2023. En algo que crece, el último dato es el máximo casi siempre. Sin años posteriores no se distingue un récord del final del registro.</p><p>· <b>Nivel del mar.</b> Viene redondeado a 0,1 m sobre un rango total de 0,3 m: cuatro valores posibles. La dirección de la tendencia aguanta; la magnitud no, y comparar países entre sí tampoco.</p><p>También hay 58 series planas o casi planas —Kiribati tiene el CALCI clavado en 100 durante veinte años— y alguna magnitud imposible: Palaos declara unas 87 t de gases de efecto invernadero por habitante, por encima de Qatar (~35 t), el país más emisor del mundo. Casi seguro es un problema de unidades en la fuente.</p><p>El análisis completo, con el código que produce estos números, está en <b>analysis/explorar_datos.ipynb</b>.</p>",
    story_title: "Relato",
    tab_data: "Datos",
    tab_ctrl: "Controles",
    btn_story: "Historia",
    btn_dock: "Datos y controles",
    toggle_story: "Mostrar u ocultar el relato",
    toggle_dock: "Mostrar u ocultar datos y controles",
    chart_empty: "Selecciona una subregión o un país en el globo",
    chart_nodata: "Sin datos de este indicador para {who}",

    temp_anomaly: "Anomalía temp. marina",
    surface_temp_anomaly: "Anomalía temp. superficie",
    sea_level: "Nivel del mar (anomalía)",
    rainfall_anomaly: "Anomalías en precipitaciones",
    calci: "Índice CALCI",
    crop_yield: "Rendimiento agrícola",
    env_taxes: "Impuestos ambientales",
    fisheries: "Gestión pesquera",
    ghg_emissions: "Emisiones GEI por cápita",
    livestock_yield: "Rendimiento ganadero",
    met_network: "Red meteorológica",
    power_gen: "Generación de energía",
    tourism: "Llegada de turistas",

    // -------------------------------------------------------------- tutorial
    tour_btn: "Tutorial",
    tour_title: "Cómo se usa este tablero",
    tour_step: "Paso {n} de {total}",
    tour_next: "Siguiente",
    tour_prev: "Anterior",
    tour_done: "Entendido",
    tour_skip: "Saltar el tutorial",
    tour_mouse: "Con ratón",
    tour_touch: "Con el dedo",

    tour_bienvenida_t: "Un globo hecho de años",
    tour_bienvenida_b: "Cada país y cada subregión del Pacífico es un polígono sobre el globo. Al seleccionar uno se levanta en un estrato por año, coloreado según el valor de ese año. Los años sin dato se dejan invisibles, con el hueco a la vista.",

    tour_girar_t: "Girar el globo",
    tour_girar_b: "Arrastra con un dedo para girar el globo.",
    tour_girar_raton: "Arrastra con el botón izquierdo",
    tour_girar_dedo: "Arrastra con un dedo",

    tour_zoom_t: "Acercar y alejar",
    tour_zoom_b: "Acerca y aleja el globo. Consejo: coloca los países en el horizonte y acércate para ver el detalle de cada estrato.",
    tour_zoom_raton: "Gira la rueda",
    tour_zoom_dedo: "Pellizca con dos dedos",

    tour_mover_t: "Desplazar el globo",
    tour_mover_b: "Desplaza el globo para colocarlo donde mejor te convenga.",
    tour_mover_raton: "Arrastra con la rueda pulsada (botón central)",
    tour_mover_dedo: "Arrastra con dos dedos a la vez",

    tour_seleccionar_t: "Seleccionar un lugar",
    tour_seleccionar_b: "Selecciona un lugar y se levanta para ver los datos en sus costados. Haz clic en el mar para quitar la selección.",
    tour_seleccionar_raton: "Un clic sobre el polígono",
    tour_seleccionar_dedo: "Un toque sobre el polígono",

    tour_profundizar_t: "Bajar a los países",
    tour_profundizar_b: "Haz doble clic en una región para ver los países que contiene. Vuelve a las regiones con el botón del panel o con «Pacífico», en la esquina superior izquierda de la visualización.",
    tour_profundizar_raton: "Doble clic sobre una subregión",
    tour_profundizar_dedo: "Doble toque sobre una subregión",

    tour_norte_t: "Alinear el norte",
    tour_norte_b: "Endereza el globo, con el polo norte arriba.",

    tour_indicadores_t: "Elegir el indicador",
    tour_indicadores_b: "Trece indicadores. Al cambiar de uno a otro se recolorean todos los estratos y se redibuja la gráfica. La escala de color va al final del panel de controles.",

    tour_grafica_t: "La serie, año por año",
    tour_grafica_b: "Al señalar un año se resalta su estrato en el globo. <b>Un clic fija ese año</b> y el resaltado se queda aunque muevas el puntero o cierres el panel: es la forma de mirar un año concreto en la pila. Otro clic lo suelta.",
    tour_grafica_raton: "Señala un punto · clic para fijarlo",
    tour_grafica_dedo: "Toca un punto para fijarlo",

    tour_controles_t: "Altura, transparencia y tema",
    tour_controles_b: "La <b>altura</b> multiplica la pila seleccionada, de 1× (plana, como las demás) a 10×. La <b>transparencia</b> deja ver los estratos de abajo. El <b>tema</b> cambia entre claro y oscuro.",

    tour_relato_t: "El relato",
    tour_relato_b: "Un recorrido guiado por lo que cuentan los datos, paso a paso. Se puede cerrar y volver a abrir cuando quieras.",

    tour_final_t: "Ya está",
    tour_final_b: "El tablero habla inglés, francés y español: se cambia aquí. Puedes repetir este tutorial cuando quieras con el botón <b>?</b> de esta misma esquina.",
  },

  en: {
    crumb: "Pacific · subregions",
    crumb_suffix: "countries & territories",
    crumb_back: "← Pacific",
    lbl_indicators: "Indicators",
    lbl_height: "Height of selection",
    lbl_opacity: "Layer transparency",
    lbl_theme: "Theme",
    lbl_lang: "Language",
    lbl_scale: "Scale",
    theme_dark: "Dark",
    theme_light: "Light",
    val_equal: "same",
    val_opaque: "opaque",
    nav_prev: "Previous indicators",
    nav_next: "Next indicators",
    dots_page: "Page {n} of {total}",
    btn_north: "⊕ align north",
    title_north: "Make meridians vertical",
    btn_drill: "View subregion countries →",
    btn_drill_back: "← Back to the subregion",
    region_label: "Subregion",
    note_region: "Aggregation: {agg}. Official EEZ dissolved by M49 subregion.",
    note_country: "Official EEZ (Marine Regions v12).",
    drill_hint_mouse: "or double-click the subregion",
    drill_hint_touch: "or double-tap the subregion",
    badge: ".STAT data 2003–2026 · official EEZ (Marine Regions v12) · CC-BY",
    val_nodata: "no data",
    story_prev: "← Previous",
    story_next: "Next →",
    story_go: "Go to",
    story_step: "{n} of {total}",

    story_leer_t: "One column per place, one stratum per year",
    story_leer_b: "<p>Each polygon is the Exclusive Economic Zone of a country or a subregion. With nothing selected you see a flat map: only the most recent year with data.</p><p>Select one and that place rises into twenty-four strata, one per year, 2003 at the bottom and 2026 at the top. Each stratum is coloured by that year\u2019s value. Years with no measurement are not drawn: they leave the gap showing, because a gap is not a zero.</p><p>Put the column edge-on against the horizon and zoom in. That is where you read it.</p>",

    story_nadie_t: "Nobody is cooling",
    story_nadie_b: "<p>Across twenty-three years, <b>no</b> Pacific country shows a downward trend in sea temperature or sea level. It is not that they all rise: many series are too short or too noisy to say so. It is that none falls.</p><p>Twelve of twenty-one countries rise in sea level and zero fall. Ten of twenty-one in sea temperature, and zero fall.</p><p>Papua New Guinea ends 2025 at its all-time high: <b>1.1 °C</b>. Look at its column edge-on and the red gains height without turning back.</p>",

    story_muesca_t: "The 2015 notch",
    story_muesca_b: "<p>In 2015, six countries of the southwestern Pacific hit the minimum of their entire series in the same year. Fiji, Vanuatu and Tonga dropped to <b>−0.1 °C</b>; Niue to zero. The years either side sat around 0.3–0.5.</p><p>2015 is pinned on Fiji: it is the only blue stratum in the column, a clean cut through twenty-three warm years. Switch to Vanuatu and Tonga — the same notch, the same year.</p><p>It coincides with the 2015-16 El Niño. The dashboard does not prove that; the test has not been run. It is the question it leaves open.</p>",

    story_turismo_t: "The same blow, opposite fates",
    story_turismo_b: "<p>Every Pacific destination collapsed between 2020 and 2021. Tonga went from 94,000 visitors to <b>200</b>.</p><p>The way out looks nothing alike. Fiji is back to 88 % of its peak and French Polynesia to 93 %. New Caledonia sits at <b>9 %</b>, and still falling: 138,748 in 2022, 125,097 in 2023, 59,399 in 2024.</p><p>Look at New Caledonia edge-on: the 2020-2021 gap splits the column in two and what follows never builds it back. Compare it with Fiji, which does recover.</p>",

    story_huecos_t: "The gaps are data too",
    story_huecos_b: "<p>Look at any column with the CALCI Index: the top four strata are not there. The series stops in 2022 for all twenty-two countries at once.</p><p>This is not a fault in the dashboard. Coverage of the dataset falls from <b>79 % in 2022 to 14 % in 2026</b>: the recent years are nearly empty. With Environmental taxes the cut comes earlier still, in 2020, and six strata are missing.</p><p>That is why years with no data are left invisible instead of painted as zero. What was not measured has to look unmeasured.</p>",

    story_metodo_t: "Method and analysis",
    story_metodo_b: "<p>Each stratum is a time slab over the Exclusive Economic Zone. The height of the selected stack is a visual multiplier (1× to 10×), not a magnitude: what encodes the data is the <b>colour</b> of each stratum, not its thickness.</p><p><b>Sources.</b> The series come from .STAT Explorer and cover 2003–2026. The EEZs are the official ones from Marine Regions v12 (CC-BY). The UN M49 subregions — Melanesia, Polynesia, Micronesia — are obtained by dissolving those same EEZs by their M49 code: the UN classifies by list of countries and publishes no geometry. A subregion\u2019s value is the simple mean of its countries.</p><p><b>Scales.</b> The four anomalies — sea and surface temperature, sea level and rainfall — are painted on a diverging ramp centred on zero. The rest use a sequential ramp over their real range.</p><p><b>What not to believe.</b> Three things this story leaves out on purpose, all documented in the analysis notebook:</p><p>· <b>Fisheries management rises in 21 of 22 countries.</b> It is the most striking number in the dataset and it means nothing: the series only ever grows or holds, never falls, and plateaus when reporting stops. It is a cumulative count of measures adopted, not a measurement of the sea. A rising trend in something that cannot fall is not a finding.</p><p>· <b>Record power generation in nine countries.</b> All nine are from 2023, and the whole series ends in 2023. In something that grows, the last point is almost always the maximum. Without later years you cannot tell a record from the end of the record.</p><p>· <b>Sea level.</b> It arrives rounded to 0.1 m over a total range of 0.3 m: four possible values. The direction of the trend holds; the magnitude does not, and neither does comparing countries with each other.</p><p>There are also 58 flat or nearly flat series — Kiribati has CALCI pinned at 100 for twenty years — and the odd impossible magnitude: Palau reports about 87 t of greenhouse gases per capita, above Qatar (~35 t), the highest-emitting country in the world. Almost certainly a units problem at the source.</p><p>The full analysis, with the code that produces these numbers, is in <b>analysis/explorar_datos.ipynb</b>.</p>",
    story_title: "Story",
    tab_data: "Data",
    tab_ctrl: "Controls",
    btn_story: "Story",
    btn_dock: "Data & controls",
    toggle_story: "Show or hide the story",
    toggle_dock: "Show or hide data and controls",
    chart_empty: "Select a subregion or country on the globe",
    chart_nodata: "No data for this indicator in {who}",

    temp_anomaly: "Sea temp. anomaly",
    surface_temp_anomaly: "Surface temp. anomaly",
    sea_level: "Sea level anomaly",
    rainfall_anomaly: "Rainfall anomalies",
    calci: "CALCI index",
    crop_yield: "Crop yield",
    env_taxes: "Environmental taxes",
    fisheries: "Fisheries management",
    ghg_emissions: "Per capita GHG emissions",
    livestock_yield: "Livestock yield",
    met_network: "Meteorological network",
    power_gen: "Power generation",
    tourism: "Tourist arrivals",

    // -------------------------------------------------------------- tutorial
    tour_btn: "Tutorial",
    tour_title: "How to use this dashboard",
    tour_step: "Step {n} of {total}",
    tour_next: "Next",
    tour_prev: "Back",
    tour_done: "Got it",
    tour_skip: "Skip the tutorial",
    tour_mouse: "With a mouse",
    tour_touch: "With your finger",

    tour_bienvenida_t: "A globe made of years",
    tour_bienvenida_b: "Every Pacific country and subregion is a polygon on the globe. Select one and it rises into one stratum per year, coloured by that year's value. Years with no data are left invisible with the gap showing.",

    tour_girar_t: "Turning the globe",
    tour_girar_b: "Drag with one finger to move the globe around.",
    tour_girar_raton: "Drag with the left button",
    tour_girar_dedo: "Drag with one finger",

    tour_zoom_t: "Zooming in and out",
    tour_zoom_b: "Zoom in and out of the globe. Tip: place the countries on the horizon and zoom in to see the detail of each stratum.",
    tour_zoom_raton: "Scroll the wheel",
    tour_zoom_dedo: "Pinch with two fingers",

    tour_mover_t: "Panning the globe",
    tour_mover_b: "Pan the globe to place it where it works best for you.",
    tour_mover_raton: "Drag with the wheel pressed (middle button)",
    tour_mover_dedo: "Drag with two fingers together",

    tour_seleccionar_t: "Selecting a place",
    tour_seleccionar_b: "Select a place and it rises up to see the data on its sides. Click on open water to remove the selection.",
    tour_seleccionar_raton: "Click the polygon",
    tour_seleccionar_dedo: "Tap the polygon",

    tour_profundizar_t: "Drilling into countries",
    tour_profundizar_b: "Double click on a region to see the countries inside it. Go back to see the regions by clicking the panel button or “Pacific” in the top left corner of the visualization.",
    tour_profundizar_raton: "Double-click a subregion",
    tour_profundizar_dedo: "Double-tap a subregion",

    tour_norte_t: "Aligning north",
    tour_norte_b: "Straighten the globe, north pole up.",

    tour_indicadores_t: "Choosing the indicator",
    tour_indicadores_b: "Thirteen indicators. Switching recolours every stratum and redraws the chart. The colour scale is at the bottom of the controls panel.",

    tour_grafica_t: "The series, year by year",
    tour_grafica_b: "Pointing at a year highlights its stratum on the globe. <b>A click pins that year</b> and the highlight stays even if you move away or close the panel. That is how you study one year in the stack. Click again to release it.",
    tour_grafica_raton: "Point at a dot · click to pin it",
    tour_grafica_dedo: "Tap a dot to pin it",

    tour_controles_t: "Height, transparency and theme",
    tour_controles_b: "<b>Height</b> multiplies the selected stack, from 1× (flat, like the rest) to 10×. <b>Transparency</b> lets you see the strata below. <b>Theme</b> switches between light and dark.",

    tour_relato_t: "The story",
    tour_relato_b: "A guided walk through what the data says, step by step. Close and reopen it whenever you like.",

    tour_final_t: "That's it",
    tour_final_b: "The dashboard speaks English, French and Spanish. Switch here. You can replay this tutorial any time with the <b>?</b> button in this same corner.",
  },

  fr: {
    crumb: "Pacifique · sous-régions",
    crumb_suffix: "pays et territoires",
    crumb_back: "← Pacifique",
    lbl_indicators: "Indicateurs",
    lbl_height: "Hauteur de la sélection",
    lbl_opacity: "Transparence des couches",
    lbl_theme: "Thème",
    lbl_lang: "Langue",
    lbl_scale: "Échelle",
    theme_dark: "Sombre",
    theme_light: "Clair",
    val_equal: "égale",
    val_opaque: "opaques",
    nav_prev: "Indicateurs précédents",
    nav_next: "Indicateurs suivants",
    dots_page: "Page {n} sur {total}",
    btn_north: "⊕ aligner nord",
    title_north: "Rendre les méridiens verticaux",
    btn_drill: "Voir les pays de la sous-région →",
    btn_drill_back: "← Retour à la sous-région",
    region_label: "Sous-région",
    note_region: "Agrégation : {agg}. ZEE officielle dissoute par sous-région M49.",
    note_country: "ZEE officielle (Marine Regions v12).",
    drill_hint_mouse: "ou double-clic sur la sous-région",
    drill_hint_touch: "ou double-toucher la sous-région",
    badge: "données .STAT 2003–2026 · ZEE officielle (Marine Regions v12) · CC-BY",
    val_nodata: "sans donnée",
    story_prev: "← Précédent",
    story_next: "Suivant →",
    story_go: "Aller à",
    story_step: "{n} sur {total}",

    story_leer_t: "Une colonne par lieu, une strate par année",
    story_leer_b: "<p>Chaque polygone est la Zone Économique Exclusive d\u2019un pays ou d\u2019une sous-région. Sans sélection, vous voyez une carte plate : seulement la dernière année avec donnée.</p><p>En sélectionnant, ce lieu se dresse en vingt-quatre strates, une par année, de 2003 en bas à 2026 en haut. Chaque strate est colorée selon la valeur de cette année-là. Les années sans mesure ne sont pas dessinées : elles laissent le vide visible, car un vide n\u2019est pas un zéro.</p><p>Placez la colonne de profil sur l\u2019horizon et zoomez. C\u2019est là qu\u2019on la lit.</p>",

    story_nadie_t: "Personne ne refroidit",
    story_nadie_b: "<p>En vingt-trois ans, <b>aucun</b> pays du Pacifique ne montre de tendance à la baisse, ni en température marine ni en niveau de la mer. Ce n\u2019est pas qu\u2019ils montent tous : beaucoup de séries sont trop courtes ou trop bruitées pour l\u2019affirmer. C\u2019est qu\u2019aucune ne baisse.</p><p>Douze pays sur vingt et un montent en niveau de la mer et zéro baissent. Dix sur vingt et un en température marine, et zéro baissent.</p><p>La Papouasie-Nouvelle-Guinée termine 2025 à son maximum : <b>1,1 °C</b>. Regardez sa colonne de profil : le rouge gagne de la hauteur sans revenir en arrière.</p>",

    story_muesca_t: "L\u2019encoche de 2015",
    story_muesca_b: "<p>En 2015, six pays du Pacifique sud-ouest ont touché le minimum de toute leur série la même année. Fidji, Vanuatu et Tonga sont descendus à <b>−0,1 °C</b> ; Niue à zéro. L\u2019année précédente et la suivante tournaient autour de 0,3–0,5.</p><p>2015 est fixée sur Fidji : c\u2019est la seule strate bleue de la colonne, une coupure nette dans vingt-trois années chaudes. Passez à Vanuatu et à Tonga : la même encoche, la même année.</p><p>Cela coïncide avec El Niño de 2015-16. Le tableau ne le démontre pas, la vérification n\u2019a pas été faite. C\u2019est la question qu\u2019il laisse ouverte.</p>",

    story_turismo_t: "Le même choc, des destins opposés",
    story_turismo_b: "<p>Toutes les destinations du Pacifique se sont effondrées entre 2020 et 2021. Tonga est passé de 94 000 visiteurs à <b>200</b>.</p><p>La sortie ne se ressemble en rien. Fidji est revenue à 88 % de son pic et la Polynésie française à 93 %. La Nouvelle-Calédonie est à <b>9 %</b>, et continue de baisser : 138 748 en 2022, 125 097 en 2023, 59 399 en 2024.</p><p>Regardez la colonne de la Nouvelle-Calédonie de profil : le vide de 2020-2021 la coupe en deux et ce qui suit ne la relève pas. Comparez avec Fidji, qui se reconstruit.</p>",

    story_huecos_t: "Les vides sont aussi une donnée",
    story_huecos_b: "<p>Regardez n\u2019importe quelle colonne avec l\u2019Indice CALCI : les quatre strates du haut n\u2019existent pas. La série s\u2019arrête en 2022 pour les vingt-deux pays à la fois.</p><p>Ce n\u2019est pas un défaut du tableau. La couverture du jeu de données tombe de <b>79 % en 2022 à 14 % en 2026</b> : les années récentes sont presque vides. Avec les Taxes environnementales la coupure est encore plus tôt, en 2020, et six strates manquent.</p><p>C\u2019est pourquoi les années sans donnée restent invisibles au lieu d\u2019être peintes en zéro. Ce qui n\u2019a pas été mesuré doit se voir comme non mesuré.</p>",

    story_metodo_t: "Méthode et analyse",
    story_metodo_b: "<p>Chaque strate est une dalle temporelle sur la Zone Économique Exclusive. La hauteur de la pile sélectionnée est un multiplicateur visuel (1× à 10×), pas une magnitude : ce qui code la donnée est la <b>couleur</b> de chaque strate, pas son épaisseur.</p><p><b>Sources.</b> Les séries proviennent de .STAT Explorer et couvrent 2003–2026. Les ZEE sont les officielles de Marine Regions v12 (CC-BY). Les sous-régions ONU M49 — Mélanésie, Polynésie, Micronésie — sont obtenues en dissolvant ces mêmes ZEE par leur code M49 : l\u2019ONU classe par liste de pays et ne publie pas de géométrie. La valeur d\u2019une sous-région est la moyenne simple de ses pays.</p><p><b>Échelles.</b> Les quatre anomalies — température marine et de surface, niveau de la mer et précipitations — sont peintes sur une rampe divergente centrée sur zéro. Les autres, sur une rampe séquentielle dans leur plage réelle.</p><p><b>Ce qu\u2019il ne faut pas croire.</b> Trois choses que ce récit laisse dehors exprès, toutes documentées dans le cahier d\u2019analyse :</p><p>· <b>La gestion des pêches monte dans 21 pays sur 22.</b> C\u2019est le chiffre le plus frappant du jeu de données et il ne veut rien dire : la série ne fait que croître ou stagner, jamais baisser, et se fige quand le rapportage s\u2019arrête. C\u2019est un décompte cumulé de mesures adoptées, pas une mesure de l\u2019état de la mer. Une tendance à la hausse dans quelque chose qui ne peut pas baisser n\u2019est pas un résultat.</p><p>· <b>Record de production électrique dans neuf pays.</b> Les neuf datent de 2023, et toute la série s\u2019arrête en 2023. Dans quelque chose qui croît, le dernier point est presque toujours le maximum. Sans années postérieures, on ne distingue pas un record de la fin du registre.</p><p>· <b>Niveau de la mer.</b> Il arrive arrondi à 0,1 m sur une plage totale de 0,3 m : quatre valeurs possibles. La direction de la tendance tient ; la magnitude non, et comparer les pays entre eux non plus.</p><p>Il y a aussi 58 séries plates ou presque — Kiribati a le CALCI figé à 100 pendant vingt ans — et quelques magnitudes impossibles : les Palaos déclarent environ 87 t de gaz à effet de serre par habitant, au-dessus du Qatar (~35 t), le pays le plus émetteur au monde. Presque sûrement un problème d\u2019unités à la source.</p><p>L\u2019analyse complète, avec le code qui produit ces chiffres, est dans <b>analysis/explorar_datos.ipynb</b>.</p>",
    story_title: "Récit",
    tab_data: "Données",
    tab_ctrl: "Contrôles",
    btn_story: "Récit",
    btn_dock: "Données et contrôles",
    toggle_story: "Afficher ou masquer le récit",
    toggle_dock: "Afficher ou masquer données et contrôles",
    chart_empty: "Sélectionnez une sous-région ou un pays sur le globe",
    chart_nodata: "Aucune donnée pour cet indicateur en {who}",

    temp_anomaly: "Anomalie temp. marine",
    surface_temp_anomaly: "Anomalie temp. surface",
    sea_level: "Niveau de la mer (anomalie)",
    rainfall_anomaly: "Anomalies de précipitations",
    calci: "Indice CALCI",
    crop_yield: "Rendement agricole",
    env_taxes: "Taxes environnementales",
    fisheries: "Gestion des pêches",
    ghg_emissions: "Émissions GES par habitant",
    livestock_yield: "Rendement de l'élevage",
    met_network: "Réseau météorologique",
    power_gen: "Production d'énergie",
    tourism: "Arrivées touristiques",

    // -------------------------------------------------------------- tutorial
    tour_btn: "Tutoriel",
    tour_title: "Comment utiliser ce tableau",
    tour_step: "Étape {n} sur {total}",
    tour_next: "Suivant",
    tour_prev: "Précédent",
    tour_done: "Compris",
    tour_skip: "Passer le tutoriel",
    tour_mouse: "À la souris",
    tour_touch: "Au doigt",

    tour_bienvenida_t: "Un globe fait d'années",
    tour_bienvenida_b: "Chaque pays et chaque sous-région du Pacifique est un polygone sur le globe. En sélectionner un le fait se dresser en une strate par année, colorée selon la valeur de cette année-là. Les années sans donnée restent invisibles, le vide bien visible.",

    tour_girar_t: "Faire tourner le globe",
    tour_girar_b: "Faites glisser avec un doigt pour faire tourner le globe.",
    tour_girar_raton: "Glissez avec le bouton gauche",
    tour_girar_dedo: "Glissez avec un doigt",

    tour_zoom_t: "Zoomer et dézoomer",
    tour_zoom_b: "Zoomez et dézoomez sur le globe. Astuce : placez les pays sur l'horizon et zoomez pour voir le détail de chaque strate.",
    tour_zoom_raton: "Tournez la molette",
    tour_zoom_dedo: "Pincez avec deux doigts",

    tour_mover_t: "Déplacer le globe",
    tour_mover_b: "Déplacez le globe pour le placer là où cela vous convient le mieux.",
    tour_mover_raton: "Glissez en appuyant sur la molette (bouton du milieu)",
    tour_mover_dedo: "Glissez avec deux doigts à la fois",

    tour_seleccionar_t: "Sélectionner un lieu",
    tour_seleccionar_b: "Sélectionnez un lieu et il se dresse pour voir les données sur ses flancs. Cliquez sur la mer pour retirer la sélection.",
    tour_seleccionar_raton: "Un clic sur le polygone",
    tour_seleccionar_dedo: "Une touche sur le polygone",

    tour_profundizar_t: "Descendre aux pays",
    tour_profundizar_b: "Double-cliquez sur une région pour voir les pays qu'elle contient. Revenez aux régions avec le bouton du panneau ou avec « Pacifique », dans le coin supérieur gauche de la visualisation.",
    tour_profundizar_raton: "Double-clic sur une sous-région",
    tour_profundizar_dedo: "Double touche sur une sous-région",

    tour_norte_t: "Aligner le nord",
    tour_norte_b: "Redressez le globe, pôle nord vers le haut.",

    tour_indicadores_t: "Choisir l'indicateur",
    tour_indicadores_b: "Treize indicateurs. En changer recolore toutes les strates et retrace le graphique. L'échelle de couleur est en bas du panneau de contrôles.",

    tour_grafica_t: "La série, année par année",
    tour_grafica_b: "Pointer une année met en valeur sa strate sur le globe. <b>Un clic fixe cette année</b> et la mise en valeur reste même si vous vous éloignez ou fermez le panneau : c'est ainsi qu'on examine une année précise dans la pile. Un autre clic la libère.",
    tour_grafica_raton: "Pointez un point · cliquez pour le fixer",
    tour_grafica_dedo: "Touchez un point pour le fixer",

    tour_controles_t: "Hauteur, transparence et thème",
    tour_controles_b: "La <b>hauteur</b> multiplie la pile sélectionnée, de 1× (plate, comme les autres) à 10×. La <b>transparence</b> laisse voir les strates du dessous. Le <b>thème</b> bascule entre clair et sombre.",

    tour_relato_t: "Le récit",
    tour_relato_b: "Un parcours guidé de ce que racontent les données, étape par étape. Fermez-le et rouvrez-le quand vous voulez.",

    tour_final_t: "C'est tout",
    tour_final_b: "Le tableau parle anglais, français et espagnol : le choix se fait ici. Vous pouvez rejouer ce tutoriel à tout moment avec le bouton <b>?</b> dans ce même coin.",
  },
};

const KEY = "pacific-strata:lang";
const SUPPORTED = LANGS.map(([id]) => id);

export let lang = "en";

/** Traduce una clave. `vars` rellena los {marcadores}. Si la clave no existe
 *  (p. ej. un indicador nuevo del dataset todavía sin traducir), devuelve
 *  `fallback` — normalmente el nombre que ya trae el JSON. */
export function t(key, vars = null, fallback = null) {
  let s = DICT[lang]?.[key] ?? DICT.es[key] ?? fallback ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Idioma inicial: el guardado, si no el del navegador, si no inglés. */
export function initialLang() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* modo privado */ }
  if (SUPPORTED.includes(saved)) return saved;
  for (const nav of navigator.languages ?? [navigator.language ?? ""]) {
    const base = nav.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(base)) return base;
  }
  return "en";
}

/** Fija el idioma y repinta los nodos estáticos marcados en el HTML:
 *  data-i18n → textContent, data-i18n-title → title,
 *  data-i18n-label → aria-label (y title, que muestran lo mismo).
 *  Lo que se genera desde JS lo repinta quien lo generó, en el callback. */
export function setLang(next, onChange) {
  lang = SUPPORTED.includes(next) ? next : "en";
  document.documentElement.lang = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* modo privado */ }

  for (const el of document.querySelectorAll("[data-i18n]"))
    el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-title]"))
    el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll("[data-i18n-label]")) {
    const s = t(el.dataset.i18nLabel);
    el.title = s;
    el.setAttribute("aria-label", s);
  }
  onChange?.();
}
