"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [edgeDraft, setEdgeDraft] = useState<{
    flowId: string;
    from: string;
    to: string;
    expression: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
  }, []);

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
    if (!query) {
      return library.questions;
    }
    return library.questions.filter((question) => {
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
  }, [library.questions, search]);

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
    setIsSaving(false);
  };

  const handleReset = () => {
    setIsResetting(true);
    resetQuestionLibrary();
    setLibrary(defaultQuestionLibrary);
    setSelectedQuestionId(defaultQuestionLibrary.questions[0]?.id ?? null);
    setSelectedEdgeRef(null);
    setIsResetting(false);
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
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    duplicatePromptGroups.length > 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Duplicaten: {duplicatePromptGroups.length}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    orphanQuestionIds.size > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Losse vragen: {orphanQuestionIds.size}
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    missingOutputIds.size > 0
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  Ontbrekende outputs: {missingOutputIds.size}
                </span>
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
                  placeholder="Zoek op tekst, key, tag"
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                <div className="space-y-2">
                  {filteredQuestions.map((question) => {
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
                  })}
                </div>
              </div>
              <div className="space-y-4 lg:col-span-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Flow diagram
                </h2>
                <div className="space-y-4">
                  {scopeSlots.map((slot) => {
                    const flow = library.flows.find((item) =>
                      matchesScope(item, slot.scope)
                    );
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
                                Nog geen flow voor deze scope.
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
                              {flow.nodes.length} node(s) - {flow.edges.length} relaties
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
                        <div className="mt-4 space-y-2">
                          {flow.nodes.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              Nog geen vragen gekoppeld.
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
                                Nog geen relaties.
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
                          Vraag details
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedQuestion.id}
                        </p>
                      </div>
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
                                        updateOption(selectedQuestion, option.id, {
                                          label: event.target.value,
                                        })
                                      }
                                      className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                                    Value
                                    <input
                                      value={option.value}
                                      onChange={(event) =>
                                        updateOption(selectedQuestion, option.id, {
                                          value: event.target.value,
                                        })
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
                      ) : null}

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Outputs (planning)
                        </p>
                        <OutputEditor
                          outputs={selectedQuestion.outputs ?? []}
                          onChange={(next) => updateOutputs(selectedQuestion, next)}
                        />
                      </div>

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
                                onClick={() => setSelectedQuestionId(question.id)}
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
                  ) : selectedEdge && selectedEdgeFlow ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Relatie details
                        </p>
                        <p className="text-sm text-slate-500">
                          {selectedEdgeFlow.name}
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
                      Selecteer een vraag of relatie om te bewerken.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              className="h-12 rounded-2xl bg-slate-900 px-8 text-base font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
