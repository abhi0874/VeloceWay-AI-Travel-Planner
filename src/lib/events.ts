/**
 * Tiny app-level event bus — lets the hero's destination picker and other
 * CTAs drive the planner without prop drilling.
 */

export const OPEN_PLANNER_EVENT = "veloceway:open-planner";
export const OPEN_AUTH_EVENT = "veloceway:open-auth";
export const OPEN_PROFILE_EVENT = "veloceway:open-profile";
export const AUTH_CHANGED_EVENT = "veloceway:auth-changed";
export const PROFILE_CHANGED_EVENT = "veloceway:profile-changed";
export const TRIPS_CHANGED_EVENT = "veloceway:trips-changed";

export interface OpenPlannerDetail {
  prompt?: string;
  destination?: string;
  source?: string;
  inspirationName?: string;
  /** open the planner directly on this view (e.g. "history") */
  view?: "planner" | "history";
}

export function openPlanner(detail: OpenPlannerDetail = {}): void {
  window.dispatchEvent(new CustomEvent(OPEN_PLANNER_EVENT, { detail }));
}

export function openAuth(mode: "signin" | "signup" = "signin"): void {
  window.dispatchEvent(new CustomEvent(OPEN_AUTH_EVENT, { detail: { mode } }));
}

/** Opens the profile panel. No-op visually when nobody is signed in. */
export function openProfile(): void {
  window.dispatchEvent(new CustomEvent(OPEN_PROFILE_EVENT));
}

/** Announces a saved profile so the hero chip and planner defaults refresh. */
export function profileChanged(): void {
  window.dispatchEvent(new CustomEvent(PROFILE_CHANGED_EVENT));
}

export function onOpenPlanner(
  cb: (detail: OpenPlannerDetail) => void,
): () => void {
  const handler = (e: Event) =>
    cb(((e as CustomEvent).detail as OpenPlannerDetail) || {});
  window.addEventListener(OPEN_PLANNER_EVENT, handler);
  return () => window.removeEventListener(OPEN_PLANNER_EVENT, handler);
}
