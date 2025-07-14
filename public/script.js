const socket = io(); // Socket.IO istemcisini başlatır.

let yerelBaglanti; // WebRTC PeerConnection nesnesi
let stream; // Tarayıcının medya akışı (kamera/mikrofon)
let baglantiKapanmaKaynakliMi = false; // Bağlantının kendi isteğimizle mi kapandığını belirtir
let kullaniciID = null; // Kullanıcının benzersiz ID'si
let oda = null; // Kullanıcının içinde bulunduğu oda adı
let isim = null; // Kullanıcının adı
let anahtar = null; // Oda için AES şifreleme anahtarı

// HTML elemanlarına erişim
const isimInput = document.getElementById('isimInput');
const sonucParagraph = document.getElementById('sonuc');
const sonuc2Paragraph = document.getElementById('sonuc2');
const katilBtn = document.getElementById('katilBtn');
const mesajInput = document.getElementById('mesajInput');
const mesajlarAlani = document.getElementById('mesajlar');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Odaya katılma fonksiyonu
async function katil() {
    // Socket bağlantısı kesilmişse yeniden bağlanmayı dene
    if (socket.disconnected) {
        socket.connect();
        console.log("🔁 Socket yeniden bağlandı.");
    }

    const inputIsim = isimInput.value.trim(); // İsim giriş alanından değeri al ve boşlukları temizle
    if (!inputIsim) {
        alert("Lütfen bir isim girin.");
        return;
    }

    try {
        const res = await fetch('/katil', { // '/katil' API'sine POST isteği gönder
            method: 'POST',
            body: JSON.stringify({ isim: inputIsim }), // İsimi JSON formatında gönder
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json(); // Yanıtı JSON olarak ayrıştır

        if (res.ok) { // İstek başarılıysa (HTTP 200)
            kullaniciID = data.kullaniciID;
            oda = data.oda;
            anahtar = data.anahtar;
            isim = data.isim;

            sonucParagraph.innerText = `Merhaba ${isim}\n ${data.mesaj}`; // Sonuç mesajını göster
            sonuc2Paragraph.innerText = '';
            katilBtn.disabled = true; // Katıl butonunu devre dışı bırak

            socket.emit('join-room', { oda, kullaniciID }); // Socket.IO üzerinden odaya katılma sinyali gönder
            eskiMesajlariYukle(); // Eski mesajları yükle
        } else {
            sonucParagraph.innerText = `Odaya katılırken hata oluştu: ${data.mesaj || res.statusText}`;
        }
    } catch (error) {
        console.error('Odaya katılma hatası:', error);
        sonucParagraph.innerText = 'Odaya katılırken bir ağ hatası oluştu.';
    }
}

// Odadan ayrılma fonksiyonu
async function ayril() {
    if (!kullaniciID || !oda) {
        alert("Zaten bir odada değilsiniz.");
        return;
    }

    try {
        const res = await fetch('/ayril', { // '/ayril' API'sine POST isteği gönder
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kullaniciID, oda }) // Kullanıcı ID ve oda adını gönder
        });
        const data = await res.json();

        if (res.ok) {
            console.log("Ayrılma sonucu:", data);
            sonuc2Paragraph.innerText = `${data.mesaj}`;
            sonucParagraph.innerText = '';

            baglantiyiKapat(); // WebRTC bağlantısını temizle

            katilBtn.disabled = false; // Katıl butonunu etkinleştir
            
            // Tüm alanları ve durumu sıfırla
            isimInput.value = '';
            mesajlarAlani.innerText = '';
            kullaniciID = null;
            oda = null;
            anahtar = null;
            isim = null;

            // Socket bağlantısını kes
            if (socket.connected) {
                socket.disconnect();
            }
        } else {
            sonuc2Paragraph.innerText = `Odadan ayrılırken hata: ${data.mesaj || res.statusText}`;
        }
    } catch (error) {
        console.error('Odadan ayrılma hatası:', error);
        sonuc2Paragraph.innerText = 'Odadan ayrılırken bir ağ hatası oluştu.';
    }
}

// Sohbet mesajı gönderme fonksiyonu
function mesajGonder() {
    const mesaj = mesajInput.value.trim(); // Mesaj giriş alanından değeri al
    if (!mesaj || !kullaniciID || !oda || !anahtar) {
        alert("Mesaj göndermek için odaya katılın ve bir mesaj yazın.");
        return;
    }

    try {
        const tamMesaj = `${isim}: ${mesaj}`; // Mesajı gönderen isimle birleştir
        const sifreli = CryptoJS.AES.encrypt(tamMesaj, anahtar).toString(); // Mesajı AES ile şifrele

        socket.emit('mesajGonder', { // Şifreli mesajı Socket.IO üzerinden sunucuya gönder
            oda,
            kullaniciID,
            sifreliMesaj: sifreli
        });
        mesajInput.value = ''; // Mesaj giriş alanını temizle
    } catch (error) {
        console.error("Mesaj şifreleme veya gönderme hatası:", error);
        alert("Mesaj gönderilirken bir hata oluştu.");
    }
}

// Socket.IO: Yeni gelen mesajları işle
socket.on('yeniMesaj', (sifreliMesaj) => {
    if (!anahtar) {
        console.error("Mesaj anahtarı bulunamadı, mesaj çözülemiyor.");
        return;
    }
    try {
        // Gelen şifreli mesajı AES ile çöz
        const cozulmusMesaj = CryptoJS.AES.decrypt(sifreliMesaj, anahtar).toString(CryptoJS.enc.Utf8);
        if (cozulmusMesaj) {
            mesajlarAlani.innerText += cozulmusMesaj + '\n'; // Çözülmüş mesajı sohbet alanına ekle
            mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight; // Otomatik olarak en alta kaydır
        }
    } catch (e) {
        console.error("Mesaj çözülemedi:", e);
        mesajlarAlani.innerText += "[Şifreli mesaj alınamadı]\n";
    }
});

// Socket.IO: Yönetici tarafından odadan atılma olayını işle
socket.on('atildin', () => {
    alert("Yönetici tarafından odadan atıldınız.");
    baglantiKapanmaKaynakliMi = false; // Gereksiz sunucu bildirimini önlemek için bayrağı sıfırla
    baglantiyiKapat(); // WebRTC bağlantısını kapat

    // Arayüzü sıfırla
    sonucParagraph.innerText = '';
    sonuc2Paragraph.innerText = 'Odadaki bağlantınız kesildi.';
    katilBtn.disabled = false;
    isimInput.value = '';
    mesajlarAlani.innerText = '';

    // Kullanıcı bilgilerini sıfırla
    kullaniciID = null;
    oda = null;
    anahtar = null;
    isim = null;

    // Socket bağlantısını kes
    if (socket.connected) {
        socket.disconnect();
    }
});

// Eski mesajları sunucudan yükleme fonksiyonu
async function eskiMesajlariYukle() {
    if (!oda) return; // Oda bilgisi yoksa işlem yapma
    try {
        const res = await fetch(`/mesajlar/${oda}`); // Odaya ait mesajları çek
        const veri = await res.json(); // Yanıtı JSON olarak al

        // Gelen şifreli mesajları çöz ve filtreden geçir
        const cozulmus = veri.map(sifreliMesaj => {
            try {
                return CryptoJS.AES.decrypt(sifreliMesaj, anahtar).toString(CryptoJS.enc.Utf8);
            } catch {
                return "[Şifreli mesaj alınamadı]"; // Çözülemezse hata mesajı göster
            }
        }).filter(Boolean); // Boş veya çözülemeyenleri filtrele

        mesajlarAlani.innerText = cozulmus.join('\n') + (cozulmus.length > 0 ? '\n' : ''); // Mesajları sohbet alanına yaz
        mesajlarAlani.scrollTop = mesajlarAlani.scrollHeight; // Sohbeti en alta kaydır
    } catch (error) {
        console.error('Eski mesajlar yüklenirken hata:', error);
        mesajlarAlani.innerText = 'Eski mesajlar yüklenirken bir hata oluştu.';
    }
}

// WebRTC: Görüntülü/sesli bağlantıyı başlatma
async function start() {
    if (!kullaniciID || !oda || !anahtar) {
        alert("Lütfen önce odaya katılın.");
        return;
    }

    if (yerelBaglanti) {
        console.warn("Bağlantı zaten başlatıldı.");
        return;
    }

    try {
        // Kullanıcının kamera ve mikrofonuna erişim iste
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = stream; // Yerel video elemanına akışı ata

        // RTCPeerConnection nesnesi oluştur
        yerelBaglanti = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // STUN sunucusu ayarı
        });

        // Medya akışını (ses ve video) yerel bağlantıya ekle
        stream.getTracks().forEach(track => yerelBaglanti.addTrack(track, stream));

        // Uzak tarafın medya akışı geldiğinde
        yerelBaglanti.ontrack = event => {
            remoteVideo.srcObject = event.streams[0]; // Uzak video elemanına akışı ata
        };

        // ICE adayı (candidate) oluştuğunda
        yerelBaglanti.onicecandidate = event => {
            if (event.candidate) {
                // ICE adayını sunucuya Socket.IO ile gönder
                socket.emit('signal', {
                    oda,
                    veri: { type: 'candidate', data: event.candidate }
                });
            }
        };

        const offer = await yerelBaglanti.createOffer(); // Bir SDP offer'ı oluştur
        await yerelBaglanti.setLocalDescription(offer); // Yerel tanımı ayarla

        // Oluşturulan offer'ı sunucuya sinyal olarak gönder
        socket.emit('signal', {
            oda,
            veri: { type: 'offer', data: offer }
        });
    } catch (error) {
        console.error('WebRTC bağlantısı başlatılırken hata:', error);
        alert('Görüntülü bağlantı başlatılamadı. Kamera/mikrofon izni gerekli veya başka bir hata oluştu.');
    }
}

// WebRTC: Bağlantıyı kapatma
function baglantiyiKapat() {
    // WebRTC bağlantısını kapat
    if (yerelBaglanti) {
        yerelBaglanti.getSenders().forEach(sender => {
            if (sender.track) sender.track.stop(); // Gönderilen medya akışlarını durdur
        });
        yerelBaglanti.close(); // Bağlantıyı kapat
        yerelBaglanti = null; // Nesneyi sıfırla
    }
    // Medya akışını durdur
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    // Video elemanlarının kaynaklarını temizle
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    console.log('Bağlantı kapatıldı.');

    // Kendi isteğimizle kapatmadıysak sunucuya bildir
    if (!baglantiKapanmaKaynakliMi && oda) {
        socket.emit('baglantiKapatildi', { oda });
    }
    baglantiKapanmaKaynakliMi = false; // Bayrağı sıfırla
}

// Socket.IO: Gelen WebRTC sinyallerini işle
socket.on('signal', async ({ type, data }) => {
    // Yerel bağlantı henüz kurulmamışsa (örneğin uzaktan offer gelmişse) başlatmayı dene
    if (!yerelBaglanti) {
        console.log("Yerel bağlantıdan önce sinyal alındı, başlatılıyor...");
        await start(); // Yerel bağlantıyı başlatmayı dene
        if (!yerelBaglanti) {
            console.error("Sinyal alındıktan sonra yerel bağlantı kurulamadı.");
            return;
        }
    }

    try {
        if (type === 'offer') {
            await yerelBaglanti.setRemoteDescription(new RTCSessionDescription(data)); // Uzak tanımı offer olarak ayarla
            const answer = await yerelBaglanti.createAnswer(); // Bir SDP answer'ı oluştur
            await yerelBaglanti.setLocalDescription(answer); // Yerel tanımı answer olarak ayarla

            // Oluşturulan answer'ı sunucuya sinyal olarak gönder
            socket.emit('signal', {
                oda,
                veri: { type: 'answer', data: answer }
            });
        } else if (type === 'answer') {
            await yerelBaglanti.setRemoteDescription(new RTCSessionDescription(data)); // Uzak tanımı answer olarak ayarla
        } else if (type === 'candidate') {
            await yerelBaglanti.addIceCandidate(new RTCIceCandidate(data)); // Gelen ICE adayını ekle
        }
    } catch (err) {
        console.error(`WebRTC sinyal tipi ${type} işlenirken hata:`, err);
    }
});

// Socket.IO: Karşı tarafın bağlantıyı kapattığını işle
socket.on('karsiTarafBaglantiyiKapatti', () => {
    alert("Karşı taraf bağlantıyı kapattı.");
    baglantiKapanmaKaynakliMi = true; // Tekrar disconnect sinyali göndermeyi engellemek için bayrağı ayarla
    baglantiyiKapat(); // WebRTC bağlantısını kapat
});