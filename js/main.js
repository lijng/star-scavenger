/* 启动层：画布尺寸自适应 / 场景切换 / 主循环 */
(function (global) {
  'use strict';
  var SC = global.SC;

  var wrap = document.getElementById('wrap');
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');

  var el = {
    score: document.getElementById('uiScore'),
    best: document.getElementById('uiBest'),
    combo: document.getElementById('uiCombo'),
    comboBox: document.getElementById('uiComboBox'),
    lives: document.getElementById('uiLives'),
    ovStart: document.getElementById('ovStart'),
    ovPause: document.getElementById('ovPause'),
    ovOver: document.getElementById('ovOver'),
    final: document.getElementById('uiFinal'),
    finalBest: document.getElementById('uiFinalBest'),
    newBest: document.getElementById('uiNewBest'),
    btnStart: document.getElementById('btnStart'),
    btnResume: document.getElementById('btnResume'),
    btnQuit: document.getElementById('btnQuit'),
    btnRestart: document.getElementById('btnRestart'),
    btnSound: document.getElementById('btnSound')
  };

  var fx = new SC.FX();
  var audio = new SC.Audio();
  var soundMuted = false;

  var game = new SC.Game({
    canvas: canvas,
    fx: fx,
    audio: audio,
    store: SC.Store,
    ui: {
      score: el.score,
      best: el.best,
      combo: el.combo,
      comboBox: el.comboBox,
      lives: el.lives
    },
    onGameOver: function (r) {
      el.final.textContent = String(r.score);
      el.finalBest.textContent = String(r.best);
      el.newBest.hidden = !r.isNew;
      show(el.ovOver);
      /* 广告放在「一局结束」这个天然断点，不打断正在进行的操作 */
      global.setTimeout(function () { SC.GM.showBanner(); }, 700);
    }
  });

  var input = new SC.Input(canvas);
  game.input = input;

  /* ---------------- GameMonetize 广告接入 ---------------- */

  var adWasPlaying = false;

  SC.GM.install({
    pause: function () {
      /* 官方硬性要求：视频广告播放期间游戏必须暂停且完全静音 */
      adWasPlaying = (game.state === 'playing');
      if (adWasPlaying) game.setPaused(true);
      audio.muted = true;
    },
    resume: function () {
      audio.muted = soundMuted;
      if (adWasPlaying) game.setPaused(false);
      adWasPlaying = false;
    }
  });

  /* ---------------- 场景切换 ---------------- */

  function show(node) { node.classList.add('is-open'); }
  function hide(node) { node.classList.remove('is-open'); }

  function hideAll() {
    hide(el.ovStart);
    hide(el.ovPause);
    hide(el.ovOver);
  }

  function startGame() {
    audio.resume();
    hideAll();
    game.start();
  }

  function togglePause() {
    if (game.state === 'playing') {
      game.setPaused(true);
      show(el.ovPause);
    } else if (game.state === 'paused') {
      game.setPaused(false);
      hide(el.ovPause);
    }
  }

  function toggleSound() {
    soundMuted = !soundMuted;
    audio.muted = soundMuted;
    el.btnSound.classList.toggle('muted', soundMuted);
    el.btnSound.setAttribute('aria-label', soundMuted ? '开启音效' : '关闭音效');
  }

  /* ---------------- 输入绑定 ---------------- */

  el.btnStart.addEventListener('click', startGame);
  el.btnRestart.addEventListener('click', startGame);
  el.btnResume.addEventListener('click', togglePause);
  el.btnQuit.addEventListener('click', startGame);
  el.btnSound.addEventListener('click', toggleSound);

  input.onKey = function (k) {
    if (k === ' ' || k === 'enter') {
      if (game.state === 'ready' || game.state === 'over') startGame();
      else if (game.state === 'paused') togglePause();
    } else if (k === 'p' || k === 'escape') {
      togglePause();
    } else if (k === 'm') {
      toggleSound();
    }
  };

  /* 切到后台自动暂停，回来不会白给一条命 */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && game.state === 'playing') {
      game.setPaused(true);
      show(el.ovPause);
    }
  });

  /* ---------------- 画布尺寸 ---------------- */

  function resize() {
    var rect = wrap.getBoundingClientRect();
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var W = Math.max(320, Math.round(rect.width));
    var H = Math.max(360, Math.round(rect.height));

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.layout(W, H);
  }

  global.addEventListener('resize', resize);
  global.addEventListener('orientationchange', function () {
    global.setTimeout(resize, 120);
  });

  /* ---------------- 主循环 ---------------- */

  var last = 0;

  function frame(ts) {
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;

    game.update(dt);
    game.render();

    global.requestAnimationFrame(frame);
  }

  resize();
  global.requestAnimationFrame(frame);
})(window);
