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

      aq.initTileData ();

      var w = block_size * blocks_wide;
      var h = cc.winSize.height;

      var gamePanel = new cc.LayerColor (cc.color (128,0,0,128), w, h);
      gamePanel.x = (cc.winSize.width - w) / 2;
      gamePanel.y = 0;

      var blocks_high = Math.ceil (h / block_size);

      self.addChild (gamePanel, 0);

      self.grid = new aq.Grid (blocks_wide, blocks_high);
      gamePanel.addChild (self.grid, 2);

      self.gamePanel = gamePanel;

      self.newBlock (0);

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
          var potentialNewRotationAndPosition = self.block.getNewRotationAndPosition90 ();
          var collision = self.grid.collideBlock (self.block,
                                       potentialNewRotationAndPosition.position,
                                       potentialNewRotationAndPosition.rotation);

          while (collision === -1 || collision === 1) {
             potentialNewRotationAndPosition.position.x += (collision * aq.config.BLOCK_SIZE);
             collision = self.grid.collideBlock (self.block,
                                                 potentialNewRotationAndPosition.position,
                                                 potentialNewRotationAndPosition.rotation);
          }
          if (collision === 0) {
             self.block.setNewRotationAndPosition (potentialNewRotationAndPosition);
          }
          self.keysPressed[cc.KEY.up] = false;
       }

       if (self.keysPressed[cc.KEY.space]) {
          self.grid.insertBlockIntoGrid (self.block);
          self.newBlock ();
          self.keysPressed[cc.KEY.space] = false;
       }

       // dx,dy are the point (pixels) difference to move the block in one game update
       var dx = self.dx * aq.config.BLOCK_SIZE;
       var dy = -aq.config.BLOCK_SIZE / 60;

       var current_block_position = self.block.getPosition ();

       if (self.fastDrop) {
          var fast_dy = dy * 20;
          var new_block_position = cc.p (current_block_position.x + dx, current_block_position.y + fast_dy);
          if (!self.grid.collideBlock (self.block, new_block_position)) {
             dy = fast_dy;
          }
       }

       self.moveBlockBy (dx, dy);
   },

   // Move a block by 'delta' x and y pixel values
   moveBlockBy: function (dx, dy) {
      var self = this;

      var new_block_position = self.block.getPosition ();
      new_block_position.x += dx;
      new_block_position.y += dy;

      if (!self.grid.collideBlock (self.block, new_block_position)) {
         self.block.setPosition (new_block_position);
      }
   },

   // Create a random new block and add it to the game panel at the top middle
   newBlock: function (type) {
      var self = this;

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var rnd = Math.floor (Math.random () * aq.TILE_DATA.length);
      if (typeof (type) !== 'undefined' && type >= 0 && type <= aq.TILE_DATA.length) {
         rnd = type;
      }

      self.block = new aq.Block (rnd);
      self.block.setPosition (block_size * blocks_wide / 2, cc.winSize.height);
      self.gamePanel.addChild (self.block, 3);

      self.grid.setFallingBlock (self.block);
   }

});

aq.scenes.GameScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new GameLayer ();
      this.addChild (layer);
   }
});

