/*:
 * @plugindesc 添加跳转链接选项至标题菜单
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help 
标题菜单画面添加跳转到指定链接的选项。
 * @param linkName
 * @desc 选项显示的文本
 * @type string
 * @default more games
 * 
 * @param url
 * @desc 需要跳转的链接
 * @type string
 * @default https://space.bilibili.com/11635476?spm_id_from=333.337.0.0
 */
(function () {
    // 本插件的文件名,用于正确映射输入参数
    var pluginsFileName = "TitleLink_5M7";

    // 存储rpgmaker mv工具输入的插件参数
    var parameters = PluginManager.parameters(pluginsFileName);
    var herfText = String(parameters["linkName"] || "more games");
    var urlLink = String(parameters["url"] || "https://space.bilibili.com/11635476?spm_id_from=333.337.0.0");

    function openUrlUsingATag(url) {
        var a = document.createElement("a");
        console.log(url)
        a.href = url;
        a.target = "_blank"; // 在新窗口打开
        a.rel = "noopener noreferrer"; // 安全性提升，防止恶意站点获取 window 访问权限
        document.body.appendChild(a);
        a.click(); // 触发点击
        document.body.removeChild(a); // 跳转后立即删除
    }

    var _Scene_Title_prototype_createCommandWindow =
        Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_prototype_createCommandWindow.call(this);
        this._commandWindow.setHandler(
            "urlHerf",
            this.commandUrlHerf.bind(this)
        );
    };

    Scene_Title.prototype.commandUrlHerf = function () {
        openUrlUsingATag(urlLink);
        this._commandWindow.activate(); // 防止游戏卡死
    };

    //继承原来的添加至主菜单选项（多插件有覆盖风险！）
    // var _Window_TitleCommand_makeCommandList =
    //     Window_TitleCommand.prototype.makeCommandList;

    // Window_TitleCommand.prototype.makeCommandList = function () {
    //     _Window_TitleCommand_makeCommandList.call(this);
    //     this.addCommand(herfText, "urlHerf", true);
    // };

    // 如果需要外部菜单管理中插入选项，则定义并使用此方法
    Window_TitleCommand.prototype.addUrlHerfCommand = function () {
        this.addCommand(herfText, "urlHerf", true);
    };

})()