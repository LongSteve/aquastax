'use strict';

/* globals AXIS_COLLISION, SLOPE_COLLISION, NO_COLLISION, GRID_LEFT_EDGE_COLLISION, GRID_RIGHT_EDGE_COLLISION */

// The first block that falls at the beginning
//var BLOCK_SEQUENCE = [2,2,4,1,3,5,6];
//var BLOCK_SEQUENCE = [3,4,5,6];
var BLOCK_SEQUENCE = [6];

// This array is a list of blocks that get inserted into the grid at startup, handy for testing
var IX = 6;
var IY = 3;
var INITIAL_GRID = [
   // tile_num, rotation, x, y
/*
   [0, 0, 0, 0],
   [1, 0, 1, 0],
   [2, 0, 3, 0],
   [3, 0, 5, 0],
   [4, 0, 6, 0],
   [5, 0, 8, 0],
   [6, 0, 10, 0],
   [7, 0, 11, 0],
*/
   [1, 1, IX-2, 0],
   [1, 3, IX-1, 1],
   [2, 3, IX, IY],
   [2, 2, IX+2, IY],
   [2, 0, IX, IY+2],
   [2, 1, IX+2, IY+2],
   [0, 0, IX+2, IY+1],
   [6, 0, IX+1, IY+1],
   [7, 2, IX+1, IY+1]
];

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

   // Is the stack collapsing
   isCollapsing: false,

   // keypress indicators
   keyPressIndicators: null,
   keyMap: null,

   // Debug Data
   debugGridClusters: 0,
   debugGridGroups: 0,

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

      self.debugGridClusters = new cc.LabelTTF ('Clusters: 0', 'Arial', 32);
      self.debugGridClusters.setColor (cc.color.WHITE);
      self.debugGridClusters.setPosition (100,100);
      self.addChild (self.debugGridClusters);

      self.debugGridGroups = new cc.LabelTTF ('Groups: 0', 'Arial', 32);
      self.debugGridGroups.setColor (cc.color.GREEN);
      self.debugGridGroups.setPosition (100,140);
      self.addChild (self.debugGridGroups);

      if (INITIAL_GRID.length > 0) {
         for (var i = 0; i < INITIAL_GRID.length; i++) {
            var GR = INITIAL_GRID [i];
            var new_block = new aq.Block (GR [0]);
            new_block.setNewRotationAndPosition ({
               rotation: GR [1], 
               position: cc.p (GR [2] * aq.config.BLOCK_SIZE, GR [3] * aq.config.BLOCK_SIZE)
            });
            self.gamePanel.addChild (new_block, 3);
            self.grid.insertBlockIntoGrid (new_block);
            new_block.removeFromParent (true);
         }
         self.grid.groupFloodFill ();
      }
      
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
      try {
         self.keyPressIndicators[self.keyMap[keyCode]].setVisible (pressed);
      } catch (ex) {
         // catch error for a key not in the keyPressIndicators array
      }
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
      if (self.isCollapsing) {

         self.handleCollapsing ();

         if (!self.isCollapsing) {
            self.nextBlock ();
         }
      } else {
         self.handleBlockMovement (self.block);
      }

      var cl = self.grid.getClusterList();
      var l = cl ? cl.length : 0;
      self.debugGridClusters.setString ('Clusters: ' + l);

      var gl = self.grid.getGroupList();
      l = gl ? gl.length : 0;
      self.debugGridGroups.setString ('Groups: ' + l);

      self.grid.debugRenderGrid ();
   },

   fallingGroup: null,
   fallingCluster: null,

   handleCollapsing: function () {
       var self = this;

       // Big question.  Does stack collapse happen at the cluster or group level?
       // If at the cluster level, the large chunks will fall, but it may look less
       // 'realistic', but if at the group level, it could take a lot longer to
       // resolve a collapse as each block is going to fall individually.
                        
       var movement = 0;       
                    
       if (self.fallingGroup) {
          movement = self.handleBlockMovement (self.fallingGroup);
          if (movement === 0) {
             self.fallingGroup.removeFromParent (true);
             self.fallingGroup = null;
          } else {
             self.grid.groupFloodFill ();
          }
       } else if (self.fallingCluster) {
          movement = self.handleBlockMovement (self.fallingCluster);
          if (movement === 0) {
             self.fallingCluster.removeFromParent (true);
             self.fallingCluster = null;
          } else {
             self.grid.groupFloodFill ();
          }
       } else {
          self.grid.groupFloodFill ();       
          var clusters = self.grid.getClusterList ();

          for (var c = 0; c < clusters.length; c++) {
             var cluster = clusters [c];
             var groups = cluster.groups;
             for (var g = 0; g < groups.length; g++) {
                var group = groups [g];
                if (group && group.node) {
                   var groupNode = group.node;
                   group.node = null;
                   groupNode.removeFromParent (false);
                   //groupNode.setColor (cc.color (128,128,128,128));
                   self.grid.removeGroupByIndex (group.group_index);
                   self.gamePanel.addChild (groupNode, 3);
                   self.fallingGroup = groupNode;

                   var bm = self.handleBlockMovement (self.fallingGroup); 
                   if (bm === 0) {
                      self.fallingGroup.removeFromParent ();
                      self.fallingGroup = null;
                   } else {
                      self.grid.groupFloodFill ();
                   }
                   movement += bm;
                }
                if (movement > 0) {
                   return;
                }
             }
          }

          self.grid.groupFloodFill ();
          self.fallingGroup = null;

          // Now test for any loose clusters that can fall, otherwise, we get the 
          // rare case of a group surrounding another group, and they 'hold' each
          // other up.  By falling clusters, we get around this...

          movement = 0;
          
          clusters = self.grid.getClusterList ();

          for (c = 0; c < clusters.length; c++) {
             cluster = clusters [c];
             // TODO: Implement this properly, as createBlockFromCluster
             var clusterNode = self.grid.createBlockFromTileDataGroup (cluster);
             self.gamePanel.addChild (clusterNode, 3);
             self.fallingCluster = clusterNode;

             // remove the cluster. this must happen before movement testing
             for (g = 0; g < cluster.groups.length; g++) {
                group = groups [g];
                if (group) {
                   self.grid.removeGroupByIndex (group.group_index);
                }
             }

             bm = self.handleBlockMovement (self.fallingCluster);
             if (bm === 0) {
                self.fallingCluster.removeFromParent ();
                self.fallingCluster = null;
             } else {
                self.grid.groupFloodFill ();
             }
             movement += bm;
          }
          if (movement > 0) {
             return;
          }

          self.grid.groupFloodFill ();
          self.fallingGroup = null;
          self.fallingCluster = null;

          self.isCollapsing = false;
       }
   },

   // Returns 0 if the block movement has ended, or 1 if still potentially moving and 2 if a collapse
   // processing should occur or continue
   handleBlockMovement: function (block) {
      var self = this;
      
      if (!block) {
         return 0;
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

      // Things happen slightly differently when collapsing
      var collapse = self.isCollapsing;
      if (collapse) {
         leftPressed = rightPressed = rotatePressed = dropPressed = false;
      }
      
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

         var potentialNewRotationAndPosition = block.getNewRotationAndPosition90 ();
         collision = self.grid.collideBlock (block,
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

            var collision_points = block.collision_points;
            if (collision_points && collision_points.length > 0) {
               // Sum the points to the left and right of the falling block where collisions occured

               // Take into account the block bounds within the grid_size area
               var block_grid_size = block.getGridSize ();
               var bounds = block.getTileBounds ();
               var block_x = block.getPositionX ();
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
               collision = self.grid.collideBlock (block,
                                                   potentialNewRotationAndPosition.position,
                                                   potentialNewRotationAndPosition.rotation);
            }
         }

         if (collision === NO_COLLISION) {
            block.setNewRotationAndPosition (potentialNewRotationAndPosition);
            willRotate = true;
         }
      }

      if (!collapse) {
         self.grid.highlightBlockCells (block);
      }

      // dx,dy are the point (pixels) difference to move the block in one game update
      dy = -(aq.config.BLOCK_SIZE * aq.config.NORMAL_BLOCK_DROP_RATE) / framesPerSecond;

      var current_block_position = block.getPosition ();
      var new_block_position, fast_dy;

      // If we're fast dropping, check for a collision and only keep the dy update
      // value fast if no collision would occur
      if (dropPressed) {
         fast_dy = -(aq.config.BLOCK_SIZE * aq.config.FAST_BLOCK_DROP_RATE) / framesPerSecond;
         new_block_position = cc.p (current_block_position.x + dx, current_block_position.y + fast_dy);
         var fast_drop_collision = self.grid.collideBlock (block, new_block_position);
         if ((fast_drop_collision & AXIS_COLLISION) === 0) {
            dy = fast_dy;
         }
      }

      // For a stack collapse, just drop the block real fast
      if (collapse) {
         dy = -(aq.config.BLOCK_SIZE >> 1);
      }
      
      // If the block is within 2 * the amount it moves by per frame, then
      // assume it's aligned with the grid
      var alignedDistance = (aq.config.BLOCK_SIZE * 2) / framesPerSecond;

      // Adjust the y position if the block is aligned with the grid
      // This lets the blocks slide left and right into tight gaps
      var aligned_pos = self.grid.getBlockAlignedGridPosition (block);

      // Sideways test, if left or right movement key is pressed
      var tmp_collision = 1;
      var tmp_dx, tmp_pos;
      if (leftPressed || rightPressed) {
         tmp_dx = (leftPressed ? -1 : 1) * aq.config.BLOCK_SIZE;
         tmp_pos = block.getPosition ();
         if (Math.abs (tmp_pos.y - aligned_pos.y) <= alignedDistance) {
            tmp_pos.y = aligned_pos.y;
         }
         tmp_pos.x += tmp_dx;
         tmp_collision = self.grid.collideBlock (block, tmp_pos);
      }

      var can_move_left = leftPressed && (tmp_collision === 0);
      var can_move_right = rightPressed && (tmp_collision === 0);

      if (typeof (block.could_move_left) === 'undefined') {
         block.could_move_left = false;
      }

      if (typeof (block.could_move_right) === 'undefined') {
         block.could_move_right = false;
      }
      
      if (can_move_left && !block.could_move_left) {
         dx = tmp_dx;
      }

      if (can_move_right && !block.could_move_right) {
         dx = tmp_dx;
      }

      block.could_move_left = can_move_left;
      block.could_move_right = can_move_right;

      // Project the block sideways for a collision test
      new_block_position = block.getPosition ();
      new_block_position.x += dx;

      if (Math.abs (new_block_position.y - aligned_pos.y) <= alignedDistance) {
         new_block_position.y = aligned_pos.y;
      }

      // Test to see if the falling block can move sideways
      if (self.grid.collideBlock (block, new_block_position)) {
         // If collision would occur, don't attempt the sideways move
         dx = 0;
      }

      // Test to see if the falling block can move straight down.
      new_block_position = block.getPosition ();
      new_block_position.y += dy;

      collision = NO_COLLISION;
      collision = self.grid.collideBlock (block, new_block_position);

      //
      // stick block in place
      //
      var stickBlock = function () {

         // If the falling block cannot move down (or slide), lock it in place
         self.grid.insertBlockIntoGrid (block);

         // If not collapsing
         if (!collapse) {

            // Fill the grid to generate the coloured block groups
            self.grid.groupFloodFill ();

            // Allocate a new block for falling
            self.nextBlock ();
         }
      };

      // Highlight the collision that just occured
      if (!collapse) {
         self.highlightCollision (block);
      }

      if (block.isSliding) {

         // If the player has pressed the left or right button
         if (dx !== 0) {
            // Shift the block to the next grid aligned column, out of the slide
            dx = block.isSliding.can_move_to.x - block.x;
            // Take the block out of 'sliding' mode
            block.isSliding = null;
         } else {
            // Otherwise handle the slope movement
            if (block.isSliding.can_move_left) {
               dx = dy;
            } else if (block.isSliding.can_move_right) {
               dx = -dy;
            }
         }

         // Update the position
         block.moveBy (dx, dy);

         // if the block is still sliding (might have been a left/right move to stop it sliding)
         if (block.isSliding) {
            if (block.isSliding.can_move_left) {
               // it was going left
               if (block.x <= block.isSliding.can_move_to.x) {
                  // fix to the exact position
                  block.setPosition (block.isSliding.can_move_to);
                  // stop the 'sliding' mode
                  block.isSliding = null;
               }
            } else if (block.isSliding.can_move_right) {
               // or if it was going right
               if (block.x >= block.isSliding.can_move_to.x) {
                  // fix to the exact position and stop the slide
                  block.setPosition (block.isSliding.can_move_to);
                  block.isSliding = null;
               }
            }
         }

         return 1;

      } else {

         if (collision) {

            // Clear any old block breaking collision points
            self.grid.clearCollisionBreakPoints ();

            if ((collision & SLOPE_COLLISION) !== 0) {

               //
               // Handle sliding the block calculations
               //
               var slide = self.grid.slideBlock (block);

               //
               // If the block can slide left or right, then send it off
               //
               if (slide.can_move_left || slide.can_move_right) {
                  block.isSliding = slide;

                  // Align the block to the grid at the current position, to make sure
                  // that sliding moves correctly
                  aligned_pos = self.grid.getBlockAlignedGridPosition (block);
                  block.x = aligned_pos.x;
                  if (aligned_pos.y < block.y) {
                     block.y = aligned_pos.y;
                  }

                  return 1;

               } else {

                  //
                  // Otherwise, the only case here is that the slide code determined that it actually
                  // couldn't slide the block.  This could be because it's stuck in place between
                  // two slopes, or that this is a point collision which should cause a break
                  //
                  var breaking = self.grid.breakBlock (block, new_block_position);

                  if (breaking) {
                     // Potential collapse
                     self.isCollapsing = true;

                     // Remove the broken falling block straight away
                     block.removeFromParent (true);

                     return 2;
                  } else {
                     // stick block in place
                     stickBlock ();
                     return 0;
                  }
               }

            } else if ((collision & AXIS_COLLISION) !== 0) {
               // axis collision means no sliding or breaking, so stick the block in place
               stickBlock ();
               return 0;
            }

         } else {

            // otherwise, no collision, so move it
            block.moveBy (dx, dy);
            return 1;
         }
      }

      return 0;
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

   // Create a new random block, at the top middle of the game panel, lso removing the 
   // currently falling block
   nextBlock: function () {
       var self = this;

       // Remove the old block
       if (self.block) {
          self.block.removeFromParent (true);
       }

       // Allocate a new one
       var grid_x = aq.config.GRID_WIDTH / 2;
       var grid_y = cc.winSize.height / aq.config.BLOCK_SIZE;
       var rnd_tile_num = aq.Block.getRandomTileNumber ();

       if (self.blockCounter < BLOCK_SEQUENCE.length) {
          rnd_tile_num = BLOCK_SEQUENCE [self.blockCounter++];
       }

       var new_block = new aq.Block (rnd_tile_num);
       new_block.setPosition (grid_x * aq.config.BLOCK_SIZE, grid_y * aq.config.BLOCK_SIZE);

       self.gamePanel.addChild (new_block, 3);
       self.grid.setFallingBlock (new_block);

       self.block = new_block;
   }
});

aq.scenes.GameScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new GameLayer ();
      this.addChild (layer);
   }
});

