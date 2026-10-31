/* 音效：全部用 WebAudio 现场合成，零音频文件、零请求 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  function Audio() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  /* 浏览器要求用户手势后才能播放音频，所以延迟到第一次调用时创建 */
  Audio.prototype.ensure = function () {
    if (this.ctx) return this.ctx;
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
    return this.ctx;
  };

  Audio.prototype.resume = function () {
    var c = this.ensure();
    if (c && c.state === 'suspended') {
      try { c.resume(); } catch (e) { /* 忽略 */ }
    }
  };

  Audio.prototype.tone = function (from, to, dur, type, gain, delay) {
    if (this.muted) return;
    var c = this.ensure();
    if (!c) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) { /* 忽略 */ } }

    var t0 = c.currentTime + (delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();

    osc.type = type || 'square';
    osc.frequency.setValueAtTime(Math.max(1, from), t0);
    if (to && to !== from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    }

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.5), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.04);
  };

  Audio.prototype.noise = function (dur, gain, cutoff) {
    if (this.muted) return;
    var c = this.ensure();
    if (!c) return;

    var len = Math.max(1, Math.floor(c.sampleRate * dur));
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }

    var src = c.createBufferSource();
    src.buffer = buf;

    var f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1400;

    var g = c.createGain();
    g.gain.value = gain || 0.4;

    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  };

  Audio.prototype.shoot = function () {
    this.tone(820, 420, 0.06, 'square', 0.10);
  };

  Audio.prototype.pickup = function (combo) {
    var base = 520 + Math.min(9, combo) * 42;
    this.tone(base, base * 1.55, 0.09, 'triangle', 0.24);
  };

  Audio.prototype.explode = function () {
    this.noise(0.20, 0.22, 1800);
  };

  Audio.prototype.hit = function () {
    this.noise(0.34, 0.45, 900);
    this.tone(190, 62, 0.30, 'sawtooth', 0.20);
  };

  Audio.prototype.powerup = function () {
    this.tone(320, 640, 0.10, 'square', 0.18);
    this.tone(640, 980, 0.12, 'square', 0.16, 0.09);
  };

  Audio.prototype.gameover = function () {
    this.tone(440, 220, 0.16, 'triangle', 0.26);
    this.tone(330, 165, 0.20, 'triangle', 0.26, 0.16);
    this.tone(220, 82, 0.42, 'sawtooth', 0.24, 0.36);
  };

  SC.Audio = Audio;
})(window);
