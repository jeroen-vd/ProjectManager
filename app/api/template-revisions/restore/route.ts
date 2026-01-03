import { NextResponse } from "next/server";
import { writeQuestionLibraryTemplate, writeWizardConfigTemplate } from "@/src/lib/templateFileStorage";
import { type WizardConfig } from "@/src/config/wizardConfig.default";
import { type QuestionLibrary } from "@/src/config/questionLibrary.default";

export const runtime = "nodejs";

type RestorePayload = {
  wizardConfig: WizardConfig;
  questionLibrary: QuestionLibrary;
};

const isValidPayload = (payload: RestorePayload | null) => {
  if (!payload) {
    return false;
  }
  if (!Array.isArray(payload.wizardConfig?.categories)) {
    return false;
  }
  if (!Array.isArray(payload.questionLibrary?.questions)) {
    return false;
  }
  if (!Array.isArray(payload.questionLibrary?.flows)) {
    return false;
  }
  return true;
};

export async function POST(request: Request) {
  let payload: RestorePayload | null = null;
  try {
    payload = (await request.json()) as RestorePayload;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      { error: "Payload mist template data." },
      { status: 400 }
    );
  }

  try {
    await writeWizardConfigTemplate(payload.wizardConfig);
    await writeQuestionLibraryTemplate(payload.questionLibrary);
  } catch (error) {
    console.error("Revisie herstellen mislukt.", error);
    return NextResponse.json(
      { error: "Revisie herstellen mislukt." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
