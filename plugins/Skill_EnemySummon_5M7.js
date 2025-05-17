/*:
 * @plugindesc 通过技能添加一个或多个指定位置的敌人 
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 本插件允许在战斗中使用技能备注添加多个敌方单位到指定位置。需要打开代码编辑器，在代码中配置映射规则。
 * 
 * 设置此召唤技能时，需注意在编辑器内将技能释放目标设置为使用者。
 *
 * 技能备注格式：
 * <AddEnemy: configkey> 必要的配置，用于指示召唤技能行为的基本属性
 * 示例：<AddEnemy: key1>
 * - configkey：configSummon 中定义的键值，用于映射敌人配置
 *
 * <FailureText: [弹出信息]> 可选的配置，用于替换行动失败的默认信息。
 * 示例：<FailureText: \\N完全免疫该技能>
 * - \\N代表使用者的名称。
 * 
 * 配置方法：
 * 在 configSummon 对象中定义敌人配置，例如：
 * var configSummon = {
 *     key1: {
 *         unit: [{id: 14, x: 100, y: 200}, {id: 14, x: 200, y: 300}, {id: 14, x: 300, y: 400}],
 *         count: 2,
 *         limit: 3
 *     },
 *     key2: {
 *         unit: [{id: 7, x: 300, y: 400}],
 *         count: 1,
 *         limit: -1
 *     }
 * };
 * - unit：一个数组，定义所有可能的敌人ID和位置。id -为数据库中指定敌人的id x -战斗画面的x坐标 y -战斗画面的y坐标
 * - count：每次释放技能召唤的敌人数量（不超过 unit 长度）。
 * - limit：技能在一场战斗内的使用次数限制（正整数表示次数，-1 表示无限制）。
 *
 * 召唤逻辑：
 * - 默认按 unit 数组索引升序召唤（例如索引 0, 1）。
 * - 若某位置的敌人已死亡，优先选择空缺位置。
 * - 若所有 unit 位置被存活敌人占用，技能禁用。
 * - 若技能使用次数达到 limit（非 -1），技能禁用。
 *
 * 技能可用性：
 * - 敌方和玩家均遵守限制：位置满或达到使用次数时，技能禁用。（强烈不建议让友方角色使用此扩展功能）
 * - 召唤敌人和使用次数在战斗开始时初始化，战斗结束时删除。
 *
 * 注意：
 * - 确保敌人ID在数据库中存在。
 * - 添加的敌人会加入当前战斗，直到战斗结束或死亡。
 * - 若敌方单位仅有此技能可用，则敌方在达到限制时不会再行动，否则会切换到其他AI行为。
 */

(function () {
    // ---------------------------- 填写召唤配置区域 ----------------------------------
    var configSummon = {
        key1: {
            unit: [{ id: 14, x: 100, y: 200 }, { id: 14, x: 200, y: 300 }, { id: 14, x: 300, y: 400 }],
            count: 2,
            limit: 3, 
        },
        key2: {
            unit: [{ id: 7, x: 300, y: 400 }],
            count: 1,
            limit: -1, 
        },
        // 继续添加其他配置key3, key4,...
    };
    // ------------------------------------------------------------------------------

    // 在战斗开始时初始化召唤敌人跟踪
    var _Scene_Battle_create = Scene_Battle.prototype.create;
    Scene_Battle.prototype.create = function () {
        _Scene_Battle_create.call(this);
        // 初始化跟踪数组和使用次数
        $gameTemp._summonedEnemies = {};
        $gameTemp._summonUseCounts = {};
    };

    // 解析技能备注
    var _DataManager_isDatabaseLoaded = DataManager.isDatabaseLoaded;
    DataManager.isDatabaseLoaded = function () {
        if (!_DataManager_isDatabaseLoaded.call(this)) return false;
        this.processAddEnemyNotetags();
        return true;
    };

    // 处理技能备注，提取配置键值
    DataManager.processAddEnemyNotetags = function () {
        for (var i = 1; i < $dataSkills.length; i++) {
            var skill = $dataSkills[i];
            skill.meta.addEnemy = null;
            if (skill.note.match(/<AddEnemy:\s*(\w+)>/i)) {
                skill.meta.addEnemy = RegExp.$1;
            }
        }
    };

    // 释放一个单位动作的入口源代码函数，处理添加敌人逻辑
    var _Game_Action_apply = Game_Action.prototype.apply;
    Game_Action.prototype.apply = function (target) {
        _Game_Action_apply.call(this, target);
        if (this.isSkill() && this.item().meta.addEnemy) {
            this.executeAddEnemy();
        }
    };

    // 执行添加敌人逻辑
    Game_Action.prototype.executeAddEnemy = function () {
        var configKey = this.item().meta.addEnemy;
        if (!configKey) return;

        // 验证配置键值
        if (!configSummon[configKey]) {
            console.warn("无效的配置键值: " + configKey);
            return;
        }

        var config = configSummon[configKey];
        var unit = config.unit;
        var count = Math.min(config.count, unit.length); // 确保 count 不超过 unit 长度

        // 初始化跟踪数组和使用次数
        $gameTemp._summonedEnemies[configKey] = $gameTemp._summonedEnemies[configKey] || [];
        $gameTemp._summonUseCounts[configKey] = $gameTemp._summonUseCounts[configKey] || 0;

        // 获取已占用和空缺位置
        var occupiedIndices = $gameTemp._summonedEnemies[configKey]
            .filter(function (enemy) { return enemy && enemy.isAlive(); })
            .map(function (enemy) { return enemy._unitIndex; });
        var availableIndices = [];
        for (var i = 0; i < unit.length; i++) {
            if (!occupiedIndices.includes(i)) {
                availableIndices.push(i);
            }
        }

        // 若无可用位置，跳过召唤
        if (availableIndices.length === 0) {
            // console.log("所有位置已满，跳过召唤: configKey =", configKey);
            return;
        }

        // 选择召唤位置（优先空缺，按升序填充）
        var summonIndices = availableIndices.slice(0, Math.min(count, availableIndices.length)); //选择其中最小值，防止召唤单位溢出
        summonIndices.sort(function (a, b) { return a - b; }); // 升序排序

        // 召唤敌人
        var summoned = false;
        summonIndices.forEach(function (index) {
            var enemyData = unit[index];
            var enemyId = enemyData.id;
            var x = enemyData.x;
            var y = enemyData.y;
            var enemy = addEnemyAtPosition(enemyId, x, y, configKey, index);
            if (enemy) {
                $gameTemp._summonedEnemies[configKey].push(enemy);
                summoned = true;
            }
        });

        // 成功召唤后递增使用次数
        if (summoned) {
            $gameTemp._summonUseCounts[configKey]++;
            // console.log("技能使用次数更新: configKey =", configKey, "当前次数 =", $gameTemp._summonUseCounts[configKey]);
        }
    };

    // 在指定位置添加敌人
    function addEnemyAtPosition(enemyId, x, y, configKey, unitIndex) {
        if (!$gameParty.inBattle()) {
            console.warn("当前不在战斗中，跳过添加");
            return null;
        }

        var troop = $gameTroop;
        // console.log("添加敌人 → ID:", enemyId, "位置 X =", x, "Y =", y, "配置键:", configKey, "unit索引:", unitIndex);

        // 验证敌人ID有效性
        if (!$dataEnemies[enemyId]) {
            console.warn("无效的敌人ID: " + enemyId);
            return null;
        }

        // 创建敌人
        var enemy = new Game_Enemy(enemyId, x, y);
        enemy._screenX = x;
        enemy._screenY = y;
        enemy._summonedKey = configKey; // 标记该敌人所属配置键（监视作用）
        enemy._unitIndex = unitIndex; // 标记 unit 索引
        enemy.appear();
        troop._enemies.push(enemy);
        troop.makeUniqueNames(); // 添加名称标识符后缀A B C……

        // 添加敌人精灵
        var scene = SceneManager._scene;
        if (scene && scene._spriteset) {
            var sprite = new Sprite_Enemy(enemy);
            scene._spriteset._enemySprites.push(sprite);
            scene._spriteset._battleField.addChild(sprite);
            // console.log("敌人精灵添加成功");
        }

        // 刷新战斗状态
        BattleManager.refreshStatus();
        return enemy;
    }

    // 确保敌人精灵使用指定位置
    var _Sprite_Enemy_updatePosition = Sprite_Enemy.prototype.updatePosition;
    Sprite_Enemy.prototype.updatePosition = function () {
        _Sprite_Enemy_updatePosition.call(this);
        if (this._enemy._screenX !== undefined && this._enemy._screenY !== undefined) {
            this.x = this._enemy._screenX;
            this.y = this._enemy._screenY;
        }
    };

    // 检查技能可用性
    var _Game_BattlerBase_canUse = Game_BattlerBase.prototype.canUse;
    Game_BattlerBase.prototype.canUse = function (skill) {
        // 底层逻辑都不满足就直接禁掉
        if (!_Game_BattlerBase_canUse.call(this, skill)) return false;

        if (skill.meta.addEnemy) {
            var configKey = skill.meta.addEnemy;
            if (!configSummon[configKey]) {
                console.warn("技能检查失败: 无效的配置键值 =", configKey);
                return false;
            }

            var config = configSummon[configKey];
            var unitLength = config.unit.length;
            var limit = config.limit;

            // 检查使用次数限制
            if (limit !== -1) {
                var useCount = ($gameTemp._summonUseCounts && $gameTemp._summonUseCounts[configKey]) || 0;
                if (useCount >= limit) {
                    // console.log("技能使用次数已达上限: configKey =", configKey, "当前次数 =", useCount, "上限 =", limit, "使用者 =", this.isEnemy() ? "敌方" : "我方");
                    return false; // 达到使用次数限制，禁用技能
                }
            }

            if ($gameTemp._summonedEnemies && $gameTemp._summonedEnemies[configKey]) {
                // 检查存活敌人数量是否达到 unit 长度
                var unitLength = configSummon[configKey].unit.length;
                var aliveCount = $gameTemp._summonedEnemies[configKey].filter(function (enemy) {
                    return enemy && enemy.isAlive();
                }).length;
                // console.log("检查技能可用性: configKey =", configKey, "存活敌人 =", aliveCount, "最大位置 =", unitLength, "使用者 =", this.isEnemy() ? "敌方" : "我方");
                if (aliveCount >= unitLength) {
                    return false; // 位置已满，禁用技能
                }
            }
        }
        return true;
    };

    // 处理敌人死亡
    var _Game_Enemy_performCollapse = Game_Enemy.prototype.performCollapse;
    Game_Enemy.prototype.performCollapse = function () {
        _Game_Enemy_performCollapse.call(this);
        if (this._summonedKey && this.isDead()) {
            // 从跟踪列表中移除
            var configKey = this._summonedKey;
            if ($gameTemp._summonedEnemies && $gameTemp._summonedEnemies[configKey]) {
                $gameTemp._summonedEnemies[configKey] = $gameTemp._summonedEnemies[configKey].filter(function (enemy) {
                    return enemy !== this;
                }, this);
                // console.log("敌人死亡: configKey =", configKey, "unit索引 =", this._unitIndex, "剩余敌人 =", $gameTemp._summonedEnemies[configKey].length);
                // 刷新战斗状态以更新技能可用性
                BattleManager.refreshStatus();
            }
        }
    };

    // 战斗结束后清理召唤记录
    var _BattleManager_endBattle = BattleManager.endBattle;
    BattleManager.endBattle = function (result) {
        _BattleManager_endBattle.call(this, result);
        $gameTemp._summonedEnemies = null; // 删除召唤记录
        $gameTemp._summonUseCounts = null; // 删除使用次数记录
    };

    // 改变行动失败时的弹出消息，不然会出现错误的“无效化”信息
    var _Window_BattleLog_displayFailure = Window_BattleLog.prototype.displayFailure;
    Window_BattleLog.prototype.displayFailure = function (target) {
      var action = BattleManager._action;
      var item = action ? action.item() : null;
      if (item && item.meta && item.meta.FailureText) {
        var msg = item.meta.FailureText.replace(/\\N/g, target.name()); // 替换成使用者的名称
        this.push('addText', msg);
      } else {
        _Window_BattleLog_displayFailure.call(this, target);
      }
    };
})();