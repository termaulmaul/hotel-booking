const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const moment = require('moment'); // Untuk manipulasi tanggal

// Inisialisasi aplikasi Express
const app = express();

// Menggunakan body-parser untuk menangani data dari form
app.use(bodyParser.urlencoded({ extended: true }));

// Menyajikan file statis dari folder 'public'
app.use(express.static('public'));

// Mengatur view engine menjadi EJS
app.set('view engine', 'ejs');

// Membuat koneksi ke database
const db = mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: '',
    database: 'hotel_booking'
});

// Koneksi ke database
db.connect((err) => {
    if (err) {
        console.error('Koneksi ke database gagal: ' + err.stack);
        return;
    }
    console.log('Terhubung ke database sebagai ID ' + db.threadId);
});

// Fungsi untuk mengonversi harga ke format Rupiah
function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(angka);
}

// Membuat fungsi formatRupiah tersedia untuk semua template EJS
app.locals.formatRupiah = formatRupiah;

// Menghitung total harga setelah diskon
function hitungTotalHarga(hargaPerMalam, durasiMenginap) {
    const totalHarga = hargaPerMalam * durasiMenginap;
    let diskon = 0;

    if (durasiMenginap > 2) {
        diskon = totalHarga * 0.1; // Diskon 10% jika menginap lebih dari 2 malam
    }

    const hargaDiskon = totalHarga - diskon;

    return { totalHarga, hargaDiskon, diskon };
}

// Halaman Home
app.get('/', (req, res) => {
    res.render('index');
});

// Halaman Produk
app.get('/products', (req, res) => {
    res.render('products');
});

// Halaman Tentang Kami
app.get('/about', (req, res) => {
    res.render('about');
});

// Halaman Pemesanan
app.get('/booking', (req, res) => {
    res.render('booking', { bookingDetail: null });
});

// Untuk menyimpan data pemesanan ke dalam tabel bookings
app.post('/booking', (req, res) => {
    console.log('Tanggal Pesan:', req.body.tanggal_pesan);

    const hargaPerMalam = parseInt(req.body.harga.replace(/[^0-9,-]+/g,"")); // Konversi harga ke integer
    const durasiMenginap = parseInt(req.body.durasi_menginap);

    const { totalHarga, hargaDiskon, diskon } = hitungTotalHarga(hargaPerMalam, durasiMenginap);

    const bookingData = {
        nama_pemesan: req.body.nama_pemesan,
        jenis_kelamin: req.body.jenis_kelamin,
        nomor_identitas: req.body.nomor_identitas,
        tipe_kamar: req.body.tipe_kamar,
        harga: totalHarga,
        tanggal_pesan: req.body.tanggal_pesan, // Hapus formatTanggal jika formatnya sudah benar
        durasi_menginap: durasiMenginap,
        termasuk_breakfast: req.body.termasuk_breakfast ? 1 : 0, // Menggunakan 1 atau 0 untuk boolean
        total_bayar: hargaDiskon + (req.body.termasuk_breakfast ? 80000 : 0) // Tambahkan harga breakfast jika terpilih
    };

    console.log('Data Pemesanan:', bookingData);

    const sql = 'INSERT INTO bookings SET ?';
    db.query(sql, bookingData, (err, result) => {
        if (err) {
            console.error('Error saat menyimpan pemesanan: ' + err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan pemesanan.' });
        } else {
            res.render('booking', { bookingDetail: bookingData });
        }
    });
});


// Halaman Admin untuk melihat dan mengelola data pemesanan
app.get('/admin', (req, res) => {
    const today = moment().format('YYYY-MM-DD');
    const selectedDate = req.query.date || today;

    // Validasi tanggal yang dipilih
    if (moment(selectedDate).isAfter(today, 'month')) {
        return res.status(400).send('Tanggal tidak valid, hanya bisa memilih bulan ini atau sebelumnya.');
    }

    const startOfMonth = moment(selectedDate).startOf('month').format('YYYY-MM-DD');
    const endOfMonth = moment(selectedDate).endOf('month').format('YYYY-MM-DD');

    const bookingsQuery = 'SELECT * FROM bookings WHERE tanggal_pesan BETWEEN ? AND ?';
    db.query(bookingsQuery, [startOfMonth, endOfMonth], (err, bookings) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            res.status(500).send('Internal Server Error');
        } else {
            // Ambil data pemesanan per bulan
            const monthlyDataQuery = `
                SELECT MONTH(tanggal_pesan) AS month, COUNT(*) AS total
                FROM bookings
                WHERE tanggal_pesan BETWEEN ? AND ?
                GROUP BY MONTH(tanggal_pesan)
                ORDER BY MONTH(tanggal_pesan)
            `;
            db.query(monthlyDataQuery, [startOfMonth, endOfMonth], (err, monthlyData) => {
                if (err) {
                    console.error('Error fetching monthly data:', err);
                    res.status(500).send('Internal Server Error');
                } else {
                    // Format data untuk chart
                    const chartLabels = Array.from({ length: 12 }, (_, i) => moment().month(i).format('MMM'));
                    const chartData = Array(12).fill(0);
                    monthlyData.forEach((row) => {
                        chartData[row.month - 1] = row.total;
                    });

                    res.render('admin', {
                        bookings,
                        selectedDate,
                        today,
                        chartLabels,
                        chartData
                    });
                }
            });
        }
    });
});

// Halaman Edit untuk mengedit pesanan tertentu
app.get('/admin_edit/:id', (req, res) => {
    const bookingId = req.params.id;
    const sql = 'SELECT * FROM bookings WHERE id = ?';
    db.query(sql, [bookingId], (err, result) => {
        if (err) {
            console.error('Error saat mengambil data pesanan: ' + err);
            res.status(500).send('Terjadi kesalahan saat mengambil data pesanan.');
        } else {
            if (result.length > 0) {
                res.render('admin_edit', { booking: result[0] });
            } else {
                res.status(404).send('Pesanan tidak ditemukan.');
            }
        }
    });
});

// Mengupdate data pemesanan di halaman admin_edit
app.post('/admin_edit/:id', (req, res) => {
    const bookingId = req.params.id;
    const updatedBookingData = {
        nama_pemesan: req.body.nama_pemesan,
        jenis_kelamin: req.body.jenis_kelamin,
        nomor_identitas: req.body.nomor_identitas,
        tipe_kamar: req.body.tipe_kamar,
        harga: parseInt(req.body.harga.replace(/[^0-9,-]+/g,"")),
        tanggal_pesan: formatTanggal(req.body.tanggal_pesan),
        durasi_menginap: parseInt(req.body.durasi_menginap),
        termasuk_breakfast: req.body.termasuk_breakfast ? 1 : 0, // Menggunakan 1 atau 0 untuk boolean
        total_bayar: parseInt(req.body.total_bayar.replace(/[^0-9,-]+/g,""))
    };

    const sql = 'UPDATE bookings SET ? WHERE id = ?';
    db.query(sql, [updatedBookingData, bookingId], (err, result) => {
        if (err) {
            console.error('Error saat mengupdate data pesanan: ' + err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat mengupdate data pesanan.' });
        } else {
            res.json({ success: true, message: 'Data pesanan berhasil diupdate!' });
        }
    });
});

// Menghapus pesanan dari halaman admin
app.post('/admin_delete/:id', (req, res) => {
    const bookingId = req.params.id;
    const sql = 'DELETE FROM bookings WHERE id = ?';
    db.query(sql, [bookingId], (err, result) => {
        if (err) {
            console.error('Error saat menghapus data pesanan: ' + err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus data pesanan.' });
        } else {
            res.json({ success: true, message: 'Data pesanan berhasil dihapus!' });
        }
    });
});

// Menjalankan server di port 3000
const port = 3000;
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
