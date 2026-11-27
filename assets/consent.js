(function () {
  "use strict";
  var GA_ID = "G-8DQG18D81S";
  var KEY = "gc-consent";
  var DATE_KEY = "gc-consent-date";
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
    try {
      var value = window.localStorage.getItem(KEY);
      if (!value) return null;
      var date = window.localStorage.getItem(DATE_KEY);
      if (!date) {
        /* Choice stored before dates were recorded: stamp today, keep it. */
        window.localStorage.setItem(DATE_KEY, new Date().toISOString().slice(0, 10));
        return value;
      }
      var stored = Date.parse(date);
      if (isNaN(stored) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem(DATE_KEY);
        return null;
      }
      /* 12 months, by calendar date: a choice dated 12 months ago today is
         still valid through today; one dated earlier has expired. */
      var cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      if (date < cutoff.toISOString().slice(0, 10)) {
        window.localStorage.removeItem(KEY);
        window.localStorage.removeItem(DATE_KEY);
        return null;
      }
      return value;
    } catch (e) { return null; }
  }
  function storeChoice(value) {
    try {
      window.localStorage.setItem(KEY, value);
      window.localStorage.setItem(DATE_KEY, new Date().toISOString().slice(0, 10));
    } catch (e) { /* storage unavailable, choice lasts for this visit only */ }
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
    var previousFocus = document.activeElement;
    var banner = document.createElement("div");
    banner.className = "consent-banner";
    banner.id = "consent-banner";
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<div class="consent-inner">' +
      '<p><strong>We use cookies for analytics.</strong> Google Analytics measures visits to this site, and only runs if you accept. Read the <a href="/cookies/">Cookie Policy</a> and the <a href="/privacy/">Privacy Policy</a>.</p>' +
      '<div class="consent-actions">' +
      '<button class="button" type="button" data-consent="granted">Accept analytics</button>' +
      '<button class="button secondary" type="button" data-consent="denied">Decline</button>' +
      '</div></div>';
    document.body.appendChild(banner);
    var firstButton = banner.querySelector("button");
    if (firstButton) firstButton.focus();
    banner.addEventListener("click", function (event) {
      var choice = event.target && event.target.getAttribute("data-consent");
      if (!choice) return;
      if (choice === "denied" && storedChoice() === "granted") withdrawAnalytics();
      storeChoice(choice);
      if (choice === "granted") loadGA();
      banner.remove();
      if (previousFocus && document.contains(previousFocus) && previousFocus.focus) previousFocus.focus();
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

})();
