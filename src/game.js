'use strict';

/* globals AXIS_COLLISION, SLOPE_COLLISION, NO_COLLISION, GRID_LEFT_EDGE_COLLISION, GRID_RIGHT_EDGE_COLLISION */

// The first block that falls at the beginning
var BLOCK_SEQUENCE = [];

var GameLayer = cc.Layer.extend ({

   // panels
   gamePanel: null,

   // grid
   grid: null,

   // currently falling block
   block: null,

   // count of dropped blocks
   blockCounter: 0,

   // collision test indicators
   collisionPoints: null,

   // Previous frame movement flags
   could_move_right: false,
   could_move_left: false,

   // keypress indicators
   keyPressIndicators: null,
   keyMap: null,

   // group count indicator
   groupCountLabel: null,

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

      self.nextBlock ();

      self.moveHighlightL = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightL, 100);

      self.moveHighlightR = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightR, 100);

      self.initKeyPressIndicators ();

      self.groupCountLabel = new cc.LabelTTF ('0', 'Arial', 38);
      self.groupCountLabel.setPosition (gamePanel.x - 50, cc.winSize.height - 50);
      self.groupCountLabel.setColor (cc.color (255,255,255));
      self.addChild (self.groupCountLabel);

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

   // movement repeat timings
   moveDelayMS: 0,
   rotateDelayMS: 0,

   keyAction: function (keyCode, pressed) {
      var self = this;
      self.keysPressed [keyCode] = pressed;
      self.keyPressIndicators [self.keyMap [keyCode]].setVisible (pressed);
   },

   clearKeys: function () {
      var self = this;
      self.keysPressed [cc.KEY.up] = false;
      self.keysPressed [cc.KEY.down] = false;
      self.keysPressed [cc.KEY.left] = false;
      self.keysPressed [cc.KEY.right] = false;
   },

   initKeyPressIndicators: function () {
       var self = this;

       // Create DrawNode objects to show the up,down,left and right key pressed states
       var i;

       self.keyPressIndicators = [];
       self.keyMap = [];

       var triangle = [
          cc.p (0, 0),
          cc.p (50, 50),
          cc.p (100,0)
       ];

       var offsets = [
          -250, 0, 0, cc.KEY.up,
          -300, -100, -90, cc.KEY.left,
          -100, 0, 90, cc.KEY.right,
          -150, -100, 180, cc.KEY.down
       ];

       for (i = 0; i < 4; i++) {
          self.keyPressIndicators [i] = new cc.DrawNode ();
          self.keyPressIndicators [i].drawPoly (triangle, cc.color (255,0,0), 4, cc.color (255,255,255));
          self.keyPressIndicators [i].x = self.gamePanel.x + offsets [(i*4) + 0];
          self.keyPressIndicators [i].y = cc.winSize.height / 2 + offsets [(i*4) + 1];
          self.keyPressIndicators [i].setRotation (offsets [(i*4) + 2]);
          self.addChild (self.keyPressIndicators [i]);
          self.keyPressIndicators [i].setVisible (false);

          self.keyMap [offsets [(i*4)+3]] = i;
       }
   },

   update: function () {
      var self = this;

      // Handle a collapsing stack. This takes president over normal block dropping and movement
      if (self.grid.isCollapsing ()) {

         self.handleCollapsing ();

         if (!self.grid.isCollapsing ()) {
            self.nextBlock ();
         }
      }

      self.handleBlockMovement ();
   },

   handleCollapsing: function () {
       var self = this;
       self.grid.updateCollapsing ();
   },

   handleBlockMovement: function () {
      var self = this;
      
      if (!self.block) {
         return;
      }

      // Game update values
      var framesPerSecond = cc.game.config.frameRate;
      var millisPerUpdate = 1000.0 / framesPerSecond;

      // Get key states
      var leftPressed = self.keysPressed[cc.KEY.left];
      var rightPressed = self.keysPressed[cc.KEY.right];

      var rotatePressed = self.keysPressed[cc.KEY.up];
      var dropPressed = self.keysPressed[cc.KEY.down];

      // General purpose collision detection
      var collision = NO_COLLISION;

      // Action triggers
      var willRotate;

      // Move block left and right in pixels
      var dx = 0;
      var dy = 0;

      // Move left or right
      if (self.moveDelayMS >= aq.config.KEY_DELAY_MS) {
         if (leftPressed) {
            dx = -1 * aq.config.BLOCK_SIZE;          // move one block left
            self.moveDelayMS = 0;
         } else if (rightPressed) {
            dx = 1 * aq.config.BLOCK_SIZE;           // move one block right
            self.moveDelayMS = 0;
         }
      }

      if (!leftPressed && !rightPressed) {
         self.moveDelayMS = aq.config.KEY_DELAY_MS;
      }

      if (!rotatePressed) {
         self.rotateDelayMS = aq.config.KEY_DELAY_MS;
      }

      self.moveDelayMS += millisPerUpdate;
      self.rotateDelayMS += millisPerUpdate;

      // Rotate the block through 90 degrees
      if (rotatePressed && self.rotateDelayMS >= aq.config.KEY_DELAY_MS) {
         self.rotateDelayMS = 0;

         var potentialNewRotationAndPosition = self.block.getNewRotationAndPosition90 ();
         collision = self.grid.collideBlock (self.block,
                                             potentialNewRotationAndPosition.position,
                                             potentialNewRotationAndPosition.rotation);

         // Test the collision data to see if the block has collided with something on
         // it's left, or right.  If so, we might be able shift the block sideways
         // to allow the rotation

         if (collision !== NO_COLLISION) {

            // Take into account colliding with the left and right edges of the grid

            // csl = collision_sum_left, or number of collision points to the left of the falling block
            var collision_sum_left = ((collision & 0x0f) === GRID_LEFT_EDGE_COLLISION) ? 1 : 0;

            // csr = collision_sum_right, or number of collision points to the right of the falling block
            var collision_sum_right = ((collision & 0x0f) === GRID_RIGHT_EDGE_COLLISION) ? 1 : 0;

            var collision_points = self.block.collision_points;
            if (collision_points && collision_points.length > 0) {
               // Sum the points to the left and right of the falling block where collisions occured

               // Take into account the block bounds within the grid_size area
               var block_grid_size = self.block.getGridSize ();
               var bounds = self.block.getTileBounds ();
               var block_x = self.block.getPositionX ();
               for (var i = 0; i < collision_points.length; i++) {

                  if (collision_points [i].grid_block_pos.x < block_x + (bounds.left * aq.config.BLOCK_SIZE)) {
                     collision_sum_left++;
                  }
                  if (collision_points [i].grid_block_pos.x > block_x - ((block_grid_size - bounds.right) * aq.config.BLOCK_SIZE)) {
                     collision_sum_right++;
                  }
               }
            }

            // Work out if we can move the block to the left or right
            var move_x = 0;
            if (collision_sum_left > 0 && collision_sum_right === 0) {
               // shift right since collision was on the left side
               move_x = aq.config.BLOCK_SIZE;
            } else if (collision_sum_right > 0 && collision_sum_left === 0) {
               // shift left, since collision was on the right
               move_x = -aq.config.BLOCK_SIZE;
            }

            // Move is appropriate, and no further collision
            if (move_x !== 0) {
               potentialNewRotationAndPosition.position.x += move_x;
               collision = self.grid.collideBlock (self.block,
                                                   potentialNewRotationAndPosition.position,
                                                   potentialNewRotationAndPosition.rotation);
            }
         }

         if (collision === NO_COLLISION) {
            self.block.setNewRotationAndPosition (potentialNewRotationAndPosition);
            willRotate = true;
         }
      }

      self.grid.highlightBlockCells (self.block);

      // dx,dy are the point (pixels) difference to move the block in one game update
      dy = -(aq.config.BLOCK_SIZE * aq.config.NORMAL_BLOCK_DROP_RATE) / framesPerSecond;

      var current_block_position = self.block.getPosition ();
      var new_block_position, fast_dy;

      // If we're fast dropping, check for a collision and only keep the dy update
      // value fast if no collision would occur
      if (dropPressed) {
         fast_dy = -(aq.config.BLOCK_SIZE * aq.config.FAST_BLOCK_DROP_RATE) / framesPerSecond;
         new_block_position = cc.p (current_block_position.x + dx, current_block_position.y + fast_dy);
         var fast_drop_collision = self.grid.collideBlock (self.block, new_block_position);
         if ((fast_drop_collision & AXIS_COLLISION) === 0) {
            dy = fast_dy;
         }
      }

      // If the block is within 2 * the amount it moves by per frame, then
      // assume it's aligned with the grid
      var alignedDistance = (aq.config.BLOCK_SIZE * 2) / framesPerSecond;

      // Adjust the y position if the block is aligned with the grid
      // This lets the blocks slide left and right into tight gaps
      var aligned_pos = self.grid.getBlockAlignedGridPosition (self.block);

      // Sideways test, if left or right movement key is pressed
      var tmp_collision = 1;
      var tmp_dx, tmp_pos;
      if (leftPressed || rightPressed) {
         tmp_dx = (leftPressed ? -1 : 1) * aq.config.BLOCK_SIZE;
         tmp_pos = self.block.getPosition ();
         if (Math.abs (tmp_pos.y - aligned_pos.y) <= alignedDistance) {
            tmp_pos.y = aligned_pos.y;
         }
         tmp_pos.x += tmp_dx;
         tmp_collision = self.grid.collideBlock (self.block, tmp_pos);
      }

      var can_move_left = leftPressed && (tmp_collision === 0);
      var can_move_right = rightPressed && (tmp_collision === 0);

      if (can_move_left && !self.could_move_left) {
         dx = tmp_dx;
      }

      if (can_move_right && !self.could_move_right) {
         dx = tmp_dx;
      }

      self.could_move_left = can_move_left;
      self.could_move_right = can_move_right;

      // Project the block sideways for a collision test
      new_block_position = self.block.getPosition ();
      new_block_position.x += dx;

      if (Math.abs (new_block_position.y - aligned_pos.y) <= alignedDistance) {
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

      collision = NO_COLLISION;
      collision = self.grid.collideBlock (self.block, new_block_position);

      //
      // stick block in place
      //
      var stickBlock = function () {

         // If the falling block cannot move down (or slide), lock it in place
         self.grid.insertBlockIntoGrid (self.block);

         // Allocate a new block for falling
         self.nextBlock ();

         // Fill the grid
         self.grid.groupFloodFill ();

         self.groupCountLabel.setString (self.grid.fillGroupCount);
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

            // Clear any old block breaking collision points
            self.grid.clearCollisionBreakPoints ();

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
                  aligned_pos = self.grid.getBlockAlignedGridPosition (self.block);
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
                     // The falling block has broken a grid cluster, so we now need to handle
                     // a stack collapse.  This will involve dropping free floating clusters
                     // down, with potential further breakages, until everything settles.
                     //
                     if (!self.grid.shouldCollapse ()) {
                        
                        // If no collapse, then drop the next block
                        self.nextBlock ();
                     }
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
   nextBlock: function () {
       var self = this;

       var grid_x = aq.config.GRID_WIDTH / 2;
       var grid_y = cc.winSize.height / aq.config.BLOCK_SIZE;
       var rnd_tile_num = aq.Block.getRandomTileNumber ();

       if (self.blockCounter < BLOCK_SEQUENCE.length) {
          rnd_tile_num = BLOCK_SEQUENCE [self.blockCounter++];
       }
       
       self.newBlock (rnd_tile_num, grid_x, grid_y);
   },

   // Create a new block and add it to the game panel at the specified position.
   // Removes the old (current) falling block.
   // Also calls setFallingBlock as a side effect
   newBlock: function (type, grid_x, grid_y) {
      var self = this;

      // Enable this when the grid clustering is working properly, and the grid is rendered using
      // the cluster data.  Currently, the blocks are left in place where they land.
      //
      if (self.block) {
         self.block.removeFromParent (true);
      }

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

