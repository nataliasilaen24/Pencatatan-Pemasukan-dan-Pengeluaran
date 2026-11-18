# KeuanganKu — Pencatatan Pemasukan dan Pengeluaran

Aplikasi web untuk mencatat dan memantau pemasukan serta pengeluaran pribadi.
Pengerjaan dilakukan bertahap. Tahap pertama berfokus pada dashboard dan
pengelolaan transaksi di frontend.

## Fitur frontend saat ini

- Dashboard saldo, total pemasukan, total pengeluaran, dan kondisi keuangan.
- Grafik pemasukan dan pengeluaran per hari dengan pilihan bulan menggunakan Chart.js.
- Formulir tambah transaksi langsung di dashboard dan ringkasan bulan berjalan.
- Transaksi dengan tanggal, keterangan, kategori, jenis, jumlah, dan catatan.
- Tambah, ubah, dan hapus transaksi.
- Pencarian transaksi serta filter berdasarkan jenis dan rentang tanggal.
- Laporan harian, mingguan, bulanan, dan rentang tanggal khusus.
- Rekap pemasukan/pengeluaran per kategori dan ekspor laporan dalam format CSV.
- Tambah, ubah, dan hapus kategori pemasukan maupun pengeluaran.
- Perubahan nama kategori ikut diperbarui pada transaksi terkait; kategori yang masih dipakai tidak dapat dihapus.
- Penyimpanan sementara menggunakan `localStorage` pada browser yang digunakan.
- Tampilan responsif untuk desktop dan smartphone.

Aplikasi menyediakan mode lokal yang dapat dibuka langsung dari `index.html`
serta mode backend PHP dengan PostgreSQL. Mode lokal menyimpan data di browser
dan tidak memerlukan login atau server. Mode backend memerlukan server PHP dan
PostgreSQL; data transaksi dan kategori dipisahkan berdasarkan akun pengguna.
Password disimpan dalam bentuk hash dan koneksi database menggunakan prepared
statements.

## Lokasi file

```text
Pencatatan-Pemasukan-dan-Pengeluaran/
├── backend/
│   ├── api/
│   │   ├── auth.php
│   │   ├── categories.php
│   │   └── transactions.php
│   └── config/
│       ├── bootstrap.php
│       └── database.php
├── database/
│   ├── schema.sql
│   └── setup.php
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── index.html
└── README.md
```

## Membuka langsung untuk demo lokal

Klik dua kali `frontend\index.html` di File Explorer. Aplikasi akan berjalan
dalam mode lokal: transaksi dan kategori tersimpan di `localStorage` browser,
tanpa login, PHP, Apache, atau PostgreSQL. Data hanya tersedia pada browser dan
perangkat yang sama. Pada mode ini, perubahan tidak masuk ke database PostgreSQL.

## Menjalankan mode backend dengan PostgreSQL tanpa Apache XAMPP

Untuk penggunaan berikutnya, klik dua kali `buka-keuanganku.bat` dari folder
proyek. Launcher menjalankan server PHP bawaan tanpa Apache dan membuka
`frontend/index.html` melalui `http://127.0.0.1:8000/`. Pastikan PostgreSQL
aktif dan `backend\.env` sudah diisi. Tutup jendela server PHP untuk
menghentikannya.

1. Pasang PostgreSQL untuk Windows, lalu buka `services.msc` dan pastikan
   service PostgreSQL berstatus **Running**. MySQL di XAMPP tidak diperlukan.
2. Pastikan PHP tersedia. Jika menggunakan PHP dari XAMPP, Apache tidak perlu
   dinyalakan. Aktifkan ekstensi `pdo_pgsql` di
   `C:\xampp\php\php.ini` (hapus tanda `;` pada baris `extension=pdo_pgsql`),
   lalu pastikan ekstensi terdeteksi:
   ```powershell
   C:\xampp\php\php.exe -m
   ```
   Output harus memuat `pdo_pgsql`.
3. Simpan proyek di folder mana saja, misalnya:
   `C:\projects\Pencatatan-Pemasukan-dan-Pengeluaran` (tidak perlu di `htdocs`).
4. Dari folder utama proyek, buat konfigurasi database lokal:
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```
   Isi `DB_PASSWORD` di `backend\.env` dengan password PostgreSQL yang dibuat
   saat PostgreSQL dipasang.
5. Siapkan database dan tabel:
   ```powershell
   C:\xampp\php\php.exe database\setup.php
   ```
   Pengguna PostgreSQL perlu memiliki izin membuat database (default `postgres`
   biasanya memilikinya).
6. Alternatifnya, dari folder utama proyek jalankan server bawaan PHP secara manual:
   ```powershell
   C:\xampp\php\php.exe -S 127.0.0.1:8000 -t .
   ```
   Perintah ini menjalankan PHP tanpa Apache. Biarkan terminal tetap terbuka,
   lalu buka `http://127.0.0.1:8000/frontend/`. Mode ini menggunakan PHP API dan
   PostgreSQL; berbeda dengan mode lokal yang dibuka langsung dari file.
7. Daftar akun baru, lalu tambah atau kelola transaksi. Data akan disimpan di database.

Grafik Chart.js dimuat dari CDN, sehingga koneksi internet diperlukan agar grafik
dapat ditampilkan. Formulir dan daftar transaksi tetap dapat digunakan jika grafik
tidak berhasil dimuat.

## Langkah pengembangan berikutnya

1. Menambahkan migrasi data dari `localStorage` pengguna lama ke akun database.
2. Menambahkan pengujian otomatis untuk API autentikasi, transaksi, dan kategori.
3. Menambahkan pemulihan password dan verifikasi email.
4. Menyiapkan deployment produksi beserta HTTPS dan konfigurasi database khusus.

## Git (opsional)

Jalankan perintah berikut dari folder proyek untuk mulai melacak perubahan:

```powershell
git init
git add .
git commit -m "Membuat dashboard awal KeuanganKu"
```"# Pencatatan-Pemasukan-dan-Pengeluaran" 
