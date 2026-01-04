"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import {
  loadWizardConfig,
  saveWizardConfig,
} from "../../../src/lib/wizardConfigStorage";
import {
  loadQuestionLibrary,
  saveQuestionLibrary,
} from "../../../src/lib/questionLibraryStorage";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "../../../src/config/wizardConfig.default";
import { type QuestionLibrary } from "../../../src/config/questionLibrary.default";
import CenteredPopup from "../CenteredPopup";
import TemplateRevisionsPanel from "../TemplateRevisionsPanel";
import { useCenteredPopup } from "../useCenteredPopup";

type Option = { id: string; label: string; iconKey?: string };

const iconMap: Record<string, (className: string) => ReactElement> = {
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

const contextSuggestions: Option[] = [
  { id: "buitenstructuur", label: "Buitenstructuur", iconKey: "outdoor" },
  { id: "interieur-meubels", label: "Interieur & meubels", iconKey: "interior" },
  {
    id: "stadsmeubilair-publieke-inrichting",
    label: "Stadsmeubilair & publieke inrichting",
    iconKey: "street",
  },
  { id: "industriele-constructie", label: "Industriële constructie" , iconKey: "industrial" },
  { id: "verlichting", label: "Verlichting", iconKey: "lighting" },
  { id: "bekleding-gevel-element", label: "Bekleding & gevel-element" },
  { id: "object-speciaal-project", label: "Object / speciaal project", iconKey: "art" },
];

const installationSuggestions: Option[] = [
  { id: "vrijstaand", label: "Vrijstaand" },
  { id: "tegen-gevel", label: "Tegen gevel" },
  { id: "aangebouwd", label: "Aangebouwd" },
  { id: "modulair-gekoppeld", label: "Modulair / gekoppeld" },
  { id: "wandmontage", label: "Wandmontage" },
  { id: "plafondmontage", label: "Plafondmontage" },
  { id: "inbouw-maatwerk", label: "Inbouw (maatwerk)" },
  { id: "integratie-bestaand", label: "Geïntegreerd in bestaande installatie" },
  { id: "verrijdbaar-tijdelijk", label: "Verrijdbaar / tijdelijk" },
  { id: "integratie-constructie", label: "Geïntegreerd in constructie" },
  { id: "gevelmontage", label: "Gevelmontage" },
  { id: "integratie-omgeving", label: "Geïntegreerd in omgeving" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

const uniqueId = (base: string, existing: string[]) => {
  let next = base;
  let counter = 2;
  while (existing.includes(next)) {
    next = `${base}-${counter}`;
    counter += 1;
  }
  return next;
};

export default function Step2SetupPage() {
  const router = useRouter();
  const { popup, notify, close } = useCenteredPopup("Melding");
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    config.categories[0]?.id ?? ""
  );
  const [selectedContextId, setSelectedContextId] = useState("");
  const [showContextDraft, setShowContextDraft] = useState(false);
  const [contextDraftLabel, setContextDraftLabel] = useState("");
  const [showInstallationDraft, setShowInstallationDraft] = useState(false);
  const [installationDraftLabel, setInstallationDraftLabel] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isResettingTemplate, setIsResettingTemplate] = useState(false);

  useEffect(() => {
    const loaded = loadWizardConfig();
    setConfig(loaded);
    setSelectedCategoryId((current) =>
      loaded.categories.some((category) => category.id === current)
        ? current
        : loaded.categories[0]?.id || ""
    );
  }, []);

  const contextsForCategory = useMemo(
    () => config.contextsByCategory[selectedCategoryId] ?? [],
    [config.contextsByCategory, selectedCategoryId]
  );
  const installationsForContext = useMemo(
    () => config.installationsByContext[selectedContextId] ?? [],
    [config.installationsByContext, selectedContextId]
  );

  const availableInstallations = useMemo(
    () =>
      installationSuggestions.filter(
        (option) => !installationsForContext.includes(option.id)
      ),
    [installationsForContext]
  );
  const availableContextSuggestions = useMemo(
    () =>
      contextSuggestions.filter(
        (option) => !contextsForCategory.some((item) => item.id === option.id)
      ),
    [contextsForCategory]
  );

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const contexts = config.contextsByCategory[categoryId] ?? [];
    setSelectedContextId(contexts[0]?.id ?? "");
  };

  const commitContextDraft = () => {
    const trimmed = contextDraftLabel.trim();
    if (!trimmed) {
      return;
    }
    const existingIds = Object.values(config.contextsByCategory)
      .flat()
      .map((item) => item.id);
    const id = uniqueId(slugify(trimmed), existingIds);
    const nextContext = { id, label: trimmed };
    setConfig((prev) => ({
      ...prev,
      contextsByCategory: {
        ...prev.contextsByCategory,
        [selectedCategoryId]: [
          ...(prev.contextsByCategory[selectedCategoryId] ?? []),
          nextContext,
        ],
      },
    }));
    setSelectedContextId(id);
    setContextDraftLabel("");
    setShowContextDraft(false);
  };

  const cancelContextDraft = () => {
    setContextDraftLabel("");
    setShowContextDraft(false);
  };

  const handleRemoveContext = (contextId: string) => {
    setConfig((prev) => {
      const nextContexts =
        prev.contextsByCategory[selectedCategoryId]?.filter(
          (context) => context.id !== contextId
        ) ?? [];
      return {
        ...prev,
        contextsByCategory: {
          ...prev.contextsByCategory,
          [selectedCategoryId]: nextContexts,
        },
      };
    });
    if (selectedContextId === contextId) {
      setSelectedContextId("");
    }
  };

  const handleClearContexts = () => {
    setConfig((prev) => ({
      ...prev,
      contextsByCategory: {
        ...prev.contextsByCategory,
        [selectedCategoryId]: [],
      },
    }));
    setSelectedContextId("");
  };

  const handleAddContextSuggestion = (option: Option) => {
    const exists = contextsForCategory.some((context) => context.id === option.id);
    if (exists) {
      return;
    }
    setConfig((prev) => ({
      ...prev,
      contextsByCategory: {
        ...prev.contextsByCategory,
        [selectedCategoryId]: [...contextsForCategory, option],
      },
    }));
    setSelectedContextId(option.id);
  };

  const handleAddInstallation = (option: Option) => {
    if (!selectedContextId) {
      return;
    }
    setConfig((prev) => {
      const nextLabels = {
        ...prev.installationLabels,
        [option.id]: option.label,
      };
      const nextInstallations = [
        ...(prev.installationsByContext[selectedContextId] ?? []),
        option.id,
      ];
      return {
        ...prev,
        installationLabels: nextLabels,
        installationsByContext: {
          ...prev.installationsByContext,
          [selectedContextId]: Array.from(new Set(nextInstallations)),
        },
      };
    });
  };

  const handleRemoveInstallation = (optionId: string) => {
    if (!selectedContextId) {
      return;
    }
    setConfig((prev) => ({
      ...prev,
      installationsByContext: {
        ...prev.installationsByContext,
        [selectedContextId]: (
          prev.installationsByContext[selectedContextId] ?? []
        ).filter((id) => id !== optionId),
      },
    }));
  };

  const handleClearInstallations = () => {
    if (!selectedContextId) {
      return;
    }
    setConfig((prev) => ({
      ...prev,
      installationsByContext: {
        ...prev.installationsByContext,
        [selectedContextId]: [],
      },
    }));
  };

  const commitInstallationDraft = () => {
    if (!selectedContextId) {
      return;
    }
    const trimmed = installationDraftLabel.trim();
    if (!trimmed) {
      return;
    }
    const existingIds = Object.keys(config.installationLabels);
    const id = uniqueId(slugify(trimmed), existingIds);
    handleAddInstallation({ id, label: trimmed });
    setInstallationDraftLabel("");
    setShowInstallationDraft(false);
  };

  const cancelInstallationDraft = () => {
    setInstallationDraftLabel("");
    setShowInstallationDraft(false);
  };

  const handleContextDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) {
      return;
    }
    try {
      const payload = JSON.parse(raw) as Option & { type?: string };
      if (payload.type !== "context") {
        return;
      }
      handleAddContextSuggestion({ id: payload.id, label: payload.label });
    } catch {
      return;
    }
  };

  const handleInstallationDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!selectedContextId) {
      return;
    }
    const raw = event.dataTransfer.getData("text/plain");
    if (!raw) {
      return;
    }
    try {
      const payload = JSON.parse(raw) as Option & { type?: string };
      if (payload.type !== "installation") {
        return;
      }
      handleAddInstallation({ id: payload.id, label: payload.label });
    } catch {
      return;
    }
  };

  const handleSave = () => {
    saveWizardConfig(config);
    router.push("/step-2");
  };

  const handleResetToDefault = async () => {
    try {
      setIsResettingTemplate(true);
      const response = await fetch("/api/wizard-template");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const reason = payload?.error || "Resetten mislukt.";
        notify(reason, { tone: "error", title: "Resetten mislukt" });
        return;
      }
      const nextConfig = (await response.json()) as WizardConfig;
      setConfig(nextConfig);
      saveWizardConfig(nextConfig);
      setSelectedCategoryId(nextConfig.categories[0]?.id ?? "");
      setSelectedContextId("");
      setShowContextDraft(false);
      setContextDraftLabel("");
      setShowInstallationDraft(false);
      setInstallationDraftLabel("");
    } catch (error) {
      console.error("Resetten mislukt.", error);
      notify("Resetten mislukt.", { tone: "error", title: "Resetten mislukt" });
    } finally {
      setIsResettingTemplate(false);
    }
  };

  const handleOverwriteDefault = async () => {
    try {
      setIsSavingTemplate(true);
      const library = loadQuestionLibrary();
      const response = await fetch("/api/wizard-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, questionLibrary: library }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = payload?.error || "Opslaan mislukt.";
        notify(reason, { tone: "error", title: "Opslaan mislukt" });
        return;
      }
      if (payload?.revisionOk === false) {
        notify("Template opgeslagen, maar revisie opslaan mislukt.", {
          tone: "warning",
          title: "Let op",
        });
        return;
      }
      notify("Template opgeslagen.", { tone: "success", title: "Opgeslagen" });
    } catch (error) {
      console.error("Template opslaan mislukt.", error);
      notify("Template opslaan mislukt.", {
        tone: "error",
        title: "Opslaan mislukt",
      });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleRestoreRevision = (payload: {
    wizardConfig: WizardConfig;
    questionLibrary: QuestionLibrary;
  }) => {
    const nextConfig = payload.wizardConfig;
    const nextLibrary = payload.questionLibrary;
    const nextCategoryId = nextConfig.categories[0]?.id ?? "";
    const nextContextId = nextCategoryId
      ? nextConfig.contextsByCategory[nextCategoryId]?.[0]?.id ?? ""
      : "";

    saveWizardConfig(nextConfig);
    saveQuestionLibrary(nextLibrary);
    setConfig(nextConfig);
    setSelectedCategoryId(nextCategoryId);
    setSelectedContextId(nextContextId);
    setShowContextDraft(false);
    setContextDraftLabel("");
    setShowInstallationDraft(false);
    setInstallationDraftLabel("");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Wizard setup
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Stap 2 configuratie
          </h1>
          <p className="text-base text-slate-600">
            Beheer de contexten per categorie en de opstellingen per context.
          </p>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200 backdrop-blur">
  <div className="flex flex-col gap-6">
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Categorieen
          </h2>
        </div>
        <div className="space-y-2">
          {config.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelectCategory(category.id)}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selectedCategoryId === category.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`${
                  selectedCategoryId === category.id
                    ? "text-slate-200"
                    : "text-slate-400 group-hover:text-slate-500"
                }`}
              >
                {renderIcon(category.iconKey, "h-5 w-5")}
              </span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ontwerpcontexten
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearContexts}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              aria-label="Verwijder alle ontwerpcontexten"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 7 H20 M9 7 V5 H15 V7 M7 7 L8 20 H16 L17 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowContextDraft(true)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              + toevoegen
            </button>
          </div>
        </div>
        <div
          className="space-y-2"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleContextDrop}
        >
          {showContextDraft ? (
            <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
              <input
                value={contextDraftLabel}
                onChange={(event) => setContextDraftLabel(event.target.value)}
                placeholder="Nieuwe ontwerpcontext"
                className="h-8 w-full bg-transparent text-sm text-slate-700 outline-none"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitContextDraft();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelContextDraft();
                  }
                }}
              />
              <button
                type="button"
                onClick={commitContextDraft}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                +
              </button>
              <button
                type="button"
                onClick={cancelContextDraft}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              >
                x
              </button>
            </div>
          ) : null}
          {contextsForCategory.length === 0 ? (
            <button
              type="button"
              onClick={() => setShowContextDraft(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Voeg een ontwerpcontext toe
              <span className="text-lg leading-none">+</span>
            </button>
          ) : null}
          {contextsForCategory.map((context) => {
            const isSelected = selectedContextId === context.id;
            return (
              <div
                key={context.id}
                className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                  isSelected
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedContextId(context.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <span
                    className={`${
                      isSelected
                        ? "text-slate-200"
                        : "text-slate-400 group-hover:text-slate-500"
                    }`}
                  >
                    {renderIcon(context.iconKey, "h-5 w-5")}
                  </span>
                  <span>{context.label}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveContext(context.id)}
                  className="ml-3 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  -
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Opstellingen
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearInstallations}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              aria-label="Verwijder alle opstellingen"
              disabled={!selectedContextId}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M4 7 H20 M9 7 V5 H15 V7 M7 7 L8 20 H16 L17 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowInstallationDraft(true)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              + toevoegen
            </button>
          </div>
        </div>
        {!selectedContextId ? (
          <p className="text-sm text-slate-500">
            Kies eerst een ontwerpcontext.
          </p>
        ) : (
          <div
            className="space-y-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleInstallationDrop}
          >
            {showInstallationDraft ? (
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                <input
                  value={installationDraftLabel}
                  onChange={(event) =>
                    setInstallationDraftLabel(event.target.value)
                  }
                  placeholder="Nieuwe opstelling"
                  className="h-8 w-full bg-transparent text-sm text-slate-700 outline-none"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitInstallationDraft();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelInstallationDraft();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={commitInstallationDraft}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={cancelInstallationDraft}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  x
                </button>
              </div>
            ) : null}
            {installationsForContext.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowInstallationDraft(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Voeg een opstelling toe
                <span className="text-lg leading-none">+</span>
              </button>
            ) : null}
            {installationsForContext.map((optionId) => {
              const iconKey = config.installationIcons[optionId];
              return (
                <div
                  key={optionId}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {renderIcon(iconKey, "h-4 w-4")}
                    </span>
                    <span>{config.installationLabels[optionId] ?? optionId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstallation(optionId)}
                    className="ml-3 text-xs font-semibold text-slate-400 hover:text-slate-700"
                  >
                    -
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div />
        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Suggesties ontwerpcontext
          </p>
          <div className="flex flex-wrap gap-2">
            {availableContextSuggestions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleAddContextSuggestion(option)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify({ ...option, type: "context" })
                  );
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                + {option.label}
              </button>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Suggesties opstelling
          </p>
          <div className="flex flex-wrap gap-2">
            {availableInstallations.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleAddInstallation(option)}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify({ ...option, type: "installation" })
                  );
                }}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                + {option.label}
              </button>
          ))}
        </div>
      </div>
    </div>
  </div>
</section>

        <TemplateRevisionsPanel
          onRestore={handleRestoreRevision}
          onNotify={notify}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={() => router.push("/wizard/question-map")}
            >
              Vraagdiagram
            </button>
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              onClick={handleResetToDefault}
              disabled={isResettingTemplate}
            >
              {isResettingTemplate ? "Resetten..." : "Reset template"}
            </button>
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={handleOverwriteDefault}
              title="Sla de huidige configuratie op als nieuwe standaard."
              disabled={isSavingTemplate}
            >
              {isSavingTemplate ? "Opslaan..." : "Als template opslaan"}
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={() => router.push("/step-2")}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={handleSave}
            >
              Opslaan
            </button>
          </div>
        </div>
      </main>
      <CenteredPopup popup={popup} onClose={close} />
    </div>
  );
}








