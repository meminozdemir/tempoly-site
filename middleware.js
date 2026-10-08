// Otomatik dil seçimi (Vercel Routing Middleware, goktwins.com ile aynı mantık). Yalnızca ana sayfada ("/") çalışır.
// Sayfa tek; dil app.js'te çevrilir. Varsayılan dil (tr) kökte kalır, diğer diller "/?lang=<kod>" adresine yönlenir.
//
// Sıra:
//   1. Adreste ?lang= varsa dokunulmaz (paylaşılan bağlantı, hreflang).
//   2. Dil menüsünden yapılmış seçim ("lang" çerezi) her zaman önceliklidir.
//   3. Arama motoru ve bağlantı önizleme botları yönlendirilmez (hreflang ile tüm diller bulunur).
//   4. Tarayıcı dili (Accept-Language, q değerine göre sıralı): sitede olan ilk dil kazanır.
//      İngiltere'de yaşayan, tarayıcısı Türkçe bir ziyaretçi Türkçe sayfayı görür.
//   5. Tarayıcı dilinden karar verilemezse IP ülkesinin dili; o da yoksa İngilizce.
//
// app.js aynı sırayı izler (?lang → çerez → tarayıcı dili → tr). Burada tr seçilip yönlendirme yapılmadığında
// istemci de tr'ye düşer: tarayıcı dili sitede olsaydı burada zaten o seçilirdi.

export const config = { matcher: "/" };

// app.js içindeki I18N anahtarlarıyla aynı olmalı.
const LANGS = ["tr", "en", "de", "es", "pt", "fr", "ru", "id", "vi"];
const DEFAULT = "tr";

// Tarayıcı dil etiketlerinin eşleri (eski ya da yakın kodlar).
const ALIASES = { in: "id", ms: "id" };

// Ülke -> dil (tarayıcı dili sitedeki dillerden biri değilse kullanılır).
const COUNTRY_LANG = {
  tr: ["TR", "CY"],
  de: ["DE", "AT", "CH", "LI", "LU"],
  fr: ["FR", "BE", "MC", "SN", "CI", "CM", "ML", "BF", "NE", "TG", "BJ", "GA", "CG", "CD", "MG", "HT", "TN", "DZ", "MA"],
  es: ["ES", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CU", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "GQ"],
  pt: ["BR", "PT", "AO", "MZ", "CV", "GW", "ST", "TL"],
  ru: ["RU", "BY", "KZ", "KG"],
  id: ["ID"],
  vi: ["VN"],
};
const BY_COUNTRY = Object.fromEntries(Object.entries(COUNTRY_LANG).flatMap(([lang, list]) => list.map((c) => [c, lang])));

const BOT = /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|embedly|whatsapp|telegram|linkedin|twitter|discord|slack|skype|preview|lighthouse|headless/i;

function cookie(request, name) {
  const header = request.headers.get("cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// "en-GB,en;q=0.9,tr;q=0.8" -> ["en", "en", "tr"] (q değerine göre, eşitlikte yazılış sırası korunur)
function browserLanguages(header) {
  return header
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const base = tag.trim().toLowerCase().split("-")[0];
      return { lang: ALIASES[base] || base, q: q ? parseFloat(q.slice(2)) || 0 : 1, index };
    })
    .filter((l) => l.lang && l.lang !== "*" && l.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((l) => l.lang);
}

function chooseLanguage(request) {
  const saved = cookie(request, "lang");
  if (LANGS.includes(saved)) return saved;

  const fromBrowser = browserLanguages(request.headers.get("accept-language") || "").find((l) => LANGS.includes(l));
  if (fromBrowser) return fromBrowser;

  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  if (!country) return DEFAULT; // Bilgi yoksa varsayılan dil.
  return BY_COUNTRY[country] || "en";
}

const pass = () => new Response(null, { headers: { "x-middleware-next": "1" } });

export default function middleware(request) {
  const url = new URL(request.url);
  if (url.searchParams.has("lang")) return pass();
  if (BOT.test(request.headers.get("user-agent") || "")) return pass();

  const lang = chooseLanguage(request);
  if (lang === DEFAULT) return pass();

  url.searchParams.set("lang", lang);
  return new Response(null, {
    status: 307,
    headers: { Location: url.toString(), "Cache-Control": "private, no-store", Vary: "Accept-Language, Cookie" },
  });
}
