/*:
 * @plugindesc 生成图鉴功能
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @param enemyBookName
 * @desc 显示的选项名
 * @default 图鉴
 *
 *
 * @help
 *  必须要在EnemyBook.js插件正确加载后，该插件才能正常运行。
 *
 */

(function () {
  var pluginsFileName = "EnemyBook_Command";
  var targetPluginsName = "EnemyBook";

  // 存储rpgmaker mv工具输入的插件参数
  var parameters = PluginManager.parameters(pluginsFileName);
  var bookName = String(parameters["enemyBookName"] || "EnemyBook");

  // 执行插件指令
  function simulatePluginCommand(command, args) {
    var interpreter = new Game_Interpreter();
    interpreter.pluginCommand(command, args); // command就是命令头（EnemyBook） args剩余的参数，是个数组
  }

  var _Scene_Menu_createCommandWindow =
    Scene_Menu.prototype.createCommandWindow;
  Scene_Menu.prototype.createCommandWindow = function () {
    _Scene_Menu_createCommandWindow.call(this);
    this._commandWindow.setHandler(
      "enemyBookMenu",
      this.commandEnemyBook.bind(this)
    );
  };

  Scene_Menu.prototype.commandEnemyBook = function () {
    // 将打开图鉴的插件命令传入方法执行
    simulatePluginCommand("EnemyBook", ["open"]);
  };

  Window_MenuCommand.prototype.isCommandEnemyBookEnabled = function () {
    if (!PluginManager._scripts.includes(targetPluginsName)) {
      console.error(`${targetPluginsName}.js插件没有被正常加载！`);
      return false;
    } else {
      return true;
    }
  };

  //继承原来的添加至主菜单选项（源代码空函数处）
  var _Window_MenuCommand_addOriginalCommands =
    Window_MenuCommand.prototype.addOriginalCommands;

  Window_MenuCommand.prototype.addOriginalCommands = function () {
    _Window_MenuCommand_addOriginalCommands.call(this);
    // ---------实际增加逻辑--------
    var enabled = this.isCommandEnemyBookEnabled();
    this.addCommand(bookName, "enemyBookMenu", enabled);
    //-------------------------------
  };

  // 如果需要外部菜单管理中插入选项，则定义并使用此方法
  // Window_MenuCommand.prototype.addEnemyBookCommand = function () {
  //   var enabled = this.isCommandEnemyBookEnabled();
  //   this.addCommand(bookName, "enemyBookMenu", enabled);
  // };
})();
