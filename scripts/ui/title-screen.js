/**
 * TitleScreen — 标题页
 * 新游戏 / 继续游戏 / 加载存档 / 制作人员
 */
const TitleScreen = (function() {
  var container = null;

  function init() {
    container = document.getElementById('page-title');
  }

  function enter(params) {
    if (!container) init();
    show();
  }

  function show() {
    if (!container) return;
    // 先隐藏所有页面
    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

    // 检查是否有存档可以继续
    var hasSave = SaveSystem ? SaveSystem.hasAnySave() : false;
    var continueBtn = container.querySelector('#btn-continue');
    if (continueBtn) {
      continueBtn.style.display = hasSave ? '' : 'none';
    }
  }

  function hide() {
    if (container) container.classList.remove('active');
  }

  var _starting = false; // 防止重复调用

  // 新游戏按钮
  function startNewGame() {
    if (_starting) { return; }
    _starting = true;
    DataLoader.loadGlobals().then(function(globals) {
      if (globals) {
        StateManager.init(globals.initialFlags, globals.initialRelationships);
      } else {
        console.warn('[TitleScreen] globals is null, using default init');
        StateManager.init();
      }
      StateManager.set('currentChapter', 'ch01');
      _starting = false;
      Router.navigate('#/narrative/ch01/ch01_s01');
    }).catch(function(err) {
      console.error('[TitleScreen] loadGlobals failed:', err);
      _starting = false;
    });
  }

  // 继续游戏按钮
  function continueGame() {
    var saveData = SaveSystem.loadAutoSave();
    if (saveData) {
      StateManager.importState(saveData.state);
      var chapter = StateManager.get('currentChapter') || 'ch01';
      var scene = StateManager.get('currentScene') || 'ch01_s01';
      Router.navigate('#/narrative/' + chapter + '/' + scene);
    }
  }

  // 加载存档按钮
  function showLoadMenu() {
    EventBus.emit('ui:showLoadMenu');
  }

  function leave() {
    hide();
  }

  return {
    init: init,
    enter: enter,
    leave: leave,
    show: show,
    hide: hide,
    startNewGame: startNewGame,
    continueGame: continueGame,
    showLoadMenu: showLoadMenu
  };
})();
