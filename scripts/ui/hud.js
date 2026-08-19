/**
 * HUD — 叙事页右上角菜单与设置
 *
 * ☰ 菜单：返回地图 / 保存游戏 / 返回标题页
 * ⚙ 设置：文字速度 / 背景音乐音量 / 音效音量
 */
const HUD = (function() {
  var menuBtn = null;
  var settingsBtn = null;
  var popover = null;
  var currentMode = null; // 'menu' | 'settings' | null

  function init() {
    menuBtn = document.getElementById('hud-menu');
    settingsBtn = document.getElementById('hud-settings');
    if (!menuBtn || !settingsBtn) return;

    menuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggle('menu');
    });
    settingsBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      toggle('settings');
    });

    // 点击外部关闭
    document.addEventListener('click', function(e) {
      if (popover && currentMode && !popover.contains(e.target)) {
        close();
      }
    });

    // 路由切换时关闭
    EventBus.on('route:enter', function() {
      close();
    });

    // Esc 关闭（main.js 的 Esc 处理器会先判断 isOpen）
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && currentMode) {
        close();
      }
    });

    _buildPopover();
  }

  function _buildPopover() {
    popover = document.createElement('div');
    popover.className = 'hud-popover';
    popover.style.display = 'none';
    document.body.appendChild(popover);
  }

  function isOpen() {
    return !!currentMode;
  }

  function toggle(mode) {
    if (currentMode === mode) {
      close();
      return;
    }
    open(mode);
  }

  function open(mode) {
    currentMode = mode;
    if (mode === 'menu') {
      _renderMenu();
    } else {
      _renderSettings();
    }
    _position();
    popover.style.display = 'block';
  }

  function close() {
    currentMode = null;
    if (popover) {
      popover.style.display = 'none';
      popover.innerHTML = '';
    }
  }

  function _position() {
    var anchor = settingsBtn || menuBtn;
    if (!anchor) return;
    var rect = anchor.getBoundingClientRect();
    popover.style.top = (rect.bottom + 8) + 'px';
    popover.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';
  }

  /* ================================================================
     菜单
     ================================================================ */

  function _renderMenu() {
    popover.innerHTML = '';
    var items = [
      { icon: '🗺️', label: '返回地图', action: function() { Router.navigate('#/map'); close(); } },
      { icon: '💾', label: '保存游戏', action: _saveGame },
      { icon: '🏠', label: '返回标题页', action: _returnToTitle }
    ];
    items.forEach(function(it) {
      var btn = document.createElement('button');
      btn.className = 'hud-popover-item';
      var icon = document.createElement('span');
      icon.className = 'hud-popover-icon';
      icon.textContent = it.icon;
      var txt = document.createElement('span');
      txt.textContent = it.label;
      btn.appendChild(icon);
      btn.appendChild(txt);
      btn.addEventListener('click', it.action);
      popover.appendChild(btn);
    });
  }

  function _saveGame() {
    var chapter = StateManager.get('currentChapter') || 'ch01';
    var label = '第' + chapter.replace('ch', '') + '章';
    SaveSystem.save(0, label);
    Components.showAlert('保存游戏', '已保存到存档位 1。');
    close();
  }

  function _returnToTitle() {
    Components.showConfirm('返回标题页', '确定返回标题页吗？未保存的进度将丢失。',
      function() {
        Router.navigate('#/title');
        close();
      });
  }

  /* ================================================================
     设置
     ================================================================ */

  function _renderSettings() {
    popover.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'hud-popover-header';
    header.textContent = '⚙ 设置';
    popover.appendChild(header);

    // 文字速度
    _addLabel('文字速度');
    var speedRow = document.createElement('div');
    speedRow.className = 'hud-speed-row';
    [['slow', '慢'], ['normal', '正常'], ['fast', '快']].forEach(function(pair) {
      var val = pair[0];
      var seg = document.createElement('button');
      seg.className = 'hud-speed-btn' + (Settings.get('textSpeed') === val ? ' active' : '');
      seg.textContent = pair[1];
      seg.addEventListener('click', function() {
        Settings.set('textSpeed', val);
        var btns = speedRow.querySelectorAll('.hud-speed-btn');
        for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
        seg.classList.add('active');
      });
      speedRow.appendChild(seg);
    });
    popover.appendChild(speedRow);

    // 音量
    _addSlider('背景音乐音量', 'musicVolume', 0.7);
    _addSlider('音效音量', 'sfxVolume', 1.0);

    var hint = document.createElement('div');
    hint.className = 'hud-settings-hint';
    hint.textContent = '设置会自动保存到本机浏览器。';
    popover.appendChild(hint);
  }

  function _addLabel(text) {
    var label = document.createElement('div');
    label.className = 'hud-setting-label';
    label.textContent = text;
    popover.appendChild(label);
  }

  function _addSlider(label, key, defaultVal) {
    _addLabel(label);
    var row = document.createElement('div');
    row.className = 'hud-slider-row';
    var input = document.createElement('input');
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    var current = Settings.get(key);
    input.value = Math.round((current !== undefined && current !== null ? current : defaultVal) * 100);
    var valText = document.createElement('span');
    valText.className = 'hud-slider-val';
    valText.textContent = input.value;
    input.addEventListener('input', function() {
      valText.textContent = input.value;
      Settings.set(key, parseInt(input.value, 10) / 100);
    });
    row.appendChild(input);
    row.appendChild(valText);
    popover.appendChild(row);
  }

  return {
    init: init,
    isOpen: isOpen,
    open: open,
    close: close
  };
})();
