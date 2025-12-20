export type WizardConfig = {
  categories: { id: string; label: string; iconKey?: string }[];
  contextsByCategory: Record<
    string,
    { id: string; label: string; iconKey?: string }[]
  >;
  installationsByContext: Record<string, string[]>;
  installationLabels: Record<string, string>;
  installationIcons: Record<string, string>;
};

export const defaultWizardConfig: WizardConfig = {
  categories: [
    { id: "fietsenstalling", label: "Fietsenstalling", iconKey: "bike" },
    { id: "luifel-overkapping", label: "Luifel / overkapping", iconKey: "canopy" },
    {
      id: "speelplaatsoverkapping",
      label: "Speelplaatsoverkapping",
      iconKey: "play",
    },
    { id: "stadsmeubilair", label: "Stadsmeubilair", iconKey: "street" },
    { id: "maatwerk-project", label: "Maatwerk project", iconKey: "custom" },
  ],
  contextsByCategory: {
    fietsenstalling: [
      { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
      {
        id: "interieur-meubels",
        label: "Interieur & meubels",
        iconKey: "interior",
      },
      {
        id: "industriele-constructie",
        label: "Industriële constructie",
        iconKey: "industrial",
      },
      {
        id: "verlichting-draagstructuren",
        label: "Verlichting & draagstructuren",
        iconKey: "lighting",
      },
      {
        id: "object-kunst-speciaal",
        label: "Object / kunst / speciaal project",
        iconKey: "art",
      },
    ],
    "luifel-overkapping": [
      { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
      {
        id: "interieur-meubels",
        label: "Interieur & meubels",
        iconKey: "interior",
      },
      {
        id: "industriele-constructie",
        label: "Industriële constructie",
        iconKey: "industrial",
      },
      {
        id: "verlichting-draagstructuren",
        label: "Verlichting & draagstructuren",
        iconKey: "lighting",
      },
      {
        id: "object-kunst-speciaal",
        label: "Object / kunst / speciaal project",
        iconKey: "art",
      },
    ],
    speelplaatsoverkapping: [
      { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
      {
        id: "interieur-meubels",
        label: "Interieur & meubels",
        iconKey: "interior",
      },
      {
        id: "industriele-constructie",
        label: "Industriële constructie",
        iconKey: "industrial",
      },
      {
        id: "verlichting-draagstructuren",
        label: "Verlichting & draagstructuren",
        iconKey: "lighting",
      },
      {
        id: "object-kunst-speciaal",
        label: "Object / kunst / speciaal project",
        iconKey: "art",
      },
    ],
    stadsmeubilair: [
      { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
      {
        id: "interieur-meubels",
        label: "Interieur & meubels",
        iconKey: "interior",
      },
      {
        id: "industriele-constructie",
        label: "Industriële constructie",
        iconKey: "industrial",
      },
      {
        id: "verlichting-draagstructuren",
        label: "Verlichting & draagstructuren",
        iconKey: "lighting",
      },
      {
        id: "object-kunst-speciaal",
        label: "Object / kunst / speciaal project",
        iconKey: "art",
      },
    ],
    "maatwerk-project": [
      { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
      {
        id: "interieur-meubels",
        label: "Interieur & meubels",
        iconKey: "interior",
      },
      {
        id: "industriele-constructie",
        label: "Industriële constructie",
        iconKey: "industrial",
      },
      {
        id: "verlichting-draagstructuren",
        label: "Verlichting & draagstructuren",
        iconKey: "lighting",
      },
      {
        id: "object-kunst-speciaal",
        label: "Object / kunst / speciaal project",
        iconKey: "art",
      },
    ],
  },
  installationsByContext: {
    buitenstructuur: [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
    ],
    "interieur-meubels": [
      "vrijstaand-object",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
    ],
    "industriele-constructie": [
      "eigen-frame",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
    ],
    "verlichting-draagstructuren": [
      "vrijstaand",
      "wandmontage",
      "plafondmontage",
      "integratie-constructie",
    ],
    "object-kunst-speciaal": [
      "vrijstaand",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
    ],
  },
  installationLabels: {
    vrijstaand: "Vrijstaand",
    "tegen-gevel": "Tegen gevel",
    aangebouwd: "Aangebouwd",
    "modulair-gekoppeld": "Modulair / gekoppeld",
    "vrijstaand-object": "Vrijstaand object",
    wandmontage: "Wandmontage",
    plafondmontage: "Plafondmontage",
    "inbouw-maatwerk": "Inbouw (maatwerk)",
    "eigen-frame": "Op eigen frame",
    "integratie-bestaand": "Geïntegreerd in bestaande installatie",
    "verrijdbaar-tijdelijk": "Verrijdbaar / tijdelijk",
    "integratie-constructie": "Geïntegreerd in constructie",
  },
  installationIcons: {
    vrijstaand: "freestanding",
    "tegen-gevel": "wall",
    aangebouwd: "attached",
    "modulair-gekoppeld": "modular",
    "vrijstaand-object": "freestanding",
    wandmontage: "wall",
    plafondmontage: "ceiling",
    "inbouw-maatwerk": "inset",
    "eigen-frame": "frame",
    "integratie-bestaand": "integrated",
    "verrijdbaar-tijdelijk": "mobile",
    "integratie-constructie": "structure",
  },
};
