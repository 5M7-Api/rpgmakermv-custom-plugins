/*:
 * @plugindesc 特殊状态机制扩展插件（延迟伤害类）
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * 
 * @help
 * 使用说明：
 * 
 * 需注意下面的所有状态是独立单元，代表它们均可运用在敌我双方身上。
 * 
 * - <TransformAfter:[x],[y],[z]>
 *   表示该状态在拥有此状态单位[x]回合后的回合开始时自动替换id为[y]的状态，并播放动画id[z]（默认为1）。
 * 
 * - <TransformMessage:文本内容>
 *   转换状态时在战斗日志窗口弹出的文本.这个文本内容之前会自动添加状态单位的名字。
 * 
 * - <DamageRate:[x]>
 *   表示单位造成的所有最终伤害将乘以 x（如 1.5 表示 +50% 伤害，0.8 表示减少20%）。
 *   多个状态会乘叠加（如1.2和1.5将变成1.8倍）。
 * 
 * - <ignoreDefense:[x],[y]>
 *   拥有此状态的单位造成伤害时，将目标的物理/魔法防御重新乘以 x 和 y 代入到伤害公式
 * （如 1.5 表示 +50% 物理/魔法防御计算，0.8 表示 -20% 物理/魔法防御计算）。
 * 
 * - <ExtraSkillCast:[x]>
 *   拥有此状态的单位在使用技能将额外释放 x 次，额外释放的技能没有消耗。 
 * 
 */

(function () {

    var FILE_NAME = 'State_BuffCore_5M7';
    var parameters = PluginManager.parameters(FILE_NAME);

    /** 用于在战斗画面显示弹出消息 */
    Window_BattleLog.prototype.pushTimedText = function (text, duration, name) {
        this.push('addText', name + text);              // 添加一行
        this.push('waitForNewLine');             // 等待显示完毕
        this.push('wait', duration || 60);       // 停留 n 帧（默认 1 秒）
        this.push("clear"); // 清除整个文本
    };


    /** 用于处理在几回合转换状态 */
    function transformAfter() {
        var _Game_Battler_addNewState = Game_Battler.prototype.addNewState;
        Game_Battler.prototype.addNewState = function (stateId) {
            _Game_Battler_addNewState.call(this, stateId);
            var state = $dataStates[stateId];
            if (!this._transformStateTurns) {
                this._transformStateTurns = {};
            }
            var note = state.note || "";
            var regex = /<TransformAfter\s*:\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*(\d+))?>/i;
            var match = regex.exec(note);
            if (match) {
                var turns = parseInt(match[1], 10);
                var targetId = parseInt(match[2], 10);
                var animationId = match[3] ? parseInt(match[3], 10) : 1; // 默认为1

                var messageRegex = /<TransformMessage:(.+)>/i;
                var messageMatch = messageRegex.exec(note);
                var transformMessage = messageMatch ? messageMatch[1].trim() : null;

                this._transformStateTurns[stateId] = {
                    turnsLeft: turns,
                    targetId: targetId,
                    animationId: animationId,
                    transformMessage: transformMessage
                };

                // console.log('[TransformAfter] 添加状态 ID:', stateId, '将在', turns, '回合后变为状态 ID:', targetId, '动画ID:', animationId, '目标:', this.name());
            }
        };

        // 减少倒计时 — 挂载到单位回合结束时调用
        Game_Battler.prototype.reduceTransformStateTurns = function () {
            if (!this._transformStateTurns) return;

            var keys = Object.keys(this._transformStateTurns);
            for (var i = 0; i < keys.length; i++) {
                var stateId = Number(keys[i]);
                if (!this.isStateAffected(stateId)) continue;

                var data = this._transformStateTurns[stateId];
                data.turnsLeft -= 1;
                // console.log('[TransformAfter] 减少回合数:', this.name(), '状态ID:', stateId, '剩余回合:', data.turnsLeft);
            }
        };

        // 状态转换 — 挂载到单位行动开始时调用
        Game_Battler.prototype.checkAndTransformState = function () {
            if (!this._transformStateTurns) return;

            var keys = Object.keys(this._transformStateTurns);
            for (var i = 0; i < keys.length; i++) {
                var stateId = Number(keys[i]);
                if (!this.isStateAffected(stateId)) continue;

                var data = this._transformStateTurns[stateId];
                if (data.turnsLeft <= 0) {
                    // console.log('[TransformAfter] 状态ID:', stateId, '到期，转换为状态ID:', data.targetId);

                    var isEnemy = this.isEnemy();

                    // 播放转换动画
                    this.startAnimation(data.animationId, isEnemy, 0);

                    // 移除旧状态，添加新状态
                    this.removeState(stateId);
                    this.addState(data.targetId);

                    // 显示自定义日志消息
                    if (data.transformMessage && BattleManager._logWindow) {
                        BattleManager._logWindow.pushTimedText(data.transformMessage, 90, this.name()); // 停留 90 帧（约 1.5 秒）
                    }
                }
            }
        };

        // 挂载到单位回合结束时，减少状态倒计时
        var _Game_Battler_onTurnEnd = Game_Battler.prototype.onTurnEnd;
        Game_Battler.prototype.onTurnEnd = function () {
            _Game_Battler_onTurnEnd.call(this);
            this.reduceTransformStateTurns();
        };

        var _BattleManager_startInput = BattleManager.startInput;
        BattleManager.startInput = function () {
            var members = this.allBattleMembers();
            for (var i = 0; i < members.length; i++) {
                var battler = members[i];
                if (battler && battler.checkAndTransformState) {
                    battler.checkAndTransformState();
                }
            }
            _BattleManager_startInput.call(this);
        };


        var _Game_Battler_removeState = Game_Battler.prototype.removeState;
        Game_Battler.prototype.removeState = function (stateId) {
            _Game_Battler_removeState.call(this, stateId);
            if (this._transformStateTurns && this._transformStateTurns[stateId]) {
                // console.log('[TransformAfter] 移除状态 ID:', stateId, '，清除倒计时记录，目标:', this.name());
                delete this._transformStateTurns[stateId];
            }
        };
    }

    /** 处理伤害倍率状态机制 */
    function damageRateModifier() {
        var _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;
        Game_Action.prototype.makeDamageValue = function (target, critical) {
            var value = _Game_Action_makeDamageValue.call(this, target, critical);

            var subject = this.subject();
            if (!subject || !subject.states) return value;

            var multiplier = 1.0; // 默认倍率
            var states = subject.states();
            for (var i = 0; i < states.length; i++) {
                var state = states[i];
                var note = state.note || "";
                var match = note.match(/<DamageRate\s*:\s*(\d+\.?\d*)>/i);
                if (match) {
                    var rate = parseFloat(match[1]);
                    if (!isNaN(rate)) {
                        multiplier *= rate; // 叠加乘区
                        // console.log('[DamageRate] 状态ID:', state.id, '倍率:', rate, '当前总倍率:', multiplier);
                    }
                }
            }

            value *= multiplier;
            return Math.round(value); // 最终伤害值四舍五入
        };
    }

    /** 用于实现 <IgnoreDefense> 功能：重计算目标def/mdf */
    function ignoreDefense() {
        var _Game_Action_makeDamageValue = Game_Action.prototype.makeDamageValue;

        Game_Action.prototype.makeDamageValue = function (target, critical) {
            var subject = this.subject();

            // 遍历攻击者的所有状态，查找是否包含 <ignoreDefense:x,y>
            var rates = null;
            subject.states().forEach(function (state) {
                var match = /<ignoreDefense\s*:\s*([\d.]+)\s*,\s*([\d.]+)>/i.exec(state.note);
                if (match) {
                    rates = {
                        defRate: parseFloat(match[1]), // 物理防御倍率
                        mdfRate: parseFloat(match[2])  // 魔法防御倍率
                    };
                }
            });

            if (rates) {
                // console.log('[IgnoreDefense] 触发，倍率：', rates);

                var fakeTarget = Object.create(target);

                // 只修改 param(id) 中 id = 3（def）、5（mdf）的数值，其它保持原样
                fakeTarget.param = function (id) {
                    var original = target.param(id);
                    /** Game_BattlerBase.prototype 的 原型重载位置定义 */
                    if (id === 3) return original * rates.defRate; // DEF
                    if (id === 5) return original * rates.mdfRate; // MDF
                    return original;
                };

                return _Game_Action_makeDamageValue.call(this, fakeTarget, critical);
            }

            return _Game_Action_makeDamageValue.call(this, target, critical);
        };
    }

    /** 用于实现多轮技能释放 */
    function extraSkillCast() {
        var _Game_Action_numRepeats = Game_Action.prototype.numRepeats;
        /** 覆盖 Game_Action.prototype.numRepeats，用于扩展技能的连续释放次数。 */
        Game_Action.prototype.numRepeats = function () {
            var base = _Game_Action_numRepeats.call(this);
            var subject = this.subject();
    
            if (!this.isSkill()) return base; // 非技能直接返回原始逻辑

            var extra = 0;
            var states = subject.states();
            for (var i = 0; i < states.length; i++) {
                var match = /<ExtraSkillCast\s*:\s*(\d+)>/i.exec(states[i].note);
                if (match) {
                    extra += parseInt(match[1]);
                }
            }
            // 返回总共要执行的次数（原始 + 额外）
            return base + extra;
        };
    
        //  禁止行动指令重复扣除消耗（只在第1次时扣除）
        var _Game_Battler_useItem = Game_Battler.prototype.useItem;
        Game_Battler.prototype.useItem = function (item) {
            if (BattleManager._action && BattleManager._action._repeatsUsed) return;
            BattleManager._action._repeatsUsed = true;
            _Game_Battler_useItem.call(this, item);
        };
    
        // 清除 useItem 状态（每次技能释放时重置）
        var _BattleManager_startAction = BattleManager.startAction;
        BattleManager.startAction = function () {
            if (this._action) {
                this._action._repeatsUsed = false;
            }
            _BattleManager_startAction.call(this);
        };
    }
    
    
    // 模块化注册插件功能模块
    extraSkillCast();
    transformAfter();
    damageRateModifier();
    ignoreDefense();

})();
