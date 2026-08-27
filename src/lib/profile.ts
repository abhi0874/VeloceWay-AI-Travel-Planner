/**
 * The traveler's profile — the display name they choose, plus the planning
 * defaults every new trip starts from.
 *
 * Kept per account in localStorage so the planner can read it synchronously on
 * first paint, and mirrored to Firestore (`users/{uid}/profile/main`) while
 * someone is signed in so it follows them across devices.
 *
 * Email is deliberately NOT stored here: it belongs to the auth record, is
 * shown read-only, and is never editable from the profile.
 */

import type { BudgetId, TransportPref } from "./types";
import { getSignedInUid, pullCloudProfile, pushCloudProfile } from "./firebase";

export interface UserProfile {
  /** How the traveler wants to be addressed. Empty = fall back to the email. */
  displayName: string;
  /** Where trips usually start from — prefills the planner's "travelling from". */
  homeCity: string;
  travelers: number;
  days: number;
  budget: BudgetId;
  transport: TransportPref;
  moods: string[];
  /** ms epoch — the newer of local vs cloud wins on merge. */
  updatedAt: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  displayName: "",
  homeCity: "",
  travelers: 2,
  days: 7,
  budget: "mid",
  transport: "any",
  moods: ["food", "nature"],
  updatedAt: 0,
};

/** Same clamps the planner's own steppers enforce. */
export const LIMITS = { travelers: [1, 100], days: [1, 30] } as const;

const key = (uid: string | null) => `veloceway:profile:v1:${uid || "guest"}`;

const TRANSPORTS: TransportPref[] = ["any", "flight", "train", "ownVehicle"];

/**
 * Anything arriving from storage or the cloud is untrusted — an older build, a
 * hand-edited document, or a half-written sync. Clamp it back into range so the
 * planner never receives a value its own controls couldn't have produced.
 */
export function coerceProfile(raw: unknown): UserProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.slice(0, 80).trim() : "");
  const clamp = (v: unknown, [min, max]: readonly [number, number], fallback: number) => {
    // null / "" / objects all coerce to a number in JS — treat them as missing
    // rather than as zero, so a half-written record falls back instead of
    // silently becoming "1 traveler".
    const numeric =
      typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Number(v) : NaN;
    const n = Math.round(numeric);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    displayName: text(r.displayName),
    homeCity: text(r.homeCity),
    travelers: clamp(r.travelers, LIMITS.travelers, DEFAULT_PROFILE.travelers),
    days: clamp(r.days, LIMITS.days, DEFAULT_PROFILE.days),
    budget:
      r.budget === "budget" || r.budget === "luxury" || r.budget === "mid"
        ? (r.budget as BudgetId)
        : DEFAULT_PROFILE.budget,
    transport: TRANSPORTS.includes(r.transport as TransportPref)
      ? (r.transport as TransportPref)
      : DEFAULT_PROFILE.transport,
    moods: Array.isArray(r.moods)
      ? r.moods.filter((m): m is string => typeof m === "string").slice(0, 6)
      : [...DEFAULT_PROFILE.moods],
    updatedAt: Number.isFinite(Number(r.updatedAt)) ? Number(r.updatedAt) : 0,
  };
}

/** Synchronous read of the cached profile for the account that's signed in. */
export function loadProfile(uid: string | null = getSignedInUid()): UserProfile {
  try {
    const raw = localStorage.getItem(key(uid));
    return raw ? coerceProfile(JSON.parse(raw)) : { ...DEFAULT_PROFILE };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function writeLocal(uid: string | null, profile: UserProfile): void {
  try {
    localStorage.setItem(key(uid), JSON.stringify(profile));
  } catch {
    /* private mode / quota — the session keeps working, it just won't persist */
  }
}

/**
 * Saves locally first (so the UI is never waiting on the network), then pushes
 * to Firestore when signed in. A rejected push is not an error the traveler
 * needs to see — their profile is already safe on this device.
 */
export async function saveProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const uid = getSignedInUid();
  const next = coerceProfile({ ...loadProfile(uid), ...patch, updatedAt: Date.now() });
  writeLocal(uid, next);
  if (uid) {
    try {
      await pushCloudProfile(uid, next as unknown as Record<string, unknown>);
    } catch (err) {
      console.warn("[VeloceWay] Profile saved on this device only:", err);
    }
  }
  return next;
}

/**
 * On sign-in, reconcile the cloud copy with whatever this device has. Newer
 * `updatedAt` wins as a whole record rather than field by field — a half-merged
 * set of defaults would be more confusing than either version on its own.
 */
export async function syncProfile(uid: string): Promise<UserProfile> {
  const local = loadProfile(uid);
  let cloud: UserProfile | null = null;
  try {
    const raw = await pullCloudProfile(uid);
    if (raw) cloud = coerceProfile(raw);
  } catch (err) {
    console.warn("[VeloceWay] Couldn't read the cloud profile:", err);
    return local;
  }
  if (!cloud) {
    // First sign-in on a configured project: seed the cloud from this device.
    if (local.updatedAt) await saveProfile({});
    return local;
  }
  const winner = cloud.updatedAt > local.updatedAt ? cloud : local;
  writeLocal(uid, winner);
  return winner;
}

/** Planner-facing defaults. Never throws, so it is safe inside useState(). */
export function plannerDefaults(): UserProfile {
  return loadProfile();
}

/** Initials for the avatar chip — chosen name first, else the email's local part. */
export function initialsOf(name: string, email?: string | null): string {
  // Each candidate is trimmed before it gets a vote, so a name of spaces falls
  // through to the email instead of producing a blank chip.
  const source =
    (name || "").trim() || (email || "").split("@")[0].trim() || "traveler";
  const words = source.split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** The name to greet someone by, given the auth record and their profile. */
export function displayNameFor(
  profileName: string,
  email?: string | null,
): string {
  return profileName.trim() || (email || "").split("@")[0] || "Traveler";
}
