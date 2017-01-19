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

   // tmp 1 cell block for collision testing
   tmpBlock: null,

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

      if (!aq.config.MOUSE_MOVE_BLOCK) {
         self.newBlock (0, blocks_wide / 2, blocks_high);
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

      if (aq.config.MOUSE_MOVE_BLOCK) {
         cc.eventManager.addListener ( {
            event: cc.EventListener.MOUSE,
            onMouseDown: function (event) {
               self.mouseAction (event, true);
            },
            onMouseUp: function (event) {
               self.mouseAction (event, false);
            },
            onMouseMove: function (event) {
               self.mouseMoved (event);
            }
         }, self);
      }

      if (aq.config.MOUSE_MOVE_BLOCK) {
         var blocks_to_start_with = [1, 1];     // x, y, where x is fixed, y is moving
         for (var tmp = 0; tmp < blocks_to_start_with.length; tmp++) {
            self.newBlock (blocks_to_start_with [tmp], tmp + (blocks_wide / 2), blocks_high - 10);
            if (tmp < blocks_to_start_with.length - 1) {
               self.grid.insertBlockIntoGrid (self.block);
            }
         }

         self.collisionTest = new cc.DrawNode ();
         self.collisionTest.drawRect (cc.p (0,0), cc.p (block_size, block_size), cc.color (255,0,255,200));
         self.collisionTest.setVisible (false);
         self.gamePanel.addChild (self.collisionTest, 100);

         self.tmpBlock = new aq.Block (3);
      }

      self.scheduleUpdate ();
   },

   //
   // Mouse Handling Code
   //

   // array of mouse buttons pressed
   mousePressed: [],

   // Current Mouse Position within the grid
   mouseGridPos: null,

   // Function called when a mouse button is pressed or released
   mouseAction: function (event, pressed) {
      var self = this;

      var mouseButton = event.getButton ();
      self.mousePressed [mouseButton] = pressed;
   },

   // Function called when the mouse is moved
   mouseMoved: function (event) {
      var self = this;

      var mouseLocationPoint = event.getLocation ();
      self.mouseGridPos = self.gamePanel.convertToNodeSpace (mouseLocationPoint);
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

       if (aq.config.MOUSE_MOVE_BLOCK) {
          try {

             if (self.mousePressed [cc.EventMouse.BUTTON_LEFT]) {
                self.block.setPosition (self.mouseGridPos);
             }
          } catch (ex) {
             // ignore
          }
       }

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

       // Test to see if the falling block can move down.
       new_block_position = self.block.getPosition ();
       new_block_position.y += dy;
       if (self.grid.collideBlock (self.block, new_block_position)) {
          // If the falling block cannot move down, lock it in place
          if (!aq.config.MOUSE_MOVE_BLOCK) {
             self.grid.insertBlockIntoGrid (self.block);
             self.newRandomBlock ();
          }
       } else {
          // otherwise, move it
          self.moveBlockBy (dx, dy);
       }

       // Collision testing code
       if (aq.config.MOUSE_MOVE_BLOCK) {

          var moving_obj_cells = self.block.getTileCells ();

          var moving_obj = self.block.getObjectData ();
          var moving_pos = self.block.getPosition ();

          collision = 0;

          // TODO: Figure out why the collision seems to be off by one on the vertical in some cases.

          for (var t = 0; t < moving_obj_cells.length; t++) {
             var cell = moving_obj_cells [t];

             var cell_obj = cell.tile_cell;
             var cell_pos = cc.p (moving_pos.x + (cell.x * aq.config.BLOCK_SIZE), moving_pos.y + (cell.y * aq.config.BLOCK_SIZE));
             self.tmpBlock.setPosition (cell_pos);
             var grid_indexes = self.grid.getGridIndexPositionsForBlockCollision (self.tmpBlock, cell_pos, 0);

             for (var i = 0; i < grid_indexes.length; i++) {

                var grid_block_pos = self.grid.getGridPositionForIndex (grid_indexes [i].grid_index);
                var grid_block_obj = (self.grid.getGridDataForIndex (grid_indexes [i].grid_index) & 0xff);

                collision |= self.grid.collideObjects (
                                cell_obj, cell_pos.x, cell_pos.y,
                                grid_block_obj, grid_block_pos.x, grid_block_pos.y);
             }
          }

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
             self.collisionTest.setPosition (moving_pos);
             self.collisionTest.setVisible (true);
          } else {
             self.collisionTest.setVisible (false);
          }
       }
   },

   // Move a block by 'delta' x and y pixel values
   // Return false if the block is not actually moved
   moveBlockBy: function (dx, dy) {
      var self = this;

      if (!aq.config.MOUSE_MOVE_BLOCK) {
         var new_block_position = self.block.getPosition ();
         new_block_position.x += dx;
         new_block_position.y += dy;

         self.block.setPosition (new_block_position);
      }
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
      self.block.setPosition (aq.config.BLOCK_SIZE * grid_x, grid_y * aq.config.BLOCK_SIZE);

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

