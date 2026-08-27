/**
 * Trip history — kept in the traveler's Firestore account and nowhere else.
 *
 * Nothing is written to the device: no localStorage, no cookies, no IndexedDB.
 * The only copy on this machine is the `trips` array below, which lives in
 * memory for as long as the tab is open and dies with it.
 *
 * That has three consequences worth stating plainly:
 *   1. Signed out, there is no history at all — not even for the session,
 *      because there would be nowhere to put it. `historyAvailable()` says so
 *      and the planner offers a sign-in instead.
 *   2. Offline, history reads come back empty rather than stale.
 *   3. The on/off switch lives in the account too
 *      (`users/{uid}/settings/history`), so it can't leave a trace on disk.
 *
 * Every entry keeps a snapshot of the full plan, so opening a saved trip
 * restores the whole itinerary without re-generating it.
 */

import type { TripPlan } from "./types";
import {
  deleteAllCloudTrips,
  deleteCloudTrip,
  getSignedInUid,
  pullCloudTrips,
  pullHistoryPref,
  pushCloudTrip,
  pushHistoryPref,
} from "./firebase";
import { TRIPS_CHANGED_EVENT } from "./events";

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

const MAX_ENTRIES = 8;

/** Session-only mirror of the cloud collection. Never persisted. */
let trips: TripHistoryEntry[] = [];
/** Whose trips are in the mirror, so a different account can't read them. */
let mirrorFor: string | null = null;
/** Defaults to on; the account's stored preference overrides it once read. */
let enabled = true;
let prefFor: string | null = null;

function announce(): void {
  try {
    window.dispatchEvent(new CustomEvent(TRIPS_CHANGED_EVENT));
  } catch {
    /* no window (SSR / tests) — callers read the value directly */
  }
}

function newestFirst(list: TripHistoryEntry[]): TripHistoryEntry[] {
  return [...list].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
}

/** One entry per destination — the newest wins, as it always has. */
function dedupe(list: TripHistoryEntry[]): TripHistoryEntry[] {
  const byDestination = new Map<string, TripHistoryEntry>();
  for (const t of newestFirst(list)) {
    const key = (t.destination || "").toLowerCase();
    if (!key || byDestination.has(key)) continue;
    byDestination.set(key, t);
  }
  return [...byDestination.values()];
}

/** True when there is an account to store history in. */
export function historyAvailable(): boolean {
  return Boolean(getSignedInUid());
}

/** Signed out, history is neither on nor possible. */
export function isHistoryEnabled(): boolean {
  return historyAvailable() && enabled;
}

/** Synchronous read of the session mirror — safe inside useState(). */
export function loadHistory(): TripHistoryEntry[] {
  return isHistoryEnabled() ? trips : [];
}

/**
 * Pulls the account's trips and preference from Firestore into the mirror.
 * Best-effort: a failure leaves history empty rather than raising at anyone,
 * which is what happens when the Firestore rule hasn't been published yet.
 */
export async function refreshHistory(
  uid: string | null = getSignedInUid(),
): Promise<TripHistoryEntry[]> {
  if (!uid) {
    trips = [];
    mirrorFor = null;
    announce();
    return [];
  }
  if (prefFor !== uid) {
    try {
      const pref = await pullHistoryPref(uid);
      enabled = pref ?? true;
      prefFor = uid;
    } catch (err) {
      console.warn("[VeloceWay] Couldn't read your history setting:", err);
    }
  }
  if (!enabled) {
    trips = [];
    mirrorFor = uid;
    announce();
    return [];
  }
  try {
    const all = await pullCloudTrips(uid);
    trips = dedupe(all).slice(0, MAX_ENTRIES);
    mirrorFor = uid;
    /* An account written by an older build (or by a write that raced a delete)
       can hold trips the history doesn't show. Tidy them away, so what's in the
       account is exactly what the traveler sees. */
    const kept = new Set(trips.map((t) => t.id));
    for (const extra of all) {
      if (extra.id && !kept.has(extra.id)) void deleteCloudTrip(uid, extra.id).catch(() => {});
    }
  } catch (err) {
    console.warn("[VeloceWay] Couldn't load your saved trips:", err);
    trips = [];
  }
  announce();
  return trips;
}

/** Drops the mirror on sign-out so the next account starts clean. */
export function forgetHistorySession(): void {
  trips = [];
  mirrorFor = null;
  prefFor = null;
  enabled = true;
  announce();
}

/**
 * Flips the switch. Turning it off deletes the account's saved trips — the
 * same promise the old device-local version made, now kept in the cloud.
 */
export function setHistoryEnabled(on: boolean): void {
  enabled = on;
  const uid = getSignedInUid();
  if (!uid) return;
  prefFor = uid;
  void pushHistoryPref(uid, on).catch((err) =>
    console.warn("[VeloceWay] Couldn't save your history setting:", err),
  );
  if (!on) {
    trips = [];
    void deleteAllCloudTrips(uid).catch((err) =>
      console.warn("[VeloceWay] Couldn't clear your saved trips:", err),
    );
    announce();
  }
}

/**
 * Records a trip. The mirror updates at once so the UI is never waiting on the
 * network, then the write goes to Firestore — and anything the history no
 * longer shows is deleted there as well. Both kinds of loser count: the older
 * entry for a destination that was just re-planned, and whatever falls past the
 * newest eight. Otherwise the account would quietly keep trips the traveler
 * can't see, which is exactly the sort of copy they asked not to exist.
 */
export function saveTripToHistory(entry: TripHistoryEntry): void {
  const uid = getSignedInUid();
  if (!uid || !enabled || !entry.destination) return;
  const stamped = { ...entry, savedAt: entry.savedAt || Date.now() };
  const previous = trips;
  const merged = dedupe([stamped, ...previous]);
  trips = merged.slice(0, MAX_ENTRIES);
  const kept = new Set(trips.map((t) => t.id));
  mirrorFor = uid;
  announce();
  // A trip that didn't make the cut is never written in the first place.
  if (kept.has(stamped.id)) {
    void pushCloudTrip(uid, stamped).catch((err) =>
      console.warn("[VeloceWay] Trip saved for this session only:", err),
    );
  }
  for (const old of previous) {
    if (old.id && !kept.has(old.id)) void deleteCloudTrip(uid, old.id).catch(() => {});
  }
}

/** Forgets every saved trip, here and in the account. */
export function clearHistory(): void {
  trips = [];
  const uid = getSignedInUid();
  if (uid) {
    void deleteAllCloudTrips(uid).catch((err) =>
      console.warn("[VeloceWay] Couldn't clear your saved trips:", err),
    );
  }
  announce();
}

/** Exposed for tests: which account the mirror belongs to, if any. */
export function historyMirrorOwner(): string | null {
  return mirrorFor;
}
