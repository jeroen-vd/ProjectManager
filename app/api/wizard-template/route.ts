import { NextResponse } from "next/server";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "@/src/config/wizardConfig.default";
import {
  defaultQuestionLibrary,
  type QuestionLibrary,
} from "@/src/config/questionLibrary.default";
import { writeWizardConfigTemplate } from "@/src/lib/templateFileStorage";
import { appendTemplateRevision } from "@/src/lib/templateRevisionStorage";

export const runtime = "nodejs";

type WizardTemplatePayload = Partial<WizardConfig> & {
  questionLibrary?: QuestionLibrary;
  revisionNote?: string;
};

const buildDefaultContextIconMap = () => {
  const entries = Object.values(defaultWizardConfig.contextsByCategory).flat();
  const map = new Map<string, string>();
  entries.forEach((context) => {
    if (context.iconKey) {
      map.set(context.id, context.iconKey);
    }
  });
  return map;
};

const normalizeConfig = (raw: PartialConfig | null): WizardConfig => {
  if (!raw) {
    return defaultWizardConfig;
  }

  const defaultContextIconMap = buildDefaultContextIconMap();
  const categories =
    Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.map((category) => {
          if (category.iconKey) {
            return category;
          }
          const fallback = defaultWizardConfig.categories.find(
            (item) => item.id === category.id
          );
          return fallback?.iconKey
            ? { ...category, iconKey: fallback.iconKey }
            : category;
        })
      : defaultWizardConfig.categories;

  const rawContextsByCategory = raw.contextsByCategory ?? {};
  const contextsByCategory: WizardConfig["contextsByCategory"] = {
    ...defaultWizardConfig.contextsByCategory,
    ...rawContextsByCategory,
  };

  Object.keys(contextsByCategory).forEach((categoryId) => {
    contextsByCategory[categoryId] = contextsByCategory[categoryId].map(
      (context) => {
        if (context.iconKey) {
          return context;
        }
        const fallbackIcon = defaultContextIconMap.get(context.id);
        return fallbackIcon ? { ...context, iconKey: fallbackIcon } : context;
      }
    );
  });

  return {
    categories,
    contextsByCategory,
    installationsByContext: {
      ...defaultWizardConfig.installationsByContext,
      ...(raw.installationsByContext ?? {}),
    },
    installationLabels: {
      ...defaultWizardConfig.installationLabels,
      ...(raw.installationLabels ?? {}),
    },
    installationIcons: {
      ...defaultWizardConfig.installationIcons,
      ...(raw.installationIcons ?? {}),
    },
  };
};

export async function POST(request: Request) {
  let payload: WizardTemplatePayload | null = null;
  try {
    payload = (await request.json()) as WizardTemplatePayload;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  const nextConfig = normalizeConfig(payload);
  const revisionNote =
    typeof payload?.revisionNote === "string" ? payload.revisionNote.trim() : "";

  try {
    await writeWizardConfigTemplate(nextConfig);
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
      source: "wizard-template",
      wizardConfig: nextConfig,
      questionLibrary: payload?.questionLibrary ?? defaultQuestionLibrary,
      ...(revisionNote ? { note: revisionNote } : {}),
    });
  } catch (error) {
    revisionOk = false;
    console.error("Revisie opslaan mislukt.", error);
  }

  return NextResponse.json({ ok: true, revisionOk });
}

export async function GET() {
  return NextResponse.json(defaultWizardConfig);
}
