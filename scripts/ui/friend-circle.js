/**
 * FriendCircle — 朋友圈页面
 *
 * 展示「时空朋友圈」：徐光启与利玛窦、家人、同僚的互动动态。
 * 内容按章节解锁——完成一个章节后（即拥有 chXX_complete 旗标），
 * 该章节对应的朋友圈动态才会出现，呼应「内容与剧情同步更新」。
 * 布局：左侧时间轴（已通关章节的历史事件）+ 右侧朋友圈 Feed。
 */
const FriendCircle = (function() {
  var container = null;
  var timelineEl = null;
  var feedEl = null;
  var progressEl = null;

  var friendsData = null;   // data/friends.json
  var timelineData = null;  // data/timeline.json

  function init() {
    container = document.getElementById('page-friends');
    if (!container) return;

    timelineEl = container.querySelector('#friends-timeline');
    feedEl = container.querySelector('#friends-feed');
    progressEl = container.querySelector('#friends-progress');

    var backBtn = container.querySelector('#friends-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        Router.navigate('#/map');
      });
    }
  }

  function enter(params) {
    if (!container) init();

    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

    var promises = [];
    if (!friendsData) {
      promises.push(DataLoader.loadFriends().then(function(d) { friendsData = d; }));
    }
    if (!timelineData) {
      promises.push(DataLoader.loadTimeline().then(function(d) { timelineData = d; }));
    }

    Promise.all(promises).then(function() {
      _renderProgress();
      _renderTimeline();
      _renderFeed();
    });
  }

  function leave() {
    if (container) container.classList.remove('active');
  }

  /* ================================================================
     解锁判断
     ================================================================ */

  /** 某章节是否已通关（即其朋友圈内容是否解锁） */
  function _isChapterUnlocked(chapterId) {
    return StateManager.hasFlag(chapterId + '_complete');
  }

  function _chapterIndex(chapterId) {
    if (!friendsData) return 1;
    var chapters = friendsData.chapters || [];
    for (var i = 0; i < chapters.length; i++) {
      if (chapters[i].id === chapterId) return i + 1;
    }
    return 1;
  }

  function _toChineseNum(n) {
    var map = ['', '一', '二', '三', '四', '五'];
    return map[n] || String(n);
  }

  /* ================================================================
     顶栏解锁进度
     ================================================================ */

  function _renderProgress() {
    if (!progressEl || !friendsData) return;
    var chapters = friendsData.chapters || [];
    var unlocked = 0;
    chapters.forEach(function(ch) {
      if (_isChapterUnlocked(ch.id)) unlocked++;
    });
    progressEl.textContent = '已解锁 ' + unlocked + '/' + chapters.length + ' 章';
  }

  /* ================================================================
     左侧时间轴（仅显示已通关章节的历史事件）
     ================================================================ */

  function _renderTimeline() {
    if (!timelineEl || !timelineData) return;

    var events = timelineData.events || [];
    var unlockedIds = {};
    (friendsData.chapters || []).forEach(function(ch) {
      if (_isChapterUnlocked(ch.id)) unlockedIds[ch.id] = true;
    });

    var visible = events.filter(function(ev) {
      return unlockedIds[ev.chapter];
    });

    var html = '<div class="timeline-heading">📅 时间轴</div>';
    if (!visible.length) {
      html += '<div class="timeline-empty">完成章节后<br>此处显示历史大事</div>';
    }
    for (var i = 0; i < visible.length; i++) {
      var ev = visible[i];
      html +=
        '<div class="timeline-item" data-chapter="' + ev.chapter + '">' +
          '<span class="timeline-dot"></span>' +
          '<div>' +
            '<div class="timeline-year">' + ev.year + '</div>' +
            '<div>' + ev.title + '</div>' +
            '<div class="timeline-loc">📍 ' + ev.location + '</div>' +
          '</div>' +
        '</div>';
    }
    timelineEl.innerHTML = html;
  }

  /* ================================================================
     右侧朋友圈 Feed（按章节分组，已解锁显示动态，未解锁显示锁定卡）
     ================================================================ */

  function _renderFeed() {
    if (!feedEl || !friendsData) return;

    var chapters = friendsData.chapters || [];
    var posts = friendsData.posts || [];

    var byChapter = {};
    posts.forEach(function(p) {
      if (!byChapter[p.chapter]) byChapter[p.chapter] = [];
      byChapter[p.chapter].push(p);
    });

    var html = '';
    var anyUnlocked = false;

    chapters.forEach(function(ch) {
      if (_isChapterUnlocked(ch.id)) {
        anyUnlocked = true;
        html += _renderChapterGroup(ch, byChapter[ch.id] || []);
      } else {
        html += _renderLockCard(ch);
      }
    });

    if (!anyUnlocked) {
      html = '<div class="friends-empty">' +
        '<div class="placeholder-icon">📱</div>' +
        '<p>时空朋友圈还空空如也</p>' +
        '<p>完成章节后，这里会出现对应时期的动态</p>' +
        '</div>' + html;
    }

    feedEl.innerHTML = html;
  }

  function _renderChapterGroup(ch, posts) {
    var html =
      '<div class="feed-chapter-group">' +
        '<div class="feed-chapter-header">' +
          '<span class="feed-chapter-title">第' + _toChineseNum(_chapterIndex(ch.id)) + '章 · ' + ch.title + '</span>' +
          '<span class="feed-chapter-subtitle">' + ch.subtitle + '</span>' +
        '</div>';

    for (var i = 0; i < posts.length; i++) {
      var p = posts[i];
      var replies = p.replies || [];
      var commentCount = replies.length ? replies.length : (p.comments || 0);
      html +=
        '<div class="feed-card anim-fade-in-up" style="animation-delay:' + (i * 0.12) + 's">' +
          '<div class="feed-author">' +
            '<span class="feed-avatar">' + (p.avatar || '👤') + '</span>' +
            '<div>' +
              '<div class="feed-name">' + p.author + '</div>' +
              '<div class="feed-time">' + p.time + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="feed-content">' + p.content + '</div>' +
          (replies.length ? '<div class="feed-replies">' +
            replies.map(function(r) {
              return '<div class="feed-reply">' +
                '<span class="feed-reply-name">' + r.author + '</span>' +
                '<span class="feed-reply-content">' + r.content + '</span>' +
              '</div>';
            }).join('') +
          '</div>' : '') +
          '<div class="feed-actions">' +
            '<span class="feed-action">💬 ' + commentCount + '</span>' +
            '<span class="feed-action">❤️ ' + (p.likes || 0) + '</span>' +
            (p.source ? '<span class="feed-action feed-source" style="margin-left:auto;">📜 ' + p.source + '</span>' : '') +
          '</div>' +
        '</div>';
    }

    html += '</div>';
    return html;
  }

  function _renderLockCard(ch) {
    var index = _chapterIndex(ch.id);
    return '<div class="feed-lock-card">' +
      '<span class="feed-lock-icon">🔒</span>' +
      '<div class="feed-lock-text">' +
        '<div class="feed-lock-title">第' + _toChineseNum(index) + '章 · ' + ch.title + '</div>' +
        '<div class="feed-lock-sub">完成该章后，这里会出现对应时期的动态</div>' +
      '</div>' +
    '</div>';
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
