/**
 * Settings — 全局设置存储（localStorage 持久化，独立于存档）
 *
 * 字段：
 *   textSpeed    'slow' | 'normal' | 'fast'  文字速度
 *   musicVolume  0.0 – 1.0                    背景音乐音量
 *   sfxVolume    0.0 – 1.0                    音效音量
 *
 * 说明：设置与游戏进度分离，不随新游戏 / 读档重置。
 */
const Settings = (function() {
  var KEY = 'xuguanqi_settings';
  var DEFAULTS = {
    textSpeed: 'normal',
    musicVolume: 0.7,
    sfxVolume: 1.0
  };
  var cache = null;

  function _load() {
    if (cache) return cache;
    var parsed = null;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) parsed = JSON.parse(raw);
    } catch (e) {
      parsed = null;
    }
    cache = parsed || {};
    Object.keys(DEFAULTS).forEach(function(k) {
      if (cache[k] === undefined || cache[k] === null) cache[k] = DEFAULTS[k];
    });
    return cache;
  }

  function get(key) {
    return _load()[key];
  }

  function set(key, value) {
    _load()[key] = value;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch (e) {}
    EventBus.emit('settings:changed', { key: key, value: value });
  }

  /**
   * 当前文字速度对应的打字间隔（ms）
   */
  function textSpeedMs() {
    var s = get('textSpeed');
    if (s === 'slow') return 70;
    if (s === 'fast') return 24;
    return 45;
  }

  return {
    get: get,
    set: set,
    textSpeedMs: textSpeedMs
  };
})();
