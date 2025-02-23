/*:
 * @plugindesc 此插件用于手动下载任务系统的 Quests.txt 配置文件
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * @help
 * 
 * 在游戏启动的标题画面会出现对应选项，点击自动下载txt文件。
 * 
 * 元数据在 questList 对象内配置所有任务消息，生成的 txt 配置文件必须搭配 Galv_QuestLog.js 插件使用。
 * 
 * 被依赖的插件来源：https://galvs-scripts.com/2016/11/11/mv-quest-log/
 * 
 * 需注意应在正式打包工程文件时，删去本插件。
 */

(function () {
    // ---------------- 任务列表的配置信息 -------------------------
    const questList = [
        {
            id: 1,
            questName: "questtest_1",
            difficulty: "1",
            category: "0",
            des: "第一段描述\n第二段描述，第二段描述\n第三段描述",
            qstObjs: ["obj1", "obj2", "obj3"],
            resText: ["text1", "text2", "text3"],
            reward: `\\i[176]药水x1`
        },
        {
            id: 2,
            questName: "questtest_2",
            difficulty: "3",
            category: "1",
            des: "第一段描述\n第二段描述，第二段描述\n第三段描述",
            qstObjs: ["obj1", "obj2", "obj3"],
            resText: ["text1", "text2", "text3"],
            reward: `\\i[176]神秘道具`
        },
        {
            id: 3,
            questName: "questtest_3",
            difficulty: "3",
            category: "2",
            des: "击杀城里的恐怖的存在",
            qstObjs: ["击杀 君临天下的暴虐"],
            resText: ["目标已被击杀，请返回国王处领取奖励"],
            reward: `\\i[297]弑天杀刃`
        },
    ];
   
    const rewardsTitle = `\n\\c[16]任务奖励: \n`;
     // ------------------------------------------------------------------------

    // 生成 Quests.txt 文件内容
    function generateQuestFile() {
        let content = "";
        questList.forEach(quest => {
            const objectives = quest.qstObjs.join(","); // 任务目标
            const resolutions = quest.resText.join(","); // 任务完成文本

            content += `<quest ${quest.id}:${quest.questName}|${quest.difficulty}|${quest.category}>
`;
            content += `${objectives}
`;
            content += `${resolutions}
`;
            content += quest.des + "\n";
            content += `${rewardsTitle}${quest.reward}\n`;
            content += `</quest>
`;
        });
        return content;
    }

    // 下载 Quests.txt 文件
    function downloadQuestFile() {
        const content = generateQuestFile();
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Quests.txt";

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    // ---------------- 修改标题菜单，添加下载选项 ------------------------

    // 扩展标题命令窗口，添加 "下载txt任务配置" 选项
    const _Window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function () {
        _Window_TitleCommand_makeCommandList.call(this);
        this.addCommand("下载txt任务配置", "downloadQuestFile"); // 添加菜单选项
    };

    // 监听标题菜单的命令选择
    const _Scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _Scene_Title_createCommandWindow.call(this);
        this._commandWindow.setHandler("downloadQuestFile", () => {
            this._commandWindow.close(); // 关闭菜单
            downloadQuestFile(); // 触发下载
        });
    };

})();
