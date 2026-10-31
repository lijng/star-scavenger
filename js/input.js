/* 输入：Pointer Events 统一鼠标/触摸，键盘走 keydown 集合 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  function Input(canvas) {
    this.canvas = canvas;
    this.pointer = { x: 0, y: 0, active: false, down: false };
    this.keys = Object.create(null);
    this.onKey = null;
    this._bind();
  }

  Input.prototype._bind = function () {
    var self = this;
    var canvas = this.canvas;

    function toLocal(ev) {
      var r = canvas.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    canvas.addEventListener('pointermove', function (ev) {
      var p = toLocal(ev);
      self.pointer.x = p.x;
      self.pointer.y = p.y;
      self.pointer.active = true;
    });

    canvas.addEventListener('pointerdown', function (ev) {
      var p = toLocal(ev);
      self.pointer.x = p.x;
      self.pointer.y = p.y;
      self.pointer.active = true;
      self.pointer.down = true;
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 忽略 */ }
      ev.preventDefault();
    });

    global.addEventListener('pointerup', function () {
      self.pointer.down = false;
    });

    canvas.addEventListener('pointerleave', function () {
      self.pointer.active = false;
    });

    /* 阻止移动端滚动/缩放干扰 */
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });

    global.addEventListener('keydown', function (ev) {
      var k = ev.key.toLowerCase();
      var handled = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].indexOf(k) >= 0;
      if (handled) ev.preventDefault();
      self.keys[k] = true;
      if (self.onKey) self.onKey(k);
    });

    global.addEventListener('keyup', function (ev) {
      self.keys[ev.key.toLowerCase()] = false;
    });

    /* 失焦时清空按键，避免"卡住一直往左" */
    global.addEventListener('blur', function () {
      self.keys = Object.create(null);
      self.pointer.down = false;
    });
  };

  Input.prototype.axis = function () {
    var k = this.keys;
    var x = 0;
    var y = 0;
    if (k['arrowleft'] || k['a']) x -= 1;
    if (k['arrowright'] || k['d']) x += 1;
    if (k['arrowup'] || k['w']) y -= 1;
    if (k['arrowdown'] || k['s']) y += 1;
    return { x: x, y: y };
  };

  SC.Input = Input;
})(window);
