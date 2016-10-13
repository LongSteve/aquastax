'use strict';

var SplashLayer = cc.Layer.extend ({

   // logo images
   logo1: null,
   logo2: null,

   // Current splash logo state
   state: 0,

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var bg = new cc.LayerColor (cc.color (255,255,255,255), cc.winSize.width, cc.winSize.height);
      bg.x = 0;
      bg.y = 0;
      self.addChild (bg, 0);

      self.logo1 = new cc.Sprite (aq.res.OriginalLogo);
      self.logo1.x = cc.winSize.width / 2;
      self.logo1.y = cc.winSize.height / 2;
      self.logo1.setScale(aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR);
      self.addChild (self.logo1, 1);

      self.logo2 = new cc.Sprite (aq.res.AquaStaxLogo);
      self.logo2.setVisible (false);
      self.logo2.x = cc.winSize.width / 2;
      self.logo2.y = cc.winSize.height * 1.5;
      self.logo2.setScale (aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR);
      self.addChild (self.logo2, 2);

      self.schedule (function () {
         self.updateLogos ();
      }, 3.0, 2);

      return true;
   },

   updateLogos: function () {
       var self = this;

       if (self.state === 0) {

          self.logo2.setVisible (true);

          var moveAction = cc.moveTo (2.0, cc.winSize.width / 2, cc.winSize.height / 2);
          moveAction.easing (cc.easeBounceOut ());
          self.logo2.runAction (moveAction);

          var fadeAction = cc.fadeOut (0.5);
          self.logo1.runAction (fadeAction);

          self.state++;

       } else if (self.state === 1) {

          var menuScene = new aq.scenes.MenuScene ();
          var transition = new cc.TransitionFadeUp (0.2, menuScene);
          cc.director.runScene (transition);
       }
   },

   freeResources: function () {
       cc.textureCache.removeTextureForKey (aq.res.OriginalLogo);
       cc.textureCache.removeTextureForKey (aq.res.AquaStaxLogo);
   }
});

aq.scenes.SplashScene = cc.Scene.extend ( {
   layer: null,

   onEnter: function () {
      this._super ();
      this.layer = new SplashLayer ();
      this.addChild (this.layer);
   },

   onExit: function () {
       this._super ();
       this.layer.freeResources ();
   }
});
