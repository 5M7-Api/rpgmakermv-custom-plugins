/*:
 * @plugindesc 技能类型机制扩展插件
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * 
 * @help
 * 
 * 本插件通过给技能不同的备注添加不同的机制，其中[x]等替代符代表技能的id数字。
 * 
 * 1、使用备注 <LimitUse:[x]> 来限制该技能在每场战斗中最多使用 x 次。
 * 
 * <LimitUse:3> 限制此技能在每场战斗中最多使用 3 次。
 * 
 * 2、使用备注 <ComboSkills:[x],[y],[z]> 来定义连携技能序列。
 * 
 * <ComboSkills:10,11,12> 定义连携技能依次释放顺序为 10 -> 11 -> 12。
 * 当使用定义的连携技时，结算当前技能完毕将依次对同一目标使用这些id的技能，目标已死亡或目标数不统一的情况将选择随机目标。
 * 除添加备注的技能外，后续连携的技能可以不是释放者可习得的或可使用的，使用时为强制使用。
 * 
 * 3、使用备注 <SwapTo:[x]> 来定义技能临时替换，id为x的技能将在本次战斗中替代原技能。
 * 
 * <SwapTo:10> 技能 10 将在本场战斗中临时替换原技能。支持连续替换的链式操作。
 * 需注意替换的所有技能必须是使用者可使用的或可习得的技能，否则替换后会技能会直接消失。
 */

(function () {

    //==============================
    // ▶️ ComboSkillSystem（连携技功能）
    //==============================
    function ComboSkillSystem() {
        // console.log('[ComboSkill] 加载连携技能系统');
        var _startAction = BattleManager.startAction;
        var _endAction = BattleManager.endAction;

        BattleManager._comboInProgress = false;
        BattleManager._comboTargetIndexes = [];

        BattleManager.startAction = function () {
            var subject = this._subject;
            var action = subject.currentAction();
            if (!action) return;

            // 获取输入的action对象（技能或物品使用指令）
            var item = action.item();
            // 判断当前技能是否是连携技能
            if (!action._isComboSkill) {
                var targets = action.makeTargets();
                this._comboTargetIndexes = targets.map(function (target) {
                    return target.index();
                });

                var meta = item.meta.ComboSkills;  // 读取备注中的 <ComboSkills:x,y,z>
                if (meta) {
                    // 解析连携技能的id
                    var comboIds = meta.split(',').map(function (id) {
                        return parseInt(id.trim(), 10);
                    }).filter(function (id) {
                        return !isNaN(id); // 过滤非法数据
                    });

                    if (comboIds.length > 0) {
                        // 倒序插入连携技能，使其在初始技能后按顺序执行
                        for (var i = comboIds.length - 1; i >= 0; i--) {
                            // 创建新的action实例再插入到队列中
                            var comboAction = new Game_Action(subject, false);
                            comboAction.setSkill(comboIds[i]);
                            comboAction._isComboSkill = true; // 标记连携进程开始
                            comboAction._comboIndex = this._comboTargetIndexes[0];
                            subject._actions.splice(1, 0, comboAction);
                            // console.log('[ComboSkill] 插入连携技能 ID:', comboIds[i], '目标索引:', comboAction._comboIndex);
                        }
                    }
                }
            } else {
                // 连携技能释放逻辑，防止目标偏移原选择目标
                var targetIndex = action._comboIndex;
                if (targetIndex != null && action.isForOpponent()) {
                    var target = $gameTroop.members()[targetIndex];
                    if (target && target.isAlive()) {
                        action.setTarget(targetIndex); // 强制目标为原始目标
                        // console.log('[ComboSkill] 连携技能目标强制设为敌人索引:', targetIndex);
                    } else {
                        // console.log('[ComboSkill] 连携技能原目标已死亡，使用默认目标选择机制');
                    }
                }
            }

            this._comboInProgress = !!action._isComboSkill; //标记连携进程是否开始
            _startAction.call(this); // 执行实际的startAction逻辑
        };

        BattleManager.endAction = function () {
            _endAction.call(this);
            this._comboInProgress = false;
        };
    }

    //==============================
    // ✅ LimitUseSystem（限定技功能）
    //==============================
    function LimitUseSystem() {
        // console.log('[LimitUse] 加载技能使用次数限制系统');
        var _BattleManager_startBattle = BattleManager.startBattle;
        BattleManager.startBattle = function () {
            _BattleManager_startBattle.call(this);
            // console.log('[LimitUse] 战斗开始，初始化技能使用计数');

            $gameParty.members().forEach(function (actor) {
                actor._skillUseCounts = {};
                // console.log('[LimitUse] 初始化我方角色技能计数:', actor.name());
            });

            $gameTroop.members().forEach(function (enemy) {
                enemy._skillUseCounts = {};
                // console.log('[LimitUse] 初始化敌方单位技能计数:', enemy.name());
            });
        };

        var _Game_Battler_useItem = Game_Battler.prototype.useItem;
        Game_Battler.prototype.useItem = function (item) {
            _Game_Battler_useItem.call(this, item);
            // 检查指令确实使用一个技能，若是则记录技能使用了几次
            if (DataManager.isSkill(item)) {
                this._skillUseCounts = this._skillUseCounts || {};
                var count = this._skillUseCounts[item.id] || 0;
                this._skillUseCounts[item.id] = count + 1;
                // console.log('[LimitUse] 使用技能:', item.name, '| 当前次数:', this._skillUseCounts[item.id]);
            }
        };

        var _Game_BattlerBase_meetsSkillConditions = Game_BattlerBase.prototype.meetsSkillConditions;
        // 此源代码方法再canUse中判断，指令为技能时的使用条件
        Game_BattlerBase.prototype.meetsSkillConditions = function (skill) {
            var result = _Game_BattlerBase_meetsSkillConditions.call(this, skill);
            if (!result) return false;
            // 增加限定技判断逻辑
            var note = skill.note || '';
            var match = note.match(/<LimitUse:(\d+)>/i);
            if (match) {
                var limit = Number(match[1]);
                this._skillUseCounts = this._skillUseCounts || {};
                var used = this._skillUseCounts[skill.id] || 0;
                var available = used < limit;

                // console.log('[LimitUse] 检查技能:', skill.name, '| 使用次数:', used, '/', limit, '| 可用:', available);
                return available;
            }

            return true;
        };
    }

    //==============================
    // 🔁 SkillSwapSystem（转换技功能）
    //==============================
    function SkillSwapSystem() {
        // console.log('[SkillSwap] 加载技能替换系统');

        // 初始化技能映射
        var _BattleManager_startBattle = BattleManager.startBattle;
        BattleManager.startBattle = function () {
            _BattleManager_startBattle.call(this);
            // 用于记录技能ID => 替换后技能ID
            $gameParty.members().forEach(function (actor) {
                actor._skillSwapMap = {};
            });
            $gameTroop.members().forEach(function (enemy) {
                enemy._skillSwapMap = {};
            });
        };

        // 清理技能映射
        var _BattleManager_endBattle = BattleManager.endBattle;
        BattleManager.endBattle = function () {
            _BattleManager_endBattle.call(this);
            $gameParty.members().forEach(function (actor) {
                actor._skillSwapMap = {};
            });
            $gameTroop.members().forEach(function (enemy) {
                enemy._skillSwapMap = {};
            });
        };

        // 使用技能时记录替换关系
        var _Game_Battler_useItem = Game_Battler.prototype.useItem;
        Game_Battler.prototype.useItem = function (item) {
            _Game_Battler_useItem.call(this, item);

            if (DataManager.isSkill(item)) {
                var note = item.note || '';
                var match = note.match(/<SwapTo:(\d+)>/i); // 获取备注中的 <SwapTo:x>
                if (match) {
                    var swapId = Number(match[1]);
                    if (!isNaN(swapId)) {
                        this._skillSwapMap = this._skillSwapMap || {};
                        this._skillSwapMap[item.id] = swapId;
                        // console.log('[SkillSwap] 技能ID', item.id, '被临时替换为', swapId);

                        // 👇 强制刷新技能窗口显示（如果当前是技能场景）
                        if (SceneManager._scene && SceneManager._scene._itemWindow) {
                            SceneManager._scene._itemWindow.refresh();
                        }
                    }
                }
            }
        };
        // 替换战斗执行用的技能 ID
        var _Game_Action_setSkill = Game_Action.prototype.setSkill;
        Game_Action.prototype.setSkill = function (skillId) {
            var battler = this.subject();

            if (battler && battler._skillSwapMap) {
                var visited = {}; // 用于防止循环替换
                var depth = 0;
                var MAX_DEPTH = 10; // 防止递归死循环，最大只能替换10次

                // 链式递归转换
                while (battler._skillSwapMap[skillId] && !visited[skillId] && depth < MAX_DEPTH) {
                    visited[skillId] = true;
                    var newSkillId = battler._skillSwapMap[skillId];
                    // console.log('[SkillSwap] 链式替换', skillId, '=>', newSkillId);
                    skillId = newSkillId;
                    depth++;
                }

                if (depth >= MAX_DEPTH) {
                    console.warn('[SkillSwap] 替换链过长，已中止处理。最后技能ID:', skillId);
                }
            }

            _Game_Action_setSkill.call(this, skillId);
        };

        // 替换 UI 显示中的技能列表，涉及到makeItemList的窗口构造方法
        var _Game_Actor_skills = Game_Actor.prototype.skills;
        Game_Actor.prototype.skills = function () {
            var list = _Game_Actor_skills.call(this);
            if (!this._skillSwapMap) return list; // 如果不存在替换逻辑就直接返回原技能列表
            // 遍历我方角色的所有技能列表
            var swapped = list.map(function (skill) {
                var finalSkill = skill;
                var visited = {};
                var depth = 0;
                var MAX_DEPTH = 10;

                while (this._skillSwapMap[finalSkill.id] && !visited[finalSkill.id] && depth < MAX_DEPTH) {
                    visited[finalSkill.id] = true;
                    var swapId = this._skillSwapMap[finalSkill.id];
                    if ($dataSkills[swapId]) {
                        finalSkill = $dataSkills[swapId]; // 替换掉被转换的技能
                        depth++;
                    } else {
                        break;
                    }
                }

                if (depth >= MAX_DEPTH) {
                    console.warn('[SkillSwap UI] 替换链过长，已中止处理，最终显示技能:', finalSkill.name);
                }

                return finalSkill;
            }, this);

            return swapped;
        };

    }

    //==============================
    // 🔽 初始化函数模块
    //==============================
    ComboSkillSystem();
    LimitUseSystem();
    SkillSwapSystem();

})();
