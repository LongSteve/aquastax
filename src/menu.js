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

   // grid
   grid:null,

   // blocks
   drawNode:null,

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

      var block_size = aq.config.BLOCK_SIZE;
      var grid_width = aq.config.GRID_WIDTH;
      var border = Math.floor ((screenPanel.width - (block_size * grid_width)) * 0.5);

      var grid_height_pixels = screenPanel.height;
      var grid_height = Math.floor (grid_height_pixels / block_size);

      var grid_middle = grid_width / 2;

      self.addChild (screenPanel, 10);

      self.grid = new cc.DrawNode ();

      var drawGrid = function () {
         for (var x = 0; x <= grid_width * block_size; x += block_size) {

            var p1 = cc.p (border + x,0);
            var p2 = cc.p (border + x, (grid_height * block_size));
            self.grid.drawSegment (p1, p2, 1, cc.color.white);
         }

         for (var y = 0; y <= grid_height * block_size; y += block_size) {

            var p1 = cc.p (border, y);
            var p2 = cc.p (border + (grid_width * block_size), y);
            self.grid.drawSegment (p1, p2, 1, cc.color.white);
         }
      };

      drawGrid ();

      screenPanel.addChild (self.grid);

      self.drawNode = new cc.DrawNode ();

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

         self.drawNode.drawPoly (triangle, cc.color (0,0,255,128), 4, cc.color (255,255,255,255));
      };

      var drawBlock = function (x, y) {
         drawTri (x, y, 3);
         drawTri (x, y, 1);
      };

      drawBlock (border, 0);

      self.drawNode.setPosition (0, 0);

      screenPanel.addChild (self.drawNode, 0);

      self.scheduleUpdate ();

      cc.view.setResizeCallback (function () {
         self.updateSizeLabels ();
      });

      cc.eventManager.addListener ({
         event: cc.EventListener.KEYBOARD,
         onKeyPressed: function (keyCode, event) {
            self.keyPressed (keyCode);
         },
         onKeyReleased: function (keyCode, event){
            self.keyReleased (keyCode);
         }
      }, self);

      return true;
   },

   // array of keys pressed
   keysPressed: [],

   // delta x and y for block movement
   dx:0,
   dy:0,

   keyPressed: function (keyCode) {
      var self = this;
      self.keysPressed [keyCode] = true;
   },

   keyReleased: function (keyCode) {
      var self = this;
      self.keysPressed [keyCode] = false;
   },

   clearKeys: function () {
      var self = this;
      self.keysPressed [cc.KEY.up] = false;
      self.keysPressed [cc.KEY.down] = false;
      self.keysPressed [cc.KEY.left] = false;
      self.keysPressed [cc.KEY.right] = false;
   },

   update: function () {
       var self = this;

       if (self.keysPressed [cc.KEY.up]) {
          self.dy = aq.config.BLOCK_SIZE;
       } else if (self.keysPressed [cc.KEY.down]) {
          self.dy = -aq.config.BLOCK_SIZE;
       } else {
          self.dy = 0;
       }

       if (self.keysPressed [cc.KEY.left]) {
          self.dx = -aq.config.BLOCK_SIZE;
       } else if (self.keysPressed [cc.KEY.right]) {
          self.dx = aq.config.BLOCK_SIZE;
       } else {
          self.dx = 0;
       }

       var p = self.drawNode.getPosition ();
       p.x += self.dx;
       p.y += self.dy;
       self.drawNode.setPosition (p);

       self.clearKeys ();
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

