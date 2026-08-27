/**
 * VeloceWay request handlers — the single source of truth shared by:
 *   · server/index.mjs        (local node:http server)
 *   · api/plan|suggest.mjs    (Vercel functions)
 *   · netlify/functions/*     (Netlify functions)
 *
 * Every handler returns { status, payload, headers } so each runtime wrapper
 * stays a few lines long.
 */
import { generateJson, ProviderError } from "./providers.mjs";
import { DEFAULTS } from "./providers.mjs";
import {
  PLAN_SYSTEM,
  planUserPrompt,
  SUGGEST_SYSTEM,
  suggestUserPrompt,
} from "./prompts.mjs";
import { MOCK_PLAN, MOCK_SUGGEST } from "./mock.mjs";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_PROMPT_CHARS = 4000;

/**
 * Turn any thrown error into something a visitor can act on. Low-level
 * network failures ("fetch failed", DNS/timeout codes) leak nothing useful,
 * so they become a plain connectivity message instead.
 */
function visitorMessage(err, fallback = "Unexpected planner error.") {
  if (!(err instanceof Error)) return fallback;
  const raw = `${err.message} ${err.cause?.code || ""}`.toLowerCase();
  const offline =
    raw.includes("fetch failed") ||
    raw.includes("network") ||
    raw.includes("enotfound") ||
    raw.includes("econnrefused") ||
    raw.includes("econnreset") ||
    raw.includes("etimedout") ||
    raw.includes("timeout") ||
    raw.includes("aborted");
  if (offline)
    return "VeloceWay couldn't reach the planning service — check your connection and try again.";
  return err.message || fallback;
}

function activeProvider() {
  return process.env.AI_PROVIDER === "grok" ? "grok" : "gemini";
}

function credentials() {
  const provider = activeProvider();
  if (provider === "grok")
    return {
      provider,
      apiKey: process.env.GROK_API_KEY || "",
      model: process.env.GROK_MODEL || DEFAULTS.grokModel,
    };
  return {
    provider,
    apiKey: process.env.GEMINI_API_KEY || "",
    model: process.env.GEMINI_MODEL || DEFAULTS.geminiModel,
  };
}

function mockAllowed() {
  return process.env.WANDOR_ALLOW_MOCK !== "0";
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string").slice(0, 12);
}

/** A second attempt only helps if it asks for something different. */
const RETRY_HINT_JSON = "\n\nREMINDER: reply with ONLY the JSON object.";
const RETRY_HINT_COMPACT =
  "\n\nREMINDER: reply with ONLY the JSON object, and keep it COMPACT — the last reply " +
  "was cut off before it finished. Every string must be ONE short sentence under 140 " +
  "characters with no line breaks, and every array must hold exactly the requested " +
  "number of entries, never more.";

/** Calls the configured provider; retries once when JSON comes back malformed. */
async function runGeneration({ system, user }) {
  const creds = credentials();
  let lastError;
  let hint = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const data = await generateJson({
        provider: creds.provider,
        apiKey: creds.apiKey,
        model: creds.model,
        system,
        user: attempt === 1 ? user : `${user}${hint}`,
      });
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new ProviderError("Model returned an unexpected top-level type.", {
          status: 502,
          provider: creds.provider,
        });
      return data;
    } catch (err) {
      lastError = err;
      // Only malformed/empty model output is worth a second attempt.
      const retryable =
        err instanceof ProviderError && err.status === 502 && attempt < 2;
      if (!retryable) throw err;
      // Truncated output needs a shorter answer, not just a nudge about format.
      hint = err.truncated ? RETRY_HINT_COMPACT : RETRY_HINT_JSON;
    }
  }
  throw lastError;
}

function mockResult(payload) {
  return {
    status: 200,
    payload,
    headers: { ...CORS, "x-veloceway-mock": "true" },
  };
}

export async function handlePlan(body = {}) {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const destination =
    typeof body.destination === "string" ? body.destination.trim().slice(0, 80) : "";
  if (!prompt && !destination)
    return {
      status: 400,
      payload: { error: { message: "Tell VeloceWay where you want to go — a destination is required." } },
      headers: CORS,
    };
  if (prompt.length > MAX_PROMPT_CHARS)
    return {
      status: 413,
      payload: { error: { message: `Keep the trip description under ${MAX_PROMPT_CHARS} characters.` } },
      headers: CORS,
    };

  const creds = credentials();
  if (!creds.apiKey) {
    if (mockAllowed())
      return mockResult({ ...MOCK_PLAN, _mock: true });
    return {
      status: 503,
      payload: {
        error: {
          message:
            "The planning service is warming up. Please try again shortly.",
        },
      },
      headers: CORS,
    };
  }

  try {
    const data = await runGeneration({
      system: PLAN_SYSTEM,
      user: planUserPrompt({
        prompt,
        destination,
        source: typeof body.source === "string" ? body.source.trim().slice(0, 80) : "",
        moods: asStringArray(body.moods),
        month: typeof body.month === "string" ? body.month : "",
        travelers: Number.isFinite(body.travelers) ? body.travelers : 2,
        days: Number.isFinite(body.days) ? Math.min(30, Math.max(1, Number(body.days))) : 7,
        budget: typeof body.budget === "string" ? body.budget : "mid",
        transportPreference:
          typeof body.transportPreference === "string"
            ? body.transportPreference
            : "any",
        inspirationName:
          typeof body.inspirationName === "string" ? body.inspirationName : "",
      }),
    });

    if (!data.tripSummary)
      throw new ProviderError(
        "The model's plan was missing its summary section — try again.",
        { status: 502, provider: creds.provider },
      );

    return { status: 200, payload: data, headers: CORS };
  } catch (err) {
    const status = err instanceof ProviderError ? err.status : 502;
    return {
      status,
      payload: {
        error: {
          message: visitorMessage(err, "Unexpected planner error."),
        },
      },
      headers: CORS,
    };
  }
}

export async function handleSuggest(body = {}) {
  const moods = asStringArray(body.moods);
  if (moods.length === 0)
    return {
      status: 400,
      payload: { error: { message: "Pick at least one mood to get suggestions." } },
      headers: CORS,
    };

  const season =
    typeof body.season === "string" ? body.season.slice(0, 60) : "";
  const count = Math.min(8, Math.max(3, Number(body.count) || 6));

  if (!credentials().apiKey) {
    if (mockAllowed()) return mockResult({ ...MOCK_SUGGEST, _mock: true });
    return {
      status: 503,
      payload: {
        error: { message: "The planning service is warming up. Please try again shortly." },
      },
      headers: CORS,
    };
  }

  try {
    const data = await runGeneration({
      system: SUGGEST_SYSTEM,
      user: suggestUserPrompt({ moods, season, count }),
    });
    if (!Array.isArray(data.destinations))
      throw new ProviderError(
        "The model's suggestions were missing their list — try again.",
        { status: 502 },
      );
    return { status: 200, payload: data, headers: CORS };
  } catch (err) {
    const status = err instanceof ProviderError ? err.status : 502;
    return {
      status,
      payload: {
        error: {
          message: visitorMessage(err, "Unexpected error."),
        },
      },
      headers: CORS,
    };
  }
}

export function handleHealth() {
  const creds = credentials();
  const hasKey = Boolean(creds.apiKey);
  return {
    status: 200,
    payload: {
      ok: true,
      service: "veloceway-api",
      provider: creds.provider,
      model: creds.model,
      mode: hasKey ? "live" : mockAllowed() ? "sample-data" : "key-required",
      // deliberately never expose keys here
    },
    headers: CORS,
  };
}
