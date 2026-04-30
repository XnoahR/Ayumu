# Ayumu

A full-stack JLPT (Japanese Language Proficiency Test) practice exam application with Discord integration.

[![Stack](https://img.shields.io/badge/stack-Vue%203%20%7C%20Express%20%7C%20Supabase%20%7C%20Tailwind-blue)](https://github.com/XnoahR/Ayumu)
[![License](https://img.shields.io/badge/license-ISC-green)](./LICENSE)

## Overview

Ayumu lets you take JLPT N1–N5 practice exams through a modern web interface. Sign in with Discord to track your progress, earn achievements, and compete on the leaderboard. A companion Discord bot lets you start exams and check stats directly from your server.

### Features

- **5 JLPT levels** — N5 to N1, each with 75 balanced questions across grammar, reading, and listening
- **Discord Auth** — sign in with Discord via Supabase OAuth, or start anonymously and claim progress later
- **Rich exam UI** — section-colored question navigator, flag-for-review, dark/light theme, responsive mobile layout
- **Audio player** — play/pause, volume control, seek progress bar for listening sections
- **Leaderboard** — global rankings with weekly/monthly/all-time filters and per-level breakdowns
- **Achievements** — unlock badges for streaks, perfect scores, speed runs, and exam milestones
- **Discord Bot** — start exams with `y!exam N3`, check stats with `y!profile`, view `/leaderboard`

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3, Pinia, Vue Router, Tailwind CSS v4 |
| Backend | Node.js, Express 5 |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (Discord OAuth) + anonymous cookies |
| Bot | Rust (serenity + poise) — [separate repo](https://github.com/XnoahR/Rust-Yuyuko) |

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project with the [migration](Server/migrations/001_user_system.sql) applied
- Discord application (for OAuth + bot)

### Installation

```bash
# Frontend
cd Client
npm install

# Backend
cd ../Server
npm install
```

### Configuration

**`Server/.env`**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLIENT_URL=http://localhost:3000
PORT=5000
```

**`Client/.env`**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Running

```bash
# Terminal 1 — Backend (port 5000)
cd Server
npm start

# Terminal 2 — Frontend (port 3000)
cd Client
npm run dev
```

Open `http://localhost:3000`. Backend health: `http://localhost:5000/api/health`.

### Discord Bot (optional)

```bash
cd ../Rust-Yuyuko
# Create .env with DISCORD_TOKEN and AYUMU_API_URL
cargo run --release
```

Commands: `y!exam N5`, `y!profile`, `/leaderboard`.

## Project Structure

```
Ayumu/
├── Client/                    # Vue 3 Frontend
│   └── src/
│       ├── views/             # LandingPage (dashboard), ExamPage, ResultsPage, ProfilePage, LeaderboardPage
│       ├── components/        # QuestionArea, QuestionMap, Toast
│       ├── store/             # session.js, auth.js (Pinia)
│       ├── composables/       # useTheme.js
│       └── lib/               # supabase.js client
│
├── Server/                    # Express Backend
│   ├── routes/                # sessions.js, profile.js
│   ├── middleware/            # auth.js (Discord header → JWT → anonymous cookie)
│   └── migrations/            # 001_user_system.sql
│
└── docs/                      # Technical documentation
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health |
| `POST` | `/api/sessions` | Create exam session |
| `GET` | `/api/sessions/:code` | Load session + questions |
| `POST` | `/api/sessions/:code/answer` | Save answer |
| `POST` | `/api/sessions/:code/submit` | Submit exam |
| `POST` | `/api/sessions/claim` | Claim anonymous progress |
| `GET` | `/api/profile` | User profile + stats + achievements |
| `GET` | `/api/leaderboard` | Leaderboard (query: `?period=weekly&level=N3`) |

## Auth Flow

```
Discord Bot  → X-Discord-User-Id header → lookup by discord_id
Web OAuth    → Supabase JWT               → lookup by auth_id
Anonymous    → ayumu_tanin_id cookie      → auto-create user

All three converge on the same users table row via discord_id.
```

## License

ISC
