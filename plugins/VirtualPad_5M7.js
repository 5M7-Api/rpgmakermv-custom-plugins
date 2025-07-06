/*:
 * @target MV
 * @plugindesc 地图场景使用虚拟按钮替代点击事件（已屏蔽点击事件）
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help 
 * 
 * 地图场景使用system文件夹内的图像作为虚拟按钮的可交互元素。
 * 
 * 需注意本插件内置默认屏蔽掉了地图场景中的点击移动事件。
 * 
 * 其他场景的点击事件未屏蔽，依照最初形式运作。
 *
 * @param ButtonUpImage
 * @text 上键按钮图像
 * @default upKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonDownImage
 * @text 下键按钮图像
 * @default downKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonLeftImage
 * @text 左键按钮图像
 * @default leftKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonRightImage
 * @text 右键按钮图像
 * @default rightKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonOkImage
 * @text 确认键图像
 * @default okKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonCancelImage
 * @text 取消键图像
 * @default cancelKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonMenuImage
 * @text 菜单键图像
 * @default menuKey
 * @type file
 * @dir img/system/
 *
 * @param ButtonOpacity
 * @text 按钮不透明度
 * @desc 所有虚拟按钮的基础透明度（0~100）
 * @type number
 * @min 0
 * @max 100
 * @default 100
 */

(function () {
    'use strict';

    var parameters = PluginManager.parameters('VirtualPad_5M7');
    var buttonUp = parameters['ButtonUpImage'] || 'upKey';
    var buttonDown = parameters['ButtonDownImage'] || 'downKey';
    var buttonLeft = parameters['ButtonLeftImage'] || 'leftKey';
    var buttonRight = parameters['ButtonRightImage'] || 'rightKey';
    var buttonOk = parameters['ButtonOkImage'] || 'okKey';
    var buttonCancel = parameters['ButtonCancelImage'] || 'cancelKey';
    var buttonMenu = parameters['ButtonMenuImage'] || 'menuKey';
    var buttonOpacity = Number(parameters['ButtonOpacity'] || 100) / 100;

    // 屏蔽点击地图行走行为
    Game_Temp.prototype.setDestination = function (x, y) { };

    // 定义虚拟按键类
    function VirtualPadButton(inputType) {
        this.initialize(inputType);
    }
    VirtualPadButton.prototype = Object.create(Sprite_Button.prototype);
    VirtualPadButton.prototype.constructor = VirtualPadButton;

    VirtualPadButton.prototype.initialize = function (inputType) {
        Sprite_Button.prototype.initialize.call(this);
        this._inputType = inputType; // 输入类型：方向键（数字）或功能键（字符串）
        this._tinting = false; // 是否正在动画中
        this.opacity = buttonOpacity * 255;
    };

    // 此函数为心跳函数！
    VirtualPadButton.prototype.update = function () {
        Sprite_Button.prototype.update.call(this);
        if (this.visible && this.isButtonTouched()) {
            if (TouchInput.isPressed()) {
                if (!this._tinting) this.animatePressEffect();

                if (typeof this._inputType === 'number') {
                    // 数字方向键对应的 Input 名称映射
                    var dirMap = {
                        2: 'down',
                        4: 'left',
                        6: 'right',
                        8: 'up'
                    };
                    var dir = dirMap[this._inputType];
                    if (dir) {
                        Input._currentState[dir] = true;
                    }
                } else {
                    switch (this._inputType) {
                        case 'ok':
                            Input._currentState['ok'] = true;  // input类进行对应输入执行函数
                            break;
                        case 'cancel':
                            Input._currentState['cancel'] = true;
                            break;
                        case 'menu':
                            AudioManager.playSe({ name: 'Decision1', volume: 90, pitch: 100, pan: 0 });
                            SceneManager.push(Scene_Menu);
                            break;
                    }
                }
            } else {
                if (typeof this._inputType === 'string') {
                    Input._currentState[this._inputType] = false;
                } else if (typeof this._inputType === 'number') {
                    var dirMap = {
                        2: 'down',
                        4: 'left',
                        6: 'right',
                        8: 'up'
                    };
                    var dir = dirMap[this._inputType];
                    if (dir) {
                        Input._currentState[dir] = false;
                    }
                }
            }
        }
    };

    VirtualPadButton.prototype.animatePressEffect = function () {
        this._tinting = true;
        var sprite = this;
        if (typeof anime === 'function') {
            anime({
                targets: sprite,                    // 动画目标对象（PIXI 精灵）
                tint: [0xFFFFFF, 0xFF6666],         // 从白色过渡到淡红色（tint 是 PIXI 的着色属性）
                duration: 0,                        // 突变
                complete: function () {
                    sprite.tint = 0xFFFFFF;        // 动画结束后恢复为白色
                    sprite._tinting = false;       // 标记动画已完成，可用于控制重复触发
                }
            });
        }
    };

    // 虚拟键盘封装实现方法
    function createVirtualDPadForScene(scene) {
        scene._dpadButtons = [];

        // 这里为按钮实际功能定义区域。x、y为按钮位置，type为按钮类型（数字或字符串）
        var dirButtons = [
            { name: buttonUp, type: 8, x: 100, y: Graphics.height - 160 },
            { name: buttonDown, type: 2, x: 100, y: Graphics.height - 60 },
            { name: buttonLeft, type: 4, x: 50, y: Graphics.height - 110 },
            { name: buttonRight, type: 6, x: 150, y: Graphics.height - 110 }
        ];

        var funcButtons = [
            { name: buttonOk, type: 'ok', x: Graphics.width - 160, y: Graphics.height - 120 },
            { name: buttonCancel, type: 'cancel', x: Graphics.width - 220, y: Graphics.height - 60 },
            { name: buttonMenu, type: 'menu', x: Graphics.width - 100, y: Graphics.height - 60 }
        ];

        var allButtons = dirButtons.concat(funcButtons);

        for (var i = 0; i < allButtons.length; i++) {
            var cfg = allButtons[i];
            var btn = new VirtualPadButton(cfg.type);
            btn.bitmap = ImageManager.loadSystem(cfg.name);
            btn.x = cfg.x;
            btn.y = cfg.y;
            btn.z = 1;
            bindAlphaHitTest(btn);
            scene.addChild(btn);
            scene._dpadButtons.push(btn);
            // console.log('create virtual', cfg.name, 'at', cfg.x, cfg.y)
        }
    }


    // 注入场景-地图类
    var _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function () {
        _Scene_Map_createAllWindows.call(this);
        createVirtualDPadForScene(this);
    };


    // 基于精灵透明度的命中测试绑定
    function bindAlphaHitTest(sprite) {
        sprite.bitmap.addLoadListener(function (bitmap) {
            if (!bitmap || !bitmap._context) return;

            var canvas = bitmap._canvas;
            var context = canvas.getContext("2d");

            sprite.isButtonTouched = function () {
                var x = TouchInput.x - this.x;
                var y = TouchInput.y - this.y;
                var localX = Math.floor(x + this.anchor.x * -this.width);
                var localY = Math.floor(y + this.anchor.y * -this.height);

                if (localX < 0 || localY < 0 || localX >= bitmap.width || localY >= bitmap.height) {
                    return false;
                }

                var pixel = context.getImageData(localX, localY, 1, 1).data;
                return pixel[3] > 0;
            };
        });
    }

    // console.log("✅ 虚拟方向 + 功能按钮插件已启用");
})();
