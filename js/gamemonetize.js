/* GameMonetize 广告 SDK 适配层
 *
 * 官方要求（缺一不可）：
 *   1. 引入 https://api.gamemonetize.com/sdk.js
 *   2. 设置 window.SDK_OPTIONS.gameId
 *   3. 收到 SDK_GAME_PAUSE 时必须「暂停游戏 + 静音」——广告播放期间禁止有游戏声音
 *   4. 收到 SDK_GAME_START 时恢复游戏并解除静音
 *   5. 在合适时机调用 sdk.showBanner()
 *
 * 本文件在 gameId 为空时完全不加载 SDK，所以同一份代码既能自托管也能上架。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  var GM = {
    gameId: '',
    ready: false,
    installed: false,
    hook: null
  };

  GM.install = function (hook) {
    GM.hook = hook || {};
    GM.gameId = (global.GM_GAME_ID || '').trim();

    /* 没配置 gameId：本地 / GitHub Pages 版本，静默跳过 */
    if (!GM.gameId) return false;
    if (GM.installed) return true;

    global.SDK_OPTIONS = {
      gameId: GM.gameId,

      /* SDK 内部还会直接调这两个回调（不只是发 onEvent），一并接上 */
      pauseGame: function () {
        if (GM.hook.pause) GM.hook.pause();
      },
      resumeGame: function () {
        if (GM.hook.resume) GM.hook.resume();
      },

      onInit: function () {
        GM.ready = true;
      },

      /* 广告加载失败绝不能连累游戏 */
      onError: function () {
        GM.ready = false;
      },

      onEvent: function (e) {
        switch (e && e.name) {
          case 'SDK_GAME_PAUSE':
            /* 视频广告即将播放：必须暂停 + 静音 */
            if (GM.hook.pause) GM.hook.pause();
            break;
          case 'SDK_GAME_START':
            /* 广告结束：恢复 */
            if (GM.hook.resume) GM.hook.resume();
            break;
          case 'SDK_READY':
          case 'SDK_GAME_DATA_READY':
            GM.ready = true;
            break;
          default:
            break;
        }
      }
    };

    var doc = global.document;
    if (!doc.getElementById('gamemonetize-sdk')) {
      var s = doc.createElement('script');
      s.id = 'gamemonetize-sdk';
      s.src = 'https://api.gamemonetize.com/sdk.js';
      s.async = true;
      (doc.head || doc.body).appendChild(s);
    }

    GM.installed = true;
    return true;
  };

  /* 展示广告。SDK 未就绪或未加载时安全返回 false，绝不抛错 */
  GM.showBanner = function () {
    if (!GM.installed) return false;
    var sdk = global.sdk;
    if (sdk && typeof sdk.showBanner === 'function') {
      try {
        sdk.showBanner();
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  };

  SC.GM = GM;
})(window);
