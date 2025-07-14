const CryptoJS = require('crypto-js'); // Kriptografi işlemleri için (AES şifreleme)
const stateManager = require('./stateManager'); // Uygulama durumunu yöneten modülü dahil et
const { adminCredentials } = require('../config/credentials'); // Yönetici kimlik bilgilerini al

module.exports = (app, io) => {
    // Odaya katılma uç noktası (endpoint)
    app.post('/katil', (req, res) => {
        const { isim } = req.body; // İstek gövdesinden kullanıcı adını al
        // Kullanıcıyı bir odaya ata veya yeni bir oda oluştur
        const { kullaniciID, oda, anahtar, mesaj, existing } = stateManager.assignUserToRoom(isim);

        if (!kullaniciID || !oda || !anahtar) {
            return res.status(500).json({ mesaj: "Kullanıcı odaya atanamadı." });
        }

        // Başarılı yanıtı gönder
        res.json({
            mesaj: mesaj,
            kullaniciID,
            oda,
            anahtar,
            isim: stateManager.getUserName(kullaniciID) // Kullanıcının gerçek adını gönder
        });
    });

    // Odadan ayrılma uç noktası
    app.post('/ayril', (req, res) => {
        const { kullaniciID, oda } = req.body; // İstek gövdesinden kullanıcı ID'si ve oda adını al

        if (!kullaniciID || !oda) {
            return res.status(400).json({ mesaj: 'Kullanıcı ID\'si veya oda adı eksik.' });
        }

        const success = stateManager.removeUserFromRoom(oda, kullaniciID); // Kullanıcıyı odadan kaldır

        if (success) {
            res.json({ mesaj: `${oda} odasından ayrıldınız.` });
            io.emit('odaGuncelle'); // Yönetici panelini güncellemek için sinyal gönder
            // Oda boş kalırsa, mesajlarını ve anahtarını temizle
            if (!stateManager.getRoomUsers(oda) || stateManager.getRoomUsers(oda).length === 0) {
                stateManager.deleteRoom(oda);
                stateManager.deleteRoomMessages(oda);
                stateManager.deleteRoomKey(oda);
            }
        } else {
            res.status(404).json({ mesaj: `Kullanıcı zaten odada değil veya oda bulunamadı.` });
        }
    });

    // Belirli bir oda için mesajları alma uç noktası
    app.get('/mesajlar/:oda', (req, res) => {
        const oda = req.params.oda; // URL parametrelerinden oda adını al
        res.json(stateManager.getRoomMessages(oda)); // Odanın mesajlarını JSON olarak gönder
    });

    // Yönetici paneli HTML dosyasını sun
    app.get('/adminpanel', (req, res) => {
        res.sendFile(__dirname + '/../public/admin.html');
    });

    // Yönetici: Aktif odaları listeleme uç noktası
    app.get('/admin/odalar', (req, res) => {
        const { ad, sifre } = req.query; // Sorgu parametrelerinden yönetici adı ve şifreyi al

        // Yönetici kimlik doğrulaması yap
        if (!adminCredentials[ad] || adminCredentials[ad] !== sifre) {
            return res.status(403).send('Yetkisiz erişim'); // Yetkisizse 403 hatası gönder
        }

        const roomsData = stateManager.getAllRoomsDetailed(); // Tüm odaların detaylı bilgilerini al
        res.json(roomsData); // Oda bilgilerini JSON olarak gönder
    });

    // Yönetici: Kullanıcıyı odadan atma uç noktası
    app.post('/admin/kullanici-at', (req, res) => {
        const { oda, kullaniciID, ad, sifre } = req.body; // İstek gövdesinden bilgileri al

        // Yönetici kimlik doğrulaması yap
        if (!adminCredentials[ad] || adminCredentials[ad] !== sifre) {
            return res.status(403).send('Yetkisiz erişim');
        }

        if (!stateManager.getRoomUsers(oda)) {
            return res.status(400).json({ mesaj: 'Oda bulunamadı.' });
        }

        const success = stateManager.removeUserFromRoom(oda, kullaniciID); // Kullanıcıyı odadan kaldır

        if (!success) {
            return res.status(404).json({ mesaj: 'Kullanıcı zaten odada değil.' });
        }

        io.emit('odaGuncelle'); // Tüm bağlı istemcilere (özellikle yönetici panellerine) güncelleme sinyali gönder

        const socketID = stateManager.getUserSocketId(kullaniciID); // Kullanıcının socket ID'sini al
        if (socketID) {
            io.to(socketID).emit('atildin'); // Atılan kullanıcıya 'atildin' mesajı gönder
            // Varsa, ilgili socket bağlantısını zorla kes
            const clientSocket = io.sockets.sockets.get(socketID);
            if (clientSocket) {
                clientSocket.disconnect(true); // Altta yatan bağlantıyı da kapat
            }
        }
        
        // Kullanıcı atıldıktan sonra kullanıcıya ait eşleşmeleri temizle
        stateManager.deleteUserSocketMap(kullaniciID);
        stateManager.deleteUserName(kullaniciID);
        // Oda kullanıcı atıldıktan sonra boş kalırsa, mesajlarını ve anahtarını temizle
        if (!stateManager.getRoomUsers(oda) || stateManager.getRoomUsers(oda).length === 0) {
            stateManager.deleteRoom(oda);
            stateManager.deleteRoomMessages(oda);
            stateManager.deleteRoomKey(oda);
            console.log(`Kullanıcı atıldıktan sonra oda ${oda} boşaldı ve temizlendi.`);
        }

        res.json({ mesaj: `${stateManager.getUserName(kullaniciID) || kullaniciID} başarıyla atıldı.` });
    });
};