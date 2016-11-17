'use strict';

var GameLayer = cc.Layer.extend ({

   // panels
   gamePanel: null,

   // grid
   grid: null,

   // blocks
   block: null,

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var w = block_size * blocks_wide;
      var h = cc.winSize.height;

      var gamePanel = new cc.LayerColor (cc.color (128,0,0,128), w, h);
      gamePanel.x = (cc.winSize.width - w) / 2;
      gamePanel.y = 0;

      var blocks_high = Math.ceil (h / block_size);

      self.addChild (gamePanel, 0);

      self.grid = new aq.Grid (blocks_wide, blocks_high);
      gamePanel.addChild (self.grid, 2);

      self.block = new aq.Block (5);
      self.block.setPosition (w / 2, h);
      gamePanel.addChild (self.block, 3);

      self.gamePanel = gamePanel;

      cc.eventManager.addListener ({
         event: cc.EventListener.KEYBOARD,
         onKeyPressed: function (keyCode) {
            self.keyPressed (keyCode);
         },
         onKeyReleased: function (keyCode){
            self.keyReleased (keyCode);
         }
      }, self);

      self.scheduleUpdate ();
   },

   // array of keys pressed
   keysPressed: [],

   // delta x and y for block movement
   dx:0,
   dy:0,

   // block is dropping fast
   fastDrop: false,

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
      self.keysPressed [cc.KEY.space] = false;
   },

   update: function () {
       var self = this;

       // Drop the block down quickly
       if (self.keysPressed [cc.KEY.down]) {
          self.fastDrop = true;
       } else {
          self.fastDrop = false;
       }

       // Move left or right
       if (self.keysPressed [cc.KEY.left]) {
          self.dx = -1;
       } else if (self.keysPressed [cc.KEY.right]) {
          self.dx = 1;
       } else {
          self.dx = 0;
       }

       // Let the keyboard repeat rate handle holding down a key
       if (Math.abs (self.dx) === 1) {
          self.keysPressed [cc.KEY.left] = false;
          self.keysPressed [cc.KEY.right] = false;
       }

       // Rotate the block through 90 degrees
       if (self.keysPressed [cc.KEY.up]) {
          self.block.rotate ();
          self.keysPressed [cc.KEY.up] = false;
       }

       if (self.keysPressed[cc.KEY.space]) {
          self.grid.collideBlock (self.block);
          self.newBlock ();
          self.keysPressed[cc.KEY.space] = false;
       }

       var dy = -aq.config.BLOCK_SIZE / 60;

       if (self.fastDrop) {
          dy *= 20;
       }

       self.moveBlockBy (self.dx * aq.config.BLOCK_SIZE, dy);
   },

   moveBlockBy: function (x, y) {
      var self = this;
      var p = self.block.getPosition ();
      p.x += x;
      p.y += y;

      // Prevent drop off the bottom of the screen
      if (p.y < 0) {
         p.y = 0;
      }

      self.block.setPosition (p);
   },

   newBlock: function () {
      var self = this;
      self.gamePanel.removeChild (self.block);

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var rnd = Math.floor (Math.random () * aq.TILE_DATA.length);
      self.block = new aq.Block (rnd);
      self.block.setPosition (block_size * blocks_wide / 2, cc.winSize.height);
      self.gamePanel.addChild (self.block, 3);
   }

});

aq.scenes.GameScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new GameLayer ();
      this.addChild (layer);
   }
});

