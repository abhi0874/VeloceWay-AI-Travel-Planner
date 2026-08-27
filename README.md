# VeloceWay — Where will you go next?

A cinematic, dark-themed travel planner. Visitors type a destination straight
into the hero and get a full AI-generated itinerary: cost estimates across
flight / train / own vehicle, tiered stays, a day-by-day route, nearby detours,
local transport, ranked attractions, packing and booking hints — plus a mood ×
season destination recommender and a contact section.

AI credentials live **only on the server** (env vars). Visitors never see or
manage keys — the UI contains no key, provider, or pricing talk.

Runtime dependencies are just `react`, `react-dom` and `lucide-react` — the map,
the geocoding and the API layer are all hand-rolled, so there is no heavy
install and no build-time native binaries.

---

## Quickstart

```bash
npm install
cp .env.example .env    # then set GEMINI_API_KEY (server-side only)
npm run dev             # API (:8787) + web (:5173) together
```

Open http://localhost:5173. Without a key the app still runs on built-in
sample content (a 7-day Kyoto plan + sample suggestions), clearly labeled as a
demo inside the UI.

## Server-side key (the only key)

1. Create a free Gemini key at https://aistudio.google.com/apikey.
   ⚠️ Never link a billing account — the free tier doesn't need one.
2. Put it in `.env` as `GEMINI_API_KEY=…`. Optionally set `GEMINI_MODEL`
   (default `gemini-3.6-flash`; use whatever Flash id your AI Studio console
   lists) and `AI_PROVIDER` (`gemini` default, `grok` supported but xAI has no
   permanent free tier).

## Deploy (backend included — static-only won't work)

- **Vercel (recommended):** push to GitHub → import on vercel.com. Zero config
  (`vercel.json` + `api/*.mjs` are wired). Add `GEMINI_API_KEY` in env vars.
- **Netlify:** same repo import; `netlify.toml` + `netlify/functions/*` wired.
  Add `GEMINI_API_KEY` in site env vars.
- **Render / any Node host:** build `npm run build`, start
  `node server/index.mjs`, set env vars, point `VITE_API_URL` at it.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | server-side AI key |
| `GROK_API_KEY` | — | optional xAI key |
| `AI_PROVIDER` | `gemini` | `gemini` or `grok` |
| `GEMINI_MODEL` | `gemini-3.6-flash` | any current Flash id |
| `GROK_MODEL` | `grok-4.3` | xAI model id |
| `PORT` | `8787` | local API port |
| `WANDOR_ALLOW_MOCK` | `1` | demo content when no key is set; `0` disables |
| `VITE_API_URL` | — | absolute URL of a hosted backend (build-time) |
| `VITE_FIREBASE_API_KEY` etc. | — | optional accounts + cloud trip sync (see `FIREBASE_SETUP.md`) |

## Customizing the contact section

Contact details are constants at the top of `ContactSection` in
`src/components/Sections.tsx`: `CONTACT_EMAIL`, `CONTACT_PHONE`,
`CONTACT_PHONE_HREF`, plus the Instagram/YouTube links and the hours line.
Replace the placeholders before going live.

## Feature map

- **Hero** — cinematic still (`src/assets/hero.jpg`) with a slow ken-burns drift
  and scrim, red-dot wordmark, giant "VISIT …" headline that live-updates with
  the destination you type, three quick facts, destination search bar with
  popular chips, account chip, scroll hint with progress hairline.
- **Planner overlay** — destination field (authoritative) + optional free text +
  moods + month + days + travelers + budget + transport preference → structured
  plan. Loading state: CSS-3D wireframe globe with an orbiting plane.
- **Results** — travel options compared boarding-pass style, per-tier totals,
  day-by-day timeline, stays by tier, ranked attractions, nearby detours, local
  transport costs, season notes, packing list, booking deep-links (Google
  Flights, IRCTC/RedBus for India, Seat61, Booking.com).
- **Mood × season explorer** — ranked recommendation cards with 3D tilt + glare.
- **Contact** — email, phone, hours, socials, and a mailto-powered message form.
- **Demo mode** — without a key, everything works on built-in sample content.

### The planner features, one by one

| # | Feature | Where it lives |
|---|---|---|
| 1 | Routes & distances per transport mode, with cheapest/fastest verdicts and a notice when road/rail isn't possible | `shared/prompts.mjs` (`routes` schema) → `ResultView.tsx` |
| 2 | Trip history, kept in the traveler's account with an on/off switch; each entry shows its total cost | `src/lib/history.ts`, `HistoryView` in `PlannerOverlay.tsx` |
| 3 | City map of the destination, Google-Maps-dark styling | `src/components/planner/CityMap.tsx` (library-free slippy map) |
| 4 | Days-to-stay stepper | `PlannerOverlay.tsx` |
| 5 | Travelers stepper (1–100) | `PlannerOverlay.tsx` |
| 6 | Destination typo tolerance — "did you mean …?" | `src/lib/places.ts` |
| 7 | Sign in / sign up + cloud trip sync | `src/components/AuthDialog.tsx`, `src/lib/firebase.ts`, `FIREBASE_SETUP.md` |
| 8 | Traveler profile — editable display name, read-only email, saved trip defaults | `src/components/ProfileDialog.tsx`, `src/lib/profile.ts` |

## Accounts

Sign-in and trip history run on Firebase Auth + Firestore, loaded lazily from
Google's CDN — nothing to `npm install`. Set the `VITE_FIREBASE_*` values in
`.env` and follow `FIREBASE_SETUP.md` (two console toggles and one Firestore
rule). Planning itself works with no account at all; trip history is the one
feature that needs one, because it is stored in the account and never on the
device.

### Trip history

History is cloud-only, on purpose. Saved trips live at
`users/{uid}/trips/{tripId}` and the on/off switch at
`users/{uid}/settings/history` — nothing is written to `localStorage`, cookies
or IndexedDB. The only copy in the browser is an in-memory mirror that exists
while the tab is open, so:

- signed out there is no history at all, and the History view offers a sign-in;
- switching the toggle off deletes every saved trip from the account;
- the newest eight trips are kept, one per destination, and extras are deleted
  from Firestore too.

### Profile

Once signed in, the hero's top-right corner becomes a round initials button.
Clicking it opens the profile panel, where a traveler can set the name they want
to be greeted by and the defaults every new trip starts from — home city,
travelers, days, budget level, preferred way to travel and up to six moods. Their
email is shown but locked: it identifies the account and keeps saved trips
attached to it.

The name is written to the Firebase auth record (so it survives on any device),
while the defaults live in `localStorage` under `veloceway:profile:v1:{uid}` and,
when signed in, mirror to Firestore at `users/{uid}/profile/main`. Both reads and
writes degrade quietly: a blocked or offline Firestore just means the profile is
saved on that device only, which is why the setup guide's rule must cover
`users/{uid}/{document=**}` and not trips alone.

## Troubleshooting

- **`429`** — provider quota; wait a minute (resets midnight Pacific).
- **`400 FAILED_PRECONDITION`** — the key's Google account region may not
  include Gemini's free API tier; try a different account.
- **`404` on generate** — wrong `GEMINI_MODEL` id; check AI Studio's model list.
- **"Can't reach the planning service"** — backend not running (`npm run dev`)
  or not deployed; the UI falls back to demo content either way.

## Stack

Vite 5 · React 18 · TypeScript · Tailwind CSS 3 · lucide-react · one shared
prompt/provider core (`shared/*.mjs`) reused by the node server, Vercel and
Netlify functions.
