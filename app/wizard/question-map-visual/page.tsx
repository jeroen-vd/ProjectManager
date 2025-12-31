"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Handle,
  MarkerType,
  Position,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "reactflow";
import {
  loadWizardConfig,
  saveWizardConfig,
} from "../../../src/lib/wizardConfigStorage";
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

type QuestionNodeData = {
  label: string;
  conceptKey: string;
  flags: {
    duplicate: boolean;
    missingOutputs: boolean;
    orphan: boolean;
  };
};

const handleStyle = {
  width: 14,
  height: 14,
  background: "#0f172a",
  border: "2px solid #ffffff",
};

const HELP_STORAGE_KEY = "question-map-visual-help";
const CANVAS_SIZE_STORAGE_KEY = "question-map-visual-canvas-size";

const QuestionNode = ({ data, selected }: NodeProps<QuestionNodeData>) => (
  <div
    className={`min-w-[180px] rounded-2xl border px-3 py-2 text-xs shadow-sm ${
      selected
        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
        : "border-slate-200 bg-white text-slate-700"
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={handleStyle}
    />
    <p className="text-sm font-semibold">{data.label}</p>
    <p
      className={`text-[11px] ${
        selected ? "text-slate-300" : "text-slate-500"
      }`}
    >
      {data.conceptKey}
    </p>
    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
      {data.flags.duplicate ? (
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            selected
              ? "bg-rose-500/30 text-rose-100"
              : "bg-rose-100 text-rose-700"
          }`}
        >
          dup
        </span>
      ) : null}
      {data.flags.missingOutputs ? (
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            selected
              ? "bg-amber-500/30 text-amber-100"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          geen outputs
        </span>
      ) : null}
      {data.flags.orphan ? (
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            selected
              ? "bg-slate-500/30 text-slate-100"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          los
        </span>
      ) : null}
    </div>
    <Handle
      type="source"
      position={Position.Bottom}
      style={handleStyle}
    />
  </div>
);

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

const joinList = (items: string[] | undefined) => (items ?? []).join(", ");

const fieldMatches = (flowValue?: string, scopeValue?: string) =>
  !flowValue || flowValue === scopeValue;

const flowSpecificity = (scope?: FlowScope) =>
  [scope?.categoryId, scope?.contextId, scope?.installationId].filter(Boolean)
    .length;

const matchesScope = (flow: Flow, scope: FlowScope) =>
  flow.scope?.level === scope.level &&
  fieldMatches(flow.scope?.categoryId, scope.categoryId) &&
  fieldMatches(flow.scope?.contextId, scope.contextId) &&
  fieldMatches(flow.scope?.installationId, scope.installationId);

const findBestMatchingFlow = (flows: Flow[], scope: FlowScope) => {
  let best: Flow | null = null;
  let bestScore = -1;
  flows.forEach((flow) => {
    if (!matchesScope(flow, scope)) {
      return;
    }
    const score = flowSpecificity(flow.scope);
    if (score > bestScore) {
      best = flow;
      bestScore = score;
    }
  });
  return best;
};

const questionHasOutputs = (question: Question) => {
  if ((question.outputs ?? []).length > 0) {
    return true;
  }
  return (question.options ?? []).some(
    (option) => (option.outputs ?? []).length > 0
  );
};

const buildDefaultPosition = (index: number) => ({
  x: 80 + (index % 2) * 260,
  y: 80 + Math.floor(index / 2) * 160,
});

export default function QuestionMapVisualPage() {
  const router = useRouter();
  const [config, setConfig] = useState<WizardConfig>(defaultWizardConfig);
  const [library, setLibrary] = useState<QuestionLibrary>(
    defaultQuestionLibrary
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [scope, setScope] = useState({
    categoryId: "",
    contextId: "",
    installationId: "",
  });
  const [activeScopeIndex, setActiveScopeIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node<QuestionNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const pendingFitRef = useRef(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isFlowReady, setIsFlowReady] = useState(false);
  const historyRef = useRef<{ past: QuestionLibrary[]; future: QuestionLibrary[] }>({
    past: [],
    future: [],
  });
  const lastLibraryRef = useRef<QuestionLibrary | null>(null);
  const lastSavedRef = useRef<QuestionLibrary | null>(null);
  const lastManualSaveRef = useRef<QuestionLibrary | null>(null);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isDirty, setIsDirty] = useState(false);
  const [detailsTab, setDetailsTab] = useState<
    "question" | "options" | "outputs"
  >("question");
  const [showHelp, setShowHelp] = useState(true);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [edgeDraft, setEdgeDraft] = useState({
    from: "",
    to: "",
    expression: "",
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(HELP_STORAGE_KEY);
    if (stored === "hidden") {
      setShowHelp(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      HELP_STORAGE_KEY,
      showHelp ? "show" : "hidden"
    );
  }, [showHelp]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(CANVAS_SIZE_STORAGE_KEY);
    if (stored === "expanded") {
      setIsCanvasExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      CANVAS_SIZE_STORAGE_KEY,
      isCanvasExpanded ? "expanded" : "normal"
    );
  }, [isCanvasExpanded]);

  useEffect(() => {
    const loadedConfig = loadWizardConfig();
    const loadedLibrary = loadQuestionLibrary();
    setConfig(loadedConfig);
    setLibrary(loadedLibrary);

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
    lastLibraryRef.current = loadedLibrary;
    lastSavedRef.current = loadedLibrary;
    lastManualSaveRef.current = loadedLibrary;
    historyRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
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

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }
    if (!lastLibraryRef.current) {
      lastLibraryRef.current = library;
      return;
    }
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      lastLibraryRef.current = library;
      setCanUndo(historyRef.current.past.length > 0);
      setCanRedo(historyRef.current.future.length > 0);
      return;
    }
    if (lastLibraryRef.current === library) {
      return;
    }
    historyRef.current.past.push(lastLibraryRef.current);
    historyRef.current.future = [];
    lastLibraryRef.current = library;
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(false);
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
  const activeFlow = activeSlot
    ? findBestMatchingFlow(library.flows, activeSlot.scope)
    : null;

  useEffect(() => {
    if (!activeFlow) {
      pendingFitRef.current = false;
      return;
    }
    pendingFitRef.current = true;
  }, [activeFlow?.id]);

  useEffect(() => {
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
  }, [activeFlow?.id]);

  useEffect(() => {
    if (!activeFlow) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nextNodes = activeFlow.nodes.map((node, index) => {
      const question = questionMap.get(node.questionId);
      return {
        id: node.id,
        position: node.position ?? buildDefaultPosition(index),
        type: "questionNode",
        data: {
          label: question?.prompt ?? node.questionId,
          conceptKey: question?.conceptKey ?? node.questionId,
          flags: {
            duplicate: duplicatePromptIds.has(node.questionId),
            missingOutputs: missingOutputIds.has(node.questionId),
            orphan: orphanQuestionIds.has(node.questionId),
          },
        },
      } satisfies Node<QuestionNodeData>;
    });

    const nextEdges = activeFlow.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
      label: edge.when?.expression ?? "",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#0f172a" },
      style: { stroke: "#0f172a", strokeWidth: 1.5 },
      labelStyle: { fill: "#475569", fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: "#f8fafc", stroke: "#e2e8f0" },
      labelBgPadding: [6, 4],
    }));

    setNodes(nextNodes);
    setEdges(nextEdges);
  }, [
    activeFlow,
    duplicatePromptIds,
    missingOutputIds,
    orphanQuestionIds,
    questionMap,
  ]);

  useEffect(() => {
    if (!isFlowReady || !pendingFitRef.current) {
      return;
    }
    if (nodes.length === 0) {
      pendingFitRef.current = false;
      return;
    }
    pendingFitRef.current = false;
    requestAnimationFrame(() => {
      flowInstanceRef.current?.fitView({ padding: 0.2, duration: 200 });
    });
  }, [isFlowReady, nodes]);

  useEffect(() => {
    if (!activeFlow) {
      return;
    }
    const hasMissingPositions = activeFlow.nodes.some((node) => !node.position);
    if (!hasMissingPositions) {
      return;
    }
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== activeFlow.id) {
          return flow;
        }
        return {
          ...flow,
          nodes: flow.nodes.map((node, index) =>
            node.position ? node : { ...node, position: buildDefaultPosition(index) }
          ),
        };
      }),
    }));
  }, [activeFlow]);

  const flowQuestionIds = useMemo(
    () => new Set(activeFlow?.nodes.map((node) => node.questionId) ?? []),
    [activeFlow?.nodes]
  );
  const flowNodeCount = activeFlow?.nodes.length ?? 0;
  const flowEdgeCount = activeFlow?.edges.length ?? 0;
  const hasActiveFlow = Boolean(activeFlow);
  const hasFlowNodes = flowNodeCount > 0;
  const hasFlowEdges = flowEdgeCount > 0;
  const firstQuestionId = library.questions[0]?.id ?? "";
  const nodeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!activeFlow) {
      return map;
    }
    activeFlow.nodes.forEach((node) => {
      map.set(
        node.id,
        questionMap.get(node.questionId)?.prompt ?? node.questionId
      );
    });
    return map;
  }, [activeFlow, questionMap]);

  const selectedQuestion = selectedQuestionId
    ? questionMap.get(selectedQuestionId) ?? null
    : null;
  const selectedEdge = activeFlow?.edges.find(
    (edge) => edge.id === selectedEdgeId
  );

  useEffect(() => {
    if (!selectedNodeId) {
      return;
    }
    setEdgeDraft((prev) => {
      if (!prev.from) {
        return { ...prev, from: selectedNodeId };
      }
      if (!prev.to && prev.from !== selectedNodeId) {
        return { ...prev, to: selectedNodeId };
      }
      return prev;
    });
  }, [selectedNodeId]);

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
  };

  const createQuestionAndAddToFlow = () => {
    if (!activeSlot) {
      return;
    }
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
    const nextNodeId = uniqueId(
      "node",
      activeFlow?.nodes.map((node) => node.id) ?? []
    );
    setLibrary((prev) => {
      const nextQuestions = [...prev.questions, nextQuestion];
      if (activeFlow) {
        return {
          ...prev,
          questions: nextQuestions,
          flows: prev.flows.map((flow) =>
            flow.id === activeFlow.id
              ? {
                  ...flow,
                  nodes: [
                    ...flow.nodes,
                    {
                      id: nextNodeId,
                      questionId: nextQuestion.id,
                      position: buildDefaultPosition(flow.nodes.length),
                    },
                  ],
                }
              : flow
          ),
        };
      }
      const existingFlowIds = prev.flows.map((flow) => flow.id);
      const base = slugify(`flow-${activeSlot.scope.level}-${activeSlot.label}`);
      const nextFlowId = uniqueId(base, existingFlowIds);
      const nextFlow: Flow = {
        id: nextFlowId,
        name: activeSlot.label,
        scope: activeSlot.scope,
        nodes: [
          {
            id: nextNodeId,
            questionId: nextQuestion.id,
            position: buildDefaultPosition(0),
          },
        ],
        edges: [],
      };
      return {
        ...prev,
        questions: nextQuestions,
        flows: [...prev.flows, nextFlow],
      };
    });
    setSelectedQuestionId(nextQuestion.id);
    setSelectedNodeId(nextNodeId);
    setSelectedEdgeId(null);
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setLibrary((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === questionId ? { ...question, ...updates } : question
      ),
    }));
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

  const handleAddToActiveFlow = (questionId: string) => {
    if (!activeSlot) {
      return;
    }
    setSelectedQuestionId(questionId);
    setSelectedEdgeId(null);
    if (activeFlow) {
      addQuestionToFlow(activeFlow.id, questionId);
      return;
    }
    setLibrary((prev) => {
      const existingIds = prev.flows.map((flow) => flow.id);
      const base = slugify(`flow-${activeSlot.scope.level}-${activeSlot.label}`);
      const nextFlowId = uniqueId(base, existingIds);
      const nextNodeId = uniqueId("node", []);
      const nextFlow: Flow = {
        id: nextFlowId,
        name: activeSlot.label,
        scope: activeSlot.scope,
        nodes: [
          {
            id: nextNodeId,
            questionId,
            position: buildDefaultPosition(0),
          },
        ],
        edges: [],
      };
      return {
        ...prev,
        flows: [...prev.flows, nextFlow],
      };
    });
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
        const nextPosition = buildDefaultPosition(flow.nodes.length);
        return {
          ...flow,
          nodes: [
            ...flow.nodes,
            { id: nextNodeId, questionId, position: nextPosition },
          ],
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
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const addEdgeToFlow = (flowId: string, nextEdge: FlowEdge) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) =>
        flow.id === flowId
          ? { ...flow, edges: [...flow.edges, nextEdge] }
          : flow
      ),
    }));
  };

  const updateEdge = (
    flowId: string,
    edgeId: string,
    updates: Partial<FlowEdge>
  ) => {
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) =>
        flow.id === flowId
          ? {
              ...flow,
              edges: flow.edges.map((edge) =>
                edge.id === edgeId ? { ...edge, ...updates } : edge
              ),
            }
          : flow
      ),
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
    if (selectedEdgeId === edgeId) {
      setSelectedEdgeId(null);
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
    lastLibraryRef.current = defaultQuestionLibrary;
    lastSavedRef.current = defaultQuestionLibrary;
    lastManualSaveRef.current = defaultQuestionLibrary;
    historyRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
    setSaveStatus("saved");
    setIsDirty(false);
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setSearch("");
    setActiveScopeIndex(0);
    setIsResetting(false);
  };

  const handleCancel = () => {
    const fallback = loadQuestionLibrary();
    const snapshot = lastManualSaveRef.current ?? fallback;
    isRestoringRef.current = true;
    historyRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
    setLibrary(snapshot);
    lastLibraryRef.current = snapshot;
    lastSavedRef.current = snapshot;
    setSaveStatus("saved");
    setIsDirty(false);
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
  };

  const handleUndo = useCallback(() => {
    const past = historyRef.current.past;
    if (past.length === 0) {
      return;
    }
    const previous = past[past.length - 1];
    historyRef.current.past = past.slice(0, -1);
    historyRef.current.future = [library, ...historyRef.current.future];
    isRestoringRef.current = true;
    setLibrary(previous);
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(true);
  }, [library]);

  const handleRedo = useCallback(() => {
    const future = historyRef.current.future;
    if (future.length === 0) {
      return;
    }
    const next = future[0];
    historyRef.current.future = future.slice(1);
    historyRef.current.past = [...historyRef.current.past, library];
    isRestoringRef.current = true;
    setLibrary(next);
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
    setCanUndo(true);
    setCanRedo(historyRef.current.future.length > 0);
  }, [library]);

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

  const buildInitialScope = (nextConfig: WizardConfig) => {
    const firstCategory = nextConfig.categories[0]?.id ?? "";
    const firstContext = firstCategory
      ? nextConfig.contextsByCategory[firstCategory]?.[0]?.id ?? ""
      : "";
    const firstInstallation = firstContext
      ? nextConfig.installationsByContext[firstContext]?.[0] ?? ""
      : "";
    return {
      categoryId: firstCategory,
      contextId: firstContext,
      installationId: firstInstallation,
    };
  };

  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      questionLibrary: library,
      wizardConfig: config,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `wizard-backup-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const nextLibrary =
          parsed?.questionLibrary ?? parsed?.library ?? parsed;
        const nextConfig = parsed?.wizardConfig ?? parsed?.config ?? null;
        if (
          !nextLibrary ||
          !Array.isArray(nextLibrary.questions) ||
          !Array.isArray(nextLibrary.flows)
        ) {
          alert("Import mislukt: geen geldige bibliotheek gevonden.");
          return;
        }

        const confirmMessage = `Importeer ${nextLibrary.questions.length} vragen en ${nextLibrary.flows.length} flows? Dit overschrijft je huidige data.`;
        if (!window.confirm(confirmMessage)) {
          return;
        }

        if (nextConfig && typeof nextConfig === "object") {
          saveWizardConfig(nextConfig as WizardConfig);
          const normalizedConfig = loadWizardConfig();
          setConfig(normalizedConfig);
          setScope(buildInitialScope(normalizedConfig));
        }

        saveQuestionLibrary(nextLibrary as QuestionLibrary);
        const normalizedLibrary = loadQuestionLibrary();

        isRestoringRef.current = true;
        historyRef.current = { past: [], future: [] };
        pendingFitRef.current = true;
        setCanUndo(false);
        setCanRedo(false);
        setLibrary(normalizedLibrary);
        lastLibraryRef.current = normalizedLibrary;
        lastSavedRef.current = normalizedLibrary;
        lastManualSaveRef.current = normalizedLibrary;
        setSaveStatus("saved");
        setIsDirty(false);
        setSelectedQuestionId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setEdgeDraft({ from: "", to: "", expression: "" });
      } catch {
        alert("Import mislukt: bestand is geen geldige JSON.");
      }
    };
    reader.readAsText(file);
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

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
      const removed = changes.filter((change) => change.type === "remove");
      if (removed.length > 0 && activeFlow) {
        const removedIds = new Set(removed.map((change) => change.id));
        setLibrary((prev) => ({
          ...prev,
          flows: prev.flows.map((flow) => {
            if (flow.id !== activeFlow.id) {
              return flow;
            }
            const nodes = flow.nodes.filter(
              (node) => !removedIds.has(node.id)
            );
            const nodeIds = new Set(nodes.map((node) => node.id));
            const edges = flow.edges.filter(
              (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
            );
            return { ...flow, nodes, edges };
          }),
        }));
        if (selectedNodeId && removedIds.has(selectedNodeId)) {
          setSelectedNodeId(null);
          setSelectedQuestionId(null);
        }
      }
    },
    [activeFlow, selectedNodeId]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((current) => applyEdgeChanges(changes, current));
      const removed = changes.filter((change) => change.type === "remove");
      if (removed.length > 0 && activeFlow) {
        setLibrary((prev) => ({
          ...prev,
          flows: prev.flows.map((flow) =>
            flow.id === activeFlow.id
              ? {
                  ...flow,
                  edges: flow.edges.filter(
                    (edge) => !removed.some((change) => change.id === edge.id)
                  ),
                }
              : flow
          ),
        }));
      }
      if (removed.some((change) => change.id === selectedEdgeId)) {
        setSelectedEdgeId(null);
      }
    },
    [activeFlow, selectedEdgeId]
  );

  const handleConnect = useCallback((connection: Connection) => {
    if (!activeFlow || !connection.source || !connection.target) {
      return;
    }
    if (connection.source === connection.target) {
      return;
    }
    const nextEdgeId = uniqueId(
      "edge",
      activeFlow.edges.map((edge) => edge.id)
    );
    const nextEdge: FlowEdge = {
      id: nextEdgeId,
      from: connection.source,
      to: connection.target,
    };
    addEdgeToFlow(activeFlow.id, nextEdge);
    setEdges((current) =>
      addEdge(
        {
          id: nextEdgeId,
          source: connection.source,
          target: connection.target,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#0f172a" },
          style: { stroke: "#0f172a", strokeWidth: 1.5 },
        },
        current
      )
    );
    setSelectedEdgeId(nextEdgeId);
    setSelectedNodeId(null);
    setSelectedQuestionId(null);
  }, [activeFlow]);

  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    if (!activeFlow || !node?.id) {
      return;
    }
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) =>
        flow.id === activeFlow.id
          ? {
              ...flow,
              nodes: flow.nodes.map((item) =>
                item.id === node.id
                  ? { ...item, position: node.position ?? item.position }
                  : item
              ),
            }
          : flow
      ),
    }));
  }, [activeFlow]);

  const handleFlowInit = useCallback((instance: ReactFlowInstance) => {
    if (flowInstanceRef.current) {
      return;
    }
    flowInstanceRef.current = instance;
    setIsFlowReady(true);
  }, []);

  const handleFitView = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance) {
      return;
    }
    requestAnimationFrame(() => {
      instance.fitView({ padding: 0.2, duration: 200 });
    });
  }, []);

  const handleCenterSelection = useCallback(() => {
    const instance = flowInstanceRef.current;
    if (!instance) {
      return;
    }
    if (selectedNodeId) {
      const node = instance.getNode(selectedNodeId);
      if (!node) {
        return;
      }
      const position = node.positionAbsolute ?? node.position;
      const centerX = position.x + (node.width ?? 0) / 2;
      const centerY = position.y + (node.height ?? 0) / 2;
      instance.setCenter(centerX, centerY, { duration: 200 });
      return;
    }
    if (!selectedEdgeId || !activeFlow) {
      return;
    }
    const edge = activeFlow.edges.find((item) => item.id === selectedEdgeId);
    if (!edge) {
      return;
    }
    const source = instance.getNode(edge.from);
    const target = instance.getNode(edge.to);
    if (!source || !target) {
      return;
    }
    const sourcePosition = source.positionAbsolute ?? source.position;
    const targetPosition = target.positionAbsolute ?? target.position;
    const centerX = (sourcePosition.x + targetPosition.x) / 2;
    const centerY = (sourcePosition.y + targetPosition.y) / 2;
    instance.setCenter(centerX, centerY, { duration: 200 });
  }, [activeFlow, selectedEdgeId, selectedNodeId]);

  const handleDeleteSelection = useCallback(() => {
    if (!activeFlow) {
      return;
    }
    if (selectedEdgeId) {
      removeEdge(activeFlow.id, selectedEdgeId);
      return;
    }
    if (selectedNodeId) {
      removeNodeFromFlow(activeFlow.id, selectedNodeId);
    }
  }, [activeFlow, selectedEdgeId, selectedNodeId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName.toLowerCase();
        if (
          tag === "input" ||
          tag === "textarea" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      const key = event.key.toLowerCase();
      if (key === "delete" || key === "backspace") {
        if (selectedNodeId || selectedEdgeId) {
          event.preventDefault();
          handleDeleteSelection();
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        (key === "y" || (event.shiftKey && key === "z"))
      ) {
        event.preventDefault();
        handleRedo();
      }
    },
    [handleDeleteSelection, handleRedo, handleUndo, selectedEdgeId, selectedNodeId]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
      const selectedNode = selectedNodes[0];
      const selectedEdge = selectedEdges[0];
      if (selectedNode && activeFlow) {
        const nodeQuestionId =
          activeFlow.nodes.find((item) => item.id === selectedNode.id)
            ?.questionId ?? null;
        setSelectedNodeId(selectedNode.id);
        setSelectedQuestionId(nodeQuestionId);
        setSelectedEdgeId(null);
        return;
      }
      if (selectedEdge) {
        setSelectedEdgeId(selectedEdge.id);
        setSelectedNodeId(null);
        setSelectedQuestionId(null);
        return;
      }
      setSelectedNodeId(null);
      setSelectedQuestionId(null);
      setSelectedEdgeId(null);
    },
    [activeFlow]
  );

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      if (!activeFlow) {
        return;
      }
      const nodeQuestionId =
        activeFlow.nodes.find((item) => item.id === node.id)?.questionId ?? null;
      setSelectedNodeId(node.id);
      setSelectedQuestionId(nodeQuestionId);
      setSelectedEdgeId(null);
    },
    [activeFlow]
  );

  const handleEdgeClick = useCallback((_event: unknown, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
    setSelectedQuestionId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedQuestionId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleSelectQuestion = useCallback((questionId: string) => {
    setSelectedQuestionId(questionId);
    setSelectedEdgeId(null);
    const flowNodeId =
      activeFlow?.nodes.find((node) => node.questionId === questionId)?.id ??
      null;
    setSelectedNodeId(flowNodeId);
  }, [activeFlow]);

  const nodeTypes = useMemo(() => ({ questionNode: QuestionNode }), []);
  const fitViewOptions = useMemo(() => ({ padding: 0.2 }), []);
  const canCreateEdge =
    !!activeFlow &&
    edgeDraft.from.trim() !== "" &&
    edgeDraft.to.trim() !== "" &&
    edgeDraft.from !== edgeDraft.to;
  const edgeCondition = edgeDraft.expression.trim();
  const edgeFromLabel = edgeDraft.from
    ? nodeLabelMap.get(edgeDraft.from) ?? edgeDraft.from
    : "Kies een vraag";
  const edgeToLabel = edgeDraft.to
    ? nodeLabelMap.get(edgeDraft.to) ?? edgeDraft.to
    : "Kies een vraag";
  const edgeConditionLabel = edgeCondition ? edgeCondition : "altijd";
  const selectedNodeLabel = selectedNodeId
    ? nodeLabelMap.get(selectedNodeId) ?? selectedNodeId
    : "";
  const selectedEdgeSummary = useMemo(() => {
    if (!selectedEdgeId || !activeFlow) {
      return "";
    }
    const edge = activeFlow.edges.find((item) => item.id === selectedEdgeId);
    if (!edge) {
      return "";
    }
    const fromLabel = nodeLabelMap.get(edge.from) ?? edge.from;
    const toLabel = nodeLabelMap.get(edge.to) ?? edge.to;
    return `${fromLabel} -> ${toLabel}`;
  }, [activeFlow, nodeLabelMap, selectedEdgeId]);

  const handleCreateEdgeFromDraft = () => {
    if (!activeFlow || !canCreateEdge) {
      return;
    }
    const nextEdgeId = uniqueId(
      "edge",
      activeFlow.edges.map((edge) => edge.id)
    );
    const nextEdge: FlowEdge = {
      id: nextEdgeId,
      from: edgeDraft.from,
      to: edgeDraft.to,
      when: edgeDraft.expression.trim()
        ? { expression: edgeDraft.expression.trim() }
        : undefined,
    };
    addEdgeToFlow(activeFlow.id, nextEdge);
    setEdges((current) =>
      addEdge(
        {
          id: nextEdgeId,
          source: edgeDraft.from,
          target: edgeDraft.to,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#0f172a" },
          style: { stroke: "#0f172a", strokeWidth: 1.5 },
        },
        current
      )
    );
    setSelectedEdgeId(nextEdgeId);
    setSelectedNodeId(null);
    setSelectedQuestionId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Wizard setup
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Visuele flowmap
            </h1>
            <p className="text-base text-slate-600">
              Bekijk relaties als een netwerk en pas de flow direct aan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/wizard/question-map")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lijstweergave
            </button>
          </div>
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
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              <div
                className={`space-y-4 lg:col-span-3 ${
                  isCanvasExpanded ? "lg:hidden" : ""
                }`}
              >
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
                  placeholder="Zoek op vraag, key, tag"
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                <div className="space-y-2">
                  {filteredQuestions.map((question) => {
                    const isSelected = question.id === selectedQuestionId;
                    const isInFlow = flowQuestionIds.has(question.id);
                    return (
                      <div
                        key={question.id}
                        className={`rounded-2xl border px-3 py-3 text-xs transition ${
                          isSelected
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectQuestion(question.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm font-semibold">
                            {question.prompt}
                          </p>
                          <p
                            className={`text-[11px] ${
                              isSelected ? "text-slate-200" : "text-slate-500"
                            }`}
                          >
                            {question.conceptKey}
                          </p>
                        </button>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isInFlow
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isInFlow ? "in flow" : "niet gekoppeld"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToActiveFlow(question.id)}
                            disabled={!activeSlot || isInFlow}
                            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                          >
                            + toevoegen
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className={`space-y-4 ${
                  isCanvasExpanded ? "lg:col-span-12" : "lg:col-span-6"
                }`}
              >
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
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                  {hasActiveFlow ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Vragen: {flowNodeCount}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                        Relaties: {flowEdgeCount}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Snelle start
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowHelp((prev) => !prev)}
                      className="text-[10px] font-semibold text-slate-500"
                    >
                      {showHelp ? "verberg" : "toon"}
                    </button>
                  </div>
                  {showHelp ? (
                    <div className="mt-2 space-y-3 text-[11px] text-slate-500">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Checklijst
                        </p>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span>1. Flow voor scope</span>
                            {hasActiveFlow ? (
                              <span className="text-emerald-600">ok</span>
                            ) : activeSlot ? (
                              <button
                                type="button"
                                onClick={() =>
                                  addFlowForScope(
                                    activeSlot.scope,
                                    activeSlot.label
                                  )
                                }
                                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                              >
                                Flow maken
                              </button>
                            ) : (
                              <span className="text-slate-400">kies scope</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>2. Vragen in flow ({flowNodeCount})</span>
                            {hasFlowNodes ? (
                              <span className="text-emerald-600">ok</span>
                            ) : (
                              <span className="text-amber-600">
                                voeg toe
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>3. Relaties ({flowEdgeCount})</span>
                            {hasFlowEdges ? (
                              <span className="text-emerald-600">ok</span>
                            ) : (
                              <span className="text-slate-400">optioneel</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>4. Opslaan</span>
                            <span>
                              {saveStatus === "saving"
                                ? "bezig"
                                : "ok"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        <li>Voeg vragen toe met "+ toevoegen" links.</li>
                        <li>
                          Sleep vragen om te verplaatsen; sleep lege ruimte om te
                          schuiven.
                        </li>
                        <li>Zoom met het muiswiel of met de knoppen.</li>
                        <li>
                          Maak een relatie: sleep van het punt of gebruik
                          "Relatie maken".
                        </li>
                        <li>Verwijderen: selecteer en druk op Delete.</li>
                        <li>Ongedaan: Ctrl+Z, opnieuw: Ctrl+Y.</li>
                      </ul>
                      <p>
                        Relatie betekent: na het beantwoorden van de "van vraag"
                        wordt de "naar vraag" zichtbaar. Voorwaarde is
                        optioneel.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {!activeSlot ? (
                    <div className="px-4 py-6 text-sm text-slate-500">
                      Geen scope geselecteerd.
                    </div>
                  ) : !activeFlow ? (
                    <div className="flex items-center justify-between px-4 py-6 text-sm text-slate-500">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {activeSlot.label}
                        </p>
                        <p className="text-sm text-slate-500">
                          Nog geen flow voor deze scope.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          addFlowForScope(activeSlot.scope, activeSlot.label)
                        }
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        + flow aanmaken
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Canvas
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Sleep vragen om te verplaatsen, klik om te selecteren,
                            Delete om te verwijderen.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleUndo}
                            disabled={!canUndo}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Ongedaan maken (Ctrl+Z)"
                          >
                            ↶
                          </button>
                          <button
                            type="button"
                            onClick={handleRedo}
                            disabled={!canRedo}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Opnieuw (Ctrl+Y)"
                          >
                            ↷
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteSelection}
                            disabled={!selectedNodeId && !selectedEdgeId}
                            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50"
                            title="Verwijder selectie"
                          >
                            Verwijder
                          </button>
                          <button
                            type="button"
                            onClick={handleCenterSelection}
                            disabled={
                              !isFlowReady ||
                              (!selectedNodeId && !selectedEdgeId)
                            }
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Centreren op selectie"
                          >
                            Centreren
                          </button>
                          <button
                            type="button"
                            onClick={() => flowInstanceRef.current?.zoomOut()}
                            disabled={!isFlowReady}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Zoom uit"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => flowInstanceRef.current?.zoomIn()}
                            disabled={!isFlowReady}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Zoom in"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={handleFitView}
                            disabled={!isFlowReady}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Alles in beeld"
                          >
                            Passend
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setIsCanvasExpanded((prev) => !prev)
                            }
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            title="Vergroot of verklein het canvas"
                          >
                            {isCanvasExpanded ? "Canvas normaal" : "Canvas groot"}
                          </button>
                        </div>
                        {selectedNodeId || selectedEdgeId ? (
                          <div className="w-full pt-2 text-[11px] text-slate-500">
                            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                              Selectie:{" "}
                              {selectedNodeId
                                ? selectedNodeLabel
                                : selectedEdgeSummary}
                            </span>
                            <span className="ml-2 text-slate-400">
                              Klik lege ruimte om te deselecteren.
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div
                        className={`relative ${
                          isCanvasExpanded ? "h-[75vh]" : "h-[560px]"
                        }`}
                      >
                        <ReactFlow
                          nodes={nodes}
                          edges={edges}
                          nodeTypes={nodeTypes}
                          onNodesChange={handleNodesChange}
                          onEdgesChange={handleEdgesChange}
                          onConnect={handleConnect}
                          onSelectionChange={handleSelectionChange}
                          onNodeClick={handleNodeClick}
                          onEdgeClick={handleEdgeClick}
                          onNodeDragStop={handleNodeDragStop}
                          onInit={handleFlowInit}
                          onPaneClick={handlePaneClick}
                          nodesConnectable
                          nodesDraggable
                          elementsSelectable
                          panOnDrag
                          zoomOnScroll
                          zoomOnPinch
                          selectionOnDrag={false}
                          fitView
                          fitViewOptions={fitViewOptions}
                          deleteKeyCode={["Backspace", "Delete"]}
                          className="h-full w-full"
                        >
                          <Background gap={24} size={1} color="#e2e8f0" />
                          <MiniMap
                            nodeColor={(node) =>
                              node.selected ? "#0f172a" : "#cbd5e1"
                            }
                            maskColor="rgba(226,232,240,0.6)"
                          />
                          <Controls position="bottom-left" showInteractive={false} />
                        </ReactFlow>
                        {hasActiveFlow && !hasFlowNodes ? (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
                            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-dashed border-slate-200 bg-white/90 px-5 py-4 text-center text-sm text-slate-600 shadow-sm">
                              <p className="text-base font-semibold text-slate-800">
                                Nog geen vragen in deze flow
                              </p>
                              <p className="mt-1 text-[12px] text-slate-500">
                                Voeg links een vraag toe of maak er direct een aan.
                              </p>
                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                                <button
                                  type="button"
                                  onClick={createQuestionAndAddToFlow}
                                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm"
                                >
                                  Nieuwe vraag en toevoegen
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    firstQuestionId
                                      ? handleAddToActiveFlow(firstQuestionId)
                                      : null
                                  }
                                  disabled={!firstQuestionId}
                                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-60"
                                >
                                  Voeg eerste vraag toe
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`space-y-4 lg:col-span-3 ${
                  isCanvasExpanded ? "lg:hidden" : ""
                }`}
              >
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Inspector
                </h2>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                  <div className="space-y-4">
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
                            {activeFlow ? (
                              flowQuestionIds.has(selectedQuestion.id) ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nodeId = activeFlow.nodes.find(
                                      (node) =>
                                        node.questionId === selectedQuestion.id
                                    )?.id;
                                    if (nodeId) {
                                      removeNodeFromFlow(activeFlow.id, nodeId);
                                    }
                                  }}
                                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                                >
                                  Verwijder uit flow
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    activeFlow
                                      ? addQuestionToFlow(
                                          activeFlow.id,
                                          selectedQuestion.id
                                        )
                                      : null
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Toevoegen aan flow
                                </button>
                              )
                            ) : null}
                            <button
                              type="button"
                              onClick={() => router.push("/wizard/question-map")}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              Open detailbewerking
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
                                  {(selectedQuestion.options ?? []).map(
                                    (option) => (
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
                                            removeOption(
                                              selectedQuestion,
                                              option.id
                                            )
                                          }
                                          className="mt-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                        >
                                          Optie verwijderen
                                        </button>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">
                                Deze vraag heeft geen opties. Kies type Single
                                choice of Multi choice.
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
                    ) : selectedEdge && activeFlow ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Geselecteerde relatie
                          </p>
                          <p className="text-sm text-slate-500">
                            Flow: {activeFlow.name}
                          </p>
                        </div>
                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                          Van vraag
                          <select
                            value={selectedEdge.from}
                            onChange={(event) =>
                              updateEdge(activeFlow.id, selectedEdge.id, {
                                from: event.target.value,
                              })
                            }
                            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          >
                            {activeFlow.nodes.map((node) => (
                              <option key={node.id} value={node.id}>
                                {questionMap.get(node.questionId)?.prompt ??
                                  node.questionId}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                          Naar vraag
                          <select
                            value={selectedEdge.to}
                            onChange={(event) =>
                              updateEdge(activeFlow.id, selectedEdge.id, {
                                to: event.target.value,
                              })
                            }
                            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          >
                            {activeFlow.nodes.map((node) => (
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
                              updateEdge(activeFlow.id, selectedEdge.id, {
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
                          onClick={() => removeEdge(activeFlow.id, selectedEdge.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                        >
                          Relatie verwijderen
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Klik op een vraag of relatie om details te bewerken. Sleep
                        vragen om te verplaatsen.
                      </p>
                    )}

                    {activeFlow ? (
                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Relatie maken
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Relatie bepaalt volgorde: na het beantwoorden van de
                          "van vraag" wordt de "naar vraag" zichtbaar. Laat
                          voorwaarde leeg om altijd door te gaan. Je kan ook
                          verbinden door het punt van een vraag te slepen. Tip:
                          klik twee vragen om "van" en "naar" te vullen.
                        </p>
                        {activeFlow.nodes.length < 2 ? (
                          <p className="mt-2 text-sm text-slate-500">
                            Voeg minimaal twee vragen toe om een relatie te maken.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {selectedNodeId ? (
                              <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                  Geselecteerd: {selectedNodeLabel}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEdgeDraft((prev) => ({
                                      ...prev,
                                      from: selectedNodeId,
                                    }))
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Gebruik als start
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEdgeDraft((prev) => ({
                                      ...prev,
                                      to: selectedNodeId,
                                    }))
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Gebruik als doel
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEdgeDraft({
                                      from: "",
                                      to: "",
                                      expression: "",
                                    })
                                  }
                                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Wis selectie
                                </button>
                              </div>
                            ) : null}
                            <div className="grid gap-2">
                              <label className="text-xs font-semibold text-slate-500">
                                Als deze vraag beantwoord is
                                <select
                                  value={edgeDraft.from}
                                  onChange={(event) =>
                                    setEdgeDraft((prev) => ({
                                      ...prev,
                                      from: event.target.value,
                                    }))
                                  }
                                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                >
                                  <option value="">Kies een vraag</option>
                                  {activeFlow.nodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                      {questionMap.get(node.questionId)?.prompt ??
                                        node.questionId}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-xs font-semibold text-slate-500">
                                Toon dan deze vraag
                                <select
                                  value={edgeDraft.to}
                                  onChange={(event) =>
                                    setEdgeDraft((prev) => ({
                                      ...prev,
                                      to: event.target.value,
                                    }))
                                  }
                                  className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                >
                                  <option value="">Kies een vraag</option>
                                  {activeFlow.nodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                      {questionMap.get(node.questionId)?.prompt ??
                                        node.questionId}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <label className="text-xs font-semibold text-slate-500">
                              Voorwaarde (optioneel)
                              <input
                                value={edgeDraft.expression}
                                onChange={(event) =>
                                  setEdgeDraft((prev) => ({
                                    ...prev,
                                    expression: event.target.value,
                                  }))
                                }
                                placeholder="bijv. en1090.required == true"
                                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                              />
                            </label>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                              <p className="font-semibold text-slate-500">
                                Voorbeeld
                              </p>
                              <p>
                                Als {edgeFromLabel}, toon {edgeToLabel}.
                                Voorwaarde: {edgeConditionLabel}.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateEdgeFromDraft}
                              disabled={!canCreateEdge}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Relatie toevoegen
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="h-12 rounded-2xl border border-slate-200 bg-white px-8 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
              onClick={() => router.push("/wizard/question-map")}
            >
              Terug
            </button>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                type="button"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onClick={handleExport}
              >
                Exporteren
              </button>
              <button
                type="button"
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onClick={() => importInputRef.current?.click()}
              >
                Importeren
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
                className="h-12 rounded-2xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
                onClick={handleCancel}
              >
                Annuleren
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
          <span className="text-sm text-slate-500 sm:text-right">
            {saveStatus === "saving"
              ? "Opslaan..."
              : isDirty
              ? "Wijzigingen nog niet opgeslagen."
              : "Alles is opgeslagen."}
          </span>
        </div>
      </main>
    </div>
  );
}
