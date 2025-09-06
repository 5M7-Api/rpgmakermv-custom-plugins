/*:
 * @plugindesc rmmv自制仪表盘窗口的示例代码
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 该插件可以生成一个菜单选项，用于显示装备的具体属性信息。
 * 
 * 本插件主要用于实现该功能的模板代码示例。
 */
(function () {
    var parameters = PluginManager.parameters('Menu_Demo');

    // 生成Demo3窗口的文本内容
    function genDemo3Text(item) {
         console.log('操作的道具对象', item)
        var fullText = ""
        var paramsTextObject = {}
        paramsTextObject.hp = "最大HP：" + item.params[0];
        paramsTextObject.mp = "最大MP：" + item.params[1];
        paramsTextObject.atk = "攻击力：" + item.params[2];
        paramsTextObject.def = "防御力：" + item.params[3];
        paramsTextObject.matk = "魔法攻击：" + item.params[4];
        paramsTextObject.mdef = "魔法防御：" + item.params[5];
        paramsTextObject.agi = "敏捷度：" + item.params[6];
        paramsTextObject.hit = "幸运：" + item.params[7];
        paramsTextObject.other = "特殊能力：" + "\n" + "功能尚未实现";
        console.log('属性文本参数对象', paramsTextObject)
        var paramsTexts = Object.keys(paramsTextObject).map(function (key) {
            return paramsTextObject[key];
        }).join("\n");

        fullText = paramsTexts

        return fullText
    }

    // 生成新的原型方法，继承原来的新建菜单的方法
    var _Scene_Menu_createCommandWindow =
        Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function () {
        _Scene_Menu_createCommandWindow.call(this);
        this._commandWindow.setHandler("demo", this.commandDemo.bind(this));
    };

    /** 菜单选项的实际作用方法 */
    Scene_Menu.prototype.commandDemo = function () {
        SceneManager.push(Scene_Demo);
    };

    /** 菜单选项的可用性判断 */
    Window_MenuCommand.prototype.isDemoEnabled = function () {
        if (DataManager.isEventTest()) return false;
        return true;
    };

    /** 将选项添加到菜单画面的方法 */
    Window_MenuCommand.prototype.addDemoCommand = function () {
        var enabled = this.isDemoEnabled();
        this.addCommand('装备仪表盘测试', "demo", enabled);
    };

    //#region ----------------------------------------- 场景类 制造一个测试场景类 -------------------------------------
    function Scene_Demo() {
        this.initialize.apply(this, arguments);
    }
    Scene_Demo.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Demo.prototype.constructor = Scene_Demo;

    Scene_Demo.prototype.initialize = function () {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    /** 根创建函数，决定这个场景中要创建哪些窗口 */
    Scene_Demo.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow(); // 顶部帮助窗口
        this.createDemo3Window(); // 基础类Demo3窗口
        this.createDemo1Window(); // 自定义Demo1窗口
        this.createDemo2Window(); // 自定义Demo2窗口
    };

    /** 创建Demo1窗口页 */
    Scene_Demo.prototype.createDemo1Window = function () {
        // 初始化窗口类和从属关系
        this._demo1Window = new Window_Demo1(); // 实例化窗口类
        this._demo1Window.setHelpWindow(this._helpWindow); // 设置帮助窗口（基类中初始化）
        this._demo1Window.setDemo3Window(this._demo3Window); // 设置Demo3窗口（基类中初始化）

        this._demo1Window.y = this._helpWindow.height; // 窗口位置
        // 窗口类中的确定和取消动作函数逻辑
        this._demo1Window.setHandler('ok', this.onDemo1Ok.bind(this));
        this._demo1Window.setHandler('cancel', this.popScene.bind(this));
        // 将初始化好的窗口对象添加到画面
        this.addWindow(this._demo1Window);
    };

    /** 创建Demo2窗口页 */
    Scene_Demo.prototype.createDemo2Window = function () {
        var wy = this._demo1Window.y + this._demo1Window.height;
        var wh = Graphics.boxHeight - wy;
        // 初始化窗口类和从属关系
        this._demo2Window = new Window_Demo2(0, wy, Graphics.boxWidth / 2, wh); // 实例化窗口类
        this._demo2Window.setHelpWindow(this._helpWindow); // 设置帮助窗口（基类中初始化）
        this._demo2Window.setDemo3Window(this._demo3Window); // 设置Demo3窗口（基类中初始化）
        // 窗口类中的确定和取消动作函数逻辑
        // this._demo2Window.setHandler('ok', this.onItemOk.bind(this));
        this._demo2Window.setHandler('cancel', this.onItemCancel.bind(this));
        this.addWindow(this._demo2Window);
        this._demo1Window.setItemWindow(this._demo2Window); // 设置demo1和demo2的从属关系函数（基于Demo2的实例化对象）
    }

    /** 创建Demo3窗口页 */
    Scene_Demo.prototype.createDemo3Window = function () {
        var wy = this._helpWindow.height;
        var wh = Graphics.boxHeight - wy;
        this._demo3Window = new Window_Demo3(Graphics.boxWidth / 2, wy, Graphics.boxWidth / 2, wh); // 实例化窗口类
        this.addWindow(this._demo3Window);
    }

    /** Demo1窗口确定按钮的实际作用函数 */
    Scene_Demo.prototype.onDemo1Ok = function () {
        this._demo2Window.activate(); // 切换到Demo2窗口
        this._demo2Window.selectLast(); // 选中最后操作的物品
    }

    /** TODO：Demo2窗口暂不设置确定动作函数 */
    Scene_Demo.prototype.onItemOk = function () {
        console.log('onItemOk...');
    };

    /** Demo2窗口取消按钮的实际作用函数 */
    Scene_Demo.prototype.onItemCancel = function () {
        this._demo2Window.deselect();
        this._demo1Window.activate();
    };
    //#endregion

    //#region ---------------------------------------- 窗口类 Demo1窗口 类别选择窗口 ---------------------------

    function Window_Demo1() {
        this.initialize.apply(this, arguments);
    }

    Window_Demo1.prototype = Object.create(Window_HorzCommand.prototype);
    Window_Demo1.prototype.constructor = Window_Demo1;

    Window_Demo1.prototype.initialize = function () {
        Window_HorzCommand.prototype.initialize.call(this, 0, 0);
    };
    /** 窗口的宽度 */
    Window_Demo1.prototype.windowWidth = function () {
        return Graphics.boxWidth / 2;
    };
    /** 窗口的单行显示元素数 */
    Window_Demo1.prototype.maxCols = function () {
        return 4;
    }

    /** 用于动态地指向每个类比的物品选择窗口的首个物品 */
    Window_Demo1.prototype.update = function () {
        Window_HorzCommand.prototype.update.call(this);
        if (this._demo2Window) {
            this._demo2Window.setCategory(this.currentSymbol());
        }
    };

    /** 构建类别窗口的实际选择选项 */
    Window_Demo1.prototype.makeCommandList = function () {
        // this.addCommand(TextManager.item, 'item');
        this.addCommand(TextManager.weapon, 'weapon');
        this.addCommand(TextManager.armor, 'armor');
        // this.addCommand(TextManager.keyItem, 'keyItem');
    };

    /** 定义窗口从属关系函数 */
    Window_Demo1.prototype.setItemWindow = function (demo2Window) {
        this._demo2Window = demo2Window;
    };
    //#endregion

    //#region ---------------------------------------- 窗口类 Demo2窗口 分类物品列表窗口 ----------

    /** 显示物品的窗口 */
    function Window_Demo2() {
        this.initialize.apply(this, arguments);
    }

    Window_Demo2.prototype = Object.create(Window_Selectable.prototype);
    Window_Demo2.prototype.constructor = Window_Demo2;

    Window_Demo2.prototype.initialize = function (x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._category = 'none';  // 当前物品分类
        this._data = []; // 物品数据数组
    };

    /** 将物品系统类别设置到该类的实际函数 */
    Window_Demo2.prototype.setCategory = function (category) {
        if (this._category !== category) {
            this._category = category;
            this.refresh();
            this.resetScroll();
        }
    }

    /** 窗口的单行显示元素数 */
    Window_Demo2.prototype.maxCols = function () {
        return 1;
    }

    /** 元素行间距 */
    Window_Demo2.prototype.spacing = function () {
        return 48 / 2;
    }

    /** 列表显示最大的元素数 */
    Window_Demo2.prototype.maxItems = function () {
        return this._data ? this._data.length : 1;
    };
    /** 返回当前窗口内选中物品 */
    Window_Demo2.prototype.item = function () {
        var index = this.index();
        return this._data && index >= 0 ? this._data[index] : null;
    };

    /** 判断当物品是否可用 */
    Window_Demo2.prototype.isCurrentItemEnabled = function () {
        return this.isEnabled(this.item());
    };

    /** 筛选物品列表函数 */
    Window_Demo2.prototype.includes = function (item) {
        switch (this._category) {
            // case 'item':
            //     return DataManager.isItem(item) && item.itypeId === 1;// 普通物品
            case 'weapon':
                return DataManager.isWeapon(item);// 武器
            case 'armor':
                return DataManager.isArmor(item);// 防具
            // case 'keyItem':
            //     return DataManager.isItem(item) && item.itypeId === 2;// 重要物品
            default:
                return false;
        }
    };

    /** 是否显示物品数量 */
    Window_Demo2.prototype.needsNumber = function () {
        return true;
    };

    // 判断物品是否可用
    Window_Demo2.prototype.isEnabled = function (item) {
        return $gameParty.canUse(item);
    };

    // 生成物品列表
    Window_Demo2.prototype.makeItemList = function () {
        // 过滤出当前分类的物品
        this._data = $gameParty.allItems().filter(function (item) {
            return this.includes(item);
        }, this);

        // 特殊处理：如果允许包含null（某些情况下）
        if (this.includes(null)) {
            this._data.push(null);
        }
    };

    // 选中最后操作的物品
    Window_Demo2.prototype.selectLast = function () {
        var index = this._data.indexOf($gameParty.lastItem());// 获取最后使用的物品索引
        this.select(index >= 0 ? index : 0); // 选中物品或默认第一个
    };

    // 绘制单个物品项
    Window_Demo2.prototype.drawItem = function (index) {
        var item = this._data[index];
        if (item) {
            var numberWidth = this.numberWidth();
            var rect = this.itemRect(index);
            rect.width -= this.textPadding();
            // this.changePaintOpacity(this.isEnabled(item));  // 不可用时半透明
            this.drawItemName(item, rect.x, rect.y, rect.width - numberWidth);
            this.drawItemNumber(item, rect.x, rect.y, rect.width); // 绘制数量
            this.changePaintOpacity(1);// 恢复透明度
        }
    };

    // 计算数量显示区域的宽度
    Window_Demo2.prototype.numberWidth = function () {
        return this.textWidth('000');
    };

    // 绘制物品数量（格式": 数量"）
    Window_Demo2.prototype.drawItemNumber = function (item, x, y, width) {
        if (this.needsNumber()) {
            this.drawText(':', x, y, width - this.textWidth('00'), 'right');
            this.drawText($gameParty.numItems(item), x, y, width, 'right');
        }
    };

    // 重新选择时更新帮助窗口（显示物品描述）
    Window_Demo2.prototype.updateHelp = function () {
        this.setHelpWindowItem(this.item());
    };

    // 重新选择时更新Demo3窗口（显示自定义的文本信息）
    Window_Demo2.prototype.updateDemo3 = function () {
        this.setDemo3WindowItem(this.item());
    };

    // 刷新窗口内容
    Window_Demo2.prototype.refresh = function () {
        this.makeItemList();// 重新生成物品列表
        this.createContents();// 重建位图
        this.drawAllItems();// 绘制所有物品
    };
    // #endregion

    //#region ---------------------------------------- 窗口类 Demo3窗口 物品详情窗口 ----------------------------
    function Window_Demo3() {
        this.initialize.apply(this, arguments);
    }

    Window_Demo3.prototype = Object.create(Window_Base.prototype);
    Window_Demo3.prototype.constructor = Window_Demo3;

    Window_Demo3.prototype.initialize = function (x, y, width, height) {
        Window_Base.prototype.initialize.call(this, x, y, width, height);
        this._text = ""; // Demo3应显示的文本内容
    }

    // 设置Demo3的文本
    Window_Demo3.prototype.setText = function (text) {
        if (this._text !== text) {
            this._text = text;
            this.refresh();
        }
    }

    // 清空函数
    Window_Demo3.prototype.clear = function () {
        this.setText("");
    }

    // 设置关联的物品的逻辑
    Window_Demo3.prototype.setItem = function (item) {
        this.genText(item ? item : null);
    }

    // 生成要显示内容的核心函数
    Window_Demo3.prototype.genText = function (item) {
        if (!item) return; // 没有物品对象时直接返回
        if (!item.params) console.error('道具对象没有params属性，无法生成属性文本!');
        var fullText = genDemo3Text(item);
        this.setText(fullText);
    }

    // 重绘函数
    Window_Demo3.prototype.refresh = function () {
        this.contents.clear();
        this.drawTextEx(this._text, this.textPadding(), 0);
    }
    //#endregion

    //#region ------------------------------------- 重构源代码，用于实时显示对应的内容 -------------------------------
    /** 设置Demo3窗口的从属关系 */
    Window_Selectable.prototype.setDemo3Window = function (demo3Window) {
        this._demo3Window = demo3Window;
        this.callUpdateDemo3();
    };

    // 实际调用demo3对象方法的函数（在没有窗口更新时）
    Window_Selectable.prototype.callUpdateDemo3 = function () {
        if (this.active && this._demo3Window) {
            this.updateDemo3();
        }
    };

    /** 在未选择任何有效元素时，清空Demo3窗口（基类可复写，不存在父类复写方法则触发clear清空） */
    Window_Selectable.prototype.updateDemo3 = function () {
        this._demo3Window.clear();
    };

    // 选择选项时进行更新
    _Window_Selectalbe_prototype_select = Window_Selectable.prototype.select;
    Window_Selectable.prototype.select = function (index) {
        _Window_Selectalbe_prototype_select.call(this, index);
        this.callUpdateDemo3();
    };

    /** 设置Demo3窗口的物品对象 */
    Window_Selectable.prototype.setDemo3WindowItem = function (item) {
        this._demo3Window && this._demo3Window.setItem(item);
    }
    //#endregion
})();