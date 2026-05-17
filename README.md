# USD → TRY Dönüştürücü (Chrome Eklentisi)

Web sayfasında bir USD değeri seçtiğinizde, seçimin yanında küçük bir tooltip içinde **anlık TRY karşılığını** gösterir. İsteğe bağlı olarak popup'tan açılan **otomatik tarama** modu, sayfadaki tüm USD fiyatlarının altını çizer ve üzerine geldiğinizde aynı tooltip'i gösterir.

## Özellikler

- **Seçim tabanlı dönüşüm**: `$19.99`, `USD 100`, `100 USD`, `$1,234.56`, `$1.234,56` formatlarının tümünü tanır
- **Otomatik tarama modu** (popup'tan toggle): sayfadaki tüm USD fiyatlarını vurgular
- **Çift kaynaklı kur failover'ı**: jsDelivr CDN (kendi içinde Cloudflare+Fastly çoklu-CDN'li) → open-er-api.com
- **1 saatlik cache** + **çevrimdışı eski kuru kullanma** (offline'da bile çalışır)
- **Shadow DOM tooltip**: sayfa CSS'i tooltip'i bozmaz
- **Dark mode** popup desteği
- **Hiçbir API anahtarı gerekmez, ücretsiz**

## Kurulum (Yüklemeden Çalıştırma)

1. Chrome'da `chrome://extensions` adresine gidin
2. Sağ üstten **"Geliştirici modu"** açın
3. **"Paketlenmemiş öğe yükle"** butonuna tıklayın
4. Bu klasörü (`USD to TRY/...silly-chaum-980baa/`) seçin
5. Eklenti yüklendi — sağ üstte yeşil `$=₺` simgesi görünmeli

## Kullanım

### Seçim ile (varsayılan)
Herhangi bir web sayfasında bir USD değerini fareyle seçin:
- `$19.99` → tooltip "≈ XX,XX ₺" gösterir
- `USD 100` veya `100 USD` → aynı şekilde çalışır
- TR sitelerinde `$1.234,56` (Avrupa formatı) da tanınır

### Otomatik tarama
1. Sağ üstteki eklenti simgesine tıklayın
2. **"Sayfayı otomatik tara"** toggle'ını açın
3. O andan itibaren, açtığınız her sayfada tüm `$X` değerlerinin altı yeşil çizilir; üzerine gelince TRY karşılığı çıkar
4. Kapatmak için toggle'ı tekrar tıklayın

### Kuru manuel yenileme
Popup'taki **"Yenile"** butonu cache'i bypass edip yeni kur çeker.

## Kur Kaynakları

| Sıra | Sağlayıcı | Güncelleme |
|------|-----------|------------|
| 1 (birincil) | [fawazahmed0 currency-api](https://github.com/fawazahmed0/exchange-api) via jsDelivr CDN | Günlük |
| 2 (fallback) | [open-er-api.com](https://open.er-api.com) | Günlük |

> Not: jsDelivr'in kendi içinde çoklu-CDN failover'ı vardır (Cloudflare + Fastly + Quantil), bu nedenle birincil katman zaten dahili olarak çoklu-yedeklidir.

Cache TTL: **1 saat**. Tüm kaynaklar çevrimdışıysa, eski cache değeri "eski" işaretiyle gösterilir (sessiz başarısızlık yok).

> Anahtarsız, ücretsiz, gerçekten tick-tick anlık bir FX API'si yok — tüm güvenilir ücretsiz seçenekler günlük güncellenir. USD/TRY günlük dalgalanması bu kullanım için yeterince taze.

## Dosya Yapısı

```
.
├── manifest.json       # Manifest V3 + izinler
├── background.js       # Service worker: kur çekme, cache, fallback zinciri
├── content.js          # Seçim listener, auto-scan, Shadow DOM tooltip
├── content.css         # Auto-scan altçizgi stili
├── popup.html/js/css   # Popup UI
└── icons/              # 16/48/128 px
```

## İzinler

- `storage` — kur cache + ayarlar
- `host_permissions` — yalnızca iki kur API endpoint'i (`cdn.jsdelivr.net`, `open.er-api.com`)
- `content_scripts: <all_urls>` — her sayfada seçim algılayabilmek için (sayfa içeriğini okumaz, sadece seçim olayını dinler)

Hiçbir veri toplama, analitik veya dış sunucuya kullanıcı verisi gönderme yapılmaz. Yalnızca FX kuru çekilir.

## Sorun Giderme

- **Tooltip çıkmıyor**: `chrome://extensions` → eklentiyi yeniden yükle (reload). Bazı SPA siteleri seçim olayını engelleyebilir.
- **Kur "—" görünüyor**: popup'tan "Yenile". DevTools console (service worker sekmesi) loglarına bakabilirsiniz.
- **Yanlış sayı**: `$1.234,56` gibi Avrupa formatı için son ayraç ondalık kabul edilir. `$1.234` (3 haneli tek noktalı) binlik kabul edilir → 1234.

## Lisans

MIT
