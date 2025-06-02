/*:
 * @plugindesc 特殊状态机制扩展插件（延迟伤害类）
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * 
 * @param DamageInAnimationId
 * @type number
 * @min 0
 * @desc DamageIn 状态结算时播放的动画 ID，0 表示不播放动画。
 * @default 1
 * 
 * @param AccumulateDamageAnimationId
 * @type number
 * @min 0
 * @desc AccumulateDamage 状态结算时播放的动画 ID，0 表示不播放动画。
 * @default 1
 * 
 * @help
 * 使用说明：
 * 
 * 需注意下面的所有状态是独立单元，代表它们均可运用在敌我双方身上。
 * 
 * - <DamageIn:[x],[y]> 
 *   表示目标单位拥有此状态时，会在x回合的回合阶段受到y%的hp伤害。
 * 
 * - <AccumulateDamage:[x],[y]> 
 *   表示目标单位拥有此状态时，会在x回合内累计受到的所有hp伤害，x回合结束时受到上述累计伤害的y%的hp伤害。
 * 
 * - <OnActionEndSkill:[x]>
 *   表示目标在拥有此状态时，任意单位行动结束都会对自身使用ID为x的的技能（包括动画和附加效果），目标来源和对象均为自身。
 * 
 */

(function () {

    var FILE_NAME = 'State_DamageDelay_5M7';
    var parameters = PluginManager.parameters(FILE_NAME);
    var damageInAnimId = Number(parameters['DamageInAnimationId'] || 0);
    var accumulateAnimId = Number(parameters['AccumulateDamageAnimationId'] || 0);

    /**
     * 处理具有 [DamageIn:x,y] 或 [AccumulateDamage:x,y] 状态的战斗单位，在状态回合数耗尽时造成伤害并移除状态。
     *
     * @param {Game_Battler} battler - 要处理的战斗单位（角色或敌人）。
     * @param {Object.<string, { turns: number, percent: number, damage?: number }>} trackers - 状态追踪器对象，键为状态ID，值包含剩余回合数、伤害百分比和累计伤害（仅对 AccumulateDamage 有效）。
     * @param {number} animId - 受击时播放的动画 ID，若为 0 则不播放动画。
     * @param {boolean} isAccumulate - 是否为累计伤害类型。如果为 true，则从 `data.damage` 计算；否则以最大 HP 为基准。
     *
     * @example
     * // 示例调用方式（如在回合结束时处理所有单位）
     * processStateDamage(actor, actor._damageInStates, 45, false);         // 普通百分比伤害
     * processStateDamage(enemy, enemy._accumulateDamageStates, 88, true);  // 累计伤害
     */
    function processStateDamage(battler, trackers, animId, isAccumulate) {
        for (var stateId in trackers) {
            if (trackers.hasOwnProperty(stateId)) {
                var idNum = Number(stateId);
                var data = trackers[stateId];
                data.turns--; // 造成伤害回合倒计时

                var stateName = $dataStates[idNum] ? $dataStates[idNum].name : ('ID ' + idNum);
                var type = isAccumulate ? '[AccumulateDamage]' : '[DamageIn]';
                // console.log(type + ' ' + battler.name() + ' 的状态 "' + stateName + '" 剩余回合：' + data.turns);

                if (data.turns <= 0) {
                    if (battler.isAlive()) {
                        var dmg = isAccumulate
                            ? Math.floor(data.damage * data.percent / 100)
                            : Math.floor(battler.mhp * data.percent / 100);
                        // console.log(type + ' ' + battler.name() + ' 造成伤害：' + dmg + ' HP');
                        battler.gainHp(-dmg);
                        battler.startDamagePopup();
                        if (animId > 0) {
                            var isEnemy = battler.isEnemy();
                            battler.startAnimation(animId, isEnemy, 0);
                        }
                        battler.refresh();
                        battler.removeState(idNum);
                    } else {
                        // console.log(type + ' ' + battler.name() + ' 已死亡，跳过处理');
                    }
                    delete trackers[stateId];
                }
            }
        }
    }

    function damageInTurnEndState() {
        var _initMembers = Game_Battler.prototype.initMembers;
        Game_Battler.prototype.initMembers = function () {
            _initMembers.call(this);
            this._damageTimers = {};
            this._accumulateDamageTrackers = {};
        };

        var _addNewState = Game_Battler.prototype.addNewState;
        Game_Battler.prototype.addNewState = function (stateId) {
            _addNewState.call(this, stateId);
            var state = $dataStates[stateId];
            if (!state || !state.note) return;

            var match1 = state.note.match(/<DamageIn:(\d+),(\d+)>/i);
            if (match1) {
                this._damageTimers[stateId] = {
                    turns: parseInt(match1[1]),
                    percent: parseInt(match1[2])
                };
                // console.log('[DamageIn] "' + state.name + '" 添加：' + match1[1] + ' 回合后伤害 ' + match1[2] + '%');
            }

            var match2 = state.note.match(/<AccumulateDamage:(\d+),(\d+)>/i);
            if (match2) {
                this._accumulateDamageTrackers[stateId] = {
                    turns: parseInt(match2[1]),
                    percent: parseInt(match2[2]),
                    damage: 0
                };
                // console.log('[AccumulateDamage] "' + state.name + '" 添加：累计 ' + match2[1] + ' 回合，转化为 ' + match2[2] + '% 伤害');
            }
        };

        var _gainHp = Game_Battler.prototype.gainHp;
        Game_Battler.prototype.gainHp = function (value) {
            if (value < 0 && this._accumulateDamageTrackers) {
                for (var stateId in this._accumulateDamageTrackers) {
                    if (this._accumulateDamageTrackers.hasOwnProperty(stateId)) {
                        this._accumulateDamageTrackers[stateId].damage += -value;
                        // console.log('[AccumulateDamage] ' + this.name() + ' 累计伤害增加：' + (-value));
                    }
                }
            }
            _gainHp.call(this, value);
        };

        var _onTurnEnd = Game_Battler.prototype.onTurnEnd;
        Game_Battler.prototype.onTurnEnd = function () {
            _onTurnEnd.call(this);
            if (!$gameParty.inBattle()) return;

            processStateDamage(this, this._damageTimers, damageInAnimId, false);
            processStateDamage(this, this._accumulateDamageTrackers, accumulateAnimId, true);
        };

        var _eraseState = Game_Battler.prototype.eraseState;
        Game_Battler.prototype.eraseState = function (stateId) {
            _eraseState.call(this, stateId);
            if (this._damageTimers.hasOwnProperty(stateId)) {
                // console.log('[DamageIn] 状态 ID ' + stateId + ' 被移除');
                delete this._damageTimers[stateId];
            }
            if (this._accumulateDamageTrackers.hasOwnProperty(stateId)) {
                // console.log('[AccumulateDamage] 状态 ID ' + stateId + ' 被移除');
                delete this._accumulateDamageTrackers[stateId];
            }
        };
    }

    /**
     * 处理行动结束自动触发技能的逻辑
     * @param {Game_Battler} battler - 当前行动者
     * @param {Array} skillList - 技能 ID 列表
     */
    function processEndActionSkills(battler, skillList) {
        for (var i = 0; i < skillList.length; i++) {
            
            var skillId = skillList[i];
            var action = new Game_Action(battler);
            action.setSkill(skillId);
            var skill = $dataSkills[skillId];
            if (!skill) continue;

            // 目标是自己
            var targets = [battler];
            for (var j = 0; j < targets.length; j++) {
                var target = targets[j];
                if (!target.isAlive()) continue;  // 死亡跳过，避免无限动画和伤害弹窗

                var value = action.makeDamageValue(target, false);
                // 使用 apply，使附加状态、命中、伤害都生效
                action.apply(target);
                target.startDamagePopup();
                if (skill.animationId > 0) {
                    target.startAnimation(skill.animationId, battler.isEnemy(), 0);
                }
                // console.log('[OnActionEndSkill] ' + battler.name() + ' 对 ' + target.name() + ' 使用技能 ' + skill.name + ' 造成 ' + value + ' HP 伤害');
                target.refresh();
            }
            // 处理 TP 消耗、公共事件等
            battler.useItem(skill);
        }
    }

    /**
     * 解析状态备注，记录技能 ID，在任意单位行动结束时结算
     */
    function onActionEndSkillDamage() {
        // 初始化追踪字段
        var _initMembers = Game_Battler.prototype.initMembers;
        Game_Battler.prototype.initMembers = function () {
            _initMembers.call(this);
            this._actionEndSkillStates = [];
        };

        // 添加状态时解析备注
        var _addNewState = Game_Battler.prototype.addNewState;
        Game_Battler.prototype.addNewState = function (stateId) {
            _addNewState.call(this, stateId);
            var state = $dataStates[stateId];
            if (!state || !state.note) return;

            var regex = /<OnActionEndSkill\s*:\s*(\d+)>/i;
            var match = state.note.match(regex);
            if (match) {
                var skillId = parseInt(match[1]);
                if (!isNaN(skillId)) {
                    this._actionEndSkillStates.push({
                        skillId: skillId,
                        stateId: stateId
                    });
                    // console.log('[OnActionEndSkill] ' + this.name() + ' 添加技能触发：技能 ID ' + skillId);
                }
            }
        };

        // 移除状态时同步清理
        var _eraseState = Game_Battler.prototype.eraseState;
        Game_Battler.prototype.eraseState = function (stateId) {
            _eraseState.call(this, stateId);
            this._actionEndSkillStates = this._actionEndSkillStates.filter(function (entry) {
                return entry.stateId !== stateId;
            });
        };

        // 战斗结束清理索引
        var _onBattleEnd = Game_Battler.prototype.onBattleEnd;
        Game_Battler.prototype.onBattleEnd = function () {
            _onBattleEnd.call(this);
            this._actionEndSkillStates = [];
        };

        // 任意角色结束时触发函数，但不包括无法行动的单位
        var _endAction = BattleManager.endAction;
        BattleManager.endAction = function () {
            var all = BattleManager.allBattleMembers();
            // console.log('[OnActionEndSkill] 回合结束，处理所有单位行动结束触发技能',all);
            for (var i = 0; i < all.length; i++) {
                var battler = all[i];
                if (battler._actionEndSkillStates && battler._actionEndSkillStates.length > 0) {
                    var skillIds = battler._actionEndSkillStates.map(function (entry) {
                        return entry.skillId;
                    });
                    processEndActionSkills(battler, skillIds);
                }
            }
            _endAction.call(this);
        };
    }

    // 模块化导入功能
    damageInTurnEndState();
    onActionEndSkillDamage();

})();
