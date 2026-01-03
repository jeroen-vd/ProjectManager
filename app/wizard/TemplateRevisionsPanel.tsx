"use client";

import { useCallback, useEffect, useState } from "react";
import type { WizardConfig } from "@/src/config/wizardConfig.default";
import type { QuestionLibrary } from "@/src/config/questionLibrary.default";
import CenteredPopup from "./CenteredPopup";
import type { NotifyFn, PopupState, PopupTone } from "./useCenteredPopup";

type RevisionEntry = {
  id: string;
  createdAt: string;
  source: "wizard-template" | "question-library-template" | "manual";
  note?: string;
  wizardConfig?: WizardConfig;
  questionLibrary?: QuestionLibrary;
};

type RestorePayload = {
  wizardConfig: WizardConfig;
  questionLibrary: QuestionLibrary;
};

type TemplateRevisionsPanelProps = {
  onRestore: (payload: RestorePayload) => void;
  onNotify?: NotifyFn;
  onCreateRevision?: (note?: string) => void | Promise<void>;
  isCreatingRevision?: boolean;
  createLabel?: string;
};

type ConfirmState = PopupState & {
  confirmLabel: string;
  onConfirm: () => void;
};

const sourceLabels: Record<RevisionEntry["source"], string> = {
  "wizard-template": "Stap 2 template",
  "question-library-template": "Vraagbibliotheek",
  manual: "Handmatig",
};

const confirmButtonStyles: Record<PopupTone, string> = {
  info: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-300",
  success: "bg-emerald-600 text-white hover:bg-emerald-500 focus:ring-emerald-200",
  warning: "bg-amber-500 text-white hover:bg-amber-400 focus:ring-amber-200",
  error: "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-200",
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function TemplateRevisionsPanel({
  onRestore,
  onNotify,
  onCreateRevision,
  isCreatingRevision = false,
  createLabel = "Template revisie aanmaken",
}: TemplateRevisionsPanelProps) {
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const notify =
    onNotify ?? ((message: string) => window.alert(message));

  const loadRevisions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/template-revisions?full=1");
      if (!response.ok) {
        throw new Error("Revisies ophalen mislukt.");
      }
      const payload = (await response.json()) as RevisionEntry[];
      setRevisions(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error(err);
      setError("Revisies ophalen mislukt.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateRevision = useCallback(async () => {
    if (!onCreateRevision) {
      return;
    }
    const trimmedNote = noteDraft.trim();
    await onCreateRevision(trimmedNote ? trimmedNote : undefined);
    setNoteDraft("");
    await loadRevisions();
  }, [loadRevisions, noteDraft, onCreateRevision]);

  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    try {
      const revision = revisions.find((entry) => entry.id === id);
      if (!revision?.wizardConfig || !revision?.questionLibrary) {
        notify("Herstellen mislukt: incomplete revisie.", {
          tone: "error",
          title: "Herstellen mislukt",
        });
        return;
      }

      const response = await fetch("/api/template-revisions/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wizardConfig: revision.wizardConfig,
          questionLibrary: revision.questionLibrary,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = payload?.error || "Herstellen mislukt.";
        notify(reason, { tone: "error", title: "Herstellen mislukt" });
        return;
      }

      onRestore({
        wizardConfig: revision.wizardConfig,
        questionLibrary: revision.questionLibrary,
      });
      await loadRevisions();
      notify("Revisie hersteld.", { tone: "success", title: "Hersteld" });
    } catch (err) {
      console.error(err);
      notify("Herstellen mislukt.", { tone: "error", title: "Herstellen mislukt" });
    } finally {
      setRestoringId(null);
    }
  };

  const handleExportRevision = (revision: RevisionEntry) => {
    if (!revision.wizardConfig || !revision.questionLibrary) {
      notify("Export mislukt: incomplete revisie.", {
        tone: "error",
        title: "Export mislukt",
      });
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      revisionId: revision.id,
      revisionCreatedAt: revision.createdAt,
      ...(revision.note ? { revisionNote: revision.note } : {}),
      questionLibrary: revision.questionLibrary,
      wizardConfig: revision.wizardConfig,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = revision.createdAt.slice(0, 10);
    const timeStamp = revision.createdAt
      .slice(11, 19)
      .replace(/:/g, "");
    const suffix =
      dateStamp && timeStamp ? `${dateStamp}-${timeStamp}` : revision.id;
    link.href = url;
    link.download = `wizard-revision-${suffix}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteRevision = async (revision: RevisionEntry) => {
    setDeletingId(revision.id);
    try {
      const response = await fetch("/api/template-revisions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: revision.id }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const reason = payload?.error || "Verwijderen mislukt.";
        notify(reason, { tone: "error", title: "Verwijderen mislukt" });
        return;
      }
      await loadRevisions();
      notify("Revisie verwijderd.", {
        tone: "success",
        title: "Verwijderd",
      });
    } catch (err) {
      console.error(err);
      notify("Verwijderen mislukt.", {
        tone: "error",
        title: "Verwijderen mislukt",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const requestRestore = (id: string) => {
    setConfirmState({
      title: "Revisie herstellen",
      message: "Deze actie zet de template terug naar de gekozen versie.",
      tone: "warning",
      confirmLabel: "Herstellen",
      onConfirm: () => {
        setConfirmState(null);
        void handleRestore(id);
      },
    });
  };

  const requestDelete = (revision: RevisionEntry) => {
    setConfirmState({
      title: "Revisie verwijderen",
      message: "Deze revisie verwijderen? Dit kan niet ongedaan worden gemaakt.",
      tone: "error",
      confirmLabel: "Verwijderen",
      onConfirm: () => {
        setConfirmState(null);
        void handleDeleteRevision(revision);
      },
    });
  };

  return (
    <section className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-200 backdrop-blur">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Revisies
            </p>
            <h2 className="text-lg font-semibold text-slate-800">
              Terugzetten naar eerdere template
            </h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {onCreateRevision ? (
              <input
                type="text"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Notitie voor deze revisie (optioneel)"
                aria-label="Notitie"
                className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-72"
                disabled={isCreatingRevision}
              />
            ) : null}
            {onCreateRevision ? (
              <button
                type="button"
                className="h-10 rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={handleCreateRevision}
                disabled={isCreatingRevision}
              >
                {isCreatingRevision ? "Opslaan..." : createLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={loadRevisions}
              disabled={isLoading}
            >
              {isLoading ? "Laden..." : "Vernieuwen"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Revisies laden...
          </div>
        ) : revisions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Nog geen revisies opgeslagen.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {revisions.map((revision) => (
              <div
                key={revision.id}
                className="flex flex-col gap-3 border-b border-slate-200/70 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Opgeslagen {formatDate(revision.createdAt)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {sourceLabels[revision.source] ?? revision.source}
                  </p>
                  {revision.note ? (
                    <p className="text-xs text-slate-500">
                      Notitie: {revision.note}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    onClick={() => handleExportRevision(revision)}
                  >
                    Exporteren
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                    onClick={() => requestRestore(revision.id)}
                    disabled={restoringId === revision.id}
                  >
                    {restoringId === revision.id ? "Herstellen..." : "Herstellen"}
                  </button>
                  <button
                    type="button"
                    className="h-10 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:opacity-60"
                    onClick={() => requestDelete(revision)}
                    disabled={deletingId === revision.id}
                  >
                    {deletingId === revision.id ? "Verwijderen..." : "Verwijderen"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CenteredPopup
        popup={confirmState}
        onClose={() => setConfirmState(null)}
        actions={
          confirmState ? (
            <>
              <button
                type="button"
                className="h-10 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onClick={() => setConfirmState(null)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className={`h-10 rounded-2xl px-4 text-sm font-semibold shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 ${confirmButtonStyles[confirmState.tone]}`}
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmLabel}
              </button>
            </>
          ) : null
        }
      />
    </section>
  );
}
