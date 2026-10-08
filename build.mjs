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

function page(lang) {
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
  const seo = [
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
  return html;
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
