// config/credentials.js
module.exports = {
    // Yönetici kimlik bilgileri (kullanıcı adı: şifre)
    adminCredentials: {
        'admin': '1234', // Varsayılan yönetici kullanıcı adı ve şifresi
        'moderator': '5678'
    },
    // SSL sertifikası ve anahtar dosyalarının yolları
    SSL_KEY_PATH: './config/key.pem', // SSL özel anahtar dosyasının yolu
    SSL_CERT_PATH: './config/cert.pem' // SSL sertifika dosyasının yolu
};