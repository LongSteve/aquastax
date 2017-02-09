'use strict';

/* globals AXIS_COLLISION, SLOPE_COLLISION */

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

      self.moveHighlightL = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightL, 100);

      self.moveHighlightR = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightR, 100);

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

       // Handle repeat block movement left and right
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
          var fast_drop_collision = self.grid.collideBlock (self.block, new_block_position);
          if ((fast_drop_collision & AXIS_COLLISION) === 0) {
             dy = fast_dy;
          }
       }

       // Project the block sideways for a collision test
       new_block_position = self.block.getPosition ();
       new_block_position.x += dx;

       // Adjust the y position if the should block is aligned with the grid
       // This lets the blocks slide left and right into tight gaps
       var aligned_pos = self.grid.getBlockAlignedGridPosition (self.block);

       // where does this magic number 2.5 come from?
       if (Math.abs (new_block_position.y - aligned_pos.y) < 2.5) {
          new_block_position.y = aligned_pos.y;
       }

       // Test to see if the falling block can move sideways
       if (self.grid.collideBlock (self.block, new_block_position)) {
          // If collision would occur, don't attempt the sideways move
          dx = 0;
       }

       // Test to see if the falling block can move straight down.
       new_block_position = self.block.getPosition ();
       new_block_position.y += dy;

       collision = 0;
       collision = self.grid.collideBlock (self.block, new_block_position);

       //
       // stick block in place
       //
       var stickBlock = function () {

          // If the falling block cannot move down (or slide), lock it in place
          self.grid.insertBlockIntoGrid (self.block);

          // Allocate a new block for falling
          self.newRandomBlock ();
       };

       // Highlight the collision that just occured
       self.highlightCollision (self.block);

       if (self.block.isSliding) {

          // If the player has pressed the left or right button
          if (dx !== 0) {
             // Shift the block to the next grid aligned column, out of the slide
             dx = self.block.isSliding.can_move_to.x - self.block.x;
             // Take the block out of 'sliding' mode
             self.block.isSliding = null;
          } else {
             // Otherwise handle the slope movement
             if (self.block.isSliding.can_move_left) {
                dx = dy;
             } else if (self.block.isSliding.can_move_right) {
                dx = -dy;
             }
          }

          // Update the position
          self.moveBlockBy (dx, dy);

          // if the block is still sliding (might have been a left/right move to stop it sliding)
          if (self.block.isSliding) {
             if (self.block.isSliding.can_move_left) {
                // it was going left
                if (self.block.x <= self.block.isSliding.can_move_to.x) {
                   // fix to the exact position
                   self.block.setPosition (self.block.isSliding.can_move_to);
                   // stop the 'sliding' mode
                   self.block.isSliding = null;
                }
             } else if (self.block.isSliding.can_move_right) {
                // or if it was going right
                if (self.block.x >= self.block.isSliding.can_move_to.x) {
                   // fix to the exact position and stop the slide
                   self.block.setPosition (self.block.isSliding.can_move_to);
                   self.block.isSliding = null;
                }
             }
          }

       } else {

          if (collision) {

             if ((collision & SLOPE_COLLISION) !== 0) {

                //
                // Handle sliding the block calculations
                //
                var slide = self.grid.slideBlock (self.block);

                //
                // If the block can slide left or right, then send it off
                //
                if (slide.can_move_left || slide.can_move_right) {
                   self.block.isSliding = slide;

                   // Align the block to the grid at the current position, to make sure
                   // that sliding moves correctly
                   var aligned_pos = self.grid.getBlockAlignedGridPosition (self.block);
                   //self.block.setPosition (aligned_pos);
                   self.block.x = aligned_pos.x;
                   if (aligned_pos.y < self.block.y) {
                      self.block.y = aligned_pos.y;
                   }

                } else {

                   //
                   // Otherwise, the only case here is that the slide code determined that it actually
                   // couldn't slide the block.  This could be because it's stuck in place between
                   // two slopes, or that this is a point collision which should cause a break
                   //
                   var breaking = self.grid.breakBlock (self.block, new_block_position);

                   if (breaking) {
                      //
                      // Handle the block breaking
                      //
                   } else {
                      // stick block in place
                      stickBlock ();
                   }
                }

             } else if ((collision & AXIS_COLLISION) !== 0) {
                // axis collision means no sliding or breaking, so stick the block in place
                stickBlock ();
             }

          } else {

             // otherwise, no collision, so move it
             self.moveBlockBy (dx, dy);
          }
       }
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

