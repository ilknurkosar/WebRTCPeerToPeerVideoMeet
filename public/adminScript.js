const socket = io(); // Socket.IO istemcisini başlatır.
let adminKullaniciAdi = ""; // Yönetici kullanıcı adı
let adminSifre = ""; // Yönetici şifresi

// HTML elemanlarına erişim
const adminAdInput = document.getElementById('adminAd');
const sifreInput = document.getElementById('sifre');
const hataParagraph = document.getElementById('hata');
const loginDiv = document.getElementById('login');
const panelDiv = document.getElementById('panel');
const odalarListesiDiv = document.getElementById('odalarListesi');

// Yönetici giriş fonksiyonu
async function girisYap(force = false) {
    if (!force) { // Eğer 'force' parametresi true değilse, formdan değerleri al
        adminKullaniciAdi = adminAdInput.value.trim();
        adminSifre = sifreInput.value.trim();
    }

    if (!adminKullaniciAdi || !adminSifre) {
        hataParagraph.innerText = 'Kullanıcı adı ve şifre boş bırakılamaz!';
        return;
    }

    try {
        // Yönetici odaları API'sine istek gönder
        const res = await fetch(`/admin/odalar?ad=${encodeURIComponent(adminKullaniciAdi)}&sifre=${encodeURIComponent(adminSifre)}`);
        
        if (res.status === 200) { // Başarılı giriş
            loginDiv.style.display = 'none'; // Giriş panelini gizle
            panelDiv.style.display = 'block'; // Yönetici panelini göster
            
            // Giriş bilgilerini çerezlere kaydet
            setCookie('adminAd', adminKullaniciAdi);
            setCookie('adminSifre', adminSifre);

            const data = await res.json(); // Yanıtı JSON olarak ayrıştır
            odalariGoster(data); // Odaları hemen göster
        } else { // Hatalı giriş
            hataParagraph.innerText = 'Kullanıcı adı veya şifre hatalı!';
            loginDiv.style.display = 'block';
            panelDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        hataParagraph.innerText = 'Giriş yapılırken bir ağ hatası oluştu.';
        loginDiv.style.display = 'block';
        panelDiv.style.display = 'none';
    }
}

// Odaları listeleme fonksiyonu
function odalariGoster(data) {
    odalarListesiDiv.innerHTML = ''; // Önceki listeyi temizle

    if (data.length === 0) {
        odalarListesiDiv.innerHTML = '<p>Aktif oda bulunmamaktadır.</p>';
        return;
    }

    // Her bir oda için HTML elemanları oluştur
    data.forEach(oda => {
        const div = document.createElement('div');
        div.className = 'oda';

        // Odanın içindeki her kullanıcı için HTML oluştur
        const kullaniciListesi = oda.kullanicilar.map(k => `
            <div class="kullanici-kutu">
                ${k.isim}
                <button onclick="kullaniciAt('${oda.oda}', '${k.id}', '${k.isim}')">At</button>
            </div>
        `).join('');

        div.innerHTML = `
            <strong>${oda.oda}</strong>
            <div class="kullanici-listesi">${kullaniciListesi}</div>
        `;
        odalarListesiDiv.appendChild(div); // Oluşturulan odayı listeye ekle
    });
}

// Kullanıcıyı odadan atma fonksiyonu
async function kullaniciAt(oda, kullaniciID, isim) {
    const ad = getCookie('adminAd'); // Çerezlerden yönetici adını al
    const sifre = getCookie('adminSifre'); // Çerezlerden yönetici şifresini al

    if (!ad || !sifre) {
        alert('Yönetici bilgileri eksik. Lütfen tekrar giriş yapın.');
        loginDiv.style.display = 'block';
        panelDiv.style.display = 'none';
        return;
    }

    try {
        // Kullanıcıyı atma API'sine POST isteği gönder
        const res = await fetch('/admin/kullanici-at', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oda, kullaniciID, ad, sifre })
        });
        
        const data = await res.json();

        if (res.ok) { // İşlem başarılıysa
            alert(`${isim} (${kullaniciID}) atıldı.`);
            // Odalar listesi Socket.IO olayı ile otomatik güncellenecek
        } else { // Hata durumunda
            alert("Hata: " + (data.mesaj || res.statusText));
        }
    } catch (error) {
        console.error('Kullanıcı atma hatası:', error);
        alert('Kullanıcı atılırken bir ağ hatası oluştu.');
    }
}

// Socket.IO: Oda listesi güncelleme olayını dinle
socket.on('odaGuncelle', async () => {
    console.log("⚡️ Oda listesi güncelleniyor...");
    const ad = getCookie('adminAd');
    const sifre = getCookie('adminSifre');

    if (ad && sifre) { // Yönetici çerezler aracılığıyla oturum açmışsa güncelleme isteği gönder
        try {
            const res = await fetch(`/admin/odalar?ad=${encodeURIComponent(ad)}&sifre=${encodeURIComponent(sifre)}`);
            if (res.ok) {
                const data = await res.json();
                odalariGoster(data); // Yeni listeyi göster
            } else {
                console.warn("Güncelleme sırasında yetki hatası veya oturum sona erdi.");
                hataParagraph.innerText = 'Yönetici oturumu sona erdi. Lütfen tekrar giriş yapın.';
                loginDiv.style.display = 'block';
                panelDiv.style.display = 'none';
            }
        } catch (error) {
            console.error('Güncel oda listesi çekilirken hata:', error);
            hataParagraph.innerText = 'Oda listesi güncellenirken bir ağ hatası oluştu.';
        }
    }
});

// Çerez ayarlama yardımcı fonksiyonu
function setCookie(name, value, days = 1) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString(); // 864e5 = 1 gün milisaniye
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; Secure; SameSite=Lax`; // Secure ve SameSite ekledik
}

// Çerez okuma yardımcı fonksiyonu
function getCookie(name) {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith(name + '='))
        ?.split('=')[1];
}

// Sayfa yüklendiğinde, çerezlerden yönetici bilgilerini alıp otomatik giriş yapmayı dene
window.addEventListener('DOMContentLoaded', () => {
    const cookieAd = getCookie('adminAd');
    const cookieSifre = getCookie('adminSifre');

    if (cookieAd && cookieSifre) {
        adminKullaniciAdi = decodeURIComponent(cookieAd);
        adminSifre = decodeURIComponent(cookieSifre);
        girisYap(true); // Çerez verileriyle girişi zorla
    } else {
        // Çerez yoksa, giriş panelinin görünür olduğundan emin ol
        loginDiv.style.display = 'block';
        panelDiv.style.display = 'none';
    }
});