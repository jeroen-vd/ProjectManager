import { NextResponse } from "next/server";
import {
  defaultQuestionLibrary,
  type QuestionLibrary,
} from "@/src/config/questionLibrary.default";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "@/src/config/wizardConfig.default";
import { writeQuestionLibraryTemplate } from "@/src/lib/templateFileStorage";
import { appendTemplateRevision } from "@/src/lib/templateRevisionStorage";

export const runtime = "nodejs";

type QuestionLibraryPayload = Partial<QuestionLibrary> & {
  wizardConfig?: WizardConfig;
  revisionNote?: string;
};

const normalizeLibrary = (raw: PartialLibrary | null): QuestionLibrary => {
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

export async function POST(request: Request) {
  let payload: QuestionLibraryPayload | null = null;
  try {
    payload = (await request.json()) as QuestionLibraryPayload;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  const nextLibrary = normalizeLibrary(payload);
  const revisionNote =
    typeof payload?.revisionNote === "string" ? payload.revisionNote.trim() : "";

  try {
    await writeQuestionLibraryTemplate(nextLibrary);
  } catch (error) {
    console.error("Template opslaan mislukt.", error);
    return NextResponse.json(
      { error: "Template opslaan mislukt." },
      { status: 500 }
    );
  }

  let revisionOk = true;
  try {
    await appendTemplateRevision({
      source: "question-library-template",
      wizardConfig: payload?.wizardConfig ?? defaultWizardConfig,
      questionLibrary: nextLibrary,
      ...(revisionNote ? { note: revisionNote } : {}),
    });
  } catch (error) {
    revisionOk = false;
    console.error("Revisie opslaan mislukt.", error);
  }

  return NextResponse.json({ ok: true, revisionOk });
}
