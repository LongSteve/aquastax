'use strict';

var MenuLayer = cc.Layer.extend ({

   // panels
   tmpPanel:null,
   menuPanel:null,

   // labels
   winSize: null,
   canvasSize: null,
   frameSize:null,

   // buttons
   fullScreenButton:null,

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var tmp = cc.winSize;
      self.winSize = new cc.LabelTTF ('winSize: ' + tmp.width + ' x ' + tmp.height, 'Arial', 38);
      self.winSize.setAnchorPoint (0, 0);

      // position the label on the center of the screen
      self.winSize.x = 20;
      self.winSize.y = 20;

      // add the label as a child to this layer
      self.addChild (self.winSize, 5);

      tmp = cc.view.getCanvasSize ();
      self.canvasSize = new cc.LabelTTF ('canvasSize: ' + tmp.width + ' x ' + tmp.height, 'Arial', 38);
      self.canvasSize.setAnchorPoint (0, 0);
      self.canvasSize.x = 20;
      self.canvasSize.y = 70;
      self.addChild (self.canvasSize, 5);

      tmp = cc.view.getFrameSize ();
      self.frameSize = new cc.LabelTTF ('frameSize: ' + tmp.width + ' x ' + tmp.height, 'Arial', 38);
      self.frameSize.setAnchorPoint (0, 0);
      self.frameSize.x = 20;
      self.frameSize.y = 120;
      self.addChild (self.frameSize, 5);

      self.menuPanel = new cc.LayerColor (cc.color (64,64,0,128), cc.winSize.width / 2, cc.winSize.height);
      self.menuPanel.x = cc.winSize.width / 4;
      self.menuPanel.y = cc.winSize.height / 4;
      self.menuPanel.height = cc.winSize.height / 2;
      self.addChild (self.menuPanel, 0);

      self.fullScreenButton = new cc.MenuItemLabel (new cc.LabelTTF ('Enter Fullscreen', 'Arial', 48), 'onFullscreenButton', self);
      self.fullScreenButton.setColor (cc.color (0,255,0,255));

      var menu = new cc.Menu (self.fullScreenButton);
      menu.alignItemsVertically (10);
      menu.setAnchorPoint (0.5, 0.5);
      menu.x = self.menuPanel.getContentSize ().width / 2;
      menu.y = self.menuPanel.getContentSize ().height / 2;
      self.menuPanel.addChild (menu);

      var w = 240 * aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR;
      var h = 320 * aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR;

      var screenPanel = new cc.LayerColor (cc.color (128,0,0,128), w, h);
      screenPanel.x = (cc.winSize.width - w) / 2;
      screenPanel.y = (cc.winSize.height - h) / 2;

      var gumbler = new cc.Sprite (aq.res.Gumbler);
      gumbler.setAnchorPoint (0.5, 0);
      gumbler.setScale (aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR);
      gumbler.x = w / 2;
      screenPanel.addChild (gumbler);

      self.addChild (screenPanel, 10);

      var drawNode = new cc.DrawNode ();

      var block_size = 50;
      var grid_width = 14;

      var drawTri = function (x, y, type) {
         var triangle;
         switch (type) {
         case 0:
            triangle = [
               cc.p (x, y),                  // bottom left    |\
               cc.p (x, y + block_size),     // top left       | \
               cc.p (x + block_size, y)      // bottom right   |__\
            ];
            break;
         case 1:
            triangle = [
               cc.p (x, y),                                 // bottom left    |--/
               cc.p (x, y + block_size),                    // top left       | /
               cc.p (x + block_size, y + block_size)        // bottom right   |/
            ];
            break;
         case 2:
            triangle = [
               cc.p (x, y + block_size),                       // bottom left    \--|
               cc.p (x + block_size, y + block_size),          // top left        \ |
               cc.p (x + block_size, y)                        // bottom right     \|
            ];
            break;
         case 3:
            triangle = [
               cc.p (x, y),                                    // bottom left      /|
               cc.p (x + block_size, y + block_size),          // top left        / |
               cc.p (x + block_size, y)                        // bottom right   /__|
            ];
            break;
         }

         drawNode.drawPoly (triangle, cc.color (0,0,255,128), 4, cc.color (255,255,255,255));
      };

      var border = Math.floor ((screenPanel.width - (block_size * grid_width)) * 0.5);

      //drawNode.setRotation (90);    // positive rotation is clockwise

      //drawTri (0, 0, 0);
      //drawTri (0, 0, 1);
      //drawTri (0, 0, 2);

      for (var t = 0; t < 14; t++) {
         drawTri (border + (t * block_size), 0, 3);
         drawTri (border + (t * block_size), 0, 1);

         drawTri (border + (t * block_size), block_size, 3);
         drawTri (border + (t * block_size), block_size, 1);
      }

      //drawNode.x = 0;
      //drawNode.y = 0;
      screenPanel.addChild (drawNode, 0);

      cc.view.setResizeCallback (function () {
         self.updateSizeLabels ();
      });

      return true;
   },

   onFullscreenButton: function () {
       if (cc.screen.fullScreen ()) {
          cc.screen.exitFullScreen ();
       } else {
          var self = this;
          cc.screen.requestFullScreen (document.documentElement, function onFullscreenCallback () {
             if (cc.screen.fullScreen ()) {
                self.fullScreenButton.setString ('Exit Fullscreen');
             } else {
                self.fullScreenButton.setString ('Enter Fullscreen');
             }
          });
       }
   },

   updateSizeLabels: function () {
       var tmp = cc.winSize;
       this.winSize.setString ('winSize: ' + tmp.width + ' x ' + tmp.height);
       tmp = cc.view.getCanvasSize ();
       this.canvasSize.setString ('canvasSize: ' + tmp.width + ' x ' + tmp.height);
       tmp = cc.view.getFrameSize ();
       this.frameSize.setString ('frameSize: ' + tmp.width + ' x ' + tmp.height);
   }
});

aq.scenes.MenuScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new MenuLayer ();
      this.addChild (layer);
   }
});

