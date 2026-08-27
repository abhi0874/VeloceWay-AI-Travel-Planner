/**
 * Recent-trips history — stored ONLY in this browser's localStorage.
 * The user controls it: a toggle in the planner switches saving on/off,
 * and switching off erases everything already saved.
 *
 * Each entry keeps a snapshot of the full plan, so clicking a recent trip
 * reopens the complete itinerary instantly.
 */

import type { TripPlan } from "./types";
import { deleteAllCloudTrips, getSignedInUid, pushCloudTrip } from "./firebase";

export interface TripHistoryEntry {
  id: string;
  savedAt: number;
  destination: string;
  country?: string;
  totalCost?: string;
  tier?: string;
  days?: number;
  month?: string;
  travelers?: number;
  plan?: TripPlan;
}

const HISTORY_KEY = "veloceway_history";
const TOGGLE_KEY = "veloceway_save_history";
const MAX_ENTRIES = 8;

export function isHistoryEnabled(): boolean {
  try {
    return localStorage.getItem(TOGGLE_KEY) !== "0"; // on by default
  } catch {
    return false;
  }
}

export function setHistoryEnabled(on: boolean): void {
  try {
    localStorage.setItem(TOGGLE_KEY, on ? "1" : "0");
    if (!on) {
      localStorage.removeItem(HISTORY_KEY); // off = erase what was kept
      const uid = getSignedInUid();
      if (uid) void deleteAllCloudTrips(uid).catch(() => {});
    }
  } catch {
    /* private browsing — nothing to do */
  }
}

export function loadHistory(): TripHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

/** Overwrites local history with the given list (used by cloud merge). */
export function writeHistory(list: TripHistoryEntry[]): void {
  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(list.slice(0, MAX_ENTRIES)),
    );
  } catch {
    /* ignore */
  }
}

export function saveTripToHistory(entry: TripHistoryEntry): void {
  if (!isHistoryEnabled() || !entry.destination) return;
  try {
    const list = loadHistory().filter(
      (x) => x.destination.toLowerCase() !== entry.destination.toLowerCase(),
    );
    list.unshift({ ...entry, savedAt: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
    // signed in? mirror the trip to Firestore (fire-and-forget)
    const uid = getSignedInUid();
    if (uid) void pushCloudTrip(uid, { ...entry, savedAt: Date.now() }).catch(() => {});
  } catch {
    /* storage unavailable — history is a convenience, not a requirement */
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
