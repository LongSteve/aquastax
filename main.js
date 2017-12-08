'use strict';

cc.game.onStart = function () {
   if (!cc.sys.isNative && document.getElementById ('cocosLoading')) {
       //If referenced loading.js, please remove it
      document.body.removeChild (document.getElementById ('cocosLoading'));
   }

   // Adjust viewport meta
   cc.view.adjustViewPort (true);

   // Disable the retina display support, setting the DevicePixelRatio to 1.0 to avoid the unusual
   // slowdown in Chrome when running at 2.0 ratio.
   // TODO: See if this can be set dynamically while the game is running, and add an option for it
   cc.view.enableRetina (cc.game.config.retina);

   // Setup the resolution policy and design resolution size
   cc.view.setDesignResolutionSize (aq.config.DESIGN_WIDTH, aq.config.DESIGN_HEIGHT, cc.ResolutionPolicy.SHOW_ALL);

   // The game will be resized when browser size change
   cc.view.resizeWithBrowserSize (true);

   // Load resources
   cc.LoaderScene.preload (aq.load, function () {

      // Run the main Gumbler sprite setup routine (must be done after the resource load)
      aq.spritey.gumbler ();

      var toScene;
      if (aq.config.SHOW_SPLASH_SCREENS) {
         toScene = new cc.TransitionFadeUp (
            0.2,                                // time
            new aq.scenes.SplashScene (),       // scene to transition into
            cc.color (255,255,255,255)          // fade up from white
         );
      } else {
         //toScene = new aq.scenes.GameScene ();
         toScene = new aq.scenes.SpriteTestScene ();
      }

      cc.director.runScene (toScene);
   }, this);
};

cc.game.run ();
