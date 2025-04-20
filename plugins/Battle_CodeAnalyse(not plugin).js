/*:
 * @plugindesc rmmv战斗系统源代码分析core插件（非功能性）
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 仅用于分析战斗系统的源码流程和逻辑，不涉及任何游戏功能扩展。
 * 
 * 已内置所有源码调用的log语句，战斗测试打开控制台查看。
 */

(function () {
    /** 战斗场景转换的实际函数 */
    Scene_Battle.prototype.start = function () {
        Scene_Base.prototype.start.call(this);
        this.startFadeIn(this.fadeSpeed(), false);
        BattleManager.playBattleBgm();
        BattleManager.startBattle();
        // console.log('[拦截] Scene_Battle.start() 被阻止');
        // SceneManager.pop(); // 直接返回上一场景
    };
    ////////////////////////// 进入 start 阶段 ///////////////////////////////////////////
    /** 战斗事件处理开始函数 */
    BattleManager.startBattle = function () {
        console.log('战斗开始函数 BattleManager.startBattle()');
        this._phase = 'start'; // 信号
        $gameSystem.onBattleStart();
        $gameParty.onBattleStart();
        $gameTroop.onBattleStart();
        this.displayStartMessages();
    };
    ///////////////////////////////////////////////////////////////////////////////////////    
    /**
     * 开始输入阶段，允许玩家选择角色行动指令。
     * 如果是偷袭（敌人先手）或我方无法输入（全部昏迷等），则直接进入执行回合。
     */
    BattleManager.startInput = function () {
        // 设置当前战斗阶段为“输入”
        this._phase = 'input';

        console.log('%c 输入进程回合开始函数 BattleManager.startInput() 🚀💥', 'color: red; font-weight: bold;');

        // 为我方所有角色生成行动（会触发每个角色的 makeActions → calculateActionTimes）
        $gameParty.makeActions();

        // 为敌方所有单位生成行动（敌方一般自动执行 AI 行动）
        $gameTroop.makeActions();

        // 清除当前正在输入命令的角色（避免残留）
        this.clearActor();

        // 如果是偷袭状态，或者我方无法输入（如全灭或昏迷），跳过输入阶段，直接开始执行回合
        if (this._surprise || !$gameParty.canInput()) {
            this.startTurn();
        }
    };

    /** 该方法创建单位行动的基础配置对象 */
    Game_Battler.prototype.makeActions = function () {
        // 先清除旧的行动（上一回合的）
        this.clearActions();

        // 如果角色处于可行动状态（没有昏迷、麻痹等状态）
        if (this.canMove()) {
            // 调用上方方法决定这回合可以执行几次行动
            var actionTimes = this.makeActionTimes();

            // 初始化行动数组
            this._actions = [];

            // 按照行动次数创建 Game_Action 实例并加入数组
            for (var i = 0; i < actionTimes; i++) {
                this._actions.push(new Game_Action(this));
            }
        }
    };

    /**
     * 为我方角色生成行动列表，并根据其状态（是否自动战斗、混乱等）决定行动方式。
     */
    Game_Actor.prototype.makeActions = function () {
        // 调用父类 Game_Battler 的 makeActions 方法，执行基础的行动生成逻辑
        Game_Battler.prototype.makeActions.call(this);

        console.log('我方角色行动信息', this.name(), this.actorId());

        // 如果该角色本回合有行动次数（例如根据速度机制生成了多个行动）
        if (this.numActions() > 0) {
            // 设置角色状态为“未决定”，等待玩家输入指令
            this.setActionState('undecided');
        } else {
            // 如果没有行动次数，设置为“等待”，不会进入输入命令阶段
            this.setActionState('waiting');
        }

        // 如果角色是“自动战斗”状态（例如设置为 AI 控制）
        if (this.isAutoBattle()) {
            // 自动生成战斗指令（AI控制）
            this.makeAutoBattleActions();
        }
        // 如果角色处于混乱状态
        else if (this.isConfused()) {
            // 根据混乱规则生成随机行为
            this.makeConfusionActions();
        }
    };

    /**
     * 为敌人生成行动（技能或攻击），根据敌人设定的行动列表和可用条件筛选有效动作，
     * 并为本回合所有行动槽填入对应的动作。
    */
    Game_Enemy.prototype.makeActions = function () {
        // 调用 Game_Battler 的基础逻辑，生成空的 Game_Action 实例列表，
        // 数量根据该敌人当前回合应行动的次数（如 calculateActionTimes 返回的）
        Game_Battler.prototype.makeActions.call(this);

        console.log('敌人行动信息', this.name(), this.enemyId());

        // 如果本回合有可行动的次数（即有 _actions 元素）
        if (this.numActions() > 0) {
            // 从敌人的数据库设定中筛选出“满足条件”的行动（条件如开场回合、HP范围等）
            var actionList = this.enemy().actions.filter(function (a) {
                return this.isActionValid(a); // 判定该行动在当前回合是否符合使用条件
            }, this);

            // 如果存在至少一个有效行动
            if (actionList.length > 0) {
                // 对当前所有行动槽（可能是多个）依次选择动作
                this.selectAllActions(actionList);
            }
        }

        // 敌人不需要玩家输入，直接设置为“等待状态”，等待进入战斗执行阶段
        this.setActionState('waiting');
    };

    ////////////////////////// 进入 turn 阶段 ///////////////////////////////////////////
    /**
     * 开始一个新回合。
     * 设置状态为“回合中”，清除当前操控角色，增加敌人回合数，
     * 生成战斗单位的行动顺序，并刷新动画和日志显示。
     */
    BattleManager.startTurn = function () {
        // 设置当前战斗阶段为“回合中”
        this._phase = 'turn';

        console.log('输入完毕，战斗回合开始执行 BattleManager.startTurn()');

        // 清除当前选中的角色（即当前不再由任何角色控制输入）
        this.clearActor();

        // 敌群（$gameTroop）增加回合计数（用于行动条件判断，例如“第2回合使用某技能”）
        $gameTroop.increaseTurn();

        // 生成行动顺序队列（根据各单位速度决定谁先行动）
        this.makeActionOrders();

        // 请求刷新我方角色的战斗动作（如挥剑待机等动作重置）
        $gameParty.requestMotionRefresh();

        // 启动战斗日志窗口的回合开始动画（显示“回合开始”等文字）
        this._logWindow.startTurn();
    };
    ////////////////////////////////////////////////////////////////////////////////////////

    /** 决定战斗系统中所有角色的行动先后顺序的实际函数 */
    BattleManager.makeActionOrders = function () {
        var battlers = []; // 初始化行动先后栈

        // 如果不是敌人先制攻击（surprise），则加入我方队伍成员
        if (!this._surprise) {
            battlers = battlers.concat($gameParty.members());
        }

        // 如果不是我方先制攻击（preemptive），则加入敌人队伍成员
        if (!this._preemptive) {
            battlers = battlers.concat($gameTroop.members());
        }

        // 每个战斗单位计算本回合的行动速度（决定行动先后）
        battlers.forEach(function (battler) {
            battler.makeSpeed();  // 计算速度属性
        });

        // 按照速度从高到低排序，决定行动顺序
        battlers.sort(function (a, b) {
            return b.speed() - a.speed();  // 降序排序
        });

        console.log('轮次排序执行完毕');
        console.log(battlers.slice()); // 防止引用篡改

        // 存储排序后的单位，后续将依次执行它们的行动
        this._actionBattlers = battlers;
    };

    /**
     * this._logWindow -> Window_BattleLog 实例化
     */

    // ---------------------- 重要！ ------------------------------------
    /** 整个战斗流程的“心跳”函数，每一帧都被调用一次，用于推进战斗各个阶段的进度 */
    BattleManager.update = function () {
        console.log('@@ 战斗心跳update函数');
        // 如果当前不是忙碌状态（例如动画播放中）且没有事件在处理中（如技能共鸣、对话等）
        if (!this.isBusy() && !this.updateEvent()) {

            // 根据当前阶段处理对应逻辑
            switch (this._phase) {
                case 'start':
                    // 战斗开始，进入玩家输入指令阶段
                    this.startInput();
                    break;

                case 'turn':
                    // 执行回合处理（按顺序让角色依次行动）
                    this.updateTurn();
                    break;

                case 'action':
                    // 当前角色正在执行行动（如攻击、施法、使用物品等）
                    this.updateAction();
                    break;

                case 'turnEnd':
                    // 一整轮行动结束后的清理阶段
                    this.updateTurnEnd();
                    break;

                case 'battleEnd':
                    // 战斗结束处理（显示胜利、失败界面）
                    this.updateBattleEnd();
                    break;
            }
        }
    };

    /** 用于处理战斗中的公共事件或强制事件等高优先级事件 */
    BattleManager.updateEvent = function () {
        switch (this._phase) {
            case 'start':
            case 'turn':
            case 'turnEnd':
                // 如果有强制行动（如 enemy.forceAction），则优先处理
                if (this.isActionForced()) {
                    this.processForcedAction(); // 将强制行动加入执行序列
                    return true;
                } else {
                    // 否则尝试执行当前帧事件（事件页、技能事件等）
                    return this.updateEventMain(); // 会触发 interpreter 更新
                }
        }

        // 非上述阶段（如 action 阶段），检查是否有逃跑等中止战斗的行为
        return this.checkAbort();
    };

    /**
     * 战斗阶段中执行战斗事件逻辑。 -> 调用了 checkBattleEnd 转换到战斗结束阶段
     *
     * 此函数由 updateEvent() 调用，用于处理敌群中的事件页、战斗结束检测、
     * 以及检查是否需要切换场景（如胜利、失败等）。
     */
    BattleManager.updateEventMain = function () {
        // 更新敌群事件解释器（Interpreter），用于执行事件指令
        $gameTroop.updateInterpreter();

        // 刷新角色行动姿势（如果有变动）
        $gameParty.requestMotionRefresh();

        // 如果事件正在执行，或战斗已判定胜负，则中断后续流程
        if ($gameTroop.isEventRunning() || this.checkBattleEnd()) {
            return true;
        }

        // 尝试设置当前阶段可触发的敌群事件页
        $gameTroop.setupBattleEvent();

        // 再次判断是否触发了事件，或当前正在切换场景（如切到胜利画面）
        if ($gameTroop.isEventRunning() || SceneManager.isSceneChanging()) {
            return true;
        }

        // 否则，本帧无事件可执行，返回 false
        return false;
    };

    // ---------------------------------------------------------------------------------

    /** 更新当前回合的战斗状态，决定并执行当前回合的行动主体。（重复调用会在processTurn进行判断中止）*/
    BattleManager.updateTurn = function () {
        console.log('%c 单位开始动作的函数 BattleManager.updateTurn() 🔄👥', 'color: blue; font-weight: bold;');
        // 刷新玩家角色的动作状态，确保战斗中角色的动作（比如表情、动作等）是最新的
        $gameParty.requestMotionRefresh();

        // 如果当前回合没有指定的行动主体，则获取下一个行动主体
        if (!this._subject) {
            // 通过调用 getNextSubject 方法选择下一个行动单位（可能是玩家队伍成员或敌方单位）
            this._subject = this.getNextSubject();
        }

        // 如果有指定的行动主体，则执行该主体的回合处理
        if (this._subject) {
            // 调用 processTurn 方法，开始处理当前行动主体的回合
            this.processTurn();
        } else {
            // 如果没有可执行的行动主体，结束当前回合
            this.endTurn();
        }
    };

    // ---------------------  重要！ --------------------------------------------
    /** 处理当前回合的行动主体的变化的动画和效果。多次调用代表第一次检查无效，第二次有效开始调用*/
    BattleManager.processTurn = function () {
        console.log('单位实际开始动作的函数 BattleManager.processTurn()');
        // 获取当前回合的行动主体（玩家或敌人）
        var subject = this._subject;

        // 获取当前行动主体的当前行动
        var action = subject.currentAction();

        // 如果有有效的当前行动，则准备行动并检查是否有效
        if (action) {
            // 准备行动，准备过程中可能会验证行动是否有效
            action.prepare();

            // * 如果行动有效，则开始执行行动 （进入 action 的manager状态方法内！）
            if (action.isValid()) {
                this.startAction();
            }

            // 移除当前的行动，准备进入下一个动作
            subject.removeCurrentAction();
        } else {
            // 如果当前行动无效或没有行动，则执行回合结束后的操作
            // 通常是刷新状态，处理状态变化等
            subject.onAllActionsEnd();

            // 刷新角色状态，例如更新生命、魔法等属性
            this.refreshStatus();

            // 显示角色的自动状态影响
            this._logWindow.displayAutoAffectedStatus(subject);

            // 显示角色当前状态
            this._logWindow.displayCurrentState(subject);

            // 显示角色的再生效果（例如回血等）
            this._logWindow.displayRegeneration(subject);

            // 选择下一个行动主体
            this._subject = this.getNextSubject();
        }
    };

    ////////////////////////// 进入 turnEnd 阶段 ///////////////////////////////////////////
    /** 结束当前回合，并执行回合结束后的处理。 */
    BattleManager.endTurn = function () {

        // 设置战斗阶段为回合结束阶段
        this._phase = 'turnEnd';

        // 重置先制攻击和突袭状态
        this._preemptive = false;
        this._surprise = false;

        // 对所有参与战斗的单位执行回合结束处理
        this.allBattleMembers().forEach(function (battler) {
            battler.onTurnEnd(); // 调用每个单位的 `onTurnEnd` 方法处理回合结束后的逻辑

            // 刷新所有单位的状态
            this.refreshStatus();

            // 显示该单位的自动状态变化（例如：中毒、生命恢复等）
            this._logWindow.displayAutoAffectedStatus(battler);

            // 显示该单位的再生效果（例如：回恢复、MP恢复等）
            this._logWindow.displayRegeneration(battler);
        }, this);

        // 如果是强制回合，则重置强制回合标志
        if (this.isForcedTurn()) {
            this._turnForced = false;
        }
        console.log('所有可执行单位执行动作完毕，回合执行完毕循环的函数 BattleManager.endTurn()');
    };
    ////////////////////////////////////////////////////////////////////////////////////////

    ////////////////////////// 进入 action 阶段 ///////////////////////////////////////////
    /** 开始执行角色的动作，处理目标、使用物品、应用全局效果等 */
    BattleManager.startAction = function () {
        console.log('开始执行单位技能动画的函数 BattleManager.startAction()');
        // 获取当前行动的角色（subject）
        var subject = this._subject;

        // 获取该角色的当前行动对象
        var action = subject.currentAction();

        // 生成当前行动的目标对象
        var targets = action.makeTargets();

        // 设置当前战斗状态为 'action'，表示正在执行动作
        this._phase = 'action';

        // 记录当前执行的动作
        this._action = action;

        // 记录当前行动的目标
        this._targets = targets;

        // 角色使用该行动的物品（例如攻击、技能等）
        subject.useItem(action.item());

        // 应用全局效果（例如状态效果等）
        this._action.applyGlobal();

        // 刷新角色状态，确保状态更新（例如 HP、MP 等变化）
        this.refreshStatus();

        // 显示该角色的行动日志，包括动作和目标
        this._logWindow.startAction(subject, action, targets);
    };

    /** 执行角色的动作效果的实际函数 */
    BattleManager.updateAction = function () {
        console.log('单位技能动画实际执行函数 BattleManager.updateAction()');
        var target = this._targets.shift(); // 取出下一个目标
        if (target) {
            this.invokeAction(this._subject, target); // 执行单位动作效果的实际函数
        } else {
            this.endAction(); // 如果没有目标了，结束动作
        }
    };

    /** 结束角色的动作，进入下一个 turn 阶段 */
    BattleManager.endAction = function () {
        console.log('%c 单位技能动画执行完毕循环进行执行动作的函数 BattleManager.endAction() ✅🔄', 'color: blue; font-weight: bold;');
        this._logWindow.endAction(this._subject); // 结束当前角色的动作，并更新日志窗口
        this._phase = 'turn'; // 将战斗阶段设置为 'turn'，表示进入回合阶段
    };
    ////////////////////////////////////////////////////////////////////////////////////////


    /** 回合结束重新进入输入阶段 */
    BattleManager.updateTurnEnd = function () {
        console.log('%c 回合结束重新进入输入阶段的函数 BattleManager.updateTurnEnd() ✨🔁', 'color: red; font-weight: bold;');
        this.startInput();
    };

    /** 根据战斗阶段判断是否触发胜利、失败或中止等条件。（我方全灭、敌方全灭、逃跑） -> 调用 endBattle 方法 */
    BattleManager.checkBattleEnd = function () {
        console.log('战斗开始/回合开始/回合结束时判断战斗是否结束 BattleManager.checkBattleEnd()');
        // 如果当前已经处于某个战斗阶段（非 null/undefined）
        if (this._phase) {
            // 1. 检查是否中断战斗（比如玩家强制逃跑等）-> 1 传参调用 endBattle
            if (this.checkAbort()) {
                return true;
            }
            // 2. 检查我方是否全灭
            else if ($gameParty.isAllDead()) {
                this.processDefeat(); // 执行失败流程 -> 2 传参调用 endBattle
                return true;
            }
            // 3. 检查敌方是否全灭
            else if ($gameTroop.isAllDead()) {
                this.processVictory(); // 执行胜利流程 -> 0 传参调用 endBattle
                return true;
            }
        }

        // 没有满足任何结束条件，继续战斗
        return false;
    };

    ////////////////////////// 进入 battleEnd 阶段 ///////////////////////////////////////////
    /** 战斗结束，根据结果执行胜利、失败、逃跑等流程。 */
    BattleManager.endBattle = function (result) {
        console.log('执行战斗结算的函数 BattleManager.endBattle()');
        // 设置当前阶段为战斗结束
        this._phase = 'battleEnd';

        // 如果有事件回调（通常用于事件指令中的“战斗处理”），则执行回调
        if (this._eventCallback) {
            this._eventCallback(result);
        }

        // 如果战斗胜利
        if (result === 0) {
            $gameSystem.onBattleWin(); // 执行胜利流程（比如显示胜利界面、分发奖励）
        }
        // 如果是逃跑成功（即使 result 不是 2，也可以通过 this._escaped 判断）
        else if (this._escaped) {
            $gameSystem.onBattleEscape(); // 执行逃跑流程（如返回地图等）
        }

        // 注意：失败处理（result === 1）并不直接在这里调用 onBattleDefeat()
        // 因为失败流程通常需要用户交互处理（比如是否继续游戏）
    };
    ////////////////////////////////////////////////////////////////////////////////////////

    /**
     * 处理战斗结束阶段的后续流程。
     * 在 battleEnd 阶段，每帧由 BattleManager.update() 调用一次。
     * 根据战斗结果决定是否退出、返回地图或跳转到游戏结束画面。
     */
    BattleManager.updateBattleEnd = function () {
        console.log('战斗已经完全结束的函数，准备跳转到下一个场景 BattleManager.updateBattleEnd()');
        // 如果是战斗测试模式（通常用于开发测试），则停止 BGM 并退出游戏
        if (this.isBattleTest()) {
            AudioManager.stopBgm();       // 停止战斗背景音乐
            SceneManager.exit();          // 退出 RPG Maker 的测试运行
        }

        // 如果是战败（没有逃跑）且全员阵亡
        else if (!this._escaped && $gameParty.isAllDead()) {
            // 如果可以在战斗失败时继续（比如事件中设置为“可以失败”）
            if (this._canLose) {
                $gameParty.reviveBattleMembers(); // 恢复队伍成员状态
                SceneManager.pop();               // 返回上一场景（通常是地图）
            } else {
                SceneManager.goto(Scene_Gameover); // 否则进入游戏结束画面
            }
        }

        // 胜利或逃跑成功时的默认流程
        else {
            SceneManager.pop(); // 返回上一场景（地图或其他）
        }

        // 重置阶段，表示战斗流程彻底结束
        this._phase = null;
    };

    // 游戏内执行战斗所有启动流程的指令
    Game_Interpreter.prototype.command301 = function() {
        // console.log('战斗场景指令被阻止！')
        if (!$gameParty.inBattle()) {
            var troopId;
            if (this._params[0] === 0) {  // Direct designation
                troopId = this._params[1];
            } else if (this._params[0] === 1) {  // Designation with a variable
                troopId = $gameVariables.value(this._params[1]);
            } else {  // Same as Random Encounter
                troopId = $gamePlayer.makeEncounterTroopId();
            }
            if ($dataTroops[troopId]) {
                BattleManager.setup(troopId, this._params[2], this._params[3]);
                BattleManager.setEventCallback(function(n) {
                    this._branch[this._indent] = n;
                }.bind(this));
                $gamePlayer.makeEncounterCount();
                SceneManager.push(Scene_Battle);
            }
        }
        return true;
    };
    
})();
