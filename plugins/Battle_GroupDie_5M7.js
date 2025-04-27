/*:
 * @plugindesc 敌群联动死亡插件
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 敌人备注标签：
 *   <Group: A>     - 敌人属于群组 A （数字或字母都可以，只需要一致就是同一组）
 *   <Trigger>      - 此敌人死亡时整个群组立即死亡
 *   <TriggerAll>   - 所有带此标签的敌人死亡后群组死亡
 */
(function () {
  var _processedGroups = [];

  var _Game_Enemy_setup = Game_Enemy.prototype.setup;
  Game_Enemy.prototype.setup = function (enemyId, x, y) {
    _Game_Enemy_setup.call(this, enemyId, x, y);
    this.extractGroupInfo();
  };

  Game_Enemy.prototype.extractGroupInfo = function () {
    var note = this.enemy().note;
    var match = note.match(/<Group:\s*(\w+)>/);
    this._enemyGroupId = match ? match[1] : null;
    this._isTrigger = /<Trigger>/.test(note);
    this._isTriggerAll = /<TriggerAll>/.test(note); // 新增
  };

  var _Game_Enemy_die = Game_Enemy.prototype.die;
  Game_Enemy.prototype.die = function () {
    _Game_Enemy_die.call(this);
    // console.log('敌人死亡：', this._enemyGroupId, this._isTrigger, this._isTriggerAll)
    if (!this._enemyGroupId) return;
    if (_processedGroups.contains(this._enemyGroupId)) return;

    var groupId = this._enemyGroupId;

    // 判断是否是 Trigger 模式（立即死亡）
    if (this._isTrigger) {
      // console.log('[Trigger] 引发群组死亡：' + groupId);
      killGroup(groupId);
      return;
    }

    // 判断是否需要执行 TriggerAll 联动
    setTimeout(function () {
        if (_processedGroups.contains(groupId)) return;

        var groupEnemies = $gameTroop._enemies.filter(function (enemy) {
            return enemy._enemyGroupId === groupId;
        });

        var triggerAllMembers = groupEnemies.filter(function (enemy) {
            return enemy._isTriggerAll;
        });

        if (triggerAllMembers.length > 0 && triggerAllMembers.every(function (enemy) {
            return enemy.isDead();
        })) {
            // console.log('[TriggerAll] 所有目标死亡，群组死亡：' + groupId);
            killGroup(groupId);
        }
    }, 10); // 延迟1帧，等当前死亡处理完再判断
  };

  function killGroup(groupId) {
    _processedGroups.push(groupId);
    var sameGroup = $gameTroop._enemies.filter(function (enemy) {
      return enemy._enemyGroupId === groupId && !enemy.isDead();
    });

    for (var i = 0; i < sameGroup.length; i++) {
      var enemy = sameGroup[i];
      enemy.addState(enemy.deathStateId());
      enemy.performCollapse(); // 播放死亡动画
    }

    BattleManager.refreshStatus();
  }

  var _Game_Troop_setup = Game_Troop.prototype.setup;
  Game_Troop.prototype.setup = function (troopId) {
    _processedGroups = [];
    _Game_Troop_setup.call(this, troopId);
  };
})();
