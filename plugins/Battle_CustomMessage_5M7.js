/*:
 * @plugindesc 针对特定敌群自定义战斗弹出信息
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * ◆ 使用方法：
 * - 在插件内部配置每个敌群ID对应的 遭遇/胜利/失败 文本。
 *
 * ◆ 注意事项：
 * - 如果某个敌群ID没有配置，使用默认系统信息。
 */

(function () {
    // -------------------- 需要填写配置的区域 ---------------------------
    var messages = {
        // 示例（敌群ID: 消息配置）
        8: {
            encounter: "你感到一股强烈的杀气...",
            victory: "你赢得了艰苦的胜利！",
            defeat: "你被困在永远的噩梦之中..."
        },
        15: {
            encounter: "这是断肢战斗测试敌群！",
            victory: "成功！",
            defeat: "失败..."
        },
        16: {
            encounter: "你遭遇了降头术士。",
            victory: "你击杀了降头术士。",
            defeat: "你被降头术士击败。"
        },
        17: {
            encounter: "你感到一股强烈的杀气...",
            victory: "你赢得了艰苦的胜利！",
            defeat: "你被困在永远的噩梦之中..."
        },
        // 继续添加其他敌群ID...
    };
    // ----------------------------------------------------------------

    // 遭遇时显示
    var _BattleManager_displayStartMessages = BattleManager.displayStartMessages;
    BattleManager.displayStartMessages = function () {
        var troopId = $gameTroop._troopId;
        var msgData = messages[troopId];

        if (msgData && msgData.encounter) {
            $gameMessage.add(msgData.encounter);
            $gameTroop.makeUniqueNames();
        } else {
            _BattleManager_displayStartMessages.call(this);
        }
    };

    // 胜利时显示
    var _BattleManager_displayVictoryMessage = BattleManager.displayVictoryMessage;
    BattleManager.displayVictoryMessage = function () {
        var troopId = $gameTroop._troopId;
        var msgData = messages[troopId];

        if (msgData && msgData.victory) {
            $gameMessage.add(msgData.victory);
        } else {
            _BattleManager_displayVictoryMessage.call(this);
        }
    };

    // 失败时显示
    var _BattleManager_displayDefeatMessage = BattleManager.displayDefeatMessage;
    BattleManager.displayDefeatMessage = function () {
        var troopId = $gameTroop._troopId;
        var msgData = messages[troopId];

        if (msgData && msgData.defeat) {
            $gameMessage.add(msgData.defeat);
        } else {
            _BattleManager_displayDefeatMessage.call(this);
        }
    };
})();
