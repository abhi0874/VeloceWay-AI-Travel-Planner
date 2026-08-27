/**
 * Minimal .env loader — keeps the backend at ZERO npm dependencies.
 * Reads key=value lines from .env in the project root and fills process.env
 * WITHOUT overriding variables that are already set (real env wins).
 */
import { existsSync, readFileSync } from "node:fs";

export function loadEnvFile(path = ".env") {
  try {
    if (!existsSync(path)) return 0;
    const raw = readFileSync(path, "utf8");
    let loaded = 0;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key in process.env) continue; // real environment takes precedence
      process.env[key] = value;
      loaded++;
    }
    return loaded;
  } catch {
    return 0;
  }
}
