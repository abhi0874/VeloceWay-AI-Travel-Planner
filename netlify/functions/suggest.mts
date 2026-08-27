/**
 * Netlify function — POST /api/suggest
 * Routed via netlify.toml:  /api/* → /.netlify/functions/:splat
 */
import { handleSuggest, CORS } from "../../shared/handlers.mjs";

const jsonHeaders = { ...CORS, "Content-Type": "application/json" };

export default async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "POST only" } }),
      { status: 405, headers: jsonHeaders },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON body" } }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const result = await handleSuggest((body ?? {}) as Record<string, unknown>);
  return new Response(JSON.stringify(result.payload), {
    status: result.status,
    headers: result.headers,
  });
};
