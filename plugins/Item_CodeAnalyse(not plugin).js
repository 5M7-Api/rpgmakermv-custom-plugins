/*:
 * @plugindesc rmmv物品与装备系统源代码分析插件（非功能性）
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 仅用于分析物品与装备系统的源码流程和逻辑，不涉及任何游戏功能扩展。
 */
(function () {

    // -------------------------------- 物品与装备系统的源码参数 ---------------------------------
    // 获取所有装备信息
    function getAllEquipmentInfo() {
        var result = [];
        // 遍历所有角色
        $dataActors.forEach(function (actorData, actorId) {
            if (actorId > 0) { // 跳过0号占位
                var actor = $gameActors.actor(actorId);
                var equipInfo = {
                    id: actorId,
                    name: actor.name(),
                    equips: [],
                };

                // 获取装备
                actor.equips().forEach(function (item, slotId) {
                    if (item) {
                        equipInfo.equips.push({
                            slot: $dataSystem.equipTypes[item.etypeId],
                            name: item.name,
                            id: item.id
                        });
                    }
                });

                console.log('角色装备配置', result); // 打印所有角色的装备信息
                result.push(equipInfo);
            }
        });
        return result;
    }

    // 游戏开始时调用
    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
        _Scene_Boot_start.call(this);

        // 获取所有武器数据（数组索引=武器ID）
        var allWeapons = $dataWeapons;

        // 获取所有防具数据
        var allArmors = $dataArmors;
        // 获取所有物品数据
        var allItems = $dataItems;
        /**
         * 获取所有武器数据
         * - 数组索引对应武器ID，$dataWeapons[0] 通常为 null
         * - 每个武器对象包含以下属性：
         *   - id: Number - 武器唯一ID，对应数据库编号（从1开始）
         *   - name: String - 武器名称，显示在游戏界面（如装备栏）
         *   - iconIndex: Number - 图标索引，对应 img/system/IconSet.png 的图标编号
         *   - description: String - 武器描述，显示在装备详情或帮助窗口
         *   - wtypeId: Number - 武器类型ID（如1=剑，2=斧，参考 System.json）
         *   - price: Number - 武器价格，用于商店买卖（游戏货币）
         *   - params: Array[8] - 战斗参数数组，依次为：
         *     [0]: 最大HP, [1]: 最大MP, [2]: 攻击力, [3]: 防御力,
         *     [4]: 魔法攻击, [5]: 魔法防御, [6]: 敏捷, [7]: 幸运
         *   - traits: Array - 特性数组，每个元素包含：
         *     - code: 特性类型（如11=元素加成，21=状态抗性）
         *     - dataId: 特性相关ID（如元素ID、状态ID）
         *     - value: 特性值（如1.2表示120%效果）
         *   - animationId: Number - 使用武器时的动画ID，对应数据库动画
         *   - note: String - 备注字段，开发者自定义文本，常用于插件
         *   - meta: Object - 由note解析的键值对（如<range:5>生成meta.range="5"）
         */
        console.log('所有武器装备配置', allWeapons); // 打印全局武器配置信息
        /**
        * 获取所有防具数据
        * - 数组索引对应防具ID，$dataArmors[0] 通常为 null
        * - 每个防具对象包含以下属性：
        *   - id: Number - 防具唯一ID，对应数据库编号（从1开始）
        *   - name: String - 防具名称，显示在游戏界面
        *   - iconIndex: Number - 图标索引，对应 img/system/IconSet.png 的图标编号
        *   - description: String - 防具描述，显示在装备详情或帮助窗口
        *   - atypeId: Number - 防具类型ID（如1=盔甲，2=盾，参考 System.json）
        *   - price: Number - 防具价格，用于商店买卖
        *   - params: Array[8] - 战斗参数数组，含义同武器，依次为：
        *     [0]: 最大HP, [1]: 最大MP, [2]: 攻击力, [3]: 防御力,
        *     [4]: 魔法攻击, [5]: 魔法防御, [6]: 敏捷, [7]: 幸运
        *   - traits: Array - 特性数组，格式同武器（如抗火、暴击率提升）
        *   - note: String - 备注字段，开发者自定义文本，常用于插件
        *   - meta: Object - 由note解析的键值对，插件可读取自定义标签
        */
        console.log('所有防具装备配置', allArmors); // 打印全局防具配置信息

        /**
         * 获取所有物品数据
         * - 数组索引对应物品ID，$dataItems[0] 通常为 null
         * - 每个物品对象包含以下属性：
         *   - id: Number - 物品唯一ID，对应数据库编号（从1开始）
         *   - name: String - 物品名称，显示在游戏界面（如物品栏）
         *   - iconIndex: Number - 图标索引，对应 img/system/IconSet.png 的图标编号
         *   - description: String - 物品描述，显示在物品详情或帮助窗口
         *   - itypeId: Number - 物品类型ID（如1=普通物品，2=关键物品，参考 System.json）
         *   - price: Number - 物品价格，用于商店买卖（游戏货币）
         *   - consumable: Boolean - 是否为消耗品（true=使用后消失，false=可重复使用）
         *   - scope: Number - 使用范围（0=无，1=单个敌人，2=全体敌人，7=单个队友等，参考 rpg_objects.js）
         *   - occasion: Number - 使用时机（0=总是，1=仅战斗，2=仅菜单，3=不可用）
         *   - speed: Number - 使用速度修正值，影响战斗中行动顺序
         *   - successRate: Number - 使用成功率（0到100，百分比）
         *   - repeats: Number - 重复使用次数（每次使用触发几次效果）
         *   - tpGain: Number - 使用时获得的TP（技巧点）
         *   - hitType: Number - 命中类型（0=必定命中，1=物理命中，2=魔法命中）
         *   - animationId: Number - 使用时的动画ID，对应数据库动画
         *   - damage: Object - 伤害/恢复效果，包含：
         *     - type: Number - 伤害类型（0=无，1=HP伤害，2=MP伤害，3=HP恢复等）
         *     - elementId: Number - 元素ID（参考 System.json）
         *     - formula: String - 伤害公式（如"a.atk * 4 - b.def * 2"）
         *     - variance: Number - 伤害波动值（百分比）
         *     - critical: Boolean - 是否可暴击
         *   - effects: Array - 附加效果数组，每个元素包含：
         *     - code: 效果类型（如11=恢复HP，21=添加状态）
         *     - dataId: 效果相关ID（如状态ID）
         *     - value1: 效果值1（如恢复百分比）
         *     - value2: 效果值2（视效果而定）
         *   - note: String - 备注字段，开发者自定义文本，常用于插件
         *   - meta: Object - 由note解析的键值对（如<heal:50>生成meta.heal="50"）
         */
        console.log('所有物品配置', allItems);
    };

    // 装备切换的源代码函数
    var _Game_Actor_changeEquip = Game_Actor.prototype.changeEquip;
    Game_Actor.prototype.changeEquip = function (slotId, item) {
        _Game_Actor_changeEquip.call(this, slotId, item);
        // SceneManager._scene._equipmentData = getAllEquipmentInfo();
        getAllEquipmentInfo();
    };

    // -------------------------------- 菜单系统源码分析 --------------------------------
    /**
     * 画面地图进入系统菜单场景方法 Scene_Map
     * 
     * 进入游戏内系统菜单的实际入口方法
     * 
     * Scene_XXX 决定当前游戏场景，生成哪些窗口？窗口有哪些交互操作？
     * Window_XXX 决定生成窗口的初始化状态和属性，长什么样？有什么内容可以操作？
     */
    Scene_Map.prototype.callMenu = function () {
        SoundManager.playOk();
        console.log('[Scene_Map.callMenu]初始化完毕，进入系统菜单');
        SceneManager.push(Scene_Menu);
        Window_MenuCommand.initCommandPosition();
        $gameTemp.clearDestination();
        this._mapNameWindow.hide();
        this._waitCount = 2;
    };

    /**
     * Scene_Menu 创建所有该场景下的子菜单窗口的方法导向
     * 
     * create在心跳函数中被调用，创建当前栈内场景
     */
    Scene_Menu.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createCommandWindow(); // 菜单选项窗口
        this.createGoldWindow(); // 金币窗口
        this.createStatusWindow(); // 角色状态窗口
    };
 
    /** 菜单场景的角色选择窗口 */
    Scene_Menu.prototype.createStatusWindow = function () {
        this._statusWindow = new Window_MenuStatus(this._commandWindow.width, 0);
        this._statusWindow.reserveFaceImages();
        this.addWindow(this._statusWindow);
    };

    /**
     * Scene_Menu 创建窗口的实际方法
     * 
     * 套路就是this中挂载Window_XXXX类的逻辑方法初始化，菜单的实际内容和逻辑都封装在里面
     * 通过setHandler增加人机交互逻辑
     * addWindow放到游戏画面上
     */
    Scene_Menu.prototype.createCommandWindow = function () {
        this._commandWindow = new Window_MenuCommand(0, 0);
        this._commandWindow.setHandler('item', this.commandItem.bind(this));
        this._commandWindow.setHandler('skill', this.commandPersonal.bind(this));
        this._commandWindow.setHandler('equip', this.commandPersonal.bind(this));
        this._commandWindow.setHandler('status', this.commandPersonal.bind(this));
        this._commandWindow.setHandler('formation', this.commandFormation.bind(this));
        this._commandWindow.setHandler('options', this.commandOptions.bind(this));
        this._commandWindow.setHandler('save', this.commandSave.bind(this));
        this._commandWindow.setHandler('gameEnd', this.commandGameEnd.bind(this));
        this._commandWindow.setHandler('cancel', this.popScene.bind(this));
        console.log('[Scene_Menu.createCommandWindow]初始化完毕，创建菜单窗口');
        this.addWindow(this._commandWindow);
    };

    /**
     * 向当前菜单内添加一个可交互的选项
     * @param {string} name    - 选项显示文本（如"存档"）
     * @param {string} symbol  - 选项标识符（如"save"）
     * @param {boolean} enabled - 是否可交互（默认true）
     * @param {any} ext       - 附加数据（默认null）
     */
    Window_Command.prototype.addCommand = function (name, symbol, enabled, ext) {
        // console.log('[Window_Command.addCommand]添加选项：', { name: name, symbol: symbol, enabled: enabled, ext: ext });
        if (enabled === undefined) {
            enabled = true;
        }
        if (ext === undefined) {
            ext = null;
        }
        this._list.push({ name: name, symbol: symbol, enabled: enabled, ext: ext });
    };

    /**
     * 函数注册器，用于添加一个方法用于回应 addCommand 在内的所有选项交互的实际逻辑
     * 
     * 实际上进入各个菜单选项的逻辑也是由这个函数的method承担，进入各自的的Scene_XXX
     */
    Window_Selectable.prototype.setHandler = function (symbol, method) {
        // console.log('[Window_Selectable.setHandler]注册方法：', { symbol: symbol, method: method })
        this._handlers[symbol] = method;
    };

    /**
     * 进入物品栏选项的实际逻辑 -> Scene_Item
     */
    Scene_Menu.prototype.commandItem = function () {
        console.log('[Scene_Menu.commandItem]进入物品栏选项');
        SceneManager.push(Scene_Item);
    };

    /**
     * 进入装备和技能选项的选择逻辑 -> 高亮选择支位移到右侧角色栏
     */
    Scene_Menu.prototype.commandPersonal = function () {
        console.log('[Scene_Menu.commandPersonal]进入装备和技能选项，位移到右侧角色选项卡');
        this._statusWindow.setFormationMode(false);
        this._statusWindow.selectLast();
        this._statusWindow.activate();
        this._statusWindow.setHandler('ok', this.onPersonalOk.bind(this));
        this._statusWindow.setHandler('cancel', this.onPersonalCancel.bind(this));
    };

    /**
     * 右侧角色栏选择后进入各自的实际菜单逻辑 -> Scene_Skill/Scene_Equip/Scene_Status
     */
    Scene_Menu.prototype.onPersonalOk = function () {
        console.log('[Scene_Menu.onPersonalOk]选择右侧角色选项卡，进入对应Scene场景');
        switch (this._commandWindow.currentSymbol()) {
            case 'skill':
                SceneManager.push(Scene_Skill);
                break;
            case 'equip':
                SceneManager.push(Scene_Equip);
                break;
            case 'status':
                SceneManager.push(Scene_Status);
                break;
        }
    };

    // #region ------------------------- 物品菜单 ----------------------------
    /**
     * 创建物品场景的子菜单窗口元素
     * 继承自Scene_ItemBase并扩展了物品特有的窗口创建逻辑
     */
    Scene_Item.prototype.create = function () {
        // 调用父类Scene_ItemBase的create方法（基础场景初始化）
        Scene_ItemBase.prototype.create.call(this);

        // 创建帮助窗口（显示物品描述）
        this.createHelpWindow();

        // 创建物品分类窗口（物品/武器/防具/关键物品选项卡）
        this.createCategoryWindow();

        // 创建物品列表窗口（显示当前分类下的所有物品）
        this.createItemWindow();

        // 创建角色选择窗口（使用物品时选择目标角色）
        this.createActorWindow();
    };

    /**
     * 创建物品分类选择窗口
     * - 水平选项卡式窗口（物品/武器/防具/关键物品）
     */
    Scene_Item.prototype.createCategoryWindow = function () {
        // 创建分类窗口实例
        this._categoryWindow = new Window_ItemCategory();

        // 绑定帮助窗口（用于显示分类说明）
        this._categoryWindow.setHelpWindow(this._helpWindow);

        // 定位在帮助窗口下方
        this._categoryWindow.y = this._helpWindow.height;

        // 设置事件处理器：
        this._categoryWindow.setHandler('ok', this.onCategoryOk.bind(this));    // 选择分类确认
        this._categoryWindow.setHandler('cancel', this.popScene.bind(this));   // 返回上一场景

        // 将窗口添加到场景
        this.addWindow(this._categoryWindow);
    };

    /**
     * 创建物品列表窗口
     * - 显示当前选中分类下的所有物品
     */
    Scene_Item.prototype.createItemWindow = function () {
        // 计算窗口位置和尺寸（位于分类窗口下方，填满剩余空间）
        var wy = this._categoryWindow.y + this._categoryWindow.height;
        var wh = Graphics.boxHeight - wy;

        // 创建物品列表窗口（全宽）
        this._itemWindow = new Window_ItemList(0, wy, Graphics.boxWidth, wh);

        // 绑定帮助窗口（显示物品详情）
        this._itemWindow.setHelpWindow(this._helpWindow);

        // 设置事件处理器：
        this._itemWindow.setHandler('ok', this.onItemOk.bind(this));      // 选择物品确认
        this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this)); // 返回分类选择

        // 将窗口添加到场景
        this.addWindow(this._itemWindow);

        // 将物品窗口与分类窗口关联（用于自动刷新列表）
        this._categoryWindow.setItemWindow(this._itemWindow);
    };

    /**
     * 角色选择窗口（基类继承）
     */
    Scene_ItemBase.prototype.createActorWindow = function () {
        this._actorWindow = new Window_MenuActor();
        this._actorWindow.setHandler('ok', this.onActorOk.bind(this));
        this._actorWindow.setHandler('cancel', this.onActorCancel.bind(this));
        this.addWindow(this._actorWindow);
    };
    // #endregion


    // #region -------------------------- 装备菜单 -----------------------------------
    /**
     * 创建装备场景的子菜单窗口元素
     */
    Scene_Equip.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();    // 创建帮助窗口
        this.createStatusWindow();  // 创建状态窗口（角色数值）
        this.createCommandWindow(); // 创建命令窗口（装备/最优化/清空）
        this.createSlotWindow();    // 创建装备槽窗口
        this.createItemWindow();    // 创建物品窗口
        this.refreshActor();        // 刷新角色信息
    };

    /**
     * 上方两行的说明文本窗口（基类继承）
     */
    Scene_MenuBase.prototype.createHelpWindow = function () {
        this._helpWindow = new Window_Help();
        this.addWindow(this._helpWindow);
    };

    /**
     * 角色属性窗口
     */
    Scene_Equip.prototype.createStatusWindow = function () {
        this._statusWindow = new Window_EquipStatus(0, this._helpWindow.height);
        this.addWindow(this._statusWindow); // 将窗口添加到场景
    };

    /**
     * 装备命令窗口（装备/最优化/清空）
     */
    Scene_Equip.prototype.createCommandWindow = function () {
        var wx = this._statusWindow.width;
        var wy = this._helpWindow.height;
        var ww = Graphics.boxWidth - this._statusWindow.width;
        this._commandWindow = new Window_EquipCommand(wx, wy, ww);
        this._commandWindow.setHelpWindow(this._helpWindow);
        // 设置命令处理器
        this._commandWindow.setHandler('equip', this.commandEquip.bind(this));
        this._commandWindow.setHandler('optimize', this.commandOptimize.bind(this));
        this._commandWindow.setHandler('clear', this.commandClear.bind(this));
        this._commandWindow.setHandler('cancel', this.popScene.bind(this));
        this._commandWindow.setHandler('pagedown', this.nextActor.bind(this));
        this._commandWindow.setHandler('pageup', this.previousActor.bind(this));
        this.addWindow(this._commandWindow);
    };

    /**
     * 装备槽窗口（显示角色当前装备）
     */
    Scene_Equip.prototype.createSlotWindow = function () {
        var wx = this._statusWindow.width;
        var wy = this._commandWindow.y + this._commandWindow.height;
        var ww = Graphics.boxWidth - this._statusWindow.width;
        var wh = this._statusWindow.height - this._commandWindow.height;
        this._slotWindow = new Window_EquipSlot(wx, wy, ww, wh);
        this._slotWindow.setHelpWindow(this._helpWindow);
        this._slotWindow.setStatusWindow(this._statusWindow);
        // 设置槽位选择处理器
        this._slotWindow.setHandler('ok', this.onSlotOk.bind(this));
        this._slotWindow.setHandler('cancel', this.onSlotCancel.bind(this));
        this.addWindow(this._slotWindow);
    };

    /**
     * 物品窗口（显示当前分类下的所有物品）
     */
    Scene_Equip.prototype.createItemWindow = function () {
        var wx = 0;
        var wy = this._statusWindow.y + this._statusWindow.height;
        var ww = Graphics.boxWidth;
        var wh = Graphics.boxHeight - wy;
        this._itemWindow = new Window_EquipItem(wx, wy, ww, wh);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setStatusWindow(this._statusWindow);
        // 设置物品选择处理器
        this._itemWindow.setHandler('ok', this.onItemOk.bind(this));
        this._itemWindow.setHandler('cancel', this.onItemCancel.bind(this));
        this._slotWindow.setItemWindow(this._itemWindow);
        this.addWindow(this._itemWindow);
    };

    /** 刷新各窗口的角色信息 */
    Scene_Equip.prototype.refreshActor = function () {
        var actor = this.actor();
        this._statusWindow.setActor(actor);
        this._slotWindow.setActor(actor);
        this._itemWindow.setActor(actor);
    };
    // #endregion
})();