import { defaultWizardConfig, WizardConfig } from "../config/wizardConfig.default";

const STORAGE_KEY = "wizardConfig";
const SAFE_MODE_PARAM = "safe";

const isSafeMode = () => {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(SAFE_MODE_PARAM) === "1";
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

const normalizeConfig = (raw: WizardConfig | null): WizardConfig => {
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

export function loadWizardConfig(): WizardConfig {
  if (typeof window === "undefined") {
    return defaultWizardConfig;
  }
  if (isSafeMode()) {
    return defaultWizardConfig;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultWizardConfig;
    }
    return normalizeConfig(JSON.parse(raw) as WizardConfig);
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
