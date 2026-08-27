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
  return { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
  currentUid = cred.user.uid;
  return { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName };
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const { auth, authMod } = await ensureFirebase();
  const provider = new authMod.GoogleAuthProvider();
  const cred = await authMod.signInWithPopup(auth, provider);
  currentUid = cred.user.uid;
  return { uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName };
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
        cb(u ? { uid: u.uid, email: u.email, displayName: u.displayName } : null);
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

export async function deleteAllCloudTrips(uid: string): Promise<void> {
  const { db, fsMod } = await ensureFirebase();
  const snap = await fsMod.getDocs(fsMod.collection(db, "users", uid, "trips"));
  await Promise.all(snap.docs.map((d: any) => fsMod.deleteDoc(fsMod.doc(db, "users", uid, "trips", d.id))));
}
