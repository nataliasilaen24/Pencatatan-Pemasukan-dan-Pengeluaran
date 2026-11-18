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

Versi ini menggunakan PHP session, API PHP, dan database PostgreSQL. Data
transaksi dan kategori dipisahkan berdasarkan akun pengguna. Password disimpan
dalam bentuk hash dan koneksi database menggunakan prepared statements.

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

## Menjalankan dengan PostgreSQL dan Apache XAMPP

1. Pasang dan buka XAMPP.
2. Salin folder proyek ke dalam folder `htdocs`, misalnya:
   `C:\xampp\htdocs\Pencatatan-Pemasukan-dan-Pengeluaran`
3. Pasang PostgreSQL lokal dan jalankan servicenya. **MySQL di XAMPP tidak diperlukan**.
4. Aktifkan ekstensi PostgreSQL untuk PHP XAMPP dengan membuka
   `C:\xampp\php\php.ini`, menghapus tanda `;` pada baris `extension=pdo_pgsql`,
   lalu restart Apache. Pastikan perintah berikut menampilkan `pdo_pgsql`:
   ```powershell
   C:\xampp\php\php.exe -m
   ```
5. Jalankan **Apache** melalui XAMPP Control Panel.
6. Buat konfigurasi database lokal:
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```
   Isi `DB_PASSWORD` di `backend\.env` dengan password PostgreSQL yang dibuat
   saat PostgreSQL dipasang.
7. Jalankan skema database:
   ```powershell
   C:\xampp\php\php.exe database\setup.php
   ```
   Pengguna PostgreSQL perlu memiliki izin membuat database (default `postgres`
   biasanya memilikinya).
8. Buka `http://localhost/Pencatatan-Pemasukan-dan-Pengeluaran/frontend/`.
   Jangan buka `frontend/index.html` langsung atau melalui Live Server VS Code:
   keduanya tidak menjalankan PHP API.
9. Daftar akun baru, lalu tambah atau kelola transaksi. Data akan disimpan di database.

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
```