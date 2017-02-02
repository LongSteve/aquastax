'use strict';

var GameLayer = cc.Layer.extend ({

   // panels
   gamePanel: null,

   // grid
   grid: null,

   // blocks
   block: null,

   // collision test indicators
   collisionPoints: null,

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

       // Test to see if the falling block can move straight down.
       new_block_position = self.block.getPosition ();
       new_block_position.y += dy;

       collision = 0;
       collision = self.grid.collideBlock (self.block, new_block_position);

       if (collision) {

          // Highlight the collision that just occured
          self.highlightCollision (self.block);

          var wasSliding = self.block.isSliding;

          if (self.testForSliding (self.block, collision)) {

             // TODO: Handle moving the block left or right, depending upon self.block.slideDirection
             dx = -dy * self.block.slideX;
             self.moveBlockBy (dx, dy);

          } else {

             if (wasSliding) {
                // Make sure a block that's not sliding is aligned exactly with the grid
                var gp = self.grid.getBlockAlignedGridPosition (self.block);
                self.block.x = gp.x;

             } else {

                // If the falling block cannot move down (or slide), lock it in place
                self.grid.insertBlockIntoGrid (self.block);

                // Allocate a new block for falling
                self.newRandomBlock ();
             }
          }

       } else {
          // otherwise, move it
          self.moveBlockBy (dx, dy);
       }
   },

   // Return true if the block will slide.  In this case, also set block.isSliding and
   // block.slideDirection.
   //
   // Return false if no sliding can occur
   testForSliding: function (block, collision) {

       // No slide by default
       block.isSliding = false;
       block.slideX = 0;

       // Any axis collisions will cause the block to sit where it is
       if ((collision & AXIS_COLLISION) !== 0) {
          return false;
       }

       //
       // TODO: Implement this properly
       //

       // slope to the left, causing a -ve x movement
       var isLeftSlope = function (c) {
          return (((c & 0xff) === 0x02) || ((c & 0xff) === 0x20) || ((c & 0xff) === 0x04) || ((c & 0xff) === 0x40));
       };

       // slope to the right, causing a +ve x movement
       var isRightSlope = function (c) {
          return (((c & 0xff) === 0x01) || ((c & 0xff) === 0x10) || ((c & 0xff) === 0x03) || ((c & 0xff) === 0x30));
       };

       var isSlope = function (c) {
          return (isLeftSlope (c) || isRightSlope (c));
       };

       // Check the collision_points data
       if (block.collision_points && block.collision_points.length > 0) {
          for (var i = 0; i < block.collision_points.length; i++) {
             var cp = block.collision_points [i];

             var grid_cell = cp.grid_block_obj;
             var block_cell = cp.cell.tile_cell;

             if (isLeftSlope (block_cell) && isRightSlope (block_cell)) {
                // pointy block falling, handle this later
             } else if (isLeftSlope (grid_cell) && isRightSlope (grid_cell)) {
                // pointy block in the grid
             } else {
               if (isLeftSlope (block_cell) || isLeftSlope (grid_cell)) {
                  block.isSliding = true;
                  block.slideX = -1;
               } else if (isRightSlope (block_cell) || isRightSlope (grid_cell)) {
                  block.isSliding = true;
                  block.slideX = 1;
               }
            }
          }
       }

       return block.isSliding;
   },

   // highlight a collision
   highlightCollision: function (block) {

      var self = this;

      var i;

      if (self.collisionPoints) {
         for (i = 0; i < self.collisionPoints.length; i++) {
            self.collisionPoints [i].removeFromParent ();
         }
         self.collisionPoints = null;
      }

      var half_block = aq.config.BLOCK_SIZE / 2;
      var block_pos = block.getPosition ();

      if (block.collision_points && block.collision_points.length > 0)
      {
         self.collisionPoints = [];

         for (i = 0; i < block.collision_points.length; i++) {
            var cp = block.collision_points [i];

            var color = ((cp.collision & AXIS_COLLISION) !== 0) ? cc.color (255,0,0,255) : cc.color (0,0,255,255);

            // draw a line between the centers of the two cells that have collided
            var grid_pos = cc.p (cp.grid_block_pos.x + half_block, cp.grid_block_pos.y + half_block);
            var b_pos = cc.p (block_pos.x + (cp.cell.x * aq.config.BLOCK_SIZE) + half_block, block_pos.y + (cp.cell.y * aq.config.BLOCK_SIZE) + half_block);

            var hl = new cc.DrawNode ();
            hl.drawSegment (grid_pos, b_pos, 3, color);
            hl.setPosition (cc.p (0, 0));
            hl.setVisible (true);
            self.collisionPoints.push (hl);
            self.gamePanel.addChild (hl, 200);
         }
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

