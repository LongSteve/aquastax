'use strict';

var AXIS_COLLISION          = (1 << 8);
var SLOPE_COLLISION         = (1 << 9);

var half_block_size = (aq.config.BLOCK_SIZE / 2);

var triangle_signs = [
   // signx, signy
      1,    1,
      1,    -1,
      -1,   -1,
      -1,   1,
];

var ONE_OVER_SQRT2 = 1.0 / 1.4142135623;

aq.Grid = cc.Node.extend ({

   // num of cell blocks wide
   blocks_wide: 0,

   // number of cell block high
   blocks_high: 0,

   // node for highlighting the current falling block position
   grid_pos_highlight: null,

   // node for collision testing visualisation
   grid_collision_squares: null,

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
      self.grid_collision_squares = new cc.DrawNode ();

      self.addChild (self.grid_pos_highlight);
      self.addChild (self.grid_collision_squares);

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

         var bx = bounds.bottom * block_size;
         self.grid_pos_highlight.drawRect (cc.p(0,bx),cc.p(block_size*grid_size,bx),
                                           null, // fill color
                                           4,
                                           cc.color (128,128,0,255));

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

   getGridIndexPositionsForBlockCollision: function (block, pos, rot) {

      var self = this;
      var tile_num = block.getTileNum ();

      return self.getGridIndexPositionsForTileAndRotation (tile_num, rot, pos);
   },

   getGridIndexPositionsForTileAndRotation: function (tile_num, rot, pos) {
      var self = this;

      var tile_bounds = aq.getTileBounds (tile_num, rot);

      var x, y;
      var bottom_left_index = self.getGridIndexForPoint (pos);

      var block_size = aq.config.BLOCK_SIZE;

      var indexes = [];

      var tile = aq.TILE_DATA [tile_num];
      var grid_size = tile.grid_size;

      var tile_cells_wide = tile_bounds.right - tile_bounds.left;
      var grid_dx = tile_cells_wide + 1 + tile_bounds.left;

      // add 1 to the width to cover the block overlapping grid cells horizontally
      for (y = 0; y < grid_size; ++y)
      {
         for (x = 0; x < grid_dx; ++x)
         {
            var block_cell = x + ((grid_size - y - 1) * grid_size);
            //if (tile.grid_data[rot][block_cell] !== 0) {

               // push the index directly
               var new_index = (bottom_left_index + x) + (y * self.blocks_wide);
               indexes.push ( {
                  block_cell: block_cell,
                  grid_index: new_index
               });

               // And one above to cover the block dropping between grid rows
               if (new_index + self.blocks_wide < self.game_grid.length) {
                  indexes.push ({
                     block_cell: block_cell,
                     grid_index: new_index + self.blocks_wide
                  });
               }
            //}
         }
      }

      return indexes;
   },

   getGridIndexForPoint: function (p) {
       var self = this;
       var y = Math.floor (p.y / aq.config.BLOCK_SIZE);
       var x = Math.floor (p.x / aq.config.BLOCK_SIZE);
       var i = (y * self.blocks_wide) + x;
       return i;
   },

   getGridIndexForNode: function (node) {
      var self = this;
      return self.getGridIndexForPoint (node.getPosition ());
   },

   getGridDataForIndex: function (index) {
      var self = this;
      return self.game_grid [index];
   },

   getGridPositionForIndex: function (index) {
       var self = this;

       var bx = index % self.blocks_wide;
       var by = Math.floor (index / self.blocks_wide);

       var pos = cc.p (bx * aq.config.BLOCK_SIZE, by * aq.config.BLOCK_SIZE);

       return pos;
   },

   getGridPositionForPoint: function (p) {
       var self = this;
       var index = self.getGridIndexForPoint (p);
       return self.getGridPositionForIndex (index);
   },

   getGridPositionForNode: function (node) {
      var self = this;
      return self.getGridPositionForPoint (node.getPosition ());
   },

   isPositionWithinGrid: function (point) {
      var self = this;

      if (point.x < 0 || point.x >= self.blocks_wide * aq.config.BLOCK_SIZE) {
         return false;
      }

      return true;
   },

   /**
    * Test if the given block, at the new position, will collide with the grid left or right boundaries.
    * @return 0 for no collision, 1 for left boundary collision, -1 for right boundary collision, 2 for bottom
    */
   collideBlockWithGridBounds: function (block, new_pos, new_rot) {
       var self = this;

       var tile_num = block.getTileNum ();
       var bounds = aq.getTileBounds (tile_num, new_rot);

       var block_size = aq.config.BLOCK_SIZE;

       if (new_pos.x + (bounds.left * block_size) < 0) {
          return 1;
       }

       if (new_pos.x + (bounds.right * block_size) > (self.blocks_wide * block_size)) {
          return -1;
       }

       if (new_pos.y + (bounds.bottom * block_size) < 0) {
          return 2;
       }

       return 0;
   },

   /**
    * Test if the given block, at the new position, will collide with tile/blocks already in
    * the grid.
    * @return 0 for no collision
    *         99 for a collision (other numbers will mean something else in the future)
    */
   collideBlockWithGridData: function (block, new_pos, new_rot) {
      var self = this;

      var block_size = aq.config.BLOCK_SIZE;
      var indexes = self.getGridIndexPositionsForBlockCollision (block, new_pos, new_rot);

      // Show the grid squares that collision will be tested for
      self.grid_collision_squares.clear ();
      for (var n = 0; n < indexes.length; n++) {
         var p = self.getGridPositionForIndex (indexes [n].grid_index);
         self.grid_collision_squares.drawRect (p, cc.p (p.x + block_size, p.y + block_size),
                                               cc.color (128,0,0,128));
      }

      var tile = aq.TILE_DATA [block.tile_num];
      var tile_grid_data = tile.grid_data [block.rot];

      for (var i = 0; i < indexes.length; i++) {
         var grid_index = indexes [i].grid_index;
         var block_cell = indexes [i].block_cell;

         if (grid_index < 0 || grid_index >= self.game_grid.length) {
            continue;
         }

         // cell data within the grid to collision test
         var grid_block_data = self.game_grid [grid_index];

         if (typeof (grid_block_data) !== 'number') {
            continue;
         }

         var isSquareCell = function (c) {
            return (((c & 0xff) === 0x31) || ((c & 0xff) === 0x13) || ((c & 0xff) === 0x24) || ((c & 0xff) === 0x42));
         };

         // cell data within the falling block at the position overlapping the grid cell
         var falling_block_cell_data = tile_grid_data [block_cell];

         if (isSquareCell (falling_block_cell_data) && isSquareCell (grid_block_data)) {
            return 99;
         }

         var t1 = (falling_block_cell_data & 0x0f);
         var t2 = (grid_block_data & 0x0f);
         if (aq.checkForCellTriangleOverlap (t1, t2)) {
            return 99;
         }

         t1 = (falling_block_cell_data & 0xf0) >> 4;
         t2 = (grid_block_data & 0xf0) >> 4;
         if (aq.checkForCellTriangleOverlap (t1, t2)) {
            return 99;
         }

         t1 = (falling_block_cell_data & 0x0f);
         t2 = (grid_block_data & 0xf0) >> 4;
         if (aq.checkForCellTriangleOverlap (t1, t2)) {
            return 99;
         }

         t1 = (falling_block_cell_data & 0xf0) >> 4;
         t2 = (grid_block_data & 0x0f);
         if (aq.checkForCellTriangleOverlap (t1, t2)) {
            return 99;
         }
      }

      return 0;
   },

   /**
    * Tests for the general collision case.  Will be expanded to account for all sorts of collisions.
    * @return 0 for no collision.
    *         1 for a left boundary collision
    *         -1 for a right boundry collision
    *         2 for a bottom boundary (game grid baseline)
    *         99 for a collision with an existing block in the grid
    */
   collideBlock: function (block, new_pos, new_rot) {
      var self = this;

      if (!new_pos) {
         new_pos = block.getPosition ();
      }

      if (typeof (new_rot) === 'undefined') {
         new_rot = block.getRotation ();
      }

      var bounds_collision = self.collideBlockWithGridBounds (block, new_pos, new_rot);
      if (bounds_collision !== 0) {
         return bounds_collision;
      }

      var grid_data_collision = self.collideBlockWithGridData (block, new_pos, new_rot);
      if (grid_data_collision !== 0) {
         return grid_data_collision;
      }

      return 0;
   },

   /**
    * A rewrite of my old CollideObjects function, that takes two single grid cell sized
    * objects (blocks) and performs the collision testing.
    */
   collideObjects: function (moving_obj, moving_pos_x, moving_pos_y,
                             grid_obj, grid_pos_x, grid_pos_y) {

       var self = this;

       var collision = 0;

       if (grid_obj === 0) {
          return collision;
       }

       var abs = function abs (x) {
          return x < 0 ? -x : x;
       };

       // Boundary box checking first
       var tx = grid_pos_x;
       var ty = grid_pos_y;
       var txw = half_block_size;
       var tyw = half_block_size;

       var dx = moving_pos_x - tx;                        // tile->obj delta
       var px = (txw + half_block_size + 0.5) - abs (dx); // penetration depth in x

       if(0 < px)
       {
          var dy = moving_pos_y - ty;                    // tile->obj delta
          var py = (tyw + half_block_size) - abs (dy);   // pen depth in y

          if (0 < py)
          {
             // object may be colliding with tile; call the shape specific collision function
             // calculate projection vectors
             if (px < py)
             {
                // project in x
                if (dx < 0)
                {
                   // project to the left
                   px *= -1;
                   py = 0;
                }
                else
                {
                   // proj to right
                   py = 0;
                }
             }
             else
             {
                // project in y
                if (dy < 0)
                {
                   // project up
                   px = 0;
                   py *= -1;
                }
                else
                {
                   // project down
                   px = 0;
                }
             }

             var square = function (c) {
                return (((c & 0xff) === 0x31) || ((c & 0xff) === 0x13) || ((c & 0xff) === 0x24) || ((c & 0xff) === 0x42));
             };

             if (square (moving_obj) && square (grid_obj))
             {
                //
                // Handle 2 squares colliding
                //

                collision = AXIS_COLLISION;
             }
             else
             {
                //
                // Handle triangle collision

                if (square (moving_obj))
                {
                   collision = self.collideSquareWithTriangle (px, py, grid_obj, grid_pos_x, grid_pos_y, moving_pos_x, moving_pos_y);
                }
                else if (square(grid_obj))
                {
                   collision = self.collideSquareWithTriangle (px, py, moving_obj, moving_pos_x, moving_pos_y, grid_pos_x, grid_pos_y);
                }
                else
                {
                   collision = self.collideTriangleWithTriangle(px, py, moving_obj, moving_pos_x, moving_pos_y,
                                                                        grid_obj, grid_pos_x, grid_pos_y);
                }
             }
          }
       }

       return collision;
   },

   collideSquareWithTriangle: function (x, y, fixed_triangle, triangle_x, triangle_y, square_x, square_y) {

       var self = this;

       var ox, oy;

       var triangle_type = (((fixed_triangle >> 4) & 0xf) !== 0) ? ((fixed_triangle >> 4) & 0xf) : (fixed_triangle & 0xf);
       var triangle_signx = triangle_signs[(triangle_type-1)<<1];
       var triangle_signy = triangle_signs[((triangle_type-1)<<1) + 1];
       var triangle_sx = triangle_signx * ONE_OVER_SQRT2;
       var triangle_sy = triangle_signy * ONE_OVER_SQRT2;

       var xw = half_block_size;
       var yw = half_block_size;

       ox = (square_x - (triangle_signx * xw)) - triangle_x;   // triangle gives us the coordinates of the innermost
       oy = (square_y - (triangle_signy * yw)) - triangle_y;   // point on the AABB, relative to the tile center

       var dp = (ox * triangle_sx) + (oy * triangle_sy);

       // if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
       // and we need to project it out by the magnitude of the projection of (ox,oy) onto (sx,sy)

       if (dp < 0)
       {
          var isx, isy;

          isx = -(triangle_sx * -dp);
          isy = -(triangle_sy * -dp);

          var lenN = (isx * isx) + (isy * isy);
          var lenP = (x * x) + (y * y);

          if (lenP < lenN)
          {
             return AXIS_COLLISION;
          }
          else
          {
             return SLOPE_COLLISION;
          }
       }

       return 0;
   },

   collideTriangleWithTriangle: function (x, y, moving_triangle, moving_triangle_x, moving_triangle_y,
                                                fixed_triangle, fixed_triangle_x, fixed_triangle_y)
   {
      var moving_triangle_type = (((moving_triangle >> 4) & 0xf) !== 0) ? ((moving_triangle >> 4) & 0xf) : (moving_triangle & 0xf);
      var moving_triangle_signx = triangle_signs[(moving_triangle_type-1)<<1];
      var moving_triangle_signy = triangle_signs[((moving_triangle_type-1)<<1) + 1];
      var moving_triangle_sx = moving_triangle_signx * ONE_OVER_SQRT2;
      var moving_triangle_sy = moving_triangle_signy * ONE_OVER_SQRT2;

      var fixed_triangle_type = (((fixed_triangle >> 4) & 0xf) !== 0) ? ((fixed_triangle >> 4) & 0xf) : (fixed_triangle & 0xf);
      var fixed_triangle_signx = triangle_signs[(fixed_triangle_type-1)<<1];
      var fixed_triangle_signy = triangle_signs[((fixed_triangle_type-1)<<1) + 1];
      var fixed_triangle_sx = fixed_triangle_signx * ONE_OVER_SQRT2;
      var fixed_triangle_sy = fixed_triangle_signy * ONE_OVER_SQRT2;

      var xw = half_block_size;
      var yw = half_block_size;

      var ox, oy;

      if (fixed_triangle_signx === -moving_triangle_signx && fixed_triangle_signy === -moving_triangle_signy)
      {
         // The the two triangles are orientated the opposite ways, we test from the center
         ox = fixed_triangle_x - moving_triangle_x;
         oy = fixed_triangle_y - moving_triangle_y;
      }
      else
      {
         ox = (fixed_triangle_x - (moving_triangle_signx * xw)) - moving_triangle_x;  // this gives us the coordinates of the innermost
         oy = (fixed_triangle_y - (moving_triangle_signy * yw)) - moving_triangle_y;  // point on the AABB, relative to the tile center
      }

      var dp = (ox * moving_triangle_sx) + (oy * moving_triangle_sy);

      // if the dotprod of (ox,oy) and (sx,sy) is negative, the corner is in the slope
      // and we need to project it out by the magnitude of the projection of (ox,oy) onto (sx,sy)

      if (dp < 0)
      {

         if (fixed_triangle_signx === -moving_triangle_signx && fixed_triangle_signy === -moving_triangle_signy)
         {
            // The the two triangles are orientated the opposite ways, we test from the center
            ox = moving_triangle_x - fixed_triangle_x;
            oy = moving_triangle_y - fixed_triangle_y;
         }
         else
         {
            ox = (moving_triangle_x - (fixed_triangle_signx * xw)) - fixed_triangle_x;   // this gives us the coordinates of the innermost
            oy = (moving_triangle_y - (fixed_triangle_signy * yw)) - fixed_triangle_y;   // point on the AABB, relative to the tile center
         }

         var dp1 = (ox * fixed_triangle_sx) + (oy * fixed_triangle_sy);

         if (dp1 < 0)
         {
            var isxa, isya, isxb, isyb, isx, isy;

            // Pick the shorter of the two projection vectors
            isxa = (moving_triangle_sx * -dp);
            isya = (moving_triangle_sy * -dp);

            isxb = (fixed_triangle_sx * -dp1);
            isyb = (fixed_triangle_sy * -dp1);

            var lenA = (isxa * isxa) + (isya * isya);
            var lenB = (isxb * isxb) + (isyb * isyb);

            // collision; project delta onto slope and use this to displace the object
            if (lenA < lenB)
            {
               // if the vector is our own, negate it for the other object
               isx = -isxa;
               isy = -isya;
            }
            else
            {
               isx = isxb;
               isy = isyb;
            }

            var lenN = (isx * isx) + (isy * isy);
            var lenP = (x * x) + (y * y);

            if (lenP < lenN)
            {
               return AXIS_COLLISION;
            }
            else
            {
               return SLOPE_COLLISION;
            }
         }
      }

      return 0;
   },

   // Take a block that's been falling or moving around and insert it's data into the grid.
   // Also save the block reference in the block_list array.
   insertBlockIntoGrid: function (block) {

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

