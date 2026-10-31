/* 特效层：粒子、屏幕震动、全屏闪红 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var TAU = Math.PI * 2;

  function FX() {
    this.particles = [];
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
  }

  FX.prototype.burst = function (x, y, opts) {
    opts = opts || {};
    var count = opts.count || 12;
    var color = opts.color || '#8fd3ff';
    var speed = opts.speed || 140;
    var life = opts.life || 0.55;
    var size = opts.size || 0;

    for (var i = 0; i < count; i++) {
      var a = Math.random() * TAU;
      var s = speed * (0.35 + Math.random() * 0.85);
      var l = life * (0.6 + Math.random() * 0.7);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: size > 0 ? size * (0.5 + Math.random()) : 1.4 + Math.random() * 2.6,
        life: l,
        max: l,
        color: color
      });
    }
  };

  FX.prototype.addShake = function (amount) {
    this.shake = Math.min(26, this.shake + amount);
  };

  FX.prototype.addFlash = function (v) {
    this.flash = Math.min(1, this.flash + v);
  };

  FX.prototype.update = function (dt) {
    var ps = this.particles;
    for (var i = ps.length - 1; i >= 0; i--) {
      var p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.955;
      p.vy *= 0.955;
    }

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 46);
      this.shakeX = (Math.random() - 0.5) * this.shake;
      this.shakeY = (Math.random() - 0.5) * this.shake;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }

    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.6);
  };

  FX.prototype.draw = function (ctx) {
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      var a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  FX.prototype.clear = function () {
    this.particles.length = 0;
    this.shake = 0;
    this.flash = 0;
  };

  SC.FX = FX;
})(window);
