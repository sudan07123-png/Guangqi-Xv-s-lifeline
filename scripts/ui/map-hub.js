/**
 * MapHub — 地图枢纽页面
 *
 * Phase 4 完整集成 Leaflet + TimelineJS，当前为布局框架。
 * 功能：地图标记预览 + 时间轴事件列表 + 章节入口卡片
 */
const MapHub = (function() {
  var container = null;
  var mapData = null;
  var timelineData = null;
  var chaptersData = null;

  function init() {
    container = document.getElementById('page-map');
    if (!container) return;
  }

  function enter(params) {
    if (!container) init();

    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

    // 并行加载数据
    var promises = [];
    if (!mapData) {
      promises.push(DataLoader.loadMapLocations().then(function(d) { mapData = d; }));
    }
    if (!timelineData) {
      promises.push(DataLoader.loadTimeline().then(function(d) { timelineData = d; }));
    }
    if (!chaptersData) {
      promises.push(DataLoader.loadGlobals().then(function(d) {
        if (d) chaptersData = d.chapters;
      }));
    }

    Promise.all(promises).then(function() {
      _renderTimeline();
      _renderChapters();
    });
  }

  function leave() {
    if (container) container.classList.remove('active');
  }

  /* ================================================================
     时间轴渲染
     ================================================================ */

  function _renderTimeline() {
    var panel = container.querySelector('#map-timeline-panel');
    if (!panel || !timelineData) return;

    var events = timelineData.events || [];

    var html = '<div class="timeline-heading">📅 生平大事记</div>';
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      html +=
        '<div class="tl-event">' +
          '<div class="tl-year">' + ev.year + '</div>' +
          '<div class="tl-name">' + ev.title + '</div>' +
          '<div class="tl-location">📍 ' + ev.location + '</div>' +
        '</div>';
    }

    panel.innerHTML = html;
  }

  /* ================================================================
     章节卡片渲染
     ================================================================ */

  function _renderChapters() {
    var cardsContainer = container.querySelector('#map-chapters');
    if (!cardsContainer || !chaptersData) return;

    var html = '';
    for (var i = 0; i < chaptersData.length; i++) {
      var ch = chaptersData[i];
      var isLocked = _isChapterLocked(ch);
      var chapterNum = i + 1;

      html +=
        '<div class="chapter-card' + (isLocked ? ' locked' : '') + '"' +
        ' data-chapter="' + ch.id + '"' +
        (isLocked ? ' title="' + _getLockReason(ch) + '"' : '') + '>' +
          '<div class="card-chapter-num">第' + _toChineseNum(chapterNum) + '章</div>' +
          '<div class="card-title">' + ch.title + '</div>' +
          '<div class="card-subtitle">' + ch.subtitle + '</div>';

      if (isLocked) {
        html +=
          '<div class="card-action">' +
            '<span class="card-lock-icon">🔒</span>' + _getLockReason(ch) +
          '</div>';
      } else {
        html += '<div class="card-action">进入 ▶</div>';
      }

      html += '</div>';
    }

    cardsContainer.innerHTML = html;

    // 绑定点击事件
    cardsContainer.querySelectorAll('.chapter-card:not(.locked)').forEach(function(card) {
      card.addEventListener('click', function() {
        var chId = card.getAttribute('data-chapter');
        // 根据章节跳转到第一场景
        var firstScene = chId + '_s01';
        Router.navigate('#/narrative/' + chId + '/' + firstScene);
      });
    });
  }

  function _isChapterLocked(ch) {
    if (!ch.unlockCondition) return false;
    // 解析 unlockCondition: "hasFlag:ch01_complete"
    if (ch.unlockCondition.startsWith('hasFlag:')) {
      var flag = ch.unlockCondition.replace('hasFlag:', '');
      var hasIt = StateManager.hasFlag(flag);
      return !hasIt;
    }
    return true;
  }

  function _getLockReason(ch) {
    if (!ch.unlockCondition) return '';
    if (ch.unlockCondition.startsWith('hasFlag:')) {
      var flag = ch.unlockCondition.replace('hasFlag:', '');
      // 简单的前一章完成提示
      return '需通关前一章';
    }
    return '未解锁';
  }

  function _toChineseNum(n) {
    var map = ['', '一', '二', '三', '四', '五'];
    return map[n] || String(n);
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
