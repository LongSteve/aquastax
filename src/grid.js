'use strict';

aq.Grid = cc.Node.extend ({

   // num of cell blocks wide
   blocks_wide: 0,

   // number of cell block high
   blocks_high: 0,

   // node for highlighting the current falling block position
   grid_pos_highlight: null,

   // Reference to the currently falling block
   falling_block: null,

   // The game grid is an single dimensional array of ints, starting at 0 bottom left.
   // Each entry uses the following bit pattern:
   //
   // 31            23            15         7    3    0
   // | t1 tile num | t2 tile num | flags    | t2 | t1
   //
   game_grid: null,

   // list of blocks inserted into the grid (using collideBlock)
   block_list: null,

   ctor: function (wide, high) {
      var self = this;

      // 1. super init first
      self._super ();

      self.blocks_wide = wide;
      self.blocks_high = high;

      self.game_grid = new Array (wide * high * 2);

      self.block_list = [];

      // Add the grid outline
      self.addChild (self.createLineGridNode ());

      self.grid_pos_highlight = new cc.DrawNode ();

      self.addChild (self.grid_pos_highlight);

      self.scheduleUpdate ();
   },

   update: function () {
      var self = this;

      if (self.falling_block) {

         var tile_num = self.falling_block.getTileNum ();
         var tile_rotation = self.falling_block.getRotation ();
         var grid_size = aq.TILE_DATA [tile_num].grid_size;
         var bounds = aq.getTileBounds (tile_num, tile_rotation);

         var block_size = aq.config.BLOCK_SIZE;

         // clear the drawnode
         self.grid_pos_highlight.clear ();

         // Add in the geometry for a rectangle to highlight the block grid position
         self.grid_pos_highlight.drawRect (cc.p (0,0), cc.p (block_size * grid_size, block_size * grid_size),
                                           null, // fillcolor
                                           2,    // line width
                                           cc.color (0,255,0,255));

         // render the tile boundaries
         var lx = bounds.left * block_size;
         self.grid_pos_highlight.drawRect (cc.p(lx,0),cc.p(lx,block_size*grid_size),
                                           null, // fill color
                                           4,
                                           cc.color (0,0,255,255));

         var rx = bounds.right * block_size;
         self.grid_pos_highlight.drawRect (cc.p(rx,0),cc.p(rx,block_size*grid_size),
                                           null, // fill color
                                           4,
                                           cc.color (0,128,128,255));

         /*
         var corners = [
               cc.p (0, 0),
               cc.p (0, block_size),
               cc.p (block_size, block_size),
               cc.p (block_size, 0)
            ];

         self.grid_pos_highlight.drawPoly (corners, cc.color (255,255,255,255), 4, cc.color (255,255,255,255));
         */

         var pos = self.getGridPositionForNode (self.falling_block);
         self.grid_pos_highlight.setPosition (pos);
      }
   },

   setFallingBlock: function (node) {
      var self = this;
      self.falling_block = node;
   },

   // Create a cc.DrawNode for the red grid outline, useful for debug (for now)
   createLineGridNode: function () {
      var self = this;

      var block_size = aq.config.BLOCK_SIZE;

      var drawNode = new cc.DrawNode ();

      var p1, p2;
      for (var x = 0; x <= self.blocks_wide * block_size; x += block_size) {

         p1 = cc.p (x,0);
         p2 = cc.p (x, (self.blocks_high * block_size));
         drawNode.drawSegment (p1, p2, 1, cc.color.white);
      }

      for (var y = 0; y <= self.blocks_high * block_size; y += block_size) {

         p1 = cc.p (0, y);
         p2 = cc.p (0 + (self.blocks_wide * block_size), y);
         drawNode.drawSegment (p1, p2, 1, cc.color.white);
      }
      return drawNode;
   },

   // Creates a set of cc.DrawNode objects from the game_grid data array.
   // Adds these nodes to the grid node.  (Not currently used)
   createGridBlockNodes: function () {
       var self = this;

       var block_size = aq.config.BLOCK_SIZE;

       var tile;
       var p = 0;

       for (var y = 0; y < self.blocks_high * block_size; y += block_size) {
          for (var x = 0; x < self.blocks_wide * block_size; x += block_size, p++) {
             var d = self.game_grid [p];
             if (d !== 0) {

                var node = new cc.DrawNode ();
                node.x = x;
                node.y = y;

                if ((d & 0x0f) !== 0) {
                   tile = aq.TILE_DATA [(d >> 24) & 0xff];
                   aq.drawTri (node, 0, 0, (d & 0x0f), cc.color (tile.color));
                }

                if ((d & 0xf0) !== 0) {
                   tile = aq.TILE_DATA [(d >> 16) & 0xff];
                   aq.drawTri (node, 0, 0, ((d >> 4) & 0x0f), cc.color (tile.color));
                }

                self.addChild (node);
             }
          }
      }
   },

   getGridIndexForNode: function (node) {
      var self = this;
      var y = Math.floor (node.y / aq.config.BLOCK_SIZE);
      var x = Math.floor (node.x / aq.config.BLOCK_SIZE);
      var i = (y * self.blocks_wide) + x;
      return i;
   },

   getGridPositionForNode: function (node) {
      var self = this;
      var index = self.getGridIndexForNode (node);

      var bx = index % self.blocks_wide;
      var by = Math.floor (index / self.blocks_wide);

      var pos = cc.p (bx * aq.config.BLOCK_SIZE, by * aq.config.BLOCK_SIZE);

      return pos;
   },

   isPositionWithinGrid: function (point) {
      var self = this;

      if (point.x < 0 || point.x >= self.blocks_wide * aq.config.BLOCK_SIZE) {
         return false;
      }

      return true;
   },

   /**
    * Test if the given block, at the new position, will collide with the grid boundary.
    * @return true if collision occurs, false otherwise
    */
   collideBlockWithGridBounds: function (block, new_pos, new_rot) {
       var self = this;

       if (!new_pos) {
          new_pos = block.getPosition ();
       }

       if (typeof (new_rot) === 'undefined') {
          new_rot = block.getRotation ();
       }

       // TODO: Implement this function using aq.getTileBounds
       // Also see AquaStax.java line 9765

       var tile_num = block.getTileNum ();
       var bounds = aq.getTileBounds (tile_num, new_rot);

       var block_size = aq.config.BLOCK_SIZE;

       if (new_pos.x + (bounds.left * block_size) < 0) {
          return true;
       }

       if (new_pos.x + (bounds.right * block_size) > (self.blocks_wide * block_size)) {
          return true;
       }

       return false;
   },

   // Take a block that's been falling or moving around and insert it's data into the grid.
   // Also save the block reference in the block_list array.
   collideBlock: function (block) {

       var self = this;

       self.block_list.push (block);

       var tile_data = block.getTileData ();
       var grid_size = tile_data.grid_size;

       var top_left = self.getGridIndexForNode (block) + ((grid_size - 1) * self.blocks_wide);

       var x,y;

       var game_grid = self.game_grid;

       // set the position in the grid to the collision
       for (y = 0; y < grid_size; y++)
       {
          for (x = 0; x < grid_size; x++)
          {
             var grid_pos = top_left - (y * self.blocks_wide) + x;

             if (grid_pos < 0) {
                continue;
             }

             var block_pos = x + (y * grid_size);

             var block_grid_pos = tile_data.grid_data [block.rot][block_pos];

             var tile_num = block.getTileNum ();

             if (block_grid_pos !== 0)
             {
                if ((block_grid_pos & 0x0f) !== 0)
                {
                   if ((game_grid[grid_pos] & 0x0f) === 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | (block_grid_pos & 0x0f) | (tile_num << 24);     // insert as t1
                   }
                   else if ((game_grid[grid_pos] & 0xf0) === 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | ((block_grid_pos<<4) & 0xf0) | (tile_num << 16);   // insert as t2
                   }
                }

                if ((block_grid_pos & 0xf0) !== 0)
                {
                   if ((game_grid[grid_pos] & 0x0f) === 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | ((block_grid_pos>>4) & 0x0f) | (tile_num << 24);   // insert as t1
                   }
                   else if ((game_grid[grid_pos] & 0xf0) === 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | (block_grid_pos & 0xf0) | (tile_num << 16);  // insert as t2
                   }
                }
             }
          }
       }
   }
});

