/*:
 * @plugindesc 在首领或我方关键单位死亡时显示自定义信息并触发战斗结束的相关结算。
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * ◆ 插件说明：
 * 本插件用于增强 RPG Maker MV 的战斗系统。
 * 支持以下功能：
 * 
 * 【1】敌方首领机制：
 * - 若敌人备注中含有 <VictoryTarget> 标签，则表示其为首领；
 * - 击败首领后会播放自定义提示文本与其他敌人崩溃动画；
 * - 之后立即触发胜利流程；
 * 
 * 【2】我方关键角色机制：
 * - 若我方角色备注中含有 <DefeatTarget> 标签，则表示其为关键角色；
 * - 该角色战斗不能时会立刻显示提示信息并触发战斗失败；
 * - 战斗失败后会触发Game over流程
 *
 * ◆ 敌人备注用法：
 * <VictoryTarget>
 * <VictoryTargetMessage:首领倒下了！其他敌人落荒而逃！>
 * 
 * ◆ 角色备注用法（我方角色）：
 * <DefeatTarget>
 * <DefeatTargetMessage:护卫倒下了，队伍陷入混乱！>
 * 
 * ◆ 兼容性提示：
 * - 若有改动 BattleManager.checkBattleEnd 的插件请注意冲突；
 * - 若有改动 BattleManager.updateBattleEnd 的插件请注意冲突
 * ◆ 作者：5M7-Api
 */
(function () {

    var defaultBossCollapseMessage = '首领倒下了！其余敌人落荒而逃！';
    var defaultDefeatMessage = '关键角色倒下了，战斗失败！';

    // 首领击败的额外的动画序列操作（防止异步冲突）
    Window_BattleLog.prototype.addBossCollapseAndVictory = function (message) {
        this.push('addText', message);
        this.push('wait');
        this.push('performEnemyEscape');
        this.push('wait');
        this.push('forceVictory');
    };

    Window_BattleLog.prototype.performEnemyEscape = function () {
        $gameTroop.members().forEach(function (enemy) {
            if (!enemy.isDead() && !enemy.enemy().meta.VictoryTarget) {
                enemy.addState(enemy.deathStateId()); // 强制死亡
                enemy.performCollapse(); // 播放崩溃动画
            }
        });
    };

    Window_BattleLog.prototype.forceVictory = function () {
        BattleManager.processVictory();
    };

    // 我方重要角色被击败的额外的动画序列操作（防止异步冲突）
    Window_BattleLog.prototype.addDefeatMessage = function (message) {
        this.push('addText', message);
        this.push('wait');
        this.push('forceDefeat');
    };

    Window_BattleLog.prototype.forceDefeat = function () {
        BattleManager.processDefeat();
    };

    /** 根据战斗阶段判断是否触发胜利、失败或中止等条件。（ */
    BattleManager.checkBattleEnd = function () {
        // ✅ 原始逻辑：中断、我方全灭、敌方全灭
        if (this._phase) {
            if (this.checkAbort()) {
                return true;
            } else if ($gameParty.isAllDead()) {
                this.processDefeat();
                return true;
            } else if ($gameTroop.isAllDead()) {
                this.processVictory();
                return true;
            }

            // ✅ 新增逻辑：如果敌群中有带 <VictoryTarget> 标签的敌人死亡
            var victoryTargetDead = $gameTroop.members().some(enemy => {
                return enemy.isDead() && enemy.enemy().meta.VictoryTarget;
            });
            console.log('@@ checkBattleEnd: victoryTargetDead', victoryTargetDead)

            if (victoryTargetDead) {
                // 找到第一个被击杀的带 VictoryTarget 标签的敌人
                var boss = $gameTroop.members().find(function (enemy) {
                    return enemy.isDead() && enemy.enemy().meta.VictoryTarget;
                });

                // 从备注中获取自定义胜利提示
                var message = (boss && boss.enemy().meta.VictoryTargetMessage) || defaultBossCollapseMessage;

                // 传入自定义信息
                this._logWindow.push('addBossCollapseAndVictory',message);
                return true;
            }

            // ▶ 检查我方关键角色是否阵亡
            var defeatTarget = $gameParty.battleMembers().find(function (actor) {
                return actor.isDead() && actor.actor().meta.DefeatTarget;
            });

            if (defeatTarget ) {
                this._keyDefeatHandled = true;
                var defeatMessage = defeatTarget.actor().meta.DefeatTargetMessage || defaultDefeatMessage;
                this._logWindow.push('addDefeatMessage', defeatMessage);
                return true;
            }
        }

        // 没有满足任何结束条件，继续战斗
        return false;
    };

    BattleManager.updateBattleEnd = function () {
        if (this.isBattleTest()) {
            AudioManager.stopBgm();       // 停止战斗背景音乐
            SceneManager.exit();          // 退出 RPG Maker 的测试运行
        }

        // 战败逻辑
        else if (this._keyDefeatHandled) { SceneManager.goto(Scene_Gameover); } // 添加重要人物死亡后Game over的逻辑
        else if (!this._escaped && $gameParty.isAllDead()) {

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

        this._phase = null;
    };

})();