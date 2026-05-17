# USD to TRY Converter Chrome Extension

Chrome eklentisi — herhangi bir web sayfasında bir döviz değeri seçtiğinizde **anlık TRY karşılığını** seçimin yanında küçük bir tooltip ile gösterir. **USD, EUR, GBP, JPY, CHF, CNY** desteklenir.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Yay%C4%B1na%20Haz%C4%B1rlan%C4%B1yor-yellow?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/PLACEHOLDER_EXTENSION_ID)

> **Not (geliştirici):** Eklenti Chrome Web Store onay sürecinden sonra yukarıdaki linkten tek tıklamayla yüklenebilir olacak. Onay sonrası README'deki `PLACEHOLDER_EXTENSION_ID` ve badge'i gerçek değerle değiştirin (aşağıda "Chrome Web Store'a Yayınlama" bölümüne bakın).

## Desteklenen Para Birimleri

| Kod | Simge(ler) | Para Birimi |
|-----|-----------|-------------|
| USD | `$`, `USD` | ABD Doları |
| EUR | `€`, `EUR` | Euro |
| GBP | `£`, `GBP` | İngiliz Sterlini |
| JPY | `¥`, `JPY` | Japon Yeni |
| CHF | `CHF` | İsviçre Frangı |
| CNY | `CNY`, `RMB` | Çin Yuanı |

> `¥` simgesi varsayılan olarak **JPY** kabul edilir. Yuan değerleri için açıkça `CNY` veya `RMB` kodunu kullanın.

## Özellikler

- 🖱️ **Seçim tabanlı**: Bir döviz değeri seçince tooltip kendiliğinden çıkar
- ✨ **Otomatik tarama modu** (opsiyonel): popup'tan toggle — sayfadaki tüm desteklenen değerleri vurgular
- 🔄 **Anlık güncel kur**: jsDelivr CDN → open-er-api fallback, 1 saatlik cache
- 📴 **Çevrimdışı çalışır**: cache geçerliyse internet olmadan da hesaplar
- 🎨 **Dark mode** popup desteği
- 🔐 **Sıfır veri toplama**, anahtar gerektirmez, ücretsiz

## Kullanım

### Seçim ile
Sayfada bir döviz değerini fareyle seç:
- `$19.99` → `≈ 909,17 ₺` (USD)
- `€199` → EUR karşılığı
- `£99`, `¥10000`, `CHF 50`, `RMB 200` → ilgili kur

US (`$1,234.56`), Avrupa (`€1.234,56`) ve sade (`100 USD`) formatlarının tümü tanınır.

### Otomatik tarama
1. Sağ üstteki eklenti simgesine tıkla
2. **"Sayfayı otomatik tara"** toggle'ını aç
3. Açtığın her sayfada tüm desteklenen değerlerin altı yeşil çizilir; üzerine gelince TRY karşılığı çıkar
4. Kapatmak için toggle'ı tekrar tıkla

### Tüm kurları görme
Popup'a tıkla — 6 para biriminin güncel TRY kurunu listeler. **"Yenile"** butonu cache'i bypass eder.

## Gizlilik & İzinler

- `storage` — sadece kur cache'i ve toggle ayarı için
- `host_permissions` — yalnızca **iki kur API endpoint'i** (`cdn.jsdelivr.net`, `open.er-api.com`)
- `content_scripts: <all_urls>` — her sayfada seçim algılayabilmek için. Sayfa içeriği okunmaz, dış sunucuya gönderilmez

Hiçbir analitik, telemetri veya kullanıcı verisi toplama yok. Yalnızca anonim FX kuru fetch'i yapılır.

## Kur Kaynakları & Hesaplama

| Sıra | Sağlayıcı | Güncelleme |
|------|-----------|------------|
| 1 (birincil) | [fawazahmed0 currency-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr CDN | Günlük |
| 2 (fallback) | [open-er-api.com](https://open.er-api.com) | Günlük |

Tek API çağrısıyla USD bazlı tüm kurlar çekilir, diğer çiftler **cross-rate** olarak hesaplanır:
```
EUR/TRY = (USD/TRY) / (USD/EUR)
```

Cache TTL: 1 saat. Tüm kaynaklar çevrimdışıysa son cache değeri "eski" işaretiyle gösterilir.

---

## Geliştiriciler için

### Kaynaktan kurulum (test / katkı)

Kullanıcı olarak yükleyeceksen yukarıdaki **Chrome Web Store** linkini kullan. Aşağıdaki adımlar yalnızca **geliştirici / katkıda bulunan** içindir:

```bash
git clone https://github.com/ayberksencan/usd-to-try-converter-chrome-extension.git
cd usd-to-try-converter-chrome-extension
```

Sonra Chrome'da:
1. `chrome://extensions` → Geliştirici modu açık
2. "Paketlenmemiş öğe yükle" → bu klasörü seç

### Chrome Web Store'a Yayınlama (proje sahibi)

Kullanıcıların tek-tık ile ekleyebilmesi için Chrome Web Store'a yayınlamak gerekir:

1. **Geliştirici hesabı oluştur**: https://chrome.google.com/webstore/devconsole — tek seferlik $5 kayıt ücreti
2. **Paketle**:
   ```bash
   cd "USD to TRY"
   zip -r -FS extension.zip . -x "*.git*" "*.DS_Store" "README.md" ".gitignore"
   ```
3. **Yükle**: Developer Dashboard'da "New Item" → ZIP yükle
4. **Liste bilgileri**: ekran görüntüsü (1280×800), açıklama, kategori (Productivity), ikon
5. **Gizlilik beyanı**: bu eklenti hiçbir veri toplamaz; "Single purpose: convert foreign currency values to TRY"
6. **İnceleme**: tipik 1-3 gün
7. **Yayınlandıktan sonra**:
   - Web Store URL'sini al: `https://chromewebstore.google.com/detail/<extension-id>`
   - Bu README'deki `PLACEHOLDER_EXTENSION_ID` ve badge'i güncelle:
     ```markdown
     [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/<extension-id>?style=for-the-badge&logo=googlechrome&logoColor=white&color=22c55e&label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/<extension-id>)
     ```

### Proje yapısı

```
.
├── manifest.json       # Manifest V3 + izinler
├── background.js       # Service worker: kur çekme, cross-rate, cache, fallback
├── content.js          # Seçim listener, multi-currency parser, auto-scan, Shadow DOM tooltip
├── content.css         # Auto-scan altçizgi stili
├── popup.html/js/css   # Popup UI (6 para birimi listesi + dark mode)
└── icons/              # 16/48/128 px
```

### Sürüm Geçmişi

- **2.0.0** — Multi-currency: EUR, GBP, JPY, CHF, CNY eklendi
- **1.0.0** — İlk sürüm, sadece USD → TRY

## Lisans

MIT
