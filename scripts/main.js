/**
 * main.js — 应用入口
 *
 * 初始化顺序：
 *   1. Router 注册所有路由
 *   2. 加载全局基础数据
 *   3. 启动路由监听
 *   4. 处理初始 hash → 进入标题页
 */
(function() {
  'use strict';

  /* ================================================================
     DOM Ready
     ================================================================ */
  function onReady() {
    // 初始化 UI 组件（tooltip / modal）
    Components.init();

    // 标题页事件绑定（按钮在 HTML 中，绑定在 JS 中）
    _bindTitleScreen();

    // 注册路由
    _registerRoutes();

    // 启动路由器
    Router.init();
  }

  /* ================================================================
     路由注册
     ================================================================ */

  function _registerRoutes() {
    // 标题页
    Router.register('/title', function(params) {
      TitleScreen.enter(params);
    });

    // 叙事页（核心游戏界面）
    Router.register('/narrative/:chapter/:scene', function(params) {
      NarrativePage.enter(params);
    });

    // 朋友圈
    Router.register('/friends/:chapter', function(params) {
      FriendCircle.enter(params);
    });

    // 地图枢纽
    Router.register('/map', function(params) {
      MapHub.enter(params);
    });

    // 结局页
    Router.register('/ending/:endingId', function(params) {
      EndingPage.enter(params);
    });
  }

  /* ================================================================
     标题页按钮绑定
     ================================================================ */

  function _bindTitleScreen() {
    var newGameBtn = document.getElementById('btn-new-game');
    var continueBtn = document.getElementById('btn-continue');
    var loadBtn = document.getElementById('btn-load');

    if (newGameBtn) {
      newGameBtn.addEventListener('click', function(e) {
        TitleScreen.startNewGame();
      });
    } else {
      console.error('[Main] btn-new-game NOT FOUND in DOM!');
    }

    if (continueBtn) {
      continueBtn.addEventListener('click', function() {
        TitleScreen.continueGame();
      });
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', function() {
        TitleScreen.showLoadMenu();
      });
    }

    // 监听加载存档菜单事件
    EventBus.on('ui:showLoadMenu', function() {
      _showLoadMenuModal();
    });
  }

  /* ================================================================
     加载存档菜单（模态框）
     ================================================================ */

  function _showLoadMenuModal() {
    var saves = SaveSystem.getAllSaves();
    var autoSave = SaveSystem.loadAutoSave();

    var allSaves = [];
    if (autoSave) {
      autoSave._isAuto = true;
      allSaves.push(autoSave);
    }
    allSaves = allSaves.concat(saves);

    if (allSaves.length === 0) {
      Components.showAlert('加载存档', '没有找到任何存档。开始新的旅程吧！');
      return;
    }

    // 构建存档列表
    var message = '';
    for (var i = 0; i < allSaves.length; i++) {
      var s = allSaves[i];
      var label = s._isAuto ? '🔄 自动存档' : ('📁 存档位 ' + (s.slot + 1));
      var time = new Date(s.timestamp).toLocaleString('zh-CN');
      message += label + ' — ' + time + '\n';
    }

    Components.showAlert('加载存档', '找到以下存档：\n\n' + message + '\n点击"确认"加载最近存档。');
  }

  /* ================================================================
     全局快捷键
     ================================================================ */

  document.addEventListener('keydown', function(e) {
    // Esc 返回标题页
    if (e.key === 'Escape') {
      var current = Router.getCurrent();
      if (current.route && current.route !== '/title') {
        Components.showConfirm('返回标题', '确定要返回标题页吗？未保存的进度将丢失。',
          function() {
            Router.navigate('#/title');
          }
        );
      }
    }
  });

  /* ================================================================
     启动
     ================================================================ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

})();
