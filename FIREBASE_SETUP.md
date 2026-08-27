# Firebase setup — sign-in/sign-up + cloud trip history (free)

Takes about 10 minutes. Everything runs on Firebase's **Spark (free) plan** —
no credit card, ever. If Firebase ever asks you to upgrade, you can say no;
everything in VeloceWay works within the free limits.

---

## 1. Create the project

1. Go to https://console.firebase.google.com and click **Create a project**.
2. Name it (e.g. `veloceway`). Google Analytics: optional — off is fine.
3. Wait for it to finish, then open the project.

## 2. Register the web app & copy your keys

1. On the project overview, click the **web** icon `</>`.
2. Nickname it `veloceway-web` → **Register app**.
3. Firebase shows a `firebaseConfig` object. Copy the four values into
   `.env` in this project:

```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=veloceway.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=veloceway
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

4. Restart the dev server (`Ctrl+C` → `npm run dev`) so the env loads.

> You do NOT need to `npm install firebase` — VeloceWay loads the SDK
> straight from Google's CDN when it's needed.

## 3. Turn on sign-in methods

1. Firebase Console → **Authentication** → **Get started**.
2. **Sign-in method** tab → enable **Email/Password** → Save.
3. Enable **Google** → Save (pick a support email when asked).

## 4. Create the Firestore database

1. Firebase Console → **Firestore Database** → **Create database**.
2. Choose **Production mode**, pick a location near your users → **Enable**.
3. Open the **Rules** tab and replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/trips/{tripId} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

4. **Publish**. This means: users can only ever read/write their own trips.

## 5. Try it

Sign up from the hero's **Sign up** button, plan a trip with history on, then
check Firestore Console → you'll see `users/{uid}/trips/...` documents. Sign
in on another device and the same trips appear.

## Free-tier headroom (Spark plan)

| What | Free daily limit |
|---|---|
| Auth users | unlimited (email/Google) |
| Firestore reads | 50,000 / day |
| Firestore writes | 20,000 / day |
| Firestore storage | 1 GiB |

A trip history entry is a few KB — even heavy daily use stays far below this.

## Troubleshooting

- **`auth/configuration-not-found`** — Authentication isn't enabled yet (step 3).
- **`auth/unauthorized-domain`** — you're on a domain Firebase doesn't know
  (e.g. your deployed site). Authentication → Settings → **Authorized domains**
  → Add domain.
- **`auth/operation-not-allowed`** — the sign-in provider isn't enabled (step 3).
- **Permission denied on Firestore** — the rules from step 4 aren't published.
