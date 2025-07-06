
/*:
 * @plugindesc 种植扩展系统
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help
 * 
 * 此插件基于MOG_TimeSystem.js插件的基础上，扩展一系列针对植物种植的功能和机制。
 * 
 * 本插件的详细配置需要在代码内硬编码编写，详情参见代码注释。
 * 
 * - 可供外部RMMV编辑器调用的脚本如下：
 * 
 * PlantManager.hasItemInList(SEEDS_ITEM_LIST);
 * 
 * 此脚本用于判断玩家是否拥有指定的种子道具，返回布尔值。
 * 
 * PlantManager.isPlantItem([x],SEEDS_ITEM_LIST);
 * 
 * 此脚本用于判断id为x变量中的存入物品是否是种子道具，返回布尔值。
 * 
 * PlantManager.isPlantItem([x],FERTILIZE_ITEM_LIST);
 * 
 * 此脚本用于判断id为x变量中的存入物品是否是施肥道具，返回布尔值。
 * 
 * PlantManager.isPlantItem([x],WATER_ITEM_LIST);
 * 
 * 此脚本用于判断id为x变量中的存入物品是否是浇水道具，返回布尔值。
 * 
 * PlantManager.run(this,[x]);
 * 
 * 此脚本用于启动id为x变量中的物品的种植系统流程。
 * 
 * 需注意调用应事先经过其他脚本判断校验！
 * 
 * PlantManager.observe(this);
 * 
 * 此脚本用于执行一次观察事件。
 * 
 * 需事先在EVENT_CONFIG中配置观察事件。
 * 
 * PlantManager.fertilize(this,[x]);
 * 
 * 此脚本用于执行一次施肥事件，将消耗id为x变量中的施肥道具。
 * 
 * 需事先在EVENT_CONFIG中配置施肥事件。
 * 
 * PlantManager.water(this,[x]);
 * 
 * 此脚本用于执行一次浇水事件，将识别id为x变量中的浇水道具。
 * 
 * 需注意事先在EVENT_CONFIG中配置浇水事件，且不会消耗id为x变量中的浇水道具。
 * 
 * PlantManager.uproot(this);
 * 
 * 此脚本用于执行一次铲除事件。将清除掉已种植植物对象。
 * 
 * PlanManager.harvest(this,[x]);
 * 
 * 此脚本用于执行一次收获事件。将清除掉已种植植物对象。
 * 
 * @param isCheckConfig 
 * @desc 是否启动编写配置检查（生产环境须关闭）
 * @type boolean
 * @default true
 * 
 * @param isDebugLog
 * @desc 是否开启调试日志（生产环境须关闭）
 * @type boolean
 * @default false
 * 
 */
// #region ---------------------- 不能篡改的硬编码变量！ ----------------------
var SELFSWITCH = {
    A: 'A', // 生长事件
    B: 'B', // 成熟事件
    C: 'C', // 枯萎事件
    D: 'D', // 未使用
};

var EVENTS_TYPE = {
    harvest: 'harvest', // 收获 -> 获得物品，清除植物
    observe: 'observe', // 观察状态 -> 得到植物状态的提示信息
    water: 'water', // 浇灌 -> 成长时间
    fertilize: 'fertilize', // 施肥 -> 获得物品概率
    uproot: 'uproot', // 铲除 -> 获得物品，清除植物
}

function PlantManager() {
    throw new Error('This is a static class');
}

/**
 * 深拷贝通用函数
 * 支持对象、数组、基本类型，跳过函数和循环引用
 * @param {*} source - 要拷贝的对象
 * @returns {*} 拷贝后的新对象
 */
function _deepClone(source) {
    var visited = [];

    function _clone(obj) {
        // 处理 null、undefined、基本类型
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        // 检查是否已经拷贝过（避免循环引用）
        for (var i = 0; i < visited.length; i++) {
            if (visited[i].original === obj) {
                return visited[i].copy;
            }
        }

        var copy;
        if (Object.prototype.toString.call(obj) === '[object Array]') {
            copy = [];
        } else {
            copy = {};
        }

        // 记录已拷贝对象
        visited.push({ original: obj, copy: copy });

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = _clone(obj[key]);
            }
        }

        return copy;
    }

    return _clone(source);
}

/** 检查植物配置参数的debug函数 */
PlantManager.validateConfig = function () {
    var isValid = true;
    var keys = Object.keys(PLANT_CONFIG);
    var defaultCount = 0; // 用于统计 isDefault 为 true 的配置数量
    var allowedSwitches = ['A', 'B', 'C'];

    keys.forEach(function (key) {
        var config = PLANT_CONFIG[key];

        // 1. 键必须在 SEEDS_ITEM_LIST 中
        if (SEEDS_ITEM_LIST.indexOf(Number(key)) === -1) {
            console.error('错误: 配置键 ' + key + ' 不在 SEEDS_ITEM_LIST 中');
            isValid = false;
        }

        // 2. 必须有 phase 且 phase 中的 eventSwitch 属于 A/B/C
        if (!Array.isArray(config.phase)) {
            console.error('错误: 配置 ' + key + ' 缺少 phase 数组');
            isValid = false;
        } else {
            config.phase.forEach(function (p, i) {
                if (!p.eventSwitch || allowedSwitches.indexOf(p.eventSwitch) === -1) {
                    console.error('错误: 配置 ' + key + ' 的 phase[' + i + '] 的 eventSwitch 不合法：', p.eventSwitch);
                    isValid = false;
                }
            });
        }

        // 3. 统计 isDefault 为 true 的配置数量
        if (config.isDefault === true) {
            defaultCount++;
        }

        // 4. factors 中必须包含 water 和 fertilize，且所有值为数字
        var factors = config.factors || {};
        if (typeof factors.water !== 'number' || typeof factors.fertilize !== 'number') {
            console.error('错误: 配置 ' + key + ' 的 factors 缺少 water 或 fertilize，或类型错误');
            isValid = false;
        }
        for (var fk in factors) {
            if (typeof factors[fk] !== 'number') {
                console.error('错误: 配置 ' + key + ' 的 factors.' + fk + ' 不是数字');
                isValid = false;
            }
        }

        // 5. method 必须存在于 METHOD_LIST 中
        if (METHOD_LIST.indexOf(config.method) === -1) {
            console.error('错误: 配置 ' + key + ' 的 method 不存在于 METHOD_LIST 中');
            isValid = false;
        }
    });

    // 3. 检查是否只有一个 isDefault 为 true 的配置
    if (defaultCount !== 1) {
        console.error('错误: 必须且只能有一个配置的 isDefault 为 true 的项');
        isValid = false;
    }

    if (isValid) {
        console.log('✅ 植物配置验证通过');
    } else {
        console.warn('⚠️ 植物配置存在错误，请检查上述日志');
    }

    return isValid;
};
/** 检查植物事件配置参数的debug函数 */
PlantManager.validateEventConfig = function () {
    var isValid = true;
    var keys = Object.keys(EVENT_CONFIG);

    keys.forEach(function (key) {
        var config = EVENT_CONFIG[key];

        // 1. 外层 key 必须存在于 SEEDS_ITEM_LIST
        if (!SEEDS_ITEM_LIST.includes(Number(key))) {
            console.error(`❌ EVENT_CONFIG 键 ${key} 不存在于 SEEDS_ITEM_LIST 中`);
            isValid = false;
        }

        // 2. 如果 PLANT_CONFIG 中有该 key，EVENT_CONFIG 也必须存在
        if (PLANT_CONFIG[key] === undefined) {
            console.error(`❌ EVENT_CONFIG 键 ${key} 找不到对应的 PLANT_CONFIG`);
            isValid = false;
        }

        // 3. 必须包含 water、fertilize、uproot、harvest 四类
        var requiredTypes = [EVENTS_TYPE.water, EVENTS_TYPE.fertilize, EVENTS_TYPE.uproot, EVENTS_TYPE.harvest];
        requiredTypes.forEach(function (type) {
            if (!config.hasOwnProperty(type)) {
                console.error(`❌ EVENT_CONFIG[${key}] 缺少必需的类型 "${type}"`);
                isValid = false;
            }
        });

        // 4. water 内部 id 检查
        if (Array.isArray(config[EVENTS_TYPE.water])) {
            config[EVENTS_TYPE.water].forEach((entry, i) => {
                if (!entry.hasOwnProperty('id')) {
                    console.error(`❌ EVENT_CONFIG[${key}].water[${i}] 缺少 id`);
                    isValid = false;
                } else if (!WATER_ITEM_LIST.includes(entry.id)) {
                    console.error(`❌ EVENT_CONFIG[${key}].water[${i}] 的 id (${entry.id}) 不在 WATER_ITEM_LIST 中`);
                    isValid = false;
                }
            });
        }

        // 4. fertilize 内部 id 检查
        if (Array.isArray(config[EVENTS_TYPE.fertilize])) {
            config[EVENTS_TYPE.fertilize].forEach((entry, i) => {
                if (!entry.hasOwnProperty('id')) {
                    console.error(`❌ EVENT_CONFIG[${key}].fertilize[${i}] 缺少 id`);
                    isValid = false;
                } else if (!FERTILIZE_ITEM_LIST.includes(entry.id)) {
                    console.error(`❌ EVENT_CONFIG[${key}].fertilize[${i}] 的 id (${entry.id}) 不在 FERTILIZE_ITEM_LIST 中`);
                    isValid = false;
                }
            });
        }
    });

    // 额外：确保 PLANT_CONFIG 中存在的种子 ID，也都在 EVENT_CONFIG 中存在（双向一致）
    for (var plantKey in PLANT_CONFIG) {
        if (!EVENT_CONFIG.hasOwnProperty(plantKey)) {
            console.error(`❌ PLANT_CONFIG 中存在的种子 ${plantKey} 在 EVENT_CONFIG 中不存在`);
            isValid = false;
        }
    }

    if (isValid) {
        console.log("✅ EVENT_CONFIG 验证通过");
    } else {
        console.warn("⚠️ EVENT_CONFIG 存在错误，请检查上述日志");
    }

    return isValid;
};
/** 检查MOG_TimeSystem插件是否正常加载 */
var mogTimeSystemCheck = function () {
    if (!PluginManager._scripts.includes('MOG_TimeSystem')) {
        throw new Error('MOG_TimeSystem插件没有加载！')
    } else if (typeof Moghunter === 'undefined') {
        throw new Error('请确保本插件在MOG_TimeSystem之后加载！');
    } else {
        console.log('✅ MOG_TimeSystem已正常加载！')
    }
}
//#endregion

// #region ---------------------- 外部插件变量获取 ----------
var FILE_NAME = 'Plants_System_5M7';
var _5M7 = _5M7 || {};
_5M7.parameters = PluginManager.parameters(FILE_NAME);
_5M7.isCheckConfig = _5M7.parameters['isCheckConfig'] == 'true';
_5M7.isDebugLog = _5M7.parameters['isDebugLog'] == 'true';
//#endregion

// -------------------------- 配置编写区域 -----------------------------
var SEEDS_ITEM_LIST = [5, 9]; // 种子物品ID数组
var WATER_ITEM_LIST = [7, 10]; // 浇水工具物品ID数组
var FERTILIZE_ITEM_LIST = [8, 11]; // 施肥物品ID数组

var METHOD_LIST = ['default', 'supper']; // 成长算法列表（自己取名）

/**
 * 种子植物基本属性配置规则：
 * 1、最外部键名必须是SEEDS_ITEM_LIST中包含的ID（硬编码）
 * 2、必须包含phase属性且phase中数组元素的eventSwitch必须包含硬编码的A/B/C三种事件
 * 3、只能有一个 isDefault: true 的配置项
 * 4、factors对象中必须包含water和fertilize两种键，且所有键值必须是数字
 * 5、成长算法metho必须是METHOD_LIST存在的（硬编码）
 */
var PLANT_CONFIG = {
    [SEEDS_ITEM_LIST[0]]: { // 5是物品Id -> 种子
        /**
        * 精灵图索引布局结构，PNG精灵图将被划分为8块。
        * ┌────┬────┬────┬────┐
        * │  0 │  1 │  2 │  3 │
        * ├────┼────┼────┼────┤
        * │  4 │  5 │  6 │  7 │
        * └────┴────┴────┴────┘
        * 
        * 每个索引对应的是这张图中的一个角色切片，每个角色有 3×4 帧的动画（左右移动、上下移动等）。
        * 
        * 一张图就放一种植物的全部可能的成长阶段（索引0开始，实际地图事件为默认的其他精灵图或无图片）
        */
        phase: [
            { image: 'plant3', time: 0, eventSwitch: SELFSWITCH.A, imageIndex: 0 },
            { image: 'plant3', time: 10, eventSwitch: SELFSWITCH.A, imageIndex: 1 },
            { image: 'plant3', time: 20, eventSwitch: SELFSWITCH.A, imageIndex: 2 },
            { image: 'plant3', time: 30, eventSwitch: SELFSWITCH.B, imageIndex: 3 },
            { image: 'plant3', time: 100, eventSwitch: SELFSWITCH.C, imageIndex: 4 },
        ], // 每个阶段的信息（包含图片和时间）
        method: METHOD_LIST[0],  // 植物成长的算法
        isDefault: true, // 是否是默认配置（兼容没有指定配置的植物）
        factors: { // 成长因子的默认配置 
            water: 30, // 含水量 - 每秒减少，到0则死亡
            fertilize: 0,  // 施肥量 - 施肥后增加，影响收获物数量和概率
            seasion: 1000, // 季节性 - 影响收获物数量和概率，到0会死亡
            weather: 200, // 天气 - 影响收获物数量和概率，到0会死亡
            other: 100, // 其他因素
        }
    },
    [SEEDS_ITEM_LIST[1]]: {
        phase: [
            { image: 'plant1', time: 0, eventSwitch: SELFSWITCH.A, imageIndex: 0 },
            { image: 'plant1', time: 10, eventSwitch: SELFSWITCH.A, imageIndex: 1 },
            { image: 'plant1', time: 20, eventSwitch: SELFSWITCH.A, imageIndex: 2 },
            { image: 'plant1', time: 30, eventSwitch: SELFSWITCH.B, imageIndex: 3 },
            { image: 'plant1', time: 100, eventSwitch: SELFSWITCH.C, imageIndex: 4 },
        ], // 每个阶段的信息（包含图片和时间）
        method: METHOD_LIST[1],
        factors: {
            water: 30,
            fertilize: 0,
            seasion: 1000,
            weather: 200,
            other: 100,
        }
    }
    // 其他种子配置……
};

/**
 * 种子事件函数的基本配置规则：
 * 1、最外层键名存在于SEEDS_ITEM_LIST且和PLANT_CONFIG形成一一对应关系
 * 2、键值内对象包含EVENTS_TYPE的water/uproot/harvest/fertilize的四种硬编码属性
 * 3、water和fertilize的id必须存在且需要分别存在于 WATER_ITEM_LIST 和 FERTILIZE_ITEM_LIST 中
 */
var EVENT_CONFIG = {
    [SEEDS_ITEM_LIST[0]]: {
        [EVENTS_TYPE.harvest]: [ // 收获事件可获得的所有物品的ID、数量和概率，prob最小不应小于0.0001
            { id: 6, quantity: 3, prob: 0.5 },
            { id: 6, quantity: 3, prob: 0.9 },
            { id: 8, quantity: 1, prob: 1 },
        ],
        [EVENTS_TYPE.uproot]: [ // 铲除事件可获得的所有物品的ID、数量和概率
            { id: 5, quantity: 1, prob: 0.3 },
            { id: 8, quantity: 1 }
        ],
        [EVENTS_TYPE.observe]: [ // 观察事件弹出的消息，需注意顺序与phase一一对应！
            ['这是种子1的phase1的状态信息！\n第二行消息\n第三行',],
            ['这是种子1的phase2的状态信息！'],
            ['这是种子1的phase3的状态信息！'],
            ['这是种子1的phase4的状态信息！'],
            ['这是种子1的phase5的状态信息！'],
        ],
        [EVENTS_TYPE.water]: [ // 浇水事件对应的物品ID和每次使用增加水分值。若没有配置对应的道具ID则使用后数值不变。
            { id: WATER_ITEM_LIST[0], buff: 20 },
            { id: WATER_ITEM_LIST[1], buff: 100 }
        ],
        [EVENTS_TYPE.fertilize]: [ // 施肥事件对应的物品ID和每次使用增加施肥量。若没有配置对应的道具ID则使用后数值不变。
            { id: FERTILIZE_ITEM_LIST[0], buff: 100 },
            { id: FERTILIZE_ITEM_LIST[1], buff: 10000 }
        ]
    },
    [SEEDS_ITEM_LIST[1]]: {
        [EVENTS_TYPE.harvest]: [
            { id: 12, quantity: 3, prob: 0.5 },
            { id: 12, quantity: 3, prob: 0.9 },
            { id: 8, quantity: 1, prob: 1 },
            { id: 13, quantity: 1, prob: 0 }
        ],
        [EVENTS_TYPE.uproot]: [
            { id: 9, quantity: 1, prob: 0.3 },
            { id: 8, quantity: 1 }
        ],
        [EVENTS_TYPE.observe]: [
            ['这是phase1的状态信息！'],
            ['这是phase2的状态信息！'],
            ['这是phase3的状态信息！'],
            ['这是phase4的状态信息！'],
            ['这是phase5的状态信息！'],
        ],
        [EVENTS_TYPE.water]: [
            { id: WATER_ITEM_LIST[0], buff: 20 },
            { id: WATER_ITEM_LIST[1], buff: 100 }
        ],
        [EVENTS_TYPE.fertilize]: [
            { id: FERTILIZE_ITEM_LIST[0], buff: 100 },
            { id: FERTILIZE_ITEM_LIST[1], buff: 10000 }
        ]
    }
}

/**
 *  写好的算法必须在这里的switch语句中部署才能使用！
 *  需注意成长算法每转换时间秒触发一次，应注意叠加调用的问题。
 */
PlantManager.growMethodSelector = function (method, plant) {
    switch (method) {
        case METHOD_LIST[0]:
            PlantManager.growDefault(plant);
            break;
        case METHOD_LIST[1]:
            PlantManager.growSupper(plant);
            break;
        // case 'custom':
        //     // 自定义算法
        //     break;
        default:
            throw new Error('未知的成长算法！', method);
    }
}

/** 通用简单算法 */
PlantManager.growDefault = function (plant) {
    plant.minusPlantConfigFactor('water', 1) // 每秒减少含水量
    var factors = plant.getPlantConfigFactors();
    // console.log('成长算法调用，植物的各项参数：', factors)
    // 配置浇水事件的交互
    switch (true) {
        case factors.water >= 200:
            _insertMessageToObserve(plant, 1, '植物水分充足！')
            break;
        case 100 <= factors.water && factors.water < 200:
            _insertMessageToObserve(plant, 1, '植物水分不足！')
            break;
        case 0 < factors.water && factors.water < 100:
            _insertMessageToObserve(plant, 1, '植物即将枯萎！')
            break;
        default:
            plant.withered() // 植物枯萎函数
            _insertMessageToObserve(plant, 1, '植物已枯萎！')
            break;
    }
    // 配置施肥事件的交互，并进行收获物结算
    switch (true) {
        case factors.fertilize >= 100:
            _updateHarvestItems(plant, 1.5, 1.1)
            _insertMessageToObserve(plant, 2, '植物施肥量充足！')
            break;
        case 50 <= factors.fertilize && factors.fertilize < 100:
            _updateHarvestItems(plant, 1.2, 1)
            _insertMessageToObserve(plant, 2, '植物施肥量一般！')
            break;
        case 0 < factors.fertilize && factors.fertilize < 50:
            _updateHarvestItems(plant, 1, 1)
            _insertMessageToObserve(plant, 2, '植物施肥量不足！')
            break;
        default:
            _updateHarvestItems(plant, 0.8, 0.8)
            _insertMessageToObserve(plant, 2, '植物没有施肥！')
            break;
    }

}

/** 复杂算法 */
PlantManager.growSupper = function (plant) {
    var harvestBuff = 1 // 收获物品数量增长倍数
    var probBuff = 1 // 收获物品概率增长倍数

    // 根据季节变化每秒减少的含水量
    var waterConsumes = 1;
    var season = $gameSystem.season();
    switch (season) {
        case 1: // 春天
            waterConsumes = 1;
            break;
        case 2: // 夏天
            waterConsumes = 2;
            break;
        case 3: // 秋天
            waterConsumes = 0.8;
            break;
        case 4: // 冬天
            waterConsumes = 0.5;
            break;
        default:
            break;
    }
    plant.minusPlantConfigFactor('water', waterConsumes) // 每秒减少含水量

    // 根据季节调整季节耐受性
    var seasonResist = 1;
    switch (season) {
        case 1: // 春天
            seasonResist = 1;
            break;
        case 2: // 夏天
            seasonResist = -1;
            break;
        case 3: // 秋天
            seasonResist = 2;
            break;
        case 4: // 冬天
            seasonResist = -1.5;
            break;
        default:
            break;
    }
    plant.addPlantConfigFactor('seasion', seasonResist) // 调整季节耐受性

    var factors = plant.getPlantConfigFactors();
    // console.log('成长算法调用，植物的各项参数：', factors)
    // 含水量检查和操作
    switch (true) {
        case factors.water >= 200:
            plant.addHarvestBuff(1)
            _insertMessageToObserve(plant, 1, '植物水分充足！')
            break;
        case 100 <= factors.water && factors.water < 200:
            _insertMessageToObserve(plant, 1, '植物水分不足！')
            break;
        case 0 < factors.water && factors.water < 100:
            plant.minusHarvestBuff(1)
            _insertMessageToObserve(plant, 1, '植物即将枯萎！')
            break;
        default:
            plant.withered() // 植物枯萎函数
            _insertMessageToObserve(plant, 1, '植物已枯萎！')
            break;
    }
    // 施肥量检查和操作
    switch (true) {
        case factors.fertilize >= 100:
            plant.addHarvestBuff(2)
            _insertMessageToObserve(plant, 2, '植物施肥量充足！')
            break;
        case 50 <= factors.fertilize && factors.fertilize < 100:
            _insertMessageToObserve(plant, 2, '植物施肥量一般！')
            break;
        case 0 < factors.fertilize && factors.fertilize < 50:
            plant.minusHarvestBuff(1)
            _insertMessageToObserve(plant, 2, '植物施肥量不足！')
            break;
        default:
            plant.minusHarvestBuff(2)
            _insertMessageToObserve(plant, 2, '植物没有施肥！')
            break;
    }
    // 季节耐受性检查
    switch (true) {
        case seasonResist >= 0:
            _insertMessageToObserve(plant, 3, '植物在当前季节长势兴旺！')
            break;
        case seasonResist < 0:
            _insertMessageToObserve(plant, 3, '植物在当前季节长势很差！')
            break;
        default:
            break;
    }
    // 季节耐受性耗尽则枯萎
    if (factors.seasion < 0) {
        plant.withered()
    }
    // 其他因素判定，检查全局开关
    var switchId = 4
    var switchValue = $gameSwitches.value(switchId)
    // console.log('全局开关4的值为：', switchValue)
    if (switchValue) { // 开关开启，就调整其他因素的影响值
        plant.addPlantConfigFactor('other', 1)
    }

    // 所有权重影响对于收获事件的结算
    var effectBuffCore = plant.getHarvestBuff();
    // console.log('收获权重影响：', effectBuffCore)
    switch (true) {
        // 总权重影响收获概率和数量的倍率
        case effectBuffCore >= 1000:
            _updateHarvestItems(plant, harvestBuff * 1.5, probBuff * 1.1)
            break;
        case 500 <= effectBuffCore && effectBuffCore < 1000:
            _updateHarvestItems(plant, harvestBuff * 1.2, probBuff * 1)
            break;
        default:
            _updateHarvestItems(plant, harvestBuff, probBuff)
            break;
    }

    // 其他因素的影响对于收获事件的结算（额外增加一个不可获得道具）
    if (factors.other > 110) {
        // 只要处于过全局开关4的影响10秒以上时，获得稀有果实（BUGWARING -> 固定值操作！）
        _modifyPlantHarvest(plant, function (quantity, prob, item) {
            if (item.id === 13) { //只针对id为13的稀有果实进行处理
                return {
                    quantity: quantity,
                    prob: prob < 1 ? 1 : prob
                }
            }
            return null;
        })
    }
}

//#region -------------------------- MOG_TimeSystem.js 桥接代码 --------------

// 总秒数计算函数，附加到 Game_System 原型上
Game_System.prototype.totalSeconds = function () {
    var v = function (id) {
        return $gameVariables.value(id) || 0;
    };

    var sec = Math.floor(v(this._sec_variableId) / 100);   // 原始单位为百分比
    var min = v(this._min_variableId);
    var hour = v(this._hour_variableId);
    var day = v(this._day_variableId);
    var month = v(this._month_variableId);
    var year = v(this._year_variableId);

    return sec + (min * 60) + (hour * 3600) + (day * 86400) +
        (month * 30 * 86400) + (year * 365 * 86400);
};
//#endregion

//#region -------------------------- 源代码嵌入 ------------------------
/** 持久化存档数据 */
var _DataManager_makeSaveContents = DataManager.makeSaveContents;
DataManager.makeSaveContents = function () {
    PlantManager.saveToGameSystem();  // 任何保存行动自动写入 $gameSystem
    return _DataManager_makeSaveContents.call(this);
};

/** 读取存档时读取数据 */
var _DataManager_loadGame = DataManager.loadGame;
DataManager.loadGame = function (savefileId) {
    var success = _DataManager_loadGame.call(this, savefileId);
    if (success) {
        PlantManager.loadFromGameSystem();
        PlantManager._loadedFromSystem = true;
    }
    return success;
};

/** 新游戏时初始化数据 */
var _DataManager_setupNewGame = DataManager.setupNewGame;
DataManager.setupNewGame = function () {
    _DataManager_setupNewGame.call(this);
    PlantManager._plantsMap = {};
    PlantManager._loadedFromSystem = true;
};

/** 地图心跳函数 */
var _Scene_Map_update = Scene_Map.prototype.update;
Scene_Map.prototype.update = function () {
    _Scene_Map_update.call(this);
    PlantManager.update();
};

/** 底层刷新事件页函数 */
var _Game_Event_refresh = Game_Event.prototype.refresh;
Game_Event.prototype.refresh = function () {
    _Game_Event_refresh.call(this);
    var eventid = this._eventId;
    var mapid = $gameMap.mapId();
    var uniqueId = PlantManager.genUniqueId(eventid, mapid);
    PlantManager.refresh(uniqueId); // 刷新事件页的图像
};
//#endregion

//#region -------------------------- 静态类 PlantManager --------------------------
PlantManager._plantsMap = {}; // 存放游戏内所有种植对象（需要持久化）

/**
 * 生成该种植事件在游戏中的唯一ID
 * @param {number} eventId 事件ID
 * @param {number} mapId 地图ID
 * @returns {string} 唯一ID
 */
PlantManager.genUniqueId = function (eventId, mapId) {
    return `${mapId}-${eventId}-plant`;
};

PlantManager.getPlantObj = function (uniqueId) {
    return this._plantsMap[uniqueId];
}

/** 
 * 根据事件页对象在种植物映射表里找到对应植物对象（当前地图存在的情况）
 * @param {Game_Event} eventObj 事件页对象
 * @returns {Game_Plant} 种植物对象
 */
PlantManager.findPlant = function (eventObj) {
    var uniqueId = this.genUniqueId(eventObj._eventId, $gameMap.mapId());
    return this._plantsMap[uniqueId];
};

/**
 * 返回缓存中的种植物对象
 * @param {*} uniqueId 
 * @returns {Game_Plant} 种植物对象
 */
PlantManager.findCachedPlant = function (uniqueId) {
    return this._plantsMap[uniqueId];
}

PlantManager.getSplitIdParts = function (uniqueId) {
    var parts = uniqueId.split('-');
    return {
        mapId: parseInt(parts[0]),
        eventId: parseInt(parts[1]),
    };
};

/** 获取当前地图的事件对象 */
PlantManager.getEventObj = function (uniqueId) {
    var parts = PlantManager.getSplitIdParts(uniqueId);
    var event = $gameMap.event(parts.eventId);
    return event;
};

/**
 * 从rmmv编辑器的独立变量中获得存放物品的id
 * @param {*} varId 
 * @returns {number} itemId 物品ID
 */
PlantManager.getIdbyVarId = function (varId) {
    var itemId = $gameVariables.value(varId);
    _5M7.isDebugLog && console.log('存储的物品Id为：', itemId);
    return itemId;
};

PlantManager.insertPlant = function (plant) {
    var uniqueId = plant.getId();
    this._plantsMap[uniqueId] = plant;
    _5M7.isDebugLog && console.log('种植对象已插入全局：', PlantManager._plantsMap);
    var idParts = PlantManager.getSplitIdParts(uniqueId);
    PlantManager.openSelfSwitch(idParts.mapId, idParts.eventId, SELFSWITCH.A); // 种下种子后迅速切换到A事件页
};

PlantManager.totalSecsNow = function () {
    var totalSec = $gameSystem.totalSeconds(); // 使用封装方法
    return totalSec;
};

/**
 * 心跳函数更新种植物成长时间
 */
PlantManager.update = function () {
    var stampNow = PlantManager.totalSecsNow(); // 获取当前时间戳（单位：秒）
    for (var key in this._plantsMap) {
        this._plantsMap[key].update(stampNow);
    }
};

/** 为了处理地图刷新时事件精灵图显示问题 */
PlantManager.refresh = function (uniqueId) {
    var plant = PlantManager._plantsMap[uniqueId];
    if (!plant) return;

    // BUG WARNING: 重新获得当前地图事件页的引用指针！
    var event = PlantManager.getEventObj(uniqueId);
    if (!event) {
        // console.warn('未找到地图上的事件对象！', uniqueId);
        return;
    }
    // 重新设置对象引用指针
    plant.resetEventObj(event);

    var currentPhase = plant.getCurrentPhase();
    var shouldClear = plant._shouldClear;
    var imageName = null;
    var imageIndex = null;

    // 检查当前事件是否被清除
    if (shouldClear) {
        // console.warn('植物已被清除，恢复事件页图像', uniqueId);
        var page = event.page();
        if (!page) {
            console.warn('事件没有可用的事件页！', uniqueId);
            return;
        }
        imageName = page.image.characterName;
        imageIndex = page.image.characterIndex;
    } else {
        imageName = plant.getConfigByNextPhase(currentPhase, 'image');
        imageIndex = plant.getConfigByNextPhase(currentPhase, 'imageIndex');
    }

    // 检查空指针(底层会复数次调用)
    if (imageName != null && imageIndex != null) {
        PlantManager.delaySetImage(event, imageName, imageIndex);
    } else {
        // console.warn('imageName 或 imageIndex 不存在！', imageName, imageIndex, uniqueId);
    }
};


/** 确保当前事件页确实存在于当前地图上，兼容不同地图穿梭的情况 */
PlantManager.isEventValid = function (eventObj) {
    return (
        eventObj && // 事件对象存在
        $gameMap && // 当前地图已加载完毕
        $gameMap.event(eventObj._eventId) !== undefined // 事件确实存在于当前地图上
    )
}

/**
 * 重新设定事件页的精灵图
 * @param {Game_Event} eventObj - 事件对象
 * @param {string} imageName - 图像文件名（位于 img/characters/，无扩展名）
 * @param {number} imageIndex - 图像在图块中的索引（0-7）
 * @param {number} frame - 延迟帧数（默认1）
 */
PlantManager.delaySetImage = function (eventObj, imageName, imageIndex, delayFrames) {
    // console.warn('默认精灵图将被延迟替换！', eventObj._eventId, imageName, imageIndex);
    setTimeout(function () {
        eventObj.setImage(imageName, imageIndex)
    }, (delayFrames || 1) * 16); // 1帧约为16毫秒
};

/**
 *  操作事件页的独立开关
 */
PlantManager.openSelfSwitch = function (mapId, eventId, switchName) {
    $gameSelfSwitches.setValue([mapId, eventId, switchName], true);
    _5M7.isDebugLog && console.log('独立开关已触发：' + switchName);
};

PlantManager.closeSelfSwitch = function (mapId, eventId, switchName) {
    $gameSelfSwitches.setValue([mapId, eventId, switchName], false);
    _5M7.isDebugLog && console.log('独立开关已关闭：' + switchName);
};

/** 使事件页回到最初状态（种植交互入口） */
PlantManager.resetSelfSwitch = function (mapId, eventId) {
    // 1. 关闭所有独立开关
    ['A', 'B', 'C', 'D'].forEach(function (letter) {
        var key = [mapId, eventId, letter];
        $gameSelfSwitches.setValue(key, false);
    });

    var event = $gameMap.event(eventId);
    // 2.  强制事件重新计算当前页
    event.refresh();
};

PlantManager.itemLostAction = function (varId, isLost) {
    var itemId = this.getIdbyVarId(varId);
    // rmmv外部全局变量归零（防止重复事件触发）
    $gameVariables.setValue(varId, 0);
    // 获取物品对象
    var item = $dataItems[itemId];
    if (!item) throw new Error('请检查配置中前置物品消耗的检查函数是否正确！', itemId);

    if (isLost) {
        $gameParty.loseItem(item, 1); // 减少物品数量（消耗）
        _5M7.isDebugLog && console.log('已移除一个物品：', item.name);
    }
}

PlantManager.isMapHasEvent = function (eventObj) {
    var plant = this.findPlant(eventObj);
    if (!plant) return false;
    return true;
}

PlantManager.checkAndReturnPlantObj = function (eventObj) {
    var plant = this.findPlant(eventObj);
    if (!this.isMapHasEvent(eventObj)) {
        _5M7.isDebugLog && console.warn('未在当前地图找到种植物！');
        return;
    } else {
        return plant;
    }
}

PlantManager.saveToGameSystem = function () {
    $gameSystem._plantSystemMap = PlantManager._plantsMap;
    _5M7.isDebugLog && console.log('已保存植物系统数据到存档！', $gameSystem._plantSystemMap);
}

PlantManager.loadFromGameSystem = function () {
    _5M7.isDebugLog && console.log('从游戏系统加载或初始化植物系统数据！', $gameSystem._plantSystemMap);
    this._plantsMap = $gameSystem._plantSystemMap || {};
};

// ----------------------- 静态类工具函数 -------------------------------

/**
 * 显示多行文本消息（自动用换行符连接数组）
 * @param {Array<string>} lines 文本行数组
 */
function _showMultilineMessage(lines) {
    if (lines.length === 0) return;
    var text = lines.join("\n");
    $gameMessage.add(text); // 默认受消息系统队列控制
}

/**
 * 批量获得多种物品（支持概率）并分行显示提示
 * @param {Array} items 物品配置数组，格式：[{id: 数量, prob?: 概率}, ...] 或 [[id, 数量, 概率?], ...]
 * @param {boolean} showMessage 是否显示提示（默认true）
 * @param {string} defaultMessage 未获得物品时显示的默认提示（可选）
 * @returns {boolean} 是否全部获取成功
 */
function _gainCustomItems(items, showMessage, defaultMessage) {
    if (showMessage === undefined) showMessage = true;
    var success = true;
    var messageLines = []; // 存储所有提示信息
    var hasGainedAnyItem = false; // 标记是否获得至少一个物品

    // 统一输入格式为 [{id: x, quantity: y, prob?: z}]
    var normalizedItems = [];
    if (Array.isArray(items)) {
        items.forEach(function (item) {
            if (Array.isArray(item)) {
                normalizedItems.push({
                    id: item[0],
                    quantity: item[1],
                    prob: item[2] // 可选概率（数组第3位）
                });
            } else if (typeof item === 'object') {
                normalizedItems.push({
                    id: item.id,
                    quantity: item.quantity,
                    prob: item.prob // 可选概率
                });
            }
        });
    }

    // 处理每个物品
    normalizedItems.forEach(function (item) {
        var dataItem = $dataItems[item.id];
        if (!dataItem) {
            console.error("物品ID无效:", item.id);
            success = false;
            return;
        }

        // 如果 prob 存在，则按概率决定是否获得（默认100%）
        if (item.prob !== undefined && Math.random() >= item.prob) {
            return; // 概率未命中，跳过
        }

        $gameParty.gainItem(dataItem, item.quantity || 1);
        hasGainedAnyItem = true; // 标记已获得物品
        if (showMessage) {
            messageLines.push(`► 获得 ${dataItem.name} ×${item.quantity}`);
        }
    });

    // 显示合并后的消息
    if (showMessage) {
        if (hasGainedAnyItem) {
            _showMultilineMessage(messageLines); // 正常显示获得的物品
        } else if (defaultMessage) {
            _showMultilineMessage([defaultMessage]); // 显示默认提示
        }
    }
    return success;
}

/**
 * 向指定植物对象的所有 observe 阶段信息中，在 index 处插入或覆盖 message
 * @param {Game_Plant} plant - 植物对象
 * @param {number} index - 插入/替换的数组位置
 * @param {string} message - 要插入的消息文本
 */
function _insertMessageToObserve(plant, index, message) {
    var observeList = plant.getEventConfig().observe;
    if (!observeList || !observeList.length) return;

    for (var i = 0; i < observeList.length; i++) {
        var phaseMessages = observeList[i];

        if (Object.prototype.toString.call(phaseMessages) === '[object Array]') {
            if (index < 0) continue; // 忽略非法索引

            if (typeof phaseMessages[index] === 'undefined') {
                // 原位置不存在，直接插入信息
                phaseMessages[index] = message;
            } else if (phaseMessages[index] !== message) {
                // 信息不同，则覆盖
                phaseMessages[index] = message;
            } else {
                // 信息相同，不操作
                // console.log('跳过重复内容');
            }
        } else {
            console.error('phase message 格式非法，检查配置编写是否有误:', phaseMessages);
        }
    }
}

/**
 * 遍历修改 plant 对象的 harvest 配置中的 quantity 和 prob 字段
 * @example
 * // 使得所有种子物品的收获数量翻倍，概率降低一半
 * _modifyPlantHarvest(plant, function (quantity, prob) {
 *   return {
 *       quantity: quantity * 2,
 *       prob: prob * 0.5
 *   };
 *  });
 * 
 * // 仅修改特定id为6的收获配置
 * _modifyPlantHarvest(plant, function (quantity, prob, item) {
 *   if (item.id === 6) {
 *       return {
 *           quantity: quantity * 2,
 *           prob: prob * 0.5
 *       };
 *   }
 *   return null;
 *  });
 * @param {Game_Plant} plant - 植物对象
 * @param {Function} modifierFn - 修改器函数 (quantity, prob, item) => { quantity, prob }
 */
function _modifyPlantHarvest(plant, modifierFn) {
    if (!plant || typeof plant.getEventConfig !== 'function') {
        console.error('传入对象非法，检查代码配置！');
        return;
    }

    var config = plant.getEventConfig();
    var harvestList = config && config.harvest;
    if (!harvestList || !harvestList.length) {
        console.error('未找到有效的 harvest 配置，检查代码结构！');
        return;
    }

    for (var i = 0; i < harvestList.length; i++) {
        var item = harvestList[i];
        if (item && typeof item === 'object') {
            var result = modifierFn(item.quantity, item.prob, item);
            if (result && typeof result === 'object') {

                // quantity 处理为整数（四舍五入）
                if (typeof result.quantity === 'number') {
                    item.quantity = Math.round(result.quantity);
                }

                // prob 保留 4 位小数
                if (typeof result.prob === 'number') {
                    item.prob = Math.round(result.prob * 10000) / 10000;
                }
            }
        }
    }
}

/**
 * 使用指定倍率修改所有收获物的 quantity 和 prob（基于原始值，不叠加）
 * 会自动记录初始 harvest 数据，重复调用只以原始为基准
 * @param {Game_Plant} plant - 植物对象
 * @param {number} multiItem - 数量倍率（如 1.5）
 * @param {number} multiProb - 概率倍率（如 1.1）
 */
function _updateHarvestItems(plant, multiItem, multiProb) {
    if (!plant || typeof plant.getEventConfig !== 'function') return;

    var config = plant.getEventConfig();

    // 初始化原始数据挂载到对象上
    if (!plant._originalHarvest) {
        plant._originalHarvest = _deepClone(config.harvest);
    }

    var baseList = plant._originalHarvest;

    _modifyPlantHarvest(plant, function (quantity, prob, item) {
        // 在原始数据中查找对应项（以 id 匹配）
        for (var i = 0; i < baseList.length; i++) {
            var baseItem = baseList[i];
            if (baseItem.id === item.id) {
                return {
                    quantity: baseItem.quantity * multiItem,
                    prob: baseItem.prob * multiProb
                };
            }
        }
        return null; // 没有匹配项则不修改
    });
}
//#endregion 

//#region -------------------------- 外部调用函数 ----------
/**
 * 获取游戏画面触发逻辑的事件页对象 
 * 
 * 外部需要重新指定this -> PlantManager.run(this,varId)
 */
PlantManager.run = function (eventObj, varId) {
    var eventId = eventObj._eventId;           // 当前事件的 ID
    var mapId = $gameMap.mapId();              // 当前地图 ID
    var itemId = this.getIdbyVarId(varId);     // 当前物品ID
    this.itemLostAction(varId, true)

    // 初始化植物普通类
    var plant = new Game_Plant(eventId, mapId, itemId);
    this.insertPlant(plant);
};

/**
 * 检查变量id中是否是对应道具
 * @param {number} varId 变量ID
 * @param {Array} ITEM_LIST 物品ID列表
 * @returns {boolean}
 */
PlantManager.isPlantItem = function (varId, ITEM_LIST) {
    var itemId = this.getIdbyVarId(varId);
    return ITEM_LIST.includes(itemId);
};

/**
 * 检查物品栏是否有指定物品
 * @returns {boolean}
 */
PlantManager.hasItemInList = function (ITEM_LIST) {
    for (var i = 0; i < ITEM_LIST.length; i++) {
        var itemId = ITEM_LIST[i];
        var item = $dataItems[itemId];
        if (item && $gameParty.hasItem(item)) {
            return true;
        }
    }
    return false;
};

/** 
 * 收获函数，对应分支获得物品
 */
PlantManager.harvest = function (eventObj) {
    var plant = this.checkAndReturnPlantObj(eventObj);
    plant.uproot(); // 清除事件页和缓存
    var eventConfig = plant.getEventConfig(); // 获取事件配置
    _gainCustomItems(eventConfig.harvest, true, '可惜什么也没有收获到……')
}

/**
 * 铲除函数，除掉对应的植物事件
 */
PlantManager.uproot = function (eventObj) {
    var plant = this.checkAndReturnPlantObj(eventObj);
    plant.uproot(); // 清除事件页和缓存
    var eventConfig = plant.getEventConfig();// 获取事件配置
    _gainCustomItems(eventConfig.uproot, true, '可惜什么也没有收获到……')
}

/**
 * 观察函数，显示植物当前状态信息
 */
PlantManager.observe = function (eventObj) {
    var plant = this.checkAndReturnPlantObj(eventObj);
    var eventConfig = plant.getEventConfig(); // 获取事件配置
    var msgArr = eventConfig.observe; // 存储所有提示信息
    var currentPhase = plant.getCurrentPhase();
    if (!currentPhase) {
        console.error('当前植物已不存在！');
        return;
    }

    var currentPhaseToIndex = currentPhase - 1; // 注意索引减1！
    if (currentPhaseToIndex >= msgArr.length) {
        console.error('当前阶段大于最大阶段！');
        return;
    }
    _showMultilineMessage(msgArr[currentPhaseToIndex]); // 显示当前阶段的状态信息
}

PlantManager.water = function (eventObj, varId) {
    var plant = this.checkAndReturnPlantObj(eventObj);
    var itemId = this.getIdbyVarId(varId);

    this.itemLostAction(varId, false)
    plant.water(itemId); // 调用植物的水分处理函数
    _showMultilineMessage(['已成功给植物浇水！'])
}

PlantManager.fertilize = function (eventObj, varId) {
    var plant = this.checkAndReturnPlantObj(eventObj);
    var itemId = this.getIdbyVarId(varId);

    this.itemLostAction(varId, true)
    plant.fertilize(itemId); // 调用植物的施肥处理函数
    _showMultilineMessage(['已成功施肥！'])
}
//#endregion 

//#region ------------------------ 普通类 Game_Plant ---------------------------------------
// 初始化方法
function Game_Plant() {
    this.initialize.apply(this, arguments); // arguments自动顺序形参传递
}

Game_Plant.prototype.initialize = function (eventId, mapId, itemId) {
    _5M7.isDebugLog && console.log("Game_Plant 初始化开始", eventId, mapId, itemId);

    var uniqueId = PlantManager.genUniqueId(eventId, mapId); // 种子ID
    // 基础属性
    this._id = uniqueId
    this._itemId = itemId; // 种子对应的物品ID
    this._createTime = PlantManager.totalSecsNow(); // 种植时间（单位：秒）
    this._growTime = 0; // 成长时间（单位：秒）
    this._lastGrowTime = null; // 上一次成长时间（单位：秒）
    this._shouldClear = false; // 是否需要清除（即是否已被铲除）
    // 植物属性
    this._currentPhase = 0; // 当前成长阶段（null为死亡状态）
    this._plantConfig = this.deepCloneDefaultConfig(itemId); // 自定义植物属性配置
    // 事件属性
    this._crruentSwitch = ''; // 当前事件页
    this._event = PlantManager.getEventObj(uniqueId); // 事件对象
    this._eventConfig = this.deepCloneDefaultConfig(itemId, true); // 自定义事件配置
    this._harvestBuff = 0; // 增益buff计算，用于成长算法

    _5M7.isDebugLog && console.log('初始化完毕', this)
    var method = this.getPlantConfigMethod();
    PlantManager.growMethodSelector(method, this); // 初始化时调用一次成长算法
};

/**
 * 深拷贝自定义配置的种子配置，防止引用指针污染！
 * @param {number} itemId 对应的种子物品ID
 * @param {boolean} isEventConfig 是否为事件配置（默认false）
 */
Game_Plant.prototype.deepCloneDefaultConfig = function (itemId, isEventConfig) {
    if (!PLANT_CONFIG[itemId]) {
        _5M7.isDebugLog && console.warn(`未找到物品Id为 ${itemId} 的植物配置，已使用默认配置`);
        for (var key in PLANT_CONFIG) {
            if (PLANT_CONFIG.hasOwnProperty(key) && PLANT_CONFIG[key].isDefault) {
                return isEventConfig ? _deepClone(EVENT_CONFIG[key]) : _deepClone(PLANT_CONFIG[key]);
            }
        }
    }
    return isEventConfig ? _deepClone(EVENT_CONFIG[itemId]) : _deepClone(PLANT_CONFIG[itemId]);
};

// --------------- getter/setter ----------------------------------------
Game_Plant.prototype.setCurrentSwitch = function (switchCase) {
    if ([SELFSWITCH.A, SELFSWITCH.B, SELFSWITCH.C, SELFSWITCH.D].includes(switchCase)) {
        this._crruentSwitch = switchCase
    } else {
        this._crruentSwitch = '';
    }
}

Game_Plant.prototype.setCurrentPhase = function (phase) {
    this._currentPhase = phase;
}

Game_Plant.prototype.setPlantConfigFactor = function (key, value) {
    var factors = this.getPlantConfigFactors();
    if (factors.hasOwnProperty(key)) {
        factors[key] = value;
        this._plantConfig.factors = factors;
    } else {
        console.error(`factors未找到 ${key} 字段！`);
    }
}

Game_Plant.prototype.addPlantConfigFactor = function (key, value) {
    var factors = this.getPlantConfigFactors();
    if (factors.hasOwnProperty(key)) {
        factors[key] += value;
        this._plantConfig.factors = factors;
    } else {
        console.error(`factors未找到 ${key} 字段！`);
    }
}

Game_Plant.prototype.minusPlantConfigFactor = function (key, value) {
    var factors = this.getPlantConfigFactors();
    if (factors.hasOwnProperty(key)) {
        factors[key] -= value;
        this._plantConfig.factors = factors;
    } else {
        console.error(`factors未找到 ${key} 字段！`);
    }
}

Game_Plant.prototype.multiplyPlantConfigFactor = function (key, percent) {
    var factors = this.getPlantConfigFactors();
    if (factors.hasOwnProperty(key)) {
        factors[key] *= percent;
        this._plantConfig.factors = factors;
    } else {
        console.error('factors未找到 ' + key + ' 字段！');
    }
};

Game_Plant.prototype.resetEventObj = function (event) {
    this._event = event;
};

Game_Plant.prototype.multiplyPlantConfigPhaseTime = function (phase, percent) {
    var phaseTime = this.getConfigByNextPhase(phase, 'time');
    if (phaseTime === null) return; // 无效阶段，不进行操作
    phaseTime *= percent;
    this._plantConfig.phase[phase].time *= percent;
}

Game_Plant.prototype.addHarvestBuff = function (value) {
    if (isNaN(value)) return;
    this._harvestBuff += value;
}

Game_Plant.prototype.minusHarvestBuff = function (value) {
    if (isNaN(value)) return;
    this._harvestBuff -= value;
}


Game_Plant.prototype.getPhase = function () {
    return this._currentPhase;
}

Game_Plant.prototype.getId = function () {
    return this._id;
};

Game_Plant.prototype.getEvent = function () {
    return this._event;
};

Game_Plant.prototype.getItemId = function () {
    return this._itemId;
};

Game_Plant.prototype.getCurrentPhase = function () {
    return this._currentPhase;
};

Game_Plant.prototype.getPlantConfig = function () {
    return this._plantConfig;
};

Game_Plant.prototype.getPlantConfigFactors = function () {
    return this._plantConfig.factors;
}

Game_Plant.prototype.getPlantConfigMethod = function () {
    return this._plantConfig.method;
}

Game_Plant.prototype.getPhaseLenth = function () {
    return this._plantConfig.phase.length;
}

Game_Plant.prototype.getConfigByNextPhase = function (nextPhase, key) {
    if (!this._plantConfig.phase[nextPhase - 1]) return null; // 无效阶段，返回null
    return this._plantConfig.phase[nextPhase - 1][key]; // 注意索引减1！
};

Game_Plant.prototype.getEventConfig = function () {
    return this._eventConfig;
};

Game_Plant.prototype.getHarvestBuff = function () {
    return this._harvestBuff;
}
// ----------------------- 功能函数 ----------------------------------
/** 判断植物是否为生长阶段 */
Game_Plant.prototype.isGrowPhase = function () {
    return this._crruentSwitch === SELFSWITCH.A;
}
/** 判断植物是否为收获阶段 */
Game_Plant.prototype.isHarvestPhase = function () {
    return this._crruentSwitch === SELFSWITCH.B;
}

/** 判断植物是否为枯萎阶段 */
Game_Plant.prototype.isWitheredPhase = function () {
    return this._currentPhase === null; // TODO: 判断独立开关吗？
}

/** 对于已铲除的植物清除其缓存 */
Game_Plant.prototype.clear = function () {
    this._shouldClear = true; // 标记为需要清除
    var uniqueId = this.getId(); // 获取当前植物的唯一ID（与insertPlant一致）
    var eventObj = this.getEvent();

    if (PlantManager._plantsMap.hasOwnProperty(uniqueId)) {
        eventObj.refresh(); // 刷新事件页
        delete PlantManager._plantsMap[uniqueId]; // 直接从Map中删除键值对
        _5M7.isDebugLog && console.log(`种植物 ${uniqueId} 已清除缓存`, PlantManager._plantsMap);
    } else {
        console.error(`种植物 ${uniqueId} 缓存丢失！`);
    }
};

Game_Plant.prototype.update = function (stampNow) {
    this._growTime = stampNow - this._createTime; // 计算成长时间（单位：秒）
    // console.log(`种植物 ${this._id} 成长时间：${this.getRealGrowTime()}秒`);
    this.phaseGrowCheck(); // 成长阶段检查
};
/**
 * 返回转换时间流逝的成长描述（基于MOG_time_system插件参数）
 * @returns {number} 实际成长时间（单位：秒）
 */
Game_Plant.prototype.getRealGrowTime = function () {
    var MOG_TIME_SPEED = Moghunter.time_speed || 60; // 默认60帧（绑定MOG_time_system插件的流逝参数）
    // console.log(`游戏时间流动速度：${MOG_TIME_SPEED}帧/秒`);
    return Math.floor(this._growTime / MOG_TIME_SPEED);
};

// -------------------------- 操作函数 ---------------------------------------
/** 心跳函数调用的实际函数 */
Game_Plant.prototype.phaseGrowCheck = function () {
    // if (!PlantManager.isEventValid(this.getEvent())) return; // 当前地图不存在该事件
    if (!this.getPlantConfig()) return; // 无效配置，不进行操作
    if (this._currentPhase === null) return; // 已清除，不进行操作
    if (this._lastGrowTime === null) {
        this._lastGrowTime = this.getRealGrowTime(); // 初始化上一次秒数差
    }

    var nextPhase = this._currentPhase + 1; // 下一阶段
    var nextPhaseTime = this.getConfigByNextPhase(nextPhase, 'time');
    if (nextPhaseTime === null) return; // 无效阶段，不进行操作

    var method = this.getPlantConfigMethod();
    var currentTime = this.getRealGrowTime(); // 当前时间（秒）

    // 确保转换后每秒调用一次（防抖）
    if (currentTime > this._lastGrowTime && this.isGrowPhase()) { // 收获和枯萎阶段不再调用算法。
        PlantManager.growMethodSelector(method, this); // 调用成长算法。
        this._lastGrowTime = currentTime; // 更新记录的时间用于下一秒调用
    }

    // 成长阶段切换事件独立开关逻辑
    if (currentTime >= nextPhaseTime && this._currentPhase !== nextPhase) {
        this.phaseChange(nextPhase);
    }
}

Game_Plant.prototype.phaseChange = function (nextphase) {
    // 避免重复进入同一阶段
    if (this._currentPhase === nextphase) return;
    _5M7.isDebugLog && console.log(`种植物 ${this._id} 已进入第 ${nextphase} 阶段`);

    this.setCurrentPhase(nextphase); // 设置当前阶段
    var imageName = this.getConfigByNextPhase(nextphase, 'image');
    var switchCase = this.getConfigByNextPhase(nextphase, 'eventSwitch');
    var imageIndex = this.getConfigByNextPhase(nextphase, 'imageIndex');
    this.phaseChangeAction(imageName, imageIndex, switchCase); // 阶段切换动作
};

Game_Plant.prototype.phaseChangeAction = function (imageName, imageIndex, switchCase) {
    _5M7.isDebugLog && console.log(`种植物 ${this._id} 阶段 ${this._currentPhase} 图片：${imageName} 位置：${imageIndex} 事件页：${switchCase}`);
    var idParts = PlantManager.getSplitIdParts(this.getId());
    // 事件页独立开关切换（此处自动调用了refresh切换精灵图）
    PlantManager.openSelfSwitch(idParts.mapId, idParts.eventId, switchCase);
    this.setCurrentSwitch(switchCase); // 设置当前事件页
}

Game_Plant.prototype.withered = function () {
    _5M7.isDebugLog && console.log(`种植物 ${this._id} 已枯死`);
    this._currentPhase = null; // 标记为枯死状态
    var nextPhase = this.getPhaseLenth() // 返回最后一阶段
    this.phaseChange(nextPhase); // 进入最后一阶段
}

Game_Plant.prototype.uproot = function () {
    _5M7.isDebugLog && console.log(`种植物 ${this._id} 已铲除`);
    var idParts = PlantManager.getSplitIdParts(this.getId());
    PlantManager.resetSelfSwitch(idParts.mapId, idParts.eventId); // 铲除后关闭事件页
    this.clear(); // 清除该对象
}

Game_Plant.prototype.water = function (itemId) {
    _5M7.isDebugLog && console.log(`浇水前。种植物 ${this._id} 水分：${this.getPlantConfigFactors().water}`);
    var eventConfig = this.getEventConfig()
    if (eventConfig.water.length > 0) {
        var arr = eventConfig.water;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].id === itemId) {
                this.addPlantConfigFactor('water', arr[i].buff);
            }
        }
    } else {
        console.error('没有正确配置water参数！检查代码！')
    }
    _5M7.isDebugLog && console.log(`已浇水。种植物 ${this._id} 水分：${this.getPlantConfigFactors().water}`);
}

Game_Plant.prototype.fertilize = function (itemId) {
    _5M7.isDebugLog && console.log(`施肥前。种植物 ${this._id} 施肥量：${this.getPlantConfigFactors().fertilize}`);
    var eventConfig = this.getEventConfig()
    if (eventConfig.fertilize.length > 0) {
        var arr = eventConfig.fertilize;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i].id === itemId) {
                this.addPlantConfigFactor('fertilize', arr[i].buff);
            }
        }
    } else {
        console.error('没有正确配置fertilizer参数！检查代码！')
    }
    _5M7.isDebugLog && console.log(`已施肥。种植物 ${this._id} 施肥量：${this.getPlantConfigFactors().fertilize}`);
}
//#endregion

//#region ------------------------ 自启动函数类（debug模式使用） ----------------
_5M7.isCheckConfig && PlantManager.validateConfig()
_5M7.isCheckConfig && PlantManager.validateEventConfig()
mogTimeSystemCheck(); // 此检查必须存在！
//#endregion