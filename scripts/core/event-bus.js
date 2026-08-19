/**
 * EventBus — 轻量级发布/订阅事件总线
 * 用于跨模块通信，避免循环依赖
 */
const EventBus = (function() {
  const listeners = {};

  function on(event, callback) {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(callback);
    // 返回取消订阅函数
    return function() {
      off(event, callback);
    };
  }

  function off(event, callback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(function(cb) {
      return cb !== callback;
    });
  }

  function emit(event, data) {
    if (!listeners[event]) return;
    listeners[event].forEach(function(cb) {
      try {
        cb(data);
      } catch (e) {
        console.error('[EventBus] Error in listener for "' + event + '":', e);
      }
    });
  }

  // 清除某事件的所有监听器
  function clear(event) {
    if (event) {
      delete listeners[event];
    } else {
      Object.keys(listeners).forEach(function(key) {
        delete listeners[key];
      });
    }
  }

  // 调试用：列出所有已注册的事件
  function debug() {
    var result = {};
    Object.keys(listeners).forEach(function(key) {
      result[key] = listeners[key].length;
    });
    return result;
  }

  return {
    on: on,
    off: off,
    emit: emit,
    clear: clear,
    debug: debug
  };
})();
