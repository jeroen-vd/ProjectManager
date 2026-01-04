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
  type FlowNode,
  type FlowScope,
  type Question,
  type QuestionLibrary,
  type TaskOutput,
} from "../../../src/config/questionLibrary.default";
import {
  loadQuestionLibrary,
  saveQuestionLibrary,
} from "../../../src/lib/questionLibraryStorage";
import CenteredPopup from "../CenteredPopup";
import TemplateRevisionsPanel from "../TemplateRevisionsPanel";
import { useCenteredPopup, type PopupState } from "../useCenteredPopup";

type QuestionNodeData = {
  label: string;
  conceptKey: string;
  questionId: string;
  scopeLabel?: string;
  order?: number;
  showOrder?: boolean;
  isLocked?: boolean;
  isGhost?: boolean;
  isSelected?: boolean;
  flags: {
    duplicate: boolean;
    missingOutputs: boolean;
    orphan: boolean;
    conditional: boolean;
  };
};

const HELP_STORAGE_KEY = "question-map-visual-help";
const CANVAS_SIZE_STORAGE_KEY = "question-map-visual-canvas-size";
const FLOW_LEVELS: FlowScope["level"][] = [
  "global",
  "category",
  "context",
  "installation",
];

const QuestionNode = ({ data, selected }: NodeProps<QuestionNodeData>) => {
  const isGhost = Boolean(data.isGhost);
  const isLocked = Boolean(data.isLocked) || isGhost;
  const isSelected = data.isSelected ?? selected;
  const handleStyle = {
    width: 14,
    height: 14,
    background: isGhost ? "#cbd5e1" : isLocked ? "#94a3b8" : "#0f172a",
    border: "2px solid #ffffff",
    opacity: isGhost ? 0.4 : isLocked ? 0.6 : 1,
  };
  const containerClass = isGhost
    ? "border-slate-200 bg-slate-100 text-slate-500"
    : isLocked
    ? isSelected
      ? "border-slate-400 bg-slate-200 text-slate-700 shadow"
      : "border-slate-200 bg-slate-50 text-slate-500"
    : isSelected
    ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
    : "border-slate-200 bg-white text-slate-700";
  return (
    <div
      className={`min-w-[180px] rounded-2xl border px-3 py-2 text-xs shadow-sm ${containerClass} ${
        isGhost ? "border-dashed opacity-80" : isLocked ? "opacity-90" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{data.label}</p>
          {data.scopeLabel ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                isGhost
                  ? "border-slate-200 bg-slate-100 text-slate-500"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {data.scopeLabel}
            </span>
          ) : null}
        </div>
        {data.showOrder && data.order ? (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              isSelected
                ? "border-slate-600 bg-slate-800 text-slate-200"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {data.order}
          </span>
        ) : null}
      </div>
      <p
        className={`text-[11px] ${
          isSelected ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {data.conceptKey}
      </p>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
        {data.flags.conditional ? (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              isSelected
                ? "bg-sky-500/30 text-sky-100"
                : "bg-sky-100 text-sky-700"
            }`}
          >
            voorwaardelijk
          </span>
        ) : null}
        {data.flags.duplicate ? (
          <span
            className={`rounded-full px-2 py-0.5 font-semibold ${
              isSelected
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
              isSelected
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
              isSelected
                ? "bg-slate-500/30 text-slate-100"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            los
          </span>
        ) : null}
      </div>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </div>
  );
};

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

const questionKindLabels: Record<Question["kind"], string> = {
  text: "Tekst",
  number: "Nummer",
  boolean: "Ja/Nee",
  single: "Single choice",
  multi: "Multi choice",
};

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

type FlowWithLabel = {
  flow: Flow;
  label: string;
};

type ActiveFlow = {
  id: string;
  name: string;
  scope: FlowScope;
  nodes: FlowNode[];
  edges: FlowEdge[];
  excludedQuestionIds?: string[];
};

type ResolvedFlows = {
  nodes: Flow["nodes"];
  edges: Flow["edges"];
  nodeInfoById: Map<
    string,
    {
      questionId: string;
      flowId: string;
      label: string;
      level: FlowScope["level"];
    }
  >;
  edgeInfoById: Map<
    string,
    {
      flowId: string;
      label: string;
      level: FlowScope["level"];
    }
  >;
  decisionByQuestionId: Map<
    string,
    {
      nodeId?: string;
      flowId: string;
      label: string;
      level: FlowScope["level"];
      isExcluded: boolean;
    }
  >;
};

const resolveMergedFlows = (
  merged: FlowWithLabel[],
  preferredFlowId?: string | null
): ResolvedFlows => {
  const resolveNodeId = (flowId: string, nodeId: string) =>
    preferredFlowId && flowId === preferredFlowId
      ? nodeId
      : `${flowId}::${nodeId}`;
  const nodeInfoById = new Map<
    string,
    {
      questionId: string;
      flowId: string;
      label: string;
      level: FlowScope["level"];
    }
  >();
  const flowNodeInfoByFlowId = new Map<
    string,
    Map<string, { questionId: string; resolvedId: string }>
  >();
  const flowQuestionIdsByFlowId = new Map<string, Set<string>>();
  merged.forEach(({ flow, label }) => {
    const questionIds = new Set<string>();
    const flowNodeInfo = new Map<
      string,
      { questionId: string; resolvedId: string }
    >();
    flow.nodes.forEach((node) => {
      const resolvedId = resolveNodeId(flow.id, node.id);
      nodeInfoById.set(resolvedId, {
        questionId: node.questionId,
        flowId: flow.id,
        label,
        level: flow.scope.level,
      });
      flowNodeInfo.set(node.id, {
        questionId: node.questionId,
        resolvedId,
      });
      questionIds.add(node.questionId);
    });
    flowNodeInfoByFlowId.set(flow.id, flowNodeInfo);
    flowQuestionIdsByFlowId.set(flow.id, questionIds);
  });

  const decisionByQuestionId = new Map<
    string,
    {
      nodeId?: string;
      flowId: string;
      label: string;
      level: FlowScope["level"];
      isExcluded: boolean;
    }
  >();
  [...merged].reverse().forEach(({ flow, label }) => {
    const flowQuestionIds = flowQuestionIdsByFlowId.get(flow.id) ?? new Set();
    const flowNodeInfo = flowNodeInfoByFlowId.get(flow.id) ?? new Map();
    flow.nodes.forEach((node) => {
      const info = flowNodeInfo.get(node.id);
      if (!info) {
        return;
      }
      if (!decisionByQuestionId.has(node.questionId)) {
        decisionByQuestionId.set(node.questionId, {
          nodeId: info.resolvedId,
          flowId: flow.id,
          label,
          level: flow.scope.level,
          isExcluded: false,
        });
      }
    });
    (flow.excludedQuestionIds ?? []).forEach((questionId) => {
      if (flowQuestionIds.has(questionId)) {
        return;
      }
      if (!decisionByQuestionId.has(questionId)) {
        decisionByQuestionId.set(questionId, {
          flowId: flow.id,
          label,
          level: flow.scope.level,
          isExcluded: true,
        });
      }
    });
  });

  const winningNodeIdByQuestionId = new Map<string, string>();
  decisionByQuestionId.forEach((decision, questionId) => {
    if (!decision.isExcluded && decision.nodeId) {
      winningNodeIdByQuestionId.set(questionId, decision.nodeId);
    }
  });

  const nodes: Flow["nodes"] = [];
  merged.forEach(({ flow }) => {
    const flowNodeInfo = flowNodeInfoByFlowId.get(flow.id) ?? new Map();
    flow.nodes.forEach((node) => {
      const decision = decisionByQuestionId.get(node.questionId);
      const info = flowNodeInfo.get(node.id);
      if (
        !decision ||
        !info ||
        decision.isExcluded ||
        decision.nodeId !== info.resolvedId
      ) {
        return;
      }
      nodes.push({ ...node, id: info.resolvedId });
    });
  });

  const edgeKeys = new Set<string>();
  const edges: Flow["edges"] = [];
  const edgeInfoById = new Map<
    string,
    {
      flowId: string;
      label: string;
      level: FlowScope["level"];
    }
  >();
  const resolveEdgeId = (flowId: string, edgeId: string) =>
    preferredFlowId && flowId === preferredFlowId
      ? edgeId
      : `${flowId}::${edgeId}`;
  merged.forEach(({ flow, label }) => {
    const flowNodeInfo = flowNodeInfoByFlowId.get(flow.id) ?? new Map();
    flow.edges.forEach((edge) => {
      const fromQuestionId = flowNodeInfo.get(edge.from)?.questionId;
      const toQuestionId = flowNodeInfo.get(edge.to)?.questionId;
      if (!fromQuestionId || !toQuestionId) {
        return;
      }
      const fromNodeId = winningNodeIdByQuestionId.get(fromQuestionId);
      const toNodeId = winningNodeIdByQuestionId.get(toQuestionId);
      if (!fromNodeId || !toNodeId) {
        return;
      }
      const key = `${fromNodeId}:${toNodeId}:${edge.when?.expression ?? ""}`;
      if (edgeKeys.has(key)) {
        return;
      }
      edgeKeys.add(key);
      const edgeId = resolveEdgeId(flow.id, edge.id);
      edges.push({
        ...edge,
        id: edgeId,
        from: fromNodeId,
        to: toNodeId,
      });
      edgeInfoById.set(edgeId, {
        flowId: flow.id,
        label,
        level: flow.scope.level,
      });
    });
  });

  return { nodes, edges, nodeInfoById, edgeInfoById, decisionByQuestionId };
};

type ConfirmState = PopupState & {
  confirmLabel: string;
  onConfirm: () => void;
};

const buildDefaultPosition = (index: number) => ({
  x: 80 + (index % 2) * 260,
  y: 80 + Math.floor(index / 2) * 160,
});

export default function QuestionMapVisualPage() {
  const router = useRouter();
  const { popup, notify, close } = useCenteredPopup("Melding");
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
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
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isDirty, setIsDirty] = useState(false);
  const [detailsTab, setDetailsTab] = useState<
    "question" | "options" | "outputs"
  >("question");
  const [showHelp, setShowHelp] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [autoHiddenPreview, setAutoHiddenPreview] = useState(false);
  const [showInspector, setShowInspector] = useState(true);
  const [showNodeOrder, setShowNodeOrder] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [showCombinedFlow, setShowCombinedFlow] = useState(true);
  const [showGlobalGhosts, setShowGlobalGhosts] = useState(true);
  const [showConditions, setShowConditions] = useState(false);
  const [isCanvasExpanded, setIsCanvasExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLibraryOverlay, setShowLibraryOverlay] = useState(false);
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
    if (stored === "expanded" && typeof document !== "undefined") {
      if (!document.fullscreenElement) {
        return;
      }
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
    if (!isCanvasExpanded) {
      setShowLibraryOverlay(false);
    }
  }, [isCanvasExpanded]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      setIsCanvasExpanded(active);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen && isCanvasExpanded) {
      setIsCanvasExpanded(false);
    }
  }, [isCanvasExpanded, isFullscreen]);

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
  const activeScopeLevel = activeSlot?.scope.level;
  const activeFlow = activeSlot
    ? (findBestMatchingFlow(library.flows, activeSlot.scope) as ActiveFlow | null)
    : null;
  const activeFlowId = activeFlow?.id ?? null;
  const { previewMergedFlows, previewMissingFlowLabels } = useMemo(() => {
    const byLevel = new Map<FlowScope["level"], { flow: Flow; label: string }>();
    scopeSlots.forEach((slot) => {
      const flow = findBestMatchingFlow(library.flows, slot.scope);
      if (flow) {
        byLevel.set(slot.scope.level, { flow, label: slot.label });
      }
    });

    const merged = FLOW_LEVELS
      .map((level) => byLevel.get(level))
      .filter((item): item is { flow: Flow; label: string } => Boolean(item));
    const missing = scopeSlots
      .filter((slot) => !byLevel.has(slot.scope.level))
      .map((slot) => slot.label);

    return { previewMergedFlows: merged, previewMissingFlowLabels: missing };
  }, [library.flows, scopeSlots]);
  const canvasMergedFlows = useMemo(() => {
    const byLevel = new Map<FlowScope["level"], { flow: Flow; label: string }>();
    scopeSlots.forEach((slot) => {
      const flow = findBestMatchingFlow(library.flows, slot.scope);
      if (flow) {
        byLevel.set(slot.scope.level, { flow, label: slot.label });
      }
    });

    const activeIndex =
      activeScopeLevel != null
        ? FLOW_LEVELS.indexOf(activeScopeLevel)
      : FLOW_LEVELS.length - 1;
    const maxIndex = activeIndex === -1 ? FLOW_LEVELS.length - 1 : activeIndex;
    const merged = FLOW_LEVELS.slice(0, maxIndex + 1)
      .map((level) => byLevel.get(level))
      .filter((item): item is { flow: Flow; label: string } => Boolean(item));
    return merged;
  }, [activeScopeLevel, library.flows, scopeSlots]);
  const previewResolved = useMemo(
    () => resolveMergedFlows(previewMergedFlows, activeFlowId),
    [activeFlowId, previewMergedFlows]
  );
  const canvasResolved = useMemo(
    () => resolveMergedFlows(canvasMergedFlows, activeFlowId),
    [activeFlowId, canvasMergedFlows]
  );
  const previewIncomingEdges = useMemo(() => {
    const map = new Map<string, Flow["edges"]>();
    previewResolved.edges.forEach((edge) => {
      const list = map.get(edge.to) ?? [];
      list.push(edge);
      map.set(edge.to, list);
    });
    return map;
  }, [previewResolved.edges]);
  const previewQuestions = useMemo(() => {
    return previewResolved.nodes.map((node, index) => {
      const question = questionMap.get(node.questionId) ?? null;
      const edges = previewIncomingEdges.get(node.id) ?? [];
      const conditions = edges
        .map((edge) => edge.when?.expression)
        .filter((expression): expression is string => Boolean(expression));
      return {
        nodeId: node.id,
        order: index + 1,
        question,
        isConditional: edges.length > 0,
        conditions,
      };
    });
  }, [previewIncomingEdges, previewResolved.nodes, questionMap]);
  const previewFlowSummary = useMemo(
    () => previewMergedFlows.map((item) => item.label).join(" + "),
    [previewMergedFlows]
  );
  const hasCanvasGlobalFlow = useMemo(
    () => canvasMergedFlows.some((item) => item.flow.scope.level === "global"),
    [canvasMergedFlows]
  );
  const previewStats = useMemo(() => {
    const conditional = previewQuestions.filter((item) => item.isConditional)
      .length;
    return { total: previewQuestions.length, conditional };
  }, [previewQuestions]);
  const questionResolutionById = previewResolved.decisionByQuestionId;
  const canvasResolutionById = canvasResolved.decisionByQuestionId;
  const ghostCandidateEntries = useMemo(() => {
    if (!showCombinedFlow) {
      return [];
    }
    const entries: {
      node: FlowNode;
      questionId: string;
      flowLabel: string;
      flowLevel: FlowScope["level"];
      winnerNodeId: string;
    }[] = [];
    canvasMergedFlows.forEach(({ flow, label }) => {
      if (flow.scope.level !== "global") {
        return;
      }
      flow.nodes.forEach((node) => {
        const decision = canvasResolutionById.get(node.questionId);
        if (
          !decision ||
          decision.flowId === flow.id ||
          decision.isExcluded ||
          !decision.nodeId
        ) {
          return;
        }
        entries.push({
          node,
          questionId: node.questionId,
          flowLabel: label,
          flowLevel: flow.scope.level,
          winnerNodeId: decision.nodeId,
        });
      });
    });
    return entries;
  }, [canvasMergedFlows, canvasResolutionById, showCombinedFlow]);
  const ghostNodeEntries = useMemo(
    () => (showGlobalGhosts ? ghostCandidateEntries : []),
    [ghostCandidateEntries, showGlobalGhosts]
  );
  const hasGlobalGhostCandidates = ghostCandidateEntries.length > 0;
  const previewPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="space-y-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Preview stap 3
          </p>
          <span className="text-[11px] text-slate-400">
            {previewFlowSummary || "geen flow"}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Zo ziet de vragenlijst eruit voor deze selectie. Relaties kunnen vragen
          verbergen.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
            {previewStats.total} vragen
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
            {previewStats.conditional} voorwaardelijk
          </span>
        </div>
        {previewMissingFlowLabels.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Geen flow voor: {previewMissingFlowLabels.join(", ")}.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowNodeOrder((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {showNodeOrder ? "Nummers verbergen" : "Nummers tonen"}
          </button>
          <button
            type="button"
            onClick={() => setShowConditions((prev) => !prev)}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {showConditions ? "Voorwaarden verbergen" : "Voorwaarden tonen"}
          </button>
        </div>
        <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
          {previewQuestions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
              Nog geen vragen gevonden voor deze selectie.
            </div>
          ) : (
            previewQuestions.map((item) => {
              const kindLabel = item.question
                ? questionKindLabels[item.question.kind]
                : "Onbekend";
              return (
                <div
                  key={item.nodeId}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {showNodeOrder ? (
                        <span className="mt-0.5 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {item.order}
                        </span>
                      ) : null}
                      <div>
                        <p className="text-[12px] font-semibold text-slate-700">
                          {item.question?.prompt ?? item.nodeId}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.question?.conceptKey ?? item.nodeId}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {kindLabel}
                      </span>
                      {item.isConditional ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                          voorwaardelijk
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {showConditions && item.isConditional ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      Voorwaarde:{" "}
                      {item.conditions.length > 0
                        ? item.conditions.join(" | ")
                        : "geen specifieke regel"}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const canvasDefinition = useMemo(() => {
    const nodeEntries: {
      node: Flow["nodes"][number];
      questionId: string;
      flowId: string;
      flowLabel: string;
      flowLevel: FlowScope["level"];
      isLocked: boolean;
    }[] = [];
    const edgeEntries: {
      edge: Flow["edges"][number];
      isLocked: boolean;
    }[] = [];
    const nodeMetaById = new Map<
      string,
      {
        questionId: string;
        flowId: string;
        flowLabel: string;
        flowLevel: FlowScope["level"];
        isLocked: boolean;
      }
    >();
    const edgeMetaById = new Map<
      string,
      {
        flowId: string;
        flowLabel: string;
        flowLevel: FlowScope["level"];
        isLocked: boolean;
      }
    >();

    if (!showCombinedFlow) {
      if (!activeFlow) {
        return { nodeEntries, edgeEntries, nodeMetaById, edgeMetaById };
      }
      const flowLabel = activeSlot?.label ?? activeFlow.name;
      activeFlow.nodes.forEach((node) => {
        const entry = {
          node,
          questionId: node.questionId,
          flowId: activeFlow.id,
          flowLabel,
          flowLevel: activeFlow.scope.level,
          isLocked: false,
        };
        nodeEntries.push(entry);
        nodeMetaById.set(node.id, {
          questionId: node.questionId,
          flowId: activeFlow.id,
          flowLabel,
          flowLevel: activeFlow.scope.level,
          isLocked: false,
        });
      });
      activeFlow.edges.forEach((edge) => {
        edgeEntries.push({ edge, isLocked: false });
        edgeMetaById.set(edge.id, {
          flowId: activeFlow.id,
          flowLabel,
          flowLevel: activeFlow.scope.level,
          isLocked: false,
        });
      });
      return { nodeEntries, edgeEntries, nodeMetaById, edgeMetaById };
    }

    canvasResolved.nodes.forEach((node) => {
      const info = canvasResolved.nodeInfoById.get(node.id);
      if (!info) {
        return;
      }
      const isLocked = info.flowId !== activeFlow?.id;
      nodeEntries.push({
        node,
        questionId: info.questionId,
        flowId: info.flowId,
        flowLabel: info.label,
        flowLevel: info.level,
        isLocked,
      });
      nodeMetaById.set(node.id, {
        questionId: info.questionId,
        flowId: info.flowId,
        flowLabel: info.label,
        flowLevel: info.level,
        isLocked,
      });
    });
    canvasResolved.edges.forEach((edge) => {
      const info = canvasResolved.edgeInfoById.get(edge.id);
      if (!info) {
        return;
      }
      const isLocked = info.flowId !== activeFlow?.id;
      edgeEntries.push({ edge, isLocked });
      edgeMetaById.set(edge.id, {
        flowId: info.flowId,
        flowLabel: info.label,
        flowLevel: info.level,
        isLocked,
      });
    });
    return { nodeEntries, edgeEntries, nodeMetaById, edgeMetaById };
  }, [activeFlow, activeSlot?.label, canvasResolved, showCombinedFlow]);

  const conditionalNodeIds = useMemo(() => {
    const set = new Set<string>();
    canvasDefinition.edgeEntries.forEach((entry) => set.add(entry.edge.to));
    return set;
  }, [canvasDefinition.edgeEntries]);

  const activeNodeIds = useMemo(
    () => new Set(activeFlow?.nodes.map((node) => node.id) ?? []),
    [activeFlow?.nodes]
  );

  const canvasNodeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    canvasDefinition.nodeEntries.forEach((entry) => {
      map.set(
        entry.node.id,
        questionMap.get(entry.questionId)?.prompt ?? entry.questionId
      );
    });
    return map;
  }, [canvasDefinition.nodeEntries, questionMap]);

  useEffect(() => {
    if (!showCombinedFlow && !activeFlow?.id) {
      pendingFitRef.current = false;
      return;
    }
    pendingFitRef.current = true;
  }, [activeFlow?.id, showCombinedFlow]);

  useEffect(() => {
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
  }, [activeFlow?.id, showCombinedFlow]);

  useEffect(() => {
    if (canvasDefinition.nodeEntries.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nextNodes = canvasDefinition.nodeEntries.map((entry, index) => {
      const question = questionMap.get(entry.questionId);
      const isLocked = entry.isLocked;
      return {
        id: entry.node.id,
        position: entry.node.position ?? buildDefaultPosition(index),
        type: "questionNode",
        data: {
          label: question?.prompt ?? entry.questionId,
          conceptKey: question?.conceptKey ?? entry.questionId,
          questionId: entry.questionId,
          scopeLabel: entry.flowLabel,
          order: index + 1,
          showOrder: showNodeOrder,
          isSelected:
            entry.node.id === selectedNodeId ||
            entry.questionId === selectedQuestionId,
          isLocked,
          flags: {
            conditional: conditionalNodeIds.has(entry.node.id),
            duplicate: duplicatePromptIds.has(entry.questionId),
            missingOutputs: missingOutputIds.has(entry.questionId),
            orphan: orphanQuestionIds.has(entry.questionId),
          },
        },
        draggable: !isLocked,
        selectable: true,
        connectable: !isLocked,
        deletable: !isLocked,
      } satisfies Node<QuestionNodeData>;
    });

    const nodePositions = new Map(
      nextNodes.map((node) => [node.id, node.position])
    );
    const nodeSortKeys = new Map<
      string,
      { y: number; x: number; order: number }
    >();
    nextNodes.forEach((node, index) => {
      const position = nodePositions.get(node.id) ?? buildDefaultPosition(index);
      nodeSortKeys.set(node.id, {
        y: position.y,
        x: position.x,
        order: index,
      });
    });
    const getNodeSortKey = (nodeId: string) =>
      nodeSortKeys.get(nodeId) ?? { y: 0, x: 0, order: 0 };
    const edgeOffsets = new Map<string, number>();
    const edgesBySource = new Map<string, { id: string; to: string }[]>();
    canvasDefinition.edgeEntries.forEach((entry) => {
      if (!entry.edge.when?.expression) {
        return;
      }
      const list = edgesBySource.get(entry.edge.from) ?? [];
      list.push({ id: entry.edge.id, to: entry.edge.to });
      edgesBySource.set(entry.edge.from, list);
    });
    edgesBySource.forEach((edges) => {
      if (edges.length < 2) {
        return;
      }
      edges.sort((a, b) => {
        const aKey = getNodeSortKey(a.to);
        const bKey = getNodeSortKey(b.to);
        if (aKey.y !== bKey.y) {
          return aKey.y - bKey.y;
        }
        if (aKey.x !== bKey.x) {
          return aKey.x - bKey.x;
        }
        if (aKey.order !== bKey.order) {
          return aKey.order - bKey.order;
        }
        return a.id.localeCompare(b.id);
      });
      edges.forEach((edge, index) => {
        const offset = (edges.length - 1 - index) * 16;
        if (offset !== 0) {
          edgeOffsets.set(edge.id, offset);
        }
      });
    });
    const ghostOffsets = new Map<string, number>();
    const ghostNodes = ghostNodeEntries.map((entry, index) => {
      const basePosition =
        nodePositions.get(entry.winnerNodeId) ??
        entry.node.position ??
        buildDefaultPosition(index);
      const offsetIndex = ghostOffsets.get(entry.winnerNodeId) ?? 0;
      ghostOffsets.set(entry.winnerNodeId, offsetIndex + 1);
      const question = questionMap.get(entry.questionId);
      const ghostId = `ghost::${entry.node.id}`;
      return {
        id: ghostId,
        position: {
          x: basePosition.x - 200,
          y: basePosition.y + offsetIndex * 40,
        },
        type: "questionNode",
        data: {
          label: question?.prompt ?? entry.questionId,
          conceptKey: question?.conceptKey ?? entry.questionId,
          questionId: entry.questionId,
          scopeLabel: entry.flowLabel,
          showOrder: false,
          isSelected: false,
          isLocked: true,
          isGhost: true,
          flags: {
            conditional: false,
            duplicate: duplicatePromptIds.has(entry.questionId),
            missingOutputs: missingOutputIds.has(entry.questionId),
            orphan: orphanQuestionIds.has(entry.questionId),
          },
        },
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
      } satisfies Node<QuestionNodeData>;
    });

    const nextEdges = canvasDefinition.edgeEntries.map((entry) => {
      const strokeColor = entry.isLocked ? "#cbd5e1" : "#0f172a";
      const labelColor = entry.isLocked ? "#94a3b8" : "#475569";
      const expression = entry.edge.when?.expression;
      const showLabel =
        Boolean(expression) &&
        (showEdgeLabels || entry.edge.id === selectedEdgeId);
      const pathOffset = edgeOffsets.get(entry.edge.id);
      return {
        id: entry.edge.id,
        source: entry.edge.from,
        target: entry.edge.to,
        type: "smoothstep",
        label: showLabel ? expression : undefined,
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
        pathOptions:
          pathOffset != null ? { offset: pathOffset } : undefined,
        style: {
          stroke: strokeColor,
          strokeWidth: entry.isLocked ? 1 : 1.5,
          strokeDasharray: entry.isLocked ? "4 4" : undefined,
        },
        labelStyle: showLabel
          ? { fill: labelColor, fontSize: 10, fontWeight: 600 }
          : undefined,
        labelBgStyle: showLabel
          ? { fill: "#f8fafc", stroke: "#e2e8f0" }
          : undefined,
        labelBgPadding: showLabel ? ([6, 4] as [number, number]) : undefined,
        selectable: !entry.isLocked,
        deletable: !entry.isLocked,
      };
    });

    setNodes([...ghostNodes, ...nextNodes]);
    setEdges(nextEdges);
  }, [
    canvasDefinition,
    conditionalNodeIds,
    duplicatePromptIds,
    ghostNodeEntries,
    missingOutputIds,
    orphanQuestionIds,
    questionMap,
    selectedEdgeId,
    selectedNodeId,
    selectedQuestionId,
    showEdgeLabels,
    showNodeOrder,
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
  const excludedQuestionIds = useMemo(
    () => new Set(activeFlow?.excludedQuestionIds ?? []),
    [activeFlow?.excludedQuestionIds]
  );
  const canToggleExclusions =
    Boolean(activeSlot) && activeSlot.scope.level !== "global";
  const flowNodeCount = activeFlow?.nodes.length ?? 0;
  const flowEdgeCount = activeFlow?.edges.length ?? 0;
  const hasActiveFlow = Boolean(activeFlow);
  const hasFlowNodes = flowNodeCount > 0;
  const hasFlowEdges = flowEdgeCount > 0;
  const hasCanvasNodes = canvasDefinition.nodeEntries.length > 0;
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
  const selectedNodeMeta = selectedNodeId
    ? canvasDefinition.nodeMetaById.get(selectedNodeId) ?? null
    : null;
  const selectedNodeIsLocked = Boolean(selectedNodeMeta?.isLocked);
  const selectedQuestionResolution = selectedQuestion
    ? questionResolutionById.get(selectedQuestion.id) ?? null
    : null;
  const selectedQuestionIsLocked =
    selectedQuestionResolution !== null &&
    selectedQuestionResolution.flowId !== activeFlow?.id &&
    !selectedQuestionResolution.isExcluded;
  const canDeleteSelection =
    Boolean(selectedEdgeId) || (Boolean(selectedNodeId) && !selectedNodeIsLocked);

  useEffect(() => {
    if (!selectedNodeId || selectedNodeIsLocked) {
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
  }, [selectedNodeId, selectedNodeIsLocked]);

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

  const requestDeleteQuestion = (questionId: string) => {
    setConfirmState({
      title: "Vraag verwijderen",
      message: "Deze vraag verwijderen? Dit kan niet ongedaan worden gemaakt.",
      tone: "error",
      confirmLabel: "Verwijderen",
      onConfirm: () => {
        setConfirmState(null);
        removeQuestion(questionId);
      },
    });
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
      excludedQuestionIds: [],
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
        excludedQuestionIds: [],
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
        const nextExcludedQuestionIds = (flow.excludedQuestionIds ?? []).filter(
          (excludedId) => excludedId !== questionId
        );
        return {
          ...flow,
          nodes: [
            ...flow.nodes,
            { id: nextNodeId, questionId, position: nextPosition },
          ],
          excludedQuestionIds: nextExcludedQuestionIds,
        };
      }),
    }));
  };

  const removeNodeFromFlow = useCallback(
    (flowId: string, nodeId: string) => {
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
  }, [selectedNodeId]);

  const toggleExclusionForActiveScope = (questionId: string) => {
    if (!activeSlot || activeSlot.scope.level === "global") {
      return;
    }
    if (!activeFlow) {
      setLibrary((prev) => {
        const existingIds = prev.flows.map((flow) => flow.id);
        const base = slugify(
          `flow-${activeSlot.scope.level}-${activeSlot.label}`
        );
        const nextFlowId = uniqueId(base, existingIds);
        const nextFlow: Flow = {
          id: nextFlowId,
          name: activeSlot.label,
          scope: activeSlot.scope,
          nodes: [],
          edges: [],
          excludedQuestionIds: [questionId],
        };
        return {
          ...prev,
          flows: [...prev.flows, nextFlow],
        };
      });
      return;
    }
    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        if (flow.id !== activeFlow.id) {
          return flow;
        }
        const nextExcluded = new Set(flow.excludedQuestionIds ?? []);
        const wasExcluded = nextExcluded.has(questionId);
        if (wasExcluded) {
          nextExcluded.delete(questionId);
        } else {
          nextExcluded.add(questionId);
        }
        let nodes = flow.nodes;
        let edges = flow.edges;
        if (!wasExcluded) {
          const remainingNodes = flow.nodes.filter(
            (node) => node.questionId !== questionId
          );
          if (remainingNodes.length !== flow.nodes.length) {
            const nodeIds = new Set(remainingNodes.map((node) => node.id));
            nodes = remainingNodes;
            edges = flow.edges.filter(
              (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
            );
          }
        }
        return {
          ...flow,
          nodes,
          edges,
          excludedQuestionIds: Array.from(nextExcluded),
        };
      }),
    }));
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

  const removeEdge = useCallback((flowId: string, edgeId: string) => {
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
  }, [selectedEdgeId]);

  const handleSave = () => {
    setIsSaving(true);
    saveQuestionLibrary(library);
    lastSavedRef.current = library;
    lastManualSaveRef.current = library;
    setSaveStatus("saved");
    setIsDirty(false);
    setIsSaving(false);
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

  const handleOverwriteDefault = async (note?: string) => {
    try {
      setIsSavingTemplate(true);
      const revisionNote = note?.trim();
      const requestPayload = {
        ...library,
        wizardConfig: config,
        ...(revisionNote ? { revisionNote } : {}),
      };
      const response = await fetch("/api/question-library-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
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

    const firstCategory = nextConfig.categories[0]?.id ?? "";
    const firstContext = firstCategory
      ? nextConfig.contextsByCategory[firstCategory]?.[0]?.id ?? ""
      : "";
    const firstInstallation = firstContext
      ? nextConfig.installationsByContext[firstContext]?.[0] ?? ""
      : "";

    saveWizardConfig(nextConfig);
    saveQuestionLibrary(nextLibrary);
    setConfig(nextConfig);
    isRestoringRef.current = true;
    historyRef.current = { past: [], future: [] };
    setCanUndo(false);
    setCanRedo(false);
    lastLibraryRef.current = nextLibrary;
    lastSavedRef.current = nextLibrary;
    lastManualSaveRef.current = nextLibrary;
    setLibrary(nextLibrary);
    setSaveStatus("saved");
    setIsDirty(false);
    setSelectedQuestionId(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setEdgeDraft({ from: "", to: "", expression: "" });
    setSearch("");
    setActiveScopeIndex(0);
    setScope({
      categoryId: firstCategory,
      contextId: firstContext,
      installationId: firstInstallation,
    });
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
          notify("Import mislukt: geen geldige bibliotheek gevonden.", {
            tone: "error",
            title: "Import mislukt",
          });
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
        notify("Import mislukt: bestand is geen geldige JSON.", {
          tone: "error",
          title: "Import mislukt",
        });
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
    if (!activeFlow || connection.source == null || connection.target == null) {
      return;
    }
    const { source, target } = connection;
    if (source === target) {
      return;
    }
    if (!activeNodeIds.has(source) || !activeNodeIds.has(target)) {
      return;
    }
    const nextEdgeId = uniqueId(
      "edge",
      activeFlow.edges.map((edge) => edge.id)
    );
    const nextEdge: FlowEdge = {
      id: nextEdgeId,
      from: source,
      to: target,
    };
    addEdgeToFlow(activeFlow.id, nextEdge);
    setEdges((current) =>
      addEdge(
        {
          id: nextEdgeId,
          source,
          target,
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
  }, [activeFlow, activeNodeIds]);

  const handleNodeDragStop = useCallback((_event: unknown, node: Node) => {
    if (!activeFlow || !node?.id) {
      return;
    }
    if (!activeNodeIds.has(node.id)) {
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
  }, [activeFlow, activeNodeIds]);

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

  const handleAutoLayout = useCallback(() => {
    const layoutEntries = showCombinedFlow
      ? canvasDefinition.nodeEntries.map((entry, index) => ({
          id: entry.node.id,
          flowId: entry.flowId,
          order: index,
        }))
      : activeFlow
      ? activeFlow.nodes.map((node, index) => ({
          id: node.id,
          flowId: activeFlow.id,
          order: index,
        }))
      : [];

    if (layoutEntries.length === 0) {
      return;
    }

    const layoutEdges = showCombinedFlow
      ? canvasDefinition.edgeEntries.map((entry) => entry.edge)
      : activeFlow?.edges ?? [];

    const nodeOrder = new Map<string, number>();
    layoutEntries.forEach((entry) => {
      nodeOrder.set(entry.id, entry.order);
    });

    const nodeIds = new Set(layoutEntries.map((entry) => entry.id));
    const outgoingEdgesBySource = new Map<
      string,
      { id: string; to: string; isConditional: boolean }[]
    >();
    layoutEdges.forEach((edge) => {
      if (
        !nodeIds.has(edge.from) ||
        !nodeIds.has(edge.to) ||
        edge.from === edge.to
      ) {
        return;
      }
      const list = outgoingEdgesBySource.get(edge.from) ?? [];
      list.push({
        id: edge.id,
        to: edge.to,
        isConditional: Boolean(edge.when?.expression),
      });
      outgoingEdgesBySource.set(edge.from, list);
    });
    const nodeXOffsets = new Map<string, number>();
    outgoingEdgesBySource.forEach((edges) => {
      const conditionalEdges = edges.filter((edge) => edge.isConditional);
      if (conditionalEdges.length < 2) {
        return;
      }
      conditionalEdges.sort((a, b) => {
        const order =
          (nodeOrder.get(a.to) ?? 0) - (nodeOrder.get(b.to) ?? 0);
        if (order !== 0) {
          return order;
        }
        return a.id.localeCompare(b.id);
      });
      const maxOffset = (conditionalEdges.length - 1) * 120;
      conditionalEdges.forEach((edge, index) => {
        const offset = maxOffset - index * 120;
        if (offset === 0) {
          return;
        }
        const current = nodeXOffsets.get(edge.to) ?? 0;
        if (Math.abs(offset) > Math.abs(current)) {
          nodeXOffsets.set(edge.to, offset);
        }
      });
    });
    const incoming = new Map<string, Set<string>>();
    const outgoing = new Map<string, Set<string>>();
    const incomingEdges = new Map<
      string,
      { from: string; isConditional: boolean }[]
    >();
    layoutEntries.forEach((entry) => {
      incoming.set(entry.id, new Set());
      outgoing.set(entry.id, new Set());
      incomingEdges.set(entry.id, []);
    });
    layoutEdges.forEach((edge) => {
      if (
        !nodeIds.has(edge.from) ||
        !nodeIds.has(edge.to) ||
        edge.from === edge.to
      ) {
        return;
      }
      incoming.get(edge.to)?.add(edge.from);
      outgoing.get(edge.from)?.add(edge.to);
      incomingEdges.get(edge.to)?.push({
        from: edge.from,
        isConditional: Boolean(edge.when?.expression),
      });
    });

    const incomingCount = new Map<string, number>();
    layoutEntries.forEach((entry) => {
      incomingCount.set(entry.id, incoming.get(entry.id)?.size ?? 0);
    });
    const queue = layoutEntries
      .filter((entry) => (incomingCount.get(entry.id) ?? 0) === 0)
      .map((entry) => entry.id)
      .sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0));
    const topoOrder: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      topoOrder.push(current);
      const nextTargets = outgoing.get(current) ?? new Set<string>();
      nextTargets.forEach((target) => {
        const nextCount = (incomingCount.get(target) ?? 0) - 1;
        incomingCount.set(target, nextCount);
        if (nextCount === 0) {
          queue.push(target);
        }
      });
      queue.sort(
        (a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0)
      );
    }

    layoutEntries
      .map((entry) => entry.id)
      .filter((id) => !topoOrder.includes(id))
      .sort((a, b) => (nodeOrder.get(a) ?? 0) - (nodeOrder.get(b) ?? 0))
      .forEach((id) => topoOrder.push(id));

    const columns = new Map<string, number>();
    topoOrder.forEach((nodeId) => {
      const parents = incomingEdges.get(nodeId) ?? [];
      let column = 0;
      parents.forEach(({ from, isConditional }) => {
        const parentColumn = columns.get(from) ?? 0;
        const candidate = parentColumn + (isConditional ? 1 : 0);
        column = Math.max(column, candidate);
      });
      columns.set(nodeId, column);
    });

    const hasConditionalEdges = layoutEdges.some(
      (edge) => edge.when?.expression
    );
    const columnSpacing = 280;
    const rowSpacing = hasConditionalEdges ? 200 : 180;
    const marginX = 80;
    const marginY = 80;
    const nextPositions = new Map<string, { x: number; y: number }>();
    layoutEntries.forEach((entry) => {
      const order = nodeOrder.get(entry.id) ?? 0;
      const column = columns.get(entry.id) ?? 0;
      const offset = nodeXOffsets.get(entry.id) ?? 0;
      nextPositions.set(entry.id, {
        x: marginX + column * columnSpacing + offset,
        y: marginY + order * rowSpacing,
      });
    });

    const positionsByFlowId = new Map<
      string,
      Map<string, { x: number; y: number }>
    >();
    layoutEntries.forEach((entry) => {
      const position = nextPositions.get(entry.id);
      if (!position) {
        return;
      }
      const flowPositions =
        positionsByFlowId.get(entry.flowId) ??
        new Map<string, { x: number; y: number }>();
      const prefix = `${entry.flowId}::`;
      const sourceId = entry.id.startsWith(prefix)
        ? entry.id.slice(prefix.length)
        : entry.id;
      flowPositions.set(sourceId, position);
      positionsByFlowId.set(entry.flowId, flowPositions);
    });

    setLibrary((prev) => ({
      ...prev,
      flows: prev.flows.map((flow) => {
        const positions = positionsByFlowId.get(flow.id);
        if (!positions) {
          return flow;
        }
        return {
          ...flow,
          nodes: flow.nodes.map((node) =>
            positions.has(node.id)
              ? { ...node, position: positions.get(node.id) }
              : node
          ),
        };
      }),
    }));
    pendingFitRef.current = true;
  }, [activeFlow, canvasDefinition, showCombinedFlow]);

  const handleToggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {
        notify("Fullscreen verlaten mislukt.", {
          tone: "warning",
          title: "Fullscreen",
        });
      });
      return;
    }
    const target = fullscreenContainerRef.current;
    if (!target?.requestFullscreen) {
      notify("Fullscreen wordt niet ondersteund door je browser.", {
        tone: "warning",
        title: "Fullscreen",
      });
      return;
    }
    target.requestFullscreen().catch(() => {
      notify("Fullscreen starten mislukt.", {
        tone: "warning",
        title: "Fullscreen",
      });
    });
  }, [notify]);

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
    if (selectedNodeId && !selectedNodeIsLocked) {
      removeNodeFromFlow(activeFlow.id, selectedNodeId);
    }
  }, [
    activeFlow,
    removeEdge,
    removeNodeFromFlow,
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIsLocked,
  ]);

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
        if (canDeleteSelection) {
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
    [canDeleteSelection, handleDeleteSelection, handleRedo, handleUndo]
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
      if (selectedNode) {
        const meta = canvasDefinition.nodeMetaById.get(selectedNode.id);
        setSelectedNodeId(selectedNode.id);
        setSelectedQuestionId(meta?.questionId ?? null);
        setSelectedEdgeId(null);
        if (isCanvasExpanded && showPreview) {
          setShowPreview(false);
          setAutoHiddenPreview(true);
        }
        return;
      }
      if (selectedEdge) {
        const meta = canvasDefinition.edgeMetaById.get(selectedEdge.id);
        if (meta?.isLocked) {
          setSelectedNodeId(null);
          setSelectedQuestionId(null);
          setSelectedEdgeId(null);
          return;
        }
        setSelectedEdgeId(selectedEdge.id);
        setSelectedNodeId(null);
        setSelectedQuestionId(null);
        return;
      }
    },
    [
      canvasDefinition.edgeMetaById,
      canvasDefinition.nodeMetaById,
      isCanvasExpanded,
      showPreview,
    ]
  );

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      const meta = canvasDefinition.nodeMetaById.get(node.id);
      if (!meta) {
        return;
      }
      setSelectedNodeId(node.id);
      setSelectedQuestionId(meta.questionId);
      setSelectedEdgeId(null);
      setShowInspector(true);
      if (isCanvasExpanded && showPreview) {
        setShowPreview(false);
        setAutoHiddenPreview(true);
      }
    },
    [canvasDefinition.nodeMetaById, isCanvasExpanded, showPreview]
  );

  const handleEdgeClick = useCallback(
    (_event: unknown, edge: Edge) => {
      const meta = canvasDefinition.edgeMetaById.get(edge.id);
      if (meta?.isLocked) {
        return;
      }
      setSelectedEdgeId(edge.id);
      setSelectedNodeId(null);
      setSelectedQuestionId(null);
    },
    [canvasDefinition.edgeMetaById]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedQuestionId(null);
    setSelectedEdgeId(null);
    if (autoHiddenPreview) {
      setShowPreview(true);
      setAutoHiddenPreview(false);
    }
  }, [autoHiddenPreview]);

  const handleTogglePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
    setAutoHiddenPreview(false);
  }, []);

  const handleSelectQuestion = useCallback(
    (questionId: string) => {
      if (questionId === selectedQuestionId) {
        setSelectedQuestionId(null);
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        return;
      }
      setSelectedQuestionId(questionId);
      setSelectedEdgeId(null);
      const flowNodeId =
        canvasDefinition.nodeEntries.find(
          (entry) => entry.questionId === questionId
        )?.node.id ?? null;
      setSelectedNodeId(flowNodeId);
    },
    [canvasDefinition.nodeEntries, selectedQuestionId]
  );

  const libraryItems = filteredQuestions.map((question) => {
    const isSelected = question.id === selectedQuestionId;
    const isInFlow = flowQuestionIds.has(question.id);
    const isExcluded = excludedQuestionIds.has(question.id);
    const resolution = questionResolutionById.get(question.id);
    const isExcludedInCombined = Boolean(resolution?.isExcluded);
    const isActiveViaOtherFlow =
      resolution &&
      !resolution.isExcluded &&
      resolution.flowId !== activeFlow?.id;
    const addLabel = isActiveViaOtherFlow ? "ontgrendelen" : "+ toevoegen";
    const canDelete = (usageMap.get(question.id) ?? 0) === 0;
    return (
      <div
        key={question.id}
        className={`relative rounded-2xl border px-3 py-2 text-xs transition ${
          isSelected
            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            requestDeleteQuestion(question.id);
          }}
          disabled={!canDelete}
          title={
            canDelete
              ? "Vraag verwijderen"
              : "Vraag is gekoppeld aan een flow"
          }
          aria-label="Vraag verwijderen"
          className="absolute right-2 top-2 z-10 rounded-full border border-rose-200 bg-rose-50 p-1 text-rose-600 shadow-sm transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="h-3 w-3" aria-hidden="true">
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
          onClick={() => handleSelectQuestion(question.id)}
          className="w-full text-left pr-6"
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
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isInFlow
                ? "bg-emerald-100 text-emerald-700"
                : isActiveViaOtherFlow
                ? "bg-sky-100 text-sky-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isInFlow
              ? "in flow"
              : isActiveViaOtherFlow
              ? `actief via ${resolution?.label ?? "basis"}`
              : "niet gekoppeld"}
          </span>
          {isExcludedInCombined ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              uitgesloten
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => handleAddToActiveFlow(question.id)}
            disabled={!activeSlot || isInFlow}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            {addLabel}
          </button>
          <button
            type="button"
            onClick={() => toggleExclusionForActiveScope(question.id)}
            disabled={!canToggleExclusions}
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition ${
              isExcluded
                ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {isExcluded ? "toon hier" : "uitsluiten"}
          </button>
        </div>
      </div>
    );
  });

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
    ? canvasNodeLabelMap.get(selectedNodeId) ?? selectedNodeId
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

  const renderInspectorPanel = () => (
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
                {selectedQuestionResolution ? (
                  <p className="text-xs text-slate-500">
                    {selectedQuestionResolution.isExcluded
                      ? `Uitgesloten in ${selectedQuestionResolution.label}.`
                      : selectedQuestionIsLocked
                      ? `Actief via ${selectedQuestionResolution.label} (op slot).`
                      : "Actief in deze scope."}
                  </p>
                ) : null}
                {activeFlow ? (
                  flowQuestionIds.has(selectedQuestion.id) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const nodeId = activeFlow.nodes.find(
                          (node) => node.questionId === selectedQuestion.id
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
                      onClick={() => handleAddToActiveFlow(selectedQuestion.id)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {selectedQuestionIsLocked
                        ? "Ontgrendelen voor deze scope"
                        : "Toevoegen aan flow"}
                    </button>
                  )
                ) : null}
                {canToggleExclusions ? (
                  <button
                    type="button"
                    onClick={() =>
                      toggleExclusionForActiveScope(selectedQuestion.id)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      excludedQuestionIds.has(selectedQuestion.id)
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {excludedQuestionIds.has(selectedQuestion.id)
                      ? "Toon in deze scope"
                      : "Uitsluiten voor deze scope"}
                  </button>
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
                ) : (
                  <p className="text-sm text-slate-500">
                    Deze vraag heeft geen opties. Kies type Single choice of
                    Multi choice.
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
                  onChange={(next) => updateOutputs(selectedQuestion, next)}
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
              <p className="text-sm text-slate-500">Flow: {activeFlow.name}</p>
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
                    {questionMap.get(node.questionId)?.prompt ?? node.questionId}
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
                    {questionMap.get(node.questionId)?.prompt ?? node.questionId}
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
            Klik op een vraag of relatie om details te bewerken. Sleep vragen om
            te verplaatsen.
          </p>
        )}

        {activeFlow ? (
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Relatie maken
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              Relatie bepaalt volgorde: na het beantwoorden van de
              &quot;van vraag&quot; wordt de &quot;naar vraag&quot; zichtbaar. Laat
              voorwaarde leeg om altijd door te gaan. Je kan ook verbinden door
              het punt van een vraag te slepen. Tip: klik twee vragen om
              &quot;van&quot; en &quot;naar&quot; te vullen.
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
                    {selectedNodeIsLocked ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                        Op slot: ontgrendel om relaties te maken.
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setEdgeDraft((prev) => ({
                          ...prev,
                          from: selectedNodeId,
                        }))
                      }
                      disabled={selectedNodeIsLocked}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                      disabled={selectedNodeIsLocked}
                      className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Gebruik als eind
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Klik een vraag om snel van/naar te vullen.
                  </p>
                )}
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                  Van vraag
                  <select
                    value={edgeDraft.from}
                    onChange={(event) =>
                      setEdgeDraft((prev) => ({
                        ...prev,
                        from: event.target.value,
                      }))
                    }
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">{edgeFromLabel}</option>
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
                    value={edgeDraft.to}
                    onChange={(event) =>
                      setEdgeDraft((prev) => ({
                        ...prev,
                        to: event.target.value,
                      }))
                    }
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">{edgeToLabel}</option>
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
                    value={edgeDraft.expression}
                    onChange={(event) =>
                      setEdgeDraft((prev) => ({
                        ...prev,
                        expression: event.target.value,
                      }))
                    }
                    placeholder="bijv. en1090.required == true"
                    className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleCreateEdgeFromDraft}
                  disabled={!canCreateEdge}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Relatie toevoegen
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      ref={fullscreenContainerRef}
      className={`min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 ${
        isFullscreen ? "py-6" : "py-16"
      } text-slate-900`}
    >
      <main
        className={`mx-auto flex w-full flex-col gap-8 ${
          isCanvasExpanded ? "max-w-none" : "max-w-7xl"
        }`}
      >
        <header
          className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${
            isCanvasExpanded ? "hidden" : ""
          }`}
        >
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Wizard setup
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Vraagdiagram & bibliotheek
            </h1>
            <p className="text-base text-slate-600">
              Bekijk relaties als een netwerk en pas de flow direct aan.
            </p>
          </div>
          <div className="flex flex-wrap">
            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => router.push("/wizard/question-map")}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                Lijstweergave
              </button>
              <button
                type="button"
                aria-current="page"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Visuele map
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-6">
            <div
              className={`rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm ${
                isCanvasExpanded ? "hidden" : ""
              }`}
            >
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
                className={`space-y-3 lg:col-span-2 ${
                  isCanvasExpanded ? "lg:hidden" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Vraagbibliotheek
                  </h2>
                </div>
                <div className="space-y-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Zoek op vraag, key, tag"
                    className="h-9 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                  <button
                    type="button"
                    onClick={createQuestion}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="text-sm leading-none">+</span>
                    <span className="whitespace-nowrap">Nieuwe vraag</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {libraryItems}
                </div>
              </div>

              <div
                className={`space-y-4 ${
                  isCanvasExpanded ? "lg:col-span-12" : "lg:col-span-7"
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
                      {canToggleExclusions && excludedQuestionIds.size > 0 ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                          Uitsluitingen: {excludedQuestionIds.size}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {hasActiveFlow ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <button
                        type="button"
                        onClick={() => setShowNodeOrder((prev) => !prev)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {showNodeOrder ? "Nummers verbergen" : "Nummers tonen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEdgeLabels((prev) => !prev)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {showEdgeLabels
                          ? "Voorwaarden verbergen"
                          : "Voorwaarden tonen"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCombinedFlow((prev) => !prev)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        {showCombinedFlow
                          ? "Alleen deze scope"
                          : "Toon basis + scope"}
                      </button>
                      {showCombinedFlow &&
                      hasCanvasGlobalFlow &&
                      hasGlobalGhostCandidates ? (
                        <button
                          type="button"
                          onClick={() => setShowGlobalGhosts((prev) => !prev)}
                          aria-pressed={showGlobalGhosts}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          {showGlobalGhosts
                            ? "Global schaduw verbergen"
                            : "Global schaduw tonen"}
                        </button>
                      ) : null}
                      <span className="text-[10px] text-slate-400">
                        {showCombinedFlow
                          ? "Basis (global + bovenliggende scopes) staat op slot."
                          : "Nummers tonen de volgorde van deze flow."}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div
                  className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm ${
                    isCanvasExpanded ? "hidden" : ""
                  }`}
                >
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
                      <p>
                        Global is de basis voor iedereen. Categorie, context en
                        opstelling voegen extra vragen toe voor deze selectie.
                        Gebruik &quot;Uitsluiten&quot; om globale vragen te verbergen of
                        &quot;Ontgrendelen&quot; om ze lokaal te bewerken.
                      </p>
                      <ul className="space-y-1">
                        <li>Voeg vragen toe met &quot;+ toevoegen&quot; links.</li>
                        <li>
                          Sleep vragen om te verplaatsen; sleep lege ruimte om te
                          schuiven.
                        </li>
                        <li>Zoom met het muiswiel of met de knoppen.</li>
                        <li>
                          Maak een relatie: sleep van het punt of gebruik
                          &quot;Relatie maken&quot;.
                        </li>
                        <li>
                          Uitsluiten of ontgrendelen: selecteer een vraag en
                          kies de juiste actie voor deze scope.
                        </li>
                        <li>Verwijderen: selecteer en druk op Delete.</li>
                        <li>Ongedaan: Ctrl+Z, opnieuw: Ctrl+Y.</li>
                      </ul>
                      <p>
                        Relatie betekent: na het beantwoorden van de &quot;van vraag&quot;
                        wordt de &quot;naar vraag&quot; zichtbaar. Voorwaarde is
                        optioneel; zonder relaties is alles zichtbaar in de
                        flow-volgorde (nummers zijn alleen visueel).
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
                            disabled={!canDeleteSelection}
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
                            onClick={handleAutoLayout}
                            disabled={!activeFlow || activeFlow.nodes.length === 0}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                            title="Automatische layout"
                          >
                            Auto layout
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
                          {isCanvasExpanded ? (
                            <button
                              type="button"
                              onClick={() =>
                                setShowLibraryOverlay((prev) => !prev)
                              }
                              className={`hidden rounded-full border px-3 py-1 text-[11px] font-semibold transition lg:inline-flex ${
                                showLibraryOverlay
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              title="Vraagbibliotheek"
                            >
                              {showLibraryOverlay
                                ? "Bibliotheek sluiten"
                                : "Bibliotheek"}
                            </button>
                          ) : null}
                          {isCanvasExpanded ? (
                            <button
                              type="button"
                              onClick={handleTogglePreview}
                              className={`hidden rounded-full border px-3 py-1 text-[11px] font-semibold transition lg:inline-flex ${
                                showPreview
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              title="Preview stap 3"
                            >
                              {showPreview ? "Preview sluiten" : "Preview"}
                            </button>
                          ) : null}
                          {isCanvasExpanded ? (
                            <button
                              type="button"
                              onClick={() => setShowInspector((prev) => !prev)}
                              className={`hidden rounded-full border px-3 py-1 text-[11px] font-semibold transition lg:inline-flex ${
                                showInspector
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              title="Inspector"
                            >
                              {showInspector ? "Inspector sluiten" : "Inspector"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleToggleFullscreen}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            title="Volledig scherm aan of uit"
                          >
                            {isFullscreen ? "Scherm normaal" : "Volledig scherm"}
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
                          isCanvasExpanded
                            ? "h-[calc(100vh-280px)]"
                            : "h-[560px]"
                        }`}
                      >
                        <div
                          className={`h-full ${
                            isCanvasExpanded && (showPreview || showInspector)
                              ? "pr-[22rem]"
                              : ""
                          } ${
                            isCanvasExpanded && showLibraryOverlay
                              ? "pl-[19rem]"
                              : ""
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
                                node.selected || node.data?.isSelected
                                  ? "#0f172a"
                                  : "#cbd5e1"
                              }
                              maskColor="rgba(226,232,240,0.6)"
                            />
                            <Controls
                              position="bottom-left"
                              showInteractive={false}
                            />
                          </ReactFlow>
                        </div>
                        {isCanvasExpanded ? (
                          <div className="pointer-events-none absolute right-4 top-4 bottom-4 z-20 flex w-80 min-h-0 flex-col gap-3">
                            <div className="pointer-events-auto w-full rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                Scope selectie
                              </p>
                              <div className="mt-2 space-y-2">
                                <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
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
                                        ? config.installationsByContext[nextContext] ??
                                          []
                                        : [];
                                      setScope({
                                        categoryId: nextCategory,
                                        contextId: nextContext,
                                        installationId: nextInstallations[0] ?? "",
                                      });
                                    }}
                                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                  >
                                    <option value="">Geen</option>
                                    {config.categories.map((category) => (
                                      <option key={category.id} value={category.id}>
                                        {category.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
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
                                        config.installationsByContext[nextContext] ??
                                        [];
                                      setScope((prev) => ({
                                        ...prev,
                                        contextId: nextContext,
                                        installationId: nextInstallations[0] ?? "",
                                      }));
                                    }}
                                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
                                <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-600">
                                  Opstelling
                                  <select
                                    value={scope.installationId}
                                    onChange={(event) =>
                                      setScope((prev) => ({
                                        ...prev,
                                        installationId: event.target.value,
                                      }))
                                    }
                                    className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                    disabled={!scope.contextId}
                                  >
                                    <option value="">Geen</option>
                                    {installationsForContext.map((installation) => (
                                      <option key={installation} value={installation}>
                                        {config.installationLabels[installation] ??
                                          installation}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <p className="mt-2 text-[11px] text-slate-500">
                                Actief: {activeSlot?.label ?? "Onbekend"}
                              </p>
                            </div>
                            {showPreview ? (
                              <div className="pointer-events-auto">
                                {previewPanel}
                              </div>
                            ) : null}
                            {showInspector ? (
                              <div className="pointer-events-auto flex min-h-0 flex-1 flex-col gap-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                  Inspector
                                </p>
                                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                  {renderInspectorPanel()}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {isCanvasExpanded && showLibraryOverlay ? (
                          <div className="pointer-events-auto absolute left-4 top-4 bottom-4 z-20 hidden w-72 flex-col rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur lg:flex">
                            <div className="flex h-full flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Vraagbibliotheek
                                </h2>
                                <button
                                  type="button"
                                  onClick={() => setShowLibraryOverlay(false)}
                                  className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                                >
                                  Sluiten
                                </button>
                              </div>
                              <div className="space-y-2">
                                <input
                                  value={search}
                                  onChange={(event) =>
                                    setSearch(event.target.value)
                                  }
                                  placeholder="Zoek op vraag, key, tag"
                                  className="h-9 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={createQuestion}
                                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                                >
                                  <span className="text-sm leading-none">+</span>
                                  <span className="whitespace-nowrap">Nieuwe vraag</span>
                                </button>
                              </div>
                            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                              {libraryItems}
                            </div>
                          </div>
                        </div>
                      ) : null}
                        {hasActiveFlow && !hasFlowNodes && !hasCanvasNodes ? (
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
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Live preview
                  </h2>
                  <button
                    type="button"
                    onClick={handleTogglePreview}
                    className="text-[10px] font-semibold text-slate-500"
                  >
                    {showPreview ? "verberg" : "toon"}
                  </button>
                </div>
                {showPreview ? previewPanel : null}
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Inspector
                </h2>
                {renderInspectorPanel()}
              </div>
            </div>
          </div>
        </section>

        <TemplateRevisionsPanel
          onRestore={handleRestoreRevision}
          onNotify={notify}
          onCreateRevision={handleOverwriteDefault}
          isCreatingRevision={isSavingTemplate}
          createLabel="Template revisie aanmaken"
        />

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
                onClick={() => importInputRef.current?.click()}
              >
                Template importeren
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
      <CenteredPopup
        popup={confirmState ?? popup}
        onClose={() => {
          if (confirmState) {
            setConfirmState(null);
            return;
          }
          close();
        }}
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
                className="h-10 rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmLabel}
              </button>
            </>
          ) : null
        }
      />
    </div>
  );
}
