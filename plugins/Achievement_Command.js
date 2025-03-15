
/*:
 * @plugindesc 用于自定义某些成就的触发条件，比如被击败特定敌人或被团灭。
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * 
 * @help
 * 由于自由度高。本插件的所有配置需要在代码编辑器中完成。
 * 
 * 依赖插件的链接：http://torigoya.hatenadiary.jp/entry/achievement_mv
 * 
 */
(function () {
    'use strict'

    /**
     * 系统事件映射。此数组用于配置会在系统级别触发的事件单位。
     * 
     * - label: 事件标签，用于匹配对应的系统事件。
     * - achievementId: 触发的成就 ID。（）
     * - count: 触发次数。（初始需为0）
     * - target: 触发目标次数。count 达到 target 时会完成成就。
     * - isGlobal: 是否为全局保存式成就。（关闭游戏后仍保存触发次数）
     * - isFinish: 是否已完成。（初始需为false）
     */
    var systemEventMap = [
        { label: 'game_over_event', achievementId: 5, count: 0, target: 2, isGlobal: true, isFinish: false },
        { label: 'game_over_event', achievementId: 6, count: 0, target: 4, isGlobal: true, isFinish: false }
    ]

    /**
     * 敌人被击败映射。此数组用于配置会在特定敌人被击败时触发的成就。
     * 
     * - id: 敌人 ID。
     * - achievementId: 触发的成就 ID。
     * - count: 触发次数。（初始需为0）
     * - target: 触发目标次数。count 达到 target 时会完成成就。
     * - isGlobal: 是否为全局保存式成就。（关闭游戏后仍保存触发次数）
     * - isFinish: 是否已完成。（初始需为false）
     */
    var enemyDefeatedMap = [
        { id: 5, achievementId: 4, count: 0, target: 2, isGlobal: true, isFinish: false },
        { id: 4, achievementId: 3, count: 0, target: 4, isGlobal: false, isFinish: false }
    ]
    
    // 常量字符串
    var targetPluginsName = "Torigoya_Achievement";
    var GLOBAL_SAVE_SLOT_ID = "Achievement_Command";
    var SAVE_FILE_NAME = "customAchievement.rpgsave"; // 保存在本地路径的文件名，储存上述的map


    /**
     * 模拟调用成就系统的插件命令
     */
    function simulatePluginCommand(command, args) {
        var interpreter = new Game_Interpreter();
        interpreter.pluginCommand(command, args);
    };

    /**
     * 初始化全局数据
     */
    var _DataManager_createGameObjects = DataManager.createGameObjects;
    DataManager.createGameObjects = function () {
        _DataManager_createGameObjects.call(this);
        AchievementStorageManager.init();
    };
    // -------------------- 全局存储器逻辑 -------------------------------
    var AchievementStorageManager = (function () {
        function AchievementStorageManager() {
            // 添加不同的映射属性
            this._enemyDefeatedMap = [];
            this._systemEventMap = [];
            // 有多少map就初始化多少个...
        }

        AchievementStorageManager.prototype.init = function () {
            this.loadGlobalData();
        };

        AchievementStorageManager.prototype.getEnemyDefeatedMap = function () {
            return this._enemyDefeatedMap;
        };

        AchievementStorageManager.prototype.getSystemEventMap = function () {
            return this._systemEventMap;
        };

        AchievementStorageManager.prototype.setEnemyDefeatedMap = function (enemyDefeatedMap) {
            this._enemyDefeatedMap = enemyDefeatedMap;
            this.saveGlobalData();
        };

        AchievementStorageManager.prototype.setSystemEventMap = function (systemEventMap) {
            this._systemEventMap = systemEventMap;
            this.saveGlobalData();
        };

        AchievementStorageManager.prototype.resetMap = function (enemyDefeatedMap) {
            return enemyDefeatedMap.map(item => {
                // 如果 isGlobal 为 false，则重置 count
                if (!item.isGlobal) {
                    return { ...item, count: 0 };
                }
                return { ...item }; // 确保返回的是新对象，避免原数组数据被修改
            });
        }

        AchievementStorageManager.prototype.saveGlobalData = function () {
            var data = {
                enemyDefeatedMap: this.resetMap(this.getEnemyDefeatedMap()),
                systemEventMap: this.resetMap(this.getSystemEventMap()),
            };
            // console.log('保存全局数据：', data);
            StorageManager.save(GLOBAL_SAVE_SLOT_ID, JSON.stringify(data));
        }

        AchievementStorageManager.prototype.loadGlobalData = function () {
            try {
                var json = StorageManager.load(GLOBAL_SAVE_SLOT_ID);
                this._systemEventMap = JSON.parse(json).systemEventMap;
                // console.log('加载systemEventMap：', this._systemEventMap);
                this._enemyDefeatedMap = JSON.parse(json).enemyDefeatedMap;
                // console.log('加载enemyDefeatedMap：', this._enemyDefeatedMap);
            } catch (error) {
                console.error(error);
                this._enemyDefeatedMap = enemyDefeatedMap;
                this._systemEventMap = systemEventMap;
            }
        };

        return new AchievementStorageManager();
    })();

    // ---------------重写源代码存储器 --------------------------
    var upstream_StorageManager_localFilePath = StorageManager.localFilePath;
    StorageManager.localFilePath = function (savefileId) {
        if (savefileId === GLOBAL_SAVE_SLOT_ID) {
            return this.localFileDirectoryPath() + SAVE_FILE_NAME;
        }
        return upstream_StorageManager_localFilePath.apply(this, arguments);
    };

    var upstream_StorageManager_webStorageKey = StorageManager.webStorageKey;
    StorageManager.webStorageKey = function (savefileId) {
        if (savefileId === GLOBAL_SAVE_SLOT_ID) {
            return _storageKey;
        }
        return upstream_StorageManager_webStorageKey.apply(this, arguments);
    };
    // ------------------------------------------------------------------


    // ------------------- 敌人被击杀的逻辑判断 ----------------------------

    // 备份原始的 die 方法，避免影响游戏其他功能
    var _Game_Enemy_die = Game_Enemy.prototype.die;
    Game_Enemy.prototype.die = function () {
        // 记录敌人的 ID
        // console.log(`敌人 ${this.enemyId()} 被击败！`);
        // 在这里可以添加任何额外的逻辑，比如触发事件
        this.onEnemyDefeated(this.enemyId());

        // 调用原方法，确保 RPG Maker MV 的默认死亡逻辑仍然执行
        _Game_Enemy_die.call(this);
    };

    // 自定义函数：当敌人死亡时触发
    Game_Enemy.prototype.onEnemyDefeated = function (enemyId) {
        var map = AchievementStorageManager.getEnemyDefeatedMap();
        // 查找 enemyDefeatedMap 中是否有该敌人 ID
        var mapItem = map.find(item => item.id === enemyId);
        if (mapItem) {
            mapItem.count += 1; // 递增 count
            // console.log(`敌人 ID ${enemyId} 击败次数更新：${mapItem.count}/${mapItem.target}`);

            // 检查是否达到了目标数量
            if (mapItem.count >= mapItem.target && !mapItem.isFinish) {
                // console.log(`敌人 ID ${enemyId} 达到目标 ${mapItem.target}，添加成就。`, mapItem.achievementId);
                simulatePluginCommand("Achievement", [mapItem.achievementId]);
                mapItem.isFinish = true; // 标记为已完成
            }
        }
        AchievementStorageManager.setEnemyDefeatedMap(map);
    };
    // --------------------------------------------------------------------------


    // --------------------- 我方被团灭的逻辑 -------------------------------------
    function gameOverFunction() {
        var map = AchievementStorageManager.getSystemEventMap();
        // 遍历所有项，使用 switch 结构匹配 label
        map.forEach(mapItem => {
            switch (mapItem.label) {
                case 'game_over_event':
                    mapItem.count += 1;
                    // console.log(`被团灭次数更新：${mapItem.count}/${mapItem.target}`);
                    if (mapItem.count >= mapItem.target && !mapItem.isFinish) {
                        simulatePluginCommand("Achievement", [mapItem.achievementId]);
                        mapItem.isFinish = true; // 标记为已完成
                    }
                    break;
                default:
                    break;
            }
        });
        AchievementStorageManager.setSystemEventMap(map);
    }

    var _BattleManager_processDefeat = BattleManager.processDefeat;
    BattleManager.processDefeat = function () {
        gameOverFunction();
        // 调用原始方法，确保游戏逻辑正常执行
        _BattleManager_processDefeat.call(this);
    };

    //---------------------------------------------------------------------------

    // 检测被依赖的插件是否被正确加载
    if (!PluginManager._scripts.includes(targetPluginsName)) {
        console.error(`${targetPluginsName}.js插件没有被正常加载！`);
    } 
})();
