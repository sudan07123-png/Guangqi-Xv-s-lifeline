/**
 * MapHub — 地图枢纽页面
 *
 * 使用 Leaflet + CARTO 现代底图（古今结合）：
 *   - 现代地图瓦片叠加「复古做旧」滤镜，贴合全站羊皮纸风格
 *   - 6 个关键地点以金色古风标记呈现，支持拖拽 + 滚轮 / 按钮缩放
 *   - 与右侧「生平大事记」双向联动：
 *       · 点击地图标记 → 高亮对应大事记 + 显示地点信息卡
 *       · 点击大事记条目 → 高亮地图标记 + 显示地点信息卡
 * 底部章节卡片负责进入各章。
 */
const MapHub = (function() {
  var container = null;
  var mapShell = null;
  var mapArea = null;
  var leafletMap = null;
  var markersLayer = null;
  var journeyLayer = null;
  var locationMarkers = {};
  var mapData = null;
  var timelineData = null;
  var chaptersData = null;
  var activeLocationId = null;
  var endingsData = null;
  var ENDING_ORDER = ['ending_daming_academy', 'ending_huitong', 'ending_liangshi', 'ending_tianyuan', 'ending_jucui', 'ending_weichou'];

  /* 人生旅程顺序（用于绘制轨迹线） */
  var JOURNEY_ORDER = [
    'loc_shanghai', 'loc_shaozhou', 'loc_nanjing', 'loc_beijing',
    'loc_tianjin', 'loc_tongzhou', 'loc_beijing'
  ];

  /* 地点标记短名（地图标签用） */
  var LOCATION_SHORT = {
    loc_shanghai: '上海',
    loc_shaozhou: '韶州',
    loc_nanjing: '南京',
    loc_beijing: '北京',
    loc_tianjin: '天津',
    loc_tongzhou: '通州'
  };

  function init() {
    container = document.getElementById('page-map');
    if (!container) return;
    mapShell = container.querySelector('.map-area');
    mapArea = container.querySelector('#map-canvas');

    // 绑定「时空朋友圈」入口按钮
    var friendsEntry = container.querySelector('#btn-friends-entry');
    if (friendsEntry) {
      friendsEntry.addEventListener('click', function() {
        Router.navigate('#/friends');
      });
    }

    // 绑定「结局图鉴」关闭
    var achClose = document.getElementById('achievements-close');
    if (achClose) achClose.addEventListener('click', _closeAchievements);
    var achBackdrop = document.getElementById('achievements-backdrop');
    if (achBackdrop) achBackdrop.addEventListener('click', _closeAchievements);
  }

  function enter(params) {
    if (!container) init();

    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

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
      _renderMap();
      _renderTimeline();
      _renderChapters();
      // 页面切换后容器尺寸可能变化，刷新 Leaflet 使其正确铺满
      if (leafletMap) {
        setTimeout(function() { leafletMap.invalidateSize(); }, 60);
      }
    });
  }

  function leave() {
    if (container) container.classList.remove('active');
    activeLocationId = null;
    _closeAchievements();
  }

  /* ================================================================
     地图渲染（Leaflet + CARTO 现代底图）
     ================================================================ */

  function _renderMap() {
    if (!mapArea || !mapData) return;

    // Leaflet 未加载（离线 / CDN 被墙）时的兜底提示
    if (typeof L === 'undefined') {
      mapArea.innerHTML =
        '<div class="map-fallback">' +
          '<div class="map-fallback-title">🗺️ 地图组件未能加载</div>' +
          '<div class="map-fallback-text">需要联网加载地图底图，请检查网络后刷新重试。</div>' +
        '</div>';
      return;
    }

    var locations = mapData.locations || [];

    if (!leafletMap) {
      leafletMap = L.map(mapArea, {
        center: [32.5, 116.5],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // CARTO Voyager 底图（免费、WGS-84、CDN 加速）
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(leafletMap);

      markersLayer = L.layerGroup().addTo(leafletMap);
      journeyLayer = L.layerGroup().addTo(leafletMap);

      leafletMap.zoomControl.setPosition('bottomright');
    } else {
      markersLayer.clearLayers();
      journeyLayer.clearLayers();
    }

    // 人生轨迹线（按时间顺序串联地点）
    var byId = {};
    locations.forEach(function(l) { byId[l.id] = l; });
    var pts = [];
    JOURNEY_ORDER.forEach(function(id) {
      if (byId[id]) pts.push([byId[id].lat, byId[id].lng]);
    });
    if (pts.length >= 2) {
      L.polyline(pts, {
        color: '#8b1a1a',
        weight: 2,
        dashArray: '6 5',
        opacity: 0.55,
        lineJoin: 'round'
      }).addTo(journeyLayer);
    }

    // 地点标记
    locationMarkers = {};
    locations.forEach(function(loc) {
      var m = L.marker([loc.lat, loc.lng], {
        icon: _makeIcon(loc),
        title: loc.name
      });
      m.on('click', function() {
        _focusLocation(loc.id, null);
      });
      m.addTo(markersLayer);
      locationMarkers[loc.id] = m;
    });

    // 视野自适应所有地点
    if (pts.length >= 2) {
      leafletMap.fitBounds(L.latLngBounds(pts), { padding: [50, 50] });
    }

    _ensureInfoCard();
  }

  function _makeIcon(loc) {
    var label = LOCATION_SHORT[loc.id] || loc.name || '';
    return L.divIcon({
      className: 'lm-icon',
      html: '<span class="lm-dot"></span><span class="lm-label">' + label + '</span>',
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
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
      var locId = _locIdForTimeline(ev.location);
      html +=
        '<div class="tl-event" data-event-index="' + i + '" data-loc="' + (locId || '') + '">' +
          '<div class="tl-year">' + _typeIcon(ev.type) + ' ' + ev.year + '</div>' +
          '<div class="tl-name">' + ev.title + '</div>' +
          '<div class="tl-location">📍 ' + ev.location + '</div>' +
        '</div>';
    }
    panel.innerHTML = html;

    var items = panel.querySelectorAll('.tl-event');
    for (var j = 0; j < items.length; j++) {
      (function(el) {
        el.addEventListener('click', function() {
          var locId = el.getAttribute('data-loc');
          if (locId) {
            _focusLocation(locId, parseInt(el.getAttribute('data-event-index'), 10));
          }
        });
      })(items[j]);
    }
  }

  function _locIdForTimeline(locText) {
    if (!locText) return null;
    if (locText.indexOf('韶') !== -1 || locText.indexOf('两广') !== -1) return 'loc_shaozhou';
    if (locText.indexOf('南京') !== -1) return 'loc_nanjing';
    if (locText.indexOf('天津') !== -1) return 'loc_tianjin';
    if (locText.indexOf('通州') !== -1) return 'loc_tongzhou';
    if (locText.indexOf('北京') !== -1) return 'loc_beijing';
    if (locText.indexOf('上海') !== -1 || locText.indexOf('法华') !== -1) return 'loc_shanghai';
    return null;
  }

  function _typeIcon(type) {
    var map = {
      birth: '👶', education: '📖', examination: '📜', travel: '🧳',
      encounter: '🤝', publication: '📚', death: '🕯️', politics: '🏛️',
      agriculture: '🌾', military: '🛡️', science: '🔭'
    };
    return map[type] || '✦';
  }

  /* ================================================================
     联动
     ================================================================ */

  function _focusLocation(locId, eventIndex) {
    activeLocationId = locId;

    // 高亮地图标记
    _highlightMarker(locId);

    // 高亮时间轴条目
    var items = container.querySelectorAll('.tl-event');
    var firstMatch = null;
    for (var j = 0; j < items.length; j++) {
      var el = items[j];
      var match = el.getAttribute('data-loc') === locId;
      if (eventIndex !== null && eventIndex !== undefined) {
        match = match && parseInt(el.getAttribute('data-event-index'), 10) === eventIndex;
      }
      el.classList.toggle('active', match);
      if (match && !firstMatch) firstMatch = el;
    }

    // 滚动到第一个匹配项
    if (firstMatch) {
      firstMatch.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    // 地图平滑移动到该地点
    if (leafletMap && locationMarkers[locId]) {
      leafletMap.panTo(locationMarkers[locId].getLatLng(), { animate: true });
    }

    _showInfoCard(locId);
  }

  function _highlightMarker(locId) {
    for (var id in locationMarkers) {
      var el = locationMarkers[id].getElement();
      if (el) el.classList.toggle('marker-active', id === locId);
    }
  }

  function _clearHighlights() {
    activeLocationId = null;
    for (var id in locationMarkers) {
      var el = locationMarkers[id].getElement();
      if (el) el.classList.remove('marker-active');
    }
    var items = container.querySelectorAll('.tl-event');
    for (var j = 0; j < items.length; j++) items[j].classList.remove('active');
  }

  function _ensureInfoCard() {
    var card = mapShell ? mapShell.querySelector('#map-infocard') : null;
    if (card) return card;
    card = document.createElement('div');
    card.className = 'map-infocard';
    card.id = 'map-infocard';
    card.style.display = 'none';
    if (mapShell) mapShell.appendChild(card);
    return card;
  }

  function _showInfoCard(locId) {
    var card = _ensureInfoCard();
    if (!card || !mapData) return;

    var loc = null;
    var locs = mapData.locations || [];
    for (var i = 0; i < locs.length; i++) {
      if (locs[i].id === locId) { loc = locs[i]; break; }
    }
    if (!loc) {
      card.style.display = 'none';
      return;
    }

    var eventsHtml = '';
    if (loc.events && loc.events.length) {
      eventsHtml = '<div class="infocard-events">' +
        loc.events.map(function(ev) { return '<span class="infocard-event">' + ev + '</span>'; }).join('') +
        '</div>';
    }

    card.innerHTML =
      '<button class="infocard-close" id="infocard-close">×</button>' +
      '<div class="infocard-name">📍 ' + loc.name + '</div>' +
      '<div class="infocard-desc">' + loc.description + '</div>' +
      eventsHtml;

    card.style.display = 'block';

    var closeBtn = card.querySelector('#infocard-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        card.style.display = 'none';
        _clearHighlights();
      });
    }
  }

  /* ================================================================
     章节卡片
     ================================================================ */

  function _renderChapters() {
    var cardsContainer = container.querySelector('#map-chapters');
    if (!cardsContainer || !chaptersData) return;

    var html = '';
    for (var i = 0; i < chaptersData.length; i++) {
      var ch = chaptersData[i];
      var isLocked = _isChapterLocked(ch);
      var isComplete = _isChapterComplete(ch);
      var stateClass = isLocked ? ' locked' : (isComplete ? ' complete' : '');
      html +=
        '<div class="chapter-card' + stateClass + '" data-chapter="' + ch.id + '"' +
        (isLocked ? ' title="' + _getLockReason(ch) + '"' : '') + '>' +
          '<div class="card-chapter-num">第' + _toChineseNum(i + 1) + '章</div>' +
          '<div class="card-title">' + ch.title + '</div>' +
          '<div class="card-subtitle">' + ch.subtitle + '</div>' +
          (isLocked ?
            '<div class="card-action"><span class="card-lock-icon">🔒</span>' + _getLockReason(ch) + '</div>' :
            (isComplete ?
              '<div class="card-action card-action-done"><span class="card-lock-icon">✓</span>已完成 · 可重玩</div>' :
              '<div class="card-action">进入 ▶</div>')) +
          (isComplete ? '<span class="card-complete-badge">✓ 已完成</span>' : '') +
        '</div>';
    }
    cardsContainer.innerHTML = html;

    cardsContainer.querySelectorAll('.chapter-card:not(.locked)').forEach(function(card) {
      card.addEventListener('click', function() {
        var chId = card.getAttribute('data-chapter');
        Router.navigate('#/narrative/' + chId + '/' + chId + '_s01');
      });
    });

    // 追加「成就收集」卡片（结局图鉴入口）
    cardsContainer.insertAdjacentHTML('beforeend', _renderAchievementCard());
    var achCard = cardsContainer.querySelector('#achievement-card');
    if (achCard) achCard.addEventListener('click', _openAchievements);
  }

  function _isChapterLocked(ch) {
    if (!ch.unlockCondition) return false;
    if (ch.unlockCondition.indexOf('hasFlag:') === 0) {
      var flag = ch.unlockCondition.replace('hasFlag:', '');
      return !StateManager.hasFlag(flag);
    }
    return true;
  }

  function _getLockReason(ch) {
    if (!ch.unlockCondition) return '';
    if (ch.unlockCondition.indexOf('hasFlag:') === 0) return '需通关前一章';
    return '未解锁';
  }

  function _toChineseNum(n) {
    var map = ['', '一', '二', '三', '四', '五'];
    return map[n] || String(n);
  }

  function _isChapterComplete(ch) {
    return !!StateManager.hasFlag(ch.id + '_complete');
  }

  function _rankEmoji(rank) {
    if (rank === 'gold_hidden') return '🔮';
    if (rank === 'gold') return '🥇';
    if (rank === 'silver') return '🥈';
    return '🥉';
  }

  function _renderAchievementCard() {
    var unlocked = StateManager.get('unlockedEndings') || [];
    return '' +
      '<div class="chapter-card achievement-card" id="achievement-card" title="查看已解锁的结局">' +
        '<div class="card-chapter-num">🏆 成就收集</div>' +
        '<div class="card-title">结局图鉴</div>' +
        '<div class="card-subtitle">已解锁 ' + unlocked.length + ' / ' + ENDING_ORDER.length + ' 个结局</div>' +
        '<div class="card-action">查看图鉴 ▶</div>' +
      '</div>';
  }

  function _openAchievements() {
    if (!endingsData) {
      DataLoader.loadEndings().then(function(data) {
        endingsData = data;
        _renderAchievementsPanel();
      });
    } else {
      _renderAchievementsPanel();
    }
    var panel = document.getElementById('achievements-panel');
    if (panel) panel.classList.add('active');
  }

  function _closeAchievements() {
    var panel = document.getElementById('achievements-panel');
    if (panel) panel.classList.remove('active');
  }

  function _renderAchievementsPanel() {
    var grid = document.getElementById('achievements-grid');
    if (!grid || !endingsData) return;

    var unlocked = StateManager.get('unlockedEndings') || [];

    var html = '';
    for (var i = 0; i < ENDING_ORDER.length; i++) {
      var id = ENDING_ORDER[i];
      var e = endingsData[id];
      if (!e) continue;
      var isUnlocked = unlocked.indexOf(id) !== -1;
      html +=
        '<div class="ach-card' + (isUnlocked ? '' : ' locked') + '">' +
          '<div class="ach-rank">' + _rankEmoji(e.rank) + '</div>' +
          '<div class="ach-title">' + (isUnlocked ? e.title : '？？？') + '</div>' +
          '<div class="ach-desc">' + (isUnlocked ? e.subtitle : '尚未解锁') + '</div>' +
        '</div>';
    }
    grid.innerHTML = html;

    var count = document.getElementById('achievements-count');
    if (count) count.textContent = '已解锁 ' + unlocked.length + ' / ' + ENDING_ORDER.length + ' 个结局';
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
