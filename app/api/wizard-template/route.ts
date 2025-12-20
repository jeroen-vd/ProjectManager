import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  defaultWizardConfig,
  type WizardConfig,
} from "@/src/config/wizardConfig.default";

export const runtime = "nodejs";

type PartialConfig = Partial<WizardConfig>;

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
  let payload: PartialConfig | null = null;
  try {
    payload = (await request.json()) as PartialConfig;
  } catch {
    return NextResponse.json(
      { error: "Ongeldige JSON payload." },
      { status: 400 }
    );
  }

  const nextConfig = normalizeConfig(payload);
  const filePath = path.join(
    process.cwd(),
    "src",
    "config",
    "wizardConfig.default.ts"
  );

  try {
    const file = await fs.readFile(filePath, "utf8");
    const marker = "export const defaultWizardConfig: WizardConfig =";
    const markerIndex = file.indexOf(marker);
    if (markerIndex === -1) {
      return NextResponse.json(
        { error: "Kan default template niet vinden om te overschrijven." },
        { status: 500 }
      );
    }

    const newContent = `${file.slice(0, markerIndex)}${marker}\n${JSON.stringify(
      nextConfig,
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

export async function GET() {
  return NextResponse.json(defaultWizardConfig);
}
