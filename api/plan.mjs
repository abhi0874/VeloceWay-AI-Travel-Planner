/**
 * Vercel serverless function — POST /api/plan
 * Deploys together with the static site on Vercel's free Hobby tier.
 */
import { handlePlan, CORS } from "../shared/handlers.mjs";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  if (req.method !== "POST") {
    res.writeHead(405, { ...CORS, "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: { message: "POST only" } }));
  }

  let body = req.body ?? {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.writeHead(400, { ...CORS, "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "Invalid JSON body" } }));
    }
  }

  const result = await handlePlan(body);
  res.writeHead(result.status, {
    ...result.headers,
    "Content-Type": "application/json",
  });
  res.end(JSON.stringify(result.payload));
}
