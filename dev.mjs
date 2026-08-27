/**
 * VeloceWay one-command dev runner.
 *
 * Starts BOTH:
 *   1. the zero-dependency API server (server/index.mjs) on :8787
 *   2. the Vite dev server on :5173 (with /api proxied to #1)
 *
 * Usage: npm run dev   (then open http://localhost:5173)
 */
import { createServer as createViteServer } from "vite";
import { startServer } from "./server/index.mjs";
import { loadEnvFile } from "./server/env.mjs";

loadEnvFile(); // load .env so GEMINI_API_KEY reaches the API server

const apiPort = Number(process.env.PORT || 8787);
const webPort = Number(process.env.WEB_PORT || 5173);

startServer(apiPort);

const vite = await createViteServer();
await vite.listen(webPort);

console.log("");
console.log("  veloceway is up:");
console.log(`    web → http://localhost:${webPort}`);
console.log(`    api → http://localhost:${apiPort}/api/health`);
console.log(
  "    ai  → " +
    (process.env.GROK_API_KEY && process.env.AI_PROVIDER === "grok"
      ? "Grok — live"
      : process.env.GEMINI_API_KEY
        ? `Gemini (${process.env.GEMINI_MODEL || "gemini-3.6-flash"}) — live, any destination`
        : "no key found — demo mode (sample itineraries only)"),
);
console.log("");
