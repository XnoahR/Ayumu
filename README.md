# Ayumu

Project full-stack sederhana dengan frontend Vue 3 + Vite + Tailwind CSS dan backend Node.js + Express.

## Stack

- Frontend: Vue 3, Vite, Tailwind CSS
- Backend: Node.js, Express, CORS
- Package manager: npm

## Struktur

```text
Ayumu/
+-- Client/   # Frontend
+-- Server/   # Backend API
+-- docs/     # Dokumentasi teknis tambahan
```

## Instalasi

Install dependency frontend dan backend secara terpisah:

```bash
cd Client
npm install

cd ../Server
npm install
```

Jika memakai PowerShell dan `npm` diblokir, gunakan `npm.cmd`.

## Menjalankan

Terminal 1:

```bash
cd Server
npm start
```

Backend berjalan di `http://localhost:5000`.

Terminal 2:

```bash
cd Client
npm run dev
```

Frontend berjalan di `http://localhost:3000`.

## API

| Method | Endpoint | Keterangan |
| --- | --- | --- |
| GET | `/api` | Info API |
| GET | `/api/health` | Cek status server |
| GET | `/api/metadata` | Level, section, dan jumlah exercise |
| GET | `/api/exercises` | Daftar exercise berdasarkan level/section |
| GET | `/api/exercises/:id/quiz` | Data quiz exercise tanpa bocor jawaban |
| POST | `/api/questions/:id/answer` | Validasi jawaban |
| GET | `/api/packages` | Daftar paket kombinasi |
| POST | `/api/packages` | Generate paket `balanced_75` |
| GET | `/api/packages/:id/quiz` | Data quiz paket kombinasi |

Frontend memanggil `/api/*`. Di mode development, Vite akan mem-proxy request tersebut ke backend.

## Catatan

Script backend `npm run dev` memakai `nodemon`, tetapi `nodemon` belum terpasang di `Server/package.json`. Gunakan `npm start`, atau pasang dulu:

```bash
cd Server
npm install --save-dev nodemon
npm run dev
```

Dokumentasi tambahan:

- [`docs/PROJECT_ANALYSIS.md`](docs/PROJECT_ANALYSIS.md)
- [`docs/DATABASE_ANALYSIS.md`](docs/DATABASE_ANALYSIS.md)
