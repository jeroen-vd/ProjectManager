export type QuestionKind = "single" | "multi" | "text" | "number" | "boolean";

export type TaskOutput = {
  id: string;
  titleTemplate: string;
  priority: "low" | "medium" | "high";
  tags: string[];
  dependsOn: string[];
};

export type AnswerOption = {
  id: string;
  label: string;
  value: string;
  outputs?: TaskOutput[];
};

export type Question = {
  id: string;
  conceptKey: string;
  prompt: string;
  helpText?: string;
  kind: QuestionKind;
  options?: AnswerOption[];
  tags?: string[];
  outputs?: TaskOutput[];
};

export type Condition = {
  expression: string;
};

export type FlowNode = {
  id: string;
  questionId: string;
  position?: { x: number; y: number };
};

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  when?: Condition;
};

export type FlowScope = {
  level: "global" | "category" | "context" | "installation";
  categoryId?: string;
  contextId?: string;
  installationId?: string;
};

export type Flow = {
  id: string;
  name: string;
  scope: FlowScope;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type QuestionLibrary = {
  questions: Question[];
  flows: Flow[];
};

export const defaultQuestionLibrary: QuestionLibrary = {
  questions: [
    {
      id: "q-material-main",
      conceptKey: "material.main",
      prompt: "Hoofdmateriaal constructie",
      kind: "single",
      options: [
        { id: "opt-s235", label: "Staal S235", value: "Staal S235" },
        { id: "opt-s355", label: "Staal S355", value: "Staal S355" },
        { id: "opt-corten", label: "Corten A", value: "Corten A" },
        { id: "opt-inox", label: "Inox", value: "Inox" },
        { id: "opt-alu", label: "Aluminium", value: "Aluminium" },
      ],
      tags: ["material"],
      outputs: [
        {
          id: "task-material-main",
          titleTemplate: "Bepaal hoofdmateriaal: {{answer}}",
          priority: "medium",
          tags: ["material"],
          dependsOn: [],
        },
      ],
    },
    {
      id: "q-finishes",
      conceptKey: "finish.method",
      prompt: "Afwerkingsmethode",
      kind: "multi",
      options: [
        {
          id: "opt-galv",
          label: "Thermisch verzinkt",
          value: "Thermisch verzinkt",
        },
        { id: "opt-paint", label: "Gelakt", value: "Gelakt" },
        {
          id: "opt-duplex",
          label: "Duplex (verzinkt + gelakt)",
          value: "Duplex (verzinkt + gelakt)",
        },
        { id: "opt-raw", label: "Onbehandeld", value: "Onbehandeld" },
      ],
      tags: ["finish"],
    },
    {
      id: "q-ral-color",
      conceptKey: "finish.ral",
      prompt: "RAL-kleur",
      kind: "text",
      tags: ["finish"],
    },
    {
      id: "q-gloss-level",
      conceptKey: "finish.gloss",
      prompt: "Glansgraad",
      kind: "single",
      options: [
        { id: "opt-mat", label: "Mat", value: "Mat" },
        { id: "opt-semi", label: "Zijdeglans", value: "Zijdeglans" },
        { id: "opt-high", label: "Hoogglans", value: "Hoogglans" },
      ],
      tags: ["finish"],
    },
    {
      id: "q-profile-types",
      conceptKey: "profile.types",
      prompt: "Profieltypes",
      kind: "multi",
      options: [
        { id: "opt-box", label: "Kokerprofielen", value: "Kokerprofielen" },
        {
          id: "opt-i",
          label: "I-profielen (IPE/HEA)",
          value: "I-profielen (IPE/HEA)",
        },
        { id: "opt-u", label: "U-profielen", value: "U-profielen" },
        { id: "opt-l", label: "L-profielen", value: "L-profielen" },
        {
          id: "opt-plate",
          label: "Plaatmateriaal",
          value: "Plaatmateriaal",
        },
      ],
      tags: ["profile"],
    },
    {
      id: "q-en1090-required",
      conceptKey: "en1090.required",
      prompt: "EN 1090 / CE-markering vereist?",
      kind: "boolean",
      tags: ["compliance"],
      outputs: [
        {
          id: "task-en1090-check",
          titleTemplate: "Controleer EN1090 vereiste: {{answer}}",
          priority: "high",
          tags: ["compliance"],
          dependsOn: [],
        },
      ],
    },
    {
      id: "q-en1090-exc",
      conceptKey: "en1090.exc",
      prompt: "Uitvoeringsklasse",
      kind: "single",
      options: [
        { id: "opt-exc1", label: "EXC1", value: "EXC1" },
        { id: "opt-exc2", label: "EXC2", value: "EXC2" },
        { id: "opt-exc3", label: "EXC3", value: "EXC3" },
        { id: "opt-exc4", label: "EXC4", value: "EXC4" },
      ],
      tags: ["compliance"],
    },
    {
      id: "q-en1090-docs",
      conceptKey: "en1090.documents",
      prompt: "Documenten nodig",
      kind: "multi",
      options: [
        {
          id: "opt-dop",
          label: "DoP (Declaration of Performance)",
          value: "DoP (Declaration of Performance)",
        },
        {
          id: "opt-ce",
          label: "CE label / markering",
          value: "CE label / markering",
        },
        {
          id: "opt-cert",
          label: "Materiaalcertificaten (3.1)",
          value: "Materiaalcertificaten (3.1)",
        },
        {
          id: "opt-wps",
          label: "Lasdocumentatie (WPS/WPQR)",
          value: "Lasdocumentatie (WPS/WPQR)",
        },
      ],
      tags: ["compliance"],
    },
    {
      id: "q-en1090-note",
      conceptKey: "en1090.note",
      prompt: "Reden / toelichting",
      kind: "text",
      tags: ["compliance"],
    },
    {
      id: "q-cat-fietsenstalling-capacity",
      conceptKey: "cat.fietsenstalling.capacity",
      prompt: "Aantal fietsplaatsen nodig",
      kind: "number",
      tags: ["category", "fietsenstalling"],
    },
    {
      id: "q-cat-fietsenstalling-bike-types",
      conceptKey: "cat.fietsenstalling.bike_types",
      prompt: "Type fietsen",
      kind: "multi",
      options: [
        { id: "opt-bike-standard", label: "Standaard", value: "Standaard" },
        { id: "opt-bike-ebike", label: "E-bike", value: "E-bike" },
        { id: "opt-bike-cargo", label: "Bakfiets", value: "Bakfiets" },
        { id: "opt-bike-step", label: "Scooter/step", value: "Scooter/step" },
      ],
      tags: ["category", "fietsenstalling"],
    },
    {
      id: "q-cat-fietsenstalling-security",
      conceptKey: "cat.fietsenstalling.security",
      prompt: "Beveiligingsniveau",
      kind: "single",
      options: [
        { id: "opt-sec-open", label: "Open", value: "Open" },
        { id: "opt-sec-closed", label: "Afgesloten", value: "Afgesloten" },
        { id: "opt-sec-access", label: "Toegangspas", value: "Toegangspas" },
      ],
      tags: ["category", "fietsenstalling"],
    },
    {
      id: "q-cat-fietsenstalling-rack-type",
      conceptKey: "cat.fietsenstalling.rack_type",
      prompt: "Type rekken",
      kind: "single",
      options: [
        { id: "opt-rack-loop", label: "Beugels", value: "Beugels" },
        { id: "opt-rack-clamp", label: "Wielklem", value: "Wielklem" },
        { id: "opt-rack-stack", label: "Etage rekken", value: "Etage rekken" },
        { id: "opt-rack-hook", label: "Haken", value: "Haken" },
      ],
      tags: ["category", "fietsenstalling"],
    },
    {
      id: "q-cat-luifel-overkapping-use",
      conceptKey: "cat.luifel-overkapping.use",
      prompt: "Gebruik van de overkapping",
      kind: "single",
      options: [
        { id: "opt-use-entrance", label: "Entree", value: "Entree" },
        { id: "opt-use-bike", label: "Fietsparkeren", value: "Fietsparkeren" },
        { id: "opt-use-wait", label: "Wachtruimte", value: "Wachtruimte" },
        { id: "opt-use-terrace", label: "Terras", value: "Terras" },
        { id: "opt-use-pass", label: "Doorloop", value: "Doorloop" },
      ],
      tags: ["category", "luifel-overkapping"],
    },
    {
      id: "q-cat-luifel-overkapping-roof-shape",
      conceptKey: "cat.luifel-overkapping.roof_shape",
      prompt: "Vorm van het dak",
      kind: "single",
      options: [
        { id: "opt-roof-flat", label: "Vlak", value: "Vlak" },
        { id: "opt-roof-slope", label: "Helling", value: "Helling" },
        { id: "opt-roof-curve", label: "Gebogen", value: "Gebogen" },
      ],
      tags: ["category", "luifel-overkapping"],
    },
    {
      id: "q-cat-luifel-overkapping-clear-height",
      conceptKey: "cat.luifel-overkapping.clear_height",
      prompt: "Vrije hoogte (m)",
      kind: "number",
      tags: ["category", "luifel-overkapping"],
    },
    {
      id: "q-cat-luifel-overkapping-drainage",
      conceptKey: "cat.luifel-overkapping.drainage",
      prompt: "Waterafvoer",
      kind: "single",
      options: [
        { id: "opt-drain-none", label: "Geen", value: "Geen" },
        { id: "opt-drain-external", label: "Extern", value: "Extern" },
        { id: "opt-drain-internal", label: "Intern", value: "Intern" },
      ],
      tags: ["category", "luifel-overkapping"],
    },
    {
      id: "q-cat-speelplaatsoverkapping-age-group",
      conceptKey: "cat.speelplaatsoverkapping.age_group",
      prompt: "Leeftijdsgroep",
      kind: "single",
      options: [
        { id: "opt-age-0-5", label: "0-5 jaar", value: "0-5 jaar" },
        { id: "opt-age-6-12", label: "6-12 jaar", value: "6-12 jaar" },
        { id: "opt-age-mix", label: "Gemengd", value: "Gemengd" },
      ],
      tags: ["category", "speelplaatsoverkapping"],
    },
    {
      id: "q-cat-speelplaatsoverkapping-coverage",
      conceptKey: "cat.speelplaatsoverkapping.coverage",
      prompt: "Overdekte oppervlakte (m2)",
      kind: "number",
      tags: ["category", "speelplaatsoverkapping"],
    },
    {
      id: "q-cat-speelplaatsoverkapping-uv-level",
      conceptKey: "cat.speelplaatsoverkapping.uv_level",
      prompt: "UV-bescherming",
      kind: "single",
      options: [
        { id: "opt-uv-basic", label: "Basis", value: "Basis" },
        { id: "opt-uv-high", label: "Verhoogd", value: "Verhoogd" },
        { id: "opt-uv-max", label: "Maximaal", value: "Maximaal" },
      ],
      tags: ["category", "speelplaatsoverkapping"],
    },
    {
      id: "q-cat-speelplaatsoverkapping-fall-zone",
      conceptKey: "cat.speelplaatsoverkapping.fall_zone",
      prompt: "Benodigde valzone (m)",
      kind: "number",
      tags: ["category", "speelplaatsoverkapping"],
    },
    {
      id: "q-cat-stadsmeubilair-function",
      conceptKey: "cat.stadsmeubilair.function",
      prompt: "Functie",
      kind: "single",
      options: [
        { id: "opt-function-seat", label: "Zitmeubel", value: "Zitmeubel" },
        {
          id: "opt-function-bike",
          label: "Fietsparkeren",
          value: "Fietsparkeren",
        },
        {
          id: "opt-function-waste",
          label: "Afvalbeheer",
          value: "Afvalbeheer",
        },
        {
          id: "opt-function-info",
          label: "Informatie",
          value: "Informatie",
        },
        { id: "opt-function-green", label: "Groen", value: "Groen" },
      ],
      tags: ["category", "stadsmeubilair"],
    },
    {
      id: "q-cat-stadsmeubilair-vandalism",
      conceptKey: "cat.stadsmeubilair.vandalism_resistance",
      prompt: "Anti-vandalisme nodig?",
      kind: "boolean",
      tags: ["category", "stadsmeubilair"],
    },
    {
      id: "q-cat-stadsmeubilair-maintenance",
      conceptKey: "cat.stadsmeubilair.maintenance_level",
      prompt: "Onderhoudsniveau",
      kind: "single",
      options: [
        { id: "opt-maint-low", label: "Laag", value: "Laag" },
        { id: "opt-maint-mid", label: "Standaard", value: "Standaard" },
        { id: "opt-maint-high", label: "Hoog", value: "Hoog" },
      ],
      tags: ["category", "stadsmeubilair"],
    },
    {
      id: "q-cat-stadsmeubilair-usage",
      conceptKey: "cat.stadsmeubilair.usage_intensity",
      prompt: "Gebruiksintensiteit",
      kind: "single",
      options: [
        { id: "opt-usage-low", label: "Laag", value: "Laag" },
        { id: "opt-usage-mid", label: "Middel", value: "Middel" },
        { id: "opt-usage-high", label: "Hoog", value: "Hoog" },
      ],
      tags: ["category", "stadsmeubilair"],
    },
    {
      id: "q-cat-maatwerk-project-use-case",
      conceptKey: "cat.maatwerk-project.use_case",
      prompt: "Doel en gebruik",
      kind: "text",
      tags: ["category", "maatwerk-project"],
    },
    {
      id: "q-cat-maatwerk-project-constraints",
      conceptKey: "cat.maatwerk-project.key_constraints",
      prompt: "Belangrijkste randvoorwaarden",
      kind: "multi",
      options: [
        { id: "opt-const-budget", label: "Budget", value: "Budget" },
        { id: "opt-const-time", label: "Planning", value: "Planning" },
        { id: "opt-const-weight", label: "Gewicht", value: "Gewicht" },
        { id: "opt-const-style", label: "Esthetiek", value: "Esthetiek" },
        { id: "opt-const-norms", label: "Normering", value: "Normering" },
      ],
      tags: ["category", "maatwerk-project"],
    },
    {
      id: "q-cat-maatwerk-project-integration",
      conceptKey: "cat.maatwerk-project.integration_existing",
      prompt: "Integratie met bestaand?",
      kind: "boolean",
      tags: ["category", "maatwerk-project"],
    },
    {
      id: "q-cat-maatwerk-project-lifespan",
      conceptKey: "cat.maatwerk-project.lifespan_years",
      prompt: "Gewenste levensduur (jaar)",
      kind: "number",
      tags: ["category", "maatwerk-project"],
    },
    {
      id: "q-ctx-buitenstructuur-open-sides",
      conceptKey: "ctx.buitenstructuur.open_sides",
      prompt: "Open of gesloten zijden",
      kind: "single",
      options: [
        { id: "opt-sides-open", label: "Open", value: "Open" },
        {
          id: "opt-sides-partial",
          label: "Deels gesloten",
          value: "Deels gesloten",
        },
        { id: "opt-sides-closed", label: "Gesloten", value: "Gesloten" },
      ],
      tags: ["context", "buitenstructuur"],
    },
    {
      id: "q-ctx-buitenstructuur-wind-zone",
      conceptKey: "ctx.buitenstructuur.wind_zone",
      prompt: "Windbelasting zone",
      kind: "single",
      options: [
        { id: "opt-wind-normal", label: "Normaal", value: "Normaal" },
        { id: "opt-wind-high", label: "Hoog", value: "Hoog" },
        { id: "opt-wind-coast", label: "Kust", value: "Kust" },
      ],
      tags: ["context", "buitenstructuur"],
    },
    {
      id: "q-ctx-buitenstructuur-drainage",
      conceptKey: "ctx.buitenstructuur.drainage",
      prompt: "Afwatering voorzien?",
      kind: "boolean",
      tags: ["context", "buitenstructuur"],
    },
    {
      id: "q-ctx-industriele-constructie-load-class",
      conceptKey: "ctx.industriele-constructie.load_class",
      prompt: "Belastingklasse",
      kind: "single",
      options: [
        { id: "opt-load-light", label: "Licht", value: "Licht" },
        { id: "opt-load-mid", label: "Middel", value: "Middel" },
        { id: "opt-load-heavy", label: "Zwaar", value: "Zwaar" },
      ],
      tags: ["context", "industriele-constructie"],
    },
    {
      id: "q-ctx-industriele-constructie-dynamic-loads",
      conceptKey: "ctx.industriele-constructie.dynamic_loads",
      prompt: "Dynamische belastingen?",
      kind: "boolean",
      tags: ["context", "industriele-constructie"],
    },
    {
      id: "q-ctx-industriele-constructie-maintenance-access",
      conceptKey: "ctx.industriele-constructie.maintenance_access",
      prompt: "Onderhoudstoegang nodig?",
      kind: "boolean",
      tags: ["context", "industriele-constructie"],
    },
    {
      id: "q-ctx-zitoplossingen-capacity",
      conceptKey: "ctx.zitoplossingen.capacity",
      prompt: "Aantal zitplaatsen",
      kind: "number",
      tags: ["context", "zitoplossingen"],
    },
    {
      id: "q-ctx-zitoplossingen-backrest",
      conceptKey: "ctx.zitoplossingen.backrest_required",
      prompt: "Rugleuning vereist?",
      kind: "boolean",
      tags: ["context", "zitoplossingen"],
    },
    {
      id: "q-ctx-zitoplossingen-material",
      conceptKey: "ctx.zitoplossingen.material_preference",
      prompt: "Materiaal voorkeur",
      kind: "single",
      options: [
        { id: "opt-seat-wood", label: "Hout", value: "Hout" },
        { id: "opt-seat-metal", label: "Metaal", value: "Metaal" },
        { id: "opt-seat-composite", label: "Composiet", value: "Composiet" },
      ],
      tags: ["context", "zitoplossingen"],
    },
    {
      id: "q-ctx-fietsparkeren-mobiliteit-capacity",
      conceptKey: "ctx.fietsparkeren-mobiliteit.capacity",
      prompt: "Aantal fietsen",
      kind: "number",
      tags: ["context", "fietsparkeren-mobiliteit"],
    },
    {
      id: "q-ctx-fietsparkeren-mobiliteit-bike-types",
      conceptKey: "ctx.fietsparkeren-mobiliteit.bike_types",
      prompt: "Type fietsen",
      kind: "multi",
      options: [
        { id: "opt-bike2-standard", label: "Standaard", value: "Standaard" },
        { id: "opt-bike2-ebike", label: "E-bike", value: "E-bike" },
        { id: "opt-bike2-cargo", label: "Bakfiets", value: "Bakfiets" },
        { id: "opt-bike2-step", label: "Steps", value: "Steps" },
      ],
      tags: ["context", "fietsparkeren-mobiliteit"],
    },
    {
      id: "q-ctx-fietsparkeren-mobiliteit-charging",
      conceptKey: "ctx.fietsparkeren-mobiliteit.charging_points",
      prompt: "Laadpunten nodig?",
      kind: "boolean",
      tags: ["context", "fietsparkeren-mobiliteit"],
    },
    {
      id: "q-ctx-planters-groenvakken-depth",
      conceptKey: "ctx.planters-groenvakken.plant_depth",
      prompt: "Plantdiepte (cm)",
      kind: "number",
      tags: ["context", "planters-groenvakken"],
    },
    {
      id: "q-ctx-planters-groenvakken-irrigation",
      conceptKey: "ctx.planters-groenvakken.irrigation",
      prompt: "Irrigatie voorzien?",
      kind: "boolean",
      tags: ["context", "planters-groenvakken"],
    },
    {
      id: "q-ctx-planters-groenvakken-water-buffer",
      conceptKey: "ctx.planters-groenvakken.water_buffering",
      prompt: "Waterbuffering",
      kind: "single",
      options: [
        { id: "opt-water-none", label: "Geen", value: "Geen" },
        { id: "opt-water-some", label: "Beperkt", value: "Beperkt" },
        { id: "opt-water-large", label: "Groot", value: "Groot" },
      ],
      tags: ["context", "planters-groenvakken"],
    },
    {
      id: "q-ctx-interieur-meubels-room-type",
      conceptKey: "ctx.interieur-meubels.room_type",
      prompt: "Type ruimte",
      kind: "single",
      options: [
        { id: "opt-room-office", label: "Kantoor", value: "Kantoor" },
        { id: "opt-room-public", label: "Publiek", value: "Publiek" },
        { id: "opt-room-horeca", label: "Horeca", value: "Horeca" },
        { id: "opt-room-edu", label: "Educatie", value: "Educatie" },
      ],
      tags: ["context", "interieur-meubels"],
    },
    {
      id: "q-ctx-interieur-meubels-fire-class",
      conceptKey: "ctx.interieur-meubels.fire_class",
      prompt: "Brandklasse",
      kind: "single",
      options: [
        { id: "opt-fire-standard", label: "Standaard", value: "Standaard" },
        { id: "opt-fire-high", label: "Verhoogd", value: "Verhoogd" },
      ],
      tags: ["context", "interieur-meubels"],
    },
    {
      id: "q-ctx-interieur-meubels-demountable",
      conceptKey: "ctx.interieur-meubels.demountable",
      prompt: "Demontabel nodig?",
      kind: "boolean",
      tags: ["context", "interieur-meubels"],
    },
    {
      id: "q-ctx-stadsmeubilair-publieke-inrichting-accessibility",
      conceptKey: "ctx.stadsmeubilair-publieke-inrichting.accessibility",
      prompt: "Toegankelijkheidseisen?",
      kind: "boolean",
      tags: ["context", "stadsmeubilair-publieke-inrichting"],
    },
    {
      id: "q-ctx-stadsmeubilair-publieke-inrichting-usage",
      conceptKey: "ctx.stadsmeubilair-publieke-inrichting.usage_intensity",
      prompt: "Gebruiksintensiteit",
      kind: "single",
      options: [
        { id: "opt-usage-low2", label: "Laag", value: "Laag" },
        { id: "opt-usage-mid2", label: "Middel", value: "Middel" },
        { id: "opt-usage-high2", label: "Hoog", value: "Hoog" },
      ],
      tags: ["context", "stadsmeubilair-publieke-inrichting"],
    },
    {
      id: "q-ctx-stadsmeubilair-publieke-inrichting-maintenance-contract",
      conceptKey: "ctx.stadsmeubilair-publieke-inrichting.maintenance_contract",
      prompt: "Onderhoudscontract?",
      kind: "boolean",
      tags: ["context", "stadsmeubilair-publieke-inrichting"],
    },
    {
      id: "q-ctx-verlichting-light-level",
      conceptKey: "ctx.verlichting.light_level",
      prompt: "Lichtniveau",
      kind: "single",
      options: [
        { id: "opt-light-amb", label: "Sfeer", value: "Sfeer" },
        { id: "opt-light-func", label: "Functioneel", value: "Functioneel" },
        { id: "opt-light-accent", label: "Accent", value: "Accent" },
      ],
      tags: ["context", "verlichting"],
    },
    {
      id: "q-ctx-verlichting-power-source",
      conceptKey: "ctx.verlichting.power_source",
      prompt: "Stroomvoorziening",
      kind: "single",
      options: [
        { id: "opt-power-grid", label: "Netstroom", value: "Netstroom" },
        { id: "opt-power-solar", label: "Solar", value: "Solar" },
        { id: "opt-power-external", label: "Extern", value: "Extern" },
      ],
      tags: ["context", "verlichting"],
    },
    {
      id: "q-ctx-verlichting-maintenance-access",
      conceptKey: "ctx.verlichting.maintenance_access",
      prompt: "Onderhoudstoegang nodig?",
      kind: "boolean",
      tags: ["context", "verlichting"],
    },
    {
      id: "q-ctx-bekleding-gevel-element-facade-type",
      conceptKey: "ctx.bekleding-gevel-element.facade_type",
      prompt: "Geveltype",
      kind: "single",
      options: [
        { id: "opt-facade-brick", label: "Baksteen", value: "Baksteen" },
        { id: "opt-facade-concrete", label: "Beton", value: "Beton" },
        { id: "opt-facade-steel", label: "Staal", value: "Staal" },
        { id: "opt-facade-wood", label: "Hout", value: "Hout" },
        { id: "opt-facade-glass", label: "Glas", value: "Glas" },
      ],
      tags: ["context", "bekleding-gevel-element"],
    },
    {
      id: "q-ctx-bekleding-gevel-element-ventilated-gap",
      conceptKey: "ctx.bekleding-gevel-element.ventilated_gap",
      prompt: "Ventilatiespouw nodig?",
      kind: "boolean",
      tags: ["context", "bekleding-gevel-element"],
    },
    {
      id: "q-ctx-bekleding-gevel-element-visible-sides",
      conceptKey: "ctx.bekleding-gevel-element.visible_sides",
      prompt: "Zichtzijde",
      kind: "single",
      options: [
        { id: "opt-visible-single", label: "Enkelzijdig", value: "Enkelzijdig" },
        {
          id: "opt-visible-double",
          label: "Dubbelzijdig",
          value: "Dubbelzijdig",
        },
      ],
      tags: ["context", "bekleding-gevel-element"],
    },
    {
      id: "q-ctx-object-speciaal-project-interaction",
      conceptKey: "ctx.object-speciaal-project.interaction",
      prompt: "Publieksinteractie?",
      kind: "boolean",
      tags: ["context", "object-speciaal-project"],
    },
    {
      id: "q-ctx-object-speciaal-project-moving-parts",
      conceptKey: "ctx.object-speciaal-project.moving_parts",
      prompt: "Bewegende delen?",
      kind: "boolean",
      tags: ["context", "object-speciaal-project"],
    },
    {
      id: "q-ctx-object-speciaal-project-transport-limit",
      conceptKey: "ctx.object-speciaal-project.transport_limit",
      prompt: "Transportlimiet / max afmeting",
      kind: "text",
      tags: ["context", "object-speciaal-project"],
    },
    {
      id: "q-inst-vrijstaand-foundation",
      conceptKey: "inst.vrijstaand.foundation_type",
      prompt: "Funderingstype",
      kind: "single",
      options: [
        { id: "opt-found-point", label: "Puntfundering", value: "Puntfundering" },
        {
          id: "opt-found-strip",
          label: "Strookfundering",
          value: "Strookfundering",
        },
        {
          id: "opt-found-screw",
          label: "Schroeffundering",
          value: "Schroeffundering",
        },
        { id: "opt-found-ballast", label: "Ballast", value: "Ballast" },
      ],
      tags: ["installation", "vrijstaand"],
    },
    {
      id: "q-inst-vrijstaand-anchor-visible",
      conceptKey: "inst.vrijstaand.anchor_visible",
      prompt: "Ankers zichtbaar?",
      kind: "boolean",
      tags: ["installation", "vrijstaand"],
    },
    {
      id: "q-inst-vrijstaand-clear-height",
      conceptKey: "inst.vrijstaand.clear_height",
      prompt: "Vrije hoogte (m)",
      kind: "number",
      tags: ["installation", "vrijstaand"],
    },
    {
      id: "q-inst-tegen-gevel-facade-material",
      conceptKey: "inst.tegen-gevel.facade_material",
      prompt: "Gevelmateriaal",
      kind: "single",
      options: [
        { id: "opt-facade2-concrete", label: "Beton", value: "Beton" },
        { id: "opt-facade2-brick", label: "Baksteen", value: "Baksteen" },
        { id: "opt-facade2-steel", label: "Staal", value: "Staal" },
        { id: "opt-facade2-wood", label: "Hout", value: "Hout" },
      ],
      tags: ["installation", "tegen-gevel"],
    },
    {
      id: "q-inst-tegen-gevel-waterproofing",
      conceptKey: "inst.tegen-gevel.waterproofing",
      prompt: "Waterdichte aansluiting nodig?",
      kind: "boolean",
      tags: ["installation", "tegen-gevel"],
    },
    {
      id: "q-inst-tegen-gevel-support-span",
      conceptKey: "inst.tegen-gevel.support_span",
      prompt: "Overspanning gevelzijde (m)",
      kind: "number",
      tags: ["installation", "tegen-gevel"],
    },
    {
      id: "q-inst-aangebouwd-roof-connection",
      conceptKey: "inst.aangebouwd.roof_connection",
      prompt: "Aansluiting op dakgoot?",
      kind: "boolean",
      tags: ["installation", "aangebouwd"],
    },
    {
      id: "q-inst-aangebouwd-building-joint",
      conceptKey: "inst.aangebouwd.building_joint",
      prompt: "Bouwkundige aansluiting vereist?",
      kind: "boolean",
      tags: ["installation", "aangebouwd"],
    },
    {
      id: "q-inst-aangebouwd-expansion-joint",
      conceptKey: "inst.aangebouwd.expansion_joint",
      prompt: "Uitzettingsvoeg nodig?",
      kind: "boolean",
      tags: ["installation", "aangebouwd"],
    },
    {
      id: "q-inst-modulair-gekoppeld-module-count",
      conceptKey: "inst.modulair-gekoppeld.module_count",
      prompt: "Aantal modules",
      kind: "number",
      tags: ["installation", "modulair-gekoppeld"],
    },
    {
      id: "q-inst-modulair-gekoppeld-expandable",
      conceptKey: "inst.modulair-gekoppeld.expandable",
      prompt: "Uitbreidbaar in de toekomst?",
      kind: "boolean",
      tags: ["installation", "modulair-gekoppeld"],
    },
    {
      id: "q-inst-modulair-gekoppeld-coupling",
      conceptKey: "inst.modulair-gekoppeld.coupling_type",
      prompt: "Koppelingstype",
      kind: "single",
      options: [
        { id: "opt-couple-bolt", label: "Boutverbinding", value: "Boutverbinding" },
        { id: "opt-couple-click", label: "Klikkoppeling", value: "Klikkoppeling" },
        { id: "opt-couple-weld", label: "Lasverbinding", value: "Lasverbinding" },
      ],
      tags: ["installation", "modulair-gekoppeld"],
    },
    {
      id: "q-inst-inbouw-maatwerk-width",
      conceptKey: "inst.inbouw-maatwerk.recess_width",
      prompt: "Inbouwbreedte (mm)",
      kind: "number",
      tags: ["installation", "inbouw-maatwerk"],
    },
    {
      id: "q-inst-inbouw-maatwerk-depth",
      conceptKey: "inst.inbouw-maatwerk.recess_depth",
      prompt: "Inbouwdiepte (mm)",
      kind: "number",
      tags: ["installation", "inbouw-maatwerk"],
    },
    {
      id: "q-inst-inbouw-maatwerk-tolerances",
      conceptKey: "inst.inbouw-maatwerk.tight_tolerances",
      prompt: "Strakke toleranties vereist?",
      kind: "boolean",
      tags: ["installation", "inbouw-maatwerk"],
    },
    {
      id: "q-inst-verrijdbaar-tijdelijk-wheel-type",
      conceptKey: "inst.verrijdbaar-tijdelijk.wheel_type",
      prompt: "Wieltype",
      kind: "single",
      options: [
        { id: "opt-wheel-swivel", label: "Zwenkwielen", value: "Zwenkwielen" },
        { id: "opt-wheel-brake", label: "Remwielen", value: "Remwielen" },
        { id: "opt-wheel-terrain", label: "Terreinwielen", value: "Terreinwielen" },
      ],
      tags: ["installation", "verrijdbaar-tijdelijk"],
    },
    {
      id: "q-inst-verrijdbaar-tijdelijk-weight-limit",
      conceptKey: "inst.verrijdbaar-tijdelijk.weight_limit",
      prompt: "Max gewicht (kg)",
      kind: "number",
      tags: ["installation", "verrijdbaar-tijdelijk"],
    },
    {
      id: "q-inst-verrijdbaar-tijdelijk-indoor-storage",
      conceptKey: "inst.verrijdbaar-tijdelijk.indoor_storage",
      prompt: "Binnen opslaan mogelijk?",
      kind: "boolean",
      tags: ["installation", "verrijdbaar-tijdelijk"],
    },
    {
      id: "q-inst-integratie-omgeving-integration",
      conceptKey: "inst.integratie-omgeving.integration_type",
      prompt: "Integratie in omgeving",
      kind: "single",
      options: [
        { id: "opt-int-green", label: "Groen", value: "Groen" },
        { id: "opt-int-paving", label: "Verharding", value: "Verharding" },
        { id: "opt-int-water", label: "Water", value: "Water" },
        { id: "opt-int-object", label: "Bestaand object", value: "Bestaand object" },
      ],
      tags: ["installation", "integratie-omgeving"],
    },
    {
      id: "q-inst-integratie-omgeving-visibility",
      conceptKey: "inst.integratie-omgeving.visibility",
      prompt: "Zichtbaarheid",
      kind: "single",
      options: [
        { id: "opt-vis-low", label: "Laag", value: "Laag" },
        { id: "opt-vis-mid", label: "Gemiddeld", value: "Gemiddeld" },
        { id: "opt-vis-high", label: "Hoog", value: "Hoog" },
      ],
      tags: ["installation", "integratie-omgeving"],
    },
    {
      id: "q-inst-integratie-omgeving-maintenance-access",
      conceptKey: "inst.integratie-omgeving.maintenance_access",
      prompt: "Onderhoudstoegang nodig?",
      kind: "boolean",
      tags: ["installation", "integratie-omgeving"],
    },
    {
      id: "q-inst-wandmontage-wall-capacity",
      conceptKey: "inst.wandmontage.wall_capacity",
      prompt: "Draagkracht muur",
      kind: "single",
      options: [
        { id: "opt-wall-low", label: "Laag", value: "Laag" },
        { id: "opt-wall-mid", label: "Middel", value: "Middel" },
        { id: "opt-wall-high", label: "Hoog", value: "Hoog" },
      ],
      tags: ["installation", "wandmontage"],
    },
    {
      id: "q-inst-wandmontage-fixing",
      conceptKey: "inst.wandmontage.fixing_type",
      prompt: "Bevestigingstype",
      kind: "single",
      options: [
        { id: "opt-fix-chem", label: "Chemisch anker", value: "Chemisch anker" },
        {
          id: "opt-fix-mech",
          label: "Mechanisch anker",
          value: "Mechanisch anker",
        },
        { id: "opt-fix-rail", label: "Railsysteem", value: "Railsysteem" },
      ],
      tags: ["installation", "wandmontage"],
    },
    {
      id: "q-inst-wandmontage-mount-height",
      conceptKey: "inst.wandmontage.mount_height",
      prompt: "Montagehoogte (m)",
      kind: "number",
      tags: ["installation", "wandmontage"],
    },
    {
      id: "q-inst-plafondmontage-ceiling-type",
      conceptKey: "inst.plafondmontage.ceiling_type",
      prompt: "Plafondtype",
      kind: "single",
      options: [
        { id: "opt-ceil-concrete", label: "Beton", value: "Beton" },
        { id: "opt-ceil-steel", label: "Staal", value: "Staal" },
        { id: "opt-ceil-wood", label: "Hout", value: "Hout" },
      ],
      tags: ["installation", "plafondmontage"],
    },
    {
      id: "q-inst-plafondmontage-clear-height",
      conceptKey: "inst.plafondmontage.clear_height",
      prompt: "Vrije hoogte (m)",
      kind: "number",
      tags: ["installation", "plafondmontage"],
    },
    {
      id: "q-inst-plafondmontage-extra-suspension",
      conceptKey: "inst.plafondmontage.extra_suspension",
      prompt: "Extra ophanging nodig?",
      kind: "boolean",
      tags: ["installation", "plafondmontage"],
    },
    {
      id: "q-inst-integratie-bestaand-existing-structure",
      conceptKey: "inst.integratie-bestaand.existing_structure",
      prompt: "Type bestaande structuur",
      kind: "text",
      tags: ["installation", "integratie-bestaand"],
    },
    {
      id: "q-inst-integratie-bestaand-measurement-checked",
      conceptKey: "inst.integratie-bestaand.measurement_checked",
      prompt: "Maatvoering gecontroleerd?",
      kind: "boolean",
      tags: ["installation", "integratie-bestaand"],
    },
    {
      id: "q-inst-integratie-bestaand-demountable",
      conceptKey: "inst.integratie-bestaand.demountable",
      prompt: "Demontage mogelijk?",
      kind: "boolean",
      tags: ["installation", "integratie-bestaand"],
    },
    {
      id: "q-inst-integratie-constructie-structure-type",
      conceptKey: "inst.integratie-constructie.structure_type",
      prompt: "Constructietype",
      kind: "single",
      options: [
        { id: "opt-struct-steel", label: "Staal", value: "Staal" },
        { id: "opt-struct-concrete", label: "Beton", value: "Beton" },
        { id: "opt-struct-wood", label: "Hout", value: "Hout" },
      ],
      tags: ["installation", "integratie-constructie"],
    },
    {
      id: "q-inst-integratie-constructie-connection-type",
      conceptKey: "inst.integratie-constructie.connection_type",
      prompt: "Koppelingstype",
      kind: "single",
      options: [
        { id: "opt-conn-weld", label: "Lassen", value: "Lassen" },
        { id: "opt-conn-bolt", label: "Bouten", value: "Bouten" },
        { id: "opt-conn-clamp", label: "Klemmen", value: "Klemmen" },
      ],
      tags: ["installation", "integratie-constructie"],
    },
    {
      id: "q-inst-integratie-constructie-reinforcement",
      conceptKey: "inst.integratie-constructie.reinforcement_needed",
      prompt: "Versteviging nodig?",
      kind: "boolean",
      tags: ["installation", "integratie-constructie"],
    },
    {
      id: "q-inst-gevelmontage-facade-system",
      conceptKey: "inst.gevelmontage.facade_system",
      prompt: "Gevelsysteem",
      kind: "single",
      options: [
        { id: "opt-sys-closed", label: "Gesloten gevel", value: "Gesloten gevel" },
        {
          id: "opt-sys-vent",
          label: "Geventileerde gevel",
          value: "Geventileerde gevel",
        },
        { id: "opt-sys-system", label: "Systeemgevel", value: "Systeemgevel" },
      ],
      tags: ["installation", "gevelmontage"],
    },
    {
      id: "q-inst-gevelmontage-drilling-allowed",
      conceptKey: "inst.gevelmontage.drilling_allowed",
      prompt: "Doorboring toegestaan?",
      kind: "boolean",
      tags: ["installation", "gevelmontage"],
    },
    {
      id: "q-inst-gevelmontage-finish-type",
      conceptKey: "inst.gevelmontage.finish_type",
      prompt: "Afwerking zichtvlak",
      kind: "single",
      options: [
        { id: "opt-finish-flat", label: "Vlak", value: "Vlak" },
        { id: "opt-finish-cass", label: "Cassette", value: "Cassette" },
        { id: "opt-finish-lam", label: "Lamel", value: "Lamel" },
      ],
      tags: ["installation", "gevelmontage"],
    },
  ],
  flows: [
    {
      id: "flow-global",
      name: "Global",
      scope: {
        level: "global",
      },
      nodes: [
        { id: "node-material-main", questionId: "q-material-main" },
        { id: "node-finishes", questionId: "q-finishes" },
        { id: "node-ral-color", questionId: "q-ral-color" },
        { id: "node-gloss-level", questionId: "q-gloss-level" },
        { id: "node-profile-types", questionId: "q-profile-types" },
        { id: "node-en1090-required", questionId: "q-en1090-required" },
        { id: "node-en1090-exc", questionId: "q-en1090-exc" },
        { id: "node-en1090-docs", questionId: "q-en1090-docs" },
        { id: "node-en1090-note", questionId: "q-en1090-note" },
      ],
      edges: [
        {
          id: "edge-finishes-ral",
          from: "node-finishes",
          to: "node-ral-color",
          when: {
            expression:
              "finishes contains 'Gelakt' or 'Duplex (verzinkt + gelakt)'",
          },
        },
        {
          id: "edge-finishes-gloss",
          from: "node-finishes",
          to: "node-gloss-level",
          when: {
            expression:
              "finishes contains 'Gelakt' or 'Duplex (verzinkt + gelakt)'",
          },
        },
        {
          id: "edge-en1090-exc",
          from: "node-en1090-required",
          to: "node-en1090-exc",
          when: {
            expression: "en1090.required == true",
          },
        },
        {
          id: "edge-en1090-docs",
          from: "node-en1090-required",
          to: "node-en1090-docs",
          when: {
            expression: "en1090.required == true",
          },
        },
        {
          id: "edge-en1090-note",
          from: "node-en1090-required",
          to: "node-en1090-note",
          when: {
            expression: "en1090.required == false",
          },
        },
      ],
    },
    {
      id: "flow-category-fietsenstalling",
      name: "Fietsenstalling",
      scope: {
        level: "category",
        categoryId: "fietsenstalling",
      },
      nodes: [
        {
          id: "node-cat-fietsenstalling-capacity",
          questionId: "q-cat-fietsenstalling-capacity",
        },
        {
          id: "node-cat-fietsenstalling-bike-types",
          questionId: "q-cat-fietsenstalling-bike-types",
        },
        {
          id: "node-cat-fietsenstalling-security",
          questionId: "q-cat-fietsenstalling-security",
        },
        {
          id: "node-cat-fietsenstalling-rack-type",
          questionId: "q-cat-fietsenstalling-rack-type",
        },
      ],
      edges: [],
    },
    {
      id: "flow-category-luifel-overkapping",
      name: "Luifel / overkapping",
      scope: {
        level: "category",
        categoryId: "luifel-overkapping",
      },
      nodes: [
        {
          id: "node-cat-luifel-overkapping-use",
          questionId: "q-cat-luifel-overkapping-use",
        },
        {
          id: "node-cat-luifel-overkapping-roof-shape",
          questionId: "q-cat-luifel-overkapping-roof-shape",
        },
        {
          id: "node-cat-luifel-overkapping-clear-height",
          questionId: "q-cat-luifel-overkapping-clear-height",
        },
        {
          id: "node-cat-luifel-overkapping-drainage",
          questionId: "q-cat-luifel-overkapping-drainage",
        },
      ],
      edges: [],
    },
    {
      id: "flow-category-speelplaatsoverkapping",
      name: "Speelplaatsoverkapping",
      scope: {
        level: "category",
        categoryId: "speelplaatsoverkapping",
      },
      nodes: [
        {
          id: "node-cat-speelplaatsoverkapping-age-group",
          questionId: "q-cat-speelplaatsoverkapping-age-group",
        },
        {
          id: "node-cat-speelplaatsoverkapping-coverage",
          questionId: "q-cat-speelplaatsoverkapping-coverage",
        },
        {
          id: "node-cat-speelplaatsoverkapping-uv-level",
          questionId: "q-cat-speelplaatsoverkapping-uv-level",
        },
        {
          id: "node-cat-speelplaatsoverkapping-fall-zone",
          questionId: "q-cat-speelplaatsoverkapping-fall-zone",
        },
      ],
      edges: [],
    },
    {
      id: "flow-category-stadsmeubilair",
      name: "Stadsmeubilair",
      scope: {
        level: "category",
        categoryId: "stadsmeubilair",
      },
      nodes: [
        {
          id: "node-cat-stadsmeubilair-function",
          questionId: "q-cat-stadsmeubilair-function",
        },
        {
          id: "node-cat-stadsmeubilair-vandalism",
          questionId: "q-cat-stadsmeubilair-vandalism",
        },
        {
          id: "node-cat-stadsmeubilair-maintenance",
          questionId: "q-cat-stadsmeubilair-maintenance",
        },
        {
          id: "node-cat-stadsmeubilair-usage",
          questionId: "q-cat-stadsmeubilair-usage",
        },
      ],
      edges: [],
    },
    {
      id: "flow-category-maatwerk-project",
      name: "Maatwerk project",
      scope: {
        level: "category",
        categoryId: "maatwerk-project",
      },
      nodes: [
        {
          id: "node-cat-maatwerk-project-use-case",
          questionId: "q-cat-maatwerk-project-use-case",
        },
        {
          id: "node-cat-maatwerk-project-constraints",
          questionId: "q-cat-maatwerk-project-constraints",
        },
        {
          id: "node-cat-maatwerk-project-integration",
          questionId: "q-cat-maatwerk-project-integration",
        },
        {
          id: "node-cat-maatwerk-project-lifespan",
          questionId: "q-cat-maatwerk-project-lifespan",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-buitenstructuur",
      name: "Buitenstructuur",
      scope: {
        level: "context",
        contextId: "buitenstructuur",
      },
      nodes: [
        {
          id: "node-ctx-buitenstructuur-open-sides",
          questionId: "q-ctx-buitenstructuur-open-sides",
        },
        {
          id: "node-ctx-buitenstructuur-wind-zone",
          questionId: "q-ctx-buitenstructuur-wind-zone",
        },
        {
          id: "node-ctx-buitenstructuur-drainage",
          questionId: "q-ctx-buitenstructuur-drainage",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-industriele-constructie",
      name: "Industriele constructie",
      scope: {
        level: "context",
        contextId: "industriele-constructie",
      },
      nodes: [
        {
          id: "node-ctx-industriele-constructie-load-class",
          questionId: "q-ctx-industriele-constructie-load-class",
        },
        {
          id: "node-ctx-industriele-constructie-dynamic-loads",
          questionId: "q-ctx-industriele-constructie-dynamic-loads",
        },
        {
          id: "node-ctx-industriele-constructie-maintenance-access",
          questionId: "q-ctx-industriele-constructie-maintenance-access",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-zitoplossingen",
      name: "Zitoplossingen",
      scope: {
        level: "context",
        contextId: "zitoplossingen",
      },
      nodes: [
        {
          id: "node-ctx-zitoplossingen-capacity",
          questionId: "q-ctx-zitoplossingen-capacity",
        },
        {
          id: "node-ctx-zitoplossingen-backrest",
          questionId: "q-ctx-zitoplossingen-backrest",
        },
        {
          id: "node-ctx-zitoplossingen-material",
          questionId: "q-ctx-zitoplossingen-material",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-fietsparkeren-mobiliteit",
      name: "Fietsparkeren & mobiliteit",
      scope: {
        level: "context",
        contextId: "fietsparkeren-mobiliteit",
      },
      nodes: [
        {
          id: "node-ctx-fietsparkeren-mobiliteit-capacity",
          questionId: "q-ctx-fietsparkeren-mobiliteit-capacity",
        },
        {
          id: "node-ctx-fietsparkeren-mobiliteit-bike-types",
          questionId: "q-ctx-fietsparkeren-mobiliteit-bike-types",
        },
        {
          id: "node-ctx-fietsparkeren-mobiliteit-charging",
          questionId: "q-ctx-fietsparkeren-mobiliteit-charging",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-planters-groenvakken",
      name: "Planters & groenvakken",
      scope: {
        level: "context",
        contextId: "planters-groenvakken",
      },
      nodes: [
        {
          id: "node-ctx-planters-groenvakken-depth",
          questionId: "q-ctx-planters-groenvakken-depth",
        },
        {
          id: "node-ctx-planters-groenvakken-irrigation",
          questionId: "q-ctx-planters-groenvakken-irrigation",
        },
        {
          id: "node-ctx-planters-groenvakken-water-buffer",
          questionId: "q-ctx-planters-groenvakken-water-buffer",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-interieur-meubels",
      name: "Interieur & meubels",
      scope: {
        level: "context",
        contextId: "interieur-meubels",
      },
      nodes: [
        {
          id: "node-ctx-interieur-meubels-room-type",
          questionId: "q-ctx-interieur-meubels-room-type",
        },
        {
          id: "node-ctx-interieur-meubels-fire-class",
          questionId: "q-ctx-interieur-meubels-fire-class",
        },
        {
          id: "node-ctx-interieur-meubels-demountable",
          questionId: "q-ctx-interieur-meubels-demountable",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-stadsmeubilair-publieke-inrichting",
      name: "Stadsmeubilair & publieke inrichting",
      scope: {
        level: "context",
        contextId: "stadsmeubilair-publieke-inrichting",
      },
      nodes: [
        {
          id: "node-ctx-stadsmeubilair-publieke-inrichting-accessibility",
          questionId: "q-ctx-stadsmeubilair-publieke-inrichting-accessibility",
        },
        {
          id: "node-ctx-stadsmeubilair-publieke-inrichting-usage",
          questionId: "q-ctx-stadsmeubilair-publieke-inrichting-usage",
        },
        {
          id: "node-ctx-stadsmeubilair-publieke-inrichting-maintenance-contract",
          questionId: "q-ctx-stadsmeubilair-publieke-inrichting-maintenance-contract",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-verlichting",
      name: "Verlichting",
      scope: {
        level: "context",
        contextId: "verlichting",
      },
      nodes: [
        {
          id: "node-ctx-verlichting-light-level",
          questionId: "q-ctx-verlichting-light-level",
        },
        {
          id: "node-ctx-verlichting-power-source",
          questionId: "q-ctx-verlichting-power-source",
        },
        {
          id: "node-ctx-verlichting-maintenance-access",
          questionId: "q-ctx-verlichting-maintenance-access",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-bekleding-gevel-element",
      name: "Bekleding & gevel-element",
      scope: {
        level: "context",
        contextId: "bekleding-gevel-element",
      },
      nodes: [
        {
          id: "node-ctx-bekleding-gevel-element-facade-type",
          questionId: "q-ctx-bekleding-gevel-element-facade-type",
        },
        {
          id: "node-ctx-bekleding-gevel-element-ventilated-gap",
          questionId: "q-ctx-bekleding-gevel-element-ventilated-gap",
        },
        {
          id: "node-ctx-bekleding-gevel-element-visible-sides",
          questionId: "q-ctx-bekleding-gevel-element-visible-sides",
        },
      ],
      edges: [],
    },
    {
      id: "flow-context-object-speciaal-project",
      name: "Object / speciaal project",
      scope: {
        level: "context",
        contextId: "object-speciaal-project",
      },
      nodes: [
        {
          id: "node-ctx-object-speciaal-project-interaction",
          questionId: "q-ctx-object-speciaal-project-interaction",
        },
        {
          id: "node-ctx-object-speciaal-project-moving-parts",
          questionId: "q-ctx-object-speciaal-project-moving-parts",
        },
        {
          id: "node-ctx-object-speciaal-project-transport-limit",
          questionId: "q-ctx-object-speciaal-project-transport-limit",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-vrijstaand",
      name: "Vrijstaand",
      scope: {
        level: "installation",
        installationId: "vrijstaand",
      },
      nodes: [
        {
          id: "node-inst-vrijstaand-foundation",
          questionId: "q-inst-vrijstaand-foundation",
        },
        {
          id: "node-inst-vrijstaand-anchor-visible",
          questionId: "q-inst-vrijstaand-anchor-visible",
        },
        {
          id: "node-inst-vrijstaand-clear-height",
          questionId: "q-inst-vrijstaand-clear-height",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-tegen-gevel",
      name: "Tegen gevel",
      scope: {
        level: "installation",
        installationId: "tegen-gevel",
      },
      nodes: [
        {
          id: "node-inst-tegen-gevel-facade-material",
          questionId: "q-inst-tegen-gevel-facade-material",
        },
        {
          id: "node-inst-tegen-gevel-waterproofing",
          questionId: "q-inst-tegen-gevel-waterproofing",
        },
        {
          id: "node-inst-tegen-gevel-support-span",
          questionId: "q-inst-tegen-gevel-support-span",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-aangebouwd",
      name: "Aangebouwd",
      scope: {
        level: "installation",
        installationId: "aangebouwd",
      },
      nodes: [
        {
          id: "node-inst-aangebouwd-roof-connection",
          questionId: "q-inst-aangebouwd-roof-connection",
        },
        {
          id: "node-inst-aangebouwd-building-joint",
          questionId: "q-inst-aangebouwd-building-joint",
        },
        {
          id: "node-inst-aangebouwd-expansion-joint",
          questionId: "q-inst-aangebouwd-expansion-joint",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-modulair-gekoppeld",
      name: "Modulair gekoppeld",
      scope: {
        level: "installation",
        installationId: "modulair-gekoppeld",
      },
      nodes: [
        {
          id: "node-inst-modulair-gekoppeld-module-count",
          questionId: "q-inst-modulair-gekoppeld-module-count",
        },
        {
          id: "node-inst-modulair-gekoppeld-expandable",
          questionId: "q-inst-modulair-gekoppeld-expandable",
        },
        {
          id: "node-inst-modulair-gekoppeld-coupling",
          questionId: "q-inst-modulair-gekoppeld-coupling",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-inbouw-maatwerk",
      name: "Inbouw maatwerk",
      scope: {
        level: "installation",
        installationId: "inbouw-maatwerk",
      },
      nodes: [
        {
          id: "node-inst-inbouw-maatwerk-width",
          questionId: "q-inst-inbouw-maatwerk-width",
        },
        {
          id: "node-inst-inbouw-maatwerk-depth",
          questionId: "q-inst-inbouw-maatwerk-depth",
        },
        {
          id: "node-inst-inbouw-maatwerk-tolerances",
          questionId: "q-inst-inbouw-maatwerk-tolerances",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-verrijdbaar-tijdelijk",
      name: "Verrijdbaar / tijdelijk",
      scope: {
        level: "installation",
        installationId: "verrijdbaar-tijdelijk",
      },
      nodes: [
        {
          id: "node-inst-verrijdbaar-tijdelijk-wheel-type",
          questionId: "q-inst-verrijdbaar-tijdelijk-wheel-type",
        },
        {
          id: "node-inst-verrijdbaar-tijdelijk-weight-limit",
          questionId: "q-inst-verrijdbaar-tijdelijk-weight-limit",
        },
        {
          id: "node-inst-verrijdbaar-tijdelijk-indoor-storage",
          questionId: "q-inst-verrijdbaar-tijdelijk-indoor-storage",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-integratie-omgeving",
      name: "Integratie omgeving",
      scope: {
        level: "installation",
        installationId: "integratie-omgeving",
      },
      nodes: [
        {
          id: "node-inst-integratie-omgeving-integration",
          questionId: "q-inst-integratie-omgeving-integration",
        },
        {
          id: "node-inst-integratie-omgeving-visibility",
          questionId: "q-inst-integratie-omgeving-visibility",
        },
        {
          id: "node-inst-integratie-omgeving-maintenance-access",
          questionId: "q-inst-integratie-omgeving-maintenance-access",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-wandmontage",
      name: "Wandmontage",
      scope: {
        level: "installation",
        installationId: "wandmontage",
      },
      nodes: [
        {
          id: "node-inst-wandmontage-wall-capacity",
          questionId: "q-inst-wandmontage-wall-capacity",
        },
        {
          id: "node-inst-wandmontage-fixing",
          questionId: "q-inst-wandmontage-fixing",
        },
        {
          id: "node-inst-wandmontage-mount-height",
          questionId: "q-inst-wandmontage-mount-height",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-plafondmontage",
      name: "Plafondmontage",
      scope: {
        level: "installation",
        installationId: "plafondmontage",
      },
      nodes: [
        {
          id: "node-inst-plafondmontage-ceiling-type",
          questionId: "q-inst-plafondmontage-ceiling-type",
        },
        {
          id: "node-inst-plafondmontage-clear-height",
          questionId: "q-inst-plafondmontage-clear-height",
        },
        {
          id: "node-inst-plafondmontage-extra-suspension",
          questionId: "q-inst-plafondmontage-extra-suspension",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-integratie-bestaand",
      name: "Integratie bestaand",
      scope: {
        level: "installation",
        installationId: "integratie-bestaand",
      },
      nodes: [
        {
          id: "node-inst-integratie-bestaand-existing-structure",
          questionId: "q-inst-integratie-bestaand-existing-structure",
        },
        {
          id: "node-inst-integratie-bestaand-measurement-checked",
          questionId: "q-inst-integratie-bestaand-measurement-checked",
        },
        {
          id: "node-inst-integratie-bestaand-demountable",
          questionId: "q-inst-integratie-bestaand-demountable",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-integratie-constructie",
      name: "Integratie constructie",
      scope: {
        level: "installation",
        installationId: "integratie-constructie",
      },
      nodes: [
        {
          id: "node-inst-integratie-constructie-structure-type",
          questionId: "q-inst-integratie-constructie-structure-type",
        },
        {
          id: "node-inst-integratie-constructie-connection-type",
          questionId: "q-inst-integratie-constructie-connection-type",
        },
        {
          id: "node-inst-integratie-constructie-reinforcement",
          questionId: "q-inst-integratie-constructie-reinforcement",
        },
      ],
      edges: [],
    },
    {
      id: "flow-installation-gevelmontage",
      name: "Gevelmontage",
      scope: {
        level: "installation",
        installationId: "gevelmontage",
      },
      nodes: [
        {
          id: "node-inst-gevelmontage-facade-system",
          questionId: "q-inst-gevelmontage-facade-system",
        },
        {
          id: "node-inst-gevelmontage-drilling-allowed",
          questionId: "q-inst-gevelmontage-drilling-allowed",
        },
        {
          id: "node-inst-gevelmontage-finish-type",
          questionId: "q-inst-gevelmontage-finish-type",
        },
      ],
      edges: [],
    },
  ],
};
