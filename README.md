# tempoly.app

Tempoly'nin tanıtım sitesi. Şu an çok dilli "çok yakında" sayfası.

- **Canlı:** https://tempoly.app
- **Uygulama reposu:** ayrı repo (`tempoly`)
- **Barındırma:** Vercel, proje adı `tempoly-site` (hobby takımı). İlk deploy API üzerinden yapıldı.
- **Otomatik yayın:** Vercel dashboard → tempoly-site → Settings → Git → "Connect Git Repository" ile bu repo bağlanınca `main` dalına her push otomatik yayınlanır.

## Yapı

Derleme adımı yok, saf statik dosyalar:

```
index.html    Sayfa iskeleti (metinler data-i18n anahtarlarıyla)
styles.css    Stil
app.js        Dil algılama ve çeviri sözlüğü (9 dil)
middleware.js Ana sayfada sunucu tarafı dil seçimi (çerez → tarayıcı → IP)
img/          Hero fotoğrafları (Unsplash) ve kanal ikonları (Simple Icons, CC0)
favicon.svg
og.jpg        Sosyal medya önizleme görseli (1200×630)
vercel.json   Başlıklar, temiz URL'ler
robots.txt, sitemap.xml
```

## Diller

tr, en, de, es, pt, fr, ru, id, vi

Varsayılan dil Türkçe. Dil seçimi hibrit (goktwins.com ile aynı mantık):

1. `?lang=` parametresi (paylaşılan bağlantı, hreflang)
2. Dil menüsünden yapılan seçim (`lang` çerezi, 1 yıl)
3. Tarayıcı dili (`Accept-Language`, q sırasına göre): sitede olan ilk dil
4. IP ülkesinin dili (`x-vercel-ip-country`); ülke eşlemesi yoksa İngilizce, ülke bilgisi yoksa Türkçe

`middleware.js` (Vercel Routing Middleware, yalnız `/`) bu sırayı sunucuda uygular. Seçilen dil Türkçe değilse `/?lang=<kod>` adresine 307 ile yönlendirir. Botlar yönlendirilmez. `app.js` aynı sırayı istemcide izler (IP adımı hariç) ve Türkçe'ye düşer.

Yeni dil eklemek için `app.js` içindeki `I18N` sözlüğüne bir anahtar ekle; `middleware.js` içindeki `LANGS` ve `COUNTRY_LANG`, `index.html` ve `sitemap.xml` içindeki dil listelerini güncelle.

## Görsel kaynakları

- Hero kartındaki fotoğraflar: Unsplash (Unsplash License), `img/p1-p4.jpg`
- Kanal ikonları: Simple Icons (CC0), `img/*.svg`
- Hero kartı artık `index.html` içinde inline SVG; metinleri `data-i18n` ile çevriliyor.
