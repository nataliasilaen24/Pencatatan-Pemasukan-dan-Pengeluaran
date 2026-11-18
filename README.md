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

Profil masih berupa informasi karena sistem akun belum dibuat. Logout memberi tahu
bahwa autentikasi belum tersedia dan tidak menghapus data. Versi ini belum
menggunakan backend PHP atau MySQL. Data di `localStorage` hanya tersedia di
browser/perangkat ini dan bukan penyimpanan aman untuk data sensitif.

## Lokasi file

```text
Pencatatan-Pemasukan-dan-Pengeluaran/
├── frontend/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── index.html
└── README.md
```

## Menjalankan dengan XAMPP

1. Pasang dan buka XAMPP.
2. Salin folder proyek ke dalam folder `htdocs`, misalnya:
   `C:\xampp\htdocs\Pencatatan-Pemasukan-dan-Pengeluaran`
3. Jalankan **Apache** melalui XAMPP Control Panel. MySQL belum diperlukan pada
   tahap ini.
4. Buka alamat berikut di browser:
   `http://localhost/Pencatatan-Pemasukan-dan-Pengeluaran/frontend/`
5. Pilih **Tambah Transaksi**, isi formulir, lalu simpan. Data dan ringkasan akan
   diperbarui otomatis.

Grafik Chart.js dimuat dari CDN, sehingga koneksi internet diperlukan agar grafik
dapat ditampilkan. Formulir dan daftar transaksi tetap dapat digunakan jika grafik
tidak berhasil dimuat.

## Langkah pengembangan berikutnya

1. Membuat skema database MySQL serta API backend PHP menggunakan prepared statements.
2. Memindahkan penyimpanan transaksi dan kategori dari `localStorage` ke database.
3. Membuat autentikasi dan memastikan data terpisah untuk setiap pengguna.
4. Menghubungkan profil dan logout dengan sistem akun.

## Git (opsional)

Jalankan perintah berikut dari folder proyek untuk mulai melacak perubahan:

```powershell
git init
git add .
git commit -m "Membuat dashboard awal KeuanganKu"
```