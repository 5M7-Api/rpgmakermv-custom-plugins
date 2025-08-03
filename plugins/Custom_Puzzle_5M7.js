/*:
 * @target MV
 * @plugindesc 生成一个自制的谜题场景
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 * @help 
 * 
 * 该插件可以在一个事件页中部署一个解谜场景。
 * 
 * 场景所涉及到的所有png图像需放置在img/system目录下。
 * 
 * 可供外部调用的事件脚本：
 * 
 * PuzzleManager.run();
 * 
 * 进入解谜场景的脚本。
 * 
 * PuzzleManager.isQuit();
 * 
 * 判断玩家是否中途退出了场景。
 * 
 * PuzzleManager.isSovled();
 * 
 * 判断玩家是否完成了解谜。
 * 
 */

/** 全局变量 */
var _5M7_Puzzle = _5M7_Puzzle || {}; // 静态渲染的元素

var _5M7_SPRITE_TYPE = {
    IMAGE: 'image',
    CLICK_BUTTON: 'click_button',
}
var _5M7_SYMBOL_TYPE = {
    symbol1: 'db_symbol1',
    symbol2: 'db_symbol2',
    symbol3: 'db_symbol3',
}
_5M7_Puzzle.dashboard = {
    type: _5M7_SPRITE_TYPE.IMAGE,
    name: 'dashboard',
    x: 200,
    y: 110,
    z: 1,
}
_5M7_Puzzle.button1 = {
    type: _5M7_SPRITE_TYPE.CLICK_BUTTON,
    name: 'db_btn1',
    x: 230,
    y: 230,
    z: 5,
    clickHandler: function () {
        // console.log('点击了按钮1');
        AudioManager.playSe({ name: 'Decision1', volume: 90, pitch: 100, pan: 0 }); // 播放音效
        clickedAnime(this); // this指向指向函数注册器的对象
        PuzzleManager.addSymbol(_5M7_SYMBOL_TYPE.symbol1);
    }
};
_5M7_Puzzle.button2 = {
    type: _5M7_SPRITE_TYPE.CLICK_BUTTON,
    name: 'db_btn2',
    x: 330,
    y: 230,
    z: 5,
    clickHandler: function () {
        // console.log('点击了按钮2');
        AudioManager.playSe({ name: 'Decision2', volume: 90, pitch: 100, pan: 0 }); // 播放音效
        clickedAnime(this); // this指向指向函数注册器的对象
        PuzzleManager.addSymbol(_5M7_SYMBOL_TYPE.symbol2);
    }
};

_5M7_Puzzle.button3 = {
    type: _5M7_SPRITE_TYPE.CLICK_BUTTON,
    name: 'db_btn3',
    x: 430,
    y: 230,
    z: 5,
    clickHandler: function () {
        // console.log('点击了按钮3');
        AudioManager.playSe({ name: 'Decision2', volume: 90, pitch: 100, pan: 0 }); // 播放音效
        clickedAnime(this); // this指向指向函数注册器的对象
        PuzzleManager.addSymbol(_5M7_SYMBOL_TYPE.symbol3);
    }
}
_5M7_Puzzle.enterButton = {
    type: _5M7_SPRITE_TYPE.CLICK_BUTTON,
    name: 'db_enter',
    x: 300,
    y: 350,
    z: 5,
    clickHandler: function () {
        // console.log('点击了确认按钮');
        AudioManager.playSe({ name: 'Decision1', volume: 90, pitch: 100, pan: 0 }); // 播放音效
        clickedAnime(this); // this指向指向函数注册器的对象
        // PuzzleManager.setSovled(true); // 标记谜题已解答
        // 谜题正确性判断
        var result = PuzzleManager.checkSymbols()
        PuzzleManager.setSovled(result);
    }
}
_5M7_Puzzle.cancelButton = {
    type: _5M7_SPRITE_TYPE.CLICK_BUTTON,
    name: 'cancelKey',
    x: 100,
    y: 50,
    z: 5,
    clickHandler: function () {
        // console.log('点击了取消按钮');
        AudioManager.playSe({ name: 'Close3', volume: 90, pitch: 100, pan: 0 }); // 播放音效
        clickedAnime(this); // this指向指向函数注册器的对象
        SceneManager.pop();   // 返回游戏画面
    }
}


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

// #region ------------------- 静态工具类函数 ----------
function PuzzleManager() {
    throw new Error('This is a static class');
}

/** 静态变量 */
PuzzleManager.params = {}

/** 信号变量初始化 */
PuzzleManager.initialize = function () {
    this.params = {
        isSovled: false,
        isQuit: false,
        symbolArray: [],
        correctSymbols: [_5M7_SYMBOL_TYPE.symbol1, _5M7_SYMBOL_TYPE.symbol2, _5M7_SYMBOL_TYPE.symbol3, _5M7_SYMBOL_TYPE.symbol1, _5M7_SYMBOL_TYPE.symbol1],
    };
}


/** 进入谜题场景主函数 */
PuzzleManager.run = function () {
    this.initialize(); // 初始化信号变量
    SceneManager.push(Scene_Puzzle);
};

/** 退出谜题场景 */
PuzzleManager.quit = function () {
    this.params.isQuit = true; // 标记退出状态
    SceneManager.pop();
};

/** 判断谜题是否已解决 */
PuzzleManager.isSovled = function () {
    return this.params.isSovled;
};

/** 判断是否中途退出了场景 */
PuzzleManager.isQuit = function () {
    return this.params.isQuit;
};

/** 设置谜题解决状态 */
PuzzleManager.setSovled = function (flag) {
    this.params.isSovled = flag;
    this.quit(); // 解谜成功，返回游戏画面
};

/** 添加一个输入的符号 */
PuzzleManager.addSymbol = function (symbol) {
    this.params.symbolArray.push(symbol);
}

/** 生成一个符号精灵对象 */
PuzzleManager.genSymbolSprite = function (symbol) {
    var limit = 5;// 可输入的极限值
    if (this.params.symbolArray.length >= limit + 1) {
        console.warn('符号数组已满，无法添加符号：' + symbol);
        this.params.symbolArray.pop(); // 删除最后超出限制的符号  
        return;
    }
    // 逆向匹配
    var foundIndex = -1;
    for (var i = this.params.symbolArray.length - 1; i >= 0; i--) {
        if (this.params.symbolArray[i] === symbol) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex < 0) {
        console.error('非法符号：' + symbol);
        return;
    }

    // 计算位置（基于最大索引）
    var x = 220 + foundIndex * 50;
    var y = 135;
    var z = 5;
    // 创建精灵对象
    var sprite = new Sprite();
    sprite.bitmap = ImageManager.loadSystem(symbol);
    sprite.x = x;
    sprite.y = y;
    sprite.z = z;
    return sprite;
}

/** 判断密码是否正确 */
PuzzleManager.checkSymbols = function () {
    var symbolArray = PuzzleManager.params.symbolArray;
    if (symbolArray.length !== 5) return false; // 密码长度不正确
    var correctSymbols = this.params.correctSymbols;
    for (var i = 0; i < symbolArray.length; i++) {
        if (symbolArray[i] !== correctSymbols[i]) return false; // 密码不正确
    }
    return true; // 密码正确
}
// #endregion


// #region ------------------- 解谜场景类 ---------------------------
function Scene_Puzzle() {
    this.initialize.apply(this, arguments);
}

Scene_Puzzle.prototype = Object.create(Scene_Base.prototype);
Scene_Puzzle.prototype.constructor = Scene_Puzzle;

Scene_Puzzle.prototype.initialize = function () {
    Scene_Base.prototype.initialize.call(this);
    this._puzzle_sprites_map = {}; // 保存精灵对象列表
    this._puzzle_symbols = []; // 保存已输入的符号列表
};

/** 激活心跳函数的必要方法 */
Scene_Puzzle.prototype.start = function () {
    Scene_Base.prototype.start.call(this);
};

/** 心跳函数本体 */
Scene_Puzzle.prototype.update = function () {
    Scene_Base.prototype.update.call(this);
    if (this.needRenderSymbol()) {
        // console.log('检测通过，渲染符号', this._puzzle_symbols)
        this.createDisPlayedSymbols();
    } else {
        // console.log('检测失败，不需要渲染符号', this._puzzle_symbols)
    }
};

Scene_Puzzle.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    this.createBackground();
    this.createWindowLayer();
    this.createPuzzleScene();
};

/** 判断是否重复初始化渲染对象（性能优化） */
Scene_Puzzle.prototype.needRenderSymbol = function () {
    var symbolArray = PuzzleManager.params.symbolArray;
    if (symbolArray.length === 0 && this._puzzle_symbols.length === symbolArray.length) return false; // 跳过渲染的条件
    return true;
}

/** 渲染最后输入的符号 */
Scene_Puzzle.prototype.createDisPlayedSymbols = function () {
    var symbolArray = PuzzleManager.params.symbolArray;
    var symbolSprite = PuzzleManager.genSymbolSprite(symbolArray[symbolArray.length - 1]) // 返回最后一个符号元素更新
    if (symbolSprite) this.addChild(symbolSprite);
    this._puzzle_symbols = symbolArray; // 更新已渲染的符号数组
}

/** 创建整体场景的失焦背景 */
Scene_Puzzle.prototype.createBackground = function () {
    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = SceneManager.backgroundBitmap();
    this.addChild(this._backgroundSprite);
};

/** 创建场景窗口层 */
Scene_Puzzle.prototype.createPuzzleScene = function () {
    this.createSprites();
};

/** 创建场景对象要用到的所有精灵图对象 */
Scene_Puzzle.prototype.createSprites = function () {
    // 遍历创建精灵图对象实例和缓存（注意this指针回归到Scene_Puzzle实例）
    Object.keys(_5M7_Puzzle).forEach(function (key) {
        var spriteConfig = _5M7_Puzzle[key];
        this.createSprite(spriteConfig);
    }, this);

    // 将缓存在对象内的精灵图对象添加到场景中
    this.addSprites();
};

/** 精灵图创建的主函数 */
Scene_Puzzle.prototype.createSprite = function (spriteConfig) {
    var type = spriteConfig.type;
    switch (type) {
        case _5M7_SPRITE_TYPE.IMAGE:
            this.createImageSprite(spriteConfig);
            break;

        case _5M7_SPRITE_TYPE.CLICK_BUTTON:
            this.createClickableButton(spriteConfig);
            break;
        default:
            console.error('未知的精灵图类型：' + type);
            break;
    }
}

/** 创建静态精灵图 */
Scene_Puzzle.prototype.createImageSprite = function (spriteConfig) {
    // 配置对象解构
    var imageName = spriteConfig.name;
    var x = spriteConfig.x;
    var y = spriteConfig.y;
    var z = spriteConfig.z;

    if (this._puzzle_sprites_map[imageName]) return;// 防止重复创建精灵图对象
    var sprite = new Sprite();
    sprite.bitmap = ImageManager.loadSystem(imageName);
    sprite.x = x;
    sprite.y = y;
    sprite.z = z;
    this._puzzle_sprites_map[imageName] = sprite;
};

/** 创建可点击交互的按钮精灵图对象 */
Scene_Puzzle.prototype.createClickableButton = function (spriteConfig) {
    // 配置对象解构
    var imageName = spriteConfig.name;
    var x = spriteConfig.x;
    var y = spriteConfig.y;
    var z = spriteConfig.z;
    var clickHandler = spriteConfig.clickHandler;

    if (this._puzzle_sprites_map[imageName]) return;// 防止重复创建精灵图对象
    var button = new Sprite_Button();
    button.bitmap = ImageManager.loadSystem(imageName);
    button.x = x;
    button.y = y;
    button.z = z;
    button.setClickHandler(clickHandler);
    // 使alpha值大于0的区域可点击
    bindAlphaHitTest(button);
    this._puzzle_sprites_map[imageName] = button;
};

/** 将缓存在对象内的精灵图对象添加到场景中 */
Scene_Puzzle.prototype.addSprites = function () {
    var spritesMap = this._puzzle_sprites_map;
    for (var key in spritesMap) {
        if (Object.prototype.hasOwnProperty.call(spritesMap, key)) {
            this.addChild(spritesMap[key]);
        }
    }
    // z轴覆盖层级重排序
    this.children.sort(function (a, b) {
        return (a.z || 0) - (b.z || 0);
    });
}
// #endregion



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
