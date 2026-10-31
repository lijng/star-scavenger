/* 最高分持久化：localStorage 在隐私模式下可能抛异常，全部 try/catch 兜底 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var KEY = 'starcavenger.best.v1';

  var Store = {
    getBest: function () {
      try {
        var v = parseInt(global.localStorage.getItem(KEY) || '0', 10);
        return isFinite(v) && v > 0 ? v : 0;
      } catch (e) {
        return 0;
      }
    },
    setBest: function (v) {
      try { global.localStorage.setItem(KEY, String(v)); } catch (e) { /* 忽略 */ }
    }
  };

  SC.Store = Store;
})(window);
