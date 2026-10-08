# tempoly.app

Tempoly'nin tanıtım sitesi. Şu an çok dilli "çok yakında" sayfası.

- **Canlı:** https://tempoly.app
- **Uygulama reposu:** ayrı repo (`tempoly`)
- **Barındırma:** Vercel, proje adı `tempoly-site` (hobby takımı). `main` dalına her push otomatik yayınlanır.

## Yapı

Bağımlılık yok. Sayfalar `node build.mjs` ile üretilir ve `site/` içinde depoya eklenir (Vercel derleme yapmaz, `site/` klasörünü yayınlar).

```
build.mjs       Her dil için statik sayfa + sitemap.xml üretir
src/page.html   Sayfa şablonu (metinler data-i18n / data-i18n-content / data-i18n-alt anahtarlarıyla)
src/i18n.mjs    Çeviri sözlüğü (9 dil)
middleware.js   Ana sayfada sunucu tarafı dil seçimi (çerez → tarayıcı → IP)
site/           Yayınlanan klasör
  index.html, <dil>/index.html, sitemap.xml   (build.mjs çıktısı, elle düzenlemeyin)
  styles.css    Stil (derlemede sayfaya gömülür)
  app.js        Dil menüsü
  fonts/        Inter ve Space Grotesk (Google Fonts, SIL OFL), kendi sunucumuzdan
  img/          Hero fotoğrafları (Unsplash, WebP) ve kanal ikonları (Simple Icons, CC0)
  og.jpg        Sosyal medya önizleme görseli (1200×630)
vercel.json     Başlıklar, önbellek, temiz URL'ler
```

Metin, stil ya da görsel değiştirdikten sonra `node build.mjs` çalıştırıp `site/` ile birlikte commit edin.

## Diller ve SEO

tr, en, de, es, pt, fr, ru, id, vi. Varsayılan dil Türkçe ve kökte (`/`); diğerleri `/<kod>` adresinde (`/en`, `/de` …).

Her dil ayrı bir statik sayfadır: çevrilmiş metin HTML'in içindedir, sayfanın kendini gösteren canonical'ı, tüm diller için hreflang bağlantıları, dile göre başlık/açıklama/og:locale ve yapılandırılmış verisi (SoftwareApplication, WebSite, GokTwins Tech yayıncı) vardır. Bu sayede Google her dili ayrı dizine ekler.

Dil seçimi (goktwins.com ile aynı mantık), `middleware.js` (yalnız `/`):

1. Eski `/?lang=<kod>` bağlantıları kalıcı olarak (308) `/<kod>` adresine yönlenir
2. Dil menüsünden yapılan seçim (`lang` çerezi, 1 yıl)
3. Botlar yönlendirilmez
4. Tarayıcı dili (`Accept-Language`, q sırasına göre): sitede olan ilk dil
5. IP ülkesinin dili (`x-vercel-ip-country`); ülke eşlemesi yoksa İngilizce, ülke bilgisi yoksa Türkçe

Yeni dil eklemek için: `src/i18n.mjs`'e sözlüğü, `build.mjs` ve `middleware.js` içindeki `LANGS` listelerine kodu, `src/page.html`'deki dil menüsüne seçeneği ekleyin; `node build.mjs`.

## Performans

- Yazı tipleri kendi sunucumuzdan; Latin alt kümeleri `preload` ile erken iner, diğer alt kümeler (`unicode-range`) yalnızca gerektiğinde.
- `styles.css` sayfaya gömülür (ayrı istek yok).
- HTML'deki css/js/svg/webp adreslerine içerik özeti (`?v=`) eklenir; bu dosyalar ve yazı tipleri bir yıl `immutable` önbelleklenir. Yazı tipi dosyası değişirse dosya adını değiştirin.

## Görsel kaynakları

- Hero kartındaki fotoğraflar: Unsplash (Unsplash License), `site/img/p1-p4.webp`
- Kanal ikonları: Simple Icons (CC0), `site/img/*.svg`
