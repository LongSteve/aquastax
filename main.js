'use strict';

/* global gResources, SplashScene */

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
         var splashScene = new SplashScene ();
         cc.director.runScene (splashScene);
      }, this);
};
cc.game.run ();
