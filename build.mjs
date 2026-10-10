#!/usr/bin/env node
/**
 * tempoly.app çok dilli statik site derleyicisi.
 *
 *   node build.mjs
 *
 * Şablon src/page.html, metinler src/i18n.mjs. Her dil için çevrilmiş metni içinde taşıyan ayrı bir sayfa
 * üretilir: varsayılan dil kökte (/), diğerleri /<kod> adresinde (/tr, /de ...). Arama motorları her dili
 * ayrı sayfa olarak görür (kendini gösteren canonical, hreflang, dile göre başlık/açıklama). Çıktı site/
 * klasörüne yazılır; görseller, stil ve betikler site/ içinde elle tutulur.
 *
 * Yeni dil: src/i18n.mjs'e ekleyin, aşağıdaki LANGS ve middleware.js içindeki LANGS listesini güncelleyin,
 * src/page.html'deki dil menüsüne seçeneği ekleyin.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import I18N from "./src/i18n.mjs";
import CONSENT from "./src/consent.mjs";

// ---- Siteye özel ayarlar -------------------------------------------------------------------------------
const SITE = "https://tempoly.app";
const NAME = "Tempoly";
const DEFAULT = "tr"; // kökte yayınlanan dil (x-default)
const UPDATED = "2026-10-08";
const OG_IMAGE = "/og.jpg";
// Dil menüsündeki sıra. middleware.js içindeki LANGS ile aynı olmalı.
const LANGS = {
  tr: { name: "Türkçe", locale: "tr_TR" },
  en: { name: "English", locale: "en_US" },
  de: { name: "Deutsch", locale: "de_DE" },
  es: { name: "Español", locale: "es_ES" },
  pt: { name: "Português", locale: "pt_BR" },
  fr: { name: "Français", locale: "fr_FR" },
  ru: { name: "Русский", locale: "ru_RU" },
  id: { name: "Bahasa Indonesia", locale: "id_ID" },
  vi: { name: "Tiếng Việt", locale: "vi_VN" },
};
// İlk ekranda kullanılan yazı tipleri; tarayıcı CSS'i beklemeden indirmeye başlar.
const PRELOAD_FONTS = ["/fonts/inter-latin.woff2", "/fonts/space-grotesk-latin.woff2"];
// Google Analytics 4 ölçüm kimliği (G-…). Boşken çerez bildirimi ve Analytics sayfalara eklenmez.
// Analytics yalnızca ziyaretçi çerez bildiriminde onay verince yüklenir (site/cerez.js).
const GA_ID = "G-R52PJW1QF1";
// GEÇİCİ: true iken gtag.js onay beklenmeden yüklenir (Google etiket testi için; izinler yine "denied"
// başlar, onaysız çerez yazılmaz). Etiket doğrulanınca false yapılıp yeniden derlenmeli.
const GA_TEST_MODE = false;
// "Çerez tercihleri" bağlantısının alt bilgideki yeri: [aranan, yerine konan].
const FOOTER_SETTINGS = (button) => ["\n    </nav>\n    <p class=\"pay\">", `\n      ${button}\n    </nav>\n    <p class="pay">`];
const PUBLISHER = { "@type": "Organization", "@id": "https://goktwins.com/#organization", name: "GokTwins Tech", url: "https://goktwins.com", logo: "https://goktwins.com/img/logo-512.png" };
const structuredData = (lang, url, t) => [
  {
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#app`,
    name: NAME,
    url,
    description: t["meta.description"],
    image: SITE + OG_IMAGE,
    inLanguage: lang,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Social media content generation",
    operatingSystem: "Web, iOS, Android",
    publisher: { "@id": PUBLISHER["@id"] },
  },
  { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: NAME, inLanguage: Object.keys(LANGS), publisher: { "@id": PUBLISHER["@id"] } },
  PUBLISHER,
];
// ---------------------------------------------------------------------------------------------------------

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, "site");
const CODES = Object.keys(LANGS);
const path = (lang) => (lang === DEFAULT ? "/" : `/${lang}`);
const url = (lang) => SITE + path(lang);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attr = (s) => esc(s).replace(/"/g, "&quot;");

for (const code of CODES) if (!I18N[code]) throw new Error(`src/i18n.mjs içinde "${code}" yok`);
const TEMPLATE = readFileSync(join(ROOT, "src", "page.html"), "utf8").replace(/\r\n/g, "\n");
const CSS = readFileSync(join(OUT, "styles.css"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\s*\n\s*/g, "\n")
  .trim();

function page(lang, opts = {}) {
  const t = I18N[lang];
  const get = (key) => {
    if (t[key] === undefined) throw new Error(`${lang}: "${key}" çevirisi yok`);
    return t[key];
  };
  let html = TEMPLATE.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);

  // Metinler: <x data-i18n="anahtar">...</x>, data-i18n-content ve data-i18n-alt öznitelikleri. Anahtar
  // öznitelikleri çıktıda kalmaz.
  html = html.replace(/<([a-zA-Z]+)(\b[^>]*?)\sdata-i18n="([^"]+)"([^>]*)>[\s\S]*?<\/\1>/g, (_, tag, a, key, b) => `<${tag}${a}${b}>${esc(get(key))}</${tag}>`);
  for (const name of ["content", "alt"]) {
    const re = new RegExp(`\\s${name}="[^"]*"([^>]*?)\\sdata-i18n-${name}="([^"]+)"|\\sdata-i18n-${name}="([^"]+)"([^>]*?)\\s${name}="[^"]*"`, "g");
    html = html.replace(re, (_, a1 = "", k1, k2, a2 = "") => ` ${name}="${attr(get(k1 || k2))}"${a1 || a2}`);
  }
  if (/data-i18n/.test(html)) throw new Error(`${lang}: işlenmemiş data-i18n kaldı`);

  // Dil menüsü: her seçenek kendi sayfasının adresini taşır, geçerli dil işaretlenir.
  html = html.replace(/<option value="(\w+)"( selected)?>/g, (_, c) => `<option value="${c}" data-path="${path(c)}"${c === lang ? " selected" : ""}>`);
  html = html.replace(/<li role="option" data-lang="(\w+)"( aria-selected="\w+")?/g, (_, c) => `<li role="option" data-lang="${c}" data-path="${path(c)}" aria-selected="${c === lang}"`);
  html = html.replace(/(<span id="lang-label">)[^<]*(<\/span>)/, `$1${LANGS[lang].name}$2`);
  html = html.replace(/(<a class="brand" href=")\/(")/, `$1${path(lang)}$2`);

  const description = get("meta.description");
  const seo = opts.notFound ? [`<meta name="robots" content="noindex">`] : [
    `<link rel="canonical" href="${url(lang)}">`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">`,
    `<meta property="og:url" content="${url(lang)}">`,
    `<meta property="og:locale" content="${LANGS[lang].locale}">`,
    ...CODES.filter((c) => c !== lang).map((c) => `<meta property="og:locale:alternate" content="${LANGS[c].locale}">`),
    `<meta property="og:image:alt" content="${attr(get("meta.title"))}">`,
    `<meta name="twitter:title" content="${attr(get("meta.title"))}">`,
    `<meta name="twitter:description" content="${attr(description)}">`,
    ...CODES.map((c) => `<link rel="alternate" hreflang="${c}" href="${url(c)}">`),
    `<link rel="alternate" hreflang="x-default" href="${url(DEFAULT)}">`,
    `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": structuredData(lang, url(lang), t) }).replace(/</g, "\\u003c")}</script>`,
  ];
  html = html.replace("  <!--seo-->", seo.map((l) => "  " + l).join("\n"));
  // Stil dosyası küçük (~8 KB): ayrı bir istek ilk çizimi bekletmesin diye sayfanın içine gömülür.
  html = html.replace('  <link rel="stylesheet" href="/styles.css">', () => `  <style>${CSS}</style>`);
  html = html.replace("  <!--fonts-->", PRELOAD_FONTS.map((f) => `  <link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`).join("\n"));
  if (GA_ID) {
    const c = CONSENT[lang] ?? CONSENT.en;
    const [anchor, replacement] = FOOTER_SETTINGS(`<button type="button" class="foot-link" data-consent-open>${esc(c.settings)}</button>`);
    html = html.replace(anchor, replacement);
    const banner = `  <div class="consent" id="cerez" role="region" aria-label="${attr(c.label)}" data-ga="${GA_ID}"${GA_TEST_MODE ? " data-always" : ""} hidden>
    <p>${c.text.replace("{privacy}", c.privacy)}</p>
    <div class="consent-actions">
      <button class="consent-btn" type="button" data-consent="denied">${esc(c.reject)}</button>
      <button class="consent-btn consent-btn--accept" type="button" data-consent="granted">${esc(c.accept)}</button>
    </div>
  </div>
`;
    html = html.replace('  <script src="/app.js" defer></script>', `${banner}  <script src="/app.js" defer></script>\n  <script src="/cerez.js" defer></script>`);
  }
  return html;
}

// 404 sayfası: varsayılan dilde üretilir; app.js ziyaretçinin dilini (adresteki dil klasörü, "lang" çerezi,
// tarayıcı dili) bulup metinleri ve "ana sayfaya dön" bağlantısını o dile çevirir. Arama motorlarına kapalı.
const NOT_FOUND = {
  tr: { title: "Sayfa bulunamadı", lead: "Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.", back: "Ana sayfaya dön" },
  en: { title: "Page not found", lead: "The page you're looking for may have moved or never existed.", back: "Back to home" },
  de: { title: "Seite nicht gefunden", lead: "Die gesuchte Seite wurde möglicherweise verschoben oder existiert nicht.", back: "Zur Startseite" },
  es: { title: "Página no encontrada", lead: "Es posible que la página que buscas se haya movido o no exista.", back: "Volver al inicio" },
  pt: { title: "Página não encontrada", lead: "A página que você procura pode ter sido movida ou não existir.", back: "Voltar ao início" },
  fr: { title: "Page introuvable", lead: "La page que vous cherchez a peut-être été déplacée ou n'existe pas.", back: "Retour à l'accueil" },
  ru: { title: "Страница не найдена", lead: "Возможно, страница, которую вы ищете, была перемещена или не существует.", back: "На главную" },
  id: { title: "Halaman tidak ditemukan", lead: "Halaman yang Anda cari mungkin telah dipindahkan atau tidak pernah ada.", back: "Kembali ke beranda" },
  vi: { title: "Không tìm thấy trang", lead: "Trang bạn đang tìm có thể đã được chuyển đi hoặc không tồn tại.", back: "Về trang chủ" },
};

function notFound() {
  const nf = NOT_FOUND[DEFAULT];
  // Alt bilgideki çevrilen metinler (footer.*) de 404'te ziyaretçinin diline geçer: data-k ile işaretlenir.
  const footKeys = Object.keys(I18N[DEFAULT]).filter((k) => k.startsWith("footer."));
  const texts = Object.fromEntries(
    CODES.map((c) => [c, { ...NOT_FOUND[c], path: path(c), name: LANGS[c].name, k: Object.fromEntries(footKeys.map((k) => [k, I18N[c][k]])) }])
  );
  let html = page(DEFAULT, { notFound: true });
  html = html.replace(/<title>[^<]*<\/title>/, `<title>404 – ${esc(nf.title)} | ${NAME}</title>`);
  html = html.replace(
    /<main class="hero">[\s\S]*?<\/main>/,
    `<main class="hero nf">
    <p class="eyebrow">404</p>
    <h1 class="title"><span class="title-word">4</span><span class="title-word title-word--accent">04</span></h1>
    <p class="soon" id="nf-title">${esc(nf.title)}</p>
    <p class="lead" id="nf-lead">${esc(nf.lead)}</p>
    <a class="nf-home" id="nf-back" href="${path(DEFAULT)}">${esc(nf.back)}</a>
    <nav class="nf-langs" aria-label="Languages">
      ${CODES.map((c) => `<a href="${path(c)}" hreflang="${c}" lang="${c}">${LANGS[c].name}</a>`).join("\n      ")}
    </nav>
  </main>`
  );
  for (const k of footKeys) html = html.replace(`<span>${esc(I18N[DEFAULT][k])}</span>`, `<span data-k="${k}">${esc(I18N[DEFAULT][k])}</span>`);
  return html.replace("<body>", `<body data-nf="${attr(JSON.stringify(texts))}">`);
}

// Önbellek: HTML'deki stil, betik ve görsel adreslerine içerik özeti eklenir (?v=...). Dosya değişince adres
// de değişir; vercel.json bu dosyaları bir yıl "immutable" önbellekletir. Yazı tipleri (woff2) özetlenmez:
// CSS'teki ve preload'daki adres aynı kalmalı; yazı tipi değişirse dosya adı değiştirilmeli.
const hashes = new Map();
function versioned(p) {
  if (!hashes.has(p)) hashes.set(p, createHash("sha256").update(readFileSync(join(OUT, p))).digest("hex").slice(0, 10));
  return `${p}?v=${hashes.get(p)}`;
}
const ASSET = /(?<=["\s(])\/[\w./-]+\.(?:css|js|svg|webp)(?=["\s,)])/g;

function write(file, content) {
  mkdirSync(dirname(file), { recursive: true });
  if (file.endsWith(".html")) content = content.replace(ASSET, versioned);
  writeFileSync(file, content);
  console.log("  " + file.slice(OUT.length + 1).replace(/\\/g, "/"));
}

for (const lang of CODES) write(lang === DEFAULT ? join(OUT, "index.html") : join(OUT, lang, "index.html"), page(lang));

write(join(OUT, "404.html"), notFound());

const links = CODES.map((c) => `    <xhtml:link rel="alternate" hreflang="${c}" href="${url(c)}"/>`).concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${url(DEFAULT)}"/>`).join("\n");
write(
  join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${CODES.map((c) => `  <url>\n    <loc>${url(c)}</loc>\n    <lastmod>${UPDATED}</lastmod>\n${links}\n  </url>`).join("\n")}
</urlset>
`
);
console.log("Tamam.");
