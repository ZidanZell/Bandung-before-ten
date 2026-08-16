/* =========================================================
   BANDUNG, BEFORE TEN
   Vanilla JS. No framework, no backend, no API key.
   ========================================================= */

/* =========================================================
   ==========================================
   EDIT YOUR EVENT LOCATIONS HERE
   ==========================================

   Everything you normally need to change lives in this one
   block. You never have to touch the Leaflet code below it.

   For each location:
     name          -> the label shown in the popup
     time          -> the time shown above the name
     label         -> the short description under the name
     lat           -> latitude   (always FIRST, always negative in Bandung)
     lng           -> longitude  (always SECOND)
     type          -> "pickup" | "food" | "coffee" | "night" | "home"
                      (controls the marker colour only)
     googleMapsUrl -> optional. Set to null to hide the button.

   How to get lat/lng: see README.md → "How to get coordinates".
   ========================================================= */

const locations = {

  // 15:45 — where the evening starts.
  // Plus code 4M23+QV Pasirlayung, Bandung
  pickup: {
    name: "Pickup Point",
    time: "15:45",
    label: "Pick Up",
    type: "pickup",
    lat: -6.898063,
    lng: 107.654688,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-6.898063,107.654688"
  },

  // 16:45 — dinner.
  // Plus code 4JC6+2R Dago, Bandung
  wco: {
    name: "W.Co",
    time: "16:45",
    label: "Dinner",
    type: "food",
    lat: -6.879938,
    lng: 107.612063,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-6.879938,107.612063"
  },

  // 17:45 — the long one.
  // Plus code 4JFF+C8 Cigadung, Bandung
  saraga: {
    name: "Saraga",
    time: "17:45",
    label: "Leisure Session",
    type: "coffee",
    lat: -6.876438,
    lng: 107.623313,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-6.876438,107.623313"
  },

  // 22:00 — home. Same place as the pickup by default.
  dropoff: {
    name: "Drop Off",
    time: "22:00",
    label: "Home",
    type: "home",
    lat: -6.898063,
    lng: 107.654688,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=-6.898063,107.654688"
  }

};

/* ---------------------------------------------------------
   Order of the solid route line.
   Add or remove keys from `locations` here — the line and the
   fitBounds update themselves automatically.
   --------------------------------------------------------- */
const routeOrder = ["pickup", "wco", "saraga"];

/* ---------------------------------------------------------
   NIGHT RIDE — the loose, dashed part of the evening.
   Runs from the last stop of routeOrder, through these
   waypoints, and ends at `nightRide.endsAt`.
   Add or delete waypoints freely.
   --------------------------------------------------------- */
const nightRide = {
  enabled: true,
  name: "Bandung Night Ride",
  time: "21:00",
  label: "Night Ride",
  endsAt: "dropoff",           // key from `locations`
  markerAt: 2,                 // which waypoint holds the popup marker (0-based)
  waypoints: [
    { name: "Dago",        lat: -6.892500, lng: 107.613500 },
    { name: "Riau",        lat: -6.904600, lng: 107.622000 },
    { name: "Braga",       lat: -6.917500, lng: 107.609000 },
    { name: "Asia Afrika", lat: -6.921800, lng: 107.607000 }
  ]
};

/* ---------------------------------------------------------
   MAP CONFIGURATION
   --------------------------------------------------------- */
const mapConfig = {
  defaultCenter: [-6.8955, 107.6280],  // [latitude, longitude]
  defaultZoom: 13,
  minZoom: 11,
  maxZoom: 18,
  routeColor: "#B0632B",       // solid line (the planned part)
  nightRideColor: "#8A6A3F",   // dashed line (the improvised part)
  nightRideStyle: "dashed",    // "dashed" or "solid"
  fitPadding: 46,              // px of breathing room around fitBounds
  tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

/* =========================================================
   ---------------------------------------------------------
   APPLICATION LOGIC — you shouldn't need to edit below here
   ---------------------------------------------------------
   ========================================================= */

(function () {
  "use strict";

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  /* ------------------------------------------------------
     1. Scroll progress indicator
     ------------------------------------------------------ */
  (function scrollProgress() {
    const bar = $("#progressBar");
    if (!bar) return;
    let ticking = false;

    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, pct)) + "%";
      ticking = false;
    }
    on(window, "scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    on(window, "resize", update);
    update();
  })();

  /* ------------------------------------------------------
     2. Smooth scrolling (JS fallback for older Safari)
     ------------------------------------------------------ */
  $$("a[data-scroll]").forEach(function (link) {
    on(link, "click", function (e) {
      const target = document.querySelector(link.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
    });
  });

  /* ------------------------------------------------------
     3. Scroll reveal + timeline animation
     ------------------------------------------------------ */
  (function scrollReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(el => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // Stagger siblings inside the same list/grid for a soft cascade
        const siblings = el.parentElement ? $$(".reveal", el.parentElement) : [];
        const i = siblings.indexOf(el);
        el.style.transitionDelay = (i > 0 ? Math.min(i, 8) * 70 : 0) + "ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.12 });

    items.forEach(el => io.observe(el));
  })();

  /* ------------------------------------------------------
     4. Hero parallax + cursor glow
     ------------------------------------------------------ */
  (function heroMotion() {
    const glow = $("#heroGlow");
    if (!glow || prefersReducedMotion) return;
    let ticking = false;

    function move() {
      const y = window.scrollY;
      if (y < window.innerHeight * 1.2) {
        glow.style.transform = "translate3d(0," + (y * 0.22) + "px,0)";
      }
      ticking = false;
    }
    on(window, "scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(move); }
    }, { passive: true });
  })();

  (function cursorGlow() {
    const dot = $("#cursorGlow");
    if (!dot || prefersReducedMotion) return;
    if (!window.matchMedia("(hover:hover) and (pointer:fine)").matches) return;

    let x = 0, y = 0, ticking = false;
    function draw() {
      dot.style.transform = "translate3d(" + x + "px," + y + "px,0)";
      ticking = false;
    }
    on(window, "mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      dot.classList.add("is-on");
      if (!ticking) { ticking = true; window.requestAnimationFrame(draw); }
    }, { passive: true });
    on(document, "mouseleave", () => dot.classList.remove("is-on"));
  })();

  /* ------------------------------------------------------
     5. Rundown cards — tap/click to expand
     ------------------------------------------------------ */
  $$(".card__head").forEach(function (head) {
    on(head, "click", function () {
      const card = head.closest(".card");
      const open = card.classList.toggle("is-open");
      head.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ------------------------------------------------------
     6. Contingency cards — tap to un-blur
     ------------------------------------------------------ */
  $$(".flip").forEach(function (flip) {
    on(flip, "click", function () {
      const open = flip.getAttribute("aria-expanded") !== "true";
      flip.setAttribute("aria-expanded", open ? "true" : "false");
      flip.classList.toggle("is-shown", open);
    });
  });

  /* ------------------------------------------------------
     7. Decorative stars in the night section
     ------------------------------------------------------ */
  (function makeStars() {
    const host = $("#stars");
    if (!host || prefersReducedMotion) return;
    const count = window.innerWidth < 600 ? 26 : 44;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "star";
      s.style.left = (Math.random() * 100).toFixed(2) + "%";
      s.style.top = (Math.random() * 62).toFixed(2) + "%";
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
      s.style.opacity = (0.2 + Math.random() * 0.5).toFixed(2);
      frag.appendChild(s);
    }
    host.appendChild(frag);
  })();

  /* ------------------------------------------------------
     8. "I'm In" modal + minimal confetti
     ------------------------------------------------------ */
  (function closingActions() {
    const modal = $("#modal");
    const box = $(".modal__box", modal);
    const btnIn = $("#btnIn");
    const btnMaybe = $("#btnMaybe");
    const msg = $("#maybeMsg");
    let lastFocus = null;

    function openModal() {
      lastFocus = document.activeElement;
      modal.hidden = false;
      box.focus();
      confetti();
    }
    function closeModal() {
      modal.hidden = true;
      if (lastFocus) lastFocus.focus();
    }

    on(btnIn, "click", openModal);
    $$("[data-close]", modal).forEach(el => on(el, "click", closeModal));
    on(document, "keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });

    // Keep tabbing inside the dialog while it is open
    on(modal, "keydown", function (e) {
      if (e.key !== "Tab") return;
      const focusables = $$("button, [href], [tabindex]:not([tabindex='-1'])", modal);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // EDIT: playful replies for the "Maybe…" button
    const maybeLines = [
      "Hmm. This button is suspiciously vague.",
      "Noted. Filed under: pending.",
      "\u201cMaybe\u201d has been recorded as a soft yes."
    ];
    let maybeCount = 0;
    on(btnMaybe, "click", function () {
      msg.textContent = maybeLines[Math.min(maybeCount, maybeLines.length - 1)];
      msg.classList.add("is-on");
      maybeCount++;
    });

    function confetti() {
      if (prefersReducedMotion) return;
      const host = $("#confetti");
      if (!host) return;
      const colors = ["#B0632B", "#DFA45B", "#6B5847", "#F2EDE4"];
      const frag = document.createDocumentFragment();
      for (let i = 0; i < 26; i++) {
        const p = document.createElement("span");
        p.style.left = (Math.random() * 100).toFixed(2) + "vw";
        p.style.background = colors[i % colors.length];
        p.style.animationDuration = (2.2 + Math.random() * 1.6).toFixed(2) + "s";
        p.style.animationDelay = (Math.random() * 0.35).toFixed(2) + "s";
        p.style.opacity = (0.6 + Math.random() * 0.4).toFixed(2);
        frag.appendChild(p);
      }
      host.appendChild(frag);
      window.setTimeout(function () { host.innerHTML = ""; }, 4600);
    }
  })();

  /* ------------------------------------------------------
     9. THE ROUTE — Leaflet map
        Built entirely from the config block at the top.
     ------------------------------------------------------ */
  (function routeMap() {
    const host = $("#map");
    if (!host || typeof L === "undefined") return;

    const map = L.map(host, {
      center: mapConfig.defaultCenter,
      zoom: mapConfig.defaultZoom,
      minZoom: mapConfig.minZoom,
      maxZoom: mapConfig.maxZoom,
      zoomControl: true,
      zoomSnap: 0.1,            // fractional zoom, so "View Route" fills the frame
      zoomDelta: 0.5,
      scrollWheelZoom: false,   // unlocked by the shield below
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      attributionControl: true
    });

    L.tileLayer(mapConfig.tileUrl, {
      maxZoom: mapConfig.maxZoom,
      attribution: mapConfig.tileAttribution
    }).addTo(map);

    // --- marker icon, styled by `type` -------------------
    function icon(type) {
      return L.divIcon({
        className: "",
        html: '<div class="pin pin--' + type + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
        popupAnchor: [0, -12]
      });
    }

    // --- popup markup ------------------------------------
    function popupHtml(loc) {
      let html = "";
      if (loc.time) html += '<span class="pop__time">' + loc.time + "</span>";
      html += '<p class="pop__name">' + loc.name + "</p>";
      if (loc.label) html += '<p class="pop__label">' + loc.label + "</p>";
      if (loc.googleMapsUrl) {
        html += '<a class="pop__link" href="' + loc.googleMapsUrl +
                '" target="_blank" rel="noopener">Open in Google Maps \u2197</a>';
      }
      return html;
    }

    const allPoints = [];
    const placed = [];   // markers already on the map, for de-duplication

    // Pickup and drop-off are often the same address. When that happens we
    // draw ONE marker and merge the two popups instead of stacking them.
    function addStop(loc) {
      const same = placed.find(function (m) {
        return Math.abs(m.lat - loc.lat) < 1e-6 && Math.abs(m.lng - loc.lng) < 1e-6;
      });
      if (same) {
        same.marker.setPopupContent(same.html + '<hr class="pop__rule">' + popupHtml(loc));
        same.html = same.html + '<hr class="pop__rule">' + popupHtml(loc);
        same.marker.setIcon(icon("home"));
        return;
      }
      const html = popupHtml(loc);
      const marker = L.marker([loc.lat, loc.lng], {
        icon: icon(loc.type || "pickup"),
        title: loc.name
      }).addTo(map).bindPopup(html, { maxWidth: 240, minWidth: 180 });
      placed.push({ lat: loc.lat, lng: loc.lng, marker: marker, html: html });
    }

    // --- solid route: markers + line ---------------------
    const routeLatLngs = [];
    routeOrder.forEach(function (key) {
      const loc = locations[key];
      if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") return;
      const ll = [loc.lat, loc.lng];
      routeLatLngs.push(ll);
      allPoints.push(ll);
      addStop(loc);
    });

    if (routeLatLngs.length > 1) {
      L.polyline(routeLatLngs, {
        color: mapConfig.routeColor,
        weight: 3,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);
    }

    // --- dashed night ride -------------------------------
    if (nightRide.enabled) {
      const start = routeLatLngs[routeLatLngs.length - 1];
      const end = locations[nightRide.endsAt];
      const nightLatLngs = [];

      if (start) nightLatLngs.push(start);
      nightRide.waypoints.forEach(function (wp) {
        const ll = [wp.lat, wp.lng];
        nightLatLngs.push(ll);
        allPoints.push(ll);
      });
      if (end) {
        const ll = [end.lat, end.lng];
        nightLatLngs.push(ll);
        allPoints.push(ll);
      }

      if (nightLatLngs.length > 1) {
        L.polyline(nightLatLngs, {
          color: mapConfig.nightRideColor,
          weight: 2.5,
          opacity: 0.8,
          dashArray: mapConfig.nightRideStyle === "dashed" ? "3 9" : null,
          lineCap: "round"
        }).addTo(map);
      }

      // one marker to represent the whole loose night route
      const anchor = nightRide.waypoints[nightRide.markerAt] || nightRide.waypoints[0];
      if (anchor) {
        L.marker([anchor.lat, anchor.lng], { icon: icon("night"), title: nightRide.name })
          .addTo(map)
          .bindPopup(popupHtml({
            name: nightRide.name,
            time: nightRide.time,
            label: nightRide.label,
            googleMapsUrl: null
          }), { maxWidth: 240, minWidth: 180 });
      }

      // drop-off marker last, so it sits on top
      if (end) addStop(end);
    }

    // --- controls ----------------------------------------
    function fitRoute() {
      if (!allPoints.length) return;
      map.fitBounds(L.latLngBounds(allPoints), {
        padding: [mapConfig.fitPadding, mapConfig.fitPadding],
        animate: !prefersReducedMotion
      });
    }
    on($("#btnViewRoute"), "click", fitRoute);
    on($("#btnCenterMap"), "click", function () {
      map.setView(mapConfig.defaultCenter, mapConfig.defaultZoom, {
        animate: !prefersReducedMotion
      });
    });

    // --- tap-to-activate shield (mobile scroll safety) ---
    const shield = $("#mapShield");
    const lockBtn = $("#btnLockMap");

    function unlock() {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      shield.classList.add("is-hidden");
      if (lockBtn) lockBtn.hidden = false;
    }
    function lock() {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      shield.classList.remove("is-hidden");
      if (lockBtn) lockBtn.hidden = true;
    }
    on(shield, "click", unlock);
    on(lockBtn, "click", lock);

    // Leaflet needs a nudge once the section is actually laid out on screen
    function settle() {
      map.invalidateSize();
      window.requestAnimationFrame(fitRoute);
    }
    if ("IntersectionObserver" in window) {
      const mio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          settle();
          mio.disconnect();
        });
      }, { threshold: 0.15 });
      mio.observe(host);
    }
    window.setTimeout(settle, 400);
    on(window, "resize", function () { map.invalidateSize(); });
  })();

})();
