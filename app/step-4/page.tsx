"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../wizard/WizardContext";
import WizardStepIndicator from "../wizard/WizardStepIndicator";
import { loadWizardConfig } from "../../src/lib/wizardConfigStorage";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "../../src/config/wizardConfig.default";

type SelectOption = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

type CheckboxCardProps = {
  label: string;
  checked: boolean;
  onChange: () => void;
};

const contextAliases: Record<string, string> = {
  zitoplossingen: "stadsmeubilair-publieke-inrichting",
  "fietsparkeren-mobiliteit": "stadsmeubilair-publieke-inrichting",
  "planters-groenvakken": "stadsmeubilair-publieke-inrichting",
};

const roofOptions: SelectOption[] = [
  { value: "none", label: "Geen dak" },
  { value: "fixed", label: "Vast dak" },
  { value: "transparent", label: "Transparant dak" },
];

const columnOptions: SelectOption[] = [
  { value: "standard", label: "Standaard" },
  { value: "reinforced", label: "Versterkt / zwaar belast" },
];

const sidePanelOptions: SelectOption[] = [
  { value: "none", label: "Geen" },
  { value: "partial", label: "Gedeeltelijk" },
  { value: "full", label: "Volledig gesloten" },
];

const drainageOptions: SelectOption[] = [
  { value: "none", label: "Niet voorzien" },
  { value: "internal", label: "Intern" },
  { value: "external", label: "Extern" },
];

const lightingOptions: SelectOption[] = [
  { value: "none", label: "Geen" },
  { value: "integrated", label: "Geïntegreerd" },
  { value: "third-party", label: "Voorzien (armaturen door derden)" },
];

const claddingOptions: SelectOption[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Gesloten" },
  { value: "partial", label: "Gedeeltelijk open" },
];

const closureOptions: SelectOption[] = [
  { value: "none", label: "Geen" },
  { value: "doors", label: "Deuren" },
  { value: "drawers", label: "Lades" },
];

const enclosureOptions: SelectOption[] = [
  { value: "none", label: "Geen" },
  { value: "partial", label: "Gedeeltelijk" },
  { value: "full", label: "Volledig" },
];

const serviceAccessOptions: SelectOption[] = [
  { value: "not-required", label: "Niet vereist" },
  { value: "required", label: "Vereist" },
];

const temporalityOptions: SelectOption[] = [
  { value: "permanent", label: "Permanent" },
  { value: "temporary", label: "Tijdelijk" },
  { value: "demountable", label: "Demonteerbaar" },
];

function SelectField({ label, value, options, onChange }: SelectFieldProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-slate-800">{label}</h3>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
      >
        <option value="">Selecteer optie</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxCard({ label, checked, onChange }: CheckboxCardProps) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
        checked
          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-slate-900"
      />
    </label>
  );
}

export default function StepFourPage() {
  const router = useRouter();
  const { projectInfo, stepTwo, stepThree, stepFour, setStepFour } =
    useWizard();
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);
  const wizardSnapshot = useMemo(
    () => ({ projectInfo, stepTwo, stepThree, stepFour }),
    [projectInfo, stepTwo, stepThree, stepFour]
  );

  useEffect(() => {
    setConfig(loadWizardConfig());
  }, []);

  const handleExport = () => {
    const fileBase = projectInfo.projectNumber.trim() || "project";
    const safeBase = fileBase.replace(/[^a-zA-Z0-9-_]+/g, "-");
    const blob = new Blob([JSON.stringify(wizardSnapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeBase}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const updateComponent = <
    K extends keyof typeof stepFour.components,
  >(
    key: K,
    value: (typeof stepFour.components)[K]
  ) => {
    setStepFour({
      components: {
        ...stepFour.components,
        [key]: value,
      },
    });
  };

  const updateOption = <K extends keyof typeof stepFour.options>(
    key: K,
    value: (typeof stepFour.options)[K]
  ) => {
    setStepFour({
      options: {
        ...stepFour.options,
        [key]: value,
      },
    });
  };

  const toggleComponent = <K extends keyof typeof stepFour.components>(
    key: K
  ) => {
    const current = stepFour.components[key];
    if (typeof current === "boolean") {
      updateComponent(key, (!current) as (typeof stepFour.components)[K]);
    }
  };

  const toggleOption = <K extends keyof typeof stepFour.options>(key: K) => {
    updateOption(key, !stepFour.options[key]);
  };

  const hasProjectInfo = Object.values(projectInfo).every(
    (value) => value.trim().length > 0
  );
  const hasDesignContext = stepTwo.designContext.trim().length > 0;
  const contextKey =
    contextAliases[stepTwo.designContext] ?? stepTwo.designContext;

  const contextLabel = useMemo(() => {
    const contexts = Object.values(config.contextsByCategory).flat();
    return (
      contexts.find((context) => context.id === stepTwo.designContext)?.label ??
      stepTwo.designContext
    );
  }, [config.contextsByCategory, stepTwo.designContext]);

  const selectedComponents = useMemo(() => {
    const selections: { label: string; value: string }[] = [];

    const addSelection = (label: string, value?: string) => {
      if (!value) {
        return;
      }
      selections.push({ label, value });
    };

    const addBoolean = (label: string, value: boolean) => {
      if (value) {
        selections.push({ label, value: "Ja" });
      }
    };

    const roofLabels = {
      none: "Geen dak",
      fixed: "Vast dak",
      transparent: "Transparant dak",
    } as const;
    const columnLabels = {
      standard: "Standaard",
      reinforced: "Versterkt / zwaar belast",
    } as const;
    const sidePanelLabels = {
      none: "Geen",
      partial: "Gedeeltelijk",
      full: "Volledig gesloten",
    } as const;
    const drainageLabels = {
      none: "Niet voorzien",
      internal: "Intern",
      external: "Extern",
    } as const;
    const lightingLabels = {
      none: "Geen",
      integrated: "Geïntegreerd",
      "third-party": "Voorzien (armaturen door derden)",
    } as const;
    const claddingLabels = {
      open: "Open",
      closed: "Gesloten",
      partial: "Gedeeltelijk open",
    } as const;
    const closureLabels = {
      none: "Geen",
      doors: "Deuren",
      drawers: "Lades",
    } as const;
    const enclosureLabels = {
      none: "Geen",
      partial: "Gedeeltelijk",
      full: "Volledig",
    } as const;
    const serviceLabels = {
      "not-required": "Niet vereist",
      required: "Vereist",
    } as const;
    const temporalityLabels = {
      permanent: "Permanent",
      temporary: "Tijdelijk",
      demountable: "Demonteerbaar",
    } as const;

    if (stepFour.components.roof) {
      addSelection(
        "Dakconstructie",
        roofLabels[stepFour.components.roof] ?? stepFour.components.roof
      );
    }
    if (stepFour.components.columnsAndBeams) {
      addSelection(
        "Staanders & liggers",
        columnLabels[stepFour.components.columnsAndBeams] ??
          stepFour.components.columnsAndBeams
      );
    }
    if (stepFour.components.sidePanels) {
      addSelection(
        "Wand- of zijelementen",
        sidePanelLabels[stepFour.components.sidePanels] ??
          stepFour.components.sidePanels
      );
    }
    if (stepFour.components.waterDrainage) {
      addSelection(
        "Waterafvoer",
        drainageLabels[stepFour.components.waterDrainage] ??
          stepFour.components.waterDrainage
      );
    }
    if (stepFour.components.lighting) {
      addSelection(
        "Verlichting",
        lightingLabels[stepFour.components.lighting] ??
          stepFour.components.lighting
      );
    }

    addBoolean("Achterstructuur", stepFour.components.substructure);
    if (stepFour.components.claddingPanels) {
      addSelection(
        "Bekledingspanelen",
        claddingLabels[stepFour.components.claddingPanels] ??
          stepFour.components.claddingPanels
      );
    }
    addBoolean("Bevestigingssysteem", stepFour.components.fasteningSystem);
    addBoolean("Overgangen / randen", stepFour.components.edgeTransitions);

    addBoolean("Hoofdframe (interieur)", stepFour.components.interiorMainFrame);
    addBoolean(
      "Werk- of gebruiksvlakken",
      stepFour.components.workSurfaces
    );
    if (stepFour.components.closures) {
      addSelection(
        "Afsluitingen / kasten",
        closureLabels[stepFour.components.closures] ??
          stepFour.components.closures
      );
    }
    addBoolean(
      "Afwerkingselementen",
      stepFour.components.interiorFinishing
    );

    addBoolean(
      "Hoofdframe (industrieel)",
      stepFour.components.industrialMainFrame
    );
    addBoolean("Ondersteuning / sokkel", stepFour.components.baseSupport);
    if (stepFour.components.enclosure) {
      addSelection(
        "Omkasting / bescherming",
        enclosureLabels[stepFour.components.enclosure] ??
          stepFour.components.enclosure
      );
    }
    if (stepFour.components.serviceAccess) {
      addSelection(
        "Onderhouds- en servicetoegang",
        serviceLabels[stepFour.components.serviceAccess] ??
          stepFour.components.serviceAccess
      );
    }

    addBoolean("Dragend frame", stepFour.components.publicFrame);
    addBoolean("Gebruikselementen", stepFour.components.useElements);
    addBoolean("Anti-vandalisme", stepFour.components.antiVandalism);
    addBoolean("Anti-graffiti", stepFour.components.antiGraffiti);
    addBoolean(
      "Integratie in omgeving",
      stepFour.components.environmentalIntegration
    );

    addBoolean("Lichtobjecten", stepFour.components.lightObjects);
    addBoolean("Montagewijze", stepFour.components.mountingMethod);
    addBoolean("Bekabeling / doorvoeren", stepFour.components.cabling);
    addBoolean(
      "Toegang voor onderhoud",
      stepFour.components.lightingMaintenanceAccess
    );

    addBoolean("Hoofdstructuur", stepFour.components.objectMainStructure);
    addBoolean("Unieke elementen", stepFour.components.uniqueElements);
    addBoolean(
      "Interactie / toegankelijkheid",
      stepFour.components.interactionAccessibility
    );
    if (stepFour.components.temporality) {
      addSelection(
        "Tijdelijkheid / demonteerbaarheid",
        temporalityLabels[stepFour.components.temporality] ??
          stepFour.components.temporality
      );
    }

    addBoolean("Demonteerbaar", stepFour.options.demountable);
    addBoolean("Modulair uitbreidbaar", stepFour.options.modularExpandable);
    addBoolean(
      "Toegankelijk voor onderhoud",
      stepFour.options.maintenanceAccessible
    );
    addBoolean(
      "Vandalismebestendig",
      stepFour.options.vandalismResistant
    );
    addBoolean("Weerbestendig", stepFour.options.weatherResistant);

    return selections;
  }, [stepFour]);

  const renderContextGroups = () => {
    switch (contextKey) {
      case "buitenstructuur":
        return (
          <div className="space-y-6">
            <SelectField
              label="Dakconstructie"
              value={stepFour.components.roof}
              options={roofOptions}
              onChange={(value) => updateComponent("roof", value)}
            />
            <SelectField
              label="Staanders & liggers"
              value={stepFour.components.columnsAndBeams}
              options={columnOptions}
              onChange={(value) => updateComponent("columnsAndBeams", value)}
            />
            <SelectField
              label="Wand- of zijelementen"
              value={stepFour.components.sidePanels}
              options={sidePanelOptions}
              onChange={(value) => updateComponent("sidePanels", value)}
            />
            <SelectField
              label="Waterafvoer"
              value={stepFour.components.waterDrainage}
              options={drainageOptions}
              onChange={(value) => updateComponent("waterDrainage", value)}
            />
            <SelectField
              label="Verlichting"
              value={stepFour.components.lighting}
              options={lightingOptions}
              onChange={(value) => updateComponent("lighting", value)}
            />
          </div>
        );
      case "bekleding-gevel-element":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Achterstructuur
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.substructure}
                onChange={() => toggleComponent("substructure")}
              />
            </div>
            <SelectField
              label="Bekledingspanelen"
              value={stepFour.components.claddingPanels}
              options={claddingOptions}
              onChange={(value) => updateComponent("claddingPanels", value)}
            />
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Bevestigingssysteem
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.fasteningSystem}
                onChange={() => toggleComponent("fasteningSystem")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Overgangen / randen
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.edgeTransitions}
                onChange={() => toggleComponent("edgeTransitions")}
              />
            </div>
          </div>
        );
      case "interieur-meubels":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Hoofdframe
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.interiorMainFrame}
                onChange={() => toggleComponent("interiorMainFrame")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Werk- of gebruiksvlakken
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.workSurfaces}
                onChange={() => toggleComponent("workSurfaces")}
              />
            </div>
            <SelectField
              label="Afsluitingen / kasten"
              value={stepFour.components.closures}
              options={closureOptions}
              onChange={(value) => updateComponent("closures", value)}
            />
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Afwerkingselementen
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.interiorFinishing}
                onChange={() => toggleComponent("interiorFinishing")}
              />
            </div>
          </div>
        );
      case "industriele-constructie":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Hoofdframe
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.industrialMainFrame}
                onChange={() => toggleComponent("industrialMainFrame")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Ondersteuning / sokkel
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.baseSupport}
                onChange={() => toggleComponent("baseSupport")}
              />
            </div>
            <SelectField
              label="Omkasting / bescherming"
              value={stepFour.components.enclosure}
              options={enclosureOptions}
              onChange={(value) => updateComponent("enclosure", value)}
            />
            <SelectField
              label="Onderhouds- en servicetoegang"
              value={stepFour.components.serviceAccess}
              options={serviceAccessOptions}
              onChange={(value) => updateComponent("serviceAccess", value)}
            />
          </div>
        );
      case "stadsmeubilair-publieke-inrichting":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Dragend frame
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.publicFrame}
                onChange={() => toggleComponent("publicFrame")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Gebruikselementen (zitvlak, drager, etc.)
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.useElements}
                onChange={() => toggleComponent("useElements")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Beschermende details
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <CheckboxCard
                  label="Anti-vandalisme"
                  checked={stepFour.components.antiVandalism}
                  onChange={() => toggleComponent("antiVandalism")}
                />
                <CheckboxCard
                  label="Anti-graffiti"
                  checked={stepFour.components.antiGraffiti}
                  onChange={() => toggleComponent("antiGraffiti")}
                />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Integratie in omgeving
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.environmentalIntegration}
                onChange={() => toggleComponent("environmentalIntegration")}
              />
            </div>
          </div>
        );
      case "verlichting":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Lichtobjecten
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.lightObjects}
                onChange={() => toggleComponent("lightObjects")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Montagewijze
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.mountingMethod}
                onChange={() => toggleComponent("mountingMethod")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Bekabeling / doorvoeren
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.cabling}
                onChange={() => toggleComponent("cabling")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Toegang voor onderhoud
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.lightingMaintenanceAccess}
                onChange={() => toggleComponent("lightingMaintenanceAccess")}
              />
            </div>
          </div>
        );
      case "object-speciaal-project":
        return (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Hoofdstructuur
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.objectMainStructure}
                onChange={() => toggleComponent("objectMainStructure")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Unieke elementen
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.uniqueElements}
                onChange={() => toggleComponent("uniqueElements")}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-slate-800">
                Interactie / toegankelijkheid
              </h3>
              <CheckboxCard
                label="Voorzien"
                checked={stepFour.components.interactionAccessibility}
                onChange={() => toggleComponent("interactionAccessibility")}
              />
            </div>
            <SelectField
              label="Tijdelijkheid / demonteerbaarheid"
              value={stepFour.components.temporality}
              options={temporalityOptions}
              onChange={(value) => updateComponent("temporality", value)}
            />
          </div>
        );
      default:
        return (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
            Geen componentgroepen beschikbaar voor de gekozen context.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Project Manager
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Stap 4 - Opbouw &amp; componenten
          </h1>
          <p className="text-base text-slate-600">
            Leg vast uit welke fysieke en functionele componenten het ontwerp
            bestaat.
          </p>
        </header>
        <WizardStepIndicator currentStep={4} />

        {!hasProjectInfo ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Stap 1 is nog niet ingevuld. Ga terug om de basisinformatie te
            bevestigen.
          </div>
        ) : null}

        {!hasDesignContext ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Stap 2 ontbreekt. Kies eerst een ontwerpcontext.
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Ontwerpcontext
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {contextLabel || "-"}
              </p>
            </div>
            {hasDesignContext ? renderContextGroups() : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Context-onafhankelijke opties
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-800">
                Extra eisen en eigenschappen
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <CheckboxCard
                label="Demonteerbaar"
                checked={stepFour.options.demountable}
                onChange={() => toggleOption("demountable")}
              />
              <CheckboxCard
                label="Modulair uitbreidbaar"
                checked={stepFour.options.modularExpandable}
                onChange={() => toggleOption("modularExpandable")}
              />
              <CheckboxCard
                label="Toegankelijk voor onderhoud"
                checked={stepFour.options.maintenanceAccessible}
                onChange={() => toggleOption("maintenanceAccessible")}
              />
              <CheckboxCard
                label="Vandalismebestendig"
                checked={stepFour.options.vandalismResistant}
                onChange={() => toggleOption("vandalismResistant")}
              />
              <CheckboxCard
                label="Weerbestendig"
                checked={stepFour.options.weatherResistant}
                onChange={() => toggleOption("weatherResistant")}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 text-sm text-slate-700 shadow-lg shadow-slate-200 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Tijdelijke samenvatting
          </p>
          {selectedComponents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Nog geen componenten geselecteerd.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
              {selectedComponents.map((item) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-slate-900">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={() => router.push("/step-3")}
          >
            Vorige stap
          </button>
          <button
            type="button"
            className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            onClick={handleExport}
          >
            Afronden en downloaden
          </button>
        </div>
      </main>
    </div>
  );
}
