'use strict';

var AXIS_COLLISION            = (1 << 8);
var SLOPE_COLLISION           = (1 << 9);
var FILL_FLAG_SEEN_T1         = (1 << 10);
var FILL_FLAG_SEEN_T2         = (1 << 11);

var NO_COLLISION              = 0;
var GRID_LEFT_EDGE_COLLISION  = 1;
var GRID_RIGHT_EDGE_COLLISION = 2;
var GRID_BOTTOM_COLLISION     = 3;

var FILL_LEFT                 = (1 << 0);
var FILL_RIGHT                = (1 << 1);
var FILL_UP                   = (1 << 2);
var FILL_DOWN                 = (1 << 3);

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

   // grid break highlight position
   grid_break_highlights: null,

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

   // tmp 1 cell block for collision testing
   tmpBlock: null,

   ctor: function (wide, high) {
      var self = this;

      // 1. super init first
      self._super ();

      self.blocks_wide = wide;
      self.blocks_high = high;

      self.game_grid = new Array (wide * high * 2);

      self.block_list = [];

      self.tmpBlock = new aq.Block (3);

      // Add the grid outline
      self.addChild (self.createLineGridNode ());

      self.grid_pos_highlight = new cc.DrawNode ();
      self.grid_collision_squares = new cc.DrawNode ();
      self.grid_break_highlights = new cc.Node ();

      self.addChild (self.grid_pos_highlight);
      self.addChild (self.grid_collision_squares);
      self.addChild (self.grid_break_highlights, 500);

      self.scheduleUpdate ();
   },

   update: function () {
      var self = this;

      if (self.falling_block) {

         var bounds = self.falling_block.getTileBounds ();

         var grid_size = self.falling_block.getGridSize ();

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
                   tile = aq.Block.TILE_DATA [(d >> 24) & 0xff];
                   aq.drawTri (node, 0, 0, (d & 0x0f), cc.color (tile.color));
                }

                if ((d & 0xf0) !== 0) {
                   tile = aq.Block.TILE_DATA [(d >> 16) & 0xff];
                   aq.drawTri (node, 0, 0, ((d >> 4) & 0x0f), cc.color (tile.color));
                }

                self.addChild (node);
             }
          }
      }
   },

   getBlockAlignedGridPosition: function (block) {
      // jshint unused:false
      var self = this;

      var pos = block.getPosition ();
      var x = Math.floor (pos.x / aq.config.BLOCK_SIZE) * aq.config.BLOCK_SIZE;
      var y = Math.floor (pos.y / aq.config.BLOCK_SIZE) * aq.config.BLOCK_SIZE;

      return cc.p (x,y);
   },

   getGridIndexPositionsForBlockCollision: function (block, pos, rot) {
      var self = this;

      var tile_num = block.getTileNum ();

      var tile_bounds = block.getTileBounds (rot);

      var x, y;
      var bottom_left_index = self.getGridIndexForPoint (pos);

      var block_size = aq.config.BLOCK_SIZE;

      var indexes = [];

      var tile = aq.Block.getTileDataForNum (tile_num);
      var grid_size = tile.grid_size;

      var tile_cells_wide = tile_bounds.right - tile_bounds.left;
      var grid_dx = tile_cells_wide;

      var tile_cells_high = tile_bounds.top - tile_bounds.bottom;
      var grid_dy = tile_cells_high;

      // add 1 to the width and height to cover the block overlapping grid cells horizontally
      // and vertically in the event the block isn't aligned exactly with the grid
      if (pos.x % block_size !== 0) {
         grid_dx += 1;
      }

      if (pos.y % block_size !== 0) {
         grid_dy += 1;
      }

      for (y = tile_bounds.bottom; y < tile_bounds.bottom + grid_dy; ++y)
      {
         for (x = tile_bounds.left; x < tile_bounds.left + grid_dx; ++x)
         {
            var block_cell = x + ((grid_size - y - 1) * grid_size);

            // push the index directly
            var new_index = (bottom_left_index + x) + (y * self.blocks_wide);
            indexes.push ( {
               block_cell: block_cell,
               grid_index: new_index
            });
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

   highlightBlockCells: function (block) {
       var self = this;

       if (!block) {
          return;
       }

       var block_size = aq.config.BLOCK_SIZE;
       var indexes = self.getGridIndexPositionsForBlockCollision (block, block.getPosition (), block.getRotation ());

       // Show the grid squares that collision will be tested for
       self.grid_collision_squares.clear ();
       for (var n = 0; n < indexes.length; n++) {
          var p = self.getGridPositionForIndex (indexes [n].grid_index);
          self.grid_collision_squares.drawRect (p, cc.p (p.x + block_size, p.y + block_size),
                                                cc.color (128,0,0,128));
       }
   },

   /**
    * Test if the given block, at the new position, will collide with the grid left or right boundaries.
    * @return 0 for no collision, 1 for left boundary collision, 2 for right boundary collision, 3 for bottom
    */
   collideBlockWithGridBounds: function (block, new_pos, new_rot) {
       var self = this;

       var bounds = block.getTileBounds (new_rot);

       var block_size = aq.config.BLOCK_SIZE;

       if (new_pos.x + (bounds.left * block_size) < 0) {
          return (GRID_LEFT_EDGE_COLLISION | AXIS_COLLISION);
       }

       if (new_pos.x + (bounds.right * block_size) > (self.blocks_wide * block_size)) {
          return (GRID_RIGHT_EDGE_COLLISION | AXIS_COLLISION);
       }

       if (new_pos.y + (bounds.bottom * block_size) < 0) {
          return (GRID_BOTTOM_COLLISION | AXIS_COLLISION);
       }

       return NO_COLLISION;
   },

   /**
    * Test if the given block, at the new position, will collide with tile/blocks already in
    * the grid.
    * @return 0 for no collision
    *         99 for a collision (other numbers will mean something else in the future)
    */
   collideBlockWithGridData: function (block, new_pos, new_rot) {
      var self = this;

      var moving_obj_cells = block.getTileCells (new_rot);
      var moving_pos = new_pos;

      var collision = NO_COLLISION;

      // Save any collision points
      var collision_points = [];

      // In here, when a collision occurs, we want to augment the input block object
      // with data about where the collision occured, and what type it is

      for (var t = 0; t < moving_obj_cells.length; t++) {
         var cell = moving_obj_cells [t];

         var cell_obj = cell.tile_cell;
         var cell_pos = cc.p (moving_pos.x + (cell.x * aq.config.BLOCK_SIZE), moving_pos.y + (cell.y * aq.config.BLOCK_SIZE));
         self.tmpBlock.setPosition (cell_pos);
         var grid_indexes = self.getGridIndexPositionsForBlockCollision (self.tmpBlock, cell_pos, 0);

         for (var i = 0; i < grid_indexes.length; i++) {

            var grid_block_index = grid_indexes [i].grid_index;
            var grid_block_pos = self.getGridPositionForIndex (grid_block_index);
            var grid_block_obj = (self.getGridDataForIndex (grid_block_index) & 0xff);

            var cell_collision = self.collideCell (
                                    cell_obj, cell_pos.x, cell_pos.y,
                                    grid_block_obj, grid_block_pos.x, grid_block_pos.y);

            if (cell_collision !== NO_COLLISION && block.isCollisionReportingEnabled ()) {
               // Report this collision back to the game code
               var c = {};
               c.cell = cc.clone (cell);
               c.collision = cell_collision;
               c.grid_block_index = grid_block_index;
               c.grid_block_pos = grid_block_pos;
               c.grid_block_obj = grid_block_obj;
               collision_points.push (c);
            }

            collision |= cell_collision;
         }
      }

      if (block.isCollisionReportingEnabled ()) {
         if (collision_points.length > 0) {
            block.collision_points = collision_points;
         } else {
            block.collision_points = null;
         }
      }

      return collision;
   },

   // Test to see if the block can slide in either the left or the right directions.
   // Used speculatively in order to trigger a slide
   slideBlock: function (block) {
       var self = this;

       var can_move_left = false;
       var can_move_right = false;

       var pos = block.getPosition ();

       // Disable block collision reporting
       block.setCollisionReportingEnabled (false);

       var p1, p2;
       var can_move_to = null;

       // Test moving down to the right
       p1 = cc.p (pos.x + half_block_size, pos.y - half_block_size);
       p2 = cc.p (pos.x + (half_block_size * 2), pos.y - (half_block_size * 2));
       var r1 = self.collideBlock (block, p1);
       var r2 = self.collideBlock (block, p2);
       if (!r1 && !r2)
       {
          can_move_right = true;
          can_move_to = p2;
       }

       // test to the left
       p1 = cc.p (pos.x - half_block_size, pos.y - half_block_size);
       p2 = cc.p (pos.x - (half_block_size * 2), pos.y - (half_block_size * 2));
       var l1 = self.collideBlock (block, p1);
       var l2 = self.collideBlock (block, p2);
       if (!l1 && !l2)
       {
          can_move_left = true;
          can_move_to = p2;
       }

       // Make sure the position the block is moving to is grid aligned
       if (can_move_to) {
          can_move_to.x = Math.floor (can_move_to.x / aq.config.BLOCK_SIZE) * aq.config.BLOCK_SIZE;
          can_move_to.y = Math.floor (can_move_to.y / aq.config.BLOCK_SIZE) * aq.config.BLOCK_SIZE;
       }

       block.setCollisionReportingEnabled (true);

       return {
          can_move_left: can_move_left,
          can_move_right: can_move_right,
          can_move_to: can_move_to
       };
   },

   // Test for the appropriate stack breaking scenario
   breakBlock: function (block, new_pos) {
       var self = this;

       if (block.collision_points && block.collision_points.length > 0) {

          // Visualise the break position in the grid
          self.grid_break_highlights.removeAllChildren (true);

          for(var i = 0; i < block.collision_points.length; i++) {
             // For each point in the grid, test the collision point, with the cell/triangle
             // of the block falling.

             var cp = block.collision_points [i];
             cc.log ('grid collision point: ' + cp.grid_block_index + ' triangle_type: ' + cp.grid_block_obj);
             cc.log ('block triangle data:' + cp.cell.tile_cell);

             var grid_cell = cp.grid_block_obj;
             var block_cell = cp.cell.tile_cell;

             // Use aq.isSquareCell and the triangle numbers to test the collision points for the appropriate
             // triangle against flat section collisions that should result in breaking
             // Note. This isn't necessarily a simple scenario, since multiple collision points can be reported
             // by the block


             var highlight = new cc.DrawNode ();
             highlight.drawCircle (cc.p (0,0), 6, 2 * cc.PI, 10, true, 4, cc.color (255,0,255,255));

             var hl_pos = self.getGridPositionForIndex (cp.grid_block_index);    // this is the cell bottom left
             hl_pos.y += aq.config.BLOCK_SIZE;      // collision point will always be at the top of the cell

             if (aq.isSingleTriangleCell (cp.grid_block_obj, 1)) {
                // Collision point can only be the top left of the cell

             } else if (aq.isSingleTriangleCell (cp.grid_block_obj, 4)) {
                // Collision point can only be the top right
                hl_pos.x += aq.config.BLOCK_SIZE;
             } else {
                // The grid cell is either a triangle type 2 or 3 (with solid top edge), or a square, again
                // with a solid top edge.  So we have to look at the falling block to determine the collision
                // point
                highlight.clear ();
                highlight.drawSegment (cc.p(0,0), cc.p (aq.config.BLOCK_SIZE, 0), 4, cc.color (0,255,0,255));

                // TODO: Determine left or right position of the break
             }

             highlight.setPosition (hl_pos);

             self.grid_break_highlights.addChild (highlight);

          }
       }

       return false;
   },

   /**
    * Tests for the general collision case.  Will be expanded to account for all sorts of collisions.
    * @return 0 for no collision.
    *         1 for a left boundary collision
    *         2 for a right boundry collision
    *         3 for a bottom boundary (game grid baseline)
    *         99 for a collision with an existing block in the grid
    *
    *         Each value is also ORed with either AXIS_COLLISION or SLOPE_COLLISION to indicate
    *         the collision type.  AND with 0xff to remove that.
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
      if (bounds_collision !== NO_COLLISION) {
         return bounds_collision;
      }

      var grid_data_collision = self.collideBlockWithGridData (block, new_pos, new_rot);
      if (grid_data_collision !== NO_COLLISION) {
         return grid_data_collision;
      }

      return NO_COLLISION;
   },

   /**
    * A rewrite of my old CollideObjects function, that takes two single grid cell sized
    * objects and performs the collision testing.
    */
   collideCell: function (moving_obj, moving_pos_x, moving_pos_y,
                             grid_obj, grid_pos_x, grid_pos_y) {

       var self = this;

       var collision = NO_COLLISION;

       if (grid_obj === 0) {
          return collision;
       }

       if (moving_obj === 0) {
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

             if (aq.isSquareCell (moving_obj) && aq.isSquareCell (grid_obj))
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

                if (aq.isSquareCell (moving_obj))
                {
                   collision = self.collideSquareWithTriangle (px, py, grid_obj, grid_pos_x, grid_pos_y, moving_pos_x, moving_pos_y);
                }
                else if (aq.isSquareCell(grid_obj))
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

       var block_index = self.getGridIndexForNode (block);
       var top_left = block_index + ((grid_size - 1) * self.blocks_wide);

       var fixed_block_pos = self.getBlockAlignedGridPosition (block);

       block.setPosition (fixed_block_pos);

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
   },

   fillParent: null,
   fillGroups: null,
   fillGroupCount: 0,

   // Take the fillGroups array, and create a set of Block objects for rendering, each one added
   // to the fillParent node so we can dispose of them all in one go as appropriate
   renderFilledCells: function () {
       var self = this;

       if (!self.fillGroups || self.fillGroups.length === 0) {
          return;
       }

       // Clear any existing blocks
       if (self.fillParent) {
          self.fillParent.removeAllChildren (true);
       } else {
          // Allova
          self.fillParent = new cc.Node ();
          self.addChild (self.fillParent);
       }

       self.fillGroupCount = self.fillGroups.length;

       for (var fillIndex = 0; fillIndex < self.fillGroups.length; fillIndex++) {
          var block = self.createBlockFromTileDataGroup(fillIndex);
          self.fillParent.addChild (block);
       }
   },

   // Given a combined cell 'group', make a Block object, like the predefined tiles within Block.js
   // but using the generated block data from the grid.
   createBlockFromTileDataGroup: function (group) {
       var self = this;

       var tile_num = self.fillGroups [group].tile_num;
       var cells = self.fillGroups [group].cells;

       var tile_data = {
          'id': 'group' + group,
          'flags': 'active',
          'color': aq.Block.TILE_DATA [tile_num].color,
          'anchors': [[0,0]]
       };

       // Work out the cell extents
       var min_x, min_y, max_x, max_y, i, grid_pos, x, y;

       min_x = min_y = self.blocks_wide * 10;
       max_x = max_y = 0;

       for (i = 0; i < cells.length; i++) {
          grid_pos = cells [i].grid_pos;
          x = grid_pos % self.blocks_wide;
          y = Math.floor (grid_pos / self.blocks_wide);
          max_x = x > max_x ? x : max_x;
          min_x = x < min_x ? x : min_x;
          max_y = y > max_y ? y : max_y;
          min_y = y < min_y ? y : min_y;
       }

       var w = max_x - min_x + 1;
       var h = max_y - min_y + 1;

       tile_data.grid_size = w > h ? w : h;

       // Fill a grid_data array with empty zeros
       var grid_offset = (min_y * self.blocks_wide) + min_x;
       var grid_data = [];
       for (i = 0; i < tile_data.grid_size * tile_data.grid_size; i++) {
          grid_data [i] = 0;
       }

       // Now insert all the triangle data for the group into the grid_data array
       for (i = 0; i < cells.length; i++) {
          grid_pos = cells [i].grid_pos - grid_offset;
          x = grid_pos % self.blocks_wide;
          y = Math.floor (grid_pos / self.blocks_wide);
          y = tile_data.grid_size - (y + 1);
          var tile_grid_pos = (y * tile_data.grid_size) + x;
          grid_data[tile_grid_pos] = cells[i].cell_data;
       }

       // Add the grid_data to the tile_data
       tile_data.grid_data = [];
       tile_data.grid_data [0] = grid_data;

       // Create a block from this tile_data for returning
       var block = new aq.Block (-1, tile_data);
       block.setPosition (min_x * aq.config.BLOCK_SIZE, min_y * aq.config.BLOCK_SIZE);

       return block;
   },

   groupFloodFill: function () {
       var self = this;

       // grid_pos is index into self.game_grid for the current cell
       // direction is direction from the caller
       var floodFill = function (grid_pos, direction_from, group_from) {

          var tile_num_from = group_from.tile_num;
          var x = grid_pos % self.blocks_wide;
          var y = Math.floor (grid_pos / self.blocks_wide);

          var fillOutwards = function (triangle_type) {

             // If the cell is not entered from above (UP), then we can recurse
             // in the up direction.  Passing DOWN as the direction_from, and
             // "grid_pos + self.blocks_wide" to get the grid index for one
             // row above

             if ((direction_from & FILL_UP) === 0 && y < self.blocks_high - 1) {
                if (triangle_type === -1 || triangle_type === 2 || triangle_type === 3) {
                   floodFill (grid_pos + self.blocks_wide, FILL_DOWN, group_from);
                }
             }

             if ((direction_from & FILL_RIGHT) === 0 && x < self.blocks_wide - 1) {
                if (triangle_type === -1 || triangle_type === 3 || triangle_type === 4) {
                   floodFill (grid_pos + 1, FILL_LEFT, group_from);
                }
             }

             if ((direction_from & FILL_LEFT) === 0 && x > 0) {
                if (triangle_type === -1 || triangle_type === 1 || triangle_type === 2) {
                   floodFill (grid_pos - 1, FILL_RIGHT, group_from);
                }
             }

             if ((direction_from & FILL_DOWN) === 0 && y > 0) {
                if (triangle_type === -1 || triangle_type === 1 || triangle_type === 4) {
                   floodFill (grid_pos - self.blocks_wide, FILL_UP, group_from);
                }
             }
          };

          // Early bail out for empty cell
          if ((self.game_grid [grid_pos] && 0xff) === 0) {
             self.game_grid [grid_pos] |= (FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2);
             return;
          }

          // Test for a solid square block at this cell position
          if (aq.isSquareCell (self.game_grid [grid_pos])) {
             // and both triangles belong to the same tile
             var t1 = (self.game_grid [grid_pos] >> 24) & 0xff;
             var t2 = (self.game_grid [grid_pos] >> 16) & 0xff;

             if (t1 === t2) {
                // and the tile matches our current group
                if (tile_num_from === t1) {     // could also use t2, they're the same

                   // Bail out if already seen
                   if ((self.game_grid [grid_pos] & (FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2)) === (FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2)) {
                      return;
                   }

                   // push the square cell data onto the current group
                   group_from.cells.push ({
                      grid_pos: grid_pos,
                      cell_data: (self.game_grid [grid_pos] & 0xff)
                   });

                   // Mark the cell fully seen
                   self.game_grid [grid_pos] |= (FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2);

                   // Fill outwards from this cell
                   fillOutwards (-1);

                   return;
                }
             }
          }

          // Each entry into flood fill has to check both t1 and t2 triangle
          // locations within the grid position
          for (var i = 0; i < 2; i++) {

             // For comparison purposes, shift the bits as necessary into a single variable
             var triangle_type = (self.game_grid [grid_pos] >> (i * 4)) & 0x0f;
             var tile_num = (self.game_grid [grid_pos] >> (24 - (i * 8))) & 0x0f;

             // If the fill routine has been through this grid cell and triangle location already, bail out
             if ((self.game_grid [grid_pos] & (FILL_FLAG_SEEN_T1 << i)) !== 0) {
                continue;
             }

             // If the tile_num at this location doesn't match tile_num_from, bail out
             if (tile_num_from !== -1 && tile_num_from !== tile_num) {
                continue;
             }

             // Check for appropriate triangle type given the direction of filling
             if ((direction_from & FILL_UP) !== 0 && (triangle_type === 1 || triangle_type === 4)) {
                continue;
             }
             if ((direction_from & FILL_RIGHT) !== 0 && (triangle_type === 1 || triangle_type === 2)) {
                continue;
             }
             if ((direction_from & FILL_LEFT) !== 0 && (triangle_type === 3 || triangle_type === 4)) {
                continue;
             }
             if ((direction_from & FILL_DOWN) !== 0 && (triangle_type === 2 || triangle_type === 3)) {
                continue;
             }

             // Set the triangle to render if it's not empty
             if (triangle_type !== 0) {
                group_from.cells.push ({
                   grid_pos: grid_pos,
                   cell_data: triangle_type
                });
             }

             // Mark the triangle position (t1 or t2) as seen
             self.game_grid [grid_pos] |= (FILL_FLAG_SEEN_T1 << i);

             // Fill outwards from this cell
             fillOutwards (triangle_type);
          }
       };

       self.fillGroups = [];

       var i;

       // Clear the floodfill bits in the game_grid
       for (i = 0; i < self.game_grid.length; i++) {
          self.game_grid [i] &= ~(FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2);
       }

       for (i = 0; i < self.game_grid.length; i++) {
          if ((self.game_grid [i] & 0xff) !== 0) {
             for (var t = 0; t < 2; t++) {

                // For comparison purposes, shift the bits as necessary into a single variable
                var tile_num = (self.game_grid [i] >> (24 - (t * 8))) & 0x0f;

                if ((self.game_grid [i] & (FILL_FLAG_SEEN_T1 << t)) === 0) {
                   var newGroup = {
                      tile_num: tile_num,
                      cells: []
                   };
                   floodFill (i, 0, newGroup);
                   if (newGroup.cells.length > 0) {
                      self.fillGroups.push (newGroup);
                   }
                }
             }
          }
       }

       self.renderFilledCells ();
   }
});

