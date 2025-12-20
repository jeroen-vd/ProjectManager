"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../wizard/WizardContext";
import { loadWizardConfig } from "../../src/lib/wizardConfigStorage";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "../../src/config/wizardConfig.default";

const iconMap: Record<string, (className: string) => JSX.Element> = {
  bike: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="18" cy="44" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="46" cy="44" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M18 44 L28 28 L38 44 L46 44" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M28 28 H40" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  canopy: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M12 30 H52" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 30 L24 18 H40 L48 30" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 30 V50 M44 30 V50" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  play: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="14" y="20" width="36" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M28 26 L40 34 L28 42 Z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  street: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M20 44 H44" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 44 V26 H40 V44" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 34 H40" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  custom: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="24" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 48 L32 34 L44 48" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  outdoor: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M16 46 L32 22 L48 46" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M22 46 V36 H42 V46" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  interior: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="16" y="18" width="32" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 34 H40" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 40 H40" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  industrial: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="16" y="26" width="32" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M16 26 L26 18 L38 26 L48 18" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 46 V36 M32 46 V36 M40 46 V36" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  lighting: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M32 16 V34" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="40" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 48 H40" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  art: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M20 44 L32 20 L44 44 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="34" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  freestanding: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="20" y="18" width="24" height="30" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M24 48 V56 M40 48 V56" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  wall: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M18 18 V46" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="24" y="24" width="22" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  attached: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="14" y="28" width="24" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M38 32 H50 V42 H38" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  modular: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="14" y="18" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="34" y="18" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="24" y="34" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  ceiling: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M14 20 H50" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M32 20 V38" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="32" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  inset: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="16" y="18" width="32" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="22" y="24" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  frame: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="16" y="18" width="32" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="22" y="24" width="20" height="16" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  integrated: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="26" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="38" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M30 32 H34" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  mobile: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="18" y="22" width="28" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="44" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="44" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  structure: (className) => (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M20 46 L32 18 L44 46" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M26 36 H38" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
};

const genericIcon = (className: string) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <rect x="16" y="16" width="32" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M22 32 H42" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const renderIcon = (iconKey: string | undefined, className: string) => {
  const icon = iconKey ? iconMap[iconKey] : undefined;
  return icon ? icon(className) : genericIcon(className);
};

export default function StepTwoPage() {
  const router = useRouter();
  const { projectInfo, stepTwo, setStepTwo } = useWizard();
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);

  const wizardSnapshot = useMemo(
    () => ({ projectInfo, stepTwo }),
    [projectInfo, stepTwo]
  );

  useEffect(() => {
    console.log("Wizard data", wizardSnapshot);
  }, [wizardSnapshot]);

  useEffect(() => {
    setConfig(loadWizardConfig());
  }, []);

  useEffect(() => {
    const categoryExists = config.categories.some(
      (category) => category.id === stepTwo.projectCategory
    );
    if (!categoryExists) {
      if (
        stepTwo.projectCategory !== "" ||
        stepTwo.designContext !== "" ||
        stepTwo.installationType !== ""
      ) {
        setStepTwo({
          projectCategory: "",
          designContext: "",
          installationType: "",
        });
      }
      return;
    }

    const contexts = config.contextsByCategory[stepTwo.projectCategory] || [];
    const contextExists = contexts.some(
      (context) => context.id === stepTwo.designContext
    );
    if (!contextExists) {
      if (stepTwo.designContext !== "" || stepTwo.installationType !== "") {
        setStepTwo({ designContext: "", installationType: "" });
      }
      return;
    }

    const installations =
      config.installationsByContext[stepTwo.designContext] || [];
    const installationExists = installations.includes(stepTwo.installationType);
    if (!installationExists) {
      if (stepTwo.installationType !== "") {
        setStepTwo({ installationType: "" });
      }
    }
  }, [
    config,
    setStepTwo,
    stepTwo.designContext,
    stepTwo.installationType,
    stepTwo.projectCategory,
  ]);

  const hasProjectInfo = Object.values(projectInfo).every(
    (value) => value.trim().length > 0
  );
  const availableContexts =
    config.contextsByCategory[stepTwo.projectCategory] || [];
  const showInstallation =
    stepTwo.designContext.trim().length > 0 &&
    config.installationsByContext[stepTwo.designContext] !== undefined;
  const canContinue =
    stepTwo.projectCategory.trim().length > 0 &&
    stepTwo.designContext.trim().length > 0 &&
    (!showInstallation || stepTwo.installationType.trim().length > 0);

  const categoryLabel =
    config.categories.find(
      (category) => category.id === stepTwo.projectCategory
    )?.label ?? stepTwo.projectCategory;
  const contextLabel =
    availableContexts.find((context) => context.id === stepTwo.designContext)
      ?.label ?? stepTwo.designContext;
  const installationLabel =
    config.installationLabels[stepTwo.installationType] ??
    stepTwo.installationType;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                Project Manager
              </p>
              <h1 className="text-4xl font-semibold leading-tight">
                Stap 2 – Projectcategorie &amp; ontwerpcontext
              </h1>
              <p className="text-base text-slate-600">
                Bepaal categorie, ontwerpcontext en ruimtelijke opstelling.
              </p>
            </div>
            <button
              type="button"
              className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:inline-flex"
              onClick={() => router.push("/wizard/step2-setup")}
              aria-label="Stap 2 configuratie"
            >
              <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
                <path d="M28 10 L36 10 L38 16 L44 18 L50 14 L54 20 L50 26 L52 32 L50 38 L54 44 L50 50 L44 46 L38 48 L36 54 L28 54 L26 48 L20 46 L14 50 L10 44 L14 38 L12 32 L14 26 L10 20 L14 14 L20 18 L26 16 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </header>

        {!hasProjectInfo ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Stap 1 is nog niet ingevuld. Ga terug om de basisinformatie te
            bevestigen.
          </div>
        ) : null}

        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Projectcategorie
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {config.categories.map((type) => {
                  const isSelected = stepTwo.projectCategory === type.id;
                  return (
                    <label
                      key={type.id}
                      className={`group flex cursor-pointer flex-col gap-2 rounded-2xl border px-4 py-5 text-sm font-medium transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="projectCategory"
                        value={type.id}
                        checked={isSelected}
                        onChange={() =>
                          setStepTwo({
                            projectCategory: type.id,
                            designContext: "",
                            installationType: "",
                          })
                        }
                        className="sr-only"
                        required
                      />
                      <span
                        className={`${
                          isSelected
                            ? "text-slate-200"
                            : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      >
                        {renderIcon(type.iconKey, "h-9 w-9")}
                      </span>
                      <span className="text-base font-semibold">
                        {type.label}
                      </span>
                      <span
                        className={`text-xs ${
                          isSelected ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        Selecteer om verder te gaan
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Ontwerpcontext
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableContexts.map((context) => {
                  const isSelected = stepTwo.designContext === context.id;
                  return (
                    <label
                      key={context.id}
                      className={`group flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="designContext"
                        value={context.id}
                        checked={isSelected}
                        onChange={() =>
                          setStepTwo({
                            designContext: context.id,
                            installationType: "",
                          })
                        }
                        className="sr-only"
                        required
                      />
                      <span
                        className={`${
                          isSelected
                            ? "text-slate-200"
                            : "text-slate-400 group-hover:text-slate-500"
                        }`}
                      >
                        {renderIcon(context.iconKey, "h-8 w-8")}
                      </span>
                      <span className="text-base font-semibold">
                        {context.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {showInstallation ? (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  Opstelling / inbouw
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(
                    config.installationsByContext[stepTwo.designContext] || []
                  ).map((optionId) => {
                    const isSelected =
                      stepTwo.installationType === optionId;
                    return (
                      <label
                        key={optionId}
                        className={`group flex cursor-pointer items-center justify-center rounded-2xl border px-4 py-5 text-sm font-semibold transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="installationType"
                          value={optionId}
                          checked={isSelected}
                          onChange={() =>
                            setStepTwo({ installationType: optionId })
                          }
                          className="sr-only"
                          required
                        />
                        <span
                          className={`mr-2 ${
                            isSelected
                              ? "text-slate-200"
                              : "text-slate-400 group-hover:text-slate-500"
                          }`}
                        >
                          {renderIcon(
                            config.installationIcons[optionId],
                            "h-5 w-5"
                          )}
                        </span>
                        {config.installationLabels[optionId] ?? optionId}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800">
                Globale afmetingen
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Totale lengte (m)
                  <input
                    type="number"
                    inputMode="decimal"
                    value={stepTwo.totalLength}
                    onChange={(event) =>
                      setStepTwo({ totalLength: event.target.value })
                    }
                    placeholder="Bijv. 12"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Totale diepte (m)
                  <input
                    type="number"
                    inputMode="decimal"
                    value={stepTwo.totalDepth}
                    onChange={(event) =>
                      setStepTwo({ totalDepth: event.target.value })
                    }
                    placeholder="Bijv. 4"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Maximale overspanning (m)
                  <input
                    type="number"
                    inputMode="decimal"
                    value={stepTwo.maxSpan}
                    onChange={(event) =>
                      setStepTwo({ maxSpan: event.target.value })
                    }
                    placeholder="Bijv. 6"
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 text-sm text-slate-700 shadow-lg shadow-slate-200 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Tijdelijke samenvatting
          </p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Projectcategorie
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {categoryLabel || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Ontwerpcontext
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {contextLabel || "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Opstelling / inbouw
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {installationLabel || "-"}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={() => router.push("/")}
          >
            Vorige stap
          </button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={() => router.push("/wizard/step2-setup")}
              aria-label="Stap 2 configuratie"
            >
              <svg viewBox="0 0 64 64" className="h-5 w-5" aria-hidden="true">
                <path d="M28 10 L36 10 L38 16 L44 18 L50 14 L54 20 L50 26 L52 32 L50 38 L54 44 L50 50 L44 46 L38 48 L36 54 L28 54 L26 48 L20 46 L14 50 L10 44 L14 38 L12 32 L14 26 L10 20 L14 14 L20 18 L26 16 Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              type="button"
              disabled={!canContinue}
              className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => router.push("/step-3")}
            >
              Volgende stap
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
