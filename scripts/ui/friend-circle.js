/**
 * FriendCircle — 朋友圈页面
 *
 * Phase 3 完整实现，当前为占位框架。
 * 布局：左侧时间轴 + 右侧动态 Feed
 */
const FriendCircle = (function() {
  var container = null;
  var timelineEl = null;
  var feedEl = null;
  var timelineData = null;

  function init() {
    container = document.getElementById('page-friends');
    if (!container) return;

    timelineEl = container.querySelector('#friends-timeline');
    feedEl = container.querySelector('#friends-feed');

    // 绑定返回按钮
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

    var chapter = params.chapter || 'ch01';

    // 加载时间轴数据
    if (!timelineData) {
      DataLoader.loadTimeline().then(function(data) {
        if (data) {
          timelineData = data.events;
          _renderTimeline(chapter);
        }
      });
    } else {
      _renderTimeline(chapter);
    }

    _renderFeed(chapter);
  }

  function leave() {
    if (container) container.classList.remove('active');
  }

  /* ================================================================
     时间轴渲染
     ================================================================ */

  function _renderTimeline(chapter) {
    if (!timelineEl || !timelineData) return;

    var events = timelineData.filter(function(ev) {
      return ev.chapter === chapter;
    });

    var html = '<div class="timeline-heading">📅 时间轴</div>';
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      html +=
        '<div class="timeline-item" data-year="' + ev.year + '">' +
          '<span class="timeline-dot"></span>' +
          '<div>' +
            '<div style="font-weight:700;font-size:12px;">' + ev.year + '</div>' +
            '<div>' + ev.title + '</div>' +
            '<div style="font-size:11px;color:var(--color-ink-muted);">📍 ' + ev.location + '</div>' +
          '</div>' +
        '</div>';
    }

    timelineEl.innerHTML = html;
  }

  /* ================================================================
     Feed 渲染（占位）
     ================================================================ */

  function _renderFeed(chapter) {
    if (!feedEl) return;

    var chNum = chapter.replace('ch', '');

    // 占位数据 — Phase 3 替换为真实数据
    var feedItems = [
      {
        author: '利玛窦',
        avatar: '🧔',
        time: '万历二十八年 · 南京',
        content: '今日与徐子先公讨论天文历法，徐公聪慧过人，一点即通。此人若学西学，必有大成。',
        likes: 12,
        comments: 3
      },
      {
        author: '徐骥',
        avatar: '👤',
        time: '万历三十五年 · 北京',
        content: '父亲大人寄来的信中说：「儿自离家以来，未尝一日忘父母。」读罢泪落。父亲的学问，我何时才能追及万一。',
        likes: 5,
        comments: 1
      },
      {
        author: '徐光启',
        avatar: '📖',
        time: '万历三十二年 · 北京翰林院',
        content: '今日入翰林院。窗外是京城的繁华，窗内是待译的几何。利公说：「不急，学问是一辈子的事。」',
        likes: 8,
        comments: 2
      }
    ];

    var html = '';
    for (var i = 0; i < feedItems.length; i++) {
      var item = feedItems[i];
      html +=
        '<div class="feed-card anim-fade-in-up" style="animation-delay:' + (i * 0.15) + 's">' +
          '<div class="feed-author">' +
            '<span class="feed-avatar">' + item.avatar + '</span>' +
            '<div>' +
              '<div class="feed-name">' + item.author + '</div>' +
              '<div class="feed-time">' + item.time + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="feed-content">' + item.content + '</div>' +
          '<div class="feed-actions">' +
            '<span class="feed-action">💬 ' + item.comments + '</span>' +
            '<span class="feed-action">❤️ ' + item.likes + '</span>' +
            '<span class="feed-action" style="margin-left:auto;">📜 出处</span>' +
          '</div>' +
        '</div>';
    }

    // 更多占位提示
    html +=
      '<div class="friends-placeholder" style="padding:var(--space-2xl);text-align:center;">' +
        '<div class="placeholder-icon">📜</div>' +
        '<p>更多动态将在 Phase 3 中实现</p>' +
        '<p style="font-size:var(--text-sm);">届时将根据真实史料填充人物互动内容</p>' +
      '</div>';

    feedEl.innerHTML = html;
  }

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
