"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../wizard/WizardContext";
import { loadWizardConfig } from "../../src/lib/wizardConfigStorage";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "../../src/config/wizardConfig.default";

const materialOptions = ["Staal S235", "Staal S355", "RVS", "Aluminium"];

const finishOptions = [
  "Thermisch verzinkt",
  "Gelakt",
  "Duplex (verzinkt + gelakt)",
  "Onbehandeld",
];

const glossOptions = ["Mat", "Zijdeglans", "Hoogglans"];

const profileOptions = [
  "Kokerprofielen",
  "I-profielen (IPE/HEA)",
  "U-profielen",
  "L-profielen",
  "Plaatmateriaal",
];

const excOptions = ["EXC1", "EXC2", "EXC3", "EXC4"];

const documentOptions = [
  "DoP (Declaration of Performance)",
  "CE label / markering",
  "Materiaalcertificaten (3.1)",
  "Lasdocumentatie (WPS/WPQR)",
];

export default function StepThreePage() {
  const router = useRouter();
  const { projectInfo, stepTwo, stepThree, setStepThree } = useWizard();
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);

  const wizardSnapshot = useMemo(
    () => ({ projectInfo, stepTwo, stepThree }),
    [projectInfo, stepTwo, stepThree]
  );

  useEffect(() => {
    console.log("Wizard data", wizardSnapshot);
  }, [wizardSnapshot]);

  useEffect(() => {
    setConfig(loadWizardConfig());
  }, []);

  const hasPaint = stepThree.finishes.some((finish) =>
    ["Gelakt", "Duplex (verzinkt + gelakt)"].includes(finish)
  );
  const en1090Yes = stepThree.en1090.required === true;
  const en1090No = stepThree.en1090.required === false;

  const toggleMultiSelect = (
    list: string[],
    value: string,
    key: "finishes" | "profileTypes"
  ) => {
    const next = list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
    setStepThree({ [key]: next });
  };

  const toggleDocuments = (value: string) => {
    const list = stepThree.en1090.documents;
    const next = list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
    setStepThree({
      en1090: {
        ...stepThree.en1090,
        documents: next,
      },
    });
  };

  const canContinue =
    stepThree.mainMaterial.trim().length > 0 &&
    stepThree.en1090.required !== null &&
    (!en1090Yes || stepThree.en1090.excClass.trim().length > 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Project Manager
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Stap 3 – Materiaal &amp; Afwerking
          </h1>
          <p className="text-base text-slate-600">
            Leg de constructiematerialen, afwerking en beschermingslagen vast.
          </p>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Hoofdmateriaal constructie
              </h2>
              <select
                value={stepThree.mainMaterial}
                onChange={(event) =>
                  setStepThree({ mainMaterial: event.target.value })
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required
              >
                <option value="">Selecteer een materiaal</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Afwerkingsmethode
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {finishOptions.map((finish) => (
                  <label
                    key={finish}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                      stepThree.finishes.includes(finish)
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{finish}</span>
                    <input
                      type="checkbox"
                      checked={stepThree.finishes.includes(finish)}
                      onChange={() =>
                        toggleMultiSelect(stepThree.finishes, finish, "finishes")
                      }
                      className="h-4 w-4 accent-slate-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div
              className={`space-y-4 overflow-hidden transition-all duration-300 ${
                hasPaint ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-800">
                Lakafwerking
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  RAL-kleur
                  <input
                    type="text"
                    value={stepThree.ralColor}
                    onChange={(event) =>
                      setStepThree({ ralColor: event.target.value })
                    }
                    placeholder="Bijv. RAL 7016"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Glansgraad
                  <select
                    value={stepThree.glossLevel}
                    onChange={(event) =>
                      setStepThree({ glossLevel: event.target.value })
                    }
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Selecteer glansgraad</option>
                    {glossOptions.map((gloss) => (
                      <option key={gloss} value={gloss}>
                        {gloss}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Profieltypes
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {profileOptions.map((profile) => (
                  <label
                    key={profile}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                      stepThree.profileTypes.includes(profile)
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{profile}</span>
                    <input
                      type="checkbox"
                      checked={stepThree.profileTypes.includes(profile)}
                      onChange={() =>
                        toggleMultiSelect(
                          stepThree.profileTypes,
                          profile,
                          "profileTypes"
                        )
                      }
                      className="h-4 w-4 accent-slate-900"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                EN 1090 / CE-markering
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                    en1090Yes
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>Ja, EN 1090 (CE-markering vereist)</span>
                  <input
                    type="radio"
                    name="en1090"
                    value="yes"
                    checked={en1090Yes}
                    onChange={() =>
                      setStepThree({
                        en1090: {
                          required: true,
                          excClass: "",
                          documents: [],
                          note: "",
                        },
                      })
                    }
                    className="h-4 w-4 accent-slate-900"
                    required
                  />
                </label>
                <label
                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                    en1090No
                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>Nee, EN 1090 niet van toepassing</span>
                  <input
                    type="radio"
                    name="en1090"
                    value="no"
                    checked={en1090No}
                    onChange={() =>
                      setStepThree({
                        en1090: {
                          required: false,
                          excClass: "",
                          documents: [],
                          note: "",
                        },
                      })
                    }
                    className="h-4 w-4 accent-slate-900"
                    required
                  />
                </label>
              </div>
            </div>

            <div
              className={`space-y-4 overflow-hidden transition-all duration-300 ${
                en1090Yes ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-800">
                Uitvoeringsklasse
              </h2>
              <select
                value={stepThree.en1090.excClass}
                onChange={(event) =>
                  setStepThree({
                    en1090: {
                      ...stepThree.en1090,
                      excClass: event.target.value as
                        | ""
                        | "EXC1"
                        | "EXC2"
                        | "EXC3"
                        | "EXC4",
                    },
                  })
                }
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                required={en1090Yes}
              >
                <option value="">Selecteer uitvoeringsklasse</option>
                {excOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">
                  Documenten nodig (optioneel)
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {documentOptions.map((document) => (
                    <label
                      key={document}
                      className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                        stepThree.en1090.documents.includes(document)
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{document}</span>
                      <input
                        type="checkbox"
                        checked={stepThree.en1090.documents.includes(document)}
                        onChange={() => toggleDocuments(document)}
                        className="h-4 w-4 accent-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div
              className={`space-y-4 overflow-hidden transition-all duration-300 ${
                en1090No ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <h2 className="text-lg font-semibold text-slate-800">
                Reden / toelichting
              </h2>
              <input
                type="text"
                value={stepThree.en1090.note}
                onChange={(event) =>
                  setStepThree({
                    en1090: {
                      ...stepThree.en1090,
                      note: event.target.value,
                    },
                  })
                }
                placeholder="Bijv. niet-dragend, interne constructie"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 text-sm text-slate-700 shadow-lg shadow-slate-200 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Samenvatting
          </p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Projecttype
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {(config.categories.find(
                  (category) => category.id === stepTwo.projectCategory
                )?.label ??
                  stepTwo.projectCategory) ||
                  "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Materiaal
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {stepThree.mainMaterial || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Afwerking
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {stepThree.finishes.length > 0
                  ? stepThree.finishes.join(", ")
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Profieltypes
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {stepThree.profileTypes.length > 0
                  ? stepThree.profileTypes.join(", ")
                  : "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                EN 1090
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {stepThree.en1090.required === null
                  ? "-"
                  : stepThree.en1090.required
                  ? `Ja${stepThree.en1090.excClass ? ` (${stepThree.en1090.excClass})` : ""}`
                  : "Nee"}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={() => router.push("/step-2")}
          >
            Vorige stap
          </button>
          <button
            type="button"
            disabled={!canContinue}
            className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => console.log("Volgende stap", wizardSnapshot)}
          >
            Volgende stap
          </button>
        </div>
      </main>
    </div>
  );
}
