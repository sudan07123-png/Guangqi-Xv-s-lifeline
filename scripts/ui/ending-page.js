/**
 * EndingPage — 结局页面
 *
 * 根据 endingId 加载结局数据，展示：
 *   - 结局标题 + 徽章
 *   - 结局描述文字
 *   - 旅途统计（学识/勇气/气节）
 *   - 重新开始 / 返回地图按钮
 */
const EndingPage = (function() {
  var container = null;
  var endingsData = null;

  function init() {
    container = document.getElementById('page-ending');
    if (!container) return;
  }

  function enter(params) {
    if (!container) init();

    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

    var endingId = params.endingId || 'ending_huitong';

    // 加载结局数据
    var loadPromise = endingsData ?
      Promise.resolve(endingsData) :
      DataLoader.loadEndings();

    loadPromise.then(function(data) {
      if (data) {
        endingsData = data;
        _renderEnding(endingId);
      }
    });
  }

  function leave() {
    if (container) container.classList.remove('active');
  }

  /* ================================================================
     结局渲染
     ================================================================ */

  function _renderEnding(endingId) {
    if (!container || !endingsData) return;

    var ending = endingsData[endingId];
    if (!ending) {
      // 找不到结局，显示默认
      _renderDefaultEnding();
      return;
    }

    // 徽章
    var badgeEl = container.querySelector('.ending-rank-badge');
    if (badgeEl) {
      badgeEl.textContent = ending.subtitle || '结局';
      badgeEl.className = 'ending-rank-badge ' + (ending.rank || 'silver');
    }

    // 标题
    var titleEl = container.querySelector('.ending-title');
    if (titleEl) titleEl.textContent = ending.title || '旅途结束';

    // 描述
    var descEl = container.querySelector('.ending-description');
    if (descEl) descEl.textContent = ending.description || '';

    // 结局文字
    var textEl = container.querySelector('.ending-text');
    if (textEl) textEl.textContent = ending.endingText || '';

    // 统计
    if (ending.stats) {
      _renderStats(ending.stats);
    }

    // 按钮
    _bindActionButtons();
  }

  function _renderDefaultEnding() {
    var titleEl = container.querySelector('.ending-title');
    if (titleEl) titleEl.textContent = '旅途结束';

    var descEl = container.querySelector('.ending-description');
    if (descEl) descEl.textContent = '徐光启的故事在此暂告一段落。每一次选择，都塑造了不同的人生轨迹。';

    var textEl = container.querySelector('.ending-text');
    if (textEl) textEl.textContent = '';

    _renderStats({ knowledge: 70, courage: 60, integrity: 70 });
    _bindActionButtons();
  }

  function _renderStats(stats) {
    var statsContainer = container.querySelector('.ending-stats');
    if (!statsContainer) return;

    var statDefs = [
      { key: 'knowledge', label: '学识', icon: '📚' },
      { key: 'courage', label: '勇气', icon: '⚔️' },
      { key: 'integrity', label: '气节', icon: '🎋' }
    ];

    var html = '';
    for (var i = 0; i < statDefs.length; i++) {
      var def = statDefs[i];
      var value = stats[def.key] || 50;
      html +=
        '<div class="ending-stat">' +
          '<div class="stat-label">' + def.icon + ' ' + def.label + '</div>' +
          '<div class="stat-value">' + value + '</div>' +
          '<div class="stat-bar">' +
            '<div class="stat-bar-fill" style="width:' + value + '%"></div>' +
          '</div>' +
        '</div>';
    }

    statsContainer.innerHTML = html;

    // 延迟触发进度条动画
    setTimeout(function() {
      var fills = statsContainer.querySelectorAll('.stat-bar-fill');
      for (var j = 0; j < fills.length; j++) {
        fills[j].style.width = fills[j].style.width; // 触发重排后再设置
      }
    }, 100);
  }

  function _bindActionButtons() {
    var restartBtn = container.querySelector('#btn-restart');
    var mapBtn = container.querySelector('#btn-to-map');

    if (restartBtn) {
      restartBtn.onclick = function() {
        StateManager.reset();
        Router.navigate('#/title');
      };
    }

    if (mapBtn) {
      mapBtn.onclick = function() {
        Router.navigate('#/map');
      };
    }
  }

  /* ================================================================
     公共接口
     ================================================================ */

  function show() {
    if (container) container.classList.add('active');
  }

  function hide() {
    if (container) container.classList.remove('active');
  }

  return {
    init: init,
    enter: enter,
    leave: leave,
    show: show,
    hide: hide
  };
})();
