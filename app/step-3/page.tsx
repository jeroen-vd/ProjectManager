"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWizard } from "../wizard/WizardContext";
import WizardStepIndicator from "../wizard/WizardStepIndicator";
import { loadWizardConfig } from "../../src/lib/wizardConfigStorage";
import { loadQuestionLibrary } from "../../src/lib/questionLibraryStorage";
import { type WizardConfig } from "../../src/config/wizardConfig.default";
import {
  type Flow,
  type FlowScope,
  type Question,
  type QuestionLibrary,
} from "../../src/config/questionLibrary.default";

type AnswerValue = string | string[] | boolean | number | null;

type FlowQuestion = {
  nodeId: string;
  question: Question;
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

const expressionAliases: Record<string, string> = {
  finishes: "finish.method",
};

const parseLiteral = (raw: string): AnswerValue => {
  const cleaned = raw.trim();
  if (!cleaned) {
    return null;
  }
  if (cleaned === "true") {
    return true;
  }
  if (cleaned === "false") {
    return false;
  }
  const quotedMatch = cleaned.match(/^['"](.*)['"]$/);
  if (quotedMatch) {
    return quotedMatch[1];
  }
  const numberValue = Number(cleaned);
  if (!Number.isNaN(numberValue)) {
    return numberValue;
  }
  return cleaned;
};

const resolveAnswerKey = (key: string) => expressionAliases[key] ?? key;

const evaluateExpression = (
  expression: string | undefined,
  answers: Record<string, AnswerValue>
) => {
  if (!expression || !expression.trim()) {
    return true;
  }

  const orParts = expression.split(/\s+or\s+/i).map((part) => part.trim());

  const evaluateAtom = (atom: string) => {
    const containsMatch = atom.match(/^(.+?)\s+contains\s+['"](.+)['"]$/i);
    if (containsMatch) {
      const key = resolveAnswerKey(containsMatch[1].trim());
      const needle = containsMatch[2];
      const answer = answers[key];
      if (Array.isArray(answer)) {
        return answer.includes(needle);
      }
      if (typeof answer === "string") {
        return answer.includes(needle);
      }
      return false;
    }

    const equalsMatch = atom.match(/^(.+?)\s*==\s*(.+)$/);
    if (equalsMatch) {
      const key = resolveAnswerKey(equalsMatch[1].trim());
      const expected = parseLiteral(equalsMatch[2]);
      const answer = answers[key];
      return answer === expected;
    }

    return true;
  };

  const evaluateGroup = (group: string) => {
    const andParts = group.split(/\s+and\s+/i).map((part) => part.trim());
    return andParts.every((part) => evaluateAtom(part));
  };

  return orParts.some((group) => evaluateGroup(group));
};

const formatAnswer = (value: AnswerValue) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "-";
  }
  if (value === true) {
    return "Ja";
  }
  if (value === false) {
    return "Nee";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
};

export default function StepThreePage() {
  const router = useRouter();
  const { stepTwo, stepThree, setStepThree, setStepTwo } = useWizard();
  const [config] = useState<WizardConfig>(() => loadWizardConfig());
  const [library] = useState<QuestionLibrary>(() => loadQuestionLibrary());
  const [showConceptKeys, setShowConceptKeys] = useState(false);

  const answerMap = useMemo<Record<string, AnswerValue>>(
    () => ({
      ...stepThree.extras,
      "material.main": stepThree.mainMaterial,
      "finish.method": stepThree.finishes,
      "finish.ral": stepThree.ralColor,
      "finish.gloss": stepThree.glossLevel,
      "profile.types": stepThree.profileTypes,
      "en1090.required": stepThree.en1090.required,
      "en1090.exc": stepThree.en1090.excClass,
      "en1090.documents": stepThree.en1090.documents,
      "en1090.note": stepThree.en1090.note,
    }),
    [stepThree]
  );

  const questionMap = useMemo(
    () => new Map(library.questions.map((question) => [question.id, question])),
    [library.questions]
  );

  const categoryLabel =
    config.categories.find((category) => category.id === stepTwo.projectCategory)
      ?.label ?? stepTwo.projectCategory;
  const contextLabel =
    Object.values(config.contextsByCategory)
      .flat()
      .find((context) => context.id === stepTwo.designContext)?.label ??
    stepTwo.designContext;
  const installationLabel =
    config.installationLabels[stepTwo.installationType] ??
    stepTwo.installationType;
  const showGlobalDimensions =
    stepTwo.projectCategory === "fietsenstalling" ||
    stepTwo.designContext.includes("constructie") ||
    stepTwo.installationType.includes("constructie");

  const scopeCandidates = useMemo(
    () => {
      const candidates: { label: string; scope: FlowScope }[] = [];
      if (stepTwo.projectCategory) {
        candidates.push({
          label: `Categorie: ${categoryLabel || stepTwo.projectCategory}`,
          scope: { level: "category", categoryId: stepTwo.projectCategory },
        });
      }
      if (stepTwo.projectCategory && stepTwo.designContext) {
        candidates.push({
          label: `Context: ${contextLabel || stepTwo.designContext}`,
          scope: {
            level: "context",
            categoryId: stepTwo.projectCategory,
            contextId: stepTwo.designContext,
          },
        });
      }
      if (
        stepTwo.projectCategory &&
        stepTwo.designContext &&
        stepTwo.installationType
      ) {
        candidates.push({
          label: `Opstelling: ${installationLabel || stepTwo.installationType}`,
          scope: {
            level: "installation",
            categoryId: stepTwo.projectCategory,
            contextId: stepTwo.designContext,
            installationId: stepTwo.installationType,
          },
        });
      }
      candidates.push({ label: "Global", scope: { level: "global" } });
      return candidates;
    },
    [
      categoryLabel,
      contextLabel,
      installationLabel,
      stepTwo.projectCategory,
      stepTwo.designContext,
      stepTwo.installationType,
    ]
  );

  const { mergedFlows, missingFlowLabels } = useMemo(() => {
    const byLevel = new Map<
      FlowScope["level"],
      { flow: Flow; label: string }
    >();
    scopeCandidates.forEach((candidate) => {
      const flow = findBestMatchingFlow(library.flows, candidate.scope);
      if (flow) {
        byLevel.set(candidate.scope.level, { flow, label: candidate.label });
      }
    });

    const orderedLevels: FlowScope["level"][] = [
      "global",
      "category",
      "context",
      "installation",
    ];
    const merged = orderedLevels
      .map((level) => byLevel.get(level))
      .filter((item): item is { flow: Flow; label: string } => Boolean(item));
    const missing = scopeCandidates
      .filter((candidate) => !byLevel.has(candidate.scope.level))
      .map((candidate) => candidate.label);

    return { mergedFlows: merged, missingFlowLabels: missing };
  }, [library.flows, scopeCandidates]);

  const combinedFlow = useMemo(() => {
    const resolveNodeId = (flowId: string, nodeId: string) =>
      `${flowId}::${nodeId}`;
    const flowNodeInfoByFlowId = new Map<
      string,
      Map<string, { questionId: string; resolvedId: string }>
    >();
    const flowQuestionIdsByFlowId = new Map<string, Set<string>>();
    mergedFlows.forEach(({ flow }) => {
      const questionIds = new Set<string>();
      const flowNodeInfo = new Map<
        string,
        { questionId: string; resolvedId: string }
      >();
      flow.nodes.forEach((node) => {
        flowNodeInfo.set(node.id, {
          questionId: node.questionId,
          resolvedId: resolveNodeId(flow.id, node.id),
        });
        questionIds.add(node.questionId);
      });
      flowNodeInfoByFlowId.set(flow.id, flowNodeInfo);
      flowQuestionIdsByFlowId.set(flow.id, questionIds);
    });

    const decisionByQuestionId = new Map<
      string,
      { nodeId?: string; isExcluded: boolean }
    >();
    [...mergedFlows].reverse().forEach(({ flow }) => {
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
            isExcluded: false,
          });
        }
      });
      (flow.excludedQuestionIds ?? []).forEach((questionId) => {
        if (flowQuestionIds.has(questionId)) {
          return;
        }
        if (!decisionByQuestionId.has(questionId)) {
          decisionByQuestionId.set(questionId, { isExcluded: true });
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
    mergedFlows.forEach(({ flow }) => {
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
    let edgeCounter = 0;
    mergedFlows.forEach(({ flow }) => {
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
        edges.push({
          ...edge,
          id: `${edge.id}-${edgeCounter}`,
          from: fromNodeId,
          to: toNodeId,
        });
        edgeCounter += 1;
      });
    });

    return { nodes, edges };
  }, [mergedFlows]);

  const activeFlowQuestions = useMemo<FlowQuestion[]>(() => {
    return combinedFlow.nodes
      .map((node) => {
        const question = questionMap.get(node.questionId);
        if (!question) {
          return null;
        }
        return { nodeId: node.id, question };
      })
      .filter((item): item is FlowQuestion => item !== null);
  }, [combinedFlow.nodes, questionMap]);

  const incomingEdges = useMemo(() => {
    const map = new Map<string, Flow["edges"]>();
    combinedFlow.edges.forEach((edge) => {
      const list = map.get(edge.to) ?? [];
      list.push(edge);
      map.set(edge.to, list);
    });
    return map;
  }, [combinedFlow.edges]);

  const visibleQuestions = useMemo(() => {
    return activeFlowQuestions.filter((item) => {
      const edges = incomingEdges.get(item.nodeId) ?? [];
      if (edges.length === 0) {
        return true;
      }
      return edges.some((edge) =>
        evaluateExpression(edge.when?.expression, answerMap)
      );
    });
  }, [activeFlowQuestions, answerMap, incomingEdges]);

  const questionKeys = useMemo(
    () => new Set(visibleQuestions.map((item) => item.question.conceptKey)),
    [visibleQuestions]
  );

  const setAnswer = useCallback(
    (question: Question, value: AnswerValue) => {
      switch (question.conceptKey) {
        case "material.main":
          setStepThree({ mainMaterial: String(value ?? "") });
          return;
        case "finish.method":
          setStepThree({
            finishes: Array.isArray(value) ? value : [],
          });
          return;
        case "finish.ral":
          setStepThree({ ralColor: String(value ?? "") });
          return;
        case "finish.gloss":
          setStepThree({ glossLevel: String(value ?? "") });
          return;
        case "profile.types":
          setStepThree({
            profileTypes: Array.isArray(value) ? value : [],
          });
          return;
        case "en1090.required":
          setStepThree({
            en1090: {
              ...stepThree.en1090,
              required: typeof value === "boolean" ? value : null,
            },
          });
          return;
        case "en1090.exc":
          setStepThree({
            en1090: {
              ...stepThree.en1090,
              excClass: String(value ?? "") as
                | ""
                | "EXC1"
                | "EXC2"
                | "EXC3"
                | "EXC4",
            },
          });
          return;
        case "en1090.documents":
          setStepThree({
            en1090: {
              ...stepThree.en1090,
              documents: Array.isArray(value) ? value : [],
            },
          });
          return;
        case "en1090.note":
          setStepThree({
            en1090: {
              ...stepThree.en1090,
              note: String(value ?? ""),
            },
          });
          return;
        default:
          setStepThree({
            extras: {
              [question.conceptKey]: value,
            },
          });
      }
    },
    [setStepThree, stepThree.en1090]
  );

  const requiresMaterial = questionKeys.has("material.main");
  const requiresEn1090 = questionKeys.has("en1090.required");
  const en1090Value = answerMap["en1090.required"];
  const requiresExc =
    en1090Value === true && questionKeys.has("en1090.exc");

  const canContinue =
    (!requiresMaterial || Boolean(answerMap["material.main"])) &&
    (!requiresEn1090 || en1090Value !== null && en1090Value !== undefined) &&
    (!requiresExc || Boolean(answerMap["en1090.exc"]));

  const flowSummary = mergedFlows.map((item) => item.label).join(" + ");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7ed,_#f8fafc_45%,_#e2e8f0_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Project Manager
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Stap 3 - Vragen
          </h1>
          <p className="text-base text-slate-600">
            Beantwoord de vragen zoals ingesteld in de flowmap.
          </p>
        </header>
        <WizardStepIndicator currentStep={3} />

        <section className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-xl shadow-slate-200 backdrop-blur">
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Actieve scope
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {categoryLabel || "-"} / {contextLabel || "-"} / {installationLabel || "-"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Flows: {flowSummary || "geen flow"}
                </p>
                {missingFlowLabels.length > 0 ? (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Geen flow gevonden voor: {missingFlowLabels.join(", ")}.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/wizard/question-map-visual")}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Flowmap openen
                </button>
                <button
                  type="button"
                  aria-pressed={showConceptKeys}
                  onClick={() => setShowConceptKeys((prev) => !prev)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {showConceptKeys
                    ? "Verberg technische labels"
                    : "Toon technische labels"}
                </button>
              </div>
            </div>

            {showGlobalDimensions ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-800">
                  Globale afmetingen
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
            ) : null}

            {visibleQuestions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
                Geen vragen gevonden voor deze scope. Voeg vragen toe in de flowmap.
              </div>
            ) : (
              <div className="space-y-4">
                {visibleQuestions.map(({ question }) => {
                  const currentValue = answerMap[question.conceptKey];

                  return (
                    <div
                      key={question.id}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-lg font-semibold text-slate-800">
                          {question.prompt}
                        </h2>
                        {showConceptKeys ? (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                            {question.conceptKey}
                          </span>
                        ) : null}
                      </div>
                      {question.helpText ? (
                        <p className="mt-2 text-sm text-slate-500">
                          {question.helpText}
                        </p>
                      ) : null}

                      <div className="mt-4">
                        {question.kind === "text" ? (
                          <input
                            type="text"
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) =>
                              setAnswer(question, event.target.value)
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        ) : null}

                        {question.kind === "number" ? (
                          <input
                            type="number"
                            value={
                              typeof currentValue === "number"
                                ? String(currentValue)
                                : currentValue === null
                                ? ""
                                : ""
                            }
                            onChange={(event) => {
                              const rawValue = event.target.value;
                              setAnswer(
                                question,
                                rawValue === "" ? null : Number(rawValue)
                              );
                            }}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          />
                        ) : null}

                        {question.kind === "boolean" ? (
                          <div className="grid gap-3 sm:grid-cols-3">
                            {[true, false, null].map((option) => {
                              const isActive = currentValue === option;
                              const label =
                                option === true
                                  ? "Ja"
                                  : option === false
                                  ? "Nee"
                                  : "Leeg";
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => setAnswer(question, option)}
                                  className={`rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                                    isActive
                                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {question.kind === "single" ? (
                          <select
                            value={typeof currentValue === "string" ? currentValue : ""}
                            onChange={(event) =>
                              setAnswer(question, event.target.value)
                            }
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          >
                            <option value="">Selecteer een optie</option>
                            {(question.options ?? []).map((option) => (
                              <option key={option.id} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : null}

                        {question.kind === "multi" ? (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {(question.options ?? []).map((option) => {
                              const selectedValues = Array.isArray(currentValue)
                                ? currentValue
                                : [];
                              const isSelected = selectedValues.includes(
                                option.value
                              );
                              return (
                                <label
                                  key={option.id}
                                  className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-4 text-sm font-medium transition ${
                                    isSelected
                                      ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300"
                                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                                  }`}
                                >
                                  <span>{option.label}</span>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      const next = isSelected
                                        ? selectedValues.filter(
                                            (value) => value !== option.value
                                          )
                                        : [...selectedValues, option.value];
                                      setAnswer(question, next);
                                    }}
                                    className="h-4 w-4 accent-slate-900"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/70 p-6 text-sm text-slate-700 shadow-lg shadow-slate-200 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Samenvatting
          </p>
          <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {visibleQuestions.map(({ question }) => (
              <div
                key={`summary-${question.id}`}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {question.prompt}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {formatAnswer(answerMap[question.conceptKey])}
                </p>
              </div>
            ))}
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
            onClick={() => router.push("/step-4")}
          >
            Volgende stap
          </button>
        </div>
      </main>
    </div>
  );
}
