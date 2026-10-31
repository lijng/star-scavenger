/* 游戏核心：实体管理 / 碰撞 / 难度曲线 / 渲染 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var TAU = Math.PI * 2;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function hitCircle(ax, ay, ar, bx, by, br) {
    var dx = ax - bx;
    var dy = ay - by;
    var rr = ar + br;
    return dx * dx + dy * dy <= rr * rr;
  }

  /* 三档陨石：大的会分裂成两个中等的，中的分裂成两个小的 */
  var KIND = {
    big:   { r: 34, hp: 3, points: 30, split: 'mid'   },
    mid:   { r: 22, hp: 2, points: 20, split: 'small' },
    small: { r: 13, hp: 1, points: 10, split: null    }
  };

  var POWER_TYPES = ['shield', 'slow', 'rapid'];
  var POWER_COLOR = { shield: '#6ee7ff', slow: '#a78bfa', rapid: '#ffb347' };

  function Game(env) {
    this.canvas = env.canvas;
    this.ctx = this.canvas.getContext('2d');
    this.fx = env.fx;
    this.audio = env.audio;
    this.store = env.store;
    this.ui = env.ui || {};
    this.onGameOver = env.onGameOver || function () {};

    this.W = 800;
    this.H = 600;
    this.input = null;
    this.best = this.store.getBest();

    this.stars = [];
    for (var i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        z: rand(0.25, 1),
        r: rand(0.5, 1.9)
      });
    }

    this.reset();
  }

  /* ---------------- 生命周期 ---------------- */

  Game.prototype.layout = function (W, H) {
    this.W = W;
    this.H = H;
    if (this.player) {
      this.player.y = H - 62;
      this.player.x = clamp(this.player.x, this.player.r + 4, W - this.player.r - 4);
    }
    this._bg = null;
  };

  Game.prototype.reset = function () {
    this.state = 'ready';
    this.score = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.elapsed = 0;
    this.spawnTimer = 0.5;
    this.orbTimer = 1.1;
    this.powerTimer = 9;

    this.bolts = [];
    this.asteroids = [];
    this.orbs = [];
    this.powerups = [];

    this.player = {
      x: this.W * 0.5,
      y: this.H - 62,
      r: 16,
      lives: 3,
      inv: 0,
      fireCd: 0,
      shield: 0,
      slow: 0,
      rapid: 0,
      tilt: 0
    };

    this.fx.clear();
    this.syncHud(true);
  };

  Game.prototype.start = function () {
    this.reset();
    this.state = 'playing';
    this.audio.resume();
  };

  Game.prototype.setPaused = function (on) {
    if (this.state !== 'playing' && this.state !== 'paused') return false;
    this.state = on ? 'paused' : 'playing';
    return true;
  };

  Game.prototype.gameOver = function () {
    this.state = 'over';
    this.audio.gameover();
    this.fx.addShake(20);

    var isNew = this.score > this.best;
    if (isNew) {
      this.best = this.score;
      this.store.setBest(this.best);
    }
    this.syncHud(true);
    this.onGameOver({ score: this.score, best: this.best, isNew: isNew });
  };

  /* ---------------- HUD ---------------- */

  Game.prototype.multiplier = function () {
    return clamp(1 + Math.floor(this.comboCount / 3), 1, 5);
  };

  Game.prototype.syncHud = function (force) {
    var ui = this.ui;

    if (ui.score && (force || ui.score.textContent !== String(this.score))) {
      ui.score.textContent = String(this.score);
    }
    if (ui.best) {
      ui.best.textContent = String(Math.max(this.best, this.score));
    }
    if (ui.combo) {
      ui.combo.textContent = 'x' + this.multiplier();
    }
    if (ui.comboBox) {
      ui.comboBox.classList.toggle('hot', this.comboCount >= 3);
    }
    if (ui.lives) {
      var s = '';
      for (var i = 0; i < this.player.lives; i++) s += '♥';
      for (var j = this.player.lives; j < 3; j++) s += '♡';
      ui.lives.textContent = s || '—';
    }
  };

  /* ---------------- 更新 ---------------- */

  Game.prototype.update = function (dt) {
    this.fx.update(dt);

    if (this.state !== 'playing') {
      this.scrollStars(dt, 0.3);
      return;
    }

    this.elapsed += dt;
    this.scrollStars(dt, 1);

    this.updatePlayer(dt);
    this.spawnTick(dt);
    this.updateBolts(dt);
    this.updateAsteroids(dt);
    this.updateOrbs(dt);
    this.updatePowerups(dt);
    this.checkCollisions();

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.syncHud();
      }
    }
  };

  Game.prototype.scrollStars = function (dt, factor) {
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      s.y += s.z * 0.35 * dt * factor;
      if (s.y > 1.02) {
        s.y = -0.02;
        s.x = Math.random();
      }
    }
  };

  Game.prototype.updatePlayer = function (dt) {
    var p = this.player;
    var ax = 0;

    if (this.input) {
      var a = this.input.axis();
      ax = a.x;
      /* 没有按键盘时，用指针位置做比例跟随（离得远就快，靠近就慢） */
      if (ax === 0 && this.input.pointer.active) {
        ax = clamp((this.input.pointer.x - p.x) / 55, -1, 1);
      }
    }

    p.x = clamp(p.x + ax * 560 * dt, p.r + 4, this.W - p.r - 4);
    p.tilt += (ax * 0.32 - p.tilt) * Math.min(1, dt * 12);

    if (p.inv > 0) p.inv -= dt;
    if (p.shield > 0) p.shield -= dt;
    if (p.slow > 0) p.slow -= dt;
    if (p.rapid > 0) p.rapid -= dt;

    p.fireCd -= dt;
    if (p.fireCd <= 0) {
      p.fireCd = p.rapid > 0 ? 0.11 : 0.23;
      this.fire();
    }
  };

  Game.prototype.fire = function () {
    var p = this.player;
    var sp = p.rapid > 0 ? 720 : 660;

    this.bolts.push({ x: p.x, y: p.y - p.r - 4, vy: -sp, r: 3.2, life: 2 });

    if (p.rapid > 0) {
      this.bolts.push({ x: p.x - 11, y: p.y - p.r + 4, vy: -sp, r: 2.6, life: 2 });
      this.bolts.push({ x: p.x + 11, y: p.y - p.r + 4, vy: -sp, r: 2.6, life: 2 });
    }

    this.audio.shoot();
    this.fx.burst(p.x, p.y - p.r, { count: 3, speed: 55, life: 0.16, color: '#7fe3ff', size: 1.5 });
  };

  /* ---------------- 生成 ---------------- */

  Game.prototype.spawnTick = function (dt) {
    var t = this.elapsed;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.34, 1.25 - t * 0.013) * rand(0.8, 1.2);
      this.addAsteroid();
    }

    this.orbTimer -= dt;
    if (this.orbTimer <= 0) {
      this.orbTimer = rand(1.5, 2.6);
      this.addOrbs();
    }

    this.powerTimer -= dt;
    if (this.powerTimer <= 0) {
      this.powerTimer = rand(11, 16);
      this.addPowerup();
    }
  };

  Game.prototype.addAsteroid = function (kind, x, y) {
    if (!kind) {
      var roll = Math.random();
      kind = roll < 0.42 ? 'big' : (roll < 0.78 ? 'mid' : 'small');
    }

    var k = KIND[kind];
    var r = k.r;
    var n = 9 + Math.floor(Math.random() * 4);
    var verts = [];
    for (var i = 0; i < n; i++) verts.push(rand(0.72, 1.12));

    this.asteroids.push({
      x: typeof x === 'number' ? x : rand(r + 10, this.W - r - 10),
      y: typeof y === 'number' ? y : -r - 10,
      r: r,
      kind: kind,
      hp: k.hp,
      vx: rand(-30, 30),
      vy: rand(76, 116) + this.elapsed * 1.8,
      rot: rand(0, TAU),
      spin: rand(-1.1, 1.1),
      verts: verts
    });
  };

  Game.prototype.addOrbs = function () {
    var count = Math.random() < 0.3 ? 3 : 1;
    var baseX = rand(60, this.W - 60);

    for (var i = 0; i < count; i++) {
      this.orbs.push({
        x: clamp(baseX + (i - (count - 1) / 2) * 46, 24, this.W - 24),
        y: -20 - i * 28,
        r: 9,
        vy: rand(58, 82),
        phase: rand(0, TAU)
      });
    }
  };

  Game.prototype.addPowerup = function () {
    this.powerups.push({
      x: rand(40, this.W - 40),
      y: -26,
      r: 15,
      vy: 74,
      type: POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)],
      rot: 0
    });
  };

  /* ---------------- 实体更新 ---------------- */

  Game.prototype.updateBolts = function (dt) {
    for (var i = this.bolts.length - 1; i >= 0; i--) {
      var b = this.bolts[i];
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.y < -20 || b.life <= 0) this.bolts.splice(i, 1);
    }
  };

  Game.prototype.updateAsteroids = function (dt) {
    var slowFactor = this.player.slow > 0 ? 0.45 : 1;

    for (var i = this.asteroids.length - 1; i >= 0; i--) {
      var a = this.asteroids[i];
      a.x += a.vx * dt * slowFactor;
      a.y += a.vy * dt * slowFactor;
      a.rot += a.spin * dt * slowFactor;

      /* 撞墙反弹，避免全挤在边上 */
      if (a.x < a.r) { a.x = a.r; a.vx = Math.abs(a.vx); }
      if (a.x > this.W - a.r) { a.x = this.W - a.r; a.vx = -Math.abs(a.vx); }

      if (a.y > this.H + a.r + 40) this.asteroids.splice(i, 1);
    }
  };

  Game.prototype.updateOrbs = function (dt) {
    for (var i = this.orbs.length - 1; i >= 0; i--) {
      var o = this.orbs[i];
      o.y += o.vy * dt;
      o.phase += dt * 6;
      if (o.y > this.H + 24) this.orbs.splice(i, 1);
    }
  };

  Game.prototype.updatePowerups = function (dt) {
    for (var i = this.powerups.length - 1; i >= 0; i--) {
      var u = this.powerups[i];
      u.y += u.vy * dt;
      u.rot += dt * 2.2;
      if (u.y > this.H + 26) this.powerups.splice(i, 1);
    }
  };

  /* ---------------- 碰撞 ---------------- */

  Game.prototype.checkCollisions = function () {
    var i, j, a, b, p = this.player;

    /* 子弹 × 陨石 */
    for (i = this.asteroids.length - 1; i >= 0; i--) {
      a = this.asteroids[i];
      var destroyed = false;

      for (j = this.bolts.length - 1; j >= 0; j--) {
        b = this.bolts[j];
        if (!hitCircle(a.x, a.y, a.r * 0.92, b.x, b.y, b.r)) continue;

        this.bolts.splice(j, 1);
        a.hp -= 1;
        this.fx.burst(b.x, b.y, { count: 5, speed: 110, life: 0.22, color: '#bfe6ff', size: 1.6 });

        if (a.hp <= 0) {
          this.destroyAsteroid(a);
          destroyed = true;
          break;
        }
      }

      if (destroyed) {
        this.asteroids.splice(i, 1);
        continue;
      }

      /* 陨石 × 玩家 */
      if (hitCircle(a.x, a.y, a.r * 0.82, p.x, p.y, p.r * 0.85)) {
        this.damagePlayer();
        this.destroyAsteroid(a, true);
        this.asteroids.splice(i, 1);
      }
    }

    /* 晶石 × 玩家 */
    for (i = this.orbs.length - 1; i >= 0; i--) {
      var o = this.orbs[i];
      if (!hitCircle(o.x, o.y, o.r + 6, p.x, p.y, p.r + 8)) continue;

      this.orbs.splice(i, 1);
      this.comboCount += 1;
      this.comboTimer = 2.0;
      var gain = 10 * this.multiplier();
      this.score += gain;

      this.audio.pickup(this.comboCount);
      this.fx.burst(o.x, o.y, { count: 12, speed: 150, life: 0.42, color: '#7fffd8', size: 2 });
      this.syncHud();
    }

    /* 道具 × 玩家 */
    for (i = this.powerups.length - 1; i >= 0; i--) {
      var u = this.powerups[i];
      if (!hitCircle(u.x, u.y, u.r + 4, p.x, p.y, p.r + 8)) continue;

      this.powerups.splice(i, 1);
      this.applyPowerup(u.type);
      this.fx.burst(u.x, u.y, { count: 18, speed: 180, life: 0.5, color: POWER_COLOR[u.type], size: 2 });
    }
  };

  Game.prototype.destroyAsteroid = function (a, silent) {
    var k = KIND[a.kind];

    if (!silent) {
      this.score += k.points * this.multiplier();
      this.audio.explode();
      this.fx.addShake(a.kind === 'big' ? 6 : 3);
      this.syncHud();
    }

    this.fx.burst(a.x, a.y, {
      count: a.kind === 'big' ? 26 : 14,
      speed: 150 + a.r * 2,
      life: 0.55,
      color: '#c9d4ef',
      size: 2.2
    });

    if (k.split) {
      var sub = KIND[k.split];
      for (var i = 0; i < 2; i++) {
        this.addAsteroid(k.split, a.x + (i === 0 ? -1 : 1) * a.r * 0.4, a.y);
        var na = this.asteroids[this.asteroids.length - 1];
        na.r = sub.r;
        na.vx = (i === 0 ? -1 : 1) * rand(40, 90);
        na.vy = a.vy * 0.85;
      }
    }
  };

  Game.prototype.damagePlayer = function () {
    var p = this.player;
    if (p.inv > 0) return;

    /* 护盾优先吃伤害 */
    if (p.shield > 0) {
      p.shield = 0;
      p.inv = 1.1;
      this.audio.powerup();
      this.fx.burst(p.x, p.y, { count: 26, speed: 230, life: 0.5, color: '#6ee7ff', size: 2 });
      this.fx.addShake(7);
      return;
    }

    p.lives -= 1;
    p.inv = 2.0;
    this.comboCount = 0;

    this.audio.hit();
    this.fx.burst(p.x, p.y, { count: 34, speed: 260, life: 0.7, color: '#ff8a6b', size: 2.4 });
    this.fx.addShake(16);
    this.fx.addFlash(0.55);
    this.syncHud();

    if (p.lives <= 0) this.gameOver();
  };

  Game.prototype.applyPowerup = function (type) {
    var p = this.player;
    this.audio.powerup();

    if (type === 'shield') p.shield = 12;
    else if (type === 'slow') p.slow = 8;
    else if (type === 'rapid') p.rapid = 9;
  };

  /* ---------------- 渲染 ---------------- */

  Game.prototype.render = function () {
    var ctx = this.ctx;
    var W = this.W;
    var H = this.H;

    ctx.clearRect(0, 0, W, H);
    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(this.fx.shakeX, this.fx.shakeY);

    this.drawOrbs(ctx);
    this.drawPowerups(ctx);
    this.drawAsteroids(ctx);
    this.drawBolts(ctx);
    this.drawPlayer(ctx);
    this.fx.draw(ctx);

    ctx.restore();

    if (this.fx.flash > 0) {
      ctx.globalAlpha = this.fx.flash * 0.45;
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  };

  Game.prototype.drawBackground = function (ctx) {
    if (!this._bg) {
      var g = ctx.createLinearGradient(0, 0, 0, this.H);
      g.addColorStop(0, '#070b1a');
      g.addColorStop(0.55, '#0b1226');
      g.addColorStop(1, '#131d38');
      this._bg = g;
    }

    ctx.fillStyle = this._bg;
    ctx.fillRect(0, 0, this.W, this.H);

    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      ctx.globalAlpha = 0.22 + s.z * 0.68;
      ctx.fillStyle = s.z > 0.82 ? '#cfe6ff' : '#8fa6c8';
      ctx.beginPath();
      ctx.arc(s.x * this.W, s.y * this.H, s.r * (0.55 + s.z * 0.75), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Game.prototype.drawPlayer = function (ctx) {
    var p = this.player;

    /* 无敌时间闪烁 */
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);

    /* 尾焰 */
    var flame = 13 + Math.sin(this.elapsed * 42) * 5;
    ctx.fillStyle = 'rgba(120, 220, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-6, p.r - 2);
    ctx.lineTo(0, p.r + flame);
    ctx.lineTo(6, p.r - 2);
    ctx.closePath();
    ctx.fill();

    /* 船体 */
    ctx.beginPath();
    ctx.moveTo(0, -p.r - 6);
    ctx.lineTo(p.r * 0.86, p.r * 0.8);
    ctx.lineTo(0, p.r * 0.42);
    ctx.lineTo(-p.r * 0.86, p.r * 0.8);
    ctx.closePath();
    ctx.fillStyle = '#e8f4ff';
    ctx.fill();
    ctx.strokeStyle = '#4ea8de';
    ctx.lineWidth = 2;
    ctx.stroke();

    /* 驾驶舱 */
    ctx.beginPath();
    ctx.arc(0, -2, 4.4, 0, TAU);
    ctx.fillStyle = '#2ea8ff';
    ctx.fill();

    ctx.restore();

    /* 护盾环 */
    if (p.shield > 0) {
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.elapsed * 8);
      ctx.strokeStyle = '#6ee7ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 11, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  };

  Game.prototype.drawAsteroids = function (ctx) {
    for (var i = 0; i < this.asteroids.length; i++) {
      var a = this.asteroids[i];
      var n = a.verts.length;

      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot);

      ctx.beginPath();
      for (var k = 0; k < n; k++) {
        var ang = (k / n) * TAU;
        var rr = a.r * a.verts[k];
        var px = Math.cos(ang) * rr;
        var py = Math.sin(ang) * rr;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      ctx.fillStyle = a.kind === 'big' ? '#4d5170' : (a.kind === 'mid' ? '#5c6183' : '#6d7396');
      ctx.fill();
      ctx.strokeStyle = '#9aa2c4';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(-a.r * 0.24, -a.r * 0.3, a.r * 0.2, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();

      ctx.restore();
    }
  };

  Game.prototype.drawOrbs = function (ctx) {
    for (var i = 0; i < this.orbs.length; i++) {
      var o = this.orbs[i];
      var pulse = 0.75 + 0.25 * Math.sin(o.phase);

      ctx.save();
      ctx.translate(o.x, o.y);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#43f5c0';
      ctx.beginPath();
      ctx.arc(0, 0, o.r * 2.2 * pulse, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(0, -o.r);
      ctx.lineTo(o.r, 0);
      ctx.lineTo(0, o.r);
      ctx.lineTo(-o.r, 0);
      ctx.closePath();
      ctx.fillStyle = '#7fffd8';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.restore();
    }
  };

  Game.prototype.drawPowerups = function (ctx) {
    for (var i = 0; i < this.powerups.length; i++) {
      var u = this.powerups[i];
      var color = POWER_COLOR[u.type];

      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.rotate(u.rot);

      ctx.globalAlpha = 0.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, u.r * 1.9, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var ang = (k / 6) * TAU - Math.PI / 2;
        var px = Math.cos(ang) * u.r;
        var py = Math.sin(ang) * u.r;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#0b1226';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      /* 类型标记 */
      ctx.fillStyle = color;
      if (u.type === 'shield') {
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, TAU);
        ctx.fill();
      } else if (u.type === 'slow') {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, TAU);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -5.5);
        ctx.lineTo(5, 4.5);
        ctx.lineTo(-5, 4.5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  };

  Game.prototype.drawBolts = function (ctx) {
    for (var i = 0; i < this.bolts.length; i++) {
      var b = this.bolts[i];

      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#4ea8de';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.4, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#eaf7ff';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 3.2, 0, 0, TAU);
      ctx.fill();

      ctx.restore();
    }
  };

  SC.Game = Game;
})(window);
