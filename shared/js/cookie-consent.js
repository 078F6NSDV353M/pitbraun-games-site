(() => {
  if (window.__PBG_COOKIE_CONSENT_LOADED__) return;
  window.__PBG_COOKIE_CONSENT_LOADED__ = true;

  const CONSENT_KEY = "pbg_cookie_consent";
  const CONSENT_VERSION = 1;
  const GA_ID = "G-6MJREFQCRB";

  let analyticsLoaded = false;

  let root = null;
  let banner = null;
  let overlay = null;
  let analyticsCheckbox = null;

  function readConsent() {
    try {
      const raw = localStorage.getItem(CONSENT_KEY);

      if (!raw) return null;

      const consent = JSON.parse(raw);

      if (consent.version !== CONSENT_VERSION) {
        return null;
      }

      return consent;
    } catch {
      return null;
    }
  }

  function writeConsent(analytics) {
    const consent = {
      version: CONSENT_VERSION,
      analytics: Boolean(analytics),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify(consent)
    );

    return consent;
  }

  function deleteAnalyticsCookies() {
    document.cookie
      .split(";")
      .map(cookie => cookie.split("=")[0].trim())
      .filter(name => name.startsWith("_ga"))
      .forEach(name => {
        document.cookie =
          `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      });
  }

  function loadAnalytics() {
    if (analyticsLoaded) return;

    analyticsLoaded = true;

    window.dataLayer = window.dataLayer || [];

    window.gtag = function() {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });

    window.gtag("js", new Date());
    window.gtag("config", GA_ID);

    const script = document.createElement("script");

    script.async = true;
    script.src =
      `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

    document.head.appendChild(script);
  }

  function disableAnalytics() {
    deleteAnalyticsCookies();

    if (window.gtag) {
      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }
  }

  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
  }

  function hideBanner() {
    if (!banner) return;
    banner.hidden = true;
  }

  function openSettings() {
    if (!root || !overlay || !analyticsCheckbox) return;

    const consent = readConsent();

    analyticsCheckbox.checked =
      consent?.analytics === true;

    root.hidden = false;
    overlay.hidden = false;
  }

  function closeSettings() {
    if (!overlay) return;

    overlay.hidden = true;
  }

  function acceptAll() {
    writeConsent(true);
    loadAnalytics();

    closeSettings();
    hideBanner();
  }

  function rejectAll() {
    const previous = readConsent();

    writeConsent(false);
    disableAnalytics();

    closeSettings();
    hideBanner();

    if (previous?.analytics === true) {
      window.location.reload();
    }
  }

  function savePreferences() {
    const previous = readConsent();
    const analytics = analyticsCheckbox.checked;

    writeConsent(analytics);

    if (analytics) {
      loadAnalytics();
    } else {
      disableAnalytics();
    }

    closeSettings();
    hideBanner();

    if (
      previous?.analytics === true &&
      analytics === false
    ) {
      window.location.reload();
    }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const target = event.target.closest(
        "[data-consent-accept]," +
        "[data-consent-reject]," +
        "[data-consent-settings]," +
        "[data-consent-save]," +
        "[data-consent-close]," +
        "[data-cookie-settings]"
      );

      if (!target) return;

      if (target.matches("[data-consent-accept]")) {
        acceptAll();
        return;
      }

      if (target.matches("[data-consent-reject]")) {
        rejectAll();
        return;
      }

      if (
        target.matches("[data-consent-settings]") ||
        target.matches("[data-cookie-settings]")
      ) {
        openSettings();
        return;
      }

      if (target.matches("[data-consent-save]")) {
        savePreferences();
        return;
      }

      if (target.matches("[data-consent-close]")) {
        closeSettings();
      }
    });

    overlay.addEventListener("click", event => {
      if (event.target === overlay) {
        closeSettings();
      }
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        overlay &&
        !overlay.hidden
      ) {
        closeSettings();
      }
    });
  }

  async function loadMarkup() {
    const response = await fetch(
      "/shared/html/cookie-consent.html"
    );

    if (!response.ok) {
      throw new Error(
        `Cookie consent HTML failed: ${response.status}`
      );
    }

    const html = await response.text();

    const container = document.createElement("div");
    container.innerHTML = html.trim();

    root = container.firstElementChild;

    document.body.appendChild(root);

    banner = root.querySelector(
      ".cookie-consent__banner"
    );

    overlay = root.querySelector(
      "[data-consent-overlay]"
    );

    analyticsCheckbox = root.querySelector(
      "#analyticsConsent"
    );

    root.hidden = false;
  }

  function loadStyles() {
    if (
      document.querySelector(
        'link[href="/shared/css/cookie-consent.css"]'
      )
    ) {
      return;
    }

    const link = document.createElement("link");

    link.rel = "stylesheet";
    link.href = "/shared/css/cookie-consent.css";

    document.head.appendChild(link);
  }

  async function init() {
    loadStyles();

    try {
      await loadMarkup();
      bindEvents();

      const consent = readConsent();

      if (!consent) {
        showBanner();
        return;
      }

      hideBanner();

      if (consent.analytics === true) {
        loadAnalytics();
      }
    } catch (error) {
      console.error(
        "Cookie consent initialization failed:",
        error
      );
    }
  }

  window.PBGConsent = {
    openSettings,
    readConsent
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }
})();
