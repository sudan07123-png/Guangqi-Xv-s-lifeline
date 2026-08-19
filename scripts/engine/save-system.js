/**
 * SaveSystem — 存档系统
 * localStorage 5 槽位 + 1 自动存档
 *
 * 数据结构：
 * {
 *   slot: 0-4 (手动) | 'auto',
 *   timestamp: ISO 字符串,
 *   chapter: 'ch01',
 *   scene: 'ch01_s01',
 *   label: 场景标题（用于显示）,
 *   state: StateManager.exportState() 的返回结果
 * }
 */
const SaveSystem = (function() {
  var STORAGE_KEY = 'xuguanqi_saves';
  var AUTO_KEY = 'xuguanqi_autosave';
  var MAX_SLOTS = 5;

  /**
   * 读取所有存档元数据（不含完整 state，用于列表展示）
   */
  function getAllSaves() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[SaveSystem] Failed to read saves:', e);
      return [];
    }
  }

  /**
   * 写入所有存档
   */
  function _writeSaves(saves) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saves));
      return true;
    } catch (e) {
      console.error('[SaveSystem] Failed to write saves:', e);
      return false;
    }
  }

  /**
   * 保存到指定槽位
   */
  function save(slot, label) {
    if (slot < 0 || slot >= MAX_SLOTS) {
      console.error('[SaveSystem] Invalid slot:', slot);
      return false;
    }

    var state = StateManager.exportState();
    var chapter = StateManager.get('currentChapter') || 'ch01';
    var scene = StateManager.get('currentScene') || 'ch01_s01';

    var saveData = {
      slot: slot,
      timestamp: new Date().toISOString(),
      chapter: chapter,
      scene: scene,
      label: label || ('第' + chapter.replace('ch', '') + '章 · ' + scene),
      state: state
    };

    var saves = getAllSaves();
    // 覆盖同槽位
    var found = false;
    for (var i = 0; i < saves.length; i++) {
      if (saves[i].slot === slot) {
        saves[i] = saveData;
        found = true;
        break;
      }
    }
    if (!found) {
      saves.push(saveData);
    }

    EventBus.emit('save:completed', { slot: slot, label: label });
    return _writeSaves(saves);
  }

  /**
   * 从指定槽位加载
   */
  function load(slot) {
    var saves = getAllSaves();
    for (var i = 0; i < saves.length; i++) {
      if (saves[i].slot === slot) {
        return saves[i];
      }
    }
    return null;
  }

  /**
   * 删除指定槽位
   */
  function deleteSave(slot) {
    var saves = getAllSaves();
    var filtered = saves.filter(function(s) { return s.slot !== slot; });
    return _writeSaves(filtered);
  }

  /**
   * 自动存档
   */
  function autoSave() {
    try {
      var state = StateManager.exportState();
      var autoData = {
        slot: 'auto',
        timestamp: new Date().toISOString(),
        chapter: StateManager.get('currentChapter') || 'ch01',
        scene: StateManager.get('currentScene') || 'ch01_s01',
        label: '自动存档',
        state: state
      };
      localStorage.setItem(AUTO_KEY, JSON.stringify(autoData));
      EventBus.emit('save:autosave', {});
      return true;
    } catch (e) {
      console.error('[SaveSystem] Auto-save failed:', e);
      return false;
    }
  }

  /**
   * 读取自动存档
   */
  function loadAutoSave() {
    try {
      var raw = localStorage.getItem(AUTO_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 是否有任何存档
   */
  function hasAnySave() {
    var saves = getAllSaves();
    var auto = loadAutoSave();
    return saves.length > 0 || auto !== null;
  }

  /**
   * 清除所有存档
   */
  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(AUTO_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    MAX_SLOTS: MAX_SLOTS,
    getAllSaves: getAllSaves,
    save: save,
    load: load,
    deleteSave: deleteSave,
    autoSave: autoSave,
    loadAutoSave: loadAutoSave,
    hasAnySave: hasAnySave,
    clearAll: clearAll
  };
})();
