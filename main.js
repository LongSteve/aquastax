'use strict';

/* global gResources, SplashScene, MenuScene */

cc.game.onStart = function () {
   if (!cc.sys.isNative && document.getElementById ('cocosLoading')) {
       //If referenced loading.js, please remove it
      document.body.removeChild (document.getElementById ('cocosLoading'));
   }

   // Adjust viewport meta
   cc.view.adjustViewPort (true);

   // Setup the resolution policy and design resolution size
   cc.view.setDesignResolutionSize (1920, 1080, cc.ResolutionPolicy.SHOW_ALL);

   // The game will be resized when browser size change
   cc.view.resizeWithBrowserSize (true);

   //load resources
   cc.LoaderScene.preload (gResources, function () {
         var menuScene = new MenuScene ();
         //var transitionScene = new cc.TransitionFadeUp (0.2, splashScene, cc.color (255,255,255,255));
         cc.director.runScene (menuScene);
      }, this);
};
cc.game.run ();
