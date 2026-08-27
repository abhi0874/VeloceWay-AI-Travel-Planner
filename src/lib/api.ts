/**
 * Client API layer — talks to the VeloceWay backend (/api/*), which holds the
 * AI credentials server-side. Visitors never see or manage keys.
 *
 * In dev, Vite proxies /api to the local node server (npm run dev).
 * In production, /api/* runs as free-tier serverless functions (api/ on
 * Vercel, netlify/functions on Netlify) or beside the static site on Render.
 *
 * If the backend is unreachable or has no key configured, the UI falls back
 * to the built-in sample content so the site is never a dead end.
 */

import { MOCK_PLAN, MOCK_SUGGEST } from "../../shared/mock.mjs";
import type { SuggestRequest, SuggestResponse, TripPlan, TripPlanRequest } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function proxyBase(): string {
  return import.meta.env.VITE_API_URL || "";
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${proxyBase()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Can't reach the planning service right now. Check your connection and try again.",
      0,
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError("The service sent back an unreadable response.", res.status);
  }
  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } })?.error?.message ||
      `Request failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

function toFriendly(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  return new ApiError(msg, 502);
}

export async function planTrip(req: TripPlanRequest): Promise<TripPlan> {
  try {
    return await postJson<TripPlan>("/api/plan", req);
  } catch (err) {
    throw toFriendly(err);
  }
}

export async function suggestDestinations(req: SuggestRequest): Promise<SuggestResponse> {
  try {
    return await postJson<SuggestResponse>("/api/suggest", req);
  } catch (err) {
    throw toFriendly(err);
  }
}

/** Built-in sample content (also the offline demo). */
export function samplePlan(): TripPlan {
  return MOCK_PLAN;
}

export function sampleSuggestions(): SuggestResponse {
  return MOCK_SUGGEST;
}
