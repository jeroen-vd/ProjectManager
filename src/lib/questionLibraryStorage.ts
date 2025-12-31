import {
  defaultQuestionLibrary,
  type QuestionLibrary,
} from "../config/questionLibrary.default";

const STORAGE_KEY = "questionLibrary";
const SAFE_MODE_PARAM = "safe";

const isSafeMode = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(SAFE_MODE_PARAM) === "1";
};

const normalizeLibrary = (raw: QuestionLibrary | null): QuestionLibrary => {
  if (!raw) {
    return defaultQuestionLibrary;
  }

  const questions =
    Array.isArray(raw.questions) && raw.questions.length > 0
      ? raw.questions
      : defaultQuestionLibrary.questions;
  const questionIds = new Set(questions.map((question) => question.id));

  const rawFlows =
    Array.isArray(raw.flows) && raw.flows.length > 0
      ? raw.flows
      : defaultQuestionLibrary.flows;

  const normalizedFlows = rawFlows.map((flow) => {
    const nodes = Array.isArray(flow.nodes)
      ? flow.nodes.filter((node) => questionIds.has(node.questionId))
      : [];
    const nodeIds = new Set(nodes.map((node) => node.id));
    const edges = Array.isArray(flow.edges)
      ? flow.edges.filter(
          (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)
        )
      : [];
    return {
      ...flow,
      scope: flow.scope ?? { level: "global" },
      nodes,
      edges,
    };
  });

  const hasGlobal = normalizedFlows.some(
    (flow) => flow.scope?.level === "global"
  );

  return {
    questions,
    flows: hasGlobal
      ? normalizedFlows
      : [defaultQuestionLibrary.flows[0], ...normalizedFlows],
  };
};

export function loadQuestionLibrary(): QuestionLibrary {
  if (typeof window === "undefined") {
    return defaultQuestionLibrary;
  }
  if (isSafeMode()) {
    return defaultQuestionLibrary;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultQuestionLibrary;
    }
    return normalizeLibrary(JSON.parse(raw) as QuestionLibrary);
  } catch {
    return defaultQuestionLibrary;
  }
}

export function saveQuestionLibrary(library: QuestionLibrary) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function resetQuestionLibrary() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
