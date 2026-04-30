# Ayumu — Project Context

> **Last Updated:** 2026-04-30  
> **Purpose:** Save the complete Ayumu project analysis for future session continuity.

---

## 1. Project Overview

**Name:** Ayumu  
**Type:** Full-stack JLPT (Japanese Language Proficiency Test) practice exam application  
**Stack:**
- **Frontend:** Vue 3 + Vite + Tailwind CSS v4 + Pinia + Vue Router
- **Backend:** Node.js + Express + CORS + Cookie Parser
- **Database:** Supabase (Postgres)
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
│   │   ├── main.js            # Entry: createApp, Pinia, Router
│   │   ├── App.vue            # Root layout, fonts, global styles
│   │   ├── style.css          # Tailwind import only
│   │   ├── router/
│   │   │   └── index.js       # 4 routes: /, /exam/:code, /results/:code, /profile
│   │   ├── store/
│   │   │   ├── exam.js        # LEGACY reactive store (imports local N5 JSON)
│   │   │   └── session.js     # ACTIVE Pinia store for API sessions
│   │   ├── views/
│   │   │   ├── LandingPage.vue    # Start N5 exam, link to profile
│   │   │   ├── ExamPage.vue       # Split: QuestionArea + QuestionMap sidebar
│   │   │   ├── ResultsPage.vue    # Scorecard, accuracy, time, achievements
│   │   │   └── ProfilePage.vue    # Stats grid, rank, achievements, recent results
│   │   └── components/
│   │       ├── QuestionArea.vue   # Prompt, passage, images, 4-option grid, furigana tooltips
│   │       └── QuestionMap.vue    # 5-col grid of question numbers, answered status, finish btn
│   ├── local_data/
│   │   └── N5 - 2010-2011.json    # Legacy static data used by exam.js
│   ├── index.html
│   ├── vite.config.js         # Port 3000, proxy /api -> localhost:5000
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json           # Vue 3.5, Tailwind 4, Pinia 3, Vue Router 4
│
├── Server/                    # Express Backend
│   ├── index.js               # Main server (672 lines). Core quiz logic + package generation
│   ├── routes/
│   │   ├── sessions.js        # Exam session CRUD, scoring, streaks, achievements
│   │   └── profile.js         # User profile, leaderboard, ranks
│   ├── middleware/
│   │   └── auth.js            # User resolution: Discord bot / Anonymous / JWT placeholder
│   ├── migrations/            # DB migrations
│   ├── .env                   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLIENT_URL, PORT
│   ├── .env.example
│   └── package.json           # express 5.2, cors 2.8, pg 8.20
│
├── docs/
│   ├── PROJECT_ANALYSIS.md    # Runtime flow, frontend/backend analysis, recommendations
│   └── DATABASE_ANALYSIS.md   # Table structures, data counts, API recommendations
│
├── .agents/                   # Agent configuration / skills
├── skills/                    # (skill definitions)
├── package.json               # Root deps: cookie-parser, nanoid
├── README.md                  # Setup instructions (Indonesian)
└── .gitignore
```

---

## 3. Frontend Summary

### Entry Point (`Client/src/main.js`)
- Creates Vue app
- Uses `createPinia()`
- Uses `router`
- Mounts to `#app`

### Router (`Client/src/router/index.js`)
| Path | Name | Component |
|------|------|-----------|
| `/` | home | LandingPage |
| `/exam/:sessionCode` | exam | ExamPage |
| `/results/:sessionCode` | results | ResultsPage |
| `/profile` | profile | ProfilePage |

### Stores

#### `session.js` (ACTIVE — Pinia)
- State: `sessionCode`, `session`, `questions`, `currentIndex`, `userAnswers`, `isLoading`, `isSubmitting`, `submitResult`
- Computed: `currentQuestion`, `totalQuestions`, `answeredCount`, `progress`
- Actions:
  - `createSession(level, templateId)` → POST `/api/sessions`
  - `loadSession(code)` → GET `/api/sessions/:code`
  - `saveAnswer(index, option)` → POST `/api/sessions/:code/answer`
  - `submitSession()` → POST `/api/sessions/:code/submit`
  - `nextQuestion()`, `prevQuestion()`, `goToQuestion(index)`, `reset()`

#### `exam.js` (LEGACY — Reactive)
- Still imports `../../local_data/N5 - 2010-2011.json`
- Has its own scoring, theming (lavender, philia, wisteria, mauve), dark mode toggle
- Likely **unused** in current views; new flow uses `session.js`
- **Risk:** Dead code or conflicting state if referenced.

### Views

#### LandingPage.vue
- Big "Start N5 Exam" button → calls `sessionStore.createSession('N5', 'balanced_75')`
- Loading spinner state
- Link to `/profile`
- Uses `primary-*` Tailwind colors with dark mode (`dark:bg-[#0a0a0c]`)

#### ExamPage.vue
- Header: "AYUMU." logo + level + EXIT button
- Main area: `QuestionArea` component
- Sidebar (`md:w-80`): `QuestionMap` component
- Navigation: PREVIOUS / NEXT / SUBMIT buttons
- Handles session loading on mount, quit confirmation

#### ResultsPage.vue
- Score display (large number)
- Accuracy % and time spent
- New achievements unlocked (if any)
- RESTART TEST → creates new session
- MAIN MENU → goes home

#### ProfilePage.vue
- Rank icon (Beginner 🌱 → Sensei 👑)
- Stats: total exams, best score, streak, avg score
- Achievements list
- Recent results list
- "START EXAM" button

### Components

#### QuestionArea.vue
- Displays: question number badge, context (uppercase), prompt (with furigana), passage, images
- **Furigana system:** Hardcoded `furiganaMap` for N5 kanji. Uses regex replacement + HTML tooltip spans with `group-hover`.
- 4-option grid (2-col on desktop): numbered circles + labels
- Selected state: `border-primary-600 bg-primary-50`
- Calls `sessionStore.saveAnswer(index, optionId)` on click

#### QuestionMap.vue
- 5-column grid of buttons for each question
- Color coding:
  - Current: `border-primary-600 ring-4`
  - Answered: `bg-primary-600 text-white`
  - Unanswered: `bg-primary-50 text-primary-400`
- Shows answered count / total
- "FINISH EXAM" button emits `@submit`

### Styling
- **Tailwind CSS v4** with custom primary color scale
- **Dark mode:** Manual via class toggling (`dark:bg-[#0a0a0c]`)
- **Font:** Plus Jakarta Sans (Google Fonts), Hiragino Kaku Gothic ProN for Japanese
- **Global utilities:** `.no-scrollbar`, `::selection` color

---

## 4. Backend Summary

### Main Server (`Server/index.js`)

**Environment Loading:**
- Custom `loadEnvFile()` parses `.env` manually (doesn't use dotenv package)
- Variables: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`, `CLIENT_URL`

**Middleware:**
- `cors()` with origin whitelist from `CLIENT_URL` or defaults
- `express.json()`
- `cookieParser()`

**Supabase Integration:**
- `supabaseRequest(table, query, options)` — generic REST client using `fetch`
- Headers: `apikey` + `Authorization: Bearer {key}`
- `requireSupabaseConfig()` throws 500 if env vars missing

**Key Helpers:**
- `loadQuizByQuestionIds(questionIds)` — bulk fetches questions, options, assets, passages, exercises. Returns sanitized data.
- `groupBy(items, key)` — groups array into Map
- `sanitizeQuestion()`, `sanitizeOption()`, `sanitizeAsset()` — strip sensitive fields
- `assetUrl(asset)` — prefers `local_path` over `source_url`
- `encodeFilterValue()`, `inFilter()` — Supabase query encoding

**Seeded Randomization:**
- `seededRandom(seed)` — SHA256-based LCG
- `shuffleWithSeed(items, seed)` — Fisher-Yates with seeded RNG

**Package Generation:**
- `buildQuestionUnits(section, questions)` — groups by `source_group_key` or `passage_id`
- `pickExactQuestionCount(units, targetCount)` — DP subset sum to hit exact question count per section
- `loadCandidateUnits(level, section, seed)` — fetches + shuffles units

### Core Endpoints

#### Health & Info
- `GET /api/health` → `{ message, supabaseConfigured }`
- `GET /api` → API info, version `2.0.0`, endpoint list

#### Quiz
- `GET /api/metadata` → levels, sections, counts per level/section
- `GET /api/exercises?level=N5&section=grammar` → filtered exercise list
- `GET /api/exercises/:id/quiz` → full quiz data for exercise (no answers)
- `POST /api/questions/:id/answer` → `{ selectedOption }` → `{ correct, correctOption, answerNote }`

#### Packages
- `GET /api/packages?level=N3&userKey=test` → list user packages
- `POST /api/packages` → generate `balanced_75` package
  - Body: `{ level, userId, templateId }`
  - Creates `user_quiz_packages` + `user_quiz_package_items`
  - Returns package metadata + items created
- `GET /api/packages/:id/quiz` → quiz data for a package

### Session Routes (`Server/routes/sessions.js`)

Mounted at `/api/sessions` with `resolveUser` middleware.

- `POST /api/sessions`
  - Body: `{ level, template_id }`
  - Loads template, builds units per section, shuffles, picks exact count
  - Generates `option_orders` (shuffled 1-4 for each question)
  - Creates `user_sessions` record with `session_code`, `question_ids`, `option_orders`, `user_answers: {}`
  - Returns `{ session_code, url, question_count, expires_at }`

- `GET /api/sessions/:code`
  - Loads session, checks expiry (auto-updates to `expired`)
  - Loads questions via `loadQuizByQuestionIds`
  - Applies `option_orders` to shuffle options per question
  - Returns `{ session, questions }`

- `POST /api/sessions/:code/answer`
  - Body: `{ question_index, selected_option }`
  - Updates `user_answers` JSONB in session
  - Returns `{ success }`

- `POST /api/sessions/:code/submit`
  - Validates all answers against `quiz_questions` + `quiz_question_options`
  - Calculates score, percentage, time spent
  - Updates session status → `completed`
  - Creates `user_results` record
  - Calls `updateStreak()` and `checkAchievements()`
  - Returns `{ score, total, percentage, time_spent_seconds, new_achievements }`

- `POST /api/sessions/claim`
  - Body: `{ anonymous_user_id }`
  - Transfers all data from anonymous user to authenticated Discord user
  - Updates: `user_sessions`, `user_results`, `user_achievements`, `user_stats`
  - Deletes anonymous user from `users`

**Helpers in sessions.js:**
- `updateStreak(supabaseRequest, userId, score, total)` — daily streak tracking via `user_streaks`
- `checkAchievements(...)` — checks achievement conditions:
  - `FIRST_EXAM`, `EXAM_10`, `EXAM_50`, `EXAM_100`
  - `PERFECT_N5`, `PERFECT_N4`
  - `SPEED_DEMON` (N5 under 30 min)

### Profile Routes (`Server/routes/profile.js`)

Mounted at `/api` with `resolveUser` middleware.

- `GET /api/profile`
  - Returns: user info, stats, rank, achievements (with details), recent results
  - Rank calculation based on XP thresholds

- `GET /api/leaderboard?level=&period=alltime&limit=10`
  - Periods: `alltime`, `weekly`, `monthly`
  - Aggregates by user, sorts by total score
  - Enriches with user details

- `GET /api/leaderboard/:userId/rank`
  - Returns user's global rank position

**Helpers:**
- `calculateRank(xp)` → Beginner (500) → Apprentice (1500) → Scholar (5000) → Master (10000) → Sensei

### Auth Middleware (`Server/middleware/auth.js`)

**Priority:**
1. `X-Discord-User-Id` header → looks up/creates user by `discord_id`
2. Supabase Auth JWT (placeholder/TODO)
3. Anonymous cookie `ayumu_tanin_id` (7-day, httpOnly, secure in prod)
   - Auto-creates anonymous user in `users` table if missing

**Exports:**
- `resolveUser` — attaches `req.userId`
- `requireAuth` — returns 401 if no userId
- `generateSessionCode()` — `aym_` + 8-char nanoid

---

## 5. Database Schema

### Quiz Data Tables

| Table | Records | Purpose |
|-------|---------|---------|
| `quiz_exercises` | 700 | Exercise metadata (level, section, title, slug) |
| `quiz_questions` | 5,531 | Main question bank (prompt, context, answer_value, answer_note) |
| `quiz_question_options` | 22,001 | Answer choices (option_value, option_label, sort_order, is_correct) |
| `quiz_passages` | 381 | Reading passages (title, content) |
| `quiz_assets` | 2,089 | Audio & image assets (source_url, local_path) |
| `quiz_shared_question_groups` | 215 | Group summaries (reading passages) |
| `quiz_package_templates` | 1 | `balanced_75` template (15 per section) |
| `user_quiz_packages` | 14 | Generated user packages |
| `user_quiz_package_items` | 1,050 | Package contents with ordering |

### Session/User Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts (Discord + Anonymous) |
| `user_sessions` | Active exam sessions (code, questions, answers, status) |
| `user_results` | Completed exam results (score, percentage, time) |
| `user_stats` | Aggregated user statistics |
| `user_streaks` | Daily streak tracking |
| `user_achievements` | Unlocked achievements |
| `achievements` | Achievement definitions (code, name, description, points) |

### Key Data Quality Notes
- `quiz_questions.prompt` null: 905 questions
- `quiz_questions.context` null: 3,297 questions
- `quiz_questions.answer_note` null: 1,993 questions
- UI must handle missing prompt/context by falling back to assets/passages
- `is_correct` null: 4 options (out of 22,001)

---

## 6. API Endpoints Reference

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
POST   /api/sessions/claim

GET    /api/profile
GET    /api/leaderboard?level=&period=&limit=
GET    /api/leaderboard/:userId/rank
```

---

## 7. Environment & Configuration

### Client `.env` / `.env.example`
- `VITE_API_URL` — optional, defaults to '' (relative, uses Vite proxy)

### Server `.env` / `.env.example`
- `PORT` — server port (default: 5000)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — **NEVER commit this. Rotate if leaked.**
- `SUPABASE_ANON_KEY` — fallback key
- `CLIENT_URL` — comma-separated allowed CORS origins

### Vite Proxy (`Client/vite.config.js`)
```js
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  }
}
```

---

## 8. Known Issues & TODOs

| Issue | Severity | Details |
|-------|----------|---------|
| `nodemon` missing | Medium | `Server/package.json` has `npm run dev` script using `nodemon`, but it's not in `devDependencies`. `npm start` works. |
| Legacy `exam.js` store | Low | Imports local JSON, has unused scoring logic. May be dead code. Verify before deleting. |
| Service Role Key | High | Was previously shared in chat. **Must rotate before production.** Currently in `.env`. |
| Supabase Auth JWT | Medium | `auth.js` has TODO placeholder for JWT verification. Only Discord header + anon cookie implemented. |
| No tests | Medium | No test framework configured for frontend or backend. |
| No input validation | Low | API endpoints lack structured validation (e.g., zod, joi). Simple checks only. |
| Frontend hardcodes N5 | Low | LandingPage always starts `N5` exam. No level selector UI yet. |
| Emoji in rank icons | Low | `calculateRank()` uses emoji (🌱📚🎓⭐👑). May render poorly on some Windows terminals. |

---

## 9. Dependencies

### Client (`Client/package.json`)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.105.1",
    "pinia": "^3.0.4",
    "vue": "^3.5.32",
    "vue-router": "^4.6.4"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.2.2",
    "@vitejs/plugin-vue": "^6.0.6",
    "autoprefixer": "^10.5.0",
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
    "pg": "^8.20.0"
  }
}
```

### Root (`package.json`)
```json
{
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "nanoid": "^5.1.9"
  }
}
```

---

## 10. Development Workflow

### Install Dependencies
```bash
cd Client && npm install
cd ../Server && npm install
```

### Run Locally
**Terminal 1 (Backend):**
```bash
cd Server
npm start        # node index.js (port 5000)
# OR install nodemon first:
npm install --save-dev nodemon
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd Client
npm run dev      # vite (port 3000)
```

### Verify
- Open `http://localhost:3000`
- Backend health: `GET http://localhost:5000/api/health`
- Start exam → creates session → redirects to `/exam/:code`

---

## 11. Critical Implementation Notes

### Security
- **Never expose `is_correct`, `answer_value`, `answer_note` to frontend before answering.** The backend already sanitizes these in quiz responses.
- **Atomic units:** Questions sharing `source_group_key` or `passage_id` must stay together in packages. The DP algorithm in `pickExactQuestionCount` enforces this at the unit level.
- **Anonymous users:** Cookie-based (`ayumu_tanin_id`, 7 days, httpOnly, lax). Progress can be claimed by Discord users later.

### Data Handling
- Some questions lack `prompt` or `context`. The UI should treat `prompt` as optional and display assets/passages as primary content when missing.
- Audio assets: listening sections need audio player support.
- Image assets: reading/listening may have images. Fallback UI needed if `source_url` fails.

### Performance
- `loadQuizByQuestionIds` batches all related data in 4 parallel Supabase requests (options, assets, passages, exercises).
- `inFilter` handles up to 1000 question IDs safely.
- Asset loading currently uses external `source_url`. Consider mirroring to Supabase Storage or CDN for stability.

---

*End of Project Context*
