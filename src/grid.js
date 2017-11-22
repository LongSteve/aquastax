'use strict';

// Set this to enable various collision debug visualisations
var COLLISION_DEBUGGING       = false;

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

   // count of cells in the grid arrays
   grid_cell_count: 0,

   // base y position of the grid, might become different from 'y' if the bottom is clipped
   base_y: 0,

   // node for highlighting the current falling block position
   grid_pos_highlight: null,

   // node for collision testing visualisation
   grid_collision_squares: null,

   // grid break highlight position
   grid_break_highlights: null,

   // Temporary holder for a gumbler sprite
   tmp_sprite: null,

   // Reference to the currently falling block
   falling_block: null,

   // Root of a tree of clusters of block nodes (grouped)
   block_root: null,

   // Tmp node for debugging
   tmp_root: null,

   // Base line for debugging the camera movement
   base_line: null,

   // The game grid is an single dimensional array of ints, starting at 0 bottom left.
   // Each entry uses the following bit pattern:
   //
   // 31            23            15         7    3    0
   // | t1 tile num | t2 tile num | flags    | t2 | t1 |
   //
   game_grid: null,

   // A mirror of the game grid that references the groups of objects.  A group is a set of tiles
   // of the same colour.
   // 31           15
   // t1 group num | t2 group num
   group_grid: null,

   // A mirror of the game grid, but that references clusters.  Clusters are similiar to groups
   // but do not take block colour into account, effectively mapping separated clusters of groups.
   // 31           15
   // t1 cluster num | t2 cluster num
   cluster_grid: null,

   // When a block lands, a list of the cluster and group data is maintained
   cluster_list: null,
   group_list: null,

   // Navigation data
   navigation: null,

   // tmp 1 cell block for collision testing
   tmpBlock: null,

   ctor: function (wide, high) {
      var self = this;

      // 1. super init first
      self._super ();

      self.blocks_wide = wide;
      self.blocks_high = high;

      self.grid_cell_count = wide * high * 2;
      self.game_grid = new Array (self.grid_cell_count);
      self.group_grid = new Array (self.grid_cell_count);
      self.cluster_grid = new Array (self.grid_cell_count);

      self.tmpBlock = new aq.Block (false, 3);

      // Add the grid outline
      self.addChild (self.createLineGridNode ());

      // Draw a line for the base of the grid
      self.base_line = new cc.DrawNode ();
      self.base_line.drawSegment (cc.p (-aq.config.BLOCK_SIZE,0), cc.p (aq.config.BLOCK_SIZE * (wide + 2), 0), 2, cc.color.BLUE);
      self.addChild (self.base_line);

      // Create the block root node.  The tree under this root
      // gets re-created by the flood fill routines each time a
      // block lands
      self.block_root = new cc.Node ();
      self.addChild (self.block_root);

      self.tmp_root = new cc.Node ();
      self.addChild (self.tmp_root, 100);

      if (COLLISION_DEBUGGING) {
         self.grid_pos_highlight = new cc.DrawNode();
         self.grid_collision_squares = new cc.DrawNode ();
         self.grid_break_highlights = new cc.Node ();

         self.addChild (self.grid_pos_highlight);
         self.addChild (self.grid_collision_squares);
         self.addChild (self.grid_break_highlights, 500);
      }

      // Navigation
      self.navigation = new aq.Navigation ();
      self.navigation.initWithGrid (self);

      self.addChild (self.navigation.updateDebugNavNodes ());

      self.scheduleUpdate ();
   },

   update: function () {
      var self = this;

      self.navigation.updateNavData ();
      self.navigation.updateDebugNavNodes ();

      if (self.falling_block) {

         var bounds = self.falling_block.getTileBounds ();

         var grid_size = self.falling_block.getGridSize ();

         var block_size = aq.config.BLOCK_SIZE;

         if (COLLISION_DEBUGGING) {
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
      }
   },

   setFallingBlock: function (node) {
      var self = this;
      self.falling_block = node;
      self.addChild (node, 3);
   },

   clearFallingBlock: function () {
      var self = this;
      if (self.falling_block) {
         self.falling_block.removeFromParent (true);
         self.falling_block = null;
      }
   },

   setSprite: function (node) {
       var self = this;
       self.tmp_sprite = node;
       self.addChild (node, 4);
   },

   moveToCamera: function (cameraY) {
      var self = this;

      // Under normal circumstances, as the camera moves up, stack goes below the screen
      // and there needs to be a limit of how many rows that can drop off the bottom and
      // remain in memory.  In some fixed levels, this could be all possible rows in the
      // level.  In the infinite mode, the value needs to be set to something so that the
      // memory is conserved.  This value limits the distance the camera can move back
      // down, since if a row is clipped off the bottom, it no longer exists.
      var MAX_GRID_ROWS_BELOW_CAMERA = 4;

      var old_y = self.base_y;

      self.base_y = -cameraY;

      // Update the render position the camera delta
      self.y -= (old_y - self.base_y);

      // limit the camera movement down so the base isn't up the screen
      // Set this to something * aq.config.BLOCK_SIZE to view rows under the base of the grid
       if (self.y > 0) {
         self.y = 0;
      }
      
      var rows_below_camera = Math.floor ((Math.abs (self.y)) / aq.config.BLOCK_SIZE);
      if (self.y < 0 && rows_below_camera > MAX_GRID_ROWS_BELOW_CAMERA) {
         // Need to clip
         var rows_to_clip = rows_below_camera - MAX_GRID_ROWS_BELOW_CAMERA;
         
         // Clip off the number of rows from the bottom of the grid.  Should usually be one
         // might might be more if the camera moves really fast
         self.clipBottomRows (rows_to_clip);
      }
   },

   // Clip off a number of rows from the bottom of the grid, shifting everything as necessary
   clipBottomRows: function (rows) {
      var self = this;
      var i;
      var array_cells_to_drop = rows * self.blocks_wide;
      for (i = 0; i < self.grid_cell_count - array_cells_to_drop; i++) {
         self.game_grid [i] = self.game_grid [i + array_cells_to_drop];
         self.group_grid [i] = self.group_grid [i + array_cells_to_drop];
         self.cluster_grid [i] = self.cluster_grid [i + array_cells_to_drop];
      } 
      for (i = self.grid_cell_count - array_cells_to_drop; i < self.grid_cell_count; i++) {
         self.game_grid [i] = 0;
         self.group_grid [i] = 0;
         self.cluster_grid [i] = 0;
      }

      // shift the render positions
      var delta_y = rows * aq.config.BLOCK_SIZE;
      self.y += delta_y;
      if (self.falling_block) {
         self.falling_block.y -= delta_y;
      }
      if (self.tmp_sprite) {
         self.tmp_sprite.y -= delta_y;
      }
      self.groupFloodFill (true);
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
         drawNode.drawSegment (p1, p2, 1, cc.color.WHITE);
      }

      for (var y = 0; y <= self.blocks_high * block_size; y += block_size) {

         p1 = cc.p (0, y);
         p2 = cc.p (0 + (self.blocks_wide * block_size), y);
         drawNode.drawSegment (p1, p2, 1, cc.color.WHITE);
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

      var tile_bounds = block.getTileBounds (rot);

      var x, y;
      var bottom_left_index = self.getGridIndexForPoint (pos);

      var block_size = aq.config.BLOCK_SIZE;

      var indexes = [];

      var tile = block.getTileData ();
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

       if (COLLISION_DEBUGGING) {
          var block_size = aq.config.BLOCK_SIZE;
          var indexes = self.getGridIndexPositionsForBlockCollision (block, block.getPosition (), block.getRotation ());

          // Show the grid squares that collision will be tested for
          self.grid_collision_squares.clear ();
          for (var n = 0; n < indexes.length; n++) {
             var p = self.getGridPositionForIndex (indexes [n].grid_index);
             self.grid_collision_squares.drawRect (p, cc.p (p.x + block_size, p.y + block_size),
                                                   cc.color (128,0,0,128));
          }
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

   //
   // Block breaking functions
   //

   clearCollisionBreakPoints: function () {
      var self = this;
      if (COLLISION_DEBUGGING) {
         self.grid_break_highlights.removeAllChildren(true);
      }
   },

   // Test for the appropriate stack breaking scenario
   breakBlock: function (block) {
       var self = this;

       // The logic for breaking should be:
       //   If any loop below returns false, then no break occurs.
       //   If each loop returns true, then we have a break.
       var willBreak = true;

       // As we're going over the collision points, determine any break points
       var break_points = [];

       // return 0 for t1, 1 for t2
       var tIndex = function (b, t) {
          var ti = -1;
          if ((b & 0x0f) === t) {
             ti = 0;
          } else if (((b >> 4) & 0x0f) === t) {
             ti = 1;
          }
          return ti;
       };

       // Breaking logic revelation, 6th April 2017 at 7:15am (on the train to London)...
       // Any sloping edge will cause a break, as if it was a slicing knife edge. Basically
       // if the block should slide, but is prevented from doing so, that would cause a break.
       // Idea.  Imagine that the blocks are rendered with shiny knife edges, and sparks fly if
       // they scrape over corner points, or slide down another knife edge, but dig in when 
       // there's no room to slide.  That makes so much more sense and dealing with the points...

       // Visualise the break position in the grid
       if (block.collision_points && block.collision_points.length > 0) {

          for(var i = 0; i < block.collision_points.length; i++) {
             // For each point in the grid, test the collision point, with the cell/triangle
             // of the block falling.
             var shouldBreak = false;

             var cp = block.collision_points [i];
             var grid_cell = cp.grid_block_obj;
             var block_cell = cp.cell.tile_cell;

             // If a break occurs, we need to keep track of the triangle position to 
             // be able to trigger the cluster to break
             var t_index = 0;

             // Bottom left of the cell in the grid
             var grid_pos = self.getGridPositionForIndex (cp.grid_block_index);

             // Where exactly (in relation to the grid) is the cell of the falling
             // block that's part of this collision
             var block_pos = self.getGridPositionForPoint (block.getPosition ());
             block_pos.x += cp.cell.x * aq.config.BLOCK_SIZE;
             block_pos.y += cp.cell.y * aq.config.BLOCK_SIZE;

             var block_cell_index = self.getGridIndexForPoint (block_pos);

             // get a point at the center of the grid cell
             var center_pos = cc.p (grid_pos.x + half_block_size, grid_pos.y + half_block_size);

             // For the cell in the grid, the exact collision point will always be at the top of the cell
             grid_pos.y += aq.config.BLOCK_SIZE;

             // Has the block cell slotted into the grid cleanly
             var b_grid_data = self.getGridDataForIndex (block_cell_index);
             if (aq.isSingleTriangleCell (b_grid_data) && aq.isSingleTriangleCell (block_cell) && (block_cell_index === cp.grid_block_index)) {
                // clean overlap
             }

             // If the falling block and grid cell are not the same, then the block must be above the
             // grid cell, so test the triangles to determine the collision position
             else if (block_cell_index !== cp.grid_block_index) {
                //assert block_cell_index === cp.grid_block_index + self.blocks_wide
                if (aq.isSingleTriangleCell (grid_cell, 1)) {
                   // cell in the grid pointing up, with point on the left
                   t_index = tIndex (grid_cell, 1);
                   shouldBreak = true;
                } else if (aq.isSingleTriangleCell(block_cell, 2)) {
                   // collision point is on the left (grid_pos already points there)
                   t_index = tIndex (grid_cell, 2);
                   if (t_index === -1) {
                      t_index = tIndex (grid_cell, 3);
                   }
                   shouldBreak = true;
                } else if (aq.isSingleTriangleCell (grid_cell, 4)) {
                   // Collision point is on the right
                   grid_pos.x += aq.config.BLOCK_SIZE;
                   t_index = tIndex (grid_cell, 4);
                   shouldBreak = true;
                } else if (aq.isSingleTriangleCell (block_cell, 3)) {
                   // Collision point is on the right
                   grid_pos.x += aq.config.BLOCK_SIZE;
                   t_index = tIndex (grid_cell, 2);
                   if (t_index === -1) {
                      t_index = tIndex (grid_cell, 3);
                   }
                   shouldBreak = true;
                }
             }

             if (shouldBreak) {
                if (COLLISION_DEBUGGING) {
                   var highlight = new cc.DrawNode();
                   var col = shouldBreak ? cc.color (255,0,0,255) : cc.color (0,255,0,255);
                   highlight.drawCircle (grid_pos, 6, 2 * cc.PI, 10, true, 4, col);
                   highlight.drawSegment (center_pos, grid_pos, 2, col);
                   self.grid_break_highlights.addChild (highlight);
                }

                break_points.push ({
                   grid_pos: cp.grid_block_index,
                   t_index: t_index
                });

             } else {
                willBreak = false;
             }
          }
       }

       if (!willBreak) {
          self.clearCollisionBreakPoints ();
       }

       // test the group/block removal
       if (willBreak) {
          for (var bp in break_points) {
             self.removeGroupByGridPosition (break_points [bp].grid_pos, break_points [bp].t_index);
          }
       }
       
       return willBreak;
   },

   removeGroupByGridPosition: function (grid_index, triangle_pos) {
       var self = this;

       var group_index = (self.group_grid [grid_index] >> (16 * triangle_pos)) & 0xffff;
       for (var n in self.cluster_list) {
          for (var b in self.cluster_list [n].groups) {
             var group = self.cluster_list[n].groups [b];
             if (group && group.group_index === group_index) {
                self.removeGroupByIndex (group_index);
                if (group.node) {
                   group.node.removeFromParent (true);
                }
                delete self.cluster_list[n].groups[b];
             }
          }
       }
   },

   // Remove a group from the grid, given it's index
   removeGroupByIndex: function (group_index) {
       var self = this;

       // Loop over the group grid, and remove the data, along with the corresponding
       // data from the game_grid
       for (var i = 0; i < self.group_grid.length; i++) {
          var group_data = self.group_grid [i];
          if ((group_data & 0xffff) === group_index) {
             self.group_grid [i] &= 0xffff0000;
             self.cluster_grid [i] &= 0xffff0000;
             self.game_grid [i] &= 0x00ff00f0;
          }

          if (((group_data >> 16) & 0xffff) === group_index) {
             self.group_grid [i] &= 0x0000ffff;
             self.cluster_grid [i] &= 0x0000ffff;
             self.game_grid [i] &= 0xff00000f;
          }
       }
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

   debugRenderGrid: function () {
       var self = this;

       self.tmp_root.removeAllChildren ();

       var block_size = aq.config.BLOCK_SIZE;

       var tile, c;
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
                   c = cc.color (tile.color);
                   aq.drawTri (node, 0, 0, (d & 0x0f), c);
                }

                if ((d & 0xf0) !== 0) {
                   tile = aq.Block.TILE_DATA [(d >> 16) & 0xff];
                   c = cc.color (tile.color);
                   aq.drawTri (node, 0, 0, ((d >> 4) & 0x0f), c);
                }

                self.tmp_root.addChild (node, 500);
             }
          }
      }
   },

   // Link groups together 'under' clusters, in a tree structure
   linkGroupsToClusters: function (group_list, cluster_list) {
       var self = this;

       if (!group_list || group_list.length === 0) {
          return;
       }

       if (!cluster_list || cluster_list.length === 0) {
          return;
       }

       var findCluster = function (block_cell) {

          // This is the brute force method looping over the lists
          /*
          for (var j = 0; j < cluster_list.length; j++) {
             for (var c = 0; c < cluster_list [j].cells.length; c++) {
                var cluster_cell = cluster_list [j].cells [c];
                if (cluster_cell.grid_pos === block_cell.grid_pos) {
                   return cluster_list [j];
                }
             }
          }
          */

          // However, it's possible to just refer to the cluster_grid
          var p = self.cluster_grid [block_cell.grid_pos];
          p = (p & 0xffff) || ((p >> 16) & 0xffff);
          return cluster_list [p - 1];    // note the grid index is 1 less than the cluster_num
       };

       var i;

       for (i = 0; i < cluster_list.length; i++) {
          cluster_list [i].groups = [];
       }

       for (i = 0; i < group_list.length; i++) {
          // find the cluster this group belongs to, using it's first cell
          var block_cell = group_list [i].cells [0];
          var cluster = findCluster (block_cell);
          cluster.groups.push (group_list [i]);
          group_list [i].cluster = cluster;
       }
   },

   // Take the groups and cluster lists, and create a set of Block objects for rendering, each one added
   // to a parent cluster node, then all the clusters added to a single parent so we can dispose 
   // of them all in one go
   renderFillGroups: function (group_list, parent_node, render) {
       var self = this;

       if (!parent_node) {
          return;
       }

       // Clear any existing blocks
       parent_node.removeAllChildren (true);

       // Bail if there's nothing to draw
       if (!group_list || group_list.length === 0) {
          return;
       }
                     
       for (var i = 0; i < group_list.length; i++) {
          if (!group_list [i].node) {
             var block = self.createBlockFromTileDataGroup (group_list[i], render);
             group_list [i].node = block;
             parent_node.addChild (block);
          }
       }

       return parent_node;
   },

   // Given a combined cell 'group', make a Block object, like the predefined tiles within Block.js
   // but using the generated block data from the grid.
   createBlockFromTileDataGroup: function (group, render) {
       var self = this;

       if (typeof (render) === 'undefined') {
          render = false;
       }
       
       var cells = group.cells;

       var tile_data = {
          'id': 'group' + group.group_index,
          'flags': 'active',
          'color': group.color,
          'anchors': [[0,0]],
          'tile_num': group.tile_num
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
       var block = new aq.Block (render, -1, tile_data);
       block.setPosition (min_x * aq.config.BLOCK_SIZE, min_y * aq.config.BLOCK_SIZE);

       // Tag the block with the group index
       block.setTag (group.group_index);

       // Attach the block to the group object
       group.node = block;

       return block;
   },

   getClusterList: function () {
       var self = this;
       return self.cluster_list;
   },

   getGroupList: function () {
       var self = this;
       return self.group_list;
   },

   groupFloodFill: function (render) {
       var self = this;

       // Find all the clusters
       self.cluster_list = self.gridFloodFill (self.cluster_grid, false);

       // Then work out all the block groups
       self.group_list = self.gridFloodFill (self.group_grid, true);

       // Link the groups under clusters
       self.linkGroupsToClusters (self.group_list, self.cluster_list);

       // Create a set of group nodes, for rendering
       self.renderFillGroups (self.group_list, self.block_root, render);
   },

   gridFloodFill: function (grid_data, group_by_color) {
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

             // and the tile matches our current group
             if ((tile_num_from === -1) || ((t1 === t2) && (tile_num_from === t1))) {

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

                // Add the tile to the extra grid data
                grid_data [grid_pos] = (group_from.group_index << 16) | group_from.group_index;

                // Fill outwards from this cell
                fillOutwards (-1);

                return;
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

                // Store the group grid id/num 
                grid_data [grid_pos] |= (group_from.group_index << (i * 16));
             }

             // Mark the triangle position (t1 or t2) as seen
             self.game_grid [grid_pos] |= (FILL_FLAG_SEEN_T1 << i);

             // Fill outwards from this cell
             fillOutwards (triangle_type);
          }
       };

       var output_list = [];

       var i;

       // Clear the floodfill bits in the game_grid
       for (i = 0; i < self.game_grid.length; i++) {
          self.game_grid [i] &= ~(FILL_FLAG_SEEN_T1|FILL_FLAG_SEEN_T2);

          // Also clear the extra grid data
          grid_data [i] = 0;
       }

       for (i = 0; i < self.game_grid.length; i++) {
          if ((self.game_grid [i] & 0xff) !== 0) {
             for (var t = 0; t < 2; t++) {

                // For comparison purposes, shift the bits as necessary into a single triangle position
                var tile_num = group_by_color ?  (self.game_grid [i] >> (24 - (t * 8))) & 0x0f : -1;
                // use a fully transparent marker color when no tile data is available. Might be a cluster
                var color = (group_by_color && aq.Block.TILE_DATA [tile_num]) ? aq.Block.TILE_DATA [tile_num].color : cc.color (255, 0, 255, 0);

                if ((self.game_grid [i] & (FILL_FLAG_SEEN_T1 << t)) === 0) {
                   var newGroup = {
                      group_index: (output_list.length + 1),
                      tile_num: tile_num,
                      color: color,
                      cells: []
                   };

                   floodFill (i, 0, newGroup);

                   if (newGroup.cells.length > 0) {
                      output_list.push (newGroup);
                   }
                }
             }
          }
       }

       return output_list;
   }
});

