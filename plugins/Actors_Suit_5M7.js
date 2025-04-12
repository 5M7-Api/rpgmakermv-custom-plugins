/*:
 * @plugindesc 装备界面套装立绘换装插件
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-plugins-coding-course
 *
 * @param xOffset
 * @default 180
 * @desc 这里是为了给立绘空出位置的横向偏移量，需注意要根据画面动态调整，太小会破坏样式。（单位：像素）
 * @type number
 *
 * @param arisX
 * @default 0
 * @desc 单位：像素
 * @type number
 *
 * @param arisY
 * @default 100
 * @desc 单位：像素，需注意这里至少要大于100，否则会遮挡到默认菜单的说明栏。
 * @type number
 * 
 *
 * @help 
 * 
 * 1、img下创建player文件夹。所有角色需要根据其rmmv数据库角色id创建对应的文件夹actor_[id]，此文件夹下需要放置对应角色的默认立绘default.png
 * 
 * 2、根据代码中suitImgMap的键值对配置，将对应需橘色id的装备id的立绘放入actor_[id]文件夹下。
 * 
 * 3、将立绘名字改成suitImgMap的键名，用于一一对应显示立绘。
 * 
 * # 注意立绘和键名只能是大小写英文字母或者下划线，禁止其他字符。
 */
(function () {
    'use strict';
    // --------------------------- 立绘与数据库内装备映射配置填写位置----------------------------------
    /**
     * [数字，代表角色id（actor_id）]:{
     *              [键名，立绘的文件名称（只能是字母和下划线）]:[[（武器装备的id数组）],[（护甲装备的id数组）]]
     * },
     */
    var suitImgMap = {
        1: {
            Alice: [[7], [14, 16, 17, 18]], // 对应 Alice.png
        },
        2: {
            Asuka: [[], [19, 20, 21]]
        },

        // 有几个角色写几个序号，序号就是角色的id
    };

    // ------------------------------------------------------------------------------------------
    var fileName = "Actors_Suit_5M7";
    var parameters = PluginManager.parameters(fileName);

    var X_OFFSET = Number(parameters["xOffset"] || 180);
    var imageX = Number(parameters["arisX"] || 0);
    var imageY = Number(parameters["arisY"] || 100);
    // -------------------------------------------------------------------------------------------
    Scene_Equip.prototype.create = function () {
        Scene_MenuBase.prototype.create.call(this);
        this._equipImageCache = []; // 存储装备立绘的 URL
        this.createHelpWindow();
        this.createStatusWindow();
        this.createCommandWindow();
        this.createSlotWindow();
        this.createItemWindow();
        this.refreshActor();
    };

    Scene_Equip.prototype.createStatusWindow = function () {
        this._statusWindow = new Window_EquipStatus(X_OFFSET, this._helpWindow.height); //位置偏转180
        this.addWindow(this._statusWindow);
    };

    Scene_Equip.prototype.createCommandWindow = function () {
        var wx = this._statusWindow.width + X_OFFSET;
        var wy = this._helpWindow.height;
        var ww = Graphics.boxWidth - this._statusWindow.width - X_OFFSET;
        this._commandWindow = new Window_EquipCommand(wx, wy, ww);
        this._commandWindow.setHelpWindow(this._helpWindow);
        this._commandWindow.setHandler("equip", this.commandEquip.bind(this));
        this._commandWindow.setHandler("optimize", this.commandOptimize.bind(this));
        this._commandWindow.setHandler("clear", this.commandClear.bind(this));
        this._commandWindow.setHandler("cancel", this.popScene.bind(this));
        this._commandWindow.setHandler("pagedown", this.nextActor.bind(this));
        this._commandWindow.setHandler("pageup", this.previousActor.bind(this));
        this.addWindow(this._commandWindow);
    };

    Scene_Equip.prototype.createSlotWindow = function () {
        var wx = this._statusWindow.width + X_OFFSET;
        var wy = this._commandWindow.y + this._commandWindow.height;
        var ww = Graphics.boxWidth - this._statusWindow.width - X_OFFSET;
        var wh = this._statusWindow.height - this._commandWindow.height;
        this._slotWindow = new Window_EquipSlot(wx, wy, ww, wh);
        this._slotWindow.setHelpWindow(this._helpWindow);
        this._slotWindow.setStatusWindow(this._statusWindow);
        this._slotWindow.setHandler("ok", this.onSlotOk.bind(this));
        this._slotWindow.setHandler("cancel", this.onSlotCancel.bind(this));
        this.addWindow(this._slotWindow);
    };

    Scene_Equip.prototype.createItemWindow = function () {
        var wx = X_OFFSET;
        var wy = this._statusWindow.y + this._statusWindow.height;
        var ww = Graphics.boxWidth - X_OFFSET;
        var wh = Graphics.boxHeight - wy;
        this._itemWindow = new Window_EquipItem(wx, wy, ww, wh);
        this._itemWindow.setHelpWindow(this._helpWindow);
        this._itemWindow.setStatusWindow(this._statusWindow);
        this._itemWindow.setHandler("ok", this.onItemOk.bind(this));
        this._itemWindow.setHandler("cancel", this.onItemCancel.bind(this));
        this._slotWindow.setItemWindow(this._itemWindow);
        this.addWindow(this._itemWindow);
    };
    // 	自动装备最优装备
    Scene_Equip.prototype.commandOptimize = function () {
        SoundManager.playEquip();         // 播放装备更换的音效
        this.actor().optimizeEquipments(); // 让角色自动选择最好的装备
        this._statusWindow.refresh();      // 刷新角色状态窗口
        this._slotWindow.refresh();        // 刷新装备槽窗口
        this._commandWindow.activate();    // 重新激活指令窗口
        this.updateEquipPictrues(this.actor()._actorId); // 更新装备图片（自定义方法）
    };
    // 移除所有装备
    Scene_Equip.prototype.commandClear = function () {
        SoundManager.playEquip();         // 播放装备更换的音效
        this.actor().clearEquipments();   // 移除所有装备
        this._statusWindow.refresh();      // 刷新角色状态窗口
        this._slotWindow.refresh();        // 刷新装备槽窗口
        this._commandWindow.activate();    // 重新激活指令窗口
        this.updateEquipPictrues(this.actor()._actorId); // 更新装备图片（自定义方法）
    };
    // 玩家手动更换装备
    Scene_Equip.prototype.onItemOk = function () {
        SoundManager.playEquip();                          // 播放装备更换的音效
        this.actor().changeEquip(this._slotWindow.index(), this._itemWindow.item()); // 更换装备
        this._slotWindow.activate();                      // 重新激活装备槽窗口
        this._slotWindow.refresh();                       // 刷新装备槽窗口
        this._itemWindow.deselect();                      // 取消选择的装备
        this._itemWindow.refresh();                       // 刷新物品窗口
        this._statusWindow.refresh();                     // 刷新角色状态窗口
        this.updateEquipPictrues(this.actor()._actorId); // 更新装备图片（自定义方法）
    };

    Scene_Equip.prototype.refreshActor = function () {
        var actor = this.actor(); // 获取角色对象所有信息
        this.initActorPicture(actor._actorId); // 初始化角色立绘
        this._statusWindow.setActor(actor);
        this._slotWindow.setActor(actor);
        this._itemWindow.setActor(actor);
    };

    // 初始化换装立绘系统
    Scene_Equip.prototype.initActorPicture = function (actorId) {
        // 缓存初始化
        if (!this._equipImageCache) { this._equipImageCache = []; }


        // 创建当前角色的套装立绘，确保只初始化一次
        if (!this._playerPicture) {
            this._playerPicture = new Sprite(Bitmap.load(`img/player/actor_${actorId}/default.png`));
            this._playerPicture.move(imageX, imageY);
            this.addChild(this._playerPicture);
        } else {
            // 不同角色直接切换白身立绘
            this._playerPicture.bitmap = Bitmap.load(`img/player/actor_${actorId}/default.png`);
        }

        // 重加载角色的装备立绘
        this.updateEquipPictrues(actorId);
    };

    function isAllInConfig(playerIds, configIds) {
        if (!Array.isArray(playerIds) || !Array.isArray(configIds)) return false;

        if (configIds.length === 0) {
            // configIds 为空，都算匹配成功
            return true;
        }

        // configIds 非空，要求全部被包含在 playerIds 中
        return configIds.every(id => playerIds.includes(id));
    }
    // 加载装备立绘的实际方法
    Scene_Equip.prototype.updateEquipPictrues = function (actorId) {
        var playerEquips = $gameActors.actor(actorId).armors();
        var playerWeapons = $gameActors.actor(actorId).weapons();
        var actorSuitData = suitImgMap[actorId];
        var newPath = `img/player/actor_${actorId}/default.png`; // 默认路径
        // var matched = false;

        for (const key in actorSuitData) {
            if (!Array.isArray(actorSuitData[key]) || actorSuitData[key].length !== 2) {
                throw new Error(`套装数据错误: ${key} 对应的值必须是包含两个数组的数组。`);
            }

            const [weaponIds, armorIds] = actorSuitData[key];

            if (!Array.isArray(weaponIds) || !Array.isArray(armorIds)) {
                throw new Error(`套装数据格式错误：${key} 中必须包含两个数组。`);
            }

            var playerWeaponIds = playerWeapons.map(w => w.id);
            var playerArmorIds = playerEquips.map(a => a.id);

            var isWeaponMatch = isAllInConfig(playerWeaponIds, weaponIds);
            var isArmorMatch = isAllInConfig(playerArmorIds, armorIds);

            if (isWeaponMatch && isArmorMatch) {
                newPath = `img/player/actor_${actorId}/${key}.png`;
                // matched = true;
                // console.log("套装匹配成功", key);
                break;
            } else {
                // console.log("套装匹配失败", key);
            }
        }

        // ⭐ 判断路径是否变化，避免重复加载
        const cachedPath = this._equipImageCache[actorId];
        if (cachedPath !== newPath) {
            this._playerPicture.bitmap = Bitmap.load(newPath);
            this._equipImageCache[actorId] = newPath;
        } else {
            // console.log("立绘未变更，跳过 Bitmap.load()");
        }

        // console.log("装备图片缓存", this._equipImageCache);
    };


    // 返回对应角色已装备的装备立绘的文件路径
    Scene_Equip.prototype.getEquipImageUrls = function (actorId) {
        return this._equipImageCache[actorId] || [];
    };

})();
