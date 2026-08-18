/**
 * StateManager — 游戏状态管理器
 * 管理所有可变游戏状态：当前进度、旗标、关系值、历史记录
 *
 * v2: 任何写操作前自动 ensureState()，防止因绕过 TitleScreen.startNewGame()
 *     进入叙事导致 state=null 造成 addFlag 静默失败。
 */
const StateManager = (function() {
  // 默认初始状态
  var DEFAULT_STATE = {
    currentChapter: null,
    currentScene: null,
    currentStep: 0,
    flags: {},
    relationships: {},
    history: [],
    unlockedEndings: [],
    unlockedChapters: ['ch01'],   // 第一章默认解锁
    playTime: 0,
    textSpeed: 'normal',
    version: 1
  };

  var state = null;

  /** 确保 state 不为 null —— 任何写操作必须先调用此函数 */
  function _ensureState() {
    if (state) return;
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    EventBus.emit('state:initialized', state);
  }

  /**
   * 初始化状态（新游戏）
   * @param {Array|Object} initialFlags - 数组 ['flag1'] 或对象 {flag1: true}
   * @param {Object} initialRelationships - { charId: value }
   */
  function init(initialFlags, initialRelationships) {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (initialFlags) {
      // 支持数组格式 ['flag1', 'flag2'] 和对象格式 {flag1: true}
      if (Array.isArray(initialFlags)) {
        for (var fi = 0; fi < initialFlags.length; fi++) {
          state.flags[initialFlags[fi]] = true;
        }
      } else {
        Object.keys(initialFlags).forEach(function(key) {
          state.flags[key] = initialFlags[key];
        });
      }
    }
    if (initialRelationships) {
      Object.keys(initialRelationships).forEach(function(key) {
        state.relationships[key] = initialRelationships[key];
      });
    }
    EventBus.emit('state:initialized', state);
    return state;
  }

  /**
   * 获取状态值（支持点路径，如 "flags.met_ricci"）
   * 注意: get 不触发 auto-init —— 读操作应该是幂等的
   */
  function get(path) {
    if (!state) return null;
    if (!path) return state;

    var parts = path.split('.');
    var current = state;
    for (var i = 0; i < parts.length; i++) {
      if (current === null || current === undefined) return undefined;
      current = current[parts[i]];
    }
    return current;
  }

  /**
   * 设置状态值
   */
  function set(path, value) {
    _ensureState();
    var parts = path.split('.');
    var current = state;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    EventBus.emit('state:changed', { path: path, value: value });
  }

  /**
   * 添加旗标
   */
  function addFlag(flag) {
    _ensureState();
    state.flags[flag] = true;
    EventBus.emit('state:flagAdded', flag);
  }

  /**
   * 移除旗标
   */
  function removeFlag(flag) {
    _ensureState();
    delete state.flags[flag];
    EventBus.emit('state:flagRemoved', flag);
  }

  /**
   * 检查是否有某旗标
   */
  function hasFlag(flag) {
    if (!state) return false;
    return !!state.flags[flag];
  }

  /**
   * 修改关系值（增加或减少）
   */
  function addRelationship(characterId, delta) {
    _ensureState();
    if (!state.relationships[characterId]) {
      state.relationships[characterId] = 50;  // 默认起点
    }
    state.relationships[characterId] += delta;
    // 限制在 0-100 之间
    state.relationships[characterId] = Math.max(0, Math.min(100, state.relationships[characterId]));
    EventBus.emit('state:relationshipChanged', {
      characterId: characterId,
      value: state.relationships[characterId]
    });
  }

  /**
   * 获取关系值
   */
  function getRelationship(characterId) {
    if (!state || !state.relationships) return 0;
    return state.relationships[characterId] || 0;
  }

  /**
   * 导航到新场景
   */
  function navigateToScene(chapterId, sceneId) {
    _ensureState();
    state.currentChapter = chapterId;
    state.currentScene = sceneId;
    state.currentStep = 0;
    EventBus.emit('state:navigated', {
      chapterId: chapterId,
      sceneId: sceneId
    });
  }

  /**
   * 记录历史
   */
  function pushHistory(entry) {
    _ensureState();
    state.history.push(entry);
  }

  /**
   * 解锁章节
   */
  function unlockChapter(chapterId) {
    _ensureState();
    if (state.unlockedChapters.indexOf(chapterId) === -1) {
      state.unlockedChapters.push(chapterId);
      EventBus.emit('state:chapterUnlocked', chapterId);
    }
  }

  /**
   * 解锁结局
   */
  function unlockEnding(endingId) {
    _ensureState();
    if (state.unlockedEndings.indexOf(endingId) === -1) {
      state.unlockedEndings.push(endingId);
      EventBus.emit('state:endingUnlocked', endingId);
    }
  }

  /**
   * 导出状态（用于存档）
   */
  function exportState() {
    if (!state) return null;
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * 导入状态（用于读档）
   */
  function importState(data) {
    if (!data) return;
    state = JSON.parse(JSON.stringify(data));
    state.version = state.version || 1;
    EventBus.emit('state:loaded', state);
  }

  /**
   * 重置状态
   */
  function reset() {
    state = null;
    EventBus.emit('state:reset');
  }

  /**
   * 检查状态是否已初始化
   */
  function isInitialized() {
    return state !== null;
  }

  return {
    init: init,
    get: get,
    set: set,
    addFlag: addFlag,
    removeFlag: removeFlag,
    hasFlag: hasFlag,
    addRelationship: addRelationship,
    getRelationship: getRelationship,
    navigateToScene: navigateToScene,
    pushHistory: pushHistory,
    unlockChapter: unlockChapter,
    unlockEnding: unlockEnding,
    exportState: exportState,
    importState: importState,
    reset: reset,
    isInitialized: isInitialized
  };
})();
