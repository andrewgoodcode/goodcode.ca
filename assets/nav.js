/* Mobile navigation toggle. Loaded on every page, independent of the
   consent script, so the menu works even if consent.js fails to load.
   With JavaScript disabled, the noscript style in each page head shows
   the menu links stacked and hides this toggle instead. */
(function () {
  "use strict";
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("mobile-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (open) { menu.removeAttribute("hidden"); } else { menu.setAttribute("hidden", ""); }
    });
    menu.addEventListener("click", function (event) {
      if (event.target && event.target.tagName === "A") {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        menu.setAttribute("hidden", "");
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
        document.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        menu.setAttribute("hidden", "");
        toggle.focus();
      }
    });
  }
})();

/* Footer date (G37). The footer shows the current date, set at load, so
   it never goes stale. Without JavaScript, the static date in the page
   (the date of the last deploy) is shown instead. */
(function () {
  "use strict";
  var el = document.getElementById("last-updated");
  if (el) {
    el.textContent = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
})();
