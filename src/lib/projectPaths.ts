import { existsSync } from "node:fs";
import path from "node:path";

let cachedRoot: string | null = null;

export const resolveProjectRoot = () => {
  if (cachedRoot) {
    return cachedRoot;
  }

  const candidates = [process.env.INIT_CWD, process.cwd()].filter(
    (value): value is string => Boolean(value)
  );

  for (const candidate of candidates) {
    let current = candidate;
    while (true) {
      if (existsSync(path.join(current, "package.json"))) {
        cachedRoot = current;
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
  }

  cachedRoot = process.cwd();
  return cachedRoot;
};
