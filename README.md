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
hero.svg      Dashboard illüstrasyonu
favicon.svg
og.jpg        Sosyal medya önizleme görseli (1200×630)
vercel.json   Başlıklar, temiz URL'ler
robots.txt, sitemap.xml
```

## Diller

tr, en, de, es, pt, fr, ru, id, vi

Dil seçimi sırası: `?lang=` parametresi → localStorage → tarayıcı dili → en.
Yeni dil eklemek için `app.js` içindeki `I18N` sözlüğüne bir anahtar ekle ve `index.html` ile `sitemap.xml` içindeki dil listelerini güncelle.
