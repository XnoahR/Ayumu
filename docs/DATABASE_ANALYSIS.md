# Analisis Database Supabase Ayumu

Dokumen ini menganalisis struktur database Supabase yang akan dipakai untuk mengimplementasikan bank soal ke website Ayumu.

## 1. Ringkasan

Database sudah berisi data soal JLPT yang cukup lengkap dan siap dijadikan sumber utama fitur latihan/quiz.

Jumlah data utama:

| Tabel | Jumlah | Fungsi |
| --- | ---: | --- |
| `quiz_exercises` | 700 | Metadata exercise berdasarkan level dan section. |
| `quiz_questions` | 5.531 | Bank soal utama. |
| `quiz_question_options` | 22.001 | Pilihan jawaban untuk tiap soal. |
| `quiz_passages` | 381 | Bacaan untuk soal reading. |
| `quiz_assets` | 2.089 | Asset pendukung seperti audio dan gambar. |
| `quiz_shared_question_groups` | 215 | Group soal yang harus dipaketkan bersama, terutama reading passage. |
| `quiz_package_templates` | 1 | Template komposisi paket soal. |
| `user_quiz_packages` | 14 | Paket soal yang sudah dibuat untuk user. |
| `user_quiz_package_items` | 1.050 | Isi soal dari tiap paket user. |

## 2. Distribusi Konten

### Berdasarkan Section

| Section | Jumlah Exercise |
| --- | ---: |
| grammar | 136 |
| kanji | 111 |
| listening | 182 |
| reading | 147 |
| vocab | 124 |

### Berdasarkan Level

| Level | Jumlah Exercise |
| --- | ---: |
| N1 | 152 |
| N2 | 148 |
| N3 | 119 |
| N4 | 155 |
| N5 | 126 |

### Berdasarkan Section dan Level

| Section | N1 | N2 | N3 | N4 | N5 |
| --- | ---: | ---: | ---: | ---: | ---: |
| grammar | 26 | 25 | 29 | 30 | 26 |
| kanji | 21 | 21 | 31 | 19 | 19 |
| listening | 28 | 35 | 22 | 54 | 43 |
| reading | 55 | 41 | 16 | 21 | 14 |
| vocab | 22 | 26 | 21 | 31 | 24 |

Database sudah mencakup semua level JLPT `N1` sampai `N5` dan semua section utama: `grammar`, `kanji`, `listening`, `reading`, `vocab`.

## 3. Struktur Tabel

### `quiz_exercises`

Tabel induk untuk kumpulan soal dari satu exercise.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary identifier exercise. |
| `source` | text | Sumber data, contoh: `japanesetest4you`. |
| `source_post_id` | bigint | ID post dari sumber. |
| `section` | text | Kategori soal: grammar, kanji, listening, reading, vocab. |
| `level` | text | Level JLPT: N1-N5. |
| `exercise_number` | integer | Nomor exercise. |
| `title` | text | Judul exercise. |
| `slug` | text | Slug URL. |
| `source_url` | text | URL sumber asli. |
| `published_at` | timestamptz | Tanggal publish dari sumber. |
| `modified_at` | timestamptz | Tanggal update dari sumber. |

Peran di website:

- halaman daftar latihan berdasarkan level/section.
- filter utama bank soal.
- sumber metadata untuk judul quiz.

### `quiz_questions`

Tabel soal utama.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary identifier soal. |
| `exercise_id` | uuid | Relasi ke `quiz_exercises`. |
| `passage_id` | uuid | Relasi opsional ke `quiz_passages`. |
| `question_number` | integer | Nomor soal dalam exercise/passage. |
| `prompt` | text | Teks pertanyaan. |
| `context` | text | Instruksi/konteks soal. |
| `answer_value` | text | Nilai jawaban benar, biasanya `1`, `2`, `3`, atau `4`. |
| `answer_note` | text | Catatan/pembahasan jawaban. |
| `source_group_type` | text | Jenis group soal, contoh `reading_passage`. |
| `source_group_key` | text | Key untuk mengelompokkan soal yang saling terkait. |

Catatan kualitas data:

- Total soal: 5.531.
- `prompt` null: 905 soal.
- `context` null: 3.297 soal.
- `answer_note` null: 1.993 soal.
- Soal dengan `passage_id`: 853.
- Soal dengan `source_group_key`: 875.

Implikasi:

- UI harus tahan terhadap `prompt`, `context`, atau `answer_note` yang kosong.
- Untuk beberapa soal, teks utama kemungkinan berasal dari asset gambar/audio atau passage, bukan dari `prompt`.
- Pembahasan jawaban tidak selalu tersedia.

### `quiz_question_options`

Tabel pilihan jawaban.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary identifier opsi. |
| `question_id` | uuid | Relasi ke `quiz_questions`. |
| `option_value` | text | Nilai opsi, contoh `1`, `2`, `3`, `4`. |
| `option_label` | text | Teks opsi yang ditampilkan. |
| `sort_order` | integer | Urutan tampilan opsi. |
| `is_correct` | boolean | Penanda opsi benar. |

Catatan:

- Total opsi: 22.001.
- Opsi benar: 5.530.
- `is_correct` null: 4.

Implikasi:

- Hampir semua soal punya 4 opsi.
- Jawaban bisa dicek dengan `is_correct` atau mencocokkan `option_value` dengan `answer_value`.
- Untuk keamanan quiz, frontend sebaiknya tidak menerima `is_correct` sebelum user submit jawaban.

### `quiz_passages`

Tabel bacaan untuk reading.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary identifier passage. |
| `exercise_id` | uuid | Relasi ke exercise. |
| `passage_number` | integer | Nomor passage dalam exercise. |
| `title` | text | Judul passage, bisa kosong. |
| `content` | text | Isi bacaan. |

Peran di website:

- ditampilkan sebelum/di samping soal reading.
- beberapa soal dapat memakai passage yang sama.
- UI quiz perlu mode khusus reading agar bacaan tidak hilang saat pindah soal.

### `quiz_assets`

Tabel asset pendukung.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | Primary identifier asset. |
| `exercise_id` | uuid | Relasi opsional ke exercise. |
| `question_id` | uuid | Relasi opsional ke soal. |
| `passage_id` | uuid | Relasi opsional ke passage. |
| `asset_type` | text | Jenis asset: `audio` atau `image`. |
| `source_url` | text | URL asset dari sumber. |
| `local_path` | text | Path lokal jika asset sudah disalin. |
| `shared_from_question_number` | integer | Penanda asset dipakai bersama dari nomor soal tertentu. |

Distribusi asset:

| Asset | Jumlah |
| --- | ---: |
| audio | 896 |
| image | 1.011 |

Implikasi:

- Listening membutuhkan audio player.
- Beberapa soal reading/listening bisa membutuhkan gambar.
- Website perlu fallback jika `source_url` gagal dimuat.
- Jika ingin lebih stabil, asset sebaiknya dimirror ke storage sendiri, bukan bergantung penuh pada sumber eksternal.

### `quiz_shared_question_groups`

View/tabel ringkasan group soal.

Kolom:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `source_group_type` | text | Jenis group, contoh `reading_passage`. |
| `source_group_key` | text | Key group. |
| `question_count` | bigint | Jumlah soal dalam group. |

Peran:

- memastikan soal berbasis passage tidak terpisah secara acak.
- penting saat membuat paket quiz campuran.

Contoh group terbesar berisi 5-7 soal per passage.

### `quiz_package_templates`

Template komposisi paket soal.

Data saat ini:

| ID | Nama | Total | Komposisi |
| --- | --- | ---: | --- |
| `balanced_75` | Balanced 75 | 75 | 15 kanji, 15 vocab, 15 grammar, 15 reading, 15 listening |

Peran:

- blueprint untuk generator paket latihan.
- bisa dipakai untuk membuat mock test seimbang.

### `user_quiz_packages`

Metadata paket soal yang dibuat untuk user.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | ID paket. |
| `user_key` | text | Identifier user. |
| `level` | text | Level JLPT paket. |
| `template_id` | text | Relasi ke template, contoh `balanced_75`. |
| `package_number` | integer | Nomor paket user. |
| `title` | text | Judul paket. |
| `question_count` | integer | Total soal. |
| `unit_count` | integer | Total unit/section group. |
| `seed` | text | Seed untuk reproducible randomization. |

Peran:

- menyimpan paket yang sudah digenerate.
- memungkinkan user mengulang paket yang sama.

### `user_quiz_package_items`

Isi detail paket user.

Kolom penting:

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | uuid | ID item paket. |
| `package_id` | uuid | Relasi ke `user_quiz_packages`. |
| `question_id` | uuid | Relasi ke `quiz_questions`. |
| `section` | text | Section soal. |
| `source_group_key` | text | Group soal jika ada. |
| `unit_key` | text | Unit dalam paket. |
| `unit_order` | integer | Urutan unit. |
| `question_order` | integer | Urutan soal. |

Peran:

- menentukan urutan tampil soal dalam paket.
- menjaga soal reading/listening yang terkait tetap berada dalam unit yang sama.

## 4. Relasi Konseptual

Relasi utama:

```text
quiz_exercises
  +-- quiz_questions
  |     +-- quiz_question_options
  |     +-- quiz_assets
  |
  +-- quiz_passages
        +-- quiz_questions
        +-- quiz_assets

quiz_package_templates
  +-- user_quiz_packages
        +-- user_quiz_package_items
              +-- quiz_questions
```

Makna relasi:

- `quiz_exercises` adalah container asal soal.
- `quiz_questions` adalah entitas soal yang dijawab user.
- `quiz_question_options` adalah pilihan jawaban.
- `quiz_passages` dipakai untuk soal reading berbasis bacaan.
- `quiz_assets` menyimpan audio/gambar untuk listening, reading, atau soal tertentu.
- `user_quiz_packages` dan `user_quiz_package_items` membentuk paket latihan yang sudah disusun.

## 5. Rekomendasi Implementasi Website Ayumu

### Fitur Minimum

1. Halaman pilih level: `N1`, `N2`, `N3`, `N4`, `N5`.
2. Halaman pilih section: grammar, kanji, vocab, reading, listening.
3. Daftar exercise berdasarkan `level` dan `section`.
4. Halaman quiz:
   - tampilkan `context` jika ada.
   - tampilkan `prompt` jika ada.
   - tampilkan passage untuk soal reading.
   - tampilkan audio/image dari `quiz_assets` jika ada.
   - tampilkan opsi dari `quiz_question_options`.
5. Submit jawaban:
   - cek jawaban di backend.
   - tampilkan benar/salah.
   - tampilkan `answer_note` jika tersedia.

### Fitur Paket Soal

Gunakan tabel paket yang sudah ada:

- `quiz_package_templates` untuk komposisi.
- `user_quiz_packages` untuk metadata paket.
- `user_quiz_package_items` untuk isi dan urutan soal.

Aturan penting: generator paket harus memperlakukan soal yang berbagi passage, pertanyaan induk, group, atau asset sebagai satu unit atomic. Unit atomic tidak boleh dipecah ke paket berbeda.

Flow yang disarankan:

1. User pilih level.
2. Backend cek apakah user sudah punya paket aktif.
3. Jika belum, backend generate paket dari template `balanced_75`.
4. Backend menyimpan paket ke `user_quiz_packages`.
5. Backend menyimpan daftar soal ke `user_quiz_package_items`.
6. Frontend menampilkan quiz berdasarkan urutan `unit_order` dan `question_order`.

### Aturan Kombinasi Soal

Saat membuat kombinasi paket, jangan memilih soal satu per satu secara buta. Bentuk dulu unit kandidat, lalu pilih unit sampai kuota section terpenuhi.

Unit kandidat:

| Kondisi | Unit Key | Aturan |
| --- | --- | --- |
| Soal punya `source_group_key` | `{section}:{source_group_key}` | Semua soal dengan group yang sama harus masuk paket yang sama. |
| Soal punya `passage_id` | `{section}:passage:{passage_id}` | Semua soal dalam passage yang sama harus masuk paket yang sama. |
| Asset terikat ke `passage_id` | ikut unit passage | Image reading tampil bersama passage dan tidak dipisah. |
| Asset terikat ke `question_id` | `{section}:question:{question_id}` | Asset ikut soal tersebut. |
| Asset hanya terikat ke `exercise_id` | ikut unit exercise/section terkait | Cocok untuk transcript atau asset pendukung exercise. |
| Soal mandiri | `{section}:question:{question_id}` | Boleh dipilih sebagai 1 unit. |

Untuk template `balanced_75`, targetnya tetap 15 soal per section. Namun khusus section seperti reading, satu unit bisa berisi beberapa soal. Generator perlu menghitung jumlah soal dalam unit, bukan jumlah unit.

Contoh:

```text
reading:reading:4293:passage:2 -> 5 soal
reading:reading:708:passage:1  -> 3 soal
reading:reading:712:passage:1  -> 3 soal
reading:reading:2218:passage:1 -> 4 soal
```

Totalnya 15 soal reading, tetapi hanya 4 unit. Semua soal dalam satu passage tetap berada di paket yang sama.

Paket yang sudah ada sudah mengikuti prinsip ini untuk `source_group_key`: pengecekan pada 14 paket tersimpan menunjukkan tidak ada group passage yang terpecah sebagian.

### Handling Reading

Untuk soal reading:

- ambil `quiz_passages` berdasarkan `passage_id`.
- tampilkan passage dalam panel tetap.
- tampilkan semua soal dalam group yang sama secara berurutan.
- jangan randomize soal dalam passage secara terpisah karena konteksnya saling terkait.

### Handling Listening

Untuk listening:

- cari asset `asset_type = audio` berdasarkan `question_id`, `exercise_id`, atau group terkait.
- tampilkan audio player.
- beberapa audio mungkin dipakai lebih dari satu soal, jadi perlu dukung shared asset.

### Handling Image

Untuk image:

- tampilkan image dari `source_url` atau `local_path`.
- sediakan fallback UI jika image gagal load.
- jika performance menjadi masalah, mirror image ke Supabase Storage atau public CDN sendiri.

## 6. API Backend yang Disarankan

Jangan query database langsung dari frontend untuk data sensitif seperti jawaban benar. Gunakan backend Express sebagai layer aman.

Endpoint yang disarankan:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| GET | `/api/levels` | Daftar level tersedia. |
| GET | `/api/sections` | Daftar section tersedia. |
| GET | `/api/exercises?level=N5&section=grammar` | Daftar exercise terfilter. |
| GET | `/api/exercises/:id/questions` | Ambil soal dan opsi tanpa `is_correct`. |
| POST | `/api/questions/:id/answer` | Submit jawaban dan validasi di server. |
| POST | `/api/packages` | Generate paket soal untuk user. |
| GET | `/api/packages/:id` | Ambil paket soal beserta urutan item. |
| POST | `/api/packages/:id/submit` | Submit hasil paket. |

Field yang boleh dikirim ke frontend sebelum menjawab:

- question id
- question number
- context
- prompt
- passage content
- assets
- option value
- option label
- sort order

Field yang sebaiknya tidak dikirim sebelum menjawab:

- `is_correct`
- `answer_value`
- `answer_note`

## 7. Strategi Query

### Exercise List

Filter berdasarkan `level` dan `section`:

```text
quiz_exercises
  ?select=id,title,section,level,exercise_number,slug
  &level=eq.N5
  &section=eq.grammar
  &order=exercise_number.asc
```

### Questions for Exercise

Ambil soal beserta opsi:

```text
quiz_questions
  ?select=id,question_number,context,prompt,passage_id,
          quiz_question_options(option_value,option_label,sort_order)
  &exercise_id=eq.{exercise_id}
  &order=question_number.asc
```

Untuk backend internal, boleh ambil `answer_value`, `answer_note`, dan `is_correct`, tetapi hapus field tersebut sebelum response ke frontend.

### Reading Passage

Untuk soal dengan `passage_id`, ambil:

```text
quiz_passages
  ?select=id,title,content,passage_number
  &id=eq.{passage_id}
```

### Assets

Asset bisa terkait ke exercise, question, atau passage. Backend sebaiknya mencari secara berlapis:

1. `question_id`
2. `passage_id`
3. `exercise_id`

## 8. Risiko Implementasi

### Service Role Key

`SUPABASE_SERVICE_ROLE_KEY` sudah dibuat di `Server/.env`. Key ini tidak boleh masuk frontend dan tidak boleh di-commit ke repository.

Karena key pernah dibagikan lewat chat, sebaiknya rotate/regenerate key dari dashboard Supabase sebelum production.

### Data Tidak Selalu Lengkap

Beberapa soal tidak punya `prompt`, `context`, atau `answer_note`. UI harus punya fallback.

Contoh fallback:

- Jika `context` kosong, sembunyikan area instruksi.
- Jika `prompt` kosong tetapi ada image/audio, tampilkan asset sebagai konten utama.
- Jika `answer_note` kosong, tampilkan hanya status benar/salah dan jawaban benar.

### Jawaban Benar Jangan Bocor

Karena `quiz_question_options` punya `is_correct`, endpoint frontend harus menyaring field ini sebelum mengirim response.

### Group Soal Jangan Dipecah

Soal dengan `source_group_key`, terutama `reading_passage`, sebaiknya diperlakukan sebagai satu unit. Ini penting untuk paket soal dan randomization.

## 9. Prioritas Pengembangan

Urutan implementasi yang paling aman:

1. Tambahkan Supabase client di backend.
2. Buat endpoint daftar level/section/exercise.
3. Buat endpoint ambil soal exercise tanpa membocorkan jawaban.
4. Buat endpoint submit jawaban.
5. Buat UI quiz dasar di Vue.
6. Tambahkan support passage.
7. Tambahkan support image/audio.
8. Implementasi paket `balanced_75`.
9. Simpan progress dan hasil user.

## 10. Kesimpulan

Database Supabase Ayumu sudah cukup matang untuk website latihan JLPT. Struktur yang ada mendukung:

- latihan berdasarkan level dan section.
- soal pilihan ganda.
- reading passage.
- listening audio.
- image-based questions.
- paket soal seimbang.
- paket soal per user.

Implementasi website sebaiknya memakai backend sebagai pengaman agar jawaban benar tidak bocor ke frontend sebelum user submit.
