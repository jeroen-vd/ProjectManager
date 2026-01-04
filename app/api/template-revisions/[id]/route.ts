import { NextResponse } from "next/server";
import {
  deleteTemplateRevision,
  findTemplateRevision,
} from "@/src/lib/templateRevisionStorage";
import {
  writeQuestionLibraryTemplate,
  writeWizardConfigTemplate,
} from "@/src/lib/templateFileStorage";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const revision = await findTemplateRevision(id);
  if (!revision) {
    return NextResponse.json(
      { error: "Revisie niet gevonden." },
      { status: 404 }
    );
  }
  return NextResponse.json(revision);
}

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;
  const revision = await findTemplateRevision(id);
  if (!revision) {
    return NextResponse.json(
      { error: "Revisie niet gevonden." },
      { status: 404 }
    );
  }

  try {
    await writeWizardConfigTemplate(revision.wizardConfig);
    await writeQuestionLibraryTemplate(revision.questionLibrary);
  } catch (error) {
    console.error("Revisie herstellen mislukt.", error);
    return NextResponse.json(
      { error: "Revisie herstellen mislukt." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    wizardConfig: revision.wizardConfig,
    questionLibrary: revision.questionLibrary,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const removed = await deleteTemplateRevision(id);
  if (!removed) {
    return NextResponse.json(
      { error: "Revisie niet gevonden." },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
