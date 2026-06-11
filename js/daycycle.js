// daycycle.js — day/night phase driver for Roadtrip.
// Exposes window.DayCycle. No modules, no build step.
(function () {
  'use strict';

  // Session timeline runs dawn (0.045) -> stars-out (0.93).
  var SESSION_START = 0.045;
  var SESSION_END = 0.93;
  // After the session ends, t keeps drifting toward this value over AFTERGLOW_SECONDS.
  var AFTERGLOW_TARGET = 0.999;
  var AFTERGLOW_SECONDS = 20 * 60; // ~20 minutes of deepening night.

  function clamp01(v) {
    return v < 0 ? 0 : (v > 1 ? 1 : v);
  }

  var DayCycle = {
    t: 0.07, // just before sunrise
    mode: 'loop',
    loopMinutes: 15,
    sessionRemaining: null,
    sessionTotal: null,
    onSessionEnd: null,

    // internal session state
    _sessionElapsed: 0,
    _sessionFired: false,
    _afterglowElapsed: 0,

    setLoop: function (minutes) {
      this.mode = 'loop';
      if (typeof minutes === 'number' && minutes > 0) {
        this.loopMinutes = minutes;
      }
      this.sessionRemaining = null;
      this.sessionTotal = null;
    },

    startSession: function (minutes) {
      var m = (typeof minutes === 'number' && minutes > 0) ? minutes : 50;
      this.mode = 'session';
      this.t = SESSION_START;
      this.sessionTotal = m * 60;
      this.sessionRemaining = this.sessionTotal;
      this._sessionElapsed = 0;
      this._sessionFired = false;
      this._afterglowElapsed = 0;
    },

    stopSession: function () {
      this.mode = 'loop';
      this.sessionRemaining = null;
      this.sessionTotal = null;
      this._sessionFired = false;
    },

    lock: function (t) {
      this.mode = 'locked';
      if (typeof t === 'number') {
        this.t = clamp01(t);
      }
      this.sessionRemaining = null;
      this.sessionTotal = null;
    },

    update: function (dt) {
      if (typeof dt !== 'number' || dt <= 0) return;

      if (this.mode === 'locked') {
        return;
      }

      if (this.mode === 'loop') {
        var seconds = this.loopMinutes * 60;
        if (seconds > 0) {
          this.t = (this.t + dt / seconds) % 1;
          if (this.t < 0) this.t += 1;
        }
        return;
      }

      if (this.mode === 'session') {
        if (this._sessionElapsed < this.sessionTotal) {
          // Linear advance dawn -> stars-out across the session.
          this._sessionElapsed += dt;
          var frac = clamp01(this._sessionElapsed / this.sessionTotal);
          this.t = SESSION_START + (SESSION_END - SESSION_START) * frac;
          this.sessionRemaining = Math.max(0, this.sessionTotal - this._sessionElapsed);
        }

        if (this._sessionElapsed >= this.sessionTotal) {
          this.t = SESSION_END;
          this.sessionRemaining = 0;
          if (!this._sessionFired) {
            this._sessionFired = true;
            if (typeof this.onSessionEnd === 'function') {
              try { this.onSessionEnd(); } catch (e) { /* ignore callback errors */ }
            }
          }
          // Slow afterglow drift toward deep night, then hold.
          if (this._afterglowElapsed < AFTERGLOW_SECONDS) {
            this._afterglowElapsed += dt;
            var ag = clamp01(this._afterglowElapsed / AFTERGLOW_SECONDS);
            this.t = SESSION_END + (AFTERGLOW_TARGET - SESSION_END) * ag;
          } else {
            this.t = AFTERGLOW_TARGET;
          }
        }
      }
    }
  };

  window.DayCycle = DayCycle;
})();
