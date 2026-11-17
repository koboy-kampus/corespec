# CoreSpec dalam angka

Keadaan per **18 November 2026**, cabang `feat/phase-18-chat` (Fase 18c).
Angka katalog dan aturan diambil dari `data/` dan `lib/compat/`; angka
pengujian dari pengukuran pada tanggal yang sama. Angka Lighthouse masih dari
Fase 16 (12 November 2026); halaman yang diukur tidak berubah di Fase 17
(lihat bagian Pesanan).

Gambar di folder ini (dibuat dengan `npm run diagrams`, ukuran ±2.400–3.100 px
lebar, tetap tajam pada lebar halaman Word 16 cm):

| Berkas                              | Isi                                                           |
| ----------------------------------- | ------------------------------------------------------------- |
| `erd.png`                           | ERD basis data (notasi kaki gagak)                            |
| `use-case.png`                      | Diagram use case: Tamu, Pengguna, Admin                       |
| `aktivitas-cek-kompatibilitas.png`  | Diagram aktivitas: mengecek kompatibilitas                    |
| `aktivitas-admin-ubah-listing.png`  | Diagram aktivitas: admin mengubah listing harga marketplace   |
| `aktivitas-simulasi-pembayaran.png` | Diagram aktivitas: checkout dan simulasi pembayaran (Fase 17) |
| `aktivitas-live-chat.png`           | Diagram aktivitas: live chat dengan bot dan admin (Fase 18)   |

## Katalog

**181 item** dalam 20 kategori: **73 komponen PC** (8 kategori) dan **108 item
setup meja** (12 kategori). Setiap kategori punya minimal 3 item di tiap
tingkatan (budget, mid, high).

| Kategori PC   |   Item | Kategori setup |    Item |
| ------------- | -----: | -------------- | ------: |
| CPU           |      9 | Monitor        |       9 |
| Pendingin CPU |     10 | Lengan monitor |       9 |
| Motherboard   |      9 | Keyboard       |       9 |
| Memori (RAM)  |      9 | Mouse          |       9 |
| Kartu grafis  |      9 | Mousepad       |       9 |
| Penyimpanan   |      9 | Headset        |       9 |
| Power supply  |      9 | Speaker        |       9 |
| Casing        |      9 | Webcam         |       9 |
|               |        | Mikrofon       |       9 |
|               |        | Lampu meja     |       9 |
|               |        | Meja           |       9 |
|               |        | Kursi          |       9 |
| **Jumlah**    | **73** | **Jumlah**     | **108** |

- Pendingin CPU: 4 budget, 3 mid, 3 high. Kategori lain: 3 per tingkatan.
- **Listing marketplace yang dicek manual: 4** (pada 3 item), dari Tokopedia
  dan Shopee, dicek 11 November 2026. Item lain memakai harga estimasi
  (per 8 November 2026).
- Harga tidak pernah diambil otomatis (tanpa scraping); CoreSpec hanya
  menautkan ke marketplace.

## Aturan kompatibilitas

**15 aturan**: 10 aturan PC dan 5 aturan setup. Tingkat: **error** (build tidak
bisa dirakit), **warning** (bisa, tetapi kurang baik), **info** (catatan).

### Aturan PC (10)

|  No | Aturan             | Yang dicek                                                                     | Tingkat         |
| --: | ------------------ | ------------------------------------------------------------------------------ | --------------- |
|   1 | `cpu-socket`       | Soket CPU sama dengan soket motherboard                                        | error           |
|   2 | `memory-type`      | Jenis RAM (DDR4/DDR5) didukung motherboard                                     | error           |
|   3 | `ram-slots`        | Jumlah keping RAM tidak melebihi slot motherboard                              | error           |
|   4 | `board-fits-case`  | Ukuran motherboard (ATX/mATX/ITX) muat di casing                               | error           |
|   5 | `gpu-clearance`    | Panjang kartu grafis muat di casing                                            | error           |
|   6 | `cooler-clearance` | Tinggi pendingin udara muat di casing                                          | error           |
|   7 | `cooler-socket`    | Pendingin mendukung soket CPU                                                  | error           |
|   8 | `psu-size`         | Casing khusus SFX tidak diberi PSU ATX                                         | error           |
|   9 | `psu-headroom`     | Daya PSU di bawah estimasi pemakaian → error; di bawah 1,3× estimasi → warning | error / warning |
|  10 | `missing-parts`    | Slot PC yang belum dipilih                                                     | info            |

### Aturan setup (5)

|  No | Aturan               | Yang dicek                                                  | Tingkat |
| --: | -------------------- | ----------------------------------------------------------- | ------- |
|   1 | `monitor-resolution` | Resolusi monitor di atas kelas kartu grafis                 | warning |
|   2 | `monitor-refresh`    | Refresh rate ≥ 240 Hz di resolusi kelas kartu grafis itu    | info    |
|   3 | `sync-vendor`        | Monitor G-Sync (modul) dengan kartu grafis non-NVIDIA       | info    |
|   4 | `desk-width`         | Monitor dan speaker lebih lebar dari meja                   | warning |
|   5 | `arm-fit`            | Ukuran atau berat monitor melebihi kemampuan lengan monitor | warning |

Ringkasan tingkat: 8 aturan hanya error, 1 aturan error atau warning, 3 aturan
warning, 3 aturan info.

## Basis data (Fase 16, 17 dan 18)

- **11 tabel**: `auth.users` (dikelola Supabase Auth), `profiles`, `builds`,
  `items`, `listings`, `site_settings`, `audit_log`, sejak Fase 17 `orders`
  dan `payment_config`, dan sejak Fase 18 `conversations` dan
  `chat_messages`. Lihat `erd.png`.
- **8 berkas migrasi** SQL dan `seed.sql` (katalog dari JSON, aman dijalankan
  ulang).
- **Row Level Security** aktif di semua tabel. `supabase/tests/rls.sql` berisi
  **191 pemeriksaan** (tamu, pengguna, admin): misalnya pengguna tidak bisa
  menjadikan dirinya admin, tidak bisa membaca build atau pesanan orang lain,
  bukan admin tidak bisa mengubah item atau listing, dan tidak ada yang bisa
  menulis pesanan tanpa rahasia server, dan pengguna tidak bisa membaca chat
  orang lain atau menulis sebagai admin atau bot. Cara hitung: setiap `assert` dan
  setiap `raise exception 'FAIL: …'` dihitung satu. Dengan cara yang sama,
  versi Fase 16c berisi 97; angka 84 yang tertulis sebelumnya memakai cara
  hitung lain yang tidak tercatat. Pemeriksaan ini hanya menghitung akun
  ujinya sendiri (`rls-*@example.test`) atau selisih dari isi basis data
  sebelumnya, jadi aman dijalankan di proyek yang sudah dipakai; semuanya
  dibatalkan (rollback) di akhir. Lolos di Postgres lokal, baik pada basis data
  kosong maupun yang sudah berisi akun admin, pengguna dan build.
- **Di proyek Supabase asli:** migrasi Fase 16 dan `seed.sql` dijalankan
  12 November 2026 (181 item dalam 20 kategori, 4 listing); `rls.sql` lolos
  14 November. Migrasi pesanan (Fase 17) dijalankan 17 November 2026 dan
  `rls.sql` versi saat itu lolos di sana. Migrasi chat (Fase 18,
  `20261118000100_chat.sql`) dijalankan 18 November 2026, dan `rls.sql`
  dengan **191 pemeriksaan** lolos di proyek asli.
- **18 fungsi `security definer`**, semuanya dengan `search_path` kosong
  (6 di antaranya untuk chat). Enam belas tidak bisa dipanggil tamu. Dua (`create_order`,
  `set_order_payment`) memang bisa dipanggil siapa saja, karena notifikasi
  Midtrans datang tanpa sesi, tetapi keduanya menolak setiap panggilan tanpa
  `ORDER_WRITE_SECRET` yang hanya ada di server (basis data hanya menyimpan
  hash SHA-256-nya).

## Pesanan dan simulasi pembayaran (Fase 17)

- **Simulasi**, bukan toko: Midtrans **Sandbox**, tanpa uang nyata, tidak ada
  barang yang dijual atau dikirim. Kode hanya berisi alamat sandbox Midtrans.
- **5 status pesanan**: `pending`, `paid`, `failed`, `expired`, `cancelled`.
  `paid` bersifat final; `pending` tidak pernah menggantikan status lain.
- **Harga dihitung ulang di server** dari katalog; browser hanya mengirim
  komponen yang dipilih. Build dengan error kompatibilitas tidak bisa
  di-checkout (warning tidak menghalangi).
- **Batas spam:** 5 pesanan pending per akun per jam.
- **Halaman baru:** `/checkout`, `/orders`, `/orders/[id]`, `/admin/orders`,
  dan alamat notifikasi `/api/midtrans/notification`. Semuanya `noindex`;
  tanpa pengaturan Midtrans semuanya 404 dan situs sama seperti sebelumnya.
- **Struk PDF** dibuat di browser (pdf-lib): gambar 3D PC dan meja
  (1200 × 900 piksel, sama di ponsel dan laptop), item, total, kode QR ke
  halaman build, dan tulisan "SIMULASI — bukan bukti transaksi" di setiap
  halaman. Klik tombolnya memuat sekitar 470 KB JavaScript (gzip), termasuk
  three.js sekitar 281 KB yang sama dengan di builder; halaman lain tidak
  bertambah, kecuali `/builder` dan `/b/[kode]` sekitar 0,7 KB (sebelum gzip).
- **Uji nyata di preview** (17 November 2026): dua pesanan dibayar dengan kartu
  uji sandbox dan berstatus Paid.

## Live chat (Fase 18)

- **Pengguna yang login** bisa chat dengan admin; tamu tidak melihat tombol
  chat. Admin menjawab dari inbox `/admin/chat` (filter All, Needs admin,
  Open, Closed; tanda belum dibaca).
- **2 tabel** (`conversations`, satu per pengguna; `chat_messages`),
  **7 fungsi** (6 `security definer`, 1 untuk izin topik Realtime) dan
  **1 kebijakan** di `realtime.messages`.
- **Batas di basis data:** pesan 1–1000 karakter (setelah dipangkas);
  maksimal **5 pesan per 30 detik** dan **60 per hari** per pengguna; pesan
  bot hanya bisa ditulis dengan rahasia server.
- **Seketika:** Supabase Realtime (Broadcast dari basis data) ke topik privat
  `chat:<id>` (pemilik dan admin) dan `chat:admin` (admin saja). Jika belum
  tersambung dalam **10 detik** atau terputus, panel memeriksa pesan baru
  setiap **5 detik** sampai tersambung lagi.
- **Server di Singapura:** sejak 18 November 2026 fungsi Vercel berjalan di
  region `sin1` (`vercel.json`), dekat basis data Supabase di Singapura.
  Sebelumnya fungsi berjalan di region bawaan Vercel di Amerika Serikat dan
  satu pengiriman pesan terasa 1–2 detik; sesudahnya pesan langsung tampil
  (diuji di iPhone pada preview). Waktunya tidak diukur dengan angka.
- **Ukuran halaman:** setiap halaman +0,9 KB JavaScript (1,3 KB gzip). Tombol
  chat (1,4 KB gzip) hanya dimuat untuk browser yang login; panel 4,9 KB dan
  Realtime 16,5 KB (gzip) hanya saat chat dibuka; inbox admin sekitar 14 KB.
- **Uji nyata** (18 November 2026, iPhone dan laptop pada preview): pesan
  tampil seketika dua arah, tanda Needs admin, sambung ulang setelah wifi
  mati, batas kirim, tombol Retry, dan bot tetap menjawab pertanyaan setelah
  admin membalas.

### Aturan bot (8 + fallback)

Bot tanpa AI: kata kunci bahasa Inggris dan Indonesia, dicocokkan setelah
huruf kecil, aksen dan tanda baca dibuang. Kata kunci 5 huruf atau lebih juga
cocok dengan awal kata ("harga" → "harganya"); yang lebih pendek harus utuh.
Aturan dicek berurutan; yang pertama cocok menjawab. Setiap balasan paling
panjang 300 karakter, tanpa tautan ke luar CoreSpec dan tanpa kontak.

|  No | Aturan          | Kata kunci                                                                                                  | Saat admin aktif¹ |
| --: | --------------- | ----------------------------------------------------------------------------------------------------------- | ----------------- |
|   1 | `human`         | admin, human, manusia, cs, operator                                                                         | diam              |
|   2 | `prices`        | price, prices, harga, mahal, murah, real, asli                                                              | menjawab          |
|   3 | `compatibility` | compatible, compatibility, incompatible, kompatibel, kompatibilitas, error, cocok, socket, soket, psu, watt | menjawab          |
|   4 | `receipt`       | struk, receipt, pdf, nota, invoice                                                                          | menjawab          |
|   5 | `checkout`      | checkout, bayar, pay, payment, pembayaran, midtrans, simulasi, simulation                                   | menjawab          |
|   6 | `share`         | share, sharing, bagikan, link, kirim                                                                        | menjawab          |
|   7 | `account`       | login, akun, account, password, daftar, register                                                            | menjawab          |
|   8 | `greeting`      | halo, hallo, hai, hi, hello, hey, pagi, siang, sore, malam, p                                               | diam              |
|   — | fallback        | (tidak ada yang cocok): "Thanks! An admin will reply soon (Admin akan membalas segera)."                    | diam²             |

¹ Admin aktif: admin menulis di percakapan itu dalam 10 menit terakhir. Bila
aturan yang diam cocok lebih dulu, aturan pertanyaan berikutnya yang cocok
tetap menjawab ("halo admin, harga?" → `prices`).
² Fallback juga paling banyak sekali per 10 menit. Needs admin di inbox: balasan
bot terakhir memakai `human` atau fallback dan belum ada balasan admin
sesudahnya (dihitung dari pesan, tidak disimpan).

Lima pertanyaan cepat (chip): "Are the prices real?", "Why is my build
incompatible?", "How does checkout work?", "Download receipt", "Talk to
admin"; masing-masing mengenai satu aturan.

## Pengujian

| Jenis                                        | Jumlah                                        | Hasil         |
| -------------------------------------------- | --------------------------------------------- | ------------- |
| Unit (Vitest)                                | 515 tes dalam 35 berkas                       | lolos         |
| End-to-end (Playwright), akun nonaktif       | 118 tes (10 dilewati: khusus mode akun aktif) | lolos         |
| End-to-end, akun dan checkout aktif (tiruan) | 38 tes (7 dilewati)                           | lolos         |
| Aksesibilitas (axe, di dalam e2e)            | semua halaman dan dialog utama                | 0 pelanggaran |

Pengujian unit juga menjalankan semua migrasi, `rls.sql` dan `seed.sql` di
Postgres lokal (PGlite), termasuk 17 uji "mutasi" yang sengaja melonggarkan
satu aturan keamanan dan memastikan `rls.sql` mendeteksinya (2 di antaranya
untuk pesanan: pesanan orang lain terbaca, dan rahasia yang salah diterima;
2 untuk chat: pesan orang lain terbaca, dan balasan bot tanpa rahasia
diterima).
Pembayaran sungguhan tidak bisa dijalankan otomatis; daftar cek manualnya ada
di `docs/accounts.md`.

## Kinerja (Lighthouse)

Lighthouse 13.6, profil seluler, simulasi throttling bawaan, median dari 3 kali
pengukuran, build produksi lokal (`next start`) dengan fitur akun aktif.
"Sebelum" adalah Fase 16a; "sesudah" adalah Fase 16b (katalog dari basis
data).

| Halaman     | Ukuran            | Sebelum | Sesudah (BD tak terjangkau) | Sesudah (BD berisi seed) |
| ----------- | ----------------- | ------: | --------------------------: | -----------------------: |
| `/`         | Skor              |      89 |                          89 |                       90 |
|             | TBT               |   11 ms |                       10 ms |                     9 ms |
|             | LCP               |  3,83 s |                      3,83 s |                   3,71 s |
|             | CLS               |       0 |                           0 |                        0 |
|             | JavaScript (gzip) |  295 KB |                      297 KB |                   297 KB |
| `/builder`  | Skor              |      98 |                         100 |                       99 |
|             | TBT               |  171 ms |                       91 ms |                   113 ms |
|             | LCP               |  0,76 s |                      0,76 s |                   0,76 s |
|             | CLS               |       0 |                           0 |                        0 |
|             | JavaScript (gzip) |  581 KB |                      583 KB |                   583 KB |
| `/b/[kode]` | Skor              |      86 |                          86 |                       88 |
|             | TBT               |  532 ms |                      527 ms |                   476 ms |
|             | LCP               |  1,06 s |                      1,06 s |                   1,06 s |
|             | CLS               |       0 |                           0 |                        0 |
|             | JavaScript (gzip) |  593 KB |                      595 KB |                   595 KB |

- Perbedaan nyata hanya +2 KB JavaScript; selisih lain masih dalam variasi
  antar-pengukuran.
- Halaman `/`, `/builder` dan `/b/[kode]` tetap statis (dibuat saat build dan
  diperbarui di latar belakang).
- LCP 3,7–3,8 s di `/` adalah estimasi simulasi Lighthouse untuk gambar poster
  (22 KB); pada pengukuran Fase 15, LCP yang teramati sekitar 0,15 s.
- Angka lokal lebih cepat daripada PageSpeed Insights pada situs live, yang
  mensimulasikan ponsel kelas menengah dengan jaringan lambat.
