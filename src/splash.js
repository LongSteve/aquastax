'use strict';

/* global res */

var SplashLayer = cc.Layer.extend ( {

   // buttons
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

      self.logo1 = new cc.Sprite (res.OriginalLogo);
      self.logo1.x = cc.winSize.width / 2;
      self.logo1.y = cc.winSize.height / 2;
      self.logo1.setScale(3.0, 3.0);
      self.addChild (self.logo1, 1);

      self.logo2 = new cc.Sprite (res.AquaStaxLogo);
      self.logo2.setVisible (false);
      self.logo2.x = cc.winSize.width / 2;
      self.logo2.y = cc.winSize.height / 2;
      self.logo2.setScale (3.0, 3.0);
      self.addChild (self.logo2, 2);

      cc.director.getScheduler().scheduleCallbackForTarget (self, self.updateLogos, 3.0, 2, 0, false);

      return true;
   },

   updateLogos: function () {
       var self = this;

       if (self.state === 0) {
          self.logo2.setVisible (true);
          self.logo1.setVisible (false);
          self.state++;
       } else if (self.state === 1) {
          self.logo2.setVisible (false);
          cc.director.getScheduler ().unscheduleAllCallbacksForTarget (self);
          cc.log ('Transition to main menu');
       }
   }
});

/* exported SplashScene */
var SplashScene = cc.Scene.extend ( {
   onEnter: function () {
      this._super ();
      var layer = new SplashLayer ();
      this.addChild (layer);
   }
});

