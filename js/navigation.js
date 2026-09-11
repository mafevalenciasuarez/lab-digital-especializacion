/**
 * Stage scaling, scene switching, and directional push transitions.
 * Each scene keeps a world-space cork offset so adjacent panels
 * share one continuous board and the pattern does not snap at rest.
 */
(function () {
  "use strict";

  var STAGE_W = 1920;
  var STAGE_H = 1080;
  var TRANSITION_MS = 620;

  /**
   * Paste the YouTube id when the pitch is published.
   * Leave empty to keep the monitor on standby.
   */
  var YOUTUBE_PITCH_ID = "ZvOCp5Y_RXM";

  var SCENES = [
    { id: "inicio", x: 0, y: 0 },
    { id: "el-reto", x: 1, y: 0 },
    { id: "ideacion", x: 2, y: 0 },
    { id: "prototipo", x: 2, y: 1 },
    { id: "evaluacion", x: 2, y: 2 },
    { id: "recursos", x: 1, y: 2 },
    { id: "video-pitch", x: 0, y: 2 }
  ];

  var stage = document.getElementById("stage");
  var viewport = document.getElementById("viewport");
  var fsBtn = document.getElementById("fs-btn");
  var sceneEls = SCENES.map(function (s) {
    return document.getElementById("scene-" + s.id);
  });
  var prevBtn = document.getElementById("nav-prev");
  var nextBtn = document.getElementById("nav-next");
  var progressEl = document.getElementById("progress-strip");
  var mapNodes = Array.prototype.slice.call(
    document.querySelectorAll(".case-map__node")
  );

  var current = 0;
  var animating = false;
  var boardW = STAGE_W;
  var boardH = STAGE_H;
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement
    );
  }

  function syncFullscreenButton() {
    var on = isFullscreen();
    fsBtn.classList.toggle("is-active", on);
    fsBtn.setAttribute("aria-pressed", on ? "true" : "false");
    fsBtn.setAttribute(
      "aria-label",
      on ? "Salir de pantalla completa" : "Pantalla completa"
    );
    fsBtn.setAttribute(
      "title",
      on ? "Salir de pantalla completa" : "Pantalla completa"
    );
  }

  function toggleFullscreen() {
    if (isFullscreen()) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      return;
    }
    var root = document.documentElement;
    if (root.requestFullscreen) {
      root.requestFullscreen();
    } else if (root.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
    }
  }

  function fitStage() {
    var scale = Math.min(
      window.innerWidth / STAGE_W,
      window.innerHeight / STAGE_H
    );
    boardW = Math.ceil(window.innerWidth / scale);
    boardH = Math.ceil(window.innerHeight / scale);
    if (boardW % 2) boardW += 1;
    if (boardH % 2) boardH += 1;
    document.documentElement.style.setProperty("--board-w", boardW + "px");
    document.documentElement.style.setProperty("--board-h", boardH + "px");
    stage.style.width = boardW + "px";
    stage.style.height = boardH + "px";
    stage.style.transform =
      "translate(-50%, -50%) scale(" + scale + ")";
    applyAllCorkPositions();
  }

  function corkPositionFor(index) {
    var scene = SCENES[index];
    return {
      x: -scene.x * boardW,
      y: -scene.y * boardH
    };
  }

  function applyCorkPosition(el, index) {
    if (!el) return;
    var pos = corkPositionFor(index);
    el.style.backgroundPosition = pos.x + "px " + pos.y + "px";
  }

  function applyAllCorkPositions() {
    sceneEls.forEach(function (el, i) {
      applyCorkPosition(el, i);
    });
  }

  function directionBetween(fromIndex, toIndex) {
    var a = SCENES[fromIndex];
    var b = SCENES[toIndex];
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return { dx: 1, dy: 0 };
    }
    if (Math.abs(dx) >= Math.abs(dy)) {
      return { dx: dx > 0 ? 1 : -1, dy: 0 };
    }
    return { dx: 0, dy: dy > 0 ? 1 : -1 };
  }

  function labelFor(id) {
    var labels = {
      inicio: "Inicio",
      "el-reto": "El reto",
      ideacion: "Ideación",
      prototipo: "Prototipo",
      evaluacion: "Evaluación",
      recursos: "Recursos",
      "video-pitch": "Video pitch"
    };
    return labels[id] || id;
  }

  function updateChrome() {
    var scene = SCENES[current];
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === SCENES.length - 1;
    progressEl.textContent =
      "Pista " +
      (current + 1) +
      " de " +
      SCENES.length +
      "  ·  " +
      labelFor(scene.id);

    mapNodes.forEach(function (node) {
      var active = node.getAttribute("data-scene") === scene.id;
      node.classList.toggle("is-current", active);
      if (active) {
        node.setAttribute("aria-current", "true");
      } else {
        node.removeAttribute("aria-current");
      }
    });

    sceneEls.forEach(function (el, i) {
      if (!el) return;
      el.setAttribute("aria-hidden", i === current ? "false" : "true");
    });

    if (history.replaceState) {
      history.replaceState(null, "", "#" + scene.id);
    }
  }

  function clearTransition(el) {
    if (!el) return;
    el.classList.remove("is-animating", "is-enter", "is-exit");
    el.style.transition = "";
    el.style.transform = "";
  }

  function goTo(index) {
    if (index < 0 || index >= SCENES.length) return;
    if (index === current || animating) return;
    if (!sceneEls[index]) return;

    var from = current;
    var dir = directionBetween(from, index);
    var outgoing = sceneEls[from];
    var incoming = sceneEls[index];
    var dx = dir.dx * boardW;
    var dy = dir.dy * boardH;
    var duration = reduceMotion ? 1 : TRANSITION_MS;

    animating = true;
    current = index;
    updateChrome();

    incoming.classList.add("is-enter");
    outgoing.classList.add("is-exit");
    incoming.style.transition = "none";
    outgoing.style.transition = "none";
    incoming.style.transform = "translate(" + dx + "px, " + dy + "px)";
    applyCorkPosition(outgoing, from);
    applyCorkPosition(incoming, index);

    incoming.offsetHeight;

    incoming.classList.add("is-animating");
    outgoing.classList.add("is-animating");
    incoming.style.transition =
      "transform " + duration + "ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    outgoing.style.transition =
      "transform " + duration + "ms cubic-bezier(0.22, 0.61, 0.36, 1)";
    incoming.style.transform = "translate(0, 0)";
    outgoing.style.transform =
      "translate(" + -dx + "px, " + -dy + "px)";

    window.setTimeout(function () {
      outgoing.classList.remove("is-active");
      incoming.classList.add("is-active");
      clearTransition(outgoing);
      clearTransition(incoming);
      applyCorkPosition(outgoing, from);
      applyCorkPosition(incoming, index);
      animating = false;
    }, duration + 30);
  }

  function indexFromHash() {
    var hash = (location.hash || "").replace("#", "");
    var i = SCENES.findIndex(function (s) {
      return s.id === hash;
    });
    return i >= 0 ? i : 0;
  }

  function markMissingPhotos() {
    document.querySelectorAll(".photo-slot img").forEach(function (img) {
      var slot = img.closest(".photo-slot");
      function miss() {
        if (slot) slot.classList.add("is-missing");
      }
      img.addEventListener("error", miss);
      if (img.complete && img.naturalWidth === 0) miss();
    });
  }

  function mountPitchVideo() {
    var screen = document.getElementById("pitch-screen");
    if (!screen) return;
    var id = (
      YOUTUBE_PITCH_ID ||
      screen.getAttribute("data-youtube-id") ||
      ""
    ).trim();
    if (!id || id === "VIDEO_ID") return;
    var iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube.com/embed/" +
      encodeURIComponent(id) +
      "?rel=0&modestbranding=1";
    iframe.title = "Video pitch del laboratorio Detectives de Historias";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    screen.innerHTML = "";
    screen.appendChild(iframe);
    var scan = document.createElement("div");
    scan.className = "monitor__scan";
    scan.setAttribute("aria-hidden", "true");
    screen.appendChild(scan);
  }

  prevBtn.addEventListener("click", function () {
    goTo(current - 1);
  });
  nextBtn.addEventListener("click", function () {
    goTo(current + 1);
  });

  mapNodes.forEach(function (node) {
    node.addEventListener("click", function () {
      var id = node.getAttribute("data-scene");
      var i = SCENES.findIndex(function (s) {
        return s.id === id;
      });
      goTo(i);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.defaultPrevented) return;
    var tag = (event.target && event.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "IFRAME") return;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      goTo(current + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      goTo(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(SCENES.length - 1);
    }
  });

  window.addEventListener("hashchange", function () {
    goTo(indexFromHash());
  });

  fsBtn.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", function () {
    syncFullscreenButton();
    fitStage();
  });
  document.addEventListener("webkitfullscreenchange", function () {
    syncFullscreenButton();
    fitStage();
  });

  var lastOuterW = window.outerWidth;
  var lastOuterH = window.outerHeight;
  var lastDpr = window.devicePixelRatio;

  window.addEventListener("resize", function () {
    var dprChanged = window.devicePixelRatio !== lastDpr;
    var outerChanged =
      window.outerWidth !== lastOuterW || window.outerHeight !== lastOuterH;
    lastOuterW = window.outerWidth;
    lastOuterH = window.outerHeight;
    lastDpr = window.devicePixelRatio;
    if (dprChanged && !outerChanged) return;
    fitStage();
  });

  window.addEventListener(
    "wheel",
    function (event) {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
    },
    { passive: false }
  );

  fitStage();
  syncFullscreenButton();
  markMissingPhotos();
  mountPitchVideo();

  current = indexFromHash();
  sceneEls.forEach(function (el, i) {
    if (!el) return;
    el.classList.toggle("is-active", i === current);
  });
  updateChrome();
})();
