import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { type WizardConfig } from "@/src/config/wizardConfig.default";
import { type QuestionLibrary } from "@/src/config/questionLibrary.default";
import { resolveProjectRoot } from "./projectPaths";

export type TemplateRevisionSource =
  | "wizard-template"
  | "question-library-template"
  | "manual";

export type TemplateRevision = {
  id: string;
  createdAt: string;
  source: TemplateRevisionSource;
  note?: string;
  wizardConfig: WizardConfig;
  questionLibrary: QuestionLibrary;
};

export type TemplateRevisionSummary = Pick<
  TemplateRevision,
  "id" | "createdAt" | "source" | "note"
>;

const dataDir = path.join(resolveProjectRoot(), "data");
const dataFile = path.join(dataDir, "template-revisions.json");

const readRevisions = async () => {
  try {
    const file = await fs.readFile(dataFile, "utf8");
    const parsed = JSON.parse(file);
    return Array.isArray(parsed) ? (parsed as TemplateRevision[]) : [];
  } catch {
    return [];
  }
};

const writeRevisions = async (revisions: TemplateRevision[]) => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(revisions, null, 2), "utf8");
};

export async function listTemplateRevisions(): Promise<TemplateRevisionSummary[]> {
  const revisions = await readRevisions();
  return revisions.map(({ id, createdAt, source, note }) => ({
    id,
    createdAt,
    source,
    note,
  }));
}

export async function listTemplateRevisionsFull(): Promise<TemplateRevision[]> {
  return readRevisions();
}

export async function findTemplateRevision(
  id: string
): Promise<TemplateRevision | null> {
  const revisions = await readRevisions();
  const needle = id.trim().toLowerCase();
  return (
    revisions.find((revision) => revision.id.toLowerCase() === needle) ?? null
  );
}

export async function appendTemplateRevision(
  entry: Omit<TemplateRevision, "id" | "createdAt">
): Promise<TemplateRevision> {
  const revisions = await readRevisions();
  const note =
    typeof entry.note === "string" ? entry.note.trim() : "";
  const nextRevision: TemplateRevision = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    source: entry.source,
    wizardConfig: entry.wizardConfig,
    questionLibrary: entry.questionLibrary,
    ...(note ? { note } : {}),
  };
  revisions.unshift(nextRevision);
  await writeRevisions(revisions);
  return nextRevision;
}

export async function deleteTemplateRevision(id: string): Promise<boolean> {
  const revisions = await readRevisions();
  const needle = id.trim().toLowerCase();
  const next = revisions.filter(
    (revision) => revision.id.toLowerCase() !== needle
  );
  if (next.length === revisions.length) {
    return false;
  }
  await writeRevisions(next);
  return true;
}
