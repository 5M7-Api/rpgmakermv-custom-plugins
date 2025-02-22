/*:
@target MV MZ
@plugindesc MZv技能树配置 R2
@author うなぎおおとろ，5M7_Api | 汉化：硕明云书
@link https://github.com/5M7-Api/rpgmakermv-custom-plugins

@help
[使用方法]
■ 设置技能树
技能树的设置是、「SkillTreeConfig.js」通过编辑文件进行
作为基本的设定，每个操作者设定技能树的类型（剑技能和魔法技能等）
然后按类型构建技能树。
技能树的构筑通过技能的设定（取得火焰Ⅰ后可以取得火焰Ⅱ等）进行。

■ SP获取设置
技能的学习需要SP。
1、获取存储处理
2、战斗结束获得
3、通过升级获得SP中所述修改相应参数的值。
4、战斗结束时得到的SP的设定方法
--------------------------------------------
在敌人角色的笔记栏里
<battleEndGainSp: SP>
--------------------------------------------

5、通过升级设置SP获得方法
配置的「levelUpGainSp」中所述修改相应参数的值

■ 如何在事件中获得存储处理器
在脚本中
skt_gainSp(操作者ID, 获得的SP值)
使用以下步骤创建明细，以便在概念中分析。
例如，在操作者ID为1操作者获得5 SP的情况下
skt_gainSp(1, 5);

■ 获取已分配的累计SP
skt_TotalSp（操作者ID，累计SP存储目标变量ID）
中描述的场景，使用下列步骤创建明细
例如，在将操作者ID为1操作者的累计SP代入ID2的变量的情况下
skt_totalSp(1, 2);

■ 技能复位
在脚本中
skt_skillReset(操作者ID);
例例如，在进行操作者ID为1操作者的技能复位的情况下
skt_skillReset(1);

■ 启用/禁用技能树类型
在脚本中
skt_enableType(操作者ID ,"类型名称");

启用↑  禁用↓
skt_disableType(操作者ID ,"类型名称");

禁用的类型不会显示在技能树的类型列表中。

■ 类型继承
如果希望在满足特定条件时将新技能添加到技能树中，请使用“类型继承”。
例如，在想将类型“下位魔法”变更为“上位魔法”情况下，在预先将两种类型登录到配置中之后
“上位魔法”将被无效化。然后，使用类型的继承功能，让“上位魔法”继承“下位魔法”。

进行类型的继承时，请在脚本中
skt_migrationType(操作者ID, "继承人类型名称", "目标类型名称", 有无复位);
中所述修改相应参数的值。关于是否复位，在交接后，在复位交接源类型的技能树时，将true设为
如果不重置，则指定false
例例如，当使用者ID为1使用者使类型“下位魔法”继承到“上位魔法”，进而进行技能复位时
skt_migrationType(操作者ID, "下位魔法", "上位魔法", true);

■ 从地图导入技能树
通过从地图中读入技能树的各技能的配置坐标，可以在某种程度上自由布局的技能树
可以创建。此功能只能设置技能坐标，技能之间的线在插件侧绘制。

技能坐标的设定
在地图上的活动中进行设定。
例如，在有“火焰”这个技能的情况下，在想要配置技能的坐标上制作空的事件
在活动的备注栏中
"火焰"
中所述修改相应参数的值。然后，“火焰”和备注栏中记载的事件的XY坐标将作为技能的XY坐标使用。
*/

const loadSkillTreeConfig = () => {
  // ------------------- 手动编写配置区域 -----------------------------

  // 设置技能树的类型。
  // skillTreeTypes: 将类型设置添加到“到”中的使用者数。

  // 类型设置的格式如下：。
  // { actorId: 角色ID, types: [类型信息1，类型信息2, ...] }

  // 类型信息设置为：
  // [类型种类、类型名、类型的说明、类型有效/无效]
  // 类型类型。。。在技能派生设置中设置用于标识类型的唯一标识符。
  // 类型名称。。。设置要在类型列表窗口中显示的类型名称。
  // 类型说明。。。设置要在类型列表窗口中显示的类型说明。
  // 启用/禁用类型。。。启用类型、trueを、禁用、false的双曲正切值。

  // skills：
  // [技能名称, 技能ID, 必要SP, 图标信息]
  //技能名称。。。在技能树派生设置中唯一标识技能的标识符
  //因为是标识符，所以即使与实际的技能名不一致也没有问题。
  //技能ID。。。数据库中相应技能的标识
  //所需SP。。。学习技能所需的存储处理器
  // 关于图标信息，根据使用图标还是使用任意图像，以以下形式注册。
  //   アイコンを使用する場合 ["icon", iconIndex]
  //   iconIndex...使用するアイコンのインデックス
  //               iconIndexは省略可能です。省略した場合、スキルに設定されているアイコンが使用されます。
  //   画像を使用する場合 ["img", fileName]
  //   fileName...画像のファイル名。画像は、「img/pictures」フォルダにインポートしてください。
  const type1 = {
    label: "类型3",
    name: "类型3名称",
    des: "类型3描述",
    enable: false,
    skills: [
      ["技能1", 11, 1, ["icon"]],
      ["技能3", 13, 2, ["icon"]],
      ["技能4", 14, 2, ["icon"]],
      ["技能6", 16, 5, ["icon"]],
    ],
    sktName: [], //后续自动生成技能名映射，此处可以缺少此键
  };

  const type2 = {
    label: "类型4",
    name: "类型4名称",
    des: "类型4描述",
    enable: true,
    skills: [
      ["技能2", 12, 2, ["icon"]],
      ["技能5", 15, 2, ["icon"]],
    ],
    sktName: [], //后续自动生成技能名映射，此处可以缺少此键
  };
  // ... more types
 

  // 此处需要手动输出所有技能名称的映射

  type1.sktName = type1.skills.map((skill) => skill[0]); 

  type2.sktName = type2.skills.map((skill) => skill[0]); 

 // ------------------------------------------------------------------

  /**
   * 将技能类型中的技能全部合并输出所有技能的数组
   */
  const mergeArrFromObjects = (...objects) => {
    return objects.reduce((acc, obj, index) => {
      if (!obj.hasOwnProperty("skills")) {
        console.error(
          `Error: Object at index ${index} is missing the "skills" key.`
        );
        return acc; // Skip this object
      }
      if (!Array.isArray(obj.skills)) {
        console.error(
          `Error: The value of "skills" in object at index ${index} is not an array.`
        );
        return acc; // Skip this object
      }
      return [...acc, ...obj.skills];
    }, []);
  };

  return {
    // =============================================================
    // ●从这里开始是设定项目。
    // =============================================================

    //                  对于该项目，可以省略。省略时、true来修改标记元素的显示属性。
    skillTreeTypes: [
      {
        actorId: 1, //角色1
        types: [
          [type1.label, type1.name, type1.des, type1.enable],
          [type2.label, type2.name, type2.des, type2.enable],
          // ["格闘技", "格闘技", "格闘技を取得します。"],
        ],
      },

      {
        actorId: 2,
        types: [
          // ["剣技", "剣技", "剣技を取得します。"],
          // ["格闘技", "格闘技", "格闘技を取得します。"],
        ],
      },

      {
        actorId: 3, //角色3
        types: [
          // ["初阶魔法", "初阶魔法", "初阶魔法师可学到的技能！"],
        ],
      },

      {
        actorId: 4,
        types: [
          // ["剣技", "剣技", "剣技を取得します。"],
          // ["格闘技", "格闘技", "格闘技を取得します。"],
        ],
      },
    ],

    // 设置技能树的地图导入。
    // 要导入的贴图的格式如下：。
    // skillTreeMapId: { 技能树名称1: 地图ID1, skillTreeName2: mapID2, ... }
    // skillTreeName...指定技能树的类型名称。
    // mapID...指定要导入的映射标识。如果为0，则不进行读取。
    skillTreeMapId: {
      初阶魔法: 0,
    },

    // 各スキルの情報を登録します。
    // skillTreeInfo: [ ～ ]中注册的技能数的技能信息。

    //  另外，图标信息可以省略["icon"]将条目添加到文档注册表。
    skillTreeInfo: mergeArrFromObjects(type1, type2),

    // 进行技能树的派生设置。
    // skillTreeDerivative:

    // 技能树派生设置如下所示：
    // "类型名称": [ [技能1, [派生技能1, 派生技能2, ...]], [技能2, [派生技能3, 派生技能4, ...] ]
    // 此外，若要在获取“鞋跟”时获得“火焰”和“火花”，请执行以下设置：。
    // ["ヒール", ["ファイア"]],
    // ["ヒール", ["スパーク"]],
    // ["ファイア"],
    // ["スパーク"],     //9 10 11 12 13
    skillTreeDerivative: {
      [type1.label]: [
        // all skills
        [type1.sktName[0]],
        [type1.sktName[1]],
        [type1.sktName[2]],
        [type1.sktName[3]],
        // tree level 1 -> 2
        [type1.sktName[0], [type1.sktName[2]]],
        [type1.sktName[1], [type1.sktName[2]]],
        // tree level 2 -> 3
        [type1.sktName[2], [type1.sktName[3]]],
      ],
      [type2.label]: [
        // all skills
        [type2.sktName[0]],
        [type2.sktName[1]],
        // tree level 1 -> 2
        [type2.sktName[0], [type2.sktName[1]]],
      ],
    },

    // 通过升级获得SP时，将按级别获得的SP值设置为以下格式：。
    // classId: 职业ID, default: デフォルト値, レベル: SP値, レベル: SP値, ...
    // 在下面的设置示例中，级别2获得3SP，级别3获得4SP，其他级别获得5SP。
    levelUpGainSp: [
      {
        classId: 1,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 2,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 3,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 4,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 5,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 6,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 7,
        default: 5,
        2: 3,
        3: 4,
      },

      {
        classId: 8,
        default: 5,
        2: 3,
        3: 4,
      },
    ],
    // =============================================================
    // ●設定項目はここまでです。
    // =============================================================
  };
};
