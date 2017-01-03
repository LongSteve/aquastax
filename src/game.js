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

         var block_size = aq.config.BLOCK_SIZE;
         self.mouseHighlight = new cc.DrawNode ();
         self.mouseHighlight.drawRect (cc.p (0,0), cc.p (block_size, block_size),
                                           cc.color (0,255,0,128), // fillcolor
                                           1,    // line width
                                           cc.color (0,255,0,255));

         self.gamePanel.addChild (self.mouseHighlight, 100);
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

   // Mouse position highlight
   mouseHighlight: null,

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

       if (aq.config.MOUSE_MOVE_BLOCK) {
          try {

             // Test if the mouse moves over the falling block
             // TODO: Complete this logic properly.

             var gridPos = self.grid.getGridPositionForPoint (self.mouseGridPos);

             // Get the grid position of the falling block
             var blockPos = self.grid.getGridPositionForPoint (self.block.getPosition ());

             if (blockPos.x === gridPos.x && blockPos.y === gridPos.y) {
                self.mouseHighlight.setPosition (gridPos);
                self.mouseHighlight.setVisible (true);
             } else {
                self.mouseHighlight.setVisible (false);
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
       var new_block_position = self.block.getPosition ();
       new_block_position.x += dx;
       if (self.grid.collideBlock (self.block, new_block_position)) {
          // If collision would occur, don't attempt the sideways move
          dx = 0;
       }

       // Test to see if the falling block can move down.
       var new_block_position = self.block.getPosition ();
       new_block_position.y += dy;
       if (self.grid.collideBlock (self.block, new_block_position)) {
          // If the falling block cannot move down, lock it in place
          self.grid.insertBlockIntoGrid (self.block);
          self.newBlock ();
       } else {
          // otherwise, move it
          self.moveBlockBy (dx, dy);
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

   // Create a random new block and add it to the game panel at the top middle
   newBlock: function (type) {
      var self = this;

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var rnd = Math.floor (Math.random () * aq.TILE_DATA.length);
      if (typeof (type) !== 'undefined' && type >= 0 && type <= aq.TILE_DATA.length) {
         rnd = type;
      }

      var spawn_y = aq.config.MOUSE_MOVE_BLOCK ? cc.winSize.height - (block_size * 3) : cc.winSize.height;

      self.block = new aq.Block (rnd);
      self.block.setPosition (block_size * blocks_wide / 2, spawn_y);
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

