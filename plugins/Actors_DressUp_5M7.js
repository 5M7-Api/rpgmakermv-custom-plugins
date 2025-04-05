
/*:
 * @plugindesc 装备界面可针对立绘自由换装插件
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
 * @param armorReverse
 * @default false
 * @desc 护甲立绘的先后覆盖顺序是否反转。
 * @type boolean
 *
 *
 * @help 
 * 
 * 1、所有角色需要根据其rmmv数据库角色id创建对应的文件夹actor_[id]，此文件夹下需要放置对应角色的白身立绘player.png。
 * （如：actor_1文件夹下放置player.png，actor_2文件夹下放置player.png）
 * 
 * 2、所有actor_[id]文件夹下创建default文件夹，其中需放置没有指定立绘的初始装备立绘图像weapon_1.png以及armor_2/3/4/5.png。
 * 
 * 3、equipMap中配置各个角色id的可穿戴装备的立绘图像，数组内对应rmmv中数据库装备id和立绘png文件的后缀数字。需保证立绘文件中一定存在该后缀图片。
 * 
 * 4、将各个可穿戴装备的立绘图像放置于actor_[id]文件夹下，并命名为对应装备的名称，如：weapon_1.png、armor_2.png。后缀数字对应3中的装备id。
 */

(function () {
  // --------------------------- 立绘与数据库内装备映射配置填写位置----------------------------------
  /**
   * 这个数组内只填写已放入actor_[id]文件夹下的全部装备立绘的后缀数字。
   * 
   * 后缀数字对应数据库里的武器或护甲id数值。
   */
  var equipImgMap = {
    1: {
      weapon: [5],
      armor: [9],
    },
    2: {
      weapon: [6],
      armor: [9, 10, 11, 12],
    },
  }

  // ------------------------------------------------------------------------------------------
  var fileName = "Actors_DressUp_5M7"
  var parameters = PluginManager.parameters(fileName);

  var WEAPONKEY = "weapon"
  var ARMORKEY = "armor"
  var ARMOR_COUNT = 4; // 装备槽数量
  var WEAPON_COUNT = 1; // 武器槽数量

  var X_OFFSET = Number(parameters["xOffset"] || 180);
  var imageX = Number(parameters["arisX"] || 0)
  var imageY = Number(parameters["arisY"] || 100)
  var isArmorReverse = parameters["armorReverse"] == "true"
  // -------------------------------------------------------------------------------------------
  Scene_Equip.prototype.create = function () {
    Scene_MenuBase.prototype.create.call(this);
    this._equipImageCache = {}; // 存储装备立绘的 URL
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

  // 初始化精灵图对象
  Scene_Equip.prototype.initEquipSprite = function (isReverse) {
    if (isReverse) {
      for (var i = (ARMOR_COUNT + WEAPON_COUNT) - 1; i >= 0; i--) {
        if (!this._equipPictrues[i]) {
          this._equipPictrues[i] = new Sprite();
          this._equipPictrues[i].move(imageX, imageY);
          this.addChild(this._equipPictrues[i]);
        } else {
          // 如果已经存在，清除旧的装备图片
          this._equipPictrues[i].bitmap = ImageManager.loadEmptyBitmap();
        }
      }
    } else {
      for (var i = 0; i < (ARMOR_COUNT + WEAPON_COUNT); i++) {
        if (!this._equipPictrues[i]) {
          this._equipPictrues[i] = new Sprite();
          this._equipPictrues[i].move(imageX, imageY);
          this.addChild(this._equipPictrues[i]);
        } else {
          // 如果已经存在，清除旧的装备图片
          this._equipPictrues[i].bitmap = ImageManager.loadEmptyBitmap();
        }
      }
    }
  }

  // 初始化换装立绘系统
  Scene_Equip.prototype.initActorPicture = function (actorId) {
    // 是否为持有武器的立绘
    this._holdWeapon = false;

    // 确保 _equipPictrues 只初始化一次
    if (!this._equipPictrues) {
      this._equipPictrues = [];
    }

    // 创建当前角色的白身立绘，确保只初始化一次
    if (!this._playerPicture) {
      this._playerPicture = new Sprite(Bitmap.load(`img/player/actor_${actorId}/default/player.png`));
      this._playerPicture.move(imageX, imageY);
      this.addChild(this._playerPicture);
    } else {
      // 不同角色直接切换白身立绘
      this._playerPicture.bitmap = Bitmap.load(`img/player/actor_${actorId}/default/player.png`);
    }

    // 初始化精灵图装备图片（注意立绘层面正逆向覆盖顺序！）
    this.initEquipSprite(isArmorReverse)
    // 重加载角色的装备立绘
    this.updateEquipPictrues(actorId);
  };

  // 切换角色立绘至抓握姿态
  Scene_Equip.prototype.switchholdWeaponPicture = function (actorId) {

    if (!this._playerPicture) {
      throw new Error("请先初始化调用initActorPicture方法！")
    }
    if (this._holdWeapon) return; // 已经处于抓握姿态，不再切换
    this._playerPicture.bitmap = Bitmap.load(`img/player/actor_${actorId}/default/player_hold.png`);
    this._holdWeapon = true;

  }

  // 切换角色立绘至基础姿态
  Scene_Equip.prototype.resumePlayerPicture = function (actorId) {
    if (!this._playerPicture) {
      throw new Error("请先初始化调用initActorPicture方法！")
    }
    if (this._holdWeapon) { // 已经处于抓握姿态，切换立绘至抓握姿态
      this._playerPicture.bitmap = Bitmap.load(`img/player/actor_${actorId}/default/player.png`);
      this._holdWeapon = false;
    }
  }

  // 读取立绘的实际方法,返回对应装备立绘的文件路径
  Scene_Equip.prototype.loadEquipPictrues = function (actorId, picType, spriteId, equipObj) {
    // console.log("装备类型对象", equipObj);

    var isImageRender = equipImgMap[actorId][picType].includes(equipObj.id);
    var filePath;

    if (equipObj && isImageRender) {
      filePath = `img/player/actor_${actorId}/${picType}_${equipObj.id}.png`;
    } else {
      /** etypeId对应—— 1：武器 2：盾牌 3：头部 4：衣服 5：配饰 */
      filePath = `img/player/actor_${actorId}/default/${picType}_${equipObj.etypeId}.png`;
    }

    // **避免重复加载相同的图片**
    if (this._equipPictrues[spriteId].bitmap && this._equipPictrues[spriteId].bitmap.url === filePath) {
      return filePath;
    }

    // **释放旧 bitmap**
    if (this._equipPictrues[spriteId].bitmap) {
      this._equipPictrues[spriteId].bitmap = null;
    }

    // **加载新 bitmap**
    this._equipPictrues[spriteId].bitmap = Bitmap.load(filePath);
    this._equipPictrues[spriteId].bitmap.url = filePath; // **存储路径，避免重复加载**

    return filePath;
  };

  // 加载装备立绘的实际方法
  Scene_Equip.prototype.updateEquipPictrues = function (actorId) {
    var playerEquips = $gameActors.actor(actorId).armors();
    var playerWeapons = $gameActors.actor(actorId).weapons();

    // **初始化角色的装备图片缓存**
    if (!this._equipImageCache[actorId]) {
      this._equipImageCache[actorId] = {
        armors: new Array(ARMOR_COUNT).fill(null), // **初始化防具槽**
        weapons: new Array(WEAPON_COUNT).fill(null) // **初始化武器槽**
      };
    }
    // 循环读取护甲数据
    for (let i = 0; i < ARMOR_COUNT; i++) {
      if (playerEquips[i]) {
        let filePath = this.loadEquipPictrues(actorId, ARMORKEY, i, playerEquips[i]);
        this._equipImageCache[actorId].armors[i] = filePath; // **存储文件路径**
      } else {
        this._equipPictrues[i].bitmap = ImageManager.loadEmptyBitmap();
        this._equipImageCache[actorId].armors[i] = null; // **无装备，存 null**
      }
    }

    // 循环读取武器数据
    for (let j = 0; j < WEAPON_COUNT; j++) {
      let t = ARMOR_COUNT + j;
      if (playerWeapons[j]) {
        this.switchholdWeaponPicture(actorId); // 切换立绘至抓握姿态
        let filePath = this.loadEquipPictrues(actorId, WEAPONKEY, t, playerWeapons[j]);
        this._equipImageCache[actorId].weapons[j] = filePath; // **存储文件路径**
      } else {
        this.resumePlayerPicture(actorId); // 切换立绘至基础姿态
        this._equipPictrues[t].bitmap = ImageManager.loadEmptyBitmap();        // 无武器时切换立绘成无抓握姿势
        this._equipImageCache[actorId].weapons[j] = null; // **无装备，存 null**
      }
    }

    // console.log("装备图片缓存", this._equipImageCache);
  };

  // 返回对应角色已装备的装备立绘的文件路径
  Scene_Equip.prototype.getEquipImageUrls = function (actorId) {
    return this._equipImageCache[actorId] || { armors: [], weapons: [] };
  };

})();
