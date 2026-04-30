# Ayumu — Project Context

> **Last Updated:** 2026-05-01  
> **Purpose:** Save the complete Ayumu project analysis for future session continuity.

---

## 1. Project Overview

**Name:** Ayumu  
**Type:** Full-stack JLPT (Japanese Language Proficiency Test) practice exam application  
**Stack:**
- **Frontend:** Vue 3 + Vite + Tailwind CSS v4 + Pinia + Vue Router
- **Backend:** Node.js + Express + CORS + Cookie Parser
- **Database:** Supabase (Postgres) + Supabase Auth (Discord OAuth)
- **Bot:** Rust (serenity + poise) — separate repo: `Rust-Yuyuko`
- **Package Manager:** npm

**Ports:**
- Frontend dev server: `http://localhost:3000`
- Backend API: `http://localhost:5000`
- Vite proxies `/api/*` to backend during development.

---

## 2. Directory Tree

```text
Ayumu/
├── Client/                    # Vue 3 Frontend
│   ├── src/
│   │   ├── main.js            # Entry: createApp, Pinia, Router, auth init
│   │   ├── App.vue            # Root layout, theme init, <router-view>
│   │   ├── style.css          # Tailwind v4 + custom theme (gray palette) + dark variant
│   │   ├── router/
│   │   │   └── index.js       # 5 routes: /, /exam/:code, /results/:code, /profile, /leaderboard
│   │   ├── store/
│   │   │   ├── session.js     # Pinia store for API sessions (+ JWT headers)
│   │   │   └── auth.js        # Pinia store for Supabase Auth (Discord OAuth)
│   │   ├── composables/
│   │   │   └── useTheme.js    # Dark/light theme toggle (localStorage + system pref)
│   │   ├── lib/
│   │   │   └── supabase.js    # Supabase client singleton
│   │   ├── views/
│   │   │   ├── LandingPage.vue     # Dashboard: exam start, stats card, leaderboard card
│   │   │   ├── ExamPage.vue        # Responsive: QuestionArea + mobile overlay QuestionMap
│   │   │   ├── ResultsPage.vue     # Scorecard, accuracy, time, achievements
│   │   │   ├── ProfilePage.vue     # Auth-aware: Discord avatar, stats, claim flow, achievements
│   │   │   └── LeaderboardPage.vue # Full leaderboard with period/level filters
│   │   └── components/
│   │       ├── QuestionArea.vue    # Prompt, passage, images, audio player, 4-option grid
│   │       ├── QuestionMap.vue     # Collapsible sections, question grid, flagged/answered status
│   │       └── Toast.vue           # Fixed-position notification toast
│   ├── index.html
│   ├── vite.config.js         # Port 3000, proxy /api -> localhost:5000
│   ├── postcss.config.js
│   └── package.json           # Vue 3.5, Tailwind 4, Pinia 3, Vue Router 4, @supabase/supabase-js
│
├── Server/                    # Express Backend
│   ├── index.js               # Main server. Core quiz logic + package generation
│   ├── routes/
│   │   ├── sessions.js        # Exam session CRUD, scoring, streaks, achievements, claim
│   │   └── profile.js         # User profile, leaderboard, ranks
│   ├── middleware/
│   │   └── auth.js            # User resolution: Discord bot / Supabase Auth JWT / Anonymous cookie
│   ├── migrations/
│   │   └── 001_user_system.sql # Users, sessions, results, stats, streaks, achievements, triggers
│   ├── .env / .env.example
│   └── package.json           # express, cors, jose (JWT verification), pg
│
├── .agents/                   # Agent configuration / project context / skills
├── docs/                      # Project analysis docs
├── package.json               # Root deps: cookie-parser, nanoid
└── .gitignore
```

---

## 3. Frontend Summary

### Router (`Client/src/router/index.js`)
| Path | Name | Component |
|------|------|-----------|
| `/` | home | LandingPage (dashboard) |
| `/exam/:sessionCode` | exam | ExamPage (responsive, mobile overlay) |
| `/results/:sessionCode` | results | ResultsPage |
| `/profile` | profile | ProfilePage (auth-aware) |
| `/leaderboard` | leaderboard | LeaderboardPage (period/level filters) |

### Stores

#### `session.js` (Pinia)
- State: `sessionCode`, `session`, `questions`, `currentIndex`, `userAnswers`, `flaggedQuestions`, `isLoading`, `isSubmitting`, `submitResult`, `error`
- Computed: `currentQuestion`, `totalQuestions`, `answeredCount`, `progress`, `flaggedCount`, `sectionBreakdown`
- Actions: `createSession`, `loadSession`, `saveAnswer`, `submitSession`, `nextQuestion`, `prevQuestion`, `goToQuestion`, `toggleFlag`, `isFlagged`, `reset`
- **Sends `Authorization: Bearer <jwt>` header on all API requests when authenticated**

#### `auth.js` (Pinia)
- State: `user`, `session`, `isLoading`
- Computed: `isAuthenticated`, `accessToken`, `discordUsername`, `discordAvatar`
- Actions: `init()` (calls `getSession` + sets up `onAuthStateChange`), `signInWithDiscord()`, `signOut()`

### Composable: `useTheme.js`
- `isDark` ref, `toggleTheme()` function
- Persists to `localStorage` (`ayumu_theme`)
- Falls back to system `prefers-color-scheme` on first visit
- Theme toggle (☀/🌙) in header of all pages

### Views

#### LandingPage.vue (dashboard)
- Header: AYUMU logo + theme toggle + Leaderboard link + user avatar + sign in/out
- **Start Exam card:** Level grid (N5–N1) + "Start Exam" button
- **Your Stats card** (auth only): Exams, streak, avg %, best score, rank, XP
- **Sign In card** (anon only): Discord logo + CTA + sign-in button
- **Leaderboard card:** Top 5 entries, link to full board
- Responsive: single column on mobile, 2-col grid on md+

#### ExamPage.vue (responsive)
- **Desktop:** Split layout — QuestionArea (left) + QuestionMap sidebar (right, 280px)
- **Tablet:** Same but sidebar narrower (224px)
- **Mobile:** Single column, sidebar becomes full-screen overlay triggered by ☰ button
- Header: AYUMU. + section label + timer + ☰ navigator + EXIT
- Uses `Teleport` for mobile QuestionMap overlay
- Replaced native `confirm()` with inline modal dialog for submit/exit

#### LeaderboardPage.vue
- Period tabs: All-time / Monthly / Weekly
- Level filter dropdown: All / N1–N5
- Ranked list with trophy icons (🥇🥈🥉) for top 3
- Fetches `GET /api/leaderboard?limit=50`

#### ProfilePage.vue
- Auth-aware: shows Discord avatar when signed in
- Anonymous prompt: "Sign in with Discord to save your progress permanently"
- **Claim flow:** When authenticated, shows "Claim Progress" button to transfer anonymous data
- Stats, achievements, recent results — same as before

### Components

#### QuestionArea.vue
- Displays: question number badge, context (uppercase), prompt, passage, images, audio player
- **Audio player:** Play/pause toggle, progress bar (seek visual), time display, mute toggle + volume slider
- **Fixed scoring bug:** Sends `opt.value` (original `option_value`) not `opt.id` (display index)
- Options grid with selected state highlighting
- Flag for review button with amber badge

#### QuestionMap.vue
- Section-collapsible navigator (Grammar, Reading, Listening)
- 6-col grid of question numbers
- Color coding: current (gray), answered (emerald), flagged (amber), unanswered (white)
- Answered count / total + progress bar
- "FINISH ASSESSMENT" button → emits `submit` via `defineEmits`

#### Toast.vue
- Fixed top-right notification with auto-dismiss (4s)
- Types: success (emerald), error (red), info (blue), warning (yellow)

---

## 4. Backend Summary

### Auth Middleware (`Server/middleware/auth.js`)

**Priority (updated):**
1. `X-Discord-User-Id` header → looks up/creates user by `discord_id` (bot path)
2. `Authorization: Bearer <jwt>` → verifies JWT via Supabase JWKS endpoint using `jose`, resolves `auth_id`
3. Anonymous cookie `ayumu_tanin_id` → 7-day httpOnly cookie, auto-creates anonymous user

**JWT Verification:** Uses `createRemoteJWKSet` against `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`. No `SUPABASE_JWT_SECRET` needed — works with any algorithm (ES256/RS256/HS256).

### Session Routes (`Server/routes/sessions.js`)

- `POST /api/sessions/claim` — now reads anonymous UUID from `ayumu_tanin_id` cookie (no body required). Clears cookie after successful claim. Verifies target user is not anonymous.
- Fixed Supabase query bugs: `updateStreak` (`,`→`&` + missing `eq.`) and `checkAchievements` (duplicate `select=count`)

### Profile Routes (`Server/routes/profile.js`)
- `GET /api/leaderboard?period=alltime&level=N3&limit=50` — filtering by period and level

### Database - `handle_new_user()` trigger
- Updated to populate `discord_id` from `raw_user_meta_data.provider_id` (Discord OAuth snowflake)
- This links Supabase Auth users to the same `discord_id` column the bot uses

---

## 5. Discord Bot Integration (Rust-Yuyuko)

Located at `D:\Programming\Open Source\Rust-Yuyuko` (separate repo).

### Commands
| Command | Description |
|---------|-------------|
| `y!exam N5` / `/exam` | Creates JLPT exam session via Ayumu API, returns web link |
| `y!profile` / `/profile` | Shows Discord user's Ayumu stats, rank, achievements |
| `y!leaderboard` / `/leaderboard` | JLPT leaderboard |

### Integration
- Sends `X-Discord-User-Id: <discord_snowflake>` header to Ayumu API
- Auto-creates users on first use (via `resolveUser` middleware priority 1)
- Exam link opens in web — anonymous in browser, but results flow to Discord user via session ownership
- Requires `firebase-key.json` (placeholder works for Ayumu-only testing)

### Setup
```powershell
# .env
DISCORD_TOKEN=<bot-token>
AYUMU_API_URL=http://localhost:5000
RUST_LOG=ayumi_rs=debug

cargo run --release
```

---

## 6. Supabase Auth (Discord OAuth)

### Flow
1. User clicks "Sign in with Discord" → Supabase Auth Discord OAuth redirect
2. After authorization, `handle_new_user()` trigger creates `public.users` row with `discord_id`
3. Frontend stores JWT in session
4. All subsequent API calls include `Authorization: Bearer <jwt>` header
5. Backend `resolveUser` (priority 2) verifies JWT via JWKS, resolves `req.userId`

### Trigger: `handle_new_user()`
```sql
INSERT INTO public.users (id, auth_id, discord_id, username, display_name, avatar_url, is_anonymous)
VALUES (NEW.id, NEW.id, NEW.raw_user_meta_data->>'provider_id', ...)
```

### Identity Unification
```
Bot path:  X-Discord-User-Id → lookup by discord_id
Web path:  Supabase JWT       → lookup by auth_id → same row (discord_id set by trigger)
```

Both paths resolve to the same `public.users` row.

---

## 7. API Endpoints Reference

```
GET    /api/health
GET    /api

GET    /api/metadata
GET    /api/exercises?level=N5&section=grammar
GET    /api/exercises/:id/quiz
POST   /api/questions/:id/answer

GET    /api/packages?level=N3&userKey=test
POST   /api/packages
GET    /api/packages/:id/quiz

POST   /api/sessions
GET    /api/sessions/:code
POST   /api/sessions/:code/answer
POST   /api/sessions/:code/submit
POST   /api/sessions/claim            # Reads anon cookie, no body required

GET    /api/profile
GET    /api/leaderboard?level=&period=alltime|weekly|monthly&limit=10
GET    /api/leaderboard/:userId/rank
```

---

## 8. Environment & Configuration

### Client `.env`
```
VITE_SUPABASE_URL=https://kjulcuhfrmlzezfyvapn.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Server `.env`
```
SUPABASE_URL=https://kjulcuhfrmlzezfyvapn.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
CLIENT_URL=http://localhost:3000
PORT=5000
```

### Vite Proxy (`Client/vite.config.js`)
```js
proxy: {
  '/api': { target: 'http://localhost:5000', changeOrigin: true }
}
```

---

## 9. Known Issues & TODOs

| Issue | Severity | Details |
|-------|----------|---------|
| Service Role Key | High | Was previously shared. Rotate before production. |
| Supabase Auth redirect URL | Medium | Currently set for local dev. Needs production URL in Discord OAuth2 app. |
| No tests | Medium | No test framework configured for frontend or backend. |
| No input validation | Low | API endpoints lack structured validation (zod, joi). |
| Audio source_url | Low | Uses Supabase storage URL directly. May need CORS or local serving for large files. |
| `SECURITY DEFINER` functions | Low | `handle_new_user`, `update_user_stats`, `rls_auto_enable` callable by anon/authenticated. Should revoke EXECUTE. |
| Quiz tables have RLS but no policies | Info | Expected — accessed via service_role key server-side only. |

---

## 10. Dependencies

### Client (`Client/package.json`)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.4",
    "pinia": "^3.0.4",
    "vue": "^3.5.32",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.2",
    "@vitejs/plugin-vue": "^6.0.6",
    "postcss": "^8.5.9",
    "tailwindcss": "^4.2.2",
    "vite": "^8.0.8"
  }
}
```

### Server (`Server/package.json`)
```json
{
  "dependencies": {
    "cors": "^2.8.6",
    "express": "^5.2.1",
    "jose": "^6.0.10",
    "pg": "^8.20.0"
  }
}
```

---

## 11. Development Workflow

### Install
```bash
cd Client && npm install
cd ../Server && npm install
```

### Run
```bash
# Terminal 1: Backend
cd Server && npm start

# Terminal 2: Frontend
cd Client && npm run dev

# Terminal 3: Bot (optional)
cd D:\Programming\Open Source\Rust-Yuyuko && cargo run --release
```

### Verify
- Open `http://localhost:3000`
- Backend health: `GET http://localhost:5000/api/health`
- Start exam → creates session → redirects to `/exam/:code`

---

## 12. Critical Implementation Notes

### Security
- **Never expose `is_correct`, `answer_value`, `answer_note` to frontend before answering.**
- **Anonymous users:** Cookie-based (`ayumu_tanin_id`, 7 days, httpOnly, lax). Progress claimed on Discord sign-in.
- **Option orders:** Backend shuffles option display order per question. Frontend must send `option_value` (not display index) for scoring.
- **Claim endpoint:** Reads anonymous UUID from cookie server-side. No body required. Clears cookie after transfer.

### Scoring
- Backend compares `user_answers[index]` against `quiz_question_options.option_value` (original value, not shuffled position).
- Frontend must send original `opt.value` from the option object.

### Authentication Flow
- Anonymous exams: auto-create user → cookie → can start exams immediately
- Discord sign-in: Supabase OAuth → JWT → backend verifies → resolves to same user
- Claim: transfers anonymous sessions/results/stats/achievements to authenticated user, deletes anonymous record

---

*End of Project Context*
