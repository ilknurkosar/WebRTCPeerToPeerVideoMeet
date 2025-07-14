const CryptoJS = require('crypto-js'); // Kriptografi işlemleri için

let odalar = {}; // { 'oda-1': ['kullanici-1', 'kullanici-2'], ... } Oda adlarını ve içindeki kullanıcı ID'lerini tutar
let kullaniciSayac = 0; // Yeni kullanıcılara benzersiz ID atamak için sayaç
let mesajlar = {}; // { 'oda-1': ['sifreliMesaj1', 'sifreliMesaj2'], ... } Oda adlarına göre şifreli mesajları tutar
let odaAnahtarlari = {}; // { 'oda-1': 'AESAnahtarDizisi', ... } Oda adlarına göre AES şifreleme anahtarlarını tutar
let socketToUserMap = {}; // { 'socket.id': { kullaniciID, oda }, ... } Socket ID'den kullanıcı ve oda bilgilerine erişimi sağlar
let kullaniciAdlari = {}; // { 'kullanici-1': 'Ali', ... } Kullanıcı ID'lerine göre kullanıcı adlarını tutar
let userToSocketMap = {}; // { 'kullanici-1': 'socket.id', ... } Kullanıcı ID'den Socket ID'ye erişimi sağlar

const stateManager = {
    // Bir kullanıcıyı mevcut bir odaya atar veya yeni bir oda oluşturur.
    assignUserToRoom: (providedName) => {
        const kullaniciID = `user-${++kullaniciSayac}`; // Benzersiz kullanıcı ID'si oluştur
        const isim = providedName || `Misafir-${kullaniciSayac}`; // Kullanıcı adı boşsa varsayılan atama
        kullaniciAdlari[kullaniciID] = isim; // Kullanıcı adını kaydet

        // 2 kişiden az kullanıcısı olan bir oda bulmaya çalış
        for (let oda in odalar) {
            if (odalar[oda].length < 2) {
                odalar[oda].push(kullaniciID); // Kullanıcıyı odaya ekle
                return {
                    mesaj: `Mevcut ${oda} odasına katıldın.`,
                    kullaniciID,
                    oda,
                    anahtar: odaAnahtarlari[oda], // Odanın şifreleme anahtarını ver
                    isim,
                    existing: true // Mevcut odaya katıldığı bilgisini ver
                };
            }
        }

        // Uygun oda bulunamazsa, yeni bir oda oluştur
        let yeniOda;
        // Benzersiz oda adı oluşturmak için basit bir mantık
        for (let n = 1; ; n++) {
            if (!(`room-${n}` in odalar)) {
                yeniOda = `room-${n}`;
                break;
            }
        }

        odalar[yeniOda] = [kullaniciID]; // Yeni odaya kullanıcıyı ekle
        const anahtar = CryptoJS.lib.WordArray.random(16).toString(); // Rastgele bir AES anahtarı oluştur
        odaAnahtarlari[yeniOda] = anahtar; // Anahtarı odaya ata
        mesajlar[yeniOda] = []; // Yeni oda için mesaj dizisini başlat

        return {
            mesaj: `Yeni ${yeniOda} odası oluşturuldu.`,
            kullaniciID,
            oda: yeniOda,
            anahtar: anahtar,
            isim,
            existing: false // Yeni oda oluşturulduğu bilgisini ver
        };
    },

    // Bir kullanıcıyı bir odadan kaldırır.
    removeUserFromRoom: (oda, kullaniciID) => {
        if (!odalar[oda]) {
            return false; // Oda bulunamadı
        }

        const index = odalar[oda].indexOf(kullaniciID);
        if (index === -1) {
            return false; // Kullanıcı bu odada değil
        }

        odalar[oda].splice(index, 1); // Kullanıcıyı diziden kaldır

        // Oda boş kalırsa, odayı ve ilişkili verilerini sil
        if (odalar[oda].length === 0) {
            delete odalar[oda];
            delete mesajlar[oda];
            delete odaAnahtarlari[oda];
            console.log(`Oda ${oda} boşaldı ve kaldırıldı.`);
        }
        delete kullaniciAdlari[kullaniciID]; // Kullanıcı adını temizle
        return true;
    },

    // Durum (state) için getter metodları
    getRoomUsers: (oda) => odalar[oda], // Bir odadaki kullanıcıları döndürür
    getRoomMessages: (oda) => mesajlar[oda] || [], // Bir odanın mesajlarını döndürür (varsa, yoksa boş dizi)
    getRoomKey: (oda) => odaAnahtarlari[oda], // Bir odanın şifreleme anahtarını döndürür
    getUserName: (kullaniciID) => kullaniciAdlari[kullaniciID], // Kullanıcı ID'sine göre kullanıcı adını döndürür
    getUserSocketId: (kullaniciID) => userToSocketMap[kullaniciID], // Kullanıcı ID'sine göre Socket ID'sini döndürür
    getSocketUserInfo: (socketId) => socketToUserMap[socketId], // Socket ID'sine göre kullanıcı bilgilerini döndürür

    // Durum (state) için setter metodları
    addMessageToRoom: (oda, sifreliMesaj) => {
        if (!mesajlar[oda]) {
            mesajlar[oda] = []; // Oda için mesaj dizisi yoksa oluştur
        }
        mesajlar[oda].push(sifreliMesaj); // Şifreli mesajı odaya ekle
    },
    setSocketUserMap: (socketId, kullaniciID, oda) => {
        socketToUserMap[socketId] = { kullaniciID, oda }; // Socket ID'si ile kullanıcı ve oda bilgisini eşleştir
    },
    setUserSocketMap: (kullaniciID, socketId) => {
        userToSocketMap[kullaniciID] = socketId; // Kullanıcı ID'si ile Socket ID'sini eşleştir
    },

    // Durum (state) temizleme metodları
    deleteRoom: (oda) => {
        delete odalar[oda]; // Odayı sil
    },
    deleteRoomMessages: (oda) => {
        delete mesajlar[oda]; // Odanın mesajlarını sil
    },
    deleteRoomKey: (oda) => {
        delete odaAnahtarlari[oda]; // Odanın şifreleme anahtarını sil
    },
    deleteSocketUserMap: (socketId) => {
        delete socketToUserMap[socketId]; // Socket-kullanıcı eşleşmesini sil
    },
    deleteUserSocketMap: (kullaniciID) => {
        delete userToSocketMap[kullaniciID]; // Kullanıcı-socket eşleşmesini sil
    },
    deleteUserName: (kullaniciID) => {
        delete kullaniciAdlari[kullaniciID]; // Kullanıcı adını sil
    },

    // Yöneticiye özel metodlar
    getAllRoomsDetailed: () => {
        // Tüm odaların ve içlerindeki kullanıcıların detaylı listesini döndürür
        return Object.entries(odalar).map(([odaAdi, kullaniciIDListesi]) => ({
            oda: odaAdi,
            kullanicilar: kullaniciIDListesi.map(id => ({
                id,
                isim: kullaniciAdlari[id] || id // Kullanıcı adını veya ID'sini kullan
            }))
        }));
    }
};

module.exports = stateManager;