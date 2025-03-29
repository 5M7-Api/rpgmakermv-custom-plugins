/*:
 * @plugindesc 在游戏画面上实时显示鼠标的 X 和 Y 坐标（包含最大值）
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * @help
 * 此插件将在游戏画面上实时显示点击位置的鼠标的 X 和 Y 坐标，长按鼠标可以动态变化。附带最大游戏渲染器尺寸。
 *
 * DEBUG使用，需要在正式环境下删除此插件。
 * 
 * @param fullScreen 
 * @desc 是否开启全屏游戏
 * @type boolean
 * @default false
 */

(function () {
    'use strict';

    var parameters = PluginManager.parameters('Window_Coordinate')
    var isFullScreen = parameters['fullScreen'] == 'true';
    isFullScreen && Graphics._requestFullScreen()

    // 创建一个全局变量来存储鼠标坐标显示的 Sprite
    var mouseTextSprite;

    /**
     * 在指定的场景中创建鼠标位置显示的 UI
     * @param {Scene_Base} scene - 当前的 RPG Maker 场景
     */
    function createMousePositionDisplay(scene) {
        mouseTextSprite = new Sprite(new Bitmap(250, 50)); // 创建 250x50 的位图
        mouseTextSprite.x = 10; // X 位置
        mouseTextSprite.y = 10; // Y 位置
        mouseTextSprite.bitmap.fontSize = 20; // 设置字体大小
        mouseTextSprite.bitmap.textColor = '#FFFFFF'; // 文字颜色
        mouseTextSprite.bitmap.outlineColor = '#000000'; // 文字描边
        mouseTextSprite.bitmap.outlineWidth = 4;
        scene.addChild(mouseTextSprite); // 将 Sprite 添加到场景
    }

    /**
     * 实时更新鼠标位置
     */
    function updateMousePosition(maxWidth, maxHeight) {
        if (mouseTextSprite) {
            var x = TouchInput.x; // 向上取整
            var y = TouchInput.y;
            mouseTextSprite.bitmap.clear(); // 清除上次绘制的文本
            mouseTextSprite.bitmap.drawText(`X: ${x} / ${maxWidth}`, 0, 0, 250, 25, 'left');
            mouseTextSprite.bitmap.drawText(`Y: ${y} / ${maxHeight}`, 0, 25, 250, 25, 'left');
        }
    }

    /**
     * 在多个场景添加鼠标 UI
     */
    function addMouseTrackerToScene(scene) {
        createMousePositionDisplay(scene); // 创建鼠标位置显示
        var _sceneUpdate = scene.update; // 备份原 update 方法
        scene.update = function () {
            _sceneUpdate.call(this);
            updateMousePosition(Graphics.width || 0, Graphics.height || 0); // 实时更新鼠标坐标
        };
    }

    // 在标题界面 Scene_Title 添加鼠标坐标 UI
    var _Scene_Title_createForeground = Scene_Title.prototype.createForeground;
    Scene_Title.prototype.createForeground = function () {
        _Scene_Title_createForeground.call(this);
        addMouseTrackerToScene(this);
    };

    // 在地图界面 Scene_Map 添加鼠标坐标 UI
    var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        addMouseTrackerToScene(this);
    };

    // 在游戏菜单界面 Scene_Menu 添加鼠标坐标 UI
    var _Scene_MenuBase_create = Scene_MenuBase.prototype.create;
    Scene_MenuBase.prototype.create = function () {
        _Scene_MenuBase_create.call(this);
        addMouseTrackerToScene(this);
    };
})();
