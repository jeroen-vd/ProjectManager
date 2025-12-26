"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadWizardConfig } from "../../../src/lib/wizardConfigStorage";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "../../../src/config/wizardConfig.default";
import {
  defaultQuestionLibrary,
  type AnswerOption,
  type Flow,
  type FlowEdge,
  type FlowScope,
  type Question,
  type QuestionLibrary,
  type TaskOutput,
} from "../../../src/config/questionLibrary.default";
import {
  loadQuestionLibrary,
  resetQuestionLibrary,
  saveQuestionLibrary,
} from "../../../src/lib/questionLibraryStorage";

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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (items: string[] | undefined) =>
  (items ?? []).join(", ");

const tokenize = (value: string) =>
  normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2);

const jaccard = (a: string[], b: string[]) => {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]);
  let intersection = 0;
  setA.forEach((token) => {
    if (setB.has(token)) {
      intersection += 1;
    }
  });
  if (union.size === 0) {
    return 0;
  }
  return intersection / union.size;
};

const fieldMatches = (a?: string, b?: string) => (a ?? "") === (b ?? "");

const matchesScope = (flow: Flow, scope: FlowScope) =>
  flow.scope?.level === scope.level &&
  fieldMatches(flow.scope?.categoryId, scope.categoryId) &&
  fieldMatches(flow.scope?.contextId, scope.contextId) &&
  fieldMatches(flow.scope?.installationId, scope.installationId);

const questionHasOutputs = (question: Question) => {
  if ((question.outputs ?? []).length > 0) {
    return true;
  }
  return (question.options ?? []).some(
    (option) => (option.outputs ?? []).length > 0
  );
};

export default function QuestionMapPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);
  const [library, setLibrary] = useState<QuestionLibrary>(
    defaultQuestionLibrary
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastSavedRef = useRef<QuestionLibrary | null>(null);
  const lastManualSaveRef = useRef<QuestionLibrary | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isDirty, setIsDirty] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    defaultQuestionLibrary.questions[0]?.id ?? null
  );
  const [selectedEdgeRef, setSelectedEdgeRef] = useState<{
    flowId: string;
    edgeId: string;
  } | null>(null);
  const [scope, setScope] = useState({
    categoryId: "",
    contextId: "",
    installationId: "",
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "duplicate" | "orphan" | "missing"
  >("all");
  const [sortMode, setSortMode] = useState<"usage" | "alpha">("usage");
  const [activeScopeIndex, setActiveScopeIndex] = useState(0);
  const [edgeDraft, setEdgeDraft] = useState<{
    flowId: string;
    from: string;
    to: string;
    expression: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [detailsTab, setDetailsTab] = useState<
    "question" | "options" | "outputs" | "edge"
  >("question");

  useEffect(() => {
    const loadedConfig = loadWizardConfig();
    const loadedLibrary = loadQuestionLibrary();
    setConfig(loadedConfig);
    setLibrary(loadedLibrary);
    setSelectedQuestionId(loadedLibrary.questions[0]?.id ?? null);

    const firstCategory = loadedConfig.categories[0]?.id ?? "";
    const firstContext = firstCategory
      ? loadedConfig.contextsByCategory[firstCategory]?.[0]?.id ?? ""
      : "";
    const firstInstallation = firstContext
      ? loadedConfig.installationsByContext[firstContext]?.[0] ?? ""
      : "";
    setScope({
      categoryId: firstCategory,
      contextId: firstContext,
      installationId: firstInstallation,
    });
    lastSavedRef.current = loadedLibrary;
    lastManualSaveRef.current = loadedLibrary;
    setSaveStatus("saved");
    setIsDirty(false);
    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }
    if (lastSavedRef.current === library) {
      setIsDirty(false);
      setSaveStatus("saved");
      return;
    }
    setIsDirty(true);
    setSaveStatus("saving");
    const timeout = setTimeout(() => {
      saveQuestionLibrary(library);
      lastSavedRef.current = library;
      setSaveStatus("saved");
      setIsDirty(false);
    }, 250);
    return () => clearTimeout(timeout);
  }, [library, hasLoaded]);

  const questionMap = useMemo(
    () => new Map(library.questions.map((question) => [question.id, question])),
    [library.questions]
  );

  const usageMap = useMemo(() => {
    const map = new Map<string, number>();
    library.flows.forEach((flow) => {
      flow.nodes.forEach((node) => {
        map.set(node.questionId, (map.get(node.questionId) ?? 0) + 1);
      });
    });
    return map;
  }, [library.flows]);

  const duplicatePromptGroups = useMemo(() => {
    const groups = new Map<string, Question[]>();
    library.questions.forEach((question) => {
      const key = normalizeText(question.prompt);
      if (!key) {
        return;
      }
      const existing = groups.get(key) ?? [];
      existing.push(question);
      groups.set(key, existing);
    });
    return Array.from(groups.values()).filter((group) => group.length > 1);
  }, [library.questions]);

  const duplicatePromptIds = useMemo(
    () =>
      new Set(
        duplicatePromptGroups.flatMap((group) => group.map((item) => item.id))
      ),
    [duplicatePromptGroups]
  );

  const orphanQuestionIds = useMemo(
    () =>
      new Set(
        library.questions
          .filter((question) => (usageMap.get(question.id) ?? 0) === 0)
          .map((question) => question.id)
      ),
    [library.questions, usageMap]
  );

  const missingOutputIds = useMemo(() => {
    const missing = new Set<string>();
    library.questions.forEach((question) => {
      if ((usageMap.get(question.id) ?? 0) === 0) {
        return;
      }
      if (!questionHasOutputs(question)) {
        missing.add(question.id);
      }
    });
    return missing;
  }, [library.questions, usageMap]);

  const filteredQuestions = useMemo(() => {
    const query = search.trim().toLowerCase();
    let results = library.questions.filter((question) => {
      if (!query) {
        return true;
      }
      if (question.prompt.toLowerCase().includes(query)) {
        return true;
      }
      if (question.conceptKey.toLowerCase().includes(query)) {
        return true;
      }
      return (question.tags ?? []).some((tag) =>
        tag.toLowerCase().includes(query)
      );
    });
    if (statusFilter === "duplicate") {
      results = results.filter((question) => duplicatePromptIds.has(question.id));
    }
    if (statusFilter === "orphan") {
      results = results.filter((question) => orphanQuestionIds.has(question.id));
    }
    if (statusFilter === "missing") {
      results = results.filter((question) => missingOutputIds.has(question.id));
    }
    const sorted = [...results];
    if (sortMode === "usage") {
      sorted.sort((a, b) => {
        const usageA = usageMap.get(a.id) ?? 0;
        const usageB = usageMap.get(b.id) ?? 0;
        if (usageA !== usageB) {
          return usageB - usageA;
        }
        return a.prompt.localeCompare(b.prompt);
      });
    } else {
      sorted.sort((a, b) => a.prompt.localeCompare(b.prompt));
    }
    return sorted;
  }, [
    library.questions,
    search,
    statusFilter,
    duplicatePromptIds,
    orphanQuestionIds,
    missingOutputIds,
    usageMap,
    sortMode,
  ]);

  const selectedQuestion = selectedQuestionId
    ? questionMap.get(selectedQuestionId) ?? null
    : null;

  const similarQuestions = useMemo(() => {
    if (!selectedQuestion) {
      return [];
    }
    const baseTokens = tokenize(selectedQuestion.prompt);
    return library.questions
      .filter((question) => question.id !== selectedQuestion.id)
      .map((question) => {
        const score = jaccard(baseTokens, tokenize(question.prompt));
        return { question, score };
      })
      .filter((entry) => entry.score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [library.questions, selectedQuestion]);

  const contextsForCategory = scope.categoryId
    ? config.contextsByCategory[scope.categoryId] ?? []
    : [];
  const installationsForContext = scope.contextId
    ? config.installationsByContext[scope.contextId] ?? []
    : [];

  const categoryLabel =
    config.categories.find((category) => category.id === scope.categoryId)
      ?.label ?? scope.categoryId;
  const contextLabel =
    contextsForCategory.find((context) => context.id === scope.contextId)
      ?.label ?? scope.contextId;
  const installationLabel =
    config.installationLabels[scope.installationId] ?? scope.installationId;

  const scopeSlots = useMemo(() => {
    const slots: { label: string; scope: FlowScope }[] = [
      { label: "Global", scope: { level: "global" } },
    ];
    if (scope.categoryId) {
      slots.push({
        label: `Categorie: ${categoryLabel || scope.categoryId}`,
        scope: { level: "category", categoryId: scope.categoryId },
      });
    }
    if (scope.contextId) {
      slots.push({
        label: `Context: ${contextLabel || scope.contextId}`,
        scope: {
          level: "context",
          categoryId: scope.categoryId,
          contextId: scope.contextId,
        },
      });
    }
    if (scope.installationId) {
      slots.push({
        label: `Opstelling: ${installationLabel || scope.installationId}`,
        scope: {
          level: "installation",
          categoryId: scope.categoryId,
          contextId: scope.contextId,
          installationId: scope.installationId,
        },
      });
    }
    return slots;
  }, [
    categoryLabel,
    contextLabel,
    installationLabel,
    scope.categoryId,
    scope.contextId,
    scope.installationId,
  ]);

  useEffect(() => {
    if (scopeSlots.length > 0) {
      setActiveScopeIndex(scopeSlots.length - 1);
    }
  }, [
    scope.categoryId,
    scope.contextId,
    scope.installationId,
    scopeSlots.length,
  ]);

  const activeSlot = scopeSlots[activeScopeIndex] ?? scopeSlots[0] ?? null;

  const createQuestion = () => {
    const existingIds = library.questions.map((question) => question.id);
    const existingKeys = library.questions.map((question) => question.conceptKey);
    const nextQuestion: Question = {
      id: uniqueId("q-new", existingIds),
      conceptKey: uniqueId("new.question", existingKeys),
      prompt: "Nieuwe vraag",
      kind: "text",
      tags: [],
      outputs: [],
    };
    setLibrary((prev) => ({
      ...prev,
      questions: [...prev.questions, nextQuestion],
    }));
    setSelectedQuestionId(nextQuestion.id);
    setSelectedEdgeRef(null);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setLibrary((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      ),
    }));
  };

  const removeQuestion = (questionId: string) => {
    setLibrary((prev) => ({
      ...prev,
      questions: prev.questions.filter((question) => question.id !== questionId),
      flows: prev.flows.map((flow) => {
        const remainingNodes = flow.nodes.filter(
          (node) => node.questionId !== questionId
        );
        const nodeIds = new Set(remainingNodes.map((node) => node.id));
        return {
          ...flow,
          nodes: remainingNodes,
          edges: flow.edges.filter(
            (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
          ),
        };
      }),
    }));
    if (selectedQuestionId === questionId) {
      setSelectedQuestionId(null);
    }
  };

  const addOption = (question: Question) => {
    const options = question.options ?? [];
    const nextOption: AnswerOption = {
      id: uniqueId("opt", options.map((option) => option.id)),
      label: "Nieuwe optie",
      value: "Nieuwe optie",
      outputs: [],
    };
    updateQuestion(question.id, { options: [...options, nextOption] });
  };

  const updateOption = (
    question: Question,
    optionId: string,
    updates: Partial<AnswerOption>
  ) => {
    const options = (question.options ?? []).map((option) =>
      option.id === optionId ? { ...option, ...updates } : option
    );
    updateQuestion(question.id, { options });
  };

  const removeOption = (question: Question, optionId: string) => {
    const options = (question.options ?? []).filter(
      (option) => option.id !== optionId
    );
    updateQuestion(question.id, { options });
  };

  const updateOutputs = (question: Question, outputs: TaskOutput[]) => {
    updateQuestion(question.id, { outputs });
  };

  const updateOptionOutputs = (
    question: Question,
    optionId: string,
    outputs: TaskOutput[]
  ) => {
    const options = (question.options ?? []).map((option) =>
      option.id === optionId ? { ...option, outputs } : option
    );
    updateQuestion(question.id, { options });
  };

  const addFlowForScope = (scopeItem: FlowScope, label: string) => {
    const existingIds = library.flows.map((flow) => flow.id);
    const base = slugify(`flow-${scopeItem.level}-${label}`);
    const nextFlow: Flow = {
      id: uniqueId(base, existingIds),
      name: label,
      scope: scopeItem,
      nodes: [],
      edges: [],
    };
    setLibrary((prev) => ({
      ...prev,
      flows: [...prev.flows, nextFlow],
    }));
  };

  const addQuestionToFlow = (flowId: string, questionId: string) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== flowId) {
          return flow;
        }
        if (flow.nodes.some((node) => node.questionId === questionId)) {
          return flow;
        }
        const nextNodeId = uniqueId(
          "node",
          flow.nodes.map((node) => node.id)
        );
        return {
          ...flow,
          nodes: [...flow.nodes, { id: nextNodeId, questionId }],
        };
      }),
    }));
  };

  const removeNodeFromFlow = (flowId: string, nodeId: string) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== flowId) {
          return flow;
        }
        const nodes = flow.nodes.filter((node) => node.id !== nodeId);
        const nodeIds = new Set(nodes.map((node) => node.id));
        return {
          ...flow,
          nodes,
          edges: flow.edges.filter(
            (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
          ),
        };
      }),
    }));
  };

  const addEdgeToFlow = (
    flowId: string,
    from: string,
    to: string,
    expression: string
  ) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== flowId) {
          return flow;
        }
        const nextEdge: FlowEdge = {
          id: uniqueId("edge", flow.edges.map((edge) => edge.id)),
          from,
          to,
          when: expression.trim() ? { expression: expression.trim() } : undefined,
        };
        return {
          ...flow,
          edges: [...flow.edges, nextEdge],
        };
      }),
    }));
  };

  const updateEdge = (
    flowId: string,
    edgeId: string,
    updates: Partial<FlowEdge>
  ) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== flowId) {
          return flow;
        }
        return {
          ...flow,
          edges: flow.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, ...updates } : edge
          ),
        };
      }),
    }));
  };

  const removeEdge = (flowId: string, edgeId: string) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) =>
        flow.id === flowId
          ? { ...flow, edges: flow.edges.filter((edge) => edge.id !== edgeId) }
          : flow
      ),
    }));
    if (selectedEdgeRef?.edgeId === edgeId) {
      setSelectedEdgeRef(null);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    saveQuestionLibrary(library);
    lastSavedRef.current = library;
    lastManualSaveRef.current = library;
    setSaveStatus("saved");
    setIsDirty(false);
    setIsSaving(false);
  };

  const handleReset = () => {
    setIsResetting(true);
    resetQuestionLibrary();
    setLibrary(defaultQuestionLibrary);
    lastSavedRef.current = defaultQuestionLibrary;
    lastManualSaveRef.current = defaultQuestionLibrary;
    setSaveStatus("saved");
    setIsDirty(false);
    setSelectedQuestionId(defaultQuestionLibrary.questions[0]?.id ?? null);
    setSelectedEdgeRef(null);
    setSearch("");
    setStatusFilter("all");
    setSortMode("usage");
    setActiveScopeIndex(0);
    setDetailsTab("question");
    setIsResetting(false);
  };

  const handleCancel = () => {
    const fallback = loadQuestionLibrary();
    const snapshot = lastManualSaveRef.current ?? fallback;
    setLibrary(snapshot);
    lastSavedRef.current = snapshot;
    lastManualSaveRef.current = snapshot;
    setSaveStatus("saved");
    setIsDirty(false);
    setSelectedQuestionId(snapshot.questions[0]?.id ?? null);
    setSelectedEdgeRef(null);
    setSearch("");
    setStatusFilter("all");
    setSortMode("usage");
    setActiveScopeIndex(0);
    setDetailsTab("question");
  };

  const handleOverwriteDefault = async () => {
    try {
      setIsSavingTemplate(true);
      const response = await fetch("/api/question-library-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(library),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const reason = payload?.error || "Opslaan mislukt.";
        alert(reason);
        return;
      }
      alert("Template opgeslagen.");
    } catch (error) {
      console.error("Template opslaan mislukt.", error);
      alert("Template opslaan mislukt.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const OutputEditor = ({
    outputs,
    onChange,
  }: {
    outputs: TaskOutput[] | undefined;
    onChange: (next: TaskOutput[]) => void;
  }) => {
    const list = outputs ?? [];
    return (
      <div className="space-y-3">
        {list.map((output) => (
          <div
            key={output.id}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700"
          >
            <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
              Titel template
              <input
                value={output.titleTemplate}
                onChange={(event) => {
                  const next = list.map((entry) =>
                    entry.id === output.id
                      ? { ...entry, titleTemplate: event.target.value }
                      : entry
                  );
                  onChange(next);
                }}
                placeholder="Bijv. Bepaal materiaal: {{answer}}"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Prioriteit
                <select
                  value={output.priority}
                  onChange={(event) => {
                    const next = list.map((entry) =>
                      entry.id === output.id
                        ? {
                            ...entry,
                            priority: event.target.value as TaskOutput["priority"],
                          }
                        : entry
                    );
                    onChange(next);
                  }}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="low">Laag</option>
                  <option value="medium">Medium</option>
                  <option value="high">Hoog</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Tags
                <input
                  value={joinList(output.tags)}
                  onChange={(event) => {
                    const next = list.map((entry) =>
                      entry.id === output.id
                        ? { ...entry, tags: splitList(event.target.value) }
                        : entry
                    );
                    onChange(next);
                  }}
                  placeholder="bijv. planning, staal"
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>
            <label className="mt-3 flex flex-col gap-2 text-xs font-semibold text-slate-500">
              Afhankelijk van
              <input
                value={joinList(output.dependsOn)}
                onChange={(event) => {
                  const next = list.map((entry) =>
                    entry.id === output.id
                      ? { ...entry, dependsOn: splitList(event.target.value) }
                      : entry
                  );
                  onChange(next);
                }}
                placeholder="bijv. task-1, task-2"
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange(list.filter((entry) => entry.id !== output.id))
              }
              className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Verwijderen
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...list,
              {
                id: uniqueId("task", list.map((item) => item.id)),
                titleTemplate: "",
                priority: "medium",
                tags: [],
                dependsOn: [],
              },
            ])
          }
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          + output toevoegen
        </button>
      </div>
    );
  };

  const selectedEdgeFlow = selectedEdgeRef
    ? library.flows.find((flow) => flow.id === selectedEdgeRef.flowId) ?? null
    : null;
  const selectedEdge = selectedEdgeFlow?.edges.find(
    (edge) => edge.id === selectedEdgeRef?.edgeId
  );

  useEffect(() => {
    if (selectedQuestion) {
      setDetailsTab("question");
      return;
    }
    if (selectedEdge) {
      setDetailsTab("edge");
      return;
    }
    setDetailsTab("question");
  }, [selectedQuestion?.id, selectedEdge?.id]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Wizard setup
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Vraagdiagram & bibliotheek
          </h1>
          <p className="text-base text-slate-600">
            Beheer vragen, hergebruik en relaties per route zonder duplicaten.
          </p>
        </header>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push("/wizard/question-map-visual")}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Visuele map openen
          </button>
        </div>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Categorie
                  <select
                    value={scope.categoryId}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      if (!nextCategory) {
                        setScope({
                          categoryId: "",
                          contextId: "",
                          installationId: "",
                        });
                        return;
                      }
                      const nextContexts =
                        config.contextsByCategory[nextCategory] ?? [];
                      const nextContext = nextContexts[0]?.id ?? "";
                      const nextInstallations = nextContext
                        ? config.installationsByContext[nextContext] ?? []
                        : [];
                      setScope({
                        categoryId: nextCategory,
                        contextId: nextContext,
                        installationId: nextInstallations[0] ?? "",
                      });
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">Geen</option>
                    {config.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Context
                  <select
                    value={scope.contextId}
                    onChange={(event) => {
                      const nextContext = event.target.value;
                      if (!nextContext) {
                        setScope((prev) => ({
                          ...prev,
                          contextId: "",
                          installationId: "",
                        }));
                        return;
                      }
                      const nextInstallations =
                        config.installationsByContext[nextContext] ?? [];
                      setScope((prev) => ({
                        ...prev,
                        contextId: nextContext,
                        installationId: nextInstallations[0] ?? "",
                      }));
                    }}
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    disabled={!scope.categoryId}
                  >
                    <option value="">Geen</option>
                    {contextsForCategory.map((context) => (
                      <option key={context.id} value={context.id}>
                        {context.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Opstelling
                  <select
                    value={scope.installationId}
                    onChange={(event) =>
                      setScope((prev) => ({
                        ...prev,
                        installationId: event.target.value,
                      }))
                    }
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    disabled={!scope.contextId}
                  >
                    <option value="">Geen</option>
                    {installationsForContext.map((installation) => (
                      <option key={installation} value={installation}>
                        {config.installationLabels[installation] ?? installation}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Snelle start
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    1. Kies vraag
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Selecteer links een vraag in de bibliotheek.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Gebruik zoek/filter om sneller te vinden.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    2. Koppel in flow
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Voeg de vraag toe aan de actieve scope.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Geen flow? Maak er meteen een aan.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    3. Leg relaties vast
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Verbind vragen en voeg voorwaarden toe.
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Klik op een relatie om details te bewerken.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vraagbibliotheek
                  </h2>
                  <button
                    type="button"
                    onClick={createQuestion}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    + nieuwe vraag
                  </button>
                </div>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Zoek op vraag, concept key of tag"
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Filters (klik om te filteren)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      aria-pressed={statusFilter === "all"}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        statusFilter === "all"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      Alle vragen: {library.questions.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("duplicate")}
                      aria-pressed={statusFilter === "duplicate"}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        statusFilter === "duplicate"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : duplicatePromptGroups.length > 0
                          ? "border-rose-200 bg-rose-100 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      Duplicaten: {duplicatePromptGroups.length}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("orphan")}
                      aria-pressed={statusFilter === "orphan"}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        statusFilter === "orphan"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : orphanQuestionIds.size > 0
                          ? "border-amber-200 bg-amber-100 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      Losse vragen: {orphanQuestionIds.size}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("missing")}
                      aria-pressed={statusFilter === "missing"}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        statusFilter === "missing"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : missingOutputIds.size > 0
                          ? "border-amber-200 bg-amber-100 text-amber-700 hover:border-amber-300 hover:bg-amber-50"
                          : "border-emerald-200 bg-emerald-100 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      Ontbrekende outputs: {missingOutputIds.size}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    {filteredQuestions.length} van {library.questions.length} vragen
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      Sorteren
                      <select
                        value={sortMode}
                        onChange={(event) =>
                          setSortMode(event.target.value as "usage" | "alpha")
                        }
                        className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="usage">Meest gebruikt</option>
                        <option value="alpha">A-Z</option>
                      </select>
                    </label>
                    {search || statusFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("all");
                        }}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Filters wissen
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  {filteredQuestions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
                      Geen resultaten. Pas je zoekterm of filter aan.
                    </div>
                  ) : (
                    filteredQuestions.map((question) => {
                      const isSelected = question.id === selectedQuestionId;
                      const usageCount = usageMap.get(question.id) ?? 0;
                      const isDuplicate = duplicatePromptIds.has(question.id);
                      const hasMissingOutput = missingOutputIds.has(question.id);
                      return (
                        <button
                          key={question.id}
                          type="button"
                          onClick={() => {
                            setSelectedQuestionId(question.id);
                            setSelectedEdgeRef(null);
                          }}
                          className={`flex w-full flex-col gap-1 rounded-2xl border px-3 py-3 text-left text-xs font-semibold transition ${
                            isSelected
                              ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className="text-sm font-semibold">
                            {question.prompt}
                          </span>
                          <span
                            className={`text-[11px] ${
                              isSelected ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {question.conceptKey} - gebruikt {usageCount}x
                          </span>
                          {isDuplicate ? (
                            <span
                              className={`text-[11px] ${
                                isSelected
                                  ? "text-rose-200"
                                  : "text-rose-600"
                              }`}
                            >
                              Mogelijke duplicate
                            </span>
                          ) : null}
                          {hasMissingOutput ? (
                            <span
                              className={`text-[11px] ${
                                isSelected
                                  ? "text-amber-200"
                                  : "text-amber-600"
                              }`}
                            >
                              Geen outputs
                            </span>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="space-y-4 lg:col-span-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Vraagdiagram
                </h2>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Actieve scope
                    </p>
                    <span className="text-[11px] text-slate-500">
                      {activeSlot?.label ?? "Onbekend"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {scopeSlots.map((slot, index) => {
                      const flowForSlot = library.flows.find((item) =>
                        matchesScope(item, slot.scope)
                      );
                      const isActive = index === activeScopeIndex;
                      return (
                        <button
                          key={`${slot.scope.level}-${slot.label}`}
                          type="button"
                          onClick={() => setActiveScopeIndex(index)}
                          aria-pressed={isActive}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            isActive
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span>{slot.label}</span>
                          <span
                            className={`ml-2 text-[10px] ${
                              isActive ? "text-slate-200" : "text-slate-400"
                            }`}
                          >
                            {flowForSlot
                              ? `${flowForSlot.nodes.length} vragen`
                              : "geen flow"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  {scopeSlots.map((slot, index) => {
                    const flow = library.flows.find((item) =>
                      matchesScope(item, slot.scope)
                    );
                    if (index !== activeScopeIndex) {
                      return null;
                    }
                    if (!flow) {
                      return (
                        <div
                          key={slot.label}
                          className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              {slot.label}
                            </p>
                            <p className="text-sm text-slate-500">
                              Nog geen flow voor deze scope. Maak er een om vragen
                              te koppelen.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                                addFlowForScope(slot.scope, slot.label)
                              }
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              + flow aanmaken
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={flow.id}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              {flow.name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {flow.nodes.length} vragen - {flow.edges.length} relaties
                            </p>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                            disabled={!selectedQuestionId}
                            onClick={() => {
                              if (!selectedQuestionId) {
                                return;
                              }
                              addQuestionToFlow(flow.id, selectedQuestionId);
                            }}
                          >
                            + geselecteerde vraag
                          </button>
                        </div>
                        {!selectedQuestionId ? (
                          <p className="mt-2 text-[11px] text-slate-400">
                            Selecteer links een vraag om toe te voegen.
                          </p>
                        ) : null}
                        <div className="mt-4 space-y-2">
                          {flow.nodes.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              Nog geen vragen gekoppeld. Selecteer een vraag en
                              klik op + geselecteerde vraag.
                            </p>
                          ) : null}
                          {flow.nodes.map((node) => {
                            const question = questionMap.get(node.questionId);
                            return (
                              <div
                                key={node.id}
                                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedQuestionId(node.questionId);
                                    setSelectedEdgeRef(null);
                                  }}
                                  className="text-left text-sm font-semibold text-slate-700"
                                >
                                  {question?.prompt ?? node.questionId}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeNodeFromFlow(flow.id, node.id)
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  verwijderen
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                              Relaties
                            </p>
                            {edgeDraft?.flowId === flow.id ? null : (
                              <button
                                type="button"
                                onClick={() =>
                                  setEdgeDraft({
                                    flowId: flow.id,
                                    from: "",
                                    to: "",
                                    expression: "",
                                  })
                                }
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                + relatie
                              </button>
                            )}
                          </div>
                          {edgeDraft?.flowId === flow.id ? (
                            <div className="mt-3 space-y-2 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-3 text-xs text-slate-600">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <select
                                  value={edgeDraft.from}
                                  onChange={(event) =>
                                    setEdgeDraft((prev) =>
                                      prev
                                        ? { ...prev, from: event.target.value }
                                        : prev
                                    )
                                  }
                                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                >
                                  <option value="">Van node</option>
                                  {flow.nodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                      {questionMap.get(node.questionId)?.prompt ??
                                        node.questionId}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={edgeDraft.to}
                                  onChange={(event) =>
                                    setEdgeDraft((prev) =>
                                      prev
                                        ? { ...prev, to: event.target.value }
                                        : prev
                                    )
                                  }
                                  className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                >
                                  <option value="">Naar node</option>
                                  {flow.nodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                      {questionMap.get(node.questionId)?.prompt ??
                                        node.questionId}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <input
                                value={edgeDraft.expression}
                                onChange={(event) =>
                                  setEdgeDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          expression: event.target.value,
                                        }
                                      : prev
                                  )
                                }
                                placeholder="Voorwaarde (optioneel), bijv. en1090.required == true"
                                className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      !edgeDraft.from ||
                                      !edgeDraft.to ||
                                      edgeDraft.from === edgeDraft.to
                                    ) {
                                      return;
                                    }
                                    addEdgeToFlow(
                                      flow.id,
                                      edgeDraft.from,
                                      edgeDraft.to,
                                      edgeDraft.expression
                                    );
                                    setEdgeDraft(null);
                                  }}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                                  disabled={
                                    !edgeDraft.from ||
                                    !edgeDraft.to ||
                                    edgeDraft.from === edgeDraft.to
                                  }
                                >
                                  toevoegen
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEdgeDraft(null)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  annuleren
                                </button>
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-3 space-y-2">
                            {flow.edges.length === 0 ? (
                              <p className="text-sm text-slate-500">
                                Nog geen relaties. Gebruik + relatie om te verbinden.
                              </p>
                            ) : null}
                            {flow.edges.map((edge) => {
                              const fromLabel =
                                questionMap.get(
                                  flow.nodes.find((node) => node.id === edge.from)
                                    ?.questionId ?? ""
                                )?.prompt ?? edge.from;
                              const toLabel =
                                questionMap.get(
                                  flow.nodes.find((node) => node.id === edge.to)
                                    ?.questionId ?? ""
                                )?.prompt ?? edge.to;
                              return (
                                <div
                                  key={edge.id}
                                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEdgeRef({
                                        flowId: flow.id,
                                        edgeId: edge.id,
                                      });
                                      setSelectedQuestionId(null);
                                    }}
                                    className="text-left text-sm font-semibold text-slate-700"
                                  >
                                    {fromLabel} {"->"} {toLabel}
                                  </button>
                                  <div className="flex items-center gap-2">
                                    {edge.when?.expression ? (
                                      <span className="text-[11px] text-slate-400">
                                        {edge.when.expression}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeEdge(flow.id, edge.id)
                                      }
                                      className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                      verwijderen
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-4 lg:col-span-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Details
                </h2>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  {selectedQuestion ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Geselecteerde vraag
                        </p>
                        <p className="text-sm text-slate-600">
                          {selectedQuestion.prompt}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {selectedQuestion.id}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsTab("question")}
                          aria-pressed={detailsTab === "question"}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            detailsTab === "question"
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Vraag
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsTab("options")}
                          aria-pressed={detailsTab === "options"}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            detailsTab === "options"
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Opties
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsTab("outputs")}
                          aria-pressed={detailsTab === "outputs"}
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                            detailsTab === "outputs"
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          Outputs
                        </button>
                      </div>
                      {detailsTab === "question" ? (
                        <div className="space-y-4">
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Concept key
                            <input
                              value={selectedQuestion.conceptKey}
                              onChange={(event) =>
                                updateQuestion(selectedQuestion.id, {
                                  conceptKey: event.target.value,
                                })
                              }
                              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                          </label>
                          {library.questions.some(
                            (question) =>
                              question.conceptKey === selectedQuestion.conceptKey &&
                              question.id !== selectedQuestion.id
                          ) ? (
                            <p className="text-xs font-semibold text-rose-600">
                              Concept key bestaat al.
                            </p>
                          ) : null}
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Vraagtekst
                            <textarea
                              value={selectedQuestion.prompt}
                              onChange={(event) =>
                                updateQuestion(selectedQuestion.id, {
                                  prompt: event.target.value,
                                })
                              }
                              rows={3}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Type
                            <select
                              value={selectedQuestion.kind}
                              onChange={(event) =>
                                updateQuestion(selectedQuestion.id, {
                                  kind: event.target.value as Question["kind"],
                                })
                              }
                              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            >
                              <option value="text">Tekst</option>
                              <option value="number">Nummer</option>
                              <option value="boolean">Ja/Nee</option>
                              <option value="single">Single choice</option>
                              <option value="multi">Multi choice</option>
                            </select>
                          </label>
                          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                            Tags
                            <input
                              value={joinList(selectedQuestion.tags)}
                              onChange={(event) =>
                                updateQuestion(selectedQuestion.id, {
                                  tags: splitList(event.target.value),
                                })
                              }
                              placeholder="bijv. materiaal, compliance"
                              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            />
                          </label>
                          {similarQuestions.length > 0 ? (
                            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                                Vergelijkbare vragen
                              </p>
                              <div className="space-y-1">
                                {similarQuestions.map(({ question, score }) => (
                                  <button
                                    key={question.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedQuestionId(question.id)
                                    }
                                    className="block text-left text-xs font-semibold text-amber-800"
                                  >
                                    {question.prompt} ({Math.round(score * 100)}%)
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => removeQuestion(selectedQuestion.id)}
                            disabled={(usageMap.get(selectedQuestion.id) ?? 0) > 0}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Vraag verwijderen
                          </button>
                        </div>
                      ) : null}

                      {detailsTab === "options" ? (
                        <div className="space-y-3">
                          {selectedQuestion.kind === "single" ||
                          selectedQuestion.kind === "multi" ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  Opties
                                </p>
                                <button
                                  type="button"
                                  onClick={() => addOption(selectedQuestion)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  + optie
                                </button>
                              </div>
                              <div className="space-y-3">
                                {(selectedQuestion.options ?? []).map((option) => (
                                  <div
                                    key={option.id}
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-600"
                                  >
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                                        Label
                                        <input
                                          value={option.label}
                                          onChange={(event) =>
                                            updateOption(
                                              selectedQuestion,
                                              option.id,
                                              {
                                                label: event.target.value,
                                              }
                                            )
                                          }
                                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        />
                                      </label>
                                      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                                        Value
                                        <input
                                          value={option.value}
                                          onChange={(event) =>
                                            updateOption(
                                              selectedQuestion,
                                              option.id,
                                              {
                                                value: event.target.value,
                                              }
                                            )
                                          }
                                          className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                        />
                                      </label>
                                    </div>
                                    <details className="mt-3">
                                      <summary className="cursor-pointer text-xs font-semibold text-slate-500">
                                        Outputs voor optie
                                      </summary>
                                      <div className="mt-3">
                                        <OutputEditor
                                          outputs={option.outputs ?? []}
                                          onChange={(next) =>
                                            updateOptionOutputs(
                                              selectedQuestion,
                                              option.id,
                                              next
                                            )
                                          }
                                        />
                                      </div>
                                    </details>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeOption(selectedQuestion, option.id)
                                      }
                                      className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                    >
                                      Optie verwijderen
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              Deze vraag heeft geen opties. Kies type Single choice
                              of Multi choice.
                            </p>
                          )}
                        </div>
                      ) : null}

                      {detailsTab === "outputs" ? (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Outputs (planning)
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Outputs sturen de takenlijst in de planning.
                          </p>
                          <OutputEditor
                            outputs={selectedQuestion.outputs ?? []}
                            onChange={(next) =>
                              updateOutputs(selectedQuestion, next)
                            }
                          />
                        </div>
                      ) : null}

                    </div>
                  ) : selectedEdge && selectedEdgeFlow ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Geselecteerde relatie
                        </p>
                        <p className="text-sm text-slate-500">
                          Flow: {selectedEdgeFlow.name}
                        </p>
                      </div>
                      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Van node
                        <select
                          value={selectedEdge.from}
                          onChange={(event) =>
                            updateEdge(selectedEdgeFlow.id, selectedEdge.id, {
                              from: event.target.value,
                            })
                          }
                          className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                          {selectedEdgeFlow.nodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {questionMap.get(node.questionId)?.prompt ??
                                node.questionId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Naar node
                        <select
                          value={selectedEdge.to}
                          onChange={(event) =>
                            updateEdge(selectedEdgeFlow.id, selectedEdge.id, {
                              to: event.target.value,
                            })
                          }
                          className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        >
                          {selectedEdgeFlow.nodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {questionMap.get(node.questionId)?.prompt ??
                                node.questionId}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                        Voorwaarde
                        <input
                          value={selectedEdge.when?.expression ?? ""}
                          onChange={(event) =>
                            updateEdge(selectedEdgeFlow.id, selectedEdge.id, {
                              when: event.target.value.trim()
                                ? { expression: event.target.value }
                                : undefined,
                            })
                          }
                          placeholder="bijv. en1090.required == true"
                          className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          removeEdge(selectedEdgeFlow.id, selectedEdge.id)
                        }
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        Relatie verwijderen
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Selecteer links een vraag of klik in het diagram op een
                      relatie om details te bewerken.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            onClick={() => router.push("/wizard/step2-setup")}
          >
            Terug
          </button>
          <div className="flex flex-col gap-2 text-sm text-slate-500 sm:items-end">
            <span>
              {saveStatus === "saving"
                ? "Opslaan..."
                : isDirty
                ? "Wijzigingen nog niet opgeslagen."
                : "Alles is opgeslagen."}
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onClick={handleCancel}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                onClick={handleReset}
                disabled={isResetting}
              >
                {isResetting ? "Resetten..." : "Reset bibliotheek"}
              </button>
              <button
                type="button"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
                onClick={handleOverwriteDefault}
                title="Sla de huidige bibliotheek op als standaard template."
                disabled={isSavingTemplate}
              >
                {isSavingTemplate
                  ? "Opslaan..."
                  : "Standaard template overschrijven"}
              </button>
              <button
                type="button"
                className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
