# USD to TRY Converter Chrome Extension

Chrome eklentisi — herhangi bir web sayfasında bir döviz değeri seçtiğinizde **anlık TRY karşılığını** seçimin yanında küçük bir tooltip ile gösterir. **USD, EUR, GBP, JPY, CHF, CNY** desteklenir.

[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Yay%C4%B1na%20Haz%C4%B1rlan%C4%B1yor-yellow?style=for-the-badge&logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/PLACEHOLDER_EXTENSION_ID)

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

## Lisans

MIT
