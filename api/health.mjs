/**
 * Vercel serverless function — GET /api/health
 *
 * The local dev server already answers this; the deployed app needs it too,
 * because it is the only way to tell from outside whether the environment
 * variables actually landed. `mode` says it plainly: "live" means a key is
 * configured and real itineraries are being generated, "sample-data" means the
 * key is missing and sample plans are standing in, "key-required" means missing
 * and nothing will be served. No key or key fragment is ever included.
 */
import { handleHealth, CORS } from "../shared/handlers.mjs";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "GET only" } }));
  }

  const result = handleHealth();
  res.writeHead(result.status, {
    ...result.headers,
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(result.payload));
}
