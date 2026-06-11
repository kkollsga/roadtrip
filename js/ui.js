// ui.js — compact burger-menu control for Roadtrip.
// Last script loaded; window.App / window.Cars / window.Weather / window.DayCycle exist.
// Exposes window.UI. No modules, no build step.
(function () {
  'use strict';

  var STORAGE_KEY = 'roadtrip-v1';
  var AUTO_HIDE_MS = 3500;

  var UI = {};
  window.UI = UI;

  // ---- small safe helpers -------------------------------------------------

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function cap(s) {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function fmtTime(totalSeconds) {
    var s = Math.max(0, Math.floor(totalSeconds || 0));
    var m = Math.floor(s / 60);
    var sec = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function isTyping(e) {
    var t = e && e.target;
    if (!t) return false;
    var tag = (t.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'select' || tag === 'textarea' || t.isContentEditable;
  }

  // safe accessors against possibly-missing globals
  function App() { return window.App || null; }
  function Cars() { return window.Cars || null; }
  function Weather() { return window.Weather || null; }
  function DC() { return window.DayCycle || null; }

  // ---- persistence --------------------------------------------------------

  var saveTimer = null;

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      var app = App();
      if (!app) return;
      var data = {
        carIndex: app.carIndex,
        latitude: app.latitude,
        loopMinutes: dom.dayLen ? Number(dom.dayLen.value) : (DC() ? DC().loopMinutes : 15),
        sessionMinutes: dom.sessionInput ? Number(dom.sessionInput.value) : 50
      };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) { /* unavailable on some file:// contexts */ }
    }, 300);
  }

  function applyState(s) {
    if (!s) return;
    var app = App();
    if (!app) return;
    try {
      if (typeof s.carIndex === 'number' && typeof app.setCar === 'function') app.setCar(s.carIndex);
      if (typeof s.latitude === 'number' && typeof app.setLatitude === 'function') app.setLatitude(s.latitude);
      if (typeof s.loopMinutes === 'number' && typeof app.setDayLoopMinutes === 'function') app.setDayLoopMinutes(s.loopMinutes);
    } catch (e) { /* ignore */ }
  }

  // ---- DOM refs -----------------------------------------------------------

  var dom = {
    root: null,
    burger: null,
    panel: null,
    carName: null,
    lat: null,
    dayLenRow: null,
    dayLen: null,
    sessionRow: null,
    sessionInput: null,
    sessionStartBtn: null,
    countdownRow: null,
    countdownLabel: null,
    sessionStopBtn: null,
    pauseBtn: null,
    chip: null,
    toast: null
  };

  var hiddenByUser = false; // 'h' toggle: permanent-hidden override
  var panelOpen = false;
  var hideTimer = null;
  var countdownTimer = null;

  // ---- build --------------------------------------------------------------

  function field(labelText, control) {
    var wrap = el('div', 'du-field');
    wrap.appendChild(el('div', 'du-label', labelText));
    wrap.appendChild(control);
    return wrap;
  }

  function build() {
    var root = el('div');
    root.id = 'drive-ui';
    dom.root = root;

    // ---- burger button (upper-right) ----
    var burger = el('button', 'du-burger', '☰');
    burger.type = 'button';
    burger.title = 'Menu';
    dom.burger = burger;
    burger.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePanel();
    });
    root.appendChild(burger);

    // ---- panel ----
    var panel = el('div', 'du-panel');
    dom.panel = panel;
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    // 1. Car prev/name/next
    var carRow = el('div', 'du-car-row');
    var carPrev = el('button', 'du-arrow', '‹');
    carPrev.type = 'button';
    carPrev.title = 'Previous car';
    var carName = el('span', 'du-car-name', '');
    dom.carName = carName;
    var carNext = el('button', 'du-arrow', '›');
    carNext.type = 'button';
    carNext.title = 'Next car';
    carPrev.addEventListener('click', function () { cycleCar(-1); });
    carNext.addEventListener('click', function () { cycleCar(1); });
    carRow.appendChild(carPrev);
    carRow.appendChild(carName);
    carRow.appendChild(carNext);
    panel.appendChild(field('Car', carRow));

    // Biomes are deliberately NOT configurable: the road wanders through them
    // on its own (tied to date & time), keeping the sense of discovery alive.

    // Weather and speed are deliberately NOT configurable: both wander
    // on their own, like a real road trip.

    // 2. Latitude: how far north the winter drive is. At the far end the
    // sun never clears the horizon and midday is blue hour.
    var lat = el('input', 'du-range');
    lat.type = 'range';
    lat.min = '0';
    lat.max = '1';
    lat.step = '0.05';
    lat.value = '0';
    lat.title = 'How far north (winter daylight)';
    dom.lat = lat;
    lat.addEventListener('input', function () {
      var app = App();
      if (app && typeof app.setLatitude === 'function') app.setLatitude(Number(lat.value));
      saveState();
    });
    panel.appendChild(field('Winter latitude', lat));

    // 5. Day length (hidden during session)
    var dayLen = el('input', 'du-num');
    dayLen.type = 'number';
    dayLen.min = '3';
    dayLen.max = '120';
    dayLen.step = '1';
    dayLen.value = '15';
    dayLen.title = 'Day length (minutes)';
    dom.dayLen = dayLen;
    dayLen.addEventListener('change', function () {
      var v = Math.max(3, Math.min(120, Number(dayLen.value) || 15));
      dayLen.value = v;
      var app = App();
      if (app && typeof app.setDayLoopMinutes === 'function') app.setDayLoopMinutes(v);
      saveState();
    });
    var dayLenRow = field('Day length (min)', dayLen);
    dom.dayLenRow = dayLenRow;
    panel.appendChild(dayLenRow);

    // 6a. Session start (minutes + Start)
    var sessionRow = el('div', 'du-field');
    dom.sessionRow = sessionRow;
    sessionRow.appendChild(el('div', 'du-label', 'Session (min)'));
    var sessInline = el('div', 'du-inline');
    var sessionInput = el('input', 'du-num du-num-grow');
    sessionInput.type = 'number';
    sessionInput.min = '5';
    sessionInput.max = '240';
    sessionInput.step = '1';
    sessionInput.value = '50';
    sessionInput.title = 'Session length (minutes)';
    dom.sessionInput = sessionInput;
    sessionInput.addEventListener('change', saveState);
    var startBtn = el('button', 'du-btn', 'Start');
    startBtn.type = 'button';
    dom.sessionStartBtn = startBtn;
    startBtn.addEventListener('click', function () {
      var n = Math.max(5, Math.min(240, Number(sessionInput.value) || 50));
      var app = App();
      if (app && typeof app.startSession === 'function') app.startSession(n);
      refreshSessionUI();
    });
    sessInline.appendChild(sessionInput);
    sessInline.appendChild(startBtn);
    sessionRow.appendChild(sessInline);
    panel.appendChild(sessionRow);

    // 6b. Session running (countdown + Stop)
    var countdownRow = el('div', 'du-field');
    countdownRow.style.display = 'none';
    dom.countdownRow = countdownRow;
    countdownRow.appendChild(el('div', 'du-label', 'Session'));
    var cdInline = el('div', 'du-inline');
    var cLabel = el('span', 'du-count-label', '00:00');
    dom.countdownLabel = cLabel;
    var stopBtn = el('button', 'du-btn', 'Stop');
    stopBtn.type = 'button';
    dom.sessionStopBtn = stopBtn;
    stopBtn.addEventListener('click', function () {
      var app = App();
      if (app && typeof app.stopSession === 'function') app.stopSession();
      refreshSessionUI();
    });
    cdInline.appendChild(cLabel);
    cdInline.appendChild(stopBtn);
    countdownRow.appendChild(cdInline);
    panel.appendChild(countdownRow);

    // 7. pause/play + fullscreen icon row
    var sysRow = el('div', 'du-sys-row');
    var pauseBtn = el('button', 'du-btn du-icon', '⏸');
    pauseBtn.type = 'button';
    pauseBtn.title = 'Pause / play';
    dom.pauseBtn = pauseBtn;
    pauseBtn.addEventListener('click', function () {
      var app = App();
      if (app && typeof app.togglePause === 'function') app.togglePause();
      refreshPauseIcon();
    });
    var fsBtn = el('button', 'du-btn du-icon', '⛶');
    fsBtn.type = 'button';
    fsBtn.title = 'Fullscreen';
    fsBtn.addEventListener('click', toggleFullscreen);
    sysRow.appendChild(pauseBtn);
    sysRow.appendChild(fsBtn);
    panel.appendChild(sysRow);

    root.appendChild(panel);

    // standalone low-opacity countdown chip, top-left
    var chip = el('div', 'du-chip', '');
    chip.style.display = 'none';
    dom.chip = chip;
    root.appendChild(chip);

    // session-complete toast
    var toast = el('div', 'du-toast', '✦ session complete ✦');
    dom.toast = toast;
    root.appendChild(toast);

    document.body.appendChild(root);
  }

  // ---- actions ------------------------------------------------------------

  function cycleCar(dir) {
    var app = App();
    var cars = Cars();
    if (!app || !cars || !cars.LIST || !cars.LIST.length) return;
    var n = cars.LIST.length;
    var idx = ((app.carIndex + dir) % n + n) % n;
    if (typeof app.setCar === 'function') app.setCar(idx);
    refreshCarName();
    saveState();
  }

  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen();
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } catch (e) { /* ignore */ }
  }

  // ---- panel open/close ---------------------------------------------------

  function openPanel() {
    if (hiddenByUser) return;
    panelOpen = true;
    if (dom.panel) dom.panel.classList.add('du-open');
    if (dom.burger) dom.burger.classList.add('du-active');
    // panel open => always visible, never hide cursor
    showBurger();
    document.body.classList.remove('hide-cursor');
  }

  function closePanel() {
    panelOpen = false;
    if (dom.panel) dom.panel.classList.remove('du-open');
    if (dom.burger) dom.burger.classList.remove('du-active');
    bumpActivity();
  }

  function togglePanel() {
    if (panelOpen) closePanel();
    else openPanel();
  }

  // ---- state reflection ---------------------------------------------------

  function refreshCarName() {
    var app = App();
    var cars = Cars();
    if (!app || !cars || !cars.LIST) return;
    var entry = cars.LIST[app.carIndex];
    if (entry && dom.carName) dom.carName.textContent = entry.name || ('Car ' + app.carIndex);
  }

  function refreshPauseIcon() {
    var app = App();
    if (!app || !dom.pauseBtn) return;
    dom.pauseBtn.textContent = app.paused ? '▶' : '⏸';
  }

  function syncControls() {
    var app = App();
    if (!app) return;
    var dc = DC();
    if (dom.dayLen && dc) dom.dayLen.value = dc.loopMinutes;
    if (dom.lat && typeof app.latitude === 'number') dom.lat.value = app.latitude;
    refreshCarName();
    refreshPauseIcon();
  }

  function sessionActive() {
    var dc = DC();
    return !!(dc && dc.mode === 'session');
  }

  function refreshSessionUI() {
    var active = sessionActive();
    if (dom.sessionRow) dom.sessionRow.style.display = active ? 'none' : '';
    if (dom.dayLenRow) dom.dayLenRow.style.display = active ? 'none' : '';
    if (dom.countdownRow) dom.countdownRow.style.display = active ? '' : 'none';
    if (dom.chip) dom.chip.style.display = active ? '' : 'none';

    if (active) {
      if (!countdownTimer) {
        countdownTimer = setInterval(updateCountdown, 1000);
      }
      updateCountdown();
    } else if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function updateCountdown() {
    var dc = DC();
    if (!dc) return;
    if (dc.mode !== 'session') {
      refreshSessionUI();
      return;
    }
    var txt = fmtTime(dc.sessionRemaining);
    if (dom.countdownLabel) dom.countdownLabel.textContent = txt;
    if (dom.chip) dom.chip.textContent = txt;
  }

  // ---- toast --------------------------------------------------------------

  function showToast() {
    if (!dom.toast) return;
    var t = dom.toast;
    t.classList.add('show');
    setTimeout(function () {
      t.classList.remove('show');
    }, 8000); // 2s fade-in + 6s hold; CSS transition handles 2s fade-out
  }

  // ---- auto hide ----------------------------------------------------------

  function showBurger() {
    if (hiddenByUser) return;
    if (dom.burger) dom.burger.classList.remove('du-hidden');
    document.body.classList.remove('hide-cursor');
  }

  function hideBurger() {
    if (dom.burger) dom.burger.classList.add('du-hidden');
    document.body.classList.add('hide-cursor');
  }

  function bumpActivity() {
    if (hiddenByUser) return;
    showBurger();
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      // Never auto-hide while the panel is open.
      if (!hiddenByUser && !panelOpen) hideBurger();
    }, AUTO_HIDE_MS);
  }

  function toggleUserHidden() {
    hiddenByUser = !hiddenByUser;
    if (hiddenByUser) {
      closePanel();
      hideBurger();
    } else {
      showBurger();
      bumpActivity();
    }
  }

  // ---- keyboard -----------------------------------------------------------

  function onKey(e) {
    if (isTyping(e)) return;
    var app = App();
    var key = e.key;
    if (key === 'Escape' || key === 'Esc') {
      if (panelOpen) {
        closePanel();
        e.preventDefault();
      }
      return;
    }
    if (key === ' ' || key === 'Spacebar') {
      if (app && typeof app.togglePause === 'function') app.togglePause();
      refreshPauseIcon();
      e.preventDefault();
    } else if (key === 'f' || key === 'F') {
      toggleFullscreen();
    } else if (key === 'c' || key === 'C') {
      cycleCar(1);
    } else if (key === 'h' || key === 'H') {
      toggleUserHidden();
    }
  }

  // ---- outside-click ------------------------------------------------------

  function onDocClick(e) {
    if (!panelOpen) return;
    var t = e.target;
    if (dom.panel && dom.panel.contains(t)) return;
    if (dom.burger && dom.burger.contains(t)) return;
    closePanel();
  }

  // ---- boot ---------------------------------------------------------------

  function boot() {
    if (!App()) {
      // Nothing to control; bail quietly.
      return;
    }

    build();

    // apply persisted state through App setters, then reflect into controls
    applyState(loadState());
    // session minutes field is persisted but not applied to App (no live session restore)
    var saved = loadState();
    if (saved && typeof saved.sessionMinutes === 'number' && dom.sessionInput) {
      dom.sessionInput.value = saved.sessionMinutes;
    }

    syncControls();
    refreshSessionUI();

    // session-end toast
    var dc = DC();
    if (dc) {
      dc.onSessionEnd = function () {
        showToast();
        refreshSessionUI();
      };
    }

    // activity listeners for auto-hide
    window.addEventListener('mousemove', bumpActivity, { passive: true });
    window.addEventListener('touchstart', bumpActivity, { passive: true });
    window.addEventListener('touchmove', bumpActivity, { passive: true });
    window.addEventListener('keydown', bumpActivity, { passive: true });
    window.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);

    // light polling to keep icons/labels in sync with external changes
    setInterval(function () {
      refreshPauseIcon();
      refreshCarName();
      refreshSessionUI();
    }, 1000);

    bumpActivity();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  UI.show = showBurger;
  UI.hide = hideBurger;
  UI.openPanel = openPanel;
  UI.closePanel = closePanel;
})();
