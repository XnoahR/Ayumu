# Analisis Project Ayumu

Dokumen ini merangkum kondisi teknis project Ayumu berdasarkan struktur repository, konfigurasi, dan kode yang tersedia.

## 1. Gambaran Umum

Ayumu adalah aplikasi full-stack tahap awal. Project sudah memiliki pemisahan yang jelas antara frontend dan backend:

- `Client`: aplikasi Vue 3 yang dijalankan dengan Vite.
- `Server`: API Express sederhana yang dijalankan dengan Node.js.

Fungsi aplikasi saat ini masih berupa starter/checkpoint: frontend menampilkan halaman sambutan, komponen counter, dan status koneksi backend. Backend menyediakan endpoint health check dan endpoint informasi API.

## 2. Alur Runtime

Alur saat aplikasi dibuka di browser:

1. Browser membuka `http://localhost:3000`.
2. Vite menyajikan `Client/index.html`.
3. `Client/src/main.js` membuat instance Vue dan mount ke elemen `#app`.
4. `Client/src/App.vue` dirender.
5. Pada lifecycle `onMounted`, `App.vue` melakukan `fetch('/api/health')`.
6. Vite proxy meneruskan `/api/health` ke `http://localhost:5000/api/health`.
7. Express mengembalikan JSON `{ "message": "Server is running!" }`.
8. Frontend menampilkan pesan tersebut sebagai server status.

## 3. Frontend

### Entry Point

File utama:

- `Client/index.html`
- `Client/src/main.js`
- `Client/src/App.vue`

`main.js` memuat stylesheet global `style.css`, mengimpor komponen `App.vue`, lalu menjalankan:

```js
createApp(App).mount('#app')
```

### Komponen

`App.vue` memakai Composition API dengan:

- `ref` untuk state `message` dan `apiResponse`.
- `onMounted` untuk memanggil API backend.
- `HelloWorld` sebagai komponen anak.

`HelloWorld.vue` menerima prop `msg` dan memiliki state lokal `count` untuk tombol counter.

### Styling

Styling memakai Tailwind CSS. File `Client/src/style.css` hanya berisi:

```css
@import "tailwindcss";
```

Konfigurasi Tailwind terdapat di `Client/tailwind.config.js`, dengan content scan untuk:

- `./index.html`
- `./src/**/*.{vue,js,ts,jsx,tsx}`

### Vite Proxy

`Client/vite.config.js` mengatur:

- dev server port `3000`
- proxy `/api` ke `http://localhost:5000`

Ini membuat frontend dapat memakai path relatif `/api/health` tanpa menulis base URL backend secara eksplisit.

## 4. Backend

### Entry Point

Backend berada di `Server/index.js`.

Express dikonfigurasi dengan:

- `cors()`
- `express.json()`
- port tetap `5000`

### Endpoint

| Method | Path | Kegunaan |
| --- | --- | --- |
| GET | `/api/health` | Health check sederhana untuk memastikan server aktif. |
| GET | `/api` | Informasi dasar API. |

Contoh respons `/api/health`:

```json
{
  "message": "Server is running!"
}
```

Contoh respons `/api`:

```json
{
  "message": "Welcome to Ayumu API",
  "version": "1.0.0"
}
```

## 5. Dependency dan Script

### Client

Dependency utama:

- `vue`

Dev dependency:

- `vite`
- `@vitejs/plugin-vue`
- `tailwindcss`
- `@tailwindcss/postcss`
- `postcss`
- `autoprefixer`

Script:

- `dev`: menjalankan Vite.
- `build`: build production.
- `preview`: preview hasil build.

### Server

Dependency utama:

- `express`
- `cors`

Script:

- `start`: `node index.js`
- `dev`: `nodemon index.js`

Catatan: `nodemon` dipakai oleh script `dev`, tetapi belum ada di dependency atau devDependency server. Akibatnya `npm run dev` akan gagal pada environment baru kecuali `nodemon` terpasang global atau ditambahkan ke project.

## 6. Kekuatan Project

- Struktur frontend/backend sudah dipisahkan dengan jelas.
- Vite proxy sudah benar untuk development lokal.
- Health check backend sudah tersedia.
- Styling Tailwind sudah terintegrasi.
- `package-lock.json` tersedia di kedua aplikasi, sehingga dependency install lebih deterministik.
- CORS sudah diaktifkan di backend, membantu integrasi lintas origin.

## 7. Risiko dan Catatan Teknis

### `nodemon` Belum Terdaftar

Script backend `npm run dev` tidak portable karena `nodemon` belum menjadi dev dependency.

Rekomendasi:

```bash
cd Server
npm install --save-dev nodemon
```

### Port Masih Hardcoded

Backend memakai:

```js
const PORT = 5000;
```

Untuk project yang akan berkembang, lebih fleksibel menggunakan environment variable:

```js
const PORT = process.env.PORT || 5000;
```

Jika ini diterapkan, dokumentasi `.env.example` juga sebaiknya ditambahkan.

### Belum Ada Test

Belum ditemukan konfigurasi testing. Untuk tahap awal, test yang paling berguna:

- unit/component test untuk komponen Vue penting.
- API test untuk endpoint Express.
- smoke test untuk memastikan frontend dapat membaca `/api/health`.

### Belum Ada Error Handling API Terstruktur

Saat ini endpoint masih sederhana, jadi belum menjadi masalah besar. Jika API bertambah, sebaiknya tambahkan:

- middleware error handler.
- format error response konsisten.
- validasi input untuk endpoint yang menerima body.

### Belum Ada Konfigurasi Production Terpadu

Frontend dapat di-build dengan Vite, tetapi server Express belum dikonfigurasi untuk melayani file static dari `Client/dist`. Untuk deployment terpadu, perlu diputuskan salah satu pendekatan:

- frontend dan backend dideploy terpisah.
- backend Express melayani build frontend.
- memakai platform hosting yang mendukung routing frontend dan API secara terpisah.

### Encoding Log Server

Log startup backend terlihat mengandung karakter emoji yang dapat tampil rusak di beberapa terminal Windows. Jika ingin kompatibilitas terminal lebih aman, ganti dengan ASCII:

```js
console.log(`Server running on http://localhost:${PORT}`);
```

## 8. Rekomendasi Pengembangan Berikutnya

Prioritas rendah sampai menengah:

1. Tambahkan `nodemon` sebagai dev dependency backend.
2. Ubah port backend menjadi configurable via `process.env.PORT`.
3. Tambahkan `.env.example` untuk dokumentasi konfigurasi.
4. Tambahkan endpoint API nyata sesuai domain aplikasi Ayumu.
5. Tambahkan state loading di frontend saat menunggu health check.
6. Tambahkan basic test untuk backend.
7. Tentukan strategi deployment.

## 9. Checklist Menjalankan Lokal

1. Install dependency frontend:

```bash
cd Client
npm install
```

2. Install dependency backend:

```bash
cd ../Server
npm install
```

3. Jalankan backend:

```bash
npm start
```

4. Jalankan frontend dari terminal lain:

```bash
cd Client
npm run dev
```

5. Buka:

```text
http://localhost:3000
```

6. Pastikan teks status server menampilkan:

```text
Server is running!
```

## 10. Catatan Verifikasi Dokumentasi

Dokumentasi ini dibuat dari pembacaan file project berikut:

- `README.md`
- `Client/package.json`
- `Client/vite.config.js`
- `Client/tailwind.config.js`
- `Client/postcss.config.js`
- `Client/src/main.js`
- `Client/src/App.vue`
- `Client/src/components/HelloWorld.vue`
- `Client/src/style.css`
- `Server/package.json`
- `Server/index.js`

Saat analisis dilakukan, folder `node_modules` belum tersedia di `Client` maupun `Server`, sehingga verifikasi runtime penuh memerlukan `npm install` terlebih dahulu.
