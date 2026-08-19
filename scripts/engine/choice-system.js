/**
 * ChoiceSystem — 选项条件评估 & 效果应用
 *
 * 条件格式：
 *   conditions: {
 *     requireFlags: ['flag1', 'flag2'],   // 必须全部拥有
 *     notFlags: ['flag3'],                 // 必须全部没有
 *     requireRelationships: { 'charId': 50 },  // 关系值 >= 指定值
 *     logic: 'and' | 'or'                  // requireFlags 之间的逻辑（默认 and）
 *   }
 *
 * 效果格式：
 *   effects: {
 *     setFlags: ['flag1'],
 *     removeFlags: ['flag2'],
 *     addRelationships: { 'charId': 10 },
 *     nextScene: 'ch01_s02a',
 *     triggerEnding: 'ending_id'
 *   }
 */
const ChoiceSystem = (function() {

  /**
   * 评估单个选项是否可用
   */
  function evaluateCondition(condition) {
    // 无条件 = 始终可用
    if (!condition) return true;

    // requireFlags
    if (condition.requireFlags && condition.requireFlags.length > 0) {
      var logic = condition.logic || 'and';
      if (logic === 'and') {
        for (var i = 0; i < condition.requireFlags.length; i++) {
          if (!StateManager.hasFlag(condition.requireFlags[i])) {
            return false;
          }
        }
      } else if (logic === 'or') {
        var anyTrue = false;
        for (var j = 0; j < condition.requireFlags.length; j++) {
          if (StateManager.hasFlag(condition.requireFlags[j])) {
            anyTrue = true;
            break;
          }
        }
        if (!anyTrue) return false;
      }
    }

    // notFlags
    if (condition.notFlags && condition.notFlags.length > 0) {
      for (var k = 0; k < condition.notFlags.length; k++) {
        if (StateManager.hasFlag(condition.notFlags[k])) {
          return false;
        }
      }
    }

    // requireRelationships
    if (condition.requireRelationships) {
      var relKeys = Object.keys(condition.requireRelationships);
      for (var m = 0; m < relKeys.length; m++) {
        var charId = relKeys[m];
        var required = condition.requireRelationships[charId];
        if (StateManager.getRelationship(charId) < required) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 应用选项效果
   */
  function applyEffects(effects) {
    if (!effects) return;

    // setFlags
    if (effects.setFlags && effects.setFlags.length > 0) {
      for (var i = 0; i < effects.setFlags.length; i++) {
        StateManager.addFlag(effects.setFlags[i]);
      }
    }

    // removeFlags
    if (effects.removeFlags && effects.removeFlags.length > 0) {
      for (var j = 0; j < effects.removeFlags.length; j++) {
        StateManager.removeFlag(effects.removeFlags[j]);
      }
    }

    // addRelationships
    if (effects.addRelationships) {
      var relKeys = Object.keys(effects.addRelationships);
      for (var k = 0; k < relKeys.length; k++) {
        var charId = relKeys[k];
        StateManager.addRelationship(charId, effects.addRelationships[charId]);
      }
    }

    // triggerEnding
    if (effects.triggerEnding) {
      StateManager.set('triggeredEnding', effects.triggerEnding);
      StateManager.unlockEnding(effects.triggerEnding);
    }
  }

  /**
   * 获取选项的下一步场景 ID
   */
  function getNextScene(effects) {
    return effects && effects.nextScene ? effects.nextScene : null;
  }

  /**
   * 根据当前旗标判定结局
   * 按优先级检查所有结局条件，返回第一个匹配的结局 ID
   * 优先级：gold_hidden > gold > silver > bronze
   * @param {Object} endingsData - 从 endings.json 加载的结局数据
   * @returns {string|null} 结局 ID，若不满足任何条件则返回 null
   */
  function evaluateEnding(endingsData) {
    if (!endingsData) return null;

    var rankPriority = ['gold_hidden', 'gold', 'silver', 'bronze'];
    var allEndings = Object.keys(endingsData);

    for (var ri = 0; ri < rankPriority.length; ri++) {
      var rank = rankPriority[ri];
      for (var ei = 0; ei < allEndings.length; ei++) {
        var endingId = allEndings[ei];
        var ending = endingsData[endingId];
        if (ending.rank !== rank) continue;

        var cond = ending.conditions;
        if (!cond) continue;

        if (_checkCondition(cond)) {
          return endingId;
        }
      }
    }

    // 没有结局完全匹配 → 返回默认结局
    console.warn('[ChoiceSystem] No ending condition matched, using fallback: ending_huitong');
    return 'ending_huitong';
  }

  /**
   * 内部：检查条件对象
   */
  function _checkCondition(cond) {
    if (!cond) return true;

    // requireFlags
    if (cond.requireFlags && cond.requireFlags.length > 0) {
      for (var i = 0; i < cond.requireFlags.length; i++) {
        if (!StateManager.hasFlag(cond.requireFlags[i])) {
          return false;
        }
      }
    }

    // notFlags
    if (cond.notFlags && cond.notFlags.length > 0) {
      for (var j = 0; j < cond.notFlags.length; j++) {
        if (StateManager.hasFlag(cond.notFlags[j])) {
          return false;
        }
      }
    }

    // requireRelationships
    if (cond.requireRelationships) {
      var relKeys = Object.keys(cond.requireRelationships);
      for (var k = 0; k < relKeys.length; k++) {
        var charId = relKeys[k];
        var required = cond.requireRelationships[charId];
        if (StateManager.getRelationship(charId) < required) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 过滤可用选项列表
   */
  function filterAvailableOptions(options) {
    return options.filter(function(opt) {
      if (opt.condition) {
        return evaluateCondition(opt.condition);
      }
      return true;
    });
  }

  return {
    evaluateCondition: evaluateCondition,
    applyEffects: applyEffects,
    getNextScene: getNextScene,
    filterAvailableOptions: filterAvailableOptions,
    evaluateEnding: evaluateEnding
  };
})();
