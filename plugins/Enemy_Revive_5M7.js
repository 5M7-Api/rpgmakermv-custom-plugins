/*:
 * @plugindesc 敌方单位动态复活插件
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help
 * 敌人备注中添加 <FeignDeath:x,y,z>：
 * - x 表示假死状态维持的回合数；
 * - y（可选）表示最多复活的次数，不填为无限；
 * - z（可选）表示复活时恢复HP百分比（默认100%）。
 * 
 * 另外可以使用 <ReviveMsg:xxx> 显示自定义复活信息。
 */

(function () {
    var feignDeathEnemies = [];

    var FEIGN_DEATH_TAG = /<FeignDeath:(\d+)(?:,(\d+))?(?:,(\d+))?>/i;

    function waitForSeconds(logWindow, seconds) {
        var frames = Math.round(seconds * 4);
        for (var i = 0; i < frames; i++) {
            logWindow.push('wait');
        }
    }
    
    function getEnemySprite(enemy) {
        var spriteset = SceneManager._scene && SceneManager._scene._spriteset;
        if (!spriteset || !spriteset._enemySprites) return null;

        for (var i = 0; i < spriteset._enemySprites.length; i++) {
            var sprite = spriteset._enemySprites[i];
            if (sprite._battler === enemy) return sprite;
        }
        return null;
    }

    var _Game_Enemy_initMembers = Game_Enemy.prototype.initMembers;
    Game_Enemy.prototype.initMembers = function () {
        _Game_Enemy_initMembers.call(this);
        this._isFeignDeath = false;
        this._feignDeathCounter = 0;
        this._reviveLimit = -1;
        this._reviveCount = 0;
        this._reviveHpRate = 100; // 默认 100%
        this._reviveMsg = null;

    };

    var _Game_Enemy_die = Game_Enemy.prototype.die;
    Game_Enemy.prototype.die = function () {
        var note = this.enemy().note;
        var match = note.match(FEIGN_DEATH_TAG);
        if (match && !this._isFeignDeath) {
            var delay = Number(match[1]);
            var limit = match[2] ? Number(match[2]) : -1;
            var hpRate = match[3] ? Number(match[3]) : 100;
            var reviveMsgMatch = note.match(/<ReviveMsg:(.+?)>/i);

            if (this._reviveLimit >= 0 && this._reviveCount >= this._reviveLimit) {
                _Game_Enemy_die.call(this);
                return;
            }

            this._isFeignDeath = true;
            this._feignDeathCounter = delay;
            this._reviveLimit = limit;
            this._reviveHpRate = Math.min(Math.max(hpRate, 1), 100); // 限制在 1~100 之间
            this._reviveMsg = reviveMsgMatch ? reviveMsgMatch[1] : (this.name() + ' 复活了！');

            this.performCollapse();
            var sprite = getEnemySprite(this);
            if (sprite) sprite.visible = false;

            if (feignDeathEnemies.indexOf(this) === -1) {
                feignDeathEnemies.push(this);
            }

            console.log('[FeignDeath] 敌人' + this.enemyId() + ' 进入假死：' + this._feignDeathCounter + ' 回合，最多复活 ' + (limit >= 0 ? limit : '无限') + ' 次，HP回复 ' + this._reviveHpRate + '%');
        } else {
            _Game_Enemy_die.call(this);
        }
    };

    BattleManager.endTurn = function () {
        BattleManager.updateTurnEnd();

        for (var i = feignDeathEnemies.length - 1; i >= 0; i--) {
            var enemy = feignDeathEnemies[i];
            if (!enemy || !enemy._isFeignDeath) continue;

            enemy._feignDeathCounter--;
            console.log('[FeignDeath] 敌人' + enemy.enemyId() + ' 剩余复活回合: ' + enemy._feignDeathCounter);

            if (enemy._feignDeathCounter <= 0) {
                enemy._isFeignDeath = false;
                enemy._reviveCount++;
                enemy._hp = Math.floor(enemy.mhp * (enemy._reviveHpRate / 100));
                enemy._hp = Math.max(enemy._hp, 1); // 至少保留1点HP
                enemy.removeState(enemy.deathStateId());
                enemy.refresh();

                var sprite = getEnemySprite(enemy);
                if (sprite) {
                    sprite.visible = true;
                    sprite.opacity = 255;
                }

                var reviveMsg = enemy._reviveMsg || (enemy.name() + ' 复活了！');
                if (BattleManager._logWindow) {
                    var logWindow = BattleManager._logWindow;
                    logWindow.push('addText', reviveMsg);
                    logWindow.push('waitForMovement'); // 等待消息滚动完成（适用于多行）
                    waitForSeconds(logWindow, 1); // 等待1秒，太长了会导致战斗进程阻塞
                    logWindow.push('clear');
                }

                // console.log('[FeignDeath] 敌人' + enemy.enemyId() + ' 复活，回复 ' + enemy._reviveHpRate + '% HP');
                feignDeathEnemies.splice(i, 1);
            }
        }
    };

    // 备用函数判断是否已经真正死亡
    Game_Enemy.prototype.isBattleUnavailable = function () {
        return this._isFeignDeath || this.isDead();
    };
})();
