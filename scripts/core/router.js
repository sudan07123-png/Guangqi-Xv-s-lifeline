/**
 * Router — Hash-based SPA 路由器
 *
 * 路由表：
 *   #/title                    → 标题页
 *   #/narrative/:chapter/:scene → 叙事页
 *   #/friends/:chapter         → 朋友圈页
 *   #/map                      → 地图枢纽
 *   #/ending/:endingId         → 结局页
 */
const Router = (function() {
  var currentRoute = null;
  var currentParams = {};
  var routes = {};

  /**
   * 注册路由处理函数
   */
  function register(pattern, handler) {
    routes[pattern] = handler;
  }

  /**
   * 将 hash 字符串解析为 { route, params }
   * e.g. "#/narrative/ch01/s02" → { route: "/narrative/:chapter/:scene", params: { chapter: "ch01", scene: "s02" } }
   */
  function parseHash(hash) {
    // 去掉开头的 #! 或 #
    var clean = hash.replace(/^[#!]+\/?/, '');
    if (!clean) clean = 'title';  // 默认路由

    // 去掉尾部斜杠
    clean = clean.replace(/\/$/, '');
    var parts = clean.split('/');

    // 尝试匹配每个注册的路由
    var routeKeys = Object.keys(routes);
    for (var i = 0; i < routeKeys.length; i++) {
      var pattern = routeKeys[i];
      var patternParts = pattern.replace(/^\//, '').split('/');

      if (patternParts.length !== parts.length && !pattern.includes('*')) {
        continue;
      }

      var params = {};
      var matched = true;

      for (var j = 0; j < patternParts.length; j++) {
        if (patternParts[j].startsWith(':')) {
          // 动态参数
          var paramName = patternParts[j].slice(1);
          params[paramName] = parts[j];
        } else if (patternParts[j] === '*') {
          // 通配符，匹配剩余所有
          params.wildcard = parts.slice(j).join('/');
          break;
        } else if (patternParts[j] !== parts[j]) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { route: pattern, params: params };
      }
    }

    // 未匹配：回退到标题页
    return { route: '/title', params: {} };
  }

  /**
   * 导航到指定路径
   */
  function navigate(path) {
    if (path.startsWith('#')) {
      window.location.hash = path;
    } else {
      window.location.hash = '#' + path;
    }
  }

  /**
   * 获取当前路由信息
   */
  function getCurrent() {
    return { route: currentRoute, params: currentParams };
  }

  /**
   * 处理 hash 变化
   */
  function handleHashChange() {
    var hash = window.location.hash || '#/title';
    var parsed = parseHash(hash);
    var oldRoute = currentRoute;

    currentRoute = parsed.route;
    currentParams = parsed.params;

    // 触发离开事件
    if (oldRoute && oldRoute !== currentRoute) {
      EventBus.emit('route:leave', { route: oldRoute });
    }

    // 执行路由处理
    if (routes[parsed.route]) {
      routes[parsed.route](parsed.params);
    }

    // 触发进入事件
    EventBus.emit('route:enter', { route: parsed.route, params: parsed.params });
  }

  /**
   * 初始化路由器
   */
  function init() {
    window.addEventListener('hashchange', handleHashChange);
    // 处理初始 hash
    handleHashChange();
  }

  return {
    init: init,
    register: register,
    navigate: navigate,
    getCurrent: getCurrent,
    parseHash: parseHash
  };
})();
