/*:
 * @plugindesc 敌群中特定敌人位置调整插件
 * @author 5M7-Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 *
 * @help
 * 
 * 在对应敌人备注中添加 <X:数值> <Y:数值> <Z:数值>，战斗时自动调整敌人的位置与层级顺序。
 * 
 * Z的数值大小代表图像的覆盖顺序，越大的Z值的图像在越上面。
 * 
 * 需注意数值只能填数字。
 * 
 */

(function () {
    var _Spriteset_Battle_createEnemies = Spriteset_Battle.prototype.createEnemies;

    Spriteset_Battle.prototype.createEnemies = function () {
        _Spriteset_Battle_createEnemies.call(this);

        // 延迟一帧，确保所有精灵创建完成
        requestAnimationFrame(() => {
            this._enemySprites.forEach(sprite => {
                var enemy = sprite._battler;
                if (enemy && enemy.isEnemy()) {
                    var note = enemy.enemy().note;
                    var x = this.getNoteTagNumber(note, 'X');
                    var y = this.getNoteTagNumber(note, 'Y');
                    var z = this.getNoteTagNumber(note, 'Z');

                    if (x !== null) sprite._homeX = x;
                    if (y !== null) sprite._homeY = y;
                    if (z !== null) sprite.z = z;

                    // if (x !== null || y !== null || z !== null) {
                    //     console.log(`✔️调整敌人(ID:${enemy.enemyId()}) → _homeX:${sprite._homeX}, _homeY:${sprite._homeY}, z:${sprite.z}`);
                    // }
                }
            });

            // 按z值进行覆盖排序，删除原有精灵，重新添加
            this._enemySprites.sort((a, b) => {
                return (a.z || 0) - (b.z || 0);
            });
            this._enemySprites.forEach(sprite => {
                this._battleField.removeChild(sprite);
            });
            this._enemySprites.forEach(sprite => {
                this._battleField.addChild(sprite);
            });
        });
    };

    // 小工具函数：读取备注中的数字
    Spriteset_Battle.prototype.getNoteTagNumber = function (note, tag) {
        var regex = new RegExp('<' + tag + ':[ ]*(\\d+)>', 'i');
        var match = note.match(regex);
        return match ? Number(match[1]) : null;
    };
})();
