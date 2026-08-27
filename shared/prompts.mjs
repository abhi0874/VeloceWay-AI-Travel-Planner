/**
 * VeloceWay prompt builders — shared by every runtime:
 *   browser · node server · Vercel fn · Netlify fn
 *
 * The JSON schemas below mirror src/lib/types.ts exactly.
 */

export const PLAN_SYSTEM = `You are VeloceWay, a seasoned independent travel planner.

Rules you must always follow:
1. Respond with a SINGLE valid JSON object only. No markdown fences, no commentary before or after it.
2. Prices are realistic approximate ranges for independent travelers, written in the destination's local currency first, with a rough USD equivalent in parentheses where useful. Prefix estimates with "~". Never present any price as an exact real-time fare — you cannot see live prices.
3. Respect the traveler's stated month or season: mention weather, crowds, festivals and booking pressure in "seasonNotes".
4. Weight the day-by-day plan toward their stated moods and interests. If they want to avoid crowds, prefer authentic, quieter alternatives over famous tourist traps and say why.
5. Fill flight, train AND own-vehicle options whenever remotely plausible; if one is impractical for this trip, still return its object with estimate explaining why ("Not practical here — ...").
6. Keep every string under 240 characters. Be specific (name real neighborhoods, real dishes, real ticket types), never generic.
7. If the traveler supplied a DESTINATION field, it is authoritative: plan that country or city — never substitute a different destination, no matter what the free text says.
8. If the DESTINATION looks misspelled, transliterated oddly, or ambiguous (e.g. "Switzrland", "Kolkatta", "Venizia"), silently interpret it as the most likely intended real place and plan that. Set "tripSummary.destination" to the CORRECT spelling. Never refuse and never invent a fictional place; if it is truly unrecognizable, plan the closest plausible real match and say so in one short sentence inside "whyGo".
9. ROUTES must be geographically honest. "routes.intercity" lists one entry per VIABLE mode from the SOURCE (or, if unspecified, from the nearest sensible major origin/hub) to the destination — real corridors with real approximate distances. Include "ownVehicle" ONLY if "routes.roadPossible" is true. If the destination cannot be reached by road (islands, across a sea, no road network), set "roadPossible" to false and explain why in "roadNote" — never fabricate a road route. "routes.local" lists 5-8 key places from the itinerary with realistic intra-city options (walking is only an option under ~3km); "best" names the fastest or cheapest sensible pick for that place. "cheapest" and "fastest" are verdicts across all intercity modes, each with a one-line reason.`;

const PLAN_SCHEMA = `Return a JSON object with EXACTLY these top-level keys:

{
  "tripSummary": {
    "destination": string,            // city or region, as specific as the request allows
    "country": string,
    "bestSeasons": string[],          // 2-4 entries like "October–November"
    "vibeTags": string[],             // 4-6 short tags matching the traveler's moods
    "whyGo": string,                  // 1-2 sentences, warm and concrete
    "currency": string,               // e.g. "JPY (¥)"
    "dailyFoodBudget": string,
    "languageTip": string,
    "safetyNote": string
  },
  "travelOptions": {
    "flight":  { "estimate": string, "notes": string[] },   // 2-3 notes each
    "train":   { "estimate": string, "notes": string[] },
    "ownVehicle": { "estimate": string, "notes": string[] }
  },
  "stays": [                                  // 5-6 entries across all three tiers
    { "name": string, "area": string, "type": "budget"|"mid-range"|"luxury",
      "approxPerNight": number|string, "why": string }
  ],
  "dayByDay": [                               // ONE entry per trip day, starting at 1
    { "day": number, "title": string, "morning": string, "afternoon": string,
      "evening": string, "stayArea": string }
  ],
  "attractions": [                            // 8-12 entries
    { "name": string, "category": string, "mustSee": boolean,
      "bestTime": string, "entryFee": string }
  ],
  "nearbyDestinations": [                     // 4-6 easy detours from the base
    { "name": string, "distanceKm": number, "travelTime": string, "whyVisit": string }
  ],
  "localTransport": [                         // 4-6 ways of getting around locally
    { "mode": string, "detail": string, "approxCost": string }
  ],
  "seasonNotes": string,
  "packingTips": string[],                    // 5-8 items
  "estimatedTotal": { "budget": string, "mid": string, "luxury": string },  // per-person totals for the whole trip
  "bookingHints": string[],                   // 3-6 practical booking tips
  "routes": {
    "roadPossible": boolean,
    "roadNote": string,
    "intercity": [                            // one per viable mode, source → destination
      { "mode": "flight"|"train"|"bus"|"ownVehicle"|"ferry",
        "from": string, "to": string, "via": string,
        "distanceKm": number, "duration": string,
        "approxCost": string, "note": string }
    ],
    "local": [                                // 5-8 key places inside the destination
      { "place": string, "fromArea": string, "distanceKm": number,
        "options": [ { "mode": string, "duration": string, "approxCost": string } ],
        "best": string, "note": string }
    ],
    "cheapest": { "mode": string, "summary": string },
    "fastest": { "mode": string, "summary": string }
  }
}`;

export function planUserPrompt(trip) {
  const moods = (trip.moods || []).join(", ") || "open to suggestions";
  const destination = (trip.destination || "").trim();
  const inspiration = trip.inspirationName
    ? `\n- They attached an inspiration file called "${trip.inspirationName}" — let its theme inform suggestions.`
    : "";
  return `Plan this trip and return the JSON object exactly per the schema.

DESTINATION (AUTHORITATIVE — plan this place; if misspelled, use the most likely intended real place): ${
    destination || "not specified — infer ONLY from the trip request below"
  }

TRIP REQUEST (verbatim from the traveler):
"""
${(trip.prompt || "").trim() || "(No free-text description — build the plan from the destination and profile below.)"}
"""

TRAVELER PROFILE:
- SOURCE (traveler's origin): ${trip.source?.trim() || "unspecified — build intercity routes from the nearest sensible major origin/hub for this destination"}
- Moods / interests: ${moods}
- Travel month: ${trip.month || "flexible — recommend the best window"}
- Number of travelers: ${trip.travelers || 2}
- Length of stay: ${trip.days || 7} days — "dayByDay" MUST contain EXACTLY ${trip.days || 7} entries, numbered 1 through ${trip.days || 7}
- Budget level: ${trip.budget || "mid"}
- Preferred intercity transport: ${trip.transportPreference || "any"}
${inspiration}

SCHEMA:
${PLAN_SCHEMA}`;
}

export const SUGGEST_SYSTEM = `You are VeloceWay's destination oracle. You know how places feel across seasons — crowds, colors, festivals, prices.

Rules:
1. Respond with a SINGLE valid JSON object only. No markdown fences, no commentary.
2. Suggest real destinations that genuinely shine in the requested season AND match the requested moods. Never force a poor seasonal fit.
3. Diversify across regions and cultures; at most one destination per country.
4. Daily budgets are per person, realistic approximate ranges in the destination's local currency, prefixed with "~" or given as a range.
5. Keep every string under 200 characters.`;

const SUGGEST_SCHEMA = `Return a JSON object of EXACTLY this shape:

{
  "destinations": [
    {
      "name": string,
      "country": string,
      "bestMonths": string[],        // e.g. ["October", "November"]
      "moods": string[],             // which requested moods this place nails
      "why": string,                 // 1 sentence, season-aware
      "highlight": string,           // one unmissable experience
      "avgFlightHint": string,       // rough round-trip economy hint from major hubs, "~..."
      "dailyBudget": { "currency": string, "budget": string, "mid": string }
    }
  ]
}`;

export function suggestUserPrompt({ moods = [], season = "", count = 6 } = {}) {
  return `Suggest ${count} destinations worldwide that are at their best in ${season || "the coming months"}${
    moods.length ? ` and match these moods: ${moods.join(", ")}` : ""
  }.

Mix well-known and under-the-radar picks (roughly half and half). Return the JSON object exactly per the schema.

SCHEMA:
${SUGGEST_SCHEMA}`;
}
