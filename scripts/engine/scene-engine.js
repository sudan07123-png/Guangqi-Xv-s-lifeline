/**
 * SceneEngine — 场景引擎
 *
 * 驱动叙事页面的核心逻辑：
 * 1. 加载章节 JSON
 * 2. 逐步推进 steps（narration / dialogue / inner / choice / transition）
 * 3. 管理打字机效果、立绘显示、背景切换
 * 4. 将每一步通知给 NarrativePage 渲染
 */
const SceneEngine = (function() {
  var currentChapter = null;
  var currentScene = null;
  var currentStepIndex = 0;
  var steps = [];
  var isPlaying = false;
  var autoAdvanceTimer = null;

  /**
   * 加载章节数据
   */
  function loadChapter(chapterId) {
    return DataLoader.loadChapter(chapterId).then(function(data) {
      if (!data) {
        console.error('[SceneEngine] Failed to load chapter:', chapterId);
        return false;
      }
      currentChapter = data;
      return true;
    });
  }

  /**
   * 进入指定场景
   */
  function enterScene(sceneId) {
    if (!currentChapter || !currentChapter.scenes) {
      console.error('[SceneEngine] No chapter loaded. currentChapter:', currentChapter);
      return false;
    }

    var scene = currentChapter.scenes[sceneId];
    if (!scene) {
      console.error('[SceneEngine] Scene not found:', sceneId, 'available:', Object.keys(currentChapter.scenes));
      return false;
    }

    currentScene = scene;
    currentStepIndex = 0;
    steps = scene.steps || [];
    isPlaying = true;

    // 更新状态
    StateManager.set('currentChapter', currentChapter.chapterId);
    StateManager.set('currentScene', sceneId);

    // 触发场景开始事件
    EventBus.emit('scene:enter', {
      chapterId: currentChapter.chapterId,
      scene: scene
    });

    // 渲染场景框架
    EventBus.emit('scene:setup', {
      background: scene.background,
      bgm: scene.bgm,
      title: scene.title,
      location: scene.location
    });

    // 开始第一步
    advanceStep();
    return true;
  }

  /**
   * 获取当前步骤
   */
  function getCurrentStep() {
    if (currentStepIndex < steps.length) {
      return steps[currentStepIndex];
    }
    return null;
  }

  /**
   * 推进到下一步
   */
  function advanceStep() {
    if (!isPlaying) return;

    var step = getCurrentStep();
    if (!step) {
      // 场景结束
      endScene();
      return;
    }

    EventBus.emit('step:render', { step: step, index: currentStepIndex });

    // 处理自动推进的类型
    if (step.type === 'narration' && step.delay && step.delay > 0 && !step.citationRef) {
      autoAdvanceTimer = setTimeout(function() {
        currentStepIndex++;
        advanceStep();
      }, step.delay);
    } else if (step.type === 'transition') {
      handleTransition(step);
    }
    // dialogue / inner / choice 等待用户点击/选择
  }

  /**
   * 用户点击推进（或空格键）
   * 注意：打字机跳过逻辑在 narrative-page.js 的点击处理中
   */
  function userAdvance() {
    if (!isPlaying) return;

    // 清除自动推进定时器
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    var step = getCurrentStep();
    if (!step) {
      endScene();
      return;
    }

    // choice 类型不响应点击推进
    if (step.type === 'choice') return;

    // 推进步骤
    currentStepIndex++;
    advanceStep();
  }

  /**
   * 处理转场
   */
  function handleTransition(step) {
    if (step.triggerEnding) {
      if (step.setFlags) {
        for (var k = 0; k < step.setFlags.length; k++) {
          StateManager.addFlag(step.setFlags[k]);
        }
      }
      if (typeof SaveSystem !== 'undefined') {
        SaveSystem.autoSave();
      }
      _resolveAndNavigateEnding();
      return;
    }

    if (step.endChapter) {
      if (step.setFlags) {
        for (var i = 0; i < step.setFlags.length; i++) {
          StateManager.addFlag(step.setFlags[i]);
        }
      }
      if (typeof SaveSystem !== 'undefined') {
        SaveSystem.autoSave();
      }
      EventBus.emit('chapter:complete', {
        chapterId: currentChapter.chapterId,
        nextChapter: step.nextChapter
      });
      setTimeout(function() {
        Router.navigate('#/map');
      }, 1200);
      return;
    }

    if (step.nextScene) {
      var nextSceneId = step.nextScene;
      if (step.setFlags) {
        for (var j = 0; j < step.setFlags.length; j++) {
          StateManager.addFlag(step.setFlags[j]);
        }
      }
      setTimeout(function() {
        enterScene(nextSceneId);
      }, 800);
    }
  }

  /**
   * 处理玩家选项
   */
  function handleChoice(option) {
    ChoiceSystem.applyEffects(option.effects);

    // 检查选项是否直接触发结局判定
    if (option.effects && option.effects.triggerEnding) {
      StateManager.set('triggeredEnding', true);
      isPlaying = false;
      _resolveAndNavigateEnding();
      return;
    }

    var endingId = StateManager.get('triggeredEnding');
    if (endingId && endingId !== true) {
      isPlaying = false;
      setTimeout(function() {
        Router.navigate('#/ending/' + endingId);
      }, 1000);
      return;
    }

    var nextSceneId = ChoiceSystem.getNextScene(option.effects);
    if (nextSceneId) {
      currentStepIndex = 0;
      setTimeout(function() {
        enterScene(nextSceneId);
      }, 600);
    } else {
      currentStepIndex++;
      advanceStep();
    }
  }

  /**
   * 内部：加载结局数据，判定结局，导航到结局页
   */
  function _resolveAndNavigateEnding() {
    DataLoader.loadEndings().then(function(endingsData) {
      if (!endingsData) {
        console.error('[SceneEngine] Failed to load endings data!');
        Router.navigate('#/ending/ending_huitong');
        return;
      }

      var endingId = ChoiceSystem.evaluateEnding(endingsData);
      StateManager.set('triggeredEnding', endingId);
      StateManager.unlockEnding(endingId);

      if (typeof SaveSystem !== 'undefined') {
        SaveSystem.autoSave();
      }

      setTimeout(function() {
        Router.navigate('#/ending/' + endingId);
      }, 1500);
    }).catch(function(err) {
      console.error('[SceneEngine] Error resolving ending:', err);
      Router.navigate('#/ending/ending_huitong');
    });
  }

  /**
   * 场景结束
   */
  function endScene() {
    isPlaying = false;
    EventBus.emit('scene:end', {
      chapterId: currentChapter ? currentChapter.chapterId : null,
      scene: currentScene
    });
  }

  /**
   * 获取当前章节信息
   */
  function getCurrentChapterInfo() {
    if (!currentChapter) return null;
    return {
      id: currentChapter.chapterId,
      title: currentChapter.title,
      subtitle: currentChapter.subtitle
    };
  }

  /**
   * 重置引擎
   */
  function reset() {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    currentChapter = null;
    currentScene = null;
    currentStepIndex = 0;
    steps = [];
    isPlaying = false;
  }

  return {
    loadChapter: loadChapter,
    enterScene: enterScene,
    advanceStep: advanceStep,
    userAdvance: userAdvance,
    handleChoice: handleChoice,
    getCurrentStep: getCurrentStep,
    getCurrentChapterInfo: getCurrentChapterInfo,
    reset: reset
  };
})();
