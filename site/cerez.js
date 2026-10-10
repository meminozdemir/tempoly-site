// Çerez bildirimi ve Google Analytics 4 (Consent Mode v2); goktwins.com ile aynı düzen.
//
// Google Analytics yalnızca ziyaretçi "Kabul et" dedikten sonra yüklenir: onay yoksa Google'a hiçbir istek
// gitmez (PageSpeed ölçümleri de onaysız ziyaretçi gibi çalışır). Tercih tarayıcıda (localStorage) bir yıl
// saklanır; alt bilgideki "Çerez tercihleri" bildirimi yeniden açar. Ölçüm kimliği ve bildirim metinleri
// derleme sırasında sayfaya gömülür (build.mjs, #cerez); kimlik yoksa bildirim de bu betik de sayfada olmaz.
(function () {
  var box = document.getElementById("cerez");
  if (!box) return;
  var id = box.getAttribute("data-ga");
  // Geçici test modu (build.mjs, GA_TEST_MODE): gtag.js onay beklenmeden yüklenir ki Google etiket testi
  // etiketi bulabilsin. İzinler yine "denied" başlar; onay verilmeden çerez yazılmaz.
  var always = box.hasAttribute("data-always");
  var KEY = "cerez-onayi";
  var YEAR = 365 * 24 * 60 * 60 * 1000;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });

  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && Date.now() - saved.t < YEAR) return saved.v;
    } catch (e) {}
    return null;
  }
  function save(value) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: value, t: Date.now() })); } catch (e) {}
  }

  var granted = false;
  var configured = false;
  function load() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(s);
  }
  // later: daha önce onay vermiş ziyaretçi. gtag.js, sayfa yüklenip tarayıcı boşa çıkınca indirilir;
  // ilk boyama ve etkileşimle yarışmaz.
  function grant(later) {
    granted = true;
    gtag("consent", "update", { analytics_storage: "granted" });
    setup(later);
  }
  function setup(later) {
    if (configured || !id) return;
    configured = true;
    gtag("js", new Date());
    gtag("config", id);
    if (!later) return load();
    var idle = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 1); })(load); };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  }
  // Onay geri alınırsa Analytics çerezleri silinir (gtag.js bu sayfada yüklüyse yeni çerez de yazmaz).
  function deny() {
    if (!granted) return;
    granted = false;
    gtag("consent", "update", { analytics_storage: "denied" });
    var host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (!/^_ga/.test(name)) return;
      [host, "." + host, ""].forEach(function (domain) {
        document.cookie = name + "=; path=/; max-age=0" + (domain ? "; domain=" + domain : "");
      });
    });
  }

  function show() { box.hidden = false; }
  box.addEventListener("click", function (event) {
    var button = event.target.closest("[data-consent]");
    if (!button) return;
    var value = button.getAttribute("data-consent");
    save(value);
    box.hidden = true;
    if (value === "granted") grant(false);
    else deny();
  });

  document.addEventListener("click", function (event) {
    var opener = event.target.closest && event.target.closest("[data-consent-open]");
    if (!opener) return;
    event.preventDefault();
    show();
    box.querySelector("button").focus();
  });

  var choice = read();
  if (choice === "granted") grant(true);
  else {
    if (always) setup(true);
    if (choice !== "denied") show();
  }
})();
