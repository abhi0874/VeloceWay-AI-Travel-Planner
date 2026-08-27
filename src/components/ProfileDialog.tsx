import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MapPin,
  RotateCcw,
  Send,
  User,
  X,
} from "lucide-react";
import {
  sendPasswordReset,
  signOutUser,
  updateDisplayName,
  watchAuth,
  type AuthUser,
} from "@/lib/firebase";
import {
  DEFAULT_PROFILE,
  LIMITS,
  displayNameFor,
  initialsOf,
  loadProfile,
  saveProfile,
  syncProfile,
  type UserProfile,
} from "@/lib/profile";
import { forgetHistorySession, isHistoryEnabled, refreshHistory } from "@/lib/history";
import { MOODS } from "@/lib/moods";
import {
  AUTH_CHANGED_EVENT,
  OPEN_PROFILE_EVENT,
  openPlanner,
  profileChanged,
} from "@/lib/events";
import type { BudgetId, TransportPref } from "@/lib/types";

const BUDGETS: { id: BudgetId; label: string }[] = [
  { id: "budget", label: "Budget" },
  { id: "mid", label: "Mid-range" },
  { id: "luxury", label: "Luxury" },
];

const TRANSPORTS: { id: TransportPref; label: string }[] = [
  { id: "any", label: "Any" },
  { id: "flight", label: "Flight" },
  { id: "train", label: "Train" },
  { id: "ownVehicle", label: "Own vehicle" },
];

/** "March 2026" from the auth record's creation time. */
function memberSince(createdAt?: string): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function signInMethod(providerId?: string): string {
  if (providerId === "google.com") return "Google";
  if (providerId === "password") return "Email and password";
  return providerId ? providerId.replace(/\.com$/, "") : "—";
}

const FIELD =
  "w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white text-[14px] outline-none placeholder-white/30 transition-colors focus:border-wandor-accent";
const LABEL = "block text-[12px] uppercase tracking-[0.14em] text-white/45 mb-2";
const CARD = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";

export default function ProfileDialog() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState<UserProfile>(DEFAULT_PROFILE);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [tripCount, setTripCount] = useState(0);
  /** Whether the account keeps a history at all — read back after the pull. */
  const [historyOn, setHistoryOn] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Track auth both ways: watchAuth for the initial resolve, the event for
  // sign-ins that happen while this component is already mounted.
  useEffect(() => {
    const unsub = watchAuth(setUser);
    const onAuth = (e: Event) =>
      setUser(((e as CustomEvent).detail as AuthUser | null) ?? null);
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
    return () => {
      unsub();
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      setError("");
      setNote("");
      setOpen(true);
    };
    window.addEventListener(OPEN_PROFILE_EVENT, handler);
    return () => window.removeEventListener(OPEN_PROFILE_EVENT, handler);
  }, []);

  /* Fill the form from the cache immediately, then reconcile with the cloud.
     The auth record's displayName is authoritative for the name, because that
     is what other sessions and Google sign-in supply. */
  useEffect(() => {
    if (!open) return;
    const local = loadProfile(user?.uid ?? null);
    const seeded = { ...local, displayName: user?.displayName || local.displayName };
    setForm(seeded);
    setSaved(seeded);
    if (!user) {
      setTripCount(0); // signed out there is no history anywhere to count
      setHistoryOn(false);
      return;
    }
    let live = true;
    /* The trip count comes from the account, not this device, so it has to be
       fetched — and it's only ever a count, never a reason to show an error. */
    void refreshHistory(user.uid)
      .then((list) => {
        if (!live) return;
        setTripCount(list.length);
        setHistoryOn(isHistoryEnabled());
      })
      .catch(() => {});
    void syncProfile(user.uid).then((merged) => {
      if (!live) return;
      const next = { ...merged, displayName: user.displayName || merged.displayName };
      setForm(next);
      setSaved(next);
    });
    return () => {
      live = false;
    };
  }, [open, user]);

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

  const dirty = useMemo(
    () => JSON.stringify({ ...form, updatedAt: 0 }) !== JSON.stringify({ ...saved, updatedAt: 0 }),
    [form, saved],
  );

  const set = <K extends keyof UserProfile>(k: K, v: UserProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const clampTo = (v: number, [min, max]: readonly [number, number]) =>
    Math.min(max, Math.max(min, v));

  const toggleMood = (id: string) =>
    setForm((f) => ({
      ...f,
      moods: f.moods.includes(id)
        ? f.moods.filter((m) => m !== id)
        : f.moods.length >= 6
          ? f.moods
          : [...f.moods, id],
    }));

  const save = async () => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const name = form.displayName.trim();
      // The auth record carries the name; the profile doc carries the defaults.
      if (user && name !== (user.displayName || "")) {
        const updated = await updateDisplayName(name);
        setUser(updated);
        window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: updated }));
      }
      const next = await saveProfile({ ...form, displayName: name });
      setForm(next);
      setSaved(next);
      profileChanged();
      setNote("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  };

  const resetLink = async () => {
    if (!user?.email) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      await sendPasswordReset(user.email);
      setNote(`Reset link sent to ${user.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link.");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    setBusy(true);
    try {
      await signOutUser();
      // Don't wait for the auth listener — drop the in-memory trips at once.
      forgetHistorySession();
      window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: null }));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign out.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const initials = initialsOf(form.displayName, user?.email ?? null);
  const greeting = displayNameFor(form.displayName, user?.email ?? null);
  const canResetPassword = Boolean(user?.email) && user?.providerId !== "google.com";

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center overflow-y-auto p-4 py-10">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
        className="relative w-full max-w-[560px] rounded-[24px] border border-white/15 bg-[#0b0b0b] shadow-[0_40px_120px_rgba(0,0,0,0.6)] outline-none p-6 md:p-8"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 bg-transparent border border-white/15 hover:border-white/40 rounded-full p-1.5 cursor-pointer text-white/60 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="stamp-label text-[12px] text-white/70">Your profile</p>

        {/* identity header */}
        <div className="mt-5 flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-wandor-accent text-white font-sans text-[20px] font-extrabold shadow-[0_10px_30px_rgba(230,59,46,0.4)]"
          >
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-white text-[20px] font-extrabold leading-tight">
              {greeting}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-white/55">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user?.email || "Not signed in"}</span>
            </p>
          </div>
        </div>

        {/* editable identity */}
        <div className="mt-6">
          <label className={LABEL} htmlFor="vw-profile-name">
            Display name
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
            <input
              id="vw-profile-name"
              type="text"
              value={form.displayName}
              maxLength={60}
              onChange={(e) => set("displayName", e.target.value)}
              placeholder="How should we address you?"
              className={`${FIELD} pl-11`}
            />
          </div>
          <p className="mt-2 text-[12px] text-white/35">
            This is the name shown across VeloceWay. Leave it blank to go by your email.
          </p>
        </div>

        <div className="mt-5">
          <label className={LABEL} htmlFor="vw-profile-email">
            Email <span className="normal-case tracking-normal">(can't be changed)</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
            <input
              id="vw-profile-email"
              type="email"
              value={user?.email || ""}
              readOnly
              disabled
              aria-describedby="vw-email-note"
              className={`${FIELD} pl-11 cursor-not-allowed text-white/50`}
            />
          </div>
          <p id="vw-email-note" className="mt-2 text-[12px] text-white/35">
            Your email identifies the account and keeps your saved trips attached to it.
          </p>
        </div>

        {/* planning defaults */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="stamp-label text-[12px] text-white/70">Trip defaults</p>
          <p className="mt-2 text-[12px] text-white/35">
            Every new plan starts from these. You can still change any of them per trip.
          </p>

          <div className="mt-5">
            <label className={LABEL} htmlFor="vw-profile-home">
              Usually travelling from
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wandor-accent" />
              <input
                id="vw-profile-home"
                type="text"
                value={form.homeCity}
                maxLength={80}
                onChange={(e) => set("homeCity", e.target.value)}
                placeholder="Bengaluru, India"
                className={`${FIELD} pl-11`}
              />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <Stepper
              label="Travelers"
              value={form.travelers}
              min={LIMITS.travelers[0]}
              max={LIMITS.travelers[1]}
              onChange={(v) => set("travelers", clampTo(v, LIMITS.travelers))}
            />
            <Stepper
              label="Days"
              value={form.days}
              min={LIMITS.days[0]}
              max={LIMITS.days[1]}
              onChange={(v) => set("days", clampTo(v, LIMITS.days))}
            />
          </div>

          <div className="mt-5">
            <span className={LABEL}>Budget level</span>
            <div className="flex rounded-xl border border-white/15 overflow-hidden">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => set("budget", b.id)}
                  aria-pressed={form.budget === b.id}
                  className={`flex-1 py-2.5 text-[13px] font-semibold cursor-pointer border-none transition-all ${
                    form.budget === b.id
                      ? "bg-wandor-accent text-white"
                      : "bg-transparent text-white/55 hover:text-white"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className={LABEL}>Preferred way to travel</span>
            <div className="flex flex-wrap gap-2">
              {TRANSPORTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set("transport", t.id)}
                  aria-pressed={form.transport === t.id}
                  className={`rounded-full border px-4 py-2 text-[13px] font-semibold cursor-pointer transition-all ${
                    form.transport === t.id
                      ? "border-wandor-accent bg-wandor-accent/15 text-white"
                      : "border-white/15 bg-transparent text-white/55 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <span className={LABEL}>
              Moods you travel for{" "}
              <span className="normal-case tracking-normal text-white/30">
                (up to 6)
              </span>
            </span>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((mood) => {
                const on = form.moods.includes(mood.id);
                const Icon = mood.icon;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => toggleMood(mood.id)}
                    aria-pressed={on}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-all ${
                      on
                        ? "border-wandor-accent bg-wandor-accent/15 text-white"
                        : "border-white/15 bg-transparent text-white/55 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* account facts — read-only */}
        <div className="mt-7 border-t border-white/10 pt-6">
          <p className="stamp-label text-[12px] text-white/70">Account</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className={CARD}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                Signed in with
              </p>
              <p className="mt-1.5 text-[14px] font-semibold text-white/90">
                {signInMethod(user?.providerId)}
              </p>
            </div>
            <div className={CARD}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                Traveller since
              </p>
              <p className="mt-1.5 text-[14px] font-semibold text-white/90">
                {memberSince(user?.createdAt)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openPlanner({ view: "history" });
            }}
            className={`${CARD} mt-3 flex w-full cursor-pointer items-center justify-between text-left hover:border-white/30 transition-all`}
          >
            <span>
              <span className="block text-[11px] uppercase tracking-[0.14em] text-white/40">
                Saved trips
              </span>
              <span className="mt-1.5 block text-[14px] font-semibold text-white/90">
                {!user
                  ? "Sign in to keep a history"
                  : historyOn
                    ? `${tripCount} ${tripCount === 1 ? "trip" : "trips"} in your history`
                    : "History is switched off"}
              </span>
            </span>
            <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-wandor-accent">
              Open
            </span>
          </button>
        </div>

        {/* actions */}
        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6">
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !dirty}
            className="w-full flex items-center justify-center gap-2 bg-wandor-accent hover:bg-[#c93326] disabled:opacity-45 text-white border-none cursor-pointer font-sans text-[13px] font-bold uppercase tracking-[0.08em] py-3.5 rounded-full transition-all active:scale-[0.99]"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {busy ? "Saving…" : "Save changes"}
          </button>

          <div className="flex flex-wrap gap-3">
            {dirty && (
              <button
                type="button"
                onClick={() => setForm(saved)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-3 text-[13px] font-semibold text-white/70 hover:border-white/40 hover:text-white cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Discard
              </button>
            )}
            {canResetPassword && (
              <button
                type="button"
                onClick={() => void resetLink()}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-3 text-[13px] font-semibold text-white/70 hover:border-white/40 hover:text-white cursor-pointer transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Change password
              </button>
            )}
            <button
              type="button"
              onClick={() => void leave()}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-transparent px-4 py-3 text-[13px] font-semibold text-white/70 hover:border-wandor-accent hover:text-wandor-accent cursor-pointer transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {note && (
          <p className="mt-4 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] p-3 text-[13px] text-white/85">
            <Check className="w-4 h-4 shrink-0 text-wandor-accent" />
            {note}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-xl border border-wandor-accent/50 bg-wandor-accent/10 p-3 text-[13px] leading-relaxed text-white/85">
            {error}
          </p>
        )}

        <p className="mt-5 border-t border-white/10 pt-4 text-[12px] leading-relaxed text-white/35">
          {user
            ? "Your profile travels with your account, so these preferences follow you to any device you sign in on."
            : "You're signed out — changes stay on this device until you sign in."}
        </p>
      </div>
    </div>
  );
}

/** Compact −/+ number control, matching the planner's own steppers. */
function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-transparent text-[18px] font-bold text-white/70 hover:border-white/40 hover:text-white disabled:opacity-35 cursor-pointer transition-all"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={String(value)}
          aria-label={label}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "");
            onChange(digits === "" ? min : Math.min(max, parseInt(digits, 10)));
          }}
          className="h-11 w-full rounded-xl border border-white/15 bg-white/[0.05] text-center text-[15px] font-bold text-white outline-none transition-colors focus:border-wandor-accent"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          aria-label={`More ${label.toLowerCase()}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-transparent text-[18px] font-bold text-white/70 hover:border-white/40 hover:text-white disabled:opacity-35 cursor-pointer transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
