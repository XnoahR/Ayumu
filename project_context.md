# Project Context — Ayumu

## 1. Project Summary
- **Ayumu** adalah aplikasi latihan ujian JLPT (N5–N1) berbasis web, dengan mode latihan full session, profile statistik, achievement, leaderboard, dan integrasi login Discord via Supabase Auth.
- **Target user**: pembelajar bahasa Jepang yang ingin latihan simulasi soal JLPT dan melacak progres.
- **Masalah yang diselesaikan**: latihan terstruktur lintas level/section, progres user lintas perangkat (via auth), dan akses cepat untuk komunitas Discord.
- **Fitur utama saat ini**:
  - Start exam session (`balanced_75`) per level.
  - Mengerjakan soal dengan navigator, flag, timer, audio/image/passage support.
  - Submit hasil + simpan result.
  - Profile, achievement, streak/stats, leaderboard.
  - Anki local bridge page (`/anki`) untuk integrasi desktop lokal.

## 2. Tech Stack
- **Frontend**: Vue 3 (Composition API), Vue Router 4, Pinia, Supabase JS.
- **Backend**: Node.js + Express 5, `jose` (JWT verify), `cookie-parser`, `cors`, `pg`.
- **Database**: Supabase Postgres (akses via REST API `/rest/v1/...` menggunakan service role key dari server).
- **Auth**:
  - Supabase Auth OAuth Discord (frontend login).
  - JWT verification di backend via Supabase JWKS.
  - Anonymous cookie flow (`ayumu_tanin_id`) untuk guest progress.
- **Discord integration**:
  - Header `X-Discord-User-Id` di backend untuk flow bot/service Discord.
  - Bot Rust disebut di README sebagai repo terpisah (Needs verification untuk status sinkronisasi implementasi terbaru).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`, custom CSS theme tokens di `Client/src/style.css`, dark mode class strategy.
- **Build tooling**: Vite 8, PostCSS, npm.

## 3. Repository Structure
- **`Client/`**: aplikasi frontend Vue.
  - `src/main.js`: bootstrap app + Pinia + Router + auth init.
  - `src/views/`: halaman route-level (`Landing`, `Exam`, `Results`, `Profile`, `Leaderboard`, `Anki`).
  - `src/components/`: UI building blocks (`AppHeader`, `QuestionArea`, `QuestionMap`, `Toast`, `AnkiBridgePanel`).
  - `src/store/`: global state Pinia (`auth`, `session`).
  - `src/composables/`: reusable logic (`useTheme`).
  - `src/lib/`: service clients (`supabase`, `ankiBridge`).
- **`Server/`**: API backend Express.
  - `index.js`: entrypoint + helper Supabase request + route mounting.
  - `routes/`: domain API (`sessions.js`, `profile.js`).
  - `middleware/`: user resolution/auth middleware (`auth.js`).
  - `migrations/`: SQL migration utama (`001_user_system.sql`).
- **`docs/`**: dokumentasi analisis internal lama (`PROJECT_ANALYSIS.md`, `DATABASE_ANALYSIS.md`) yang sebagian sudah tidak update penuh dengan code terkini.
- **`anki-addon/`**: addon Anki bridge (Python) untuk koneksi lokal browser ↔ Anki desktop.
- **`skills/`**: skill internal repository (bukan bagian runtime aplikasi utama).

## 4. Frontend Architecture
- **Framework/pattern**:
  - Vue 3 Composition API (`<script setup>`).
  - Pinia untuk state global auth/session.
  - Fetch API langsung untuk backend.
- **Router/pages** (`Client/src/router/index.js`):
  - `/` → `LandingPage`
  - `/anki` → `AnkiPage`
  - `/exam/:sessionCode` → `ExamPage`
  - `/results/:sessionCode` → `ResultsPage`
  - `/profile` → `ProfilePage`
  - `/leaderboard` → `LeaderboardPage`
- **Pinia stores**:
  - `auth` store:
    - inisialisasi session Supabase.
    - login OAuth Discord.
    - signout.
    - expose access token untuk backend Authorization header.
  - `session` store:
    - create/load/save/submit exam session.
    - current question index, user answers, flagged set.
    - progress/section breakdown.
- **Composable penting**:
  - `useTheme`: dark mode load/toggle + localStorage `ayumu_theme`.
- **Komponen penting**:
  - `AppHeader`: nav, theme toggle, auth login/logout.
  - `QuestionArea`: render passage/context/prompt/options/audio/image + answer interaction.
  - `QuestionMap`: navigation by section + answered/flagged summary.
  - `AnkiBridgePanel`: status koneksi bridge lokal + deck/model metadata.
- **Halaman utama**:
  - `LandingPage`: launcher menu + quick start exam.
  - `ExamPage`: exam runtime UI.
  - `ResultsPage`: hasil submit ringkas.
  - `ProfilePage`: profil/stat/achievement/recent results + claim progress.
  - `LeaderboardPage`: ranking filter period/level.
- **Frontend ↔ backend**:
  - Base URL dari `VITE_API_URL` (default `''` sehingga mengandalkan Vite proxy saat dev).
  - Endpoint dipanggil via `fetch`.
  - `credentials: include` dipakai pada endpoint yang butuh cookie anonymous flow.
  - Auth JWT dikirim via header `Authorization: Bearer <token>` jika user login.
- **Environment variable frontend**:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_API_URL` (dipakai di kode, tapi belum ada di `.env.example`).

## 5. Backend Architecture
- **Framework**: Express 5.
- **Entry point**: `Server/index.js`.
- **Core backend responsibilities**:
  - Load `.env` manual.
  - CORS + JSON + cookie parser.
  - Supabase REST helper (`supabaseRequest`) + shared quiz loader.
  - Public quiz/package endpoints + session/profile route modules.
- **Route utama**:
  - Health/info: `/api/health`, `/api`.
  - Quiz metadata/exercises/packages: `/api/metadata`, `/api/exercises`, `/api/exercises/:id/quiz`, `/api/questions/:id/answer`, `/api/packages`, `/api/packages/:id/quiz`.
  - Session flow (mounted): `/api/sessions/*`.
  - Profile/leaderboard flow (mounted): `/api/profile`, `/api/leaderboard`, `/api/leaderboard/:userId/rank`.
- **Middleware auth/user resolution**:
  - `resolveUser` priority:
    1. `X-Discord-User-Id`
    2. `Authorization` Supabase JWT
    3. anonymous cookie `ayumu_tanin_id`
  - Selalu attach `req.userId`.
- **Session/exam flow**:
  - create session: generate question set + option order, simpan `user_sessions`.
  - load session: ambil pertanyaan + status + shuffle option per saved order.
  - save answer: patch `user_answers` JSON.
  - submit: hitung score, update session completed, insert `user_results`, update streak + achievement check.
- **Profile/leaderboard flow**:
  - profile: user + stats + achievements + recent results.
  - leaderboard: aggregate `user_results` per user (period/level filter).
- **Environment variable backend**:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET` (ada di `.env.example`, tidak terlihat dipakai langsung di runtime saat ini)
  - `CLIENT_URL`
  - `PORT`

## 6. Auth Flow
- **Discord OAuth via Supabase**:
  - frontend `authStore.signInWithDiscord()` menggunakan Supabase OAuth provider `discord`.
  - backend verifikasi JWT via JWKS Supabase (`jose`).
- **Supabase JWT flow**:
  - frontend kirim bearer token ke backend.
  - backend cocokkan `payload.sub` ke `users.auth_id`.
- **Anonymous user/cookie flow**:
  - jika tidak ada Discord header/JWT, backend cek cookie `ayumu_tanin_id`.
  - jika belum ada/invalid, backend buat user anonymous dan set cookie baru (7 hari).
- **Discord bot/header flow**:
  - jika request membawa `X-Discord-User-Id`, backend lookup/create user by `discord_id`.
- **Identity unification**:
  - `users` menjadi single identity table.
  - endpoint `/api/sessions/claim` memindahkan data anonymous ke user authenticated lalu clear cookie.
  - **Needs verification**: flow claim saat ada bentrok unique constraint pada `user_achievements`/`user_stats` belum tampak ditangani khusus.

## 7. Data Model and Database
Berdasarkan `Server/migrations/001_user_system.sql` dan query runtime:
- **Tabel penting**:
  - Konten quiz: `quiz_exercises`, `quiz_questions`, `quiz_question_options`, `quiz_passages`, `quiz_assets`, `quiz_package_templates`, `user_quiz_packages`, `user_quiz_package_items`.
  - User domain: `users`, `user_sessions`, `user_results`, `achievements`, `user_achievements`, `user_stats`, `user_streaks`.
- **Relasi penting**:
  - `users` ↔ `user_sessions` / `user_results` / `user_stats` / `user_streaks` / `user_achievements`.
  - `user_sessions` menyimpan `question_ids[]`, `option_orders`, `user_answers`.
  - `user_results` untuk riwayat permanen.
- **Field penting**:
  - `users.auth_id`, `users.discord_id`, `users.is_anonymous`.
  - `user_sessions.session_code`, `status`, `expires_at`, `score`, `time_spent_seconds`.
  - `user_results.percentage`, `section_breakdown`.
- **Achievement/progress/session model**:
  - seed achievements via migration.
  - submit exam memicu insert result.
  - trigger SQL `update_user_stats` untuk aggregate stats.
- **RLS/security**:
  - migration meng-enable RLS di tabel user-domain.
  - policy own-data berdasarkan `auth.uid()` / `service_role`.
  - runtime server memakai service role untuk Supabase REST calls.
  - **Needs verification**: apakah seluruh policy aktif konsisten terhadap schema produksi terbaru.

## 8. Main User Flows
1. User buka homepage (`/`) → pilih menu/level.
2. User pilih level JLPT.
3. Frontend call `POST /api/sessions` buat session.
4. User masuk `/exam/:sessionCode` dan jawab soal.
5. Jawaban disimpan incremental via `POST /api/sessions/:code/answer`.
6. User submit exam via `POST /api/sessions/:code/submit`.
7. Frontend buka `/results/:sessionCode`.
8. User login Discord (opsional) via Supabase OAuth.
9. User buka `/profile` untuk stats/achievement/recent results.
10. User buka `/leaderboard` untuk ranking period/level.
11. Discord bot/service flow (jika ada) kirim `X-Discord-User-Id` ke API.

## 9. API Contract
| Method | Endpoint | Purpose | Auth requirement | Request | Response ringkas |
|---|---|---|---|---|---|
| GET | `/api/health` | Health check | No | - | message, supabaseConfigured |
| GET | `/api` | API info | No | - | version + endpoint list |
| GET | `/api/metadata` | Daftar level/section counts | No | Query optional | levels, sections, counts |
| GET | `/api/exercises` | List exercises by level/section | No | `level`, `section` | exercises[] |
| GET | `/api/exercises/:id/quiz` | Quiz by exercise | No | path `id` | type, exercise, questions[] |
| POST | `/api/questions/:id/answer` | Check single question answer | No | `selectedOption` | correct, correctOption, answerNote |
| GET | `/api/packages` | List user packages | Needs verification (currently query `userKey`) | `level`, `userKey` | packages[] |
| POST | `/api/packages` | Create package | Needs verification (currently body `userId`) | `level`, `userId`, `templateId` | package metadata |
| GET | `/api/packages/:id/quiz` | Load package quiz | No | path `id` | package + ordered questions |
| POST | `/api/sessions` | Create exam session | Resolved user (header/jwt/cookie) | `level`, `template_id` | session_code, exam URL, expiry |
| GET | `/api/sessions/:code` | Load session + progress | Resolved user | path `code` | session, questions |
| POST | `/api/sessions/:code/answer` | Save answer | Resolved user | `question_index`, `selected_option` | success flag |
| POST | `/api/sessions/:code/submit` | Finalize exam result | Resolved user | (body optional; server pakai stored answers) | score, total, percentage, achievements |
| POST | `/api/sessions/claim` | Claim anonymous progress | Auth user required | cookie + bearer token | success/message |
| GET | `/api/profile` | User profile dashboard | Resolved user | - | user, stats, rank, achievements, recent_results |
| GET | `/api/leaderboard` | Leaderboard | No (but resolveUser tetap dijalankan di mount) | `period`, `level`, `limit` | entries[] |
| GET | `/api/leaderboard/:userId/rank` | User ranking position | No (mounted with resolveUser) | path `userId` | rank, total_users, total_score |

## 10. Current Frontend UI Notes
- **Homepage/Landing responsibilities**:
  - Menu utama ke Anki/Profile/Leaderboard + quick exam launcher.
- **Komponen terlalu besar**:
  - `QuestionArea.vue` cukup besar dan memuat banyak concern (audio, image, prompt rendering, option selection).
  - `ProfilePage.vue` memuat fetch + fallback + auth action + layout sekaligus.
- **UX yang sudah bagus**:
  - Navigasi soal + flag + progress section.
  - Dark mode konsisten.
  - Flow submit/confirm dialog cukup jelas.
- **UX yang perlu ditingkatkan**:
  - Error state beberapa endpoint masih generik.
  - Results restart hardcoded mulai dari N5.
  - Copy/icon ada karakter encoding rusak di beberapa teks.
- **Responsiveness**:
  - Sudah ada adaptasi mobile pada header/nav/map overlay.
  - **Needs verification**: detail rendering pada device ekstrim kecil/besar.
- **Dark mode**:
  - Didukung lewat class `dark` + token custom.
- **Accessibility**:
  - Basic semantics cukup ada.
  - **Needs verification**: focus state keyboard, ARIA labeling, contrast audit formal.

## 11. Known Issues / Risks
### Critical
- `POST /api/sessions/claim` melakukan patch beberapa tabel yang berpotensi kena konflik unique (`user_achievements`, `user_stats`) tanpa conflict handling eksplisit.
- Session answer save/submit tidak terlihat validasi ownership session terhadap `req.userId` (potensi akses via kode sesi, Needs verification end-to-end enforcement).

### High
- Leaderboard query mengambil hasil mentah lalu agregasi di memory; skala data besar bisa berat.
- `toggleMute` di `QuestionArea` set `audio.muted=true` tapi unmute tidak eksplisit set `muted=false` (potensi perilaku volume/mute tidak konsisten).
- Build warning plugin timings cukup tinggi (bukan failure, tapi sinyal area optimasi build).

### Medium
- `VITE_API_URL` dipakai kode tapi tidak ada di `Client/.env.example`.
- Dokumen `docs/PROJECT_ANALYSIS.md` sudah tidak sinkron dengan implementasi sekarang.
- Beberapa logic randomisasi session menggunakan `Math.random` tanpa seed repeatability.
- Encoding karakter non-ASCII tampak rusak pada sebagian output/log/icon.

### Low
- Tidak ada script test/lint di `Client` dan `Server`.
- `SUPABASE_JWT_SECRET` ada di contoh env tapi tidak terlihat dipakai runtime.
- Root `package.json` minim konteks (hanya dependency kecil), bisa membingungkan onboarding.

## 12. Recommended Next Steps
1. **Stabilization**
   - Tambahkan ownership guard session (`session.user_id === req.userId`) di semua endpoint session.
   - Hardening flow claim progress (dedupe + transaction strategy).
   - Rapikan error handling + standardized response.
2. **Documentation**
   - Sinkronkan README + docs lama dengan arsitektur runtime saat ini.
   - Tambah API examples (request/response JSON).
3. **Frontend component refactor**
   - Pecah `QuestionArea` jadi subkomponen (audio, passage, options).
   - Pisahkan profile data fetching ke composable.
4. **Homepage redesign**
   - Kerjakan setelah stabilisasi, tanpa menghapus flow existing.
5. **Feature expansion (Flashcard, Kanji, JLPT Launcher)**
   - Tambah route placeholder `flashcard`, `kanji` jika belum siap full.
6. **Testing**
   - Unit test store/composable.
   - API integration tests untuk session/auth/claim.
7. **Deployment readiness**
   - Finalisasi env contract.
   - Tambah observability/logging + health checks yang lebih detail.

## 13. Proposed Homepage Redesign Context
Konteks desain untuk iterasi berikutnya:
- Header: `AYUMU (Home)`, `Profile`, `Flashcard`, `Leaderboard`.
- Hero card: “Welcome”.
- Quick action cards: Profile, Flashcard, Kanji, Leaderboard.
- Large JLPT Launcher card.
- Footer/CTA: link Discord community.
- Wajib pertahankan:
  - Discord auth flow.
  - Dark mode.
  - Start exam flow.
  - Stats/profile.
  - Leaderboard.
- Flashcard/Kanji boleh placeholder route dulu bila backend belum siap.

## 14. Development Conventions
- Gunakan Vue Composition API.
- Gunakan Pinia untuk global state.
- Gunakan composable untuk reusable logic.
- Utamakan komponen kecil dan reusable.
- Gunakan Tailwind utility classes + token tema yang sudah ada.
- Jangan hardcode API URL; gunakan env (`VITE_API_URL`).
- Semua API call wajib punya error/loading/empty state.
- Mobile-first responsiveness wajib.
- Dark mode compatibility wajib.
- Saat redesign: jangan hapus fitur existing.

## 15. Commands
- **Install frontend**
  - `cd Client`
  - `npm install` (Windows PowerShell: `npm.cmd install`)
- **Run frontend dev**
  - `npm run dev` (atau `npm.cmd run dev`)
- **Build frontend**
  - `npm run build` (atau `npm.cmd run build`)
- **Install backend**
  - `cd Server`
  - `npm install` (atau `npm.cmd install`)
- **Run backend**
  - `npm start` (atau `npm.cmd run start`)
- **Migration/database setup**
  - Jalankan SQL di `Server/migrations/001_user_system.sql` pada Supabase SQL Editor.
  - Pastikan env server terisi (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, dll).

---

## Verification Notes (2026-05-08)
- Frontend build berhasil: `npm.cmd run build` di `Client`.
- Backend: dependency install sukses; script tersedia hanya `start` dan `dev`; validasi sintaks `node --check` untuk `index.js`, `routes/*`, `middleware/auth.js` berhasil.
- Tidak ditemukan script `test` atau `lint` pada `Client`/`Server`.
- Server runtime `npm start` **tidak dijalankan** pada review ini untuk menghindari long-running process; verifikasi terbatas pada static inspection + syntax check.
