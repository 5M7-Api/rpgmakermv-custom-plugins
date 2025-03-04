/*:
 * @plugindesc 用于在标题画面出现前播放webm/mp4影片，可跳过。可以搭配CustomLogo_5M7.js使用————先展示Logo，再播放影片。
 * @author 5M7_Api
 * @link https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * 
 * @help
 * 需注意如果是在移动设备的情况下，只能播放mp4格式的视频，建议放入两种格式的同名文件来适配不同设备。
 * 
 * 依赖插件的链接：https://github.com/5M7-Api/rpgmakermv-custom-plugins
 * 
 * @param videoFileName
 * @text 视频文件名
 * @desc 需要播放于标题画面前的影片的文件名，格式限定为webm/mp4。
 * @type string
 * @default IntroVideo
 * 
 * @param fadeOutTime
 * @text 渐出帧数
 * @desc 影片结束后跳转的等待帧数。
 * @type number
 * @default 60
 * 
 * 
 * @param useWithCL
 * @text 是否搭配CustomLogo_5M7.js
 * @desc 搭配CustomLogo_5M7.js使用实现先后顺序展示。
 * @type boolean
 * @default false
 */
(function () {
  var PLUGIN_NAME = "IntroVideo_5M7";
  var CL_NAME = "CustomLogo_5M7";
  var IntroVideo = {};

  IntroVideo.Parameters = PluginManager.parameters(PLUGIN_NAME);
  IntroVideo.VideoFile = String(
    IntroVideo.Parameters["videoFileName"] || "IntroVideo"
  );
  IntroVideo.FadeOutTime =
    Number(IntroVideo.Parameters["fadeOutTime"]) || 60;
  IntroVideo.useWithCL = IntroVideo.Parameters["useWithCL"] == "true";
  //-----------------------------------------------------------------------------
  // Scene_IntroVideo
  //
  // 用于播放引导视频的场景
  function Scene_IntroVideo() {
    this.initialize.apply(this, arguments);
  }

  Scene_IntroVideo.prototype = Object.create(Scene_Base.prototype);
  Scene_IntroVideo.prototype.constructor = Scene_IntroVideo;

  Scene_IntroVideo.prototype.initialize = function () {
    Scene_Base.prototype.initialize.call(this);
  };

  Scene_IntroVideo.prototype.create = function () {
    Scene_Base.prototype.create.call(this);
    this.playIntroVideo();
  };

  Scene_IntroVideo.prototype.videoFileExt = function () {
    if (Graphics.canPlayVideoType('video/webm') && !Utils.isMobileDevice()) {
      return '.webm';
    } else {
      return '.mp4';
    }
  };
  /**
   * 报错修复！
   * 
   * Uncaught (in promise) DOMException: The play() request was interrupted by a new load request.
   */
  Scene_IntroVideo.prototype.playIntroVideo = function () {
    var ext = this.videoFileExt();
    var src = "movies/" + IntroVideo.VideoFile + ext;
    // 播放指定的视频
    Graphics.playVideo(src);

    // 监听视频播放结束
    Graphics._video.onended = this.onVideoEnd.bind(this);
  };

  Scene_IntroVideo.prototype.update = function () {
    Scene_Base.prototype.update.call(this);

    // 监听按键跳过视频
    var isInputSkiped = Input.isTriggered("ok") ||
      Input.isTriggered("cancel") ||
      TouchInput.isTriggered() ||
      TouchInput.isCancelled();

    if (isInputSkiped) {
      this.skipVideo();
    }
  };

  Scene_IntroVideo.prototype.skipVideo = function () {
    if (Graphics._video) {
      Graphics._video.pause();
    }

    this.onVideoEnd();
  };

  Scene_IntroVideo.prototype.onVideoEnd = function () {
    Graphics._onVideoEnd(); // 屏蔽video元素的实际函数

    // 先淡出，再进入标题画面
    this.startFadeOut(IntroVideo.FadeOutTime, false);
    SceneManager.goto(Scene_Title);
  };

  //-----------------------------------------------------------------------------
  if (IntroVideo.useWithCL) {
    // 检查开启插件配合时，CustomLogo_5M7插件是否有正常加载
    if (IntroVideo.useWithCL && !PluginManager._scripts.includes(CL_NAME)) console.error(`${CL_NAME}.js插件没有被正常加载！`);
    Scene_Boot.prototype.gotoIntroScene = function () {
      SceneManager.goto(Scene_IntroVideo); // 跳转至视频播放操作
    };
  } else {
    // 让游戏在启动时进入 Scene_IntroVideo
    var gotoIntroVideoScene = function () {
      SceneManager.goto(Scene_IntroVideo);
    };

    var _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function () {
      _Scene_Boot_start.call(this);
      SoundManager.preloadImportantSounds();
      if (DataManager.isBattleTest()) {
        DataManager.setupBattleTest();
        SceneManager.goto(Scene_Battle);
      } else if (DataManager.isEventTest()) {
        DataManager.setupEventTest();
        SceneManager.goto(Scene_Map);
      } else {
        this.checkPlayerLocation();
        DataManager.setupNewGame();
        gotoIntroVideoScene.call(this);
      }
      this.updateDocumentTitle();
    };
  }
})();
