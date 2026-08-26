"use strict";

(function () {
  var MENU_CLASS = "abyss-modern-menu-button";
  var DRAWER_ID = "abyss-modern-drawer";
  var BACKDROP_ID = "abyss-modern-drawer-backdrop";
  var OPEN_CLASS = "abyss-modern-drawer-open";
  var syncTimer = 0;

  function safe(fn) {
    try {
      return fn();
    } catch (err) {
      try {
        console.warn("[abyss-jf12-nav]", err);
      } catch (ignored) {
        // Console is unavailable.
      }
    }
  }

  function isDesktop() {
    return !window.matchMedia || window.matchMedia("(min-width: 900px)").matches;
  }

  function getPrimaryToolbar() {
    var appBars = document.querySelectorAll("#reactRoot .MuiAppBar-root");
    for (var i = 0; i < appBars.length; i++) {
      var appBar = appBars[i];
      if (appBar.closest && appBar.closest(".osdHeader")) continue;

      for (var j = 0; j < appBar.children.length; j++) {
        var child = appBar.children[j];
        if (child.classList && child.classList.contains("MuiToolbar-root")) {
          return child;
        }
      }
    }
    return null;
  }

  function getNavStack(toolbar) {
    if (!toolbar) return null;
    for (var i = 0; i < toolbar.children.length; i++) {
      var child = toolbar.children[i];
      if (child.classList && child.classList.contains("MuiStack-root")) {
        return child;
      }
    }
    return null;
  }

  function hrefValue(anchor) {
    return String(anchor.getAttribute("href") || "");
  }

  function classifyAnchor(anchor) {
    var href = hrefValue(anchor);
    if (anchor.getAttribute("target") === "_blank") return "custom";
    if (/\/home\?tab=1(?:$|&)/.test(href)) return "favorite";
    if (href === "/" || href === "#/" || /\/#\/$/.test(anchor.href || "")) return "home";
    return "library";
  }

  function currentRoute() {
    var hash = String(window.location.hash || "").replace(/^#/, "");
    return hash || String(window.location.pathname || "");
  }

  function isHomeActive() {
    var route = currentRoute();
    return (/^\/?home(?:\?|$)/.test(route) && !/[?&]tab=1(?:&|$)/.test(route)) || route === "/" || route === "";
  }

  function markNativeNavigation(toolbar, stack) {
    toolbar.setAttribute("data-abyss-modern-primary", "true");
    stack.setAttribute("data-abyss-modern-center", "true");

    var anchors = Array.prototype.slice.call(stack.querySelectorAll("a.MuiButton-root"));
    anchors.forEach(function (anchor) {
      var role = classifyAnchor(anchor);
      anchor.setAttribute("data-abyss-nav-role", role);
      if (role === "home") {
        anchor.setAttribute("data-abyss-active", isHomeActive() ? "true" : "false");
        anchor.setAttribute("aria-label", "Home");
      } else {
        anchor.removeAttribute("data-abyss-active");
      }
    });

    return anchors;
  }

  function closeDrawer() {
    document.body.classList.remove(OPEN_CLASS);
    var button = document.querySelector("#reactRoot ." + MENU_CLASS);
    if (button) button.setAttribute("aria-expanded", "false");
  }

  function openDrawer() {
    document.body.classList.add(OPEN_CLASS);
    var button = document.querySelector("#reactRoot ." + MENU_CLASS);
    if (button) button.setAttribute("aria-expanded", "true");
  }

  function toggleDrawer() {
    if (document.body.classList.contains(OPEN_CLASS)) closeDrawer();
    else openDrawer();
  }

  function ensureMenuButton(toolbar) {
    var button = toolbar.querySelector(":scope > ." + MENU_CLASS);
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.className = MENU_CLASS;
    button.setAttribute("data-abyss-modern-menu", "true");
    button.setAttribute("aria-label", "Open menu");
    button.setAttribute("aria-controls", DRAWER_ID);
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"></path></svg>';
    button.addEventListener("click", toggleDrawer);
    toolbar.insertBefore(button, toolbar.firstChild);
    return button;
  }

  function makeIcon(source, role) {
    var icon = document.createElement("span");
    icon.className = "abyss-modern-drawer-icon";

    if (role === "home") {
      icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3z"></path></svg>';
      return icon;
    }

    var nativeIcon = source.querySelector(".MuiButton-startIcon");
    if (nativeIcon && nativeIcon.firstElementChild) {
      icon.appendChild(nativeIcon.firstElementChild.cloneNode(true));
      return icon;
    }

    icon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"></circle></svg>';
    return icon;
  }

  function sourceLabel(source, role) {
    if (role === "home") return "Home";
    return String(source.textContent || "").trim() || "Open";
  }

  function navigateToSource(source) {
    var href = source.getAttribute("href") || source.href;
    if (!href) return;

    if (source.getAttribute("target") === "_blank") {
      window.open(source.href || href, "_blank", "noopener,noreferrer");
      return;
    }

    var resolved = new URL(source.href || href, window.location.href);
    if (resolved.origin === window.location.origin && resolved.pathname === window.location.pathname && resolved.hash) {
      if (window.location.hash === resolved.hash) {
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      } else {
        window.location.hash = resolved.hash;
      }
      return;
    }

    window.location.assign(resolved.href);
  }

  function makeDrawerLink(source) {
    var role = classifyAnchor(source);
    var button = document.createElement("button");
    button.type = "button";
    button.className = "abyss-modern-drawer-link";
    button.setAttribute("data-abyss-drawer-role", role);

    var selected = source.classList.contains("MuiButton-colorPrimary") || (role === "home" && isHomeActive());
    button.setAttribute("data-abyss-selected", selected ? "true" : "false");
    button.appendChild(makeIcon(source, role));

    var label = document.createElement("span");
    label.textContent = sourceLabel(source, role);
    button.appendChild(label);

    button.addEventListener("click", function () {
      closeDrawer();
      navigateToSource(source);
    });
    return button;
  }

  function addDrawerSection(drawer, title, sources) {
    if (!sources.length) return;

    var section = document.createElement("div");
    section.className = "abyss-modern-drawer-section";

    var heading = document.createElement("div");
    heading.className = "abyss-modern-drawer-section-title";
    heading.textContent = title;
    section.appendChild(heading);

    sources.forEach(function (source) {
      section.appendChild(makeDrawerLink(source));
    });
    drawer.appendChild(section);
  }

  function ensureDrawer(anchors) {
    var backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = BACKDROP_ID;
      backdrop.setAttribute("aria-hidden", "true");
      backdrop.addEventListener("click", closeDrawer);
      document.body.appendChild(backdrop);
    }

    var drawer = document.getElementById(DRAWER_ID);
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = DRAWER_ID;
      drawer.setAttribute("aria-label", "Navigation menu");
      document.body.appendChild(drawer);
    }

    drawer.textContent = "";

    var homeSource = anchors.find(function (anchor) { return classifyAnchor(anchor) === "home"; });
    var title = document.createElement("div");
    title.className = "abyss-modern-drawer-title";
    title.textContent = homeSource ? String(homeSource.textContent || "Jellyfin").trim() : "Jellyfin";
    drawer.appendChild(title);

    var primary = anchors.filter(function (anchor) {
      var role = classifyAnchor(anchor);
      return role === "home" || role === "favorite" || role === "custom";
    });
    var libraries = anchors.filter(function (anchor) {
      return classifyAnchor(anchor) === "library";
    });

    addDrawerSection(drawer, "Navigation", primary);
    addDrawerSection(drawer, "Libraries", libraries);
  }

  function cleanupDesktopInjection() {
    closeDrawer();
    var buttons = document.querySelectorAll("#reactRoot ." + MENU_CLASS);
    buttons.forEach(function (button) { button.remove(); });
  }

  function syncModernNavigation() {
    safe(function () {
      if (!isDesktop()) {
        cleanupDesktopInjection();
        return;
      }

      var toolbar = getPrimaryToolbar();
      var stack = getNavStack(toolbar);
      if (!toolbar || !stack) return;

      var anchors = markNativeNavigation(toolbar, stack);
      if (!anchors.length) return;

      ensureMenuButton(toolbar);
      ensureDrawer(anchors);
    });
  }

  function scheduleSync() {
    if (syncTimer) window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(function () {
      syncTimer = 0;
      syncModernNavigation();
    }, 80);
  }

  function boot() {
    syncModernNavigation();

    if (typeof MutationObserver === "function" && document.body) {
      var observer = new MutationObserver(scheduleSync);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener("resize", scheduleSync);
    window.addEventListener("hashchange", scheduleSync);
    window.addEventListener("popstate", scheduleSync);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeDrawer();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
