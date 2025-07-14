const fs = require('fs'); // Dosya sistemi işlemleri için
const https = require('https'); // HTTPS sunucusu oluşturmak için
const express = require('express'); // Web çerçevesi
const socketIo = require('socket.io'); // WebSocket iletişimi için
const setupRoutes = require('./routes'); // Rota tanımlamalarını içeren modül
const setupSocketHandler = require('./socketHandler'); // Socket.IO olaylarını yöneten modül
const { adminCredentials, SSL_KEY_PATH, SSL_CERT_PATH } = require('../config/credentials'); // Kimlik bilgileri ve SSL yolları

const app = express(); // Express uygulamasını başlat

// HTTPS sunucusunu oluştur
const server = https.createServer({
    key: fs.readFileSync(SSL_KEY_PATH), // SSL özel anahtarı
    cert: fs.readFileSync(SSL_CERT_PATH) // SSL sertifikası
}, app);

const io = socketIo(server); // Socket.IO'yu HTTPS sunucusu ile başlat

// İstekleri loglamak için ara yazılım (middleware)
app.use((req, res, next) => {
    // Favicon isteklerini yoksay
    if (req.originalUrl === '/favicon.ico') return res.status(204).end();

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // İstemci IP adresini al
    const start = Date.now(); // İsteğin başlangıç zamanı

    console.log(`🌐 Yeni istek geldi: ${req.method} ${req.originalUrl} - IP: ${ip}`); // İstek bilgilerini konsola yaz

    // Yanıt tamamlandığında çalışacak olay dinleyici
    res.on('finish', () => {
        const duration = Date.now() - start; // İsteğin süresi
        const log = `[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms) - IP: ${ip}`;

        // HTTP durum koduna göre loglama seviyesi belirle
        if (res.statusCode >= 500) {
            console.error('❌ Sunucu Hatası:', log); // 5xx hataları için hata logu
        } else if (res.statusCode >= 400) {
            console.warn('⚠️ İstemci Hatası:', log); // 4xx hataları için uyarı logu
        } else {
            console.log('✅ Başarılı:', log); // Diğer başarılı istekler için bilgi logu
        }
    });

    next(); // Sonraki ara yazılıma geç
});

// Global hata yakalama ara yazılımı
app.use((err, req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.error(`❗️ Uygulama hatası: ${err.message} - IP: ${ip}`); // Uygulama hatalarını logla
    res.status(500).send('Sunucu Hatası!'); // İstemciye 500 hatası gönder
});

app.use(express.json()); // JSON istek gövdelerini ayrıştırmak için
app.use(express.static('public')); // 'public' klasöründeki statik dosyaları sun

// Rotaları ayarla
setupRoutes(app, io);

// Socket.IO olay işleyicilerini ayarla
setupSocketHandler(io);

const PORT = 3000; // Sunucunun dinleyeceği port
const HOST = '0.0.0.0'; // Sunucunun dinleyeceği IP adresi (tüm arayüzler)

// Sunucuyu başlat
server.listen(PORT, HOST, () => {
    console.log(`🚀 Sunucu çalışıyor: https://${HOST}:${PORT}`);
});