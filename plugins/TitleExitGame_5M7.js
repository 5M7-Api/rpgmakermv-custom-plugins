/*:
 * @plugindesc 添加退出游戏选项至标题菜单
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help 
标题菜单画面添加退出游戏的选项。
 * @param exit
 * @desc 选项显示的文本
 * @type string
 * @default exit
 */
(function () {
    // 本插件的文件名,用于正确映射输入参数
    var pluginsFileName = "TitleExitGame_5M7";

    // 存储rpgmaker mv工具输入的插件参数
    var parameters = PluginManager.parameters(pluginsFileName);
    var exitText = String(parameters["exit"] || "exit");

    var _Scene_Title_prototype_createCommandWindow =
        Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_prototype_createCommandWindow.call(this);
        this._commandWindow.setHandler(
            "exitGame",
            this.commandExitGame.bind(this)
        );
    };

    Scene_Title.prototype.commandExitGame = function () {
        SceneManager.exit() // rpgmaker mv中关闭游戏的方法
    };

    //继承原来的添加至主菜单选项（多插件有覆盖风险！）
    // var _Window_TitleCommand_makeCommandList =
    //     Window_TitleCommand.prototype.makeCommandList;

    // Window_TitleCommand.prototype.makeCommandList = function () {
    //     _Window_TitleCommand_makeCommandList.call(this);
    //     this.addCommand(exitText, "exitGame", true);
    // };

    // 如果需要外部菜单管理中插入选项，则定义并使用此方法
    Window_TitleCommand.prototype.addExitGameCommand = function () {
        this.addCommand(exitText, "exitGame", true);
    };

})()