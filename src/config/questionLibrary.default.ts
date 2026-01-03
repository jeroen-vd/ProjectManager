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

export const defaultQuestionLibrary: QuestionLibrary =
{
  "questions": [
    {
      "id": "q-material-main",
      "conceptKey": "material.main",
      "prompt": "Hoofdmateriaal constructie",
      "kind": "single",
      "options": [
        {
          "id": "opt-s235",
          "label": "Staal S235",
          "value": "Staal S235"
        },
        {
          "id": "opt-s355",
          "label": "Staal S355",
          "value": "Staal S355"
        },
        {
          "id": "opt-corten",
          "label": "Corten A",
          "value": "Corten A"
        },
        {
          "id": "opt-inox",
          "label": "Inox",
          "value": "Inox"
        },
        {
          "id": "opt-alu",
          "label": "Aluminium",
          "value": "Aluminium"
        }
      ],
      "tags": [
        "material"
      ],
      "outputs": [
        {
          "id": "task-material-main",
          "titleTemplate": "Bepaal hoofdmateriaal: {{answer}}",
          "priority": "medium",
          "tags": [
            "material"
          ],
          "dependsOn": []
        }
      ]
    },
    {
      "id": "q-finishes",
      "conceptKey": "finish.method",
      "prompt": "Afwerkingsmethode",
      "kind": "multi",
      "options": [
        {
          "id": "opt-galv",
          "label": "Thermisch verzinkt",
          "value": "Thermisch verzinkt"
        },
        {
          "id": "opt-paint",
          "label": "Gelakt",
          "value": "Gelakt"
        },
        {
          "id": "opt-duplex",
          "label": "Duplex (verzinkt + gelakt)",
          "value": "Duplex (verzinkt + gelakt)"
        },
        {
          "id": "opt-raw",
          "label": "Onbehandeld",
          "value": "Onbehandeld"
        }
      ],
      "tags": [
        "finish"
      ]
    },
    {
      "id": "q-ral-color",
      "conceptKey": "finish.ral",
      "prompt": "RAL-kleur",
      "kind": "text",
      "tags": [
        "finish"
      ]
    },
    {
      "id": "q-gloss-level",
      "conceptKey": "finish.gloss",
      "prompt": "Glansgraad",
      "kind": "single",
      "options": [
        {
          "id": "opt-mat",
          "label": "Mat",
          "value": "Mat"
        },
        {
          "id": "opt-semi",
          "label": "Zijdeglans",
          "value": "Zijdeglans"
        },
        {
          "id": "opt-high",
          "label": "Hoogglans",
          "value": "Hoogglans"
        }
      ],
      "tags": [
        "finish"
      ]
    },
    {
      "id": "q-profile-types",
      "conceptKey": "profile.types",
      "prompt": "Profieltypes",
      "kind": "multi",
      "options": [
        {
          "id": "opt-box",
          "label": "Kokerprofielen",
          "value": "Kokerprofielen"
        },
        {
          "id": "opt-i",
          "label": "I-profielen (IPE/HEA)",
          "value": "I-profielen (IPE/HEA)"
        },
        {
          "id": "opt-u",
          "label": "U-profielen",
          "value": "U-profielen"
        },
        {
          "id": "opt-l",
          "label": "L-profielen",
          "value": "L-profielen"
        },
        {
          "id": "opt-plate",
          "label": "Plaatmateriaal",
          "value": "Plaatmateriaal"
        }
      ],
      "tags": [
        "profile"
      ]
    },
    {
      "id": "q-en1090-required",
      "conceptKey": "en1090.required",
      "prompt": "EN 1090 / CE-markering vereist?",
      "kind": "boolean",
      "tags": [
        "compliance"
      ],
      "outputs": [
        {
          "id": "task-en1090-check",
          "titleTemplate": "Controleer EN1090 vereiste: {{answer}}",
          "priority": "high",
          "tags": [
            "compliance"
          ],
          "dependsOn": []
        }
      ]
    },
    {
      "id": "q-en1090-exc",
      "conceptKey": "en1090.exc",
      "prompt": "Uitvoeringsklasse",
      "kind": "single",
      "options": [
        {
          "id": "opt-exc1",
          "label": "EXC1",
          "value": "EXC1"
        },
        {
          "id": "opt-exc2",
          "label": "EXC2",
          "value": "EXC2"
        },
        {
          "id": "opt-exc3",
          "label": "EXC3",
          "value": "EXC3"
        },
        {
          "id": "opt-exc4",
          "label": "EXC4",
          "value": "EXC4"
        }
      ],
      "tags": [
        "compliance"
      ]
    },
    {
      "id": "q-en1090-docs",
      "conceptKey": "en1090.documents",
      "prompt": "Documenten nodig",
      "kind": "multi",
      "options": [
        {
          "id": "opt-dop",
          "label": "DoP (Declaration of Performance)",
          "value": "DoP (Declaration of Performance)"
        },
        {
          "id": "opt-ce",
          "label": "CE label / markering",
          "value": "CE label / markering"
        },
        {
          "id": "opt-cert",
          "label": "Materiaalcertificaten (3.1)",
          "value": "Materiaalcertificaten (3.1)"
        },
        {
          "id": "opt-wps",
          "label": "Lasdocumentatie (WPS/WPQR)",
          "value": "Lasdocumentatie (WPS/WPQR)"
        }
      ],
      "tags": [
        "compliance"
      ]
    },
    {
      "id": "q-en1090-note",
      "conceptKey": "en1090.note",
      "prompt": "Reden / toelichting",
      "kind": "text",
      "tags": [
        "compliance"
      ]
    }
  ],
  "flows": [
    {
      "id": "flow-global",
      "name": "Global",
      "scope": {
        "level": "global"
      },
      "nodes": [
        {
          "id": "node-material-main",
          "questionId": "q-material-main",
          "position": {
            "x": 80,
            "y": 80
          }
        },
        {
          "id": "node-finishes",
          "questionId": "q-finishes",
          "position": {
            "x": 340,
            "y": 80
          }
        },
        {
          "id": "node-ral-color",
          "questionId": "q-ral-color",
          "position": {
            "x": 80,
            "y": 240
          }
        },
        {
          "id": "node-gloss-level",
          "questionId": "q-gloss-level",
          "position": {
            "x": 340,
            "y": 240
          }
        },
        {
          "id": "node-profile-types",
          "questionId": "q-profile-types",
          "position": {
            "x": 80,
            "y": 400
          }
        },
        {
          "id": "node-en1090-required",
          "questionId": "q-en1090-required",
          "position": {
            "x": 340,
            "y": 400
          }
        },
        {
          "id": "node-en1090-exc",
          "questionId": "q-en1090-exc",
          "position": {
            "x": -75.80484429065734,
            "y": 564.961937716263
          }
        },
        {
          "id": "node-en1090-docs",
          "questionId": "q-en1090-docs",
          "position": {
            "x": 600.9979238754327,
            "y": 562.9771626297578
          }
        },
        {
          "id": "node-en1090-note",
          "questionId": "q-en1090-note",
          "position": {
            "x": 80,
            "y": 720
          }
        }
      ],
      "edges": [
        {
          "id": "edge-finishes-ral",
          "from": "node-finishes",
          "to": "node-ral-color",
          "when": {
            "expression": "finishes contains 'Gelakt' or 'Duplex (verzinkt + gelakt)'"
          }
        },
        {
          "id": "edge-finishes-gloss",
          "from": "node-finishes",
          "to": "node-gloss-level",
          "when": {
            "expression": "finishes contains 'Gelakt' or 'Duplex (verzinkt + gelakt)'"
          }
        },
        {
          "id": "edge-en1090-exc",
          "from": "node-en1090-required",
          "to": "node-en1090-exc",
          "when": {
            "expression": "en1090.required == true"
          }
        },
        {
          "id": "edge-en1090-docs",
          "from": "node-en1090-required",
          "to": "node-en1090-docs",
          "when": {
            "expression": "en1090.required == true"
          }
        },
        {
          "id": "edge-en1090-note",
          "from": "node-en1090-required",
          "to": "node-en1090-note",
          "when": {
            "expression": "en1090.required == false"
          }
        }
      ]
    },
    {
      "id": "flow-installation-opstelling-vrijstaand",
      "name": "Opstelling: Vrijstaand",
      "scope": {
        "level": "installation",
        "categoryId": "fietsenstalling",
        "contextId": "buitenstructuur",
        "installationId": "vrijstaand"
      },
      "nodes": [],
      "edges": []
    },
    {
      "id": "flow-installation-opstelling-tegen-gevel",
      "name": "Opstelling: Tegen gevel",
      "scope": {
        "level": "installation",
        "categoryId": "fietsenstalling",
        "contextId": "buitenstructuur",
        "installationId": "tegen-gevel"
      },
      "nodes": [],
      "edges": []
    },
    {
      "id": "flow-context-context-buitenstructuur",
      "name": "Context: Buitenstructuur",
      "scope": {
        "level": "context",
        "categoryId": "fietsenstalling",
        "contextId": "buitenstructuur"
      },
      "nodes": [],
      "edges": []
    }
  ]
};
