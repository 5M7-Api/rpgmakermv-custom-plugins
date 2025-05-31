/*:
 * @target MV
 * @plugindesc 将素材创建成一个顶部导航栏的样式，并形成交互按钮。
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * 
 * @param Button1Image
 * @text 按钮1图像
 * @desc 位于 img/system/ 的按钮1图像
 * @default button1
 * @type file
 * @dir img/system/
 *
 * @param Button2Image
 * @text 按钮2图像
 * @desc 位于 img/system/ 的按钮2图像
 * @default button2
 * @type file
 * @dir img/system/
 *
 * @param BackgroundImage
 * @text 背景图像
 * @desc 位于 img/system/ 的背景图
 * @default buttonBg
 * @type file
 * @dir img/system/
 */

(function () {
    'use strict';

    var FILENAME = 'Custom_Toolbar_5M7'; // 文件名
    var parameters = PluginManager.parameters(FILENAME);
    var button1Image = parameters['Button1Image'] || 'button1';
    var button2Image = parameters['Button2Image'] || 'button2';
    var backgroundImage = parameters['BackgroundImage'] || 'buttonBg';

    // 按下按钮缩放触发动画效果
    function clickedAnime(btnObj) {
        anime({
            targets: btnObj.scale,  // 动画的目标对象，这里是按钮的 scale 属性（即缩放对象）

            // X 轴缩放动画序列
            x: [
                { value: 1.2, duration: 80 }, // 第一步：在 80ms 内将 x 缩放值变为 1.2（放大）
                { value: 0.9, duration: 80 }, // 第二步：在 80ms 内缩小到 0.9（比原始略小）
                { value: 1.0, duration: 80 }  // 第三步：在 80ms 内恢复到原始大小 1.0
            ],

            // Y 轴缩放动画序列（与 X 同步）
            y: [
                { value: 1.2, duration: 80 }, // 同样的放大
                { value: 0.9, duration: 80 }, // 同样的缩小
                { value: 1.0, duration: 80 }  // 同样的恢复
            ],

            easing: 'easeInOutQuad' // 使用「缓入缓出」的动画节奏（先慢→快→慢），让动画更自然
        });
    }

    // 跳转到游戏内的菜单
    function gotoGameMenu() {
        // SceneManager.push(Scene_Menu); // 菜单界面
        SceneManager.push(Scene_Save); // 存档界面
        // SceneManager.push(Scene_Load); // 读档界面
    }

    // 跳转到外部链接
    function gotoWebLink() {
        window.open('https://space.bilibili.com/11635476/upload/video');
    }

    var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;

    // 游戏地图画面添加这些元素
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        this.createMapButtons();
    };

    Scene_Map.prototype.createMapButtons = function () {
        // 创建背景
        var background = new Sprite();
        background.bitmap = ImageManager.loadSystem(backgroundImage);
        // 背景图的位置x\y\z轴
        background.x = 0;
        background.y = 0;
        background.z = 1;
        this.addChild(background);

        // 创建按钮1
        var button1 = new Sprite_Button();
        button1.bitmap = ImageManager.loadSystem(button1Image);
        // 按钮1的位置x\y\z轴
        button1.x = 0;
        button1.y = 0;
        button1.z = 10;
        // 注册成“点击”操作触发的事件
        button1.setClickHandler(function () {
            // console.log('按钮1被点击！');
            AudioManager.playSe({ name: 'Decision1', volume: 90, pitch: 100, pan: 0 }); // 播放音效
            clickedAnime(button1);
            gotoGameMenu();
        });
        this.addChild(button1);

        // 创建按钮2
        var button2 = new Sprite_Button();
        button2.bitmap = ImageManager.loadSystem(button2Image);
        // 按钮2的位置x\y\z轴
        button2.x = 200;
        button2.y = 0;
        button2.z = 10;
        // 注册成“点击”操作触发的事件
        button2.setClickHandler(function () {
            // console.log('按钮2被点击！');
            AudioManager.playSe({ name: 'Decision2', volume: 90, pitch: 100, pan: 0 }); // 播放音效
            clickedAnime(button2);
            gotoWebLink();
        });
        this.addChild(button2);

        // 可选存储
        this._mapButtons = [button1, button2];

        // ✅ 按 z 值排序子元素（使覆盖层级生效）
        this.children.sort(function (a, b) {
            return (a.z || 0) - (b.z || 0);
        });

        bindAlphaHitTest(button1);
        bindAlphaHitTest(button2);
    };

    /**
    * 注意移动端不适配！-> 移动设备添加虚拟摇杆代替地图点击事件
    */
    Game_Temp.prototype.setDestination = function (x, y) {
        // 空实现，屏蔽默认点击移动行为
    };

    /**
     * 基于精灵图透明度进行点击判定，透明位置不算作交互区域。
     */
    function bindAlphaHitTest(sprite) {
        // 加载完成监听器，等到精灵图对象加载完毕再执行函数
        sprite.bitmap.addLoadListener(function (bitmap) {
            if (!bitmap || !bitmap._context) return; // 防止未加载完毕

            // 创建 offscreen canvas（防止频繁调用 getImageData 性能下降）
            var canvas = bitmap._canvas; // 获取html的canvas元素对象
            var context = canvas.getContext("2d"); // 获取2D渲染上下文对象 https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement/getContext

            // 完全从底层重构点击事件方法，覆盖掉 Sprite_Button.prototype.isButtonTouched 
            sprite.isButtonTouched = function () {
                var x = TouchInput.x - this.x;
                var y = TouchInput.y - this.y;

                // 考虑锚点（默认 0.5）-> 鼠标点击位置从全局坐标转换成精灵图内部坐标算法
                var localX = Math.floor(x + this.anchor.x * -this.width);
                var localY = Math.floor(y + this.anchor.y * -this.height);

                // 确保鼠标在目标精灵图内部，否则直接返回false不视为交互区域
                if (localX < 0 || localY < 0 || localX >= bitmap.width || localY >= bitmap.height) {
                    return false;
                }

                /**
                 * 
                 * 返回点击到的目标像素的数据信息
                 * 
                 * pixel[0] → R（红色分量 0~255）
                 * pixel[1] → G（绿色分量 0~255）
                 * pixel[2] → B（蓝色分量 0~255）
                 * pixel[3] → A（透明度分量 0~255）
                 */
                var pixel = context.getImageData(localX, localY, 1, 1).data;
                return pixel[3] > 0; // 只要有透明度，就视为交互区域
            };

            // console.log('✅ Sprite_Button 透明区域判定功能已注入。');
        });
    }
})();


// 额外的监听事件，注意这些事件的前提都是鼠标要按住才行！
// button.setHoverHandler(function () {
//     console.log("鼠标悬浮！");
// });
// button.setMouseDownHandler(function () {
//     console.log("按下！");
// });
// button.setMouseUpHandler(function () {
//     console.log("松开！");
// });
// button.setLeaveHandler(function () {
//     console.log("鼠标离开！");
// });
