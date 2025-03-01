/*:
 * @plugindesc 生成CG相册选项功能
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @param CGallery
 * @desc 显示的选项名
 * @default CG album
 *
 *
 * @help
 *  必须要在kz_CGallery.js插件正确加载后，该插件才能正常运行。
 * 
 * 依赖插件来源 https://github.com/kenzakis2/RMP_kenzaki/tree/master/Pictures
 *
 */

(function () {
    var pluginsFileName = "kz_CGallery_Command";
    var targetPluginsName = "kz_CGallery";

    // 存储rpgmaker mv工具输入的插件参数
    var parameters = PluginManager.parameters(pluginsFileName);
    var albumName = String(parameters["CGallery"] || "CG album");

    // 执行插件指令
    function simulatePluginCommand(command, args) {
        var interpreter = new Game_Interpreter();
        interpreter.pluginCommand(command, args);
    }

    var _Scene_Title_prototype_createCommandWindow =
        Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_prototype_createCommandWindow.call(this);
        this._commandWindow.setHandler(
            "kz_CGallery",
            this.commandCGallery.bind(this)
        );
    };

    Scene_Title.prototype.commandCGallery = function () {
        // 将打开图鉴的插件命令传入方法执行
        simulatePluginCommand("picture_gallery");
    };

    Window_TitleCommand.prototype.isCommandCGalleryEnabled = function () {
        if (!PluginManager._scripts.includes(targetPluginsName)) {
            console.error(`${targetPluginsName}.js插件没有被正常加载！`);
            return false;
        } else {
            return true;
        }
    };

    //继承原来的添加至主菜单选项（多插件有覆盖风险！）
    // var _Window_TitleCommand_makeCommandList =
    //     Window_TitleCommand.prototype.makeCommandList;

    // Window_TitleCommand.prototype.makeCommandList = function () {
    //     _Window_TitleCommand_makeCommandList.call(this);
    //     // ---------实际增加逻辑--------
    //     var enabled = this.isCommandCGalleryEnabled();
    //     this.addCommand(albumName, "kz_CGallery", enabled);
    //     //-------------------------------
    // };

    // 如果需要外部菜单管理中插入选项，则定义并使用此方法
    Window_TitleCommand.prototype.addCGalleryCommand = function () {
      this.addCommand(albumName, "kz_CGallery",  this.isCommandCGalleryEnabled());
    };
})();
