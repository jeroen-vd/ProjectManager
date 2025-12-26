"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type ProjectInfo = {
  projectNumber: string;
  projectName: string;
  contractor: string;
  endCustomer: string;
  siteAddress: string;
};

export type StepTwoData = {
  projectCategory: string;
  designContext: string;
  installationType: string;
  totalLength: string;
  totalDepth: string;
  maxSpan: string;
};

export type StepThreeData = {
  mainMaterial: string;
  finishes: string[];
  ralColor: string;
  glossLevel: string;
  profileTypes: string[];
  extras: Record<string, AnswerValue>;
  en1090: {
    required: boolean | null;
    excClass: "" | "EXC1" | "EXC2" | "EXC3" | "EXC4";
    documents: string[];
    note: string;
  };
};

export type AnswerValue = string | string[] | boolean | number | null;

export type StepFourData = {
  components: {
    roof: "" | "none" | "fixed" | "transparent";
    columnsAndBeams: "" | "standard" | "reinforced";
    sidePanels: "" | "none" | "partial" | "full";
    waterDrainage: "" | "none" | "internal" | "external";
    lighting: "" | "none" | "integrated" | "third-party";
    substructure: boolean;
    claddingPanels: "" | "open" | "closed" | "partial";
    fasteningSystem: boolean;
    edgeTransitions: boolean;
    interiorMainFrame: boolean;
    workSurfaces: boolean;
    closures: "" | "none" | "doors" | "drawers";
    interiorFinishing: boolean;
    industrialMainFrame: boolean;
    baseSupport: boolean;
    enclosure: "" | "none" | "partial" | "full";
    serviceAccess: "" | "not-required" | "required";
    publicFrame: boolean;
    useElements: boolean;
    antiVandalism: boolean;
    antiGraffiti: boolean;
    environmentalIntegration: boolean;
    lightObjects: boolean;
    mountingMethod: boolean;
    cabling: boolean;
    lightingMaintenanceAccess: boolean;
    objectMainStructure: boolean;
    uniqueElements: boolean;
    interactionAccessibility: boolean;
    temporality: "" | "permanent" | "temporary" | "demountable";
  };
  options: {
    demountable: boolean;
    modularExpandable: boolean;
    maintenanceAccessible: boolean;
    vandalismResistant: boolean;
    weatherResistant: boolean;
  };
};

type WizardState = {
  projectInfo: ProjectInfo;
  stepTwo: StepTwoData;
  stepThree: StepThreeData;
  stepFour: StepFourData;
  setProjectInfo: (info: ProjectInfo) => void;
  setStepTwo: (update: Partial<StepTwoData>) => void;
  setStepThree: (update: Partial<StepThreeData>) => void;
  setStepFour: (update: Partial<StepFourData>) => void;
};

const initialProjectInfo: ProjectInfo = {
  projectNumber: "PR-2025-001",
  projectName: "Fietshub Centrum",
  contractor: "Bouwgroep Noord",
  endCustomer: "Gemeente Stad",
  siteAddress: "Stationsplein 12, 1000 Brussel",
};

const initialStepTwo: StepTwoData = {
  projectCategory: "fietsenstalling",
  designContext: "buitenstructuur",
  installationType: "vrijstaand",
  totalLength: "12",
  totalDepth: "4",
  maxSpan: "6",
};

const initialStepThree: StepThreeData = {
  mainMaterial: "Staal S235",
  finishes: ["Duplex (verzinkt + gelakt)"],
  ralColor: "RAL 7016",
  glossLevel: "Mat",
  profileTypes: ["Kokerprofielen", "Plaatmateriaal"],
  extras: {},
  en1090: {
    required: true,
    excClass: "EXC2",
    documents: ["DoP (Declaration of Performance)", "CE label / markering"],
    note: "",
  },
};

const initialStepFour: StepFourData = {
  components: {
    roof: "",
    columnsAndBeams: "",
    sidePanels: "",
    waterDrainage: "",
    lighting: "",
    substructure: false,
    claddingPanels: "",
    fasteningSystem: false,
    edgeTransitions: false,
    interiorMainFrame: false,
    workSurfaces: false,
    closures: "",
    interiorFinishing: false,
    industrialMainFrame: false,
    baseSupport: false,
    enclosure: "",
    serviceAccess: "",
    publicFrame: false,
    useElements: false,
    antiVandalism: false,
    antiGraffiti: false,
    environmentalIntegration: false,
    lightObjects: false,
    mountingMethod: false,
    cabling: false,
    lightingMaintenanceAccess: false,
    objectMainStructure: false,
    uniqueElements: false,
    interactionAccessibility: false,
    temporality: "",
  },
  options: {
    demountable: false,
    modularExpandable: false,
    maintenanceAccessible: false,
    vandalismResistant: false,
    weatherResistant: false,
  },
};

const WizardContext = createContext<WizardState | undefined>(undefined);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [projectInfo, setProjectInfo] =
    useState<ProjectInfo>(initialProjectInfo);
  const [stepTwo, setStepTwoState] = useState<StepTwoData>(initialStepTwo);
  const [stepThree, setStepThreeState] =
    useState<StepThreeData>(initialStepThree);
  const [stepFour, setStepFourState] =
    useState<StepFourData>(initialStepFour);

  const setStepTwo = (update: Partial<StepTwoData>) => {
    setStepTwoState((prev) => ({ ...prev, ...update }));
  };

  const setStepThree = (update: Partial<StepThreeData>) => {
    setStepThreeState((prev) => ({
      ...prev,
      ...update,
      extras: update.extras ? { ...prev.extras, ...update.extras } : prev.extras,
      en1090: update.en1090 ? { ...prev.en1090, ...update.en1090 } : prev.en1090,
    }));
  };

  const setStepFour = (update: Partial<StepFourData>) => {
    setStepFourState((prev) => ({
      ...prev,
      ...update,
      components: {
        ...prev.components,
        ...(update.components ?? {}),
      },
      options: {
        ...prev.options,
        ...(update.options ?? {}),
      },
    }));
  };

  const value = useMemo(
    () => ({
      projectInfo,
      stepTwo,
      stepThree,
      stepFour,
      setProjectInfo,
      setStepTwo,
      setStepThree,
      setStepFour,
    }),
    [projectInfo, stepTwo, stepThree, stepFour]
  );

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
