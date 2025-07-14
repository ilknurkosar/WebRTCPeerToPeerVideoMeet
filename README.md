# WebRTC Tabanlı Görüntülü Sohbet Uygulaması

Bu proje Netelsan Stajım için yaptığım; WebRTC, WebSocket ve Express kullanılarak oluşturulmuş görüntülü sohbet uygulamasıdır. AES ile uçtan uca şifrelenmiş mesajlaşma, gerçek zamanlı video/ses iletişimi ve aktif odaları ve kullanıcıları yönetmek için bir yönetici paneli içerir.

## Özellikler

* **Gerçek Zamanlı İletişim:** WebRTC ve Socket.IO kullanarak anlık mesajlaşma ve görüntülü/sesli aramalar.
* **Şifreli Sohbet:** Tüm sohbet mesajları, oda başına oluşturulan benzersiz bir anahtar kullanılarak AES ile şifrelenir.
* **Dinamik Oda Yönetimi:** Kullanıcılar otomatik olarak mevcut odalara (doğrudan iletişim için maksimum 2 kullanıcı) yerleştirilir. Gerektikçe yeni odalar oluşturulur.
* **Yönetici Paneli:**
    * Aktif odaları ve içindeki kullanıcıları görüntüleme.
    * Kullanıcıları belirli odalardan atma.
    * Kullanıcı adı ve şifre ile yönetici kimlik doğrulaması.
    * Çerezler aracılığıyla yönetici oturum kalıcılığı.
* **HTTPS:** Güvenli iletişim için uygulama HTTPS üzerinden çalışır.

## Kullanılan Teknolojiler

* **Arka Uç:** Node.js, Express.js, Socket.IO
* **Ön Uç:** HTML5, CSS3, JavaScript
* **Gerçek Zamanlı:** WebRTC, Socket.IO
* **Şifreleme:** CryptoJS (AES)
* **Güvenlik:** HTTPS (SSL/TLS)

## Proje Yapısı
*chat-app/
*├── server/                 # Arka uç (Node.js) kodları
*│   ├── app.js              # Ana sunucu başlangıç dosyası
*│   ├── socketHandler.js    # Tüm Socket.IO olaylarını yönetir
*│   ├── routes.js           # API rotalarını tanımlar
*│   └── stateManager.js     # Uygulama durumunu (odalar, kullanıcılar, mesajlar, anahtarlar) yönetir
*├── public/                 # Statik olarak sunulan ön uç (HTML, CSS, JS) dosyaları
*│   ├── index.html          # Ana sohbet uygulaması sayfası
*│   ├── admin.html          # Yönetici paneli sayfası
*│   ├── script.js           # Ana sohbet uygulaması için JavaScript
*│   ├── adminScript.js      # Yönetici paneli için JavaScript
*│   └── style.css           # Ortak CSS stilleri
*├── config/                 # Yapılandırma dosyaları
*│   ├── credentials.js      # Yönetici kimlik bilgileri ve SSL anahtar/sertifika yolları
*│   ├── key.pem             # SSL özel anahtarı (kendi anahtarınızla değiştirin)
*│   └── cert.pem            # SSL sertifikası (kendi sertifikanızla değiştirin)
*├── .gitignore              # Git tarafından izlenmemesi gereken dosyaları belirtir
*├── package.json            # Proje meta verileri ve bağımlılıkları
*└── README.md               # Proje dökümantasyonu

## Kurulum ve Başlatma

### 1. Ön Gereksinimler

* Node.js (LTS sürümü önerilir)
* npm (Node.js ile birlikte gelir)

### 2. SSL Sertifikaları Oluşturma (HTTPS ve WebRTC için Zorunlu)

WebRTC ve modern tarayıcı özellikleri güvenli bir bağlam (HTTPS) gerektirir. Kendi SSL sertifikanızı ve anahtarınızı oluşturmanız gerekecektir.

**Geliştirme amacıyla, `mkcert` veya OpenSSL kullanabilirsiniz:**

#### Seçenek A: `mkcert` Kullanımı (Yerel Geliştirme için Önerilir)

1.  **`mkcert` Kurulumu:**
    * macOS'ta: `brew install mkcert`
    * Linux'ta: `sudo apt install mkcert` veya `sudo snap install mkcert --classic`
    * Windows'ta: `choco install mkcert`

2.  **Yerel CA Kurulumu:**
    ```bash
    mkcert -install
    ```

3.  **`localhost` ve `0.0.0.0` için sertifika oluşturma:**
    Projenizdeki `config` dizinine gidin:
    ```bash
    cd chat-app/config
    mkcert localhost 0.0.0.0
    ```
    Bu komut `localhost+1.pem` ve `localhost+1-key.pem` dosyalarını oluşturacaktır.
    **Bu dosyaların adlarını** sırasıyla `cert.pem` ve `key.pem` olarak **değiştirin**:
    ```bash
    mv localhost+1.pem cert.pem
    mv localhost+1-key.pem key.pem
    ```

#### Seçenek B: OpenSSL Kullanımı (Daha karmaşık, ancak evrensel olarak çalışır)

1.  `config` dizinine gidin:
    ```bash
    cd chat-app/config
    ```
2.  Kendinden imzalı bir sertifika ve anahtar oluşturun:
    ```bash
    openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365
    ```
    İstendiğinde Ülke Adı, Eyalet vb. bilgileri girin. `Ortak Ad (örn. sunucu FQDN veya SİZİN adınız)` için `localhost` veya `0.0.0.0` kullanın.

**Önemli:** Üretim dağıtımları için, bir Sertifika Yetkilisinden (CA) uygun şekilde imzalanmış bir SSL sertifikası almalısınız.

### 3. Depoyu Klonlayın

```bash
git clone [https://github.com/senin-kullanici-adin/chat-app.git](https://github.com/senin-kullanici-adin/chat-app.git)
cd chat-app

### 4. Bağımlılıkları Kurun

```bash
npm install

###  5. Uygulamayı Çalıştırın

    **Geliştirme Modu (Otomatik Yeniden Başlatma için Nodemon ile):**
    ```bash
    npm run dev
    ```

    **Üretim Modu:**
    ```bash
    npm start
    ```
    Sunucu genellikle `https://0.0.0.0:3000` adresinde başlayacaktır.

## Kullanım

### Ana Uygulama (Sohbet ve Video)

Web tarayıcınızı açın ve şu adrese gidin:
[https://localhost:3000/](https://localhost:3000/)

1.  "İsim yazın" giriş alanına bir isim girin.
2.  Bir odaya katılmak veya yeni bir oda oluşturmak için "Odaya Katıl" düğmesine tıklayın.
3.  Ardından mesaj gönderebilir ve görüntülü arama başlatabilirsiniz. Video için kamera/mikrofon izinleri vermeniz gerekebilir.
4.  Odadan ayrılmak ve aramayı sonlandırmak için "Odadan Ayrıl" düğmesine tıklayın.

### Yönetici Paneli

Web tarayıcınızı açın ve şu adrese gidin:
[https://localhost:3000/adminpanel](https://localhost:3000/adminpanel)

1.  `config/credentials.js` dosyasında tanımladığınız yönetici kimlik bilgilerini kullanarak giriş yapın.
2.  Aktif odaların ve içindeki kullanıcıların bir listesini göreceksiniz.
3.  Bir kullanıcıyı odadan atmak için adının yanındaki "At" düğmesine tıklayın.

## Katkıda Bulunma

Depoyu forklamak, iyileştirmeler yapmak ve çekme istekleri göndermekten çekinmeyin. Her türlü katkı takdire şayandır!

---