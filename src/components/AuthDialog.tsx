import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  isFirebaseConfigured,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  watchAuth,
  type AuthUser,
} from "@/lib/firebase";
import { forgetHistorySession, refreshHistory } from "@/lib/history";
import { syncProfile } from "@/lib/profile";
import { AUTH_CHANGED_EVENT, OPEN_AUTH_EVENT, profileChanged } from "@/lib/events";

type Mode = "signin" | "signup";

export default function AuthDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const loadedFor = useRef<string | null>(null);

  /* Auth state, plus the two things that follow an account rather than a
     device: the trip history (which now lives only in Firestore) and the
     traveller's profile. Signing out drops the session mirror on the spot. */
  useEffect(() => {
    const unsub = watchAuth((u) => {
      setUser(u);
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: u }));
      if (u && u.uid !== loadedFor.current) {
        loadedFor.current = u.uid;
        void refreshHistory(u.uid);
        // The profile follows the account, so the hero chip and the planner's
        // defaults are already right on a device this traveler has never used.
        syncProfile(u.uid).then(profileChanged).catch(() => {});
      }
      if (!u) {
        loadedFor.current = null;
        forgetHistorySession();
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { mode?: Mode } | undefined;
      setMode(detail?.mode === "signup" ? "signup" : "signin");
      setError("");
      setOpen(true);
    };
    window.addEventListener(OPEN_AUTH_EVENT, handler);
    return () => window.removeEventListener(OPEN_AUTH_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const finish = (u: AuthUser) => {
    setUser(u);
    loadedFor.current = u.uid;
    void refreshHistory(u.uid);
    window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: u }));
    setOpen(false);
    setEmail("");
    setPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u =
        mode === "signup"
          ? await signUpWithEmail(email.trim(), password)
          : await signInWithEmail(email.trim(), password);
      finish(u);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/i, "") : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      const u = await signInWithGoogle();
      finish(u);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/i, "") : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;
  if (user) return null; // signed in — hero shows the account chip

  const configured = isFirebaseConfigured();

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "signup" ? "Sign up" : "Sign in"}
        className="relative w-full max-w-[420px] rounded-[24px] border border-white/15 bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.6)] outline-none p-6 md:p-8"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 bg-transparent border border-white/15 hover:border-white/40 rounded-full p-1.5 cursor-pointer text-white/60 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="stamp-label text-[12px] text-white/70">VeloceWay account</p>

        {!configured ? (
          <div className="mt-5 rounded-2xl border border-wandor-accent/50 bg-wandor-accent/10 p-5">
            <p className="text-white/85 text-sm leading-relaxed">
              <span className="font-semibold text-wandor-accent">
                VeloceWay accounts are opening soon.
              </span>{" "}
              Saved trips will follow you across devices once they do.
            </p>
            <p className="mt-3 text-white/50 text-[13px] leading-relaxed">
              Planning works exactly the same in the meantime — trip history is
              the one thing that waits for an account, because it's kept there
              rather than on your device.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex rounded-xl border border-white/15 overflow-hidden">
              {(
                [
                  { id: "signin", label: "Sign in" },
                  { id: "signup", label: "Sign up" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setMode(t.id);
                    setError("");
                  }}
                  aria-pressed={mode === t.id}
                  className={`flex-1 py-2.5 text-[13px] font-semibold cursor-pointer border-none bg-transparent transition-all ${
                    mode === t.id
                      ? "bg-wandor-accent text-white"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
              />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent"
              />
              <button
                type="submit"
                disabled={busy}
                className="mt-1 w-full flex items-center justify-center gap-2 bg-wandor-accent hover:bg-[#c93326] disabled:opacity-60 text-white border-none cursor-pointer font-sans text-[13px] font-bold uppercase tracking-[0.08em] py-3.5 rounded-full transition-all active:scale-[0.99]"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-white/30 text-[12px]">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 disabled:opacity-60 text-[#1a1a1a] border-none cursor-pointer font-sans text-[13px] font-semibold py-3 rounded-full transition-all active:scale-[0.99]"
            >
              <span className="font-bold text-[#4285F4]">G</span>
              Continue with Google
            </button>

            {error && (
              <p className="mt-4 rounded-xl border border-wandor-accent/50 bg-wandor-accent/10 p-3 text-[13px] text-white/85 leading-relaxed">
                {error}
              </p>
            )}

            <p className="mt-5 text-[12px] text-white/35 leading-relaxed border-t border-white/10 pt-4">
              Your trip history is kept in your own private account — nothing is
              stored on this device — so it's there on every device you sign in
              on. Passwords are handled by Firebase; VeloceWay never sees them.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
