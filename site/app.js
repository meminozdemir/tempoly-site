// Dil menüsü: her dilin kendi sayfası var (build.mjs). Seçilen dil "lang" çerezinde bir yıl hatırlanır;
// middleware.js ana sayfada bu seçimi tarayıcı dilinden ve ülkeden önce dikkate alır.
(function () {
  "use strict";

  function saveChoice(lang) {
    var secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = "lang=" + encodeURIComponent(lang) + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
  }

  function setupMenu() {
    var btn = document.getElementById("lang-btn");
    var menu = document.getElementById("lang-menu");
    if (!btn || !menu) return;
    var items = Array.prototype.slice.call(menu.querySelectorAll("li"));

    function open() {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      var current = items.filter(function (li) { return li.getAttribute("aria-selected") === "true"; })[0] || items[0];
      current.focus();
    }
    function close(focusBtn) {
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (focusBtn) btn.focus();
    }
    function choose(li) {
      saveChoice(li.getAttribute("data-lang"));
      if (li.getAttribute("aria-selected") === "true") return close(true);
      location.href = li.getAttribute("data-path") || "/";
    }

    btn.addEventListener("click", function () { menu.hidden ? open() : close(false); });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
    });
    items.forEach(function (li, i) {
      li.addEventListener("click", function () { choose(li); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
        else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(li); }
        else if (e.key === "Escape") { e.preventDefault(); close(true); }
        else if (e.key === "Tab") { close(false); }
      });
    });
    document.addEventListener("click", function (e) {
      if (!menu.hidden && !btn.contains(e.target) && !menu.contains(e.target)) close(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) close(true);
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
  setupMenu();
  try { localStorage.removeItem("tempoly.lang"); } catch (e) { /* özel pencere vb. */ }
})();
