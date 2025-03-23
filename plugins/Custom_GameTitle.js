/*:
 * @plugindesc 显示从模糊到清晰的动画效果的游戏标题
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * @help
 * 此插件将在标题画面指定位置显示一个游戏标题的精灵图，并实现从模糊到清晰的动画效果。
 *
 * 
 * @param xAris 
 * @desc 标题精灵图的X坐标
 * @type number
 * @default 215
 * 
 * @param yAris 
 * @desc 标题精灵图的Y坐标
 * @type number
 * @default 100
 * 
 * @param filename 
 * @desc 标题精灵图的文件名
 * @type string
 * @default GameTitle
 * 
 * @param isMiddle
 * @desc 是否强制将标题精灵图显示在相对居中位置
 * @type boolean
 * @default false
 */
(function () {
    var parameters = PluginManager.parameters('Custom_GameTitle')
    var yAris = Number(parameters['yAris'] || 100);
    var filename = String(parameters['filename'] || "GameTitle");
    var xAris = Number(parameters['xAris'] || 215);
    var yAris = Number(parameters['yAris'] || 100);
    var isMiddle = parameters['isMiddle'] === "true";

    // 备份原来的 createForeground 方法
    var _Scene_Title_createForeground = Scene_Title.prototype.createForeground;
    // 创建一个可以读取自建文件里面的png资源的静态方法
    ImageManager.loadGameTitle = function (filename, hue) {
        return this.loadBitmap('img/gameTitle/', filename, hue, true);
    };

    // 标题菜单创建图像背景的源代码方法 
    Scene_Title.prototype.createForeground = function () {
        _Scene_Title_createForeground.call(this); // 调用原方法

        // 创建新的精灵图作为标题
        this._titleSprite = new Sprite(ImageManager.loadGameTitle(filename));
        this._titleSprite.y = isMiddle ? Graphics.height / 4 :  yAris; 
        this._titleSprite.x = isMiddle ? Graphics.width / 3   : xAris;
        this._titleSprite.alpha = 0; // 初始透明度
        this._titleSprite.filters = [new PIXI.filters.BlurFilter(10)]; // 初始模糊
        this.addChild(this._titleSprite); // 把图片添加到画面的调用方法

        // 从模糊到清晰的动画效果
        anime({
            targets: this._titleSprite,
            x: this._titleSprite.x, // 目标位置
            alpha: 1, // 透明度变化
            duration: 3000,
            easing: "easeOutElastic",
            update: function (anim) {
                let progress = anim.progress / 100; // 计算动画进度
                this._titleSprite.filters[0].blur = 10 * (1 - progress); // 逐渐减少模糊
            }.bind(this),
        });
    };

})();

