/**
 * Firebase auth + Firestore trip sync — loaded lazily from Google's CDN.
 *
 * Why CDN instead of npm: zero installs, zero bundle weight, and the app
 * runs perfectly without Firebase until you add your keys to .env.
 * (See FIREBASE_SETUP.md for the 10-minute setup.)
 *
 * Config comes from VITE_FIREBASE_* env vars — server-side-safe because
 * these are public web keys by design (security comes from Firestore rules).
 */

import type { TripHistoryEntry } from "./history";

const SDK = "https://www.gstatic.com/firebasejs/10.12.5";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** "password", "google.com", … — the profile shows how they signed in. */
  providerId?: string;
  /** ISO string from the auth record; powers "traveller since". */
  createdAt?: string;
}

/** Shapes an SDK user object into the app's own AuthUser. */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function toAuthUser(u: any): AuthUser {
  return {
    uid: u.uid,
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    providerId: u.providerData?.[0]?.providerId || "password",
    createdAt: u.metadata?.creationTime || undefined,
  };
}

let currentUid: string | null = null;

/** Signed-in uid (null when Firebase isn't configured or nobody's signed in). */
export function getSignedInUid(): string | null {
  return currentUid;
}

export function firebaseConfig() {
  const env = import.meta.env;
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
    // Optional — auth + Firestore work without these, so they never gate setup.
    ...(env.VITE_FIREBASE_STORAGE_BUCKET
      ? { storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string }
      : {}),
    ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID
      ? { messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string }
      : {}),
    ...(env.VITE_FIREBASE_MEASUREMENT_ID
      ? { measurementId: env.VITE_FIREBASE_MEASUREMENT_ID as string }
      : {}),
  };
  return cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId ? cfg : null;
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig() !== null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
let cache: { auth: any; db: any; authMod: any; fsMod: any } | null = null;

async function ensureFirebase(): Promise<{ auth: any; db: any; authMod: any; fsMod: any }> {
  if (cache) return cache;
  const cfg = firebaseConfig();
  if (!cfg) {
    // Owner-facing detail belongs in the console, never in the visitor's dialog.
    console.warn(
      "[VeloceWay] Accounts are disabled: no VITE_FIREBASE_* values found. See FIREBASE_SETUP.md.",
    );
    throw new Error("VeloceWay accounts aren't switched on yet.");
  }

  const [appMod, authMod, fsMod] = await Promise.all([
    import(/* @vite-ignore */ `${SDK}/firebase-app.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-auth.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`),
  ]);

  const app = appMod.getApps().length ? appMod.getApps()[0] : appMod.initializeApp(cfg);
  cache = {
    auth: authMod.getAuth(app),
    db: fsMod.getFirestore(app),
    authMod,
    fsMod,
  };
  return cache;
}

function friendlyAuthError(err: any): string {
  const code = String(err?.code || "");
  if (code.includes("email-already-in-use"))
    return "That email already has an account — sign in instead.";
  if (code.includes("invalid-email")) return "That email address doesn't look right.";
  if (code.includes("weak-password"))
    return "Password too weak — use at least 6 characters.";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found"))
    return "Email or password is incorrect.";
  if (code.includes("too-many-requests"))
    return "Too many attempts — wait a minute and try again.";
  if (code.includes("popup-closed-by-user"))
    return "Google sign-in was closed before finishing.";
  if (code.includes("operation-not-allowed"))
    return "Enable this sign-in method in Firebase Console → Authentication.";
  return err?.message || "Something went wrong. Try again.";
}

/* ── auth ─────────────────────────────────────────────────────────────── */

export async function signUpWithEmail(email: string, password: string): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
  currentUid = cred.user.uid;
  return toAuthUser(cred.user);
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  currentUid = cred.user.uid;
  return toAuthUser(cred.user);
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const provider = new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, provider);
  currentUid = cred.user.uid;
  return toAuthUser(cred.user);
}

/**
 * Renames the signed-in traveller on the auth record itself, so every future
 * session sees the chosen name. Firebase does NOT fire onAuthStateChanged for a
 * profile edit, so callers must announce the change themselves.
 */
export async function updateDisplayName(name: string): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const user = auth.currentUser;
  if (!user) throw new Error("You're signed out — sign in again to change your name.");
  await authMod.updateProfile(user, { displayName: name });
  await user.reload?.();
  return toAuthUser(auth.currentUser || user);
}

/** Emails a reset link. Only meaningful for password accounts. */
export async function sendPasswordReset(email: string): Promise<void> {
  const { auth, authMod } = await ensureFirebase();
  try {
    await authMod.sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw new Error(friendlyAuthError(err));
  }
}

export async function signOutUser(): Promise<void> {
  const { auth, authMod } = await ensureFirebase();
  currentUid = null;
  await authMod.signOut(auth);
}

/** Subscribes to auth changes. Returns an unsubscribe function. */
export function watchAuth(cb: (user: AuthUser | null) => void): () => void {
  if (!isFirebaseConfigured()) {
    cb(null);
    return () => {};
  }
  let unsub = () => {};
  let cancelled = false;
  ensureFirebase()
    .then(({ auth, authMod }) => {
      if (cancelled) return;
      unsub = authMod.onAuthStateChanged(auth, (u: any) => {
        currentUid = u ? u.uid : null;
        cb(u ? toAuthUser(u) : null);
      });
    })
    .catch(() => cb(null));
  return () => {
    cancelled = true;
    unsub();
  };
}

/* ── Firestore trip sync (users/{uid}/trips/{tripId}) ─────────────────── */

function sanitize(entry: TripHistoryEntry): Record<string, unknown> {
  // Firestore rejects `undefined` — JSON round-trip strips those safely.
  return JSON.parse(JSON.stringify(entry));
}

export async function pullCloudTrips(uid: string): Promise<TripHistoryEntry[]> {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDocs(fsMod.collection(db, "users", uid, "trips"));
  return snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as object) })) as TripHistoryEntry[];
}

export async function pushCloudTrip(uid: string, entry: TripHistoryEntry): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  await fsMod.setDoc(
    fsMod.doc(db, "users", uid, "trips", entry.id),
    sanitize(entry),
    { merge: true },
  );
}

export async function pushCloudTrips(uid: string, entries: TripHistoryEntry[]): Promise<void> {
  await Promise.all(entries.map((e) => pushCloudTrip(uid, e)));
}

export async function deleteCloudTrip(uid: string, tripId: string): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  await fsMod.deleteDoc(fsMod.doc(db, "users", uid, "trips", tripId));
}

export async function deleteAllCloudTrips(uid: string): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDocs(fsMod.collection(db, "users", uid, "trips"));
  await Promise.all(snap.docs.map((d: any) => fsMod.deleteDoc(fsMod.doc(db, "users", uid, "trips", d.id))));
}

/* ── Firestore history preference (users/{uid}/settings/history) ───────── */

/**
 * The on/off switch lives in the account, not the browser: history itself is
 * cloud-only, so the preference that governs it has no business on the disk
 * either. `null` means "never set" — callers fall back to on.
 */
export async function pullHistoryPref(uid: string): Promise<boolean | null> {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDoc(fsMod.doc(db, "users", uid, "settings", "history"));
  if (!snap.exists()) return null;
  const value = (snap.data() as { enabled?: unknown }).enabled;
  return typeof value === "boolean" ? value : null;
}

export async function pushHistoryPref(uid: string, enabled: boolean): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  await fsMod.setDoc(
    fsMod.doc(db, "users", uid, "settings", "history"),
    { enabled },
    { merge: true },
  );
}

/* ── Firestore profile (users/{uid}/profile/main) ─────────────────────── */

/**
 * A single document rather than a field on `users/{uid}`, so one rule covering
 * `users/{uid}/{document=**}` protects trips and profile alike.
 */
export async function pullCloudProfile(uid: string): Promise<Record<string, unknown> | null> {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDoc(fsMod.doc(db, "users", uid, "profile", "main"));
  return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
}

export async function pushCloudProfile(
  uid: string,
  profile: Record<string, unknown>,
): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  await fsMod.setDoc(
    fsMod.doc(db, "users", uid, "profile", "main"),
    JSON.parse(JSON.stringify(profile)), // Firestore rejects `undefined`
    { merge: true },
  );
}
