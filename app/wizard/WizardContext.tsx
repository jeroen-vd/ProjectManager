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
  en1090: {
    required: boolean | null;
    excClass: "" | "EXC1" | "EXC2" | "EXC3" | "EXC4";
    documents: string[];
    note: string;
  };
};

type WizardState = {
  projectInfo: ProjectInfo;
  stepTwo: StepTwoData;
  stepThree: StepThreeData;
  setProjectInfo: (info: ProjectInfo) => void;
  setStepTwo: (update: Partial<StepTwoData>) => void;
  setStepThree: (update: Partial<StepThreeData>) => void;
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
  mainMaterial: "Staal S355",
  finishes: ["Duplex (verzinkt + gelakt)"],
  ralColor: "RAL 7016",
  glossLevel: "Mat",
  profileTypes: ["Kokerprofielen", "Plaatmateriaal"],
  en1090: {
    required: true,
    excClass: "EXC2",
    documents: ["DoP (Declaration of Performance)", "CE label / markering"],
    note: "",
  },
};

const WizardContext = createContext<WizardState | undefined>(undefined);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [projectInfo, setProjectInfo] =
    useState<ProjectInfo>(initialProjectInfo);
  const [stepTwo, setStepTwoState] = useState<StepTwoData>(initialStepTwo);
  const [stepThree, setStepThreeState] =
    useState<StepThreeData>(initialStepThree);

  const setStepTwo = (update: Partial<StepTwoData>) => {
    setStepTwoState((prev) => ({ ...prev, ...update }));
  };

  const setStepThree = (update: Partial<StepThreeData>) => {
    setStepThreeState((prev) => ({ ...prev, ...update }));
  };

  const value = useMemo(
    () => ({
      projectInfo,
      stepTwo,
      stepThree,
      setProjectInfo,
      setStepTwo,
      setStepThree,
    }),
    [projectInfo, stepTwo, stepThree]
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
