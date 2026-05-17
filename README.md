# Döviz → TRY Dönüştürücü (Chrome Eklentisi)

Web sayfasında bir döviz değeri (**USD, EUR, GBP, JPY, CHF, CNY**) seçtiğinizde, seçimin yanında küçük bir tooltip içinde **anlık TRY karşılığını** gösterir. İsteğe bağlı olarak popup'tan açılan **otomatik tarama** modu, sayfadaki tüm desteklenen para birimi fiyatlarını vurgular ve üzerine geldiğinizde aynı tooltip'i gösterir.

## Desteklenen Para Birimleri

| Kod | Simge(ler) | Para Birimi |
|-----|-----------|-------------|
| USD | `$`, `USD` | ABD Doları |
| EUR | `€`, `EUR` | Euro |
| GBP | `£`, `GBP` | İngiliz Sterlini |
| JPY | `¥`, `JPY` | Japon Yeni |
| CHF | `CHF` | İsviçre Frangı |
| CNY | `CNY`, `RMB` | Çin Yuanı |

> **Not**: `¥` simgesi hem JPY hem CNY için kullanılır; varsayılan olarak **JPY** olarak yorumlanır. Yuan değerleri için `CNY` veya `RMB` kodunu açıkça kullanın.

## Özellikler

- **Seçim tabanlı dönüşüm**: `$19.99`, `EUR 100`, `100 GBP`, `£1,234.56`, `€1.234,56` gibi tüm yaygın formatlar
- **Otomatik tarama modu** (popup'tan toggle): sayfadaki tüm desteklenen değerleri vurgular
- **Çift kaynaklı kur failover'ı**: jsDelivr CDN (kendi içinde Cloudflare+Fastly çoklu-CDN'li) → open-er-api.com
- **Cross-rate hesaplaması**: tek API çağrısıyla tüm para birimleri (USD bazlı veriden cross-rate hesaplanır)
- **1 saatlik cache** + **çevrimdışı eski kuru kullanma** (offline'da bile çalışır)
- **Shadow DOM tooltip**: sayfa CSS'i tooltip'i bozmaz
- **Dark mode** popup desteği
- **Hiçbir API anahtarı gerekmez, ücretsiz**

## Kurulum (Yüklemeden Çalıştırma)

1. Repo'yu klonlayın veya ZIP olarak indirin
2. Chrome'da `chrome://extensions` adresine gidin
3. Sağ üstten **"Geliştirici modu"** açın
4. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
5. Bu klasörü seçin
6. Eklenti yüklendi — sağ üstte yeşil simge görünmeli

## Kullanım

### Seçim ile (varsayılan)
Herhangi bir web sayfasında bir döviz değerini fareyle seçin:
- `$19.99` → tooltip `≈ XX,XX ₺` gösterir, alt satırda `$19,99 · 1 USD = XX,XX ₺ · az önce`
- `€199`, `EUR 199`, `199 EUR` → Euro karşılığı
- `£99` → Sterlin karşılığı
- `¥10000` → Japon Yeni (varsayılan)
- `CNY 100` veya `100 RMB` → Çin Yuanı
- `CHF 50` → İsviçre Frangı

Tüm formatlar üç farklı sayı formatında çalışır:
- US standart: `$1,234.56`
- Avrupa: `€1.234,56`
- Sade: `$100`, `EUR 100`

### Otomatik tarama
1. Sağ üstteki eklenti simgesine tıklayın
2. **"Sayfayı otomatik tara"** toggle'ını açın
3. O andan itibaren, açtığınız her sayfada tüm desteklenen değerlerin altı yeşil çizilir; üzerine gelince TRY karşılığı çıkar
4. Kapatmak için toggle'ı tekrar tıklayın

### Kur yenileme
Popup'ta tüm 6 para biriminin güncel kuru listelenir. **"Yenile"** butonu cache'i bypass edip yeni veri çeker.

## Kur Kaynakları

| Sıra | Sağlayıcı | Güncelleme |
|------|-----------|------------|
| 1 (birincil) | [fawazahmed0 currency-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr CDN | Günlük |
| 2 (fallback) | [open-er-api.com](https://open.er-api.com) | Günlük |

> jsDelivr'in dahili çoklu-CDN failover'ı vardır (Cloudflare + Fastly + Quantil), bu nedenle birincil katman zaten dahili olarak çoklu-yedeklidir.

Cache TTL: **1 saat**. Tüm kaynaklar çevrimdışıysa, eski cache değeri "eski" işaretiyle gösterilir (sessiz başarısızlık yok).

USD/TRY oranı doğrudan, diğer çiftler **cross-rate** olarak hesaplanır:
```
EUR/TRY = (USD/TRY) / (USD/EUR)
```

> Anahtarsız, ücretsiz, gerçekten tick-tick anlık bir FX API'si yok — tüm güvenilir ücretsiz seçenekler günlük güncellenir. Günlük dalgalanma bu kullanım için yeterince taze.

## Dosya Yapısı

```
.
├── manifest.json       # Manifest V3 + izinler
├── background.js       # Service worker: kur çekme, cross-rate, cache, fallback
├── content.js          # Seçim listener, multi-currency parser, auto-scan, Shadow DOM tooltip
├── content.css         # Auto-scan altçizgi stili
├── popup.html/js/css   # Popup UI (6 para birimi listesi + dark mode)
└── icons/              # 16/48/128 px
```

## İzinler

- `storage` — kur cache + ayarlar
- `host_permissions` — yalnızca iki kur API endpoint'i (`cdn.jsdelivr.net`, `open.er-api.com`)
- `content_scripts: <all_urls>` — her sayfada seçim algılayabilmek için (sayfa içeriğini okumaz, sadece seçim olayını dinler)

Hiçbir veri toplama, analitik veya dış sunucuya kullanıcı verisi gönderme yapılmaz. Yalnızca FX kuru çekilir.

## Sorun Giderme

- **Tooltip çıkmıyor**: `chrome://extensions` → eklentiyi yeniden yükle. Bazı SPA siteleri seçim olayını engelleyebilir.
- **Kur "—" görünüyor**: popup'tan "Yenile". DevTools console (service worker sekmesi) loglarına bakabilirsiniz.
- **`¥` her zaman JPY çıkıyor**: bilinçli tercih. Yuan için `CNY` veya `RMB` kodunu kullanın.
- **Yanlış sayı**: `€1.234,56` gibi Avrupa formatı için son ayraç ondalık kabul edilir. `€1.234` (3 haneli tek noktalı) binlik kabul edilir → 1234.

## Sürüm Geçmişi

- **2.0.0**: Multi-currency (USD + EUR + GBP + JPY + CHF + CNY)
- **1.0.0**: İlk sürüm, sadece USD → TRY

## Lisans

MIT
