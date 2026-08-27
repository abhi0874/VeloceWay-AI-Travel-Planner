/**
 * VeloceWay local API server — pure node:http, ZERO npm dependencies.
 * Nothing to install, nothing to pay for; it just forwards structured
 * prompts to Gemini/Grok using keys from the environment.
 *
 *   npm run dev:api          # :8787
 *   POST /api/plan           { prompt, moods[], month, travelers, budget, transportPreference }
 *   POST /api/suggest        { moods[], season }
 *   GET  /api/health
 *
 * With no key configured it serves rich sample data (see WANDOR_ALLOW_MOCK),
 * so the whole app is explorable offline.
 */
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { loadEnvFile } from "./env.mjs";
import {
  handlePlan,
  handleSuggest,
  handleHealth,
  CORS,
} from "../shared/handlers.mjs";

const MAX_BODY_BYTES = 100_000;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, result) {
  res.writeHead(result.status, {
    ...result.headers,
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(result.payload));
}

export function startServer(port) {
  loadEnvFile(); // pick up .env (GEMINI_API_KEY etc.) — real env vars still win
  port = port || process.env.PORT || 8787;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const route = `${req.method} ${url.pathname}`;

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(204, CORS);
        return res.end();
      }

      if (route === "GET /api/health") return send(res, handleHealth());

      if (route === "POST /api/plan")
        return send(res, await handlePlan(await readBody(req)));

      if (route === "POST /api/suggest")
        return send(res, await handleSuggest(await readBody(req)));

      send(res, {
        status: 404,
        payload: { error: { message: `Unknown route: ${route}` } },
        headers: CORS,
      });
    } catch (err) {
      send(res, {
        status: err?.message === "Invalid JSON body" ? 400 : 500,
        payload: { error: { message: err?.message || "Server error" } },
        headers: CORS,
      });
    }
  });

  server.listen(port, () => {
    const provider = process.env.AI_PROVIDER === "grok" ? "grok" : "gemini";
    const hasKey =
      provider === "grok"
        ? Boolean(process.env.GROK_API_KEY)
        : Boolean(process.env.GEMINI_API_KEY);
    console.log(`  [veloceway-api] listening on http://localhost:${port}`);
    console.log(
      `  [veloceway-api] provider=${provider}${hasKey ? "" : " · no key → sample-data mode"}`,
    );
  });

  return server;
}

// Run directly (`npm run dev:api`) but not when imported by dev.mjs.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}
