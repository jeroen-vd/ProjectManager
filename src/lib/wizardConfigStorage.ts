import { defaultWizardConfig, WizardConfig } from "../config/wizardConfig.default";

const STORAGE_KEY = "wizardConfig";

export function loadWizardConfig(): WizardConfig {
  if (typeof window === "undefined") {
    return defaultWizardConfig;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultWizardConfig;
    }
    return JSON.parse(raw) as WizardConfig;
  } catch {
    return defaultWizardConfig;
  }
}

export function saveWizardConfig(config: WizardConfig) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetWizardConfig() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}
