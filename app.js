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
        tanggal_pesan: req.body.tanggal_pesan,
        durasi_menginap: req.body.durasi_menginap,
        termasuk_breakfast: req.body.termasuk_breakfast ? true : false,
        total_bayar: req.body.total_bayar
    };

    const sql = 'INSERT INTO bookings SET ?';
    db.query(sql, bookingData, (err, result) => {
        if (err) throw err;
        res.send('Pemesanan berhasil disimpan!');
    });
});

// Menjalankan server di port 3000
const port = 3000;
app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});