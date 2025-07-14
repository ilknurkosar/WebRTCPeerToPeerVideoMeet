const stateManager = require('./stateManager'); // Uygulama durumunu yöneten modülü dahil et

module.exports = (io) => {
    // Yeni bir istemci bağlandığında
    io.on('connection', socket => {
        console.log(`🔌 Yeni kullanıcı bağlandı: ${socket.id}`);

        // Socket hatalarını yakala
        socket.on('error', err => {
            console.error(`❌ Socket hata (ID: ${socket.id}):`, err);
        });

        // Kullanıcının bir odaya katılması olayını işle
        socket.on('join-room', ({ oda, kullaniciID }) => {
            socket.join(oda); // Socket'i belirtilen odaya dahil et
            stateManager.setSocketUserMap(socket.id, kullaniciID, oda); // Socket ID ve kullanıcı ID eşleştirmesini kaydet
            stateManager.setUserSocketMap(kullaniciID, socket.id); // Kullanıcı ID ve Socket ID eşleştirmesini kaydet
            console.log(`${kullaniciID}, ${oda} odasına katıldı`);
            // Odadaki diğer kullanıcılara yeni katılımı bildir
            socket.to(oda).emit('bilgilendirme', `${stateManager.getUserName(kullaniciID)} odaya katıldı.`);
            io.emit('odaGuncelle'); // Yönetici panelini güncellemek için tüm bağlantılara sinyal gönder
        });

        // WebRTC sinyal verilerini işle
        socket.on('signal', ({ oda, veri }) => {
            // Sinyali aynı odadaki diğer kullanıcıya ilet
            socket.to(oda).emit('signal', veri);
        });

        // Sohbet mesajlarını işle
        socket.on('mesajGonder', ({ oda, kullaniciID, sifreliMesaj }) => {
            if (!oda || !kullaniciID || !sifreliMesaj) {
                console.warn('Mesaj göndermek için eksik veri.');
                return;
            }

            stateManager.addMessageToRoom(oda, sifreliMesaj); // Mesajı odaya ekle
            io.to(oda).emit('yeniMesaj', sifreliMesaj); // Mesajı odadaki HERKESE (gönderen dahil) gönder
        });

        // Bağlantı kesildiğinde
        socket.on('disconnect', () => {
            console.log(`Kullanıcı bağlantısı kesildi: ${socket.id}`);
            const { kullaniciID, oda } = stateManager.getSocketUserInfo(socket.id); // Bağlantısı kesilen kullanıcının bilgilerini al

            if (!kullaniciID || !oda) {
                console.warn(`Bağlantısı kesilen socket ID ${socket.id} için kullanıcı bilgisi bulunamadı.`);
                return;
            }

            // Kullanıcıyı odadan kaldır ve durumu güncelle
            stateManager.removeUserFromRoom(oda, kullaniciID);
            stateManager.deleteSocketUserMap(socket.id); // Socket-kullanıcı eşleşmesini sil
            stateManager.deleteUserSocketMap(kullaniciID); // Kullanıcı-socket eşleşmesini sil

            // Odada başka kullanıcı varsa, bağlantının kapatıldığını bildir
            if (stateManager.getRoomUsers(oda) && stateManager.getRoomUsers(oda).length > 0) {
                socket.to(oda).emit('karsiTarafBaglantiyiKapatti');
            } else if (!stateManager.getRoomUsers(oda)) {
                // Oda şimdi boşsa, ilişkili verileri (mesajlar, anahtar) sil
                stateManager.deleteRoom(oda);
                stateManager.deleteRoomKey(oda);
                stateManager.deleteRoomMessages(oda);
                console.log(`Oda ${oda} boşaldı ve temizlendi.`);
            }

            io.emit('odaGuncelle'); // Yönetici panelini güncelle
        });

        // İstemciden gelen açık bağlantı kapatma sinyalini (WebRTC) işle
        socket.on('baglantiKapatildi', ({ oda }) => {
            // Aynı odadaki diğer istemciye bağlantının kapatıldığını bildir
            socket.to(oda).emit('karsiTarafBaglantiyiKapatti');
        });
    });
};