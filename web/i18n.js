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
export const LANGS = [
  ["es", "Español"],
  ["en", "English"],
  ["fr", "Français"],
];

export const DICT = {
  es: {
    crumb: "Pacífico · subregiones",
    crumb_suffix: "países y territorios",
    lbl_indicators: "Indicadores",
    lbl_height: "Altura del seleccionado",
    lbl_sep: "Separación de estratos",
    lbl_opacity: "Transparencia de capas",
    lbl_theme: "Tema",
    lbl_lang: "Idioma",
    lbl_scale: "Escala",
    theme_dark: "Oscuro",
    theme_light: "Claro",
    val_volume: "volumen",
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
    hint1: "clic — separar estratos · clic fuera / Esc — soltar",
    hint2: "arrastrar — girar · clic central — mover · rueda — acercar",
    badge: "datos .STAT 2003–2026 · ZEE oficial (Marine Regions v12) · CC-BY",
    val_nodata: "sin dato",
    story_prev: "← Anterior",
    story_next: "Siguiente →",
    story_step: "{n} de {total}",
    tab_data: "Datos",
    tab_ctrl: "Controles",
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
  },

  en: {
    crumb: "Pacific · subregions",
    crumb_suffix: "countries & territories",
    lbl_indicators: "Indicators",
    lbl_height: "Height of selection",
    lbl_sep: "Strata separation",
    lbl_opacity: "Layer transparency",
    lbl_theme: "Theme",
    lbl_lang: "Language",
    lbl_scale: "Scale",
    theme_dark: "Dark",
    theme_light: "Light",
    val_volume: "volume",
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
    hint1: "click — separate strata · click outside / Esc — release",
    hint2: "drag — rotate · middle click — pan · wheel — zoom",
    badge: ".STAT data 2003–2026 · official EEZ (Marine Regions v12) · CC-BY",
    val_nodata: "no data",
    story_prev: "← Previous",
    story_next: "Next →",
    story_step: "{n} of {total}",
    tab_data: "Data",
    tab_ctrl: "Controls",
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
  },

  fr: {
    crumb: "Pacifique · sous-régions",
    crumb_suffix: "pays et territoires",
    lbl_indicators: "Indicateurs",
    lbl_height: "Hauteur de la sélection",
    lbl_sep: "Séparation des strates",
    lbl_opacity: "Transparence des couches",
    lbl_theme: "Thème",
    lbl_lang: "Langue",
    lbl_scale: "Échelle",
    theme_dark: "Sombre",
    theme_light: "Clair",
    val_volume: "volume",
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
    hint1: "clic — séparer les strates · clic extérieur / Échap — désélectionner",
    hint2: "glisser — pivoter · clic central — déplacer · molette — zoomer",
    badge: "données .STAT 2003–2026 · ZEE officielle (Marine Regions v12) · CC-BY",
    val_nodata: "sans donnée",
    story_prev: "← Précédent",
    story_next: "Suivant →",
    story_step: "{n} sur {total}",
    tab_data: "Données",
    tab_ctrl: "Contrôles",
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
  },
};

const KEY = "pacific-strata:lang";
const SUPPORTED = LANGS.map(([id]) => id);

export let lang = "es";

/** Traduce una clave. `vars` rellena los {marcadores}. Si la clave no existe
 *  (p. ej. un indicador nuevo del dataset todavía sin traducir), devuelve
 *  `fallback` — normalmente el nombre que ya trae el JSON. */
export function t(key, vars = null, fallback = null) {
  let s = DICT[lang]?.[key] ?? DICT.es[key] ?? fallback ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

/** Idioma inicial: el guardado, si no el del navegador, si no español. */
export function initialLang() {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* modo privado */ }
  if (SUPPORTED.includes(saved)) return saved;
  for (const nav of navigator.languages ?? [navigator.language ?? ""]) {
    const base = nav.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(base)) return base;
  }
  return "es";
}

/** Fija el idioma y repinta los nodos estáticos marcados en el HTML:
 *  data-i18n → textContent, data-i18n-title → title,
 *  data-i18n-label → aria-label (y title, que muestran lo mismo).
 *  Lo que se genera desde JS lo repinta quien lo generó, en el callback. */
export function setLang(next, onChange) {
  lang = SUPPORTED.includes(next) ? next : "es";
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
