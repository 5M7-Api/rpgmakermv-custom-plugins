// 备份原来的 createForeground 方法
var _Scene_Title_createForeground = Scene_Title.prototype.createForeground;

// 创建一个可以读取自建文件里面的png资源的静态方法
ImageManager.loadGameTitle = function(filename, hue) {
    return this.loadBitmap('img/gameTitle/', filename, hue, true);
};

// 标题菜单创建图像背景的源代码方法 
Scene_Title.prototype.createForeground = function () {
    _Scene_Title_createForeground.call(this); // 调用原方法

    // 创建新的精灵图作为标题
    this._titleSprite = new Sprite(ImageManager.loadGameTitle("GameTitle")); 
    this._titleSprite.y = 0; // 图片加载到游戏画面位置
    this._titleSprite.x = 215;
    this._titleSprite.alpha = 0; // 初始透明度
    this._titleSprite.filters = [new PIXI.filters.BlurFilter(10)]; // 初始模糊
    this.addChild(this._titleSprite); // 把图片添加到画面的调用方法

    // 从模糊到清晰的动画效果
    anime({
        targets: this._titleSprite,
        x: 215, // 目标位置
        alpha: 1, // 透明度变化
        duration: 3000,
        easing: "easeOutElastic",
        update: function(anim) {
            let progress = anim.progress / 100; // 计算动画进度
            this._titleSprite.filters[0].blur = 10 * (1 - progress); // 逐渐减少模糊
        }.bind(this),
    });
};
