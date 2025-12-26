import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultQuestionLibrary,
  type QuestionLibrary,
} from "@/src/config/questionLibrary.default";

export const runtime = "nodejs";

type PartialLibrary = Partial<QuestionLibrary>;

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
  let payload: PartialLibrary | null = null;
  try {
    payload = (await request.json()) as PartialLibrary;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  const nextLibrary = normalizeLibrary(payload);
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "questionLibrary.default.ts"
  );

  try {
    const file = await fs.readFile(filePath, "utf8");
    const marker = "export const defaultQuestionLibrary: QuestionLibrary =";
    const markerIndex = file.indexOf(marker);
    if (markerIndex === -1) {
      return NextResponse.json(
        { error: "Kan default template niet vinden om te overschrijven." },
        { status: 500 }
      );
    }

    const newContent = `${file.slice(0, markerIndex)}${marker}\n${JSON.stringify(
      nextLibrary,
      null,
      2
    )};\n`;

    await fs.writeFile(filePath, newContent, "utf8");
  } catch (error) {
    console.error("Template opslaan mislukt.", error);
    return NextResponse.json(
      { error: "Template opslaan mislukt." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
