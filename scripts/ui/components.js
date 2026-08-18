/**
 * Components — 通用 UI 组件
 *
 * - CitationTooltip: 史料引用悬浮提示
 * - Modal: 通用模态框
 * - TypeWriter: 打字机文字效果
 */
const Components = (function() {
  var citationTooltip = null;
  var modalOverlay = null;

  /* ================================================================
     CitationTooltip — 史料引用提示
     ================================================================ */

  function initCitationTooltip() {
    if (citationTooltip) return;

    citationTooltip = document.createElement('div');
    citationTooltip.className = 'citation-tooltip';
    citationTooltip.innerHTML =
      '<div class="tooltip-header">' +
        '<span class="tooltip-source"></span>' +
        '<span class="tooltip-reliability"></span>' +
      '</div>' +
      '<div class="tooltip-original"></div>' +
      '<div class="tooltip-translation"></div>' +
      '<div class="tooltip-meta">' +
        '<span class="tooltip-dynasty"></span>' +
        '<span class="tooltip-author"></span>' +
      '</div>';
    document.body.appendChild(citationTooltip);
  }

  function showCitation(citationId, x, y) {
    if (!citationTooltip) initCitationTooltip();

    DataLoader.getCitation(citationId).then(function(cit) {
      if (!cit) {
        hideCitation();
        return;
      }

      citationTooltip.querySelector('.tooltip-source').textContent = cit.source;
      citationTooltip.querySelector('.tooltip-original').textContent = cit.original;
      citationTooltip.querySelector('.tooltip-translation').textContent = cit.translation;
      citationTooltip.querySelector('.tooltip-dynasty').textContent = cit.dynasty + ' · ' + cit.author;
      citationTooltip.querySelector('.tooltip-author').textContent = '';

      var relEl = citationTooltip.querySelector('.tooltip-reliability');
      relEl.textContent = cit.reliability === 'high' ? '可靠' :
                          cit.reliability === 'medium' ? '参考' : '存疑';
      relEl.className = 'tooltip-reliability ' + (cit.reliability || 'medium');

      var rect = citationTooltip.getBoundingClientRect();
      var tipX = x + 15;
      var tipY = y - rect.height - 10;

      if (tipX + rect.width > window.innerWidth - 10) {
        tipX = x - rect.width - 15;
      }
      if (tipY < 10) {
        tipY = y + 20;
      }

      citationTooltip.style.left = tipX + 'px';
      citationTooltip.style.top = tipY + 'px';
      citationTooltip.classList.add('visible');
    }).catch(function() {
      hideCitation();
    });
  }

  function hideCitation() {
    if (citationTooltip) {
      citationTooltip.classList.remove('visible');
    }
  }

  /* ================================================================
     Modal — 通用模态框
     ================================================================ */

  function initModal() {
    if (modalOverlay) return;

    modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML =
      '<div class="modal-box">' +
        '<h2 class="modal-title"></h2>' +
        '<p class="modal-message"></p>' +
        '<div class="modal-actions"></div>' +
      '</div>';
    document.body.appendChild(modalOverlay);

    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        hideModal();
      }
    });
  }

  function showConfirm(title, message, onConfirm, onCancel) {
    if (!modalOverlay) initModal();

    modalOverlay.querySelector('.modal-title').textContent = title;
    modalOverlay.querySelector('.modal-message').textContent = message;

    var actionsEl = modalOverlay.querySelector('.modal-actions');
    actionsEl.innerHTML = '';

    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'title-btn btn-primary';
    confirmBtn.textContent = '确认';
    confirmBtn.addEventListener('click', function() {
      hideModal();
      if (onConfirm) onConfirm();
    });

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'title-btn btn-ghost';
    cancelBtn.textContent = '取消';
    cancelBtn.addEventListener('click', function() {
      hideModal();
      if (onCancel) onCancel();
    });

    actionsEl.appendChild(cancelBtn);
    actionsEl.appendChild(confirmBtn);
    modalOverlay.classList.add('active');
  }

  function showAlert(title, message, onClose) {
    if (!modalOverlay) initModal();

    modalOverlay.querySelector('.modal-title').textContent = title;
    modalOverlay.querySelector('.modal-message').textContent = message;

    var actionsEl = modalOverlay.querySelector('.modal-actions');
    actionsEl.innerHTML = '';

    var okBtn = document.createElement('button');
    okBtn.className = 'title-btn btn-primary';
    okBtn.textContent = '确定';
    okBtn.addEventListener('click', function() {
      hideModal();
      if (onClose) onClose();
    });

    actionsEl.appendChild(okBtn);
    modalOverlay.classList.add('active');
  }

  function hideModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }

  /* ================================================================
     TypeWriter — 打字机效果
     ================================================================ */

  function _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * 在指定元素中启动打字机效果
   * @param {HTMLElement} el - 显示文字的元素
   * @param {string} text - 完整文本
   * @param {number} speed - 每个字的延迟（ms）
   * @param {Function} onComplete - 完成回调
   * @returns {Function} skip - 调用以立即显示全文
   */
  function typewriter(el, text, speed, onComplete) {
    if (!el || !text) return function() {};

    var index = 0;
    var timer = null;
    var finished = false;
    speed = speed || 50;

    function type() {
      if (finished) return;
      if (index < text.length) {
        index++;
        // 用 innerHTML 逐步显示文本 + 光标（避免 textContent 覆盖光标 span）
        el.innerHTML = _escapeHtml(text.substring(0, index)) +
          '<span class="typewriter-cursor"></span>';
        timer = setTimeout(type, speed);
      } else {
        finished = true;
        el.textContent = text;  // 完成：移除光标，显示纯文本
        if (onComplete) onComplete();
      }
    }

    // 初始化：只显示光标
    el.innerHTML = '<span class="typewriter-cursor"></span>';
    timer = setTimeout(type, speed);

    // 返回 skip 函数
    return function skip() {
      if (finished) return false;
      clearTimeout(timer);
      el.textContent = text;  // 直接显示全文
      finished = true;
      if (onComplete) onComplete();
      return true;
    };
  }

  /* ================================================================
     init / cleanup
     ================================================================ */

  function init() {
    initCitationTooltip();
    initModal();
  }

  return {
    init: init,
    showCitation: showCitation,
    hideCitation: hideCitation,
    showConfirm: showConfirm,
    showAlert: showAlert,
    hideModal: hideModal,
    typewriter: typewriter
  };
})();
