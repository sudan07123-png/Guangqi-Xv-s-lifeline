/**
 * DataLoader — JSON 数据加载器
 * 使用 fetch() 异步加载，支持缓存，兼容 file:// 协议
 */
const DataLoader = (function() {
  var cache = {};
  var basePath = 'data/';
  var _fileProtocolWarned = false;

  /**
   * 通用 JSON 加载函数
   */
  function loadJSON(path) {
    // 如果已经缓存，直接返回
    if (cache[path]) {
      return Promise.resolve(cache[path]);
    }

    return fetch(path)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load: ' + path + ' (' + response.status + ')');
        }
        return response.json();
      })
      .then(function(data) {
        cache[path] = data;
        return data;
      })
      .catch(function(error) {
        console.error('[DataLoader]', error.message);
        // file:// 协议检测：Chrome/Edge 会阻止 fetch 本地文件
        if (!_fileProtocolWarned && window.location.protocol === 'file:') {
          _fileProtocolWarned = true;
          console.warn('[DataLoader] 检测到 file:// 协议，fetch 可能被浏览器阻止。');
          console.warn('[DataLoader] 请使用本地服务器打开：双击 start.bat 或运行 python -m http.server 8080');
          // 延迟弹出提示（等 DOM 就绪）
          setTimeout(function() {
            var msg = '检测到您是直接打开 HTML 文件（file:// 协议）。\n\n' +
              '由于浏览器安全限制，数据文件无法加载。\n\n' +
              '解决方法：\n' +
              '① 双击项目根目录的 start.bat\n' +
              '② 或在终端运行：python -m http.server 8080\n' +
              '③ 然后访问 http://localhost:8080';
            if (typeof Components !== 'undefined' && Components.showAlert) {
              Components.showAlert('⚠️ 需要本地服务器', msg);
            } else {
              alert(msg);
            }
          }, 500);
        }
        return null;
      });
  }

  /**
   * 加载章节数据
   */
  function loadChapter(chapterId) {
    var path = basePath + 'chapters/' + chapterId + '.json';
    return loadJSON(path);
  }

  /**
   * 加载人物数据库
   */
  function loadCharacters() {
    return loadJSON(basePath + 'characters.json');
  }

  /**
   * 加载时间轴数据
   */
  function loadTimeline() {
    return loadJSON(basePath + 'timeline.json');
  }

  /**
   * 加载地图位置数据
   */
  function loadMapLocations() {
    return loadJSON(basePath + 'map-locations.json');
  }

  /**
   * 加载结局数据
   */
  function loadEndings() {
    return loadJSON(basePath + 'endings.json');
  }

  /**
   * 加载史料引用数据
   */
  function loadCitations() {
    return loadJSON(basePath + 'citations.json');
  }

  /**
   * 加载支线定义数据
   */
  function loadBranches() {
    return loadJSON(basePath + 'branches.json');
  }

  /**
   * 加载全局配置
   */
  function loadGlobals() {
    return loadJSON(basePath + 'globals.json');
  }

  /**
   * 根据引用 ID 获取单条史料
   */
  function getCitation(citationId) {
    return loadCitations().then(function(citations) {
      if (!citations) return null;
      return citations[citationId] || null;
    });
  }

  /**
   * 加载所有基础数据（用于预加载）
   */
  function loadAllBase() {
    return Promise.all([
      loadCharacters(),
      loadTimeline(),
      loadMapLocations(),
      loadEndings(),
      loadCitations(),
      loadGlobals(),
      loadBranches()
    ]);
  }

  /**
   * 清除缓存
   */
  function clearCache(key) {
    if (key) {
      delete cache[key];
    } else {
      cache = {};
    }
  }

  return {
    loadJSON: loadJSON,
    loadChapter: loadChapter,
    loadCharacters: loadCharacters,
    loadTimeline: loadTimeline,
    loadMapLocations: loadMapLocations,
    loadEndings: loadEndings,
    loadCitations: loadCitations,
    loadGlobals: loadGlobals,
    loadBranches: loadBranches,
    getCitation: getCitation,
    loadAllBase: loadAllBase,
    clearCache: clearCache
  };
})();
