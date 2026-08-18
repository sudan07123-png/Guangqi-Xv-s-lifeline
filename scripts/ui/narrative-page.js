/**
 * NarrativePage — 叙事页面（核心游戏界面）
 *
 * 监听 SceneEngine 的事件，渲染：
 *   - 背景图
 *   - 人物立绘
 *   - 对话框（打字机效果）
 *   - 选项按钮
 *   - 旁白/内心独白叠层
 *   - 场景标题转场
 *   - 引用 tooltip
 */
const NarrativePage = (function() {
  var container = null;
  var bgEl = null;
  var charLeft = null;
  var charRight = null;
  var dialogueBox = null;
  var choicesContainer = null;
  var narrationOverlay = null;
  var sceneTitleOverlay = null;
  var hudEl = null;
  var currentSkip = null;   // 当前打字机的 skip 函数

  var charactersData = null;
  var _titleTimer = null;

  function init() {
    container = document.getElementById('page-narrative');
    if (!container) return;

    bgEl = container.querySelector('.narrative-bg');
    charLeft = container.querySelector('.narrative-char-left');
    charRight = container.querySelector('.narrative-char-right');
    dialogueBox = container.querySelector('#dialogue-box');
    choicesContainer = container.querySelector('#choices-container');
    narrationOverlay = container.querySelector('#narration-overlay');
    sceneTitleOverlay = container.querySelector('#scene-title-overlay');
    hudEl = container.querySelector('.narrative-hud');

    _bindEvents();
  }

  function _bindEvents() {
    // 点击任意位置推进对话
    container.addEventListener('click', function(e) {
      // 排除选项按钮、tooltip、HUD 按钮
      if (e.target.closest('.choice-btn')) return;
      if (e.target.closest('.citation-tooltip')) return;
      if (e.target.closest('.hud-btn')) return;
      if (e.target.closest('.choices-container')) return;

      // 如果打字机正在运行，先跳过动画显示全文
      if (currentSkip) {
        currentSkip();
        currentSkip = null;
        _showClickHint();
        return;
      }

      SceneEngine.userAdvance();
    });

    // 空格键推进
    document.addEventListener('keydown', function(e) {
      if (e.code === 'Space' || e.key === ' ') {
        // 只在叙事页激活时响应
        if (!container.classList.contains('active')) return;
        e.preventDefault();

        // 如果打字机正在运行，先跳过动画显示全文
        if (currentSkip) {
          currentSkip();
          currentSkip = null;
          _showClickHint();
          return;
        }

        SceneEngine.userAdvance();
      }
    });
  }

  function enter(params) {
    if (!container) init();
    if (!container) { console.error('[NarrativePage] container not found!'); return; }

    // 加载人物数据（缓存）
    if (!charactersData) {
      DataLoader.loadCharacters().then(function(data) {
        charactersData = data;
      });
    }

    var chapterId = params.chapter || 'ch01';
    var sceneId = params.scene || 'ch01_s01';

    // 先显示页面
    document.querySelectorAll('.page-section').forEach(function(el) {
      el.classList.remove('active');
    });
    container.classList.add('active');

    // 加载章节并进入场景
    SceneEngine.loadChapter(chapterId).then(function(success) {
      if (success) {
        SceneEngine.enterScene(sceneId);
      } else {
        console.error('[NarrativePage] chapter load FAILED for:', chapterId);
      }
    }).catch(function(err) {
      console.error('[NarrativePage] loadChapter error:', err);
    });

    // 更新 HUD
    _updateHUD(chapterId);

    // 初始化通用组件
    Components.init();
  }

  function leave() {
    _cleanup();
    if (container) container.classList.remove('active');
  }

  function _cleanup() {
    if (currentSkip) { currentSkip(); currentSkip = null; }
    _clearChoices();
    _hideNarration();
    _hideSceneTitle();
    Components.hideCitation();
  }

  /* ================================================================
     场景设置
     ================================================================ */

  EventBus.on('scene:setup', function(data) {
    _setBackground(data.background);
    _clearCharacters();
    _clearChoices();
    _hideNarration();
    _showSceneTitle(data.title, data.location);
  });

  function _setBackground(bgPath) {
    if (!bgEl) return;
    if (bgPath) {
      bgEl.style.backgroundImage = 'url(' + bgPath + ')';
    }
  }

  function _showSceneTitle(title, location) {
    if (!sceneTitleOverlay) return;
    sceneTitleOverlay.querySelector('.scene-title').textContent = title || '';
    sceneTitleOverlay.querySelector('.scene-location').textContent = location || '';
    sceneTitleOverlay.classList.add('active');

    // 点击立即关闭标题叠层
    sceneTitleOverlay.onclick = function() {
      _hideSceneTitle();
    };

    // 1.2秒后自动消失（比原来的2.5秒快一倍多）
    _titleTimer = setTimeout(function() {
      _hideSceneTitle();
    }, 1200);
  }

  function _hideSceneTitle() {
    if (_titleTimer) { clearTimeout(_titleTimer); _titleTimer = null; }
    if (sceneTitleOverlay) {
      sceneTitleOverlay.classList.remove('active');
      sceneTitleOverlay.onclick = null;
    }
  }

  /* ================================================================
     步骤渲染 — 监听 SceneEngine
     ================================================================ */

  EventBus.on('step:render', function(data) {
    var step = data.step;
    if (!step) return;

    _clearChoices();
    _hideNarration();

    switch (step.type) {
      case 'narration':
        _renderNarration(step);
        break;
      case 'dialogue':
        _renderDialogue(step);
        break;
      case 'inner':
        _renderInner(step);
        break;
      case 'choice':
        _renderChoice(step);
        break;
      case 'transition':
        _renderTransition(step);
        break;
      default:
        break;
    }
  });

  /* ================================================================
     旁白
     ================================================================ */
  function _renderNarration(step) {
    _hideDialogueBox();
    if (!narrationOverlay) return;

    var textEl = narrationOverlay.querySelector('.narration-text');
    narrationOverlay.classList.add('active');

    if (currentSkip) { currentSkip(); currentSkip = null; }

    var plainText = step.text;
    var citationRef = step.citationRef;
    var citationAnchor = step.citationAnchor;

    currentSkip = Components.typewriter(textEl, plainText, 40, function() {
      currentSkip = null;
      // 打字机完成后应用引用样式
      _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
    });

    // 包装 skip 函数：跳过时也应用引用样式
    var originalSkip = currentSkip;
    currentSkip = function() {
      var skipped = originalSkip();
      if (skipped) {
        _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
      }
      return skipped;
    };
  }

  function _hideNarration() {
    if (narrationOverlay) narrationOverlay.classList.remove('active');
  }

  /* ================================================================
     对话
     ================================================================ */
  function _renderDialogue(step) {
    _hideNarration();
    _showDialogueBox();
    _showCharacter(step.speakerId, step.position || 'left');

    if (!dialogueBox) return;

    var speakerTag = dialogueBox.querySelector('.speaker-tag');
    var textEl = dialogueBox.querySelector('.dialogue-text');
    var hintEl = dialogueBox.querySelector('.click-hint');

    var speakerName = _getCharacterName(step.speakerId);
    speakerTag.textContent = speakerName;

    hintEl.classList.remove('show');

    if (currentSkip) { currentSkip(); currentSkip = null; }

    var plainText = step.text;
    var citationRef = step.citationRef;
    var citationAnchor = step.citationAnchor;

    currentSkip = Components.typewriter(textEl, plainText, 45, function() {
      currentSkip = null;
      _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
      hintEl.classList.add('show');
    });

    // 包装 skip 函数：跳过时也应用引用样式
    var originalSkip = currentSkip;
    currentSkip = function() {
      var skipped = originalSkip();
      if (skipped) {
        _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
      }
      return skipped;
    };
  }

  function _showDialogueBox() {
    if (dialogueBox) dialogueBox.style.display = '';
  }

  function _hideDialogueBox() {
    if (dialogueBox) dialogueBox.style.display = 'none';
  }

  /* ================================================================
     内心独白
     ================================================================ */
  function _renderInner(step) {
    _hideDialogueBox();
    _clearCharacters();

    if (!narrationOverlay) return;

    var textEl = narrationOverlay.querySelector('.narration-text');
    narrationOverlay.classList.add('active');

    if (currentSkip) { currentSkip(); currentSkip = null; }

    var plainText = step.text;
    var citationRef = step.citationRef;
    var citationAnchor = step.citationAnchor;

    currentSkip = Components.typewriter(textEl, plainText, 50, function() {
      currentSkip = null;
      _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
    });

    // 包装 skip 函数：跳过时也应用引用样式
    var originalSkip = currentSkip;
    currentSkip = function() {
      var skipped = originalSkip();
      if (skipped) {
        _applyCitationAfterTypewriter(textEl, plainText, citationRef, citationAnchor);
      }
      return skipped;
    };
  }

  /* ================================================================
     选项
     ================================================================ */
  function _renderChoice(step) {
    _hideDialogueBox();
    _clearCharacters();
    _hideNarration();

    if (!choicesContainer) return;

    // 显示提示文字
    if (step.prompt && narrationOverlay) {
      narrationOverlay.querySelector('.narration-text').textContent = step.prompt;
      narrationOverlay.classList.add('active');
    }

    var availableOptions = ChoiceSystem.filterAvailableOptions(step.options);

    choicesContainer.innerHTML = '';

    availableOptions.forEach(function(opt, index) {
      var btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = opt.text;
      btn.style.animationDelay = (index * 120) + 'ms';

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        _hideNarration();
        SceneEngine.handleChoice(opt);
      });

      choicesContainer.appendChild(btn);

      requestAnimationFrame(function() {
        btn.classList.add('visible');
      });
    });
  }

  function _clearChoices() {
    if (choicesContainer) choicesContainer.innerHTML = '';
  }

  /* ================================================================
     转场
     ================================================================ */
  function _renderTransition(step) {
    _hideDialogueBox();
    _clearCharacters();
    _clearChoices();
    _hideNarration();
  }

  /* ================================================================
     人物立绘
     ================================================================ */

  function _showCharacter(speakerId, position) {
    if (!charactersData) return;
    var charData = charactersData[speakerId];
    if (!charData) return;

    var defaultPortrait = charData.portraits && charData.portraits.default ?
      charData.portraits.default : '';

    var isProtagonist = charData.role === 'protagonist';
    var targetEl = isProtagonist ? charLeft : charRight;

    if (targetEl) {
      targetEl.src = defaultPortrait;
      targetEl.alt = charData.name;
      targetEl.classList.remove('hidden');
      targetEl.classList.add('enter');
      setTimeout(function() {
        targetEl.classList.remove('enter');
      }, 500);
    }
  }

  function _clearCharacters() {
    if (charLeft) {
      charLeft.classList.add('hidden');
      charLeft.src = '';
    }
    if (charRight) {
      charRight.classList.add('hidden');
      charRight.src = '';
    }
  }

  /* ================================================================
     引用文字处理
     ================================================================ */

  function _wrapCitationText(text, citationRef, citationAnchor) {
    if (!citationRef) return text;

    if (citationAnchor && text.includes(citationAnchor)) {
      return text.replace(citationAnchor,
        '<span class="cited-text" data-citation="' + citationRef + '">' + citationAnchor + '</span>');
    }

    return '<span class="cited-text" data-citation="' + citationRef + '">' + text + '</span>';
  }

  /**
   * 在打字机完成后应用引用样式。
   * 必须用 innerHTML 设置（因为引用样式是 <span>），
   * 但要保留文本中已有的 cited-text span。
   */
  function _applyCitationAfterTypewriter(el, text, citationRef, citationAnchor) {
    if (!citationRef) return;
    // 直接设置带引用包裹的 HTML（打字机已完成，没有光标需要保留）
    el.innerHTML = _wrapCitationText(text, citationRef, citationAnchor);
  }

  // 委托事件处理引用 hover
  document.addEventListener('mouseover', function(e) {
    var cited = e.target.closest('.cited-text');
    if (cited) {
      var citationId = cited.getAttribute('data-citation');
      if (citationId) {
        Components.showCitation(citationId, e.clientX, e.clientY);
      }
    }
  });

  document.addEventListener('mouseout', function(e) {
    var cited = e.target.closest('.cited-text');
    if (cited) {
      Components.hideCitation();
    }
  });

  /* ================================================================
     HUD & 辅助
     ================================================================ */

  function _updateHUD(chapterId) {
    if (!hudEl) return;
    var indicator = hudEl.querySelector('.hud-chapter-indicator');
    if (!indicator) return;

    var info = SceneEngine.getCurrentChapterInfo();
    var label = info ? info.title : ('第' + chapterId.replace('ch', '') + '章');
    indicator.textContent = '📜 ' + label;
  }

  function _getCharacterName(speakerId) {
    if (charactersData && charactersData[speakerId]) {
      var c = charactersData[speakerId];
      if (c.courtesyName) {
        return c.name + '（' + c.courtesyName + '）';
      }
      return c.name;
    }
    return speakerId || '???';
  }

  function _showClickHint() {
    if (!dialogueBox) return;
    var hintEl = dialogueBox.querySelector('.click-hint');
    if (hintEl) hintEl.classList.add('show');
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
