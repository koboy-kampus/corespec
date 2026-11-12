# CoreSpec dalam angka

Keadaan per **12 November 2026**, cabang `feat/phase-16-auth` (Fase 16c). Angka
katalog dan aturan diambil dari `data/` dan `lib/compat/`; angka pengujian dan
Lighthouse dari pengukuran pada tanggal yang sama.

Gambar di folder ini (dibuat dengan `npm run diagrams`, ukuran ±2.400–3.100 px
lebar, tetap tajam pada lebar halaman Word 16 cm):

| Berkas                             | Isi                                                         |
| ---------------------------------- | ----------------------------------------------------------- |
| `erd.png`                          | ERD basis data (notasi kaki gagak)                          |
| `use-case.png`                     | Diagram use case: Tamu, Pengguna, Admin                     |
| `aktivitas-cek-kompatibilitas.png` | Diagram aktivitas: mengecek kompatibilitas                  |
| `aktivitas-admin-ubah-listing.png` | Diagram aktivitas: admin mengubah listing harga marketplace |

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

## Basis data (Fase 16)

- **7 tabel**: `auth.users` (dikelola Supabase Auth), `profiles`, `builds`,
  `items`, `listings`, `site_settings`, `audit_log`. Lihat `erd.png`.
- **5 berkas migrasi** SQL dan `seed.sql` (katalog dari JSON, aman dijalankan
  ulang).
- **Row Level Security** aktif di semua tabel. `supabase/tests/rls.sql` berisi
  **84 pemeriksaan** (tamu, pengguna, admin): misalnya pengguna tidak bisa
  menjadikan dirinya admin, tidak bisa membaca build orang lain, dan bukan admin
  tidak bisa mengubah item atau listing. Pemeriksaan ini hanya menghitung akun
  ujinya sendiri (`rls-*@example.test`) atau selisih dari isi basis data
  sebelumnya, jadi aman dijalankan di proyek yang sudah dipakai; semuanya
  dibatalkan (rollback) di akhir. Lolos di Postgres lokal, baik pada basis data
  kosong maupun yang sudah berisi akun admin, pengguna dan build.
- **Di proyek Supabase asli** (12 November 2026): kelima migrasi dan
  `seed.sql` sudah dijalankan (181 item dalam 20 kategori, 4 listing).
  `rls.sql` versi Fase 16a lolos di sana; versi terbaru menunggu dijalankan
  ulang.
- **7 fungsi `security definer`**, semuanya dengan `search_path` kosong dan
  tidak bisa dipanggil tamu.

## Pengujian

| Jenis                                                     | Jumlah                                            | Hasil         |
| --------------------------------------------------------- | ------------------------------------------------- | ------------- |
| Unit (Vitest)                                             | 319 tes dalam 25 berkas                           | lolos         |
| End-to-end (Playwright), akun nonaktif                    | 75 tes                                            | lolos         |
| End-to-end, akun aktif tetapi basis data tidak terjangkau | 71 tes (4 dilewati karena khusus mode tanpa akun) | lolos         |
| Aksesibilitas (axe, di dalam e2e)                         | semua halaman dan dialog utama                    | 0 pelanggaran |

Pengujian unit juga menjalankan semua migrasi, `rls.sql` dan `seed.sql` di
Postgres lokal (PGlite), termasuk 9 uji "mutasi" yang sengaja melonggarkan satu
aturan keamanan dan memastikan `rls.sql` mendeteksinya.

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
