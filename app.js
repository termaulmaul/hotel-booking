const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

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
    port: 3306,
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

// Fungsi untuk mengonversi tanggal dari format dd/mm/yyyy ke yyyy-mm-dd
function formatTanggal(tanggal) {
    const [day, month, year] = tanggal.split('/');
    return `${year}-${month}-${day}`;
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
    res.render('booking');
});

// Untuk menyimpan data pemesanan ke dalam tabel bookings
app.post('/booking', (req, res) => {
    const bookingData = {
        nama_pemesan: req.body.nama_pemesan,
        jenis_kelamin: req.body.jenis_kelamin,
        nomor_identitas: req.body.nomor_identitas,
        tipe_kamar: req.body.tipe_kamar,
        harga: req.body.harga,
        tanggal_pesan: formatTanggal(req.body.tanggal_pesan),
        durasi_menginap: req.body.durasi_menginap,
        termasuk_breakfast: req.body.termasuk_breakfast ? true : false,
        total_bayar: req.body.total_bayar
    };

    const sql = 'INSERT INTO bookings SET ?';
    db.query(sql, bookingData, (err, result) => {
        if (err) {
            console.error('Error saat menyimpan pemesanan: ' + err);
            res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menyimpan pemesanan.' });
        } else {
            res.json({ success: true, message: 'Pemesanan berhasil disimpan!' });
        }
    });
});

// Halaman Admin untuk melihat dan mengelola data pemesanan
app.get('/admin', (req, res) => {
    const sql = 'SELECT * FROM bookings';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error saat mengambil data pemesanan: ' + err);
            res.status(500).send('Terjadi kesalahan saat mengambil data pemesanan.');
        } else {
            res.render('admin', { bookings: results });
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
        harga: req.body.harga,
        tanggal_pesan: formatTanggal(req.body.tanggal_pesan),
        durasi_menginap: req.body.durasi_menginap,
        termasuk_breakfast: req.body.termasuk_breakfast ? true : false,
        total_bayar: req.body.total_bayar
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