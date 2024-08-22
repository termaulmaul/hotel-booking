-- Active: 1715621017756@@127.0.0.1@3306
-- database.sql
CREATE DATABASE hotel_booking;

USE hotel_booking;

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_pemesan VARCHAR(255) NOT NULL,
    jenis_kelamin ENUM('Laki-laki', 'Perempuan') NOT NULL,
    nomor_identitas CHAR(16) NOT NULL,
    tipe_kamar ENUM('Standar', 'Deluxe', 'Family') NOT NULL,
    harga DECIMAL(10, 2) NOT NULL,
    tanggal_pesan DATE NOT NULL,
    durasi_menginap INT NOT NULL,
    termasuk_breakfast BOOLEAN DEFAULT FALSE,
    total_bayar DECIMAL(10, 2) NOT NULL
);