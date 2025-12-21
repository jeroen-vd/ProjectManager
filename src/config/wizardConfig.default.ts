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

export const defaultWizardConfig: WizardConfig =
{
  "categories": [
    {
      "id": "fietsenstalling",
      "label": "Fietsenstalling",
      "iconKey": "bike"
    },
    {
      "id": "luifel-overkapping",
      "label": "Luifel / overkapping",
      "iconKey": "canopy"
    },
    {
      "id": "speelplaatsoverkapping",
      "label": "Speelplaatsoverkapping",
      "iconKey": "play"
    },
    {
      "id": "stadsmeubilair",
      "label": "Stadsmeubilair",
      "iconKey": "street"
    },
    {
      "id": "maatwerk-project",
      "label": "Maatwerk project",
      "iconKey": "custom"
    }
  ],
  "contextsByCategory": {
    "fietsenstalling": [
      {
        "id": "buitenstructuur",
        "label": "Buitenstructuur",
        "iconKey": "outdoor"
      }
    ],
    "luifel-overkapping": [
      {
        "id": "buitenstructuur",
        "label": "Buitenstructuur",
        "iconKey": "outdoor"
      },
      {
        "id": "industriele-constructie",
        "label": "Industriële constructie",
        "iconKey": "industrial"
      }
    ],
    "speelplaatsoverkapping": [
      {
        "id": "buitenstructuur",
        "label": "Buitenstructuur",
        "iconKey": "outdoor"
      }
    ],
    "stadsmeubilair": [
      {
        "id": "zitoplossingen",
        "label": "Zitoplossingen"
      },
      {
        "id": "fietsparkeren-mobiliteit",
        "label": "Fietsparkeren & Mobiliteit"
      },
      {
        "id": "planters-groenvakken",
        "label": "Planters & groenvakken"
      }
    ],
    "maatwerk-project": [
      {
        "id": "industriele-constructie",
        "label": "Industriële constructie",
        "iconKey": "industrial"
      },
      {
        "id": "interieur-meubels",
        "label": "Interieur & meubels",
        "iconKey": "interior"
      },
      {
        "id": "stadsmeubilair-publieke-inrichting",
        "label": "Stadsmeubilair & publieke inrichting",
        "iconKey": "street"
      },
      {
        "id": "verlichting",
        "label": "Verlichting",
        "iconKey": "lighting"
      },
      {
        "id": "bekleding-gevel-element",
        "label": "Bekleding & gevel-element"
      },
      {
        "id": "object-speciaal-project",
        "label": "Object / speciaal project",
        "iconKey": "art"
      },
      {
        "id": "buitenstructuur",
        "label": "Buitenstructuur",
        "iconKey": "outdoor"
      }
    ]
  },
  "installationsByContext": {
    "buitenstructuur": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "inbouw-maatwerk",
      "verrijdbaar-tijdelijk",
      "integratie-omgeving"
    ],
    "interieur-meubels": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
      "integratie-constructie",
      "gevelmontage",
      "integratie-omgeving"
    ],
    "industriele-constructie": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "inbouw-maatwerk",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
      "integratie-omgeving"
    ],
    "verlichting-draagstructuren": [
      "vrijstaand",
      "wandmontage",
      "plafondmontage",
      "integratie-constructie"
    ],
    "object-kunst-speciaal": [
      "vrijstaand",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk"
    ],
    "zitoplossingen": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "inbouw-maatwerk",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
      "integratie-constructie",
      "integratie-omgeving"
    ],
    "fietsparkeren-mobiliteit": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
      "integratie-constructie",
      "integratie-omgeving"
    ],
    "planters-groenvakken": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "inbouw-maatwerk",
      "verrijdbaar-tijdelijk",
      "integratie-constructie",
      "integratie-bestaand"
    ],
    "stadsmeubilair-publieke-inrichting": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
      "integratie-bestaand",
      "verrijdbaar-tijdelijk",
      "integratie-constructie",
      "gevelmontage",
      "integratie-omgeving"
    ],
    "verlichting": [
      "vrijstaand",
      "tegen-gevel",
      "aangebouwd",
      "modulair-gekoppeld",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
      "integratie-bestaand",
      "integratie-constructie"
    ],
    "bekleding-gevel-element": [
      "tegen-gevel",
      "modulair-gekoppeld",
      "wandmontage",
      "plafondmontage",
      "inbouw-maatwerk",
      "integratie-constructie",
      "gevelmontage"
    ],
    "object-speciaal-project": [
      "vrijstaand",
      "modulair-gekoppeld",
      "wandmontage",
      "plafondmontage",
      "verrijdbaar-tijdelijk"
    ]
  },
  "installationLabels": {
    "vrijstaand": "Vrijstaand",
    "tegen-gevel": "Tegen gevel",
    "aangebouwd": "Aangebouwd",
    "modulair-gekoppeld": "Modulair / gekoppeld",
    "vrijstaand-object": "Vrijstaand object",
    "wandmontage": "Wandmontage",
    "plafondmontage": "Plafondmontage",
    "inbouw-maatwerk": "Inbouw (maatwerk)",
    "eigen-frame": "Op eigen frame",
    "integratie-bestaand": "Geïntegreerd in bestaande installatie",
    "verrijdbaar-tijdelijk": "Verrijdbaar / tijdelijk",
    "integratie-constructie": "Geïntegreerd in constructie",
    "integratie-omgeving": "Geïntegreerd in omgeving",
    "gevelmontage": "Gevelmontage"
  },
  "installationIcons": {
    "vrijstaand": "freestanding",
    "tegen-gevel": "wall",
    "aangebouwd": "attached",
    "modulair-gekoppeld": "modular",
    "vrijstaand-object": "freestanding",
    "wandmontage": "wall",
    "plafondmontage": "ceiling",
    "inbouw-maatwerk": "inset",
    "eigen-frame": "frame",
    "integratie-bestaand": "integrated",
    "verrijdbaar-tijdelijk": "mobile",
    "integratie-constructie": "structure"
  }
};
