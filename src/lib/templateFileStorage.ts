import { promises as fs } from "node:fs";
import path from "node:path";
import { type WizardConfig } from "@/src/config/wizardConfig.default";
import { type QuestionLibrary } from "@/src/config/questionLibrary.default";
import { resolveProjectRoot } from "./projectPaths";

const wizardConfigPath = path.join(
  resolveProjectRoot(),
  "src",
  "config",
  "wizardConfig.default.ts"
);
const wizardMarker = "export const defaultWizardConfig: WizardConfig =";

const questionLibraryPath = path.join(
  resolveProjectRoot(),
  "src",
  "config",
  "questionLibrary.default.ts"
);
const questionLibraryMarker =
  "export const defaultQuestionLibrary: QuestionLibrary =";

const writeTemplateFile = async <T>(
  filePath: string,
  marker: string,
  payload: T
) => {
  const file = await fs.readFile(filePath, "utf8");
  const markerIndex = file.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Template marker niet gevonden in ${filePath}.`);
  }

  const newContent = `${file.slice(0, markerIndex)}${marker}\n${JSON.stringify(
    payload,
    null,
    2
  )};\n`;

  await fs.writeFile(filePath, newContent, "utf8");
};

export async function writeWizardConfigTemplate(config: WizardConfig) {
  await writeTemplateFile(wizardConfigPath, wizardMarker, config);
}

export async function writeQuestionLibraryTemplate(library: QuestionLibrary) {
  await writeTemplateFile(questionLibraryPath, questionLibraryMarker, library);
}
