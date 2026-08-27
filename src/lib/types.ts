/**
 * Shared UI types. All API payload shapes are deliberately loose (optionals
 * + index signatures) because LLM JSON varies — the UI renders defensively.
 */

export type BudgetId = "budget" | "mid" | "luxury";
export type TransportPref = "any" | "flight" | "train" | "ownVehicle";

export interface TripPlanRequest {
  prompt: string;
  destination?: string;
  source?: string;
  moods: string[];
  month?: string;
  travelers?: number;
  days?: number;
  budget?: BudgetId;
  transportPreference?: TransportPref;
  inspirationName?: string;
}

export interface SuggestRequest {
  moods: string[];
  season: string;
}

/* ── plan payloads ────────────────────────────────────────────────────── */

export interface TripSummary {
  destination?: string;
  country?: string;
  bestSeasons?: string[];
  vibeTags?: string[];
  whyGo?: string;
  currency?: string;
  dailyFoodBudget?: string;
  languageTip?: string;
  safetyNote?: string;
}

export interface TravelOption {
  estimate?: string;
  notes?: string[];
}

export interface Stay {
  name?: string;
  area?: string;
  type?: string;
  approxPerNight?: number | string;
  why?: string;
}

export interface DayPlan {
  day?: number;
  title?: string;
  morning?: string;
  afternoon?: string;
  evening?: string;
  stayArea?: string;
}

export interface Attraction {
  name?: string;
  category?: string;
  mustSee?: boolean;
  bestTime?: string;
  entryFee?: string;
}

export interface NearbyDestination {
  name?: string;
  distanceKm?: number;
  travelTime?: string;
  whyVisit?: string;
}

export interface LocalTransportMode {
  mode?: string;
  detail?: string;
  approxCost?: string;
}

export interface RouteModeOption {
  mode?: string;
  duration?: string;
  approxCost?: string;
}

export interface IntercityRoute {
  mode?: string;
  from?: string;
  to?: string;
  via?: string;
  distanceKm?: number;
  duration?: string;
  approxCost?: string;
  note?: string;
}

export interface LocalRoute {
  place?: string;
  fromArea?: string;
  distanceKm?: number;
  options?: RouteModeOption[];
  best?: string;
  note?: string;
}

export interface RouteVerdict {
  mode?: string;
  summary?: string;
}

export interface TripRoutes {
  roadPossible?: boolean;
  roadNote?: string;
  intercity?: IntercityRoute[];
  local?: LocalRoute[];
  cheapest?: RouteVerdict;
  fastest?: RouteVerdict;
}

export interface TripPlan {
  tripSummary?: TripSummary;
  travelOptions?: Record<string, TravelOption | undefined>;
  stays?: Stay[];
  dayByDay?: DayPlan[];
  attractions?: Attraction[];
  nearbyDestinations?: NearbyDestination[];
  localTransport?: LocalTransportMode[];
  seasonNotes?: string;
  packingTips?: string[];
  estimatedTotal?: Record<string, string>;
  bookingHints?: string[];
  routes?: TripRoutes;
  _mock?: boolean;
  [key: string]: unknown;
}

/* ── suggestion payloads ──────────────────────────────────────────────── */

export interface DestinationIdea {
  name?: string;
  country?: string;
  bestMonths?: string[];
  moods?: string[];
  why?: string;
  highlight?: string;
  avgFlightHint?: string;
  dailyBudget?: { currency?: string; budget?: string; mid?: string };
}

export interface SuggestResponse {
  destinations?: DestinationIdea[];
  _mock?: boolean;
  [key: string]: unknown;
}
