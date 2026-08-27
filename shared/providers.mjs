/**
 * VeloceWay provider callers — zero dependencies, runs in browser / node / serverless.
 * Gemini (free tier via Google AI Studio) is the default; Grok is switchable
 * but has NO permanent free API tier — the UI labels it experimental for a reason.
 */

export const DEFAULTS = {
  geminiModel: "gemini-3.6-flash",
  grokModel: "grok-4.3",
};

/* A full itinerary (7 day-by-day entries, 8-12 attractions, stays, intercity +
   local routes, packing and booking notes) does not fit in 8192 output tokens —
   and on a thinking model the reasoning eats from the same budget. Ask for
   plenty; if a model caps lower, callGemini retries at the safe old ceiling. */
const DEFAULT_MAX_OUTPUT = 32768;
const MAX_OUTPUT_CAP = 65536;
const LEGACY_MAX_OUTPUT = 8192;

export class ProviderError extends Error {
  constructor(message, { status = 502, provider = "gemini", truncated = false } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.provider = provider;
    this.truncated = truncated;
  }
}

function hintFor(status, message) {
  const m = String(message || "");
  if (status === 429)
    return " The service is busy right now — wait about a minute and try again.";
  if (status === 403 && /API.?KEY/i.test(m))
    return " The planning service rejected its credentials. Please try again later or contact us.";
  if (status === 400 && /FAILED_PRECONDITION|consumer/i.test(m))
    return " Planning isn't available in this region yet — please contact us.";
  if (status === 404) {
    const suggested = /use\s+models\/([\w.-]+)/i.exec(m);
    return suggested
      ? ` Retrying with ${suggested[1]}…`
      : " The planning service needs a quick configuration fix — please contact us.";
  }
  if (status === 401)
    return " The planning service rejected its credentials — please contact us.";
  return "";
}

async function raiseHttpError(res, provider) {
  let message = `${res.status} ${res.statusText || "request failed"}`;
  try {
    const data = await res.json();
    const j =
      data?.error?.message ||
      data?.error ||
      (typeof data === "string" ? data : "");
    if (j) message = typeof j === "string" ? j : JSON.stringify(j);
  } catch {
    /* keep status text */
  }
  const clean = message.replace(/\.\s*$/, "");
  throw new ProviderError(`${clean}. ${hintFor(res.status, message)}`.trimEnd(), {
    status: res.status,
    provider,
  });
}

/* ── Gemini ─────────────────────────────────────────────────────────────── */

/**
 * Calls Gemini and returns { text, finishReason, truncated }.
 * Self-heals three failure modes without bothering the visitor:
 *   · 404 "use models/X"  → Google retired the id; retry with the replacement
 *   · 400 about maxOutputTokens → this model caps lower; retry at 8192
 *   · finishReason MAX_TOKENS → the answer was cut mid-JSON; retry with a
 *     bigger budget, keeping the longer of the two replies
 */
export async function callGemini(args) {
  const requested = args.maxOutputTokens || DEFAULT_MAX_OUTPUT;
  const attempt = (overrides) => geminiRequest({ ...args, ...overrides });

  let result;
  try {
    result = await attempt();
  } catch (err) {
    if (!(err instanceof ProviderError)) throw err;

    // Google retires model ids over time; their 404 message names the
    // replacement ("use models/gemini-X-flash …") — auto-upgrade to it once.
    if (err.status === 404) {
      const suggested = /use\s+models\/([\w.-]+)/i.exec(err.message)?.[1];
      if (suggested && suggested !== args.model) result = await attempt({ model: suggested });
    }

    // Older/smaller models reject a 32k output request outright.
    if (
      !result &&
      err.status === 400 &&
      /max.?output.?tokens|output token/i.test(err.message) &&
      requested > LEGACY_MAX_OUTPUT
    ) {
      result = await attempt({ maxOutputTokens: LEGACY_MAX_OUTPUT });
    }

    if (!result) throw err;
  }

  if (result.truncated) {
    const bigger = Math.min(MAX_OUTPUT_CAP, requested * 2);
    if (bigger > requested) {
      try {
        const retry = await attempt({ maxOutputTokens: bigger });
        if (!retry.truncated || retry.text.length > result.text.length) result = retry;
      } catch {
        /* keep the truncated first reply — repairJson can still salvage it */
      }
    }
  }

  return result;
}

async function geminiRequest({
  apiKey,
  model,
  system,
  user,
  json = true,
  maxOutputTokens = DEFAULT_MAX_OUTPUT,
}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model || DEFAULTS.geminiModel,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) await raiseHttpError(res, "gemini");

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason || "";
  const truncated = finishReason === "MAX_TOKENS";

  /* Thinking models return their reasoning as parts flagged `thought: true`.
     Those must never be concatenated into the answer: one stray "{" in the
     reasoning would poison JSON extraction downstream. */
  const text = (candidate?.content?.parts || [])
    .filter((p) => p && p.thought !== true && typeof p.text === "string")
    .map((p) => p.text)
    .join("");

  if (!text) {
    const reason =
      finishReason || data?.promptFeedback?.blockReason || "empty response";
    const message =
      reason === "SAFETY"
        ? "The model declined this request. Try rephrasing your trip prompt."
        : truncated
          ? "The planner ran out of room before it could answer. Try again."
          : `The model returned nothing (${reason}). Try again.`;
    throw new ProviderError(message, { status: 502, provider: "gemini", truncated });
  }

  return { text, finishReason, truncated, provider: "gemini" };
}

/* ── Grok (xAI, OpenAI-compatible endpoint) ─────────────────────────────── */

export async function callGrok({
  apiKey,
  model,
  system,
  user,
  json = true,
  maxOutputTokens = 16384,
}) {
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULTS.grokModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.8,
      max_tokens: maxOutputTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) await raiseHttpError(res, "grok");

  const data = await res.json();
  const choice = data?.choices?.[0];
  const text = choice?.message?.content || "";
  const finishReason = choice?.finish_reason || "";
  if (!text)
    throw new ProviderError("Grok returned an empty response. Try again.", {
      status: 502,
      provider: "grok",
      truncated: finishReason === "length",
    });
  return { text, finishReason, truncated: finishReason === "length", provider: "grok" };
}

/* ── Shared plumbing ────────────────────────────────────────────────────── */

export async function generateJson({ provider = "gemini", ...args }) {
  const result =
    provider === "grok" ? await callGrok({ ...args }) : await callGemini({ ...args });
  return extractJson(result.text, {
    truncated: result.truncated,
    finishReason: result.finishReason,
    provider,
  });
}

/**
 * Walks the raw text once, tracking string/escape state and the stack of open
 * brackets. Returns a cleaned copy (raw control characters inside strings are
 * escaped instead of breaking the parse), the still-open closers, and every
 * position where the document could legally be cut short — the end of a
 * completed value, or just before a comma.
 */
function scanJson(text) {
  const stack = [];
  const cuts = [];
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        out += ch;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        // a literal newline/tab inside a JSON string is illegal — escape it
        out += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t" : " ";
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
      out += ch;
      continue;
    }
    if (ch === "}" || ch === "]") {
      if (stack[stack.length - 1] === ch) stack.pop();
      out += ch;
      cuts.push({ index: out.length, closers: [...stack].reverse().join("") });
      continue;
    }
    if (ch === ",") {
      // cut *before* the comma, so the trailing separator disappears with it
      cuts.push({ index: out.length, closers: [...stack].reverse().join("") });
      out += ch;
      continue;
    }
    out += ch;
  }

  return { out, closers: [...stack].reverse().join(""), inString, escaped, cuts };
}

const dropTrailingCommas = (t) => t.replace(/,(\s*[}\]])/g, "$1");

function closeOff(body, closers, { inString = false, escaped = false } = {}) {
  let out = escaped ? body.slice(0, -1) : body; // never end mid-escape
  if (inString) out += '"';
  // a dangling `"key":` has no value — drop the key rather than invent one
  out = out.replace(/,?\s*"(?:[^"\\]|\\.)*"\s*:\s*$/, "");
  out = out.replace(/[,:]\s*$/, "");
  return dropTrailingCommas(out) + closers;
}

/**
 * Best-effort recovery of an object from text that should have been JSON.
 * Tries the cleaned text as-is, then closes whatever brackets are still open,
 * then walks backwards through the cut points dropping one field at a time.
 * Returns the richest object that parses, or null.
 */
export function repairJson(raw) {
  const scan = scanJson(raw);
  const candidates = [scan.out, dropTrailingCommas(scan.out)];

  candidates.push(
    closeOff(scan.out, scan.closers, { inString: scan.inString, escaped: scan.escaped }),
  );

  // longest first: the last cut keeps the most content
  for (let i = scan.cuts.length - 1, tries = 0; i >= 0 && tries < 400; i--, tries++) {
    const cut = scan.cuts[i];
    candidates.push(closeOff(scan.out.slice(0, cut.index), cut.closers));
  }

  for (const candidate of candidates) {
    if (!candidate || candidate.length < 2) continue;
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
      /* try the next, shorter candidate */
    }
  }
  return null;
}

/** Indices of every "{" that plausibly starts an object. */
function objectStarts(t) {
  const out = [];
  for (let i = 0; i < t.length && out.length < 6; i++) {
    if (t[i] !== "{") continue;
    const next = /\s*["}]/.exec(t.slice(i + 1, i + 12));
    if (next && next.index === 0) out.push(i);
  }
  return out;
}

export function extractJson(text, meta = {}) {
  let t = String(text || "").trim();
  // Strip markdown fences if the model added them anyway.
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();

  const starts = objectStarts(t);
  if (starts.length === 0) {
    logExtractionFailure(t, meta, "no object found");
    throw new ProviderError(
      meta.truncated
        ? "The plan was cut short before it could be read. Try generating again."
        : "The model didn't return JSON. Try generating again.",
      { status: 502, truncated: Boolean(meta.truncated) },
    );
  }

  for (const start of starts) {
    const body = t.slice(start);
    const end = body.lastIndexOf("}");
    if (end > 0) {
      try {
        const value = JSON.parse(body.slice(0, end + 1));
        if (value && typeof value === "object" && !Array.isArray(value)) return value;
      } catch {
        /* fall through to repair */
      }
    }
    const repaired = repairJson(body);
    if (repaired) return repaired;
  }

  logExtractionFailure(t, meta, "unrepairable");
  throw new ProviderError(
    meta.truncated
      ? "The plan came back longer than the model could finish. Try again — a shorter trip usually works first time."
      : "The model returned malformed JSON. Try generating again.",
    { status: 502, truncated: Boolean(meta.truncated) },
  );
}

/** Server-side only: makes this debuggable instead of a mystery. Never shown to visitors. */
function logExtractionFailure(t, meta, why) {
  try {
    console.warn(
      `[veloceway] JSON extraction failed (${why}) · provider=${meta.provider || "?"} ` +
        `finishReason=${meta.finishReason || "?"} chars=${t.length}\n` +
        `  head: ${JSON.stringify(t.slice(0, 160))}\n` +
        `  tail: ${JSON.stringify(t.slice(-160))}`,
    );
  } catch {
    /* logging must never break a request */
  }
}

/** Tiny credential check used by the Settings dialog. */
export async function pingProvider(provider, { apiKey, model } = {}) {
  try {
    if (provider === "grok") {
      if (!apiKey) return { ok: false, message: "Add a Grok key first." };
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || DEFAULTS.grokModel,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
        }),
      });
      if (!res.ok) await raiseHttpError(res, "grok");
      return { ok: true, message: "Key works. (Remember: Grok usage may be billed.)" };
    }

    if (!apiKey) return { ok: false, message: "Add a Gemini key first." };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(
        apiKey,
      )}`,
    );
    if (!res.ok) await raiseHttpError(res, "gemini");
    return { ok: true, message: "Key works — and stays free as long as you never link billing." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
