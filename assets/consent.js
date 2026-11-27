(function () {
  "use strict";
  var GA_ID = "G-8DQG18D81S";
  var KEY = "gc-consent";
  var gaLoaded = false;

  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  function storedChoice() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function storeChoice(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* storage unavailable, choice lasts for this visit only */ }
  }

  function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=" + window.location.hostname;
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=." + window.location.hostname;
  }

  /* Withdrawal: a granted choice changed to denied deletes the analytics
     cookies already set and stops further analytics calls for this visit.
     The gtag script already loaded stays loaded, but with no cookies to
     read and no calls reaching it, it sends nothing further. */
  function withdrawAnalytics() {
    gaLoaded = false;
    deleteCookie("_ga");
    deleteCookie("_ga_8DQG18D81S");
    deleteCookie("_ga_G-8DQG18D81S");
    deleteCookie("_gid");
    if (window.gtag) {
      window.gtag = function () { /* analytics withdrawn, calls ignored */ };
    }
  }

  function showBanner() {
    if (document.getElementById("consent-banner")) return;
    var banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.id = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<div class="consent-inner">' +
      '<p><strong>We use cookies for analytics.</strong> Google Analytics measures visits to this site, and only runs if you accept. Read the <a href="/cookies/">Cookie Policy</a> and the <a href="/privacy/">Privacy Policy</a>.</p>' +
      '<div class="consent-actions">' +
      '<button class="button" type="button" data-consent="granted">Accept analytics</button>' +
      '<button class="button secondary" type="button" data-consent="denied">Decline</button>' +
      '</div></div>';
    document.body.appendChild(banner);
    banner.addEventListener("click", function (event) {
      var choice = event.target && event.target.getAttribute("data-consent");
      if (!choice) return;
      if (choice === "denied" && storedChoice() === "granted") withdrawAnalytics();
      storeChoice(choice);
      if (choice === "granted") loadGA();
      banner.remove();
    });
  }

  var choice = storedChoice();
  if (choice === "granted") loadGA();
  if (!choice) showBanner();
  document.addEventListener("click", function (event) {
    var el = event.target && event.target.closest ? event.target.closest("[data-cookie-settings]") : null;
    if (el) showBanner();
  });
  window.gcConsent = { showBanner: showBanner };

  /* Hamburger menu */
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
  }

})();
