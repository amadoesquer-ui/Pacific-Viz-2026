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
    story_step: "{n} de {total}",
    tab_data: "Datos",
    tab_ctrl: "Controles",
    btn_story: "Historia",
    btn_dock: "Datos y controles",
    toggle_story: "Mostrar u ocultar el relato",
    toggle_dock: "Mostrar u ocultar datos y controles",
    chart_empty: "Selecciona una subregión o un país en el globo",
    chart_nodata: "Sin datos de este indicador para {who}",
    story_title: "Metodología y análisis",
    story_p1: "Esta visualización representa los volúmenes climáticos marinos a lo largo del Pacífico. Cada estrato extruido corresponde a una losa temporal de datos acumulados sobre la ZEE (Zona Económica Exclusiva).",
    story_p2: "Los cambios en los patrones oceanográficos se reflejan según la escala del indicador activo, permitiendo comparar visualmente las variaciones anuales en la subregión.",
    story_p3: "Las series proceden de .STAT Explorer y cubren 2003–2026. Las cuatro anomalías —temperatura marina y de superficie, nivel del mar y precipitación— se pintan sobre una rampa divergente centrada en cero; el resto de indicadores, sobre una rampa secuencial en su rango real.",
    story_p4: "Las ZEE son las oficiales de Marine Regions v12 (CC-BY). Las subregiones ONU M49 —Melanesia, Polinesia, Micronesia— se obtienen disolviendo esas mismas ZEE por su código M49: la ONU clasifica por lista de países, no publica geometría.",

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
    story_step: "{n} of {total}",
    tab_data: "Data",
    tab_ctrl: "Controls",
    btn_story: "Story",
    btn_dock: "Data & controls",
    toggle_story: "Show or hide the story",
    toggle_dock: "Show or hide data and controls",
    chart_empty: "Select a subregion or country on the globe",
    chart_nodata: "No data for this indicator in {who}",
    story_title: "Methodology and analysis",
    story_p1: "This visualization represents marine climate volumes across the Pacific. Each extruded stratum corresponds to a time slice of accumulated EEZ (Exclusive Economic Zone) data.",
    story_p2: "Changes in oceanographic patterns are reflected according to the scale of the active indicator, allowing visual comparison of annual variations in the subregion.",
    story_p3: "The series come from .STAT Explorer and cover 2003–2026. The four anomalies — sea and surface temperature, sea level and rainfall — are painted on a diverging ramp centred on zero; the remaining indicators on a sequential ramp over their actual range.",
    story_p4: "The EEZ are the official ones from Marine Regions v12 (CC-BY). The UN M49 subregions — Melanesia, Polynesia, Micronesia — are obtained by dissolving those same EEZ by their M49 code: the UN classifies by country list and publishes no geometry.",

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
    story_step: "{n} sur {total}",
    tab_data: "Données",
    tab_ctrl: "Contrôles",
    btn_story: "Récit",
    btn_dock: "Données et contrôles",
    toggle_story: "Afficher ou masquer le récit",
    toggle_dock: "Afficher ou masquer données et contrôles",
    chart_empty: "Sélectionnez une sous-région ou un pays sur le globe",
    chart_nodata: "Aucune donnée pour cet indicateur en {who}",
    story_title: "Méthodologie et analyse",
    story_p1: "Cette visualisation représente les volumes climatiques marins à travers le Pacifique. Chaque strate extrudée correspond à une tranche temporelle de données accumulées sur la ZEE (Zone Économique Exclusive).",
    story_p2: "Les changements dans les schémas océanographiques sont reflétés selon l'échelle de l'indicateur actif, permettant la comparaison visuelle des variations annuelles dans la sous-région.",
    story_p3: "Les séries proviennent de .STAT Explorer et couvrent 2003–2026. Les quatre anomalies — température marine et de surface, niveau de la mer et précipitations — sont peintes sur une rampe divergente centrée sur zéro ; les autres indicateurs sur une rampe séquentielle dans leur plage réelle.",
    story_p4: "Les ZEE sont celles, officielles, de Marine Regions v12 (CC-BY). Les sous-régions ONU M49 — Mélanésie, Polynésie, Micronésie — sont obtenues en dissolvant ces mêmes ZEE par leur code M49 : l'ONU classe par liste de pays et ne publie aucune géométrie.",

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
