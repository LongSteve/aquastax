'use strict';

var GameLayer = cc.Layer.extend ({

   // panels
   gamePanel: null,

   // grid
   grid: null,

   // blocks
   block: null,

   // collision test indicator
   collisionTest: null,

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

      self.gamePanel = gamePanel;

      self.newBlock (0, blocks_wide / 2, blocks_high);

      cc.eventManager.addListener ({
         event: cc.EventListener.KEYBOARD,
         onKeyPressed: function (keyCode) {
            self.keyAction (keyCode, true);
         },
         onKeyReleased: function (keyCode){
            self.keyAction (keyCode, false);
         }
      }, self);

      // Visualise the collisions with a drawnode
      self.collisionTest = new cc.DrawNode ();
      self.collisionTest.drawRect (cc.p (0,0), cc.p (block_size, block_size), cc.color (255,0,255,200));
      self.collisionTest.setVisible (false);
      self.gamePanel.addChild (self.collisionTest, 100);

      self.scheduleUpdate ();
   },

   //
   // Keyboard Handling Code
   //

   // array of keys pressed
   keysPressed: [],

   // delta x and y for block movement
   dx:0,
   dy:0,

   // block is dropping fast
   fastDrop: false,

   keyAction: function (keyCode, pressed) {
      var self = this;
      self.keysPressed [keyCode] = pressed;
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

       var collision = 0;

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
          collision = self.grid.collideBlock (self.block,
                                              potentialNewRotationAndPosition.position,
                                              potentialNewRotationAndPosition.rotation);

          while (collision === 1 || collision === 2) {
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

       self.grid.highlightBlockCells (self.block);

       // dx,dy are the point (pixels) difference to move the block in one game update
       var dx = self.dx * aq.config.BLOCK_SIZE;
       var dy = -aq.config.BLOCK_SIZE / 60;

       var current_block_position = self.block.getPosition ();
       var new_block_position;

       // If we're fast dropping, check for a collision and only keep the dy update
       // value fast if no collision would occur
       if (self.fastDrop) {
          var fast_dy = dy * 20;
          new_block_position = cc.p (current_block_position.x + dx, current_block_position.y + fast_dy);
          if (!self.grid.collideBlock (self.block, new_block_position)) {
             dy = fast_dy;
          }
       }

       // Test to see if the falling block can move sideways
       new_block_position = self.block.getPosition ();
       new_block_position.x += dx;
       if (self.grid.collideBlock (self.block, new_block_position)) {
          // If collision would occur, don't attempt the sideways move
          dx = 0;
       }

       //
       // TODO: Implement this properly
       //

       // Handle a sliding block
       if (self.block.isSliding && (dx === 0)) {
          // based on the direction of slide, add a value to dx

       } else {

          // Test to see if the falling block can move straight down.
          new_block_position = self.block.getPosition ();
          new_block_position.y += dy;

          collision = 0;
          collision = self.grid.collideBlock (self.block, new_block_position);

          if (collision) {

             // Highlight the collision that just occured
             self.highlightCollision (collision);

             if (self.testForSliding (self.block, collision)) {

                // TODO: Handle moving the block left or right, depending upon self.block.slideDirection

             } else {

                // If the falling block cannot move down (or slide), lock it in place
                self.grid.insertBlockIntoGrid (self.block);

                // Allocate a new block for falling
                self.newRandomBlock ();
             }

          } else {
             // otherwise, move it
             self.moveBlockBy (dx, dy);
          }
       }
   },

   // Return true if the block will slide.  In this case, also set block.isSliding and
   // block.slideDirection.
   //
   // Return false if no sliding can occur
   testForSliding: function (block, collision) {

       //
       // TODO: Implement this properly
       //

       block.isSliding = false;
       return block.isSliding;
   },

   // highlight a collision
   highlightCollision: function (collision) {
      var self = this;
      if (collision !== 0)
      {
         var block_size = aq.config.BLOCK_SIZE;
         if ((collision & AXIS_COLLISION) !== 0) {
            self.collisionTest.clear ();
            self.collisionTest.drawRect (cc.p (0,0), cc.p (block_size, block_size), cc.color (255,0,255,200));
         } else if ((collision & SLOPE_COLLISION) !== 0) {
            self.collisionTest.clear ();
            self.collisionTest.drawRect (cc.p (0,0), cc.p (block_size, block_size), cc.color (0,255,0,200));
         }
         self.collisionTest.setPosition (self.block.getPosition ());
         self.collisionTest.setVisible (true);
      } else {
         self.collisionTest.setVisible (false);
      }
   },

   // Move a block by 'delta' x and y pixel values
   // Return false if the block is not actually moved
   moveBlockBy: function (dx, dy) {
      var self = this;

      var new_block_position = self.block.getPosition ();
      new_block_position.x += dx;
      new_block_position.y += dy;

      self.block.setPosition (new_block_position);
   },

   // Create a new random block, at the top middle of the game panel
   newRandomBlock: function () {
       var self = this;

       var grid_x = aq.config.GRID_WIDTH / 2;
       var grid_y = cc.winSize.height / aq.config.BLOCK_SIZE;
       var rnd_tile_num = aq.Block.getRandomTileNumber ();

       self.newBlock (rnd_tile_num, grid_x, grid_y);
   },

   // Create a new block and add it to the game panel at the specified position
   // Also calls setFallingBlock as a side effect
   newBlock: function (type, grid_x, grid_y) {
      var self = this;

      self.block = new aq.Block (type);
      self.block.setPosition (grid_x * aq.config.BLOCK_SIZE, grid_y * aq.config.BLOCK_SIZE);

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

