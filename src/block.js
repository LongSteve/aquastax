'use strict';

// Set this to a color to force all blocks to one color, useful for debugging
//var FIXED_BLOCK_COLOR = null;
var FIXED_BLOCK_COLOR = cc.color (128,128,128,128);

// Set this to add a tiny single triangle to the tile set, useful for debugging
var INCLUDE_SINGLE_TRIANGLE_TILE = false;

aq.Block = cc.Node.extend ({

   // a list of cc.DrawNode objects representing this block at the 4 rotations
   drawNodes: null,

   // The tile number for this block (or -1 if a custom tile)
   tile_num: 0,

   // A reference to the tile data for this block
   tile_data: null,

   // Block rotation (0 - 3)
   rot: 0,

   // Boundaries (calculated at block creation)
   boundaries: null,

   // Could collision data be recorded for this block
   collision_reporting_enabled: true,

   // Construct a Block from a given pre-defined tile number, or a dynamically created tile_data object
   ctor: function (render, tile_num, tile_data) {
      var self = this;

      render = true;

      // super init first
      self._super ();

      // Tile number reference
      self.tile_num = tile_num;

      // First rotation
      self.rot = 0;

      // Allocate the boundary data to be cached
      self.boundaries = [];

      // Custom tile_data passed in
      if (tile_num === -1 && tile_data instanceof Object) {
         self.tile_data = tile_data;
         self.tile_num = tile_data.tile_num;

         // Only need one rotation for a custom block
         if (render) {
            self.drawNodes = [
               self.createTileNodeAtRotation (0)
            ];
         }
      } else {
         // Or using one of the pre-defined tiles
         self.tile_data = aq.Block.TILE_DATA [tile_num];

         // Make the set of drawNodes corresponding to each rotation
         if (render) {
            self.drawNodes = [
               self.createTileNodeAtRotation (0),
               self.createTileNodeAtRotation (1),
               self.createTileNodeAtRotation (2),
               self.createTileNodeAtRotation (3),
            ];
         }
      }

      if (self.drawNodes) {
         for (var n = 0; n < self.drawNodes.length; n++) {
            if (n > 0) {
               self.drawNodes[n].setVisible (false);
            }
            self.addChild (self.drawNodes [n]);
         }
      }
   },

   /**
    * Create a cc.DrawNode to render this block at a given
    * rotation.  If a node is already passed in, re-use it.
    *
    * @param rotation rotation number (0 - 3)
    * @param node a cc.DrawNode to clear
    * @return a cc.DrawNode to add to the scene
    */
   createTileNodeAtRotation: function (rotation, node) {
       var self = this;

       var dx = 0;
       var dy = 0;

       var grid_size = self.tile_data.grid_size;

       if (node) {
          node.clear ();
       } else {
          node = new cc.DrawNode ();
       }

       for (var i = 0; i < grid_size * grid_size; i++) {
          var tris = self.tile_data.grid_data [rotation][i];
          var t1 = (tris >> 4) & 0xf;
          var t2 = tris & 0xf;

          dy = ((grid_size - 1) - Math.floor (i / grid_size)) * aq.config.BLOCK_SIZE;
          dx = (i % grid_size) * aq.config.BLOCK_SIZE;

          if (t1 !== 0) {
             aq.drawTri (node, dx, dy, t1, FIXED_BLOCK_COLOR || self.tile_data.color);
          }
          if (t2 !== 0) {
             aq.drawTri (node, dx, dy, t2, FIXED_BLOCK_COLOR || self.tile_data.color);
          }
       }

       aq.Block.createBlockOutline (node, self.tile_data, rotation);

       return node;
   },

   moveBy: function (dx, dy) {
       var self = this;
       var pos = self.getPosition ();
       pos.x += dx;
       pos.y += dy;

       self.setPosition (pos);
   },

   getTileData: function () {
       var self = this;
       return self.tile_data;
   },

   getTileNum: function () {
       var self = this;
       return self.tile_num;
   },

   getRotation: function () {
       var self = this;
       return self.rot;
   },

   getGridSize: function () {
       var self = this;
       return self.tile_data.grid_size;
   },

   getObjectData: function (rotation) {
       var self = this;
       if (typeof (rotation) === 'undefined') {
          rotation = self.rot;
       }

       return self.tile_data.grid_data[rotation];
   },

   getCellIndexedBottomLeft: function (x, y, rotation) {
       var self = this;
       var grid_data = self.getObjectData (rotation);
       return grid_data [x + (self.tile_data.grid_size - y - 1) * self.tile_data.grid_size];
   },

   getNewRotationAndPosition90: function () {
       var self = this;

       var old_rotation = self.rot;

       var new_rotation = (old_rotation + 1) & 3;

       var td = self.getTileData ();

       // Gets the anchor point for the current rotation
       var anchor_x = td.anchors[old_rotation][0];
       var anchor_y = td.anchors[old_rotation][1];

       var position = self.getPosition ();

       // -1 in the anchors array means don't bother offsetting by anchors (ie. for the 1x1 tile)
       if (anchor_x !== -1) {

          // Get the anchor point for the new rotation (which is 90 degrees more than the old rotation)
          var anchor_i = td.anchors[new_rotation][0];
          var anchor_j = td.anchors[new_rotation][1];

          // Work out the difference in the positions of the anchor point and offset the tile by
          // that delta in the x and y.
          position.x = self.x + ((anchor_x - anchor_i) * aq.config.BLOCK_SIZE);
          position.y = self.y - ((anchor_y - anchor_j) * aq.config.BLOCK_SIZE);   //Why is this - and not + ?
       }

       return {
          position: position,
          rotation: new_rotation
       };
   },

   setNewRotationAndPosition: function (rotationAndRotation) {
      var self = this;

      self.setPosition (rotationAndRotation.position);

      if (self.drawNodes) {
         self.drawNodes[self.rot].setVisible (false);      // hide old rotation
         self.drawNodes [rotationAndRotation.rotation].setVisible (true);
      }

      self.rot = rotationAndRotation.rotation;
   },

   /**
    * Work out the number of grid cells from the bottom left that are empty
    * of filled tile triangles.  eg.
    *
    * |----|----|
    * | 04 |    |
    * |----|----|
    * | 31 |    |
    * |----|----|
    *
    * bounds information = {
    *    left: 0,
    *    right: 1,
    *    bottom:0
    * }
    *
    * but if rotated to:
    *
    * |----|----|
    * | 42 | 01 |
    * |----|----|
    * |    |    |
    * |----|----|
    *
    * bounds information = {
    *    left: 0,
    *    right: 2,
    *    bottom:1
    * }
    *
    */
   getTileBounds: function (rotation) {
      var self = this;

      if (typeof (rotation) === 'undefined') {
         rotation = self.rot;
      }

      if (!self.boundaries [rotation]) {
         self.boundaries [rotation] = self.calculateTileBounds (rotation);
      }

      return self.boundaries [rotation];
   },

   calculateTileBounds: function (rotation) {
      var self = this;

      var grid_size = self.tile_data.grid_size;
      var grid_data = self.tile_data.grid_data;

      var x = 0, y = 0;
      var lb = 99, rb = 99, bb = 99, tb = 99;
      var grid_pos;

      for (x = 0; x < grid_size; ++x)
      {
         for (y = 0; y < grid_size; ++y)
         {
            // Determine left bound
            if (lb === 99) {
               grid_pos = (y * grid_size) + x;
               if (grid_data [rotation][grid_pos] !== 0) {
                  lb = x;
               }
            }

            // Determine right bound
            if (rb === 99) {
               grid_pos = (y * grid_size) + (grid_size - 1 - x);
               if (grid_data [rotation][grid_pos] !== 0) {
                  rb = (grid_size - x);
               }
            }
         }
      }

      for (y = 0; y < grid_size; ++y)
      {
         for (x = 0; x < grid_size; ++x)
         {
            // Determine 'bottom' or lower bound
            if (bb === 99) {
               grid_pos = ((grid_size - 1 - y) * grid_size) + x;
               if (grid_data [rotation][grid_pos] !== 0 && y < bb) {
                  bb = y;
               }
            }

            // Determine 'top' or upper bound
            if (tb === 99) {
               grid_pos = (y * grid_size) + x;
               if (grid_data [rotation][grid_pos] !== 0 && y < tb) {
                  tb = grid_size - y;
               }
            }
         }
      }

      return {
         left: lb,
         right: rb,
         bottom: bb,
         top: tb
      };
   },

   setCollisionReportingEnabled: function (enabled) {
       var self = this;
       self.collision_reporting_enabled = enabled;
   },

   isCollisionReportingEnabled: function () {
       var self = this;
       return self.collision_reporting_enabled;
   },

   /**
    * Return a list of tile cells with position offsets.
    */
   getTileCells: function (rotation, exclude_empty) {

      var self = this;

      if (typeof (rotation) === 'undefined') {
         rotation = self.rot;
      }

      var grid_size = self.tile_data.grid_size;
      var grid_data = self.tile_data.grid_data;

      var x = 0, y = 0;
      var grid_pos, tile_cell;

      var cell_list = [];

      for (x = 0; x < grid_size; ++x)
      {
         for (y = 0; y < grid_size; ++y)
         {
            grid_pos = (y * grid_size) + x;
            tile_cell = grid_data [rotation][grid_pos];
            if (tile_cell !== 0 || !exclude_empty) {
               cell_list.push ({
                  tile_cell: tile_cell,
                  x: x,
                  y: grid_size - 1 -y
               });
            }
         }
      }

      return cell_list;
   }

});

//
// Some 'static' tile data, used when creating blocks, and other constructs
//
// Reminder for triangle types
//
// Triangle Type 1 |\     Type 2  |--/  Type 3  \--|  Type 4    /|
//                 | \            | /            \ |           / |
//                 |__\           |/              \|          /__|
//
//
// When grid_data defines the tile layout it's indexed from top left to bottom right.
// So the first example below, the tile looks like so:
//
// [0x4,0x0,0x31,0x0]
//
//                 |--------|--------|
// |----|----|     |    /|  |        |
// | 04 |    |     |   / |  |        |
// |----|----|     |  /__|  |        |
// | 31 |    |     |--------|--------|
// |----|----|     |  ____  |        |
//                 |  |\ |  |        |
//                 |  | \|  |        |
//                 |  |__\  |        |
//                 |--------|--------|

aq.Block.TILE_DATA = [
   {
      'id': 'tile0',
      'flags': 'active',
      'color': '#fe3500',
      'anchors': [[0,0]],
      'grid_size': 2,
      'grid_data': [[0x4,0x0,
                     0x31,0x0]]
   },
   {
      'id': 'tile1',
      'flags': 'active',
      'color': '#00fedc',
      'anchors': [[1,0]],
      'grid_size': 2,
      'grid_data': [[0x3,0x31,
                     0x0,0x31]]
   },
   {
      'id': 'tile2',
      'flags': 'active',
      'color': '#cc00fe',
      'anchors': [[0,0]],
      'grid_size': 2,
      'grid_data': [[0x31,0x31,
                     0x31,0x0]]
   },
   {
      'id': 'tile3',
      'flags': 'active',
      'color': '#ef5000',
      'anchors': [[-1,-1]],
      'grid_size': 1,
      'grid_data': [[0x31]]
   },
   {
      'id': 'tile4',
      'flags': 'active',
      'color': '#ff6cb5',
      'anchors': [[1,1]],
      'grid_size': 2,
      'grid_data': [[0x4,0x0,
                     0x31,0x31]]
   },
   {
      'id': 'tile5',
      'flags': 'active',
      'color': '#4eff00',
      'anchors': [[0,1]],
      'grid_size': 2,
      'grid_data': [[0x1,0x0,
                     0x31,0x31]]
   },
   {
      'id': 'tile6',
      'flags': 'active',
      'color': '#5c33ff',
      'anchors': [[0,1]],
      'grid_size': 2,
      'grid_data': [[0x1,0x0,
                     0x31,0x0]]
   },
   {
      'id': 'tile7',
      'flags': 'active',
      'color': '#fea03a',
      'anchors': [[-1,-1]],
      'grid_size': 2,
      'grid_data': [[0x0,0x0,
                     0x4,0x1]]
   }
];

// Static block function to get the number of tiles defined
aq.Block.getTileCount = function () {
   return aq.Block.TILE_DATA.length;
};

// Static Block method to just return a random tile number
aq.Block.getRandomTileNumber = function () {
   var NUM_USER_TILES = aq.Block.TILE_DATA.length;
   var rnd_tile_num = Math.floor (Math.random () * NUM_USER_TILES);
   return rnd_tile_num;
};

/**
 * Creates the cc.DrawNode geometry (using DrawNode.drawSegment) calls to render lines for the
 * block outline.  This is used by the grid for rendering large combined blocks.
 *
 * @param node The cc.DrawNode to add the outlines too
 * @param tile_data from the TILE_DATA array
 * @param rotation rotation number (0 - 3)
 */
aq.Block.createBlockOutline = function (node, tile_data, rotation) {

    var block_size = aq.config.BLOCK_SIZE;

    var outline_color = aq.config.BLOCK_OUTLINE_COLOR;
    var outline_width = aq.config.BLOCK_OUTLINE_WIDTH;

    // Does the cell contain the specific triangle of the given type
    var has_tri = function (cell, type) {
       if (cell === 0) {
          return false;
       }

       return ((cell & 0x0f) === type || ((cell >> 4) & 0x0f) === type);
    };

    // Get the cell data from the x,y position of a block.  Indexed from the top left.
    var cell_data = function  (x, y) {
       if (x < 0 || x >= tile_data.grid_size) {
          return 0;
       }
       if (y < 0 || y >= tile_data.grid_size) {
          return 0;
       }

       var i = (y * tile_data.grid_size) + x;
       return tile_data.grid_data [rotation][i];
    };

    var has_top_edge = function (cell) {
       return has_tri (cell, 2) || has_tri (cell, 3);
    };

    var has_bottom_edge = function (cell) {
       return has_tri (cell, 1) || has_tri (cell, 4);
    };

    var has_left_edge = function (cell) {
       return has_tri (cell, 1) || has_tri (cell, 2);
    };

    var has_right_edge = function (cell) {
       return has_tri (cell, 3) || has_tri (cell, 4);
    };

    // Loop over the cells within the block grid, and draw any necessary block outlines
    for (var x = 0; x < tile_data.grid_size; x++) {
       for (var y = 0; y < tile_data.grid_size; y++) {
          var cell = cell_data (x, y);

          // cx,cy will be the top left point of the cell
          var cx = x * block_size;
          var cy = (tile_data.grid_size - y) * block_size;

          if (cell !== 0) {
             // grab the data from the cells around the target cell
             var left = cell_data (x - 1, y);
             var right = cell_data (x + 1, y);
             var above = cell_data (x, y - 1);
             var below = cell_data (x, y + 1);

             // boundary line at the top edge of the cell
             if (has_top_edge (cell) && !has_bottom_edge (above)) {
                node.drawSegment (cc.p (cx, cy), cc.p (cx + block_size, cy), outline_width, outline_color);
             }

             // boundary line at the bottom edge of the cell
             if (has_bottom_edge (cell) && !has_top_edge (below)) {
                node.drawSegment (cc.p (cx, cy - block_size), cc.p (cx + block_size, cy - block_size), outline_width, outline_color);
             }

             // boundary line at the left edge of the cell
             if (has_left_edge (cell) && !has_right_edge (left)) {
                node.drawSegment (cc.p (cx, cy), cc.p (cx, cy - block_size), outline_width, outline_color);
             }

             // boundary line at the right edge of the cell
             if (has_right_edge (cell) && !has_left_edge (right)) {
                node.drawSegment (cc.p (cx + block_size, cy), cc.p (cx + block_size, cy - block_size), outline_width, outline_color);
             }

             // right diagonal boundary
             if ((has_tri (cell, 1) && !has_tri (cell, 3)) || (has_tri (cell, 3) && !has_tri (cell, 1))) {
                node.drawSegment (cc.p (cx, cy), cc.p (cx + block_size, cy - block_size), outline_width, outline_color);
             }

             // left diagonal boundary
             if ((has_tri (cell, 2) && !has_tri (cell, 4)) || (has_tri (cell, 4) && !has_tri (cell, 2))) {
                node.drawSegment (cc.p (cx + block_size, cy), cc.p (cx, cy - block_size), outline_width, outline_color);
             }
          }
       }
    }
};


/**
 * initTileData function, needs to be called at game startup, so is called as an Immediately Executed Function.
 * It initialises the TILE_DATA array with the additional tile rotations.
 *
 */
(function () {

    if (INCLUDE_SINGLE_TRIANGLE_TILE) {
       aq.Block.TILE_DATA.push (
          {
             'id': 'tile8',
             'flags': 'active',
             'color': '#ef5000',
             'anchors': [[-1,-1]],
             'grid_size': 1,
             'grid_data': [[0x01]]
          }
       );
    }
    
   var preRotateTile = function (n) {

      var td = aq.Block.TILE_DATA [n];

      var a, x, y, i, j, g;

      // Loop for each rotation
      for (g = 0; g < 3; g++)
      {
         var rot_grid = [];
         var grid_data = td.grid_data [g];

         for (y = 0; y < td.grid_size; y++)
         {
            for (x = 0; x < td.grid_size; x++)
            {
               i = (x * td.grid_size) + (td.grid_size-y-1);
               j = (y * td.grid_size) + x;
               rot_grid [i] = grid_data [j];

               if (((rot_grid [i] >> 4) & 0x0f) > 0) {
                  // Also rotate each grid square triangle piece
                  a = (rot_grid [i] >> 4) & 0x0f;
                  if (++a > 4) {
                     a = 1;
                  }
                  rot_grid [i] = (a << 4) | (rot_grid [i] & 0x0f);
               }

               if ((rot_grid [i] & 0x0f) > 0) {
                  // Also rotate each grid square triangle piece
                  a = rot_grid [i] & 0x0f;
                  if (++a > 4) {
                     a = 1;
                  }
                  rot_grid [i] = (rot_grid [i] & 0xf0) | a;
               }
            }
         }

         td.grid_data [g + 1] = rot_grid;

         getTileAnchor (n, g + 1);
      }
   };

   var getTileAnchor = function (n, r) {

      var td = aq.Block.TILE_DATA [n];

      var ax = td.anchors [0][0];
      var ay = td.anchors [0][1];

      if (ax !== -1) {
         var ai = ax;
         var aj = ay;
         for (var i = 0; i < r; i++)
         {
            ai = td.grid_size - 1 - ay;
            aj = ax;

            ax = ai;
            ay = aj;
         }
      }

      td.anchors [r] = [ax,ay];
   };

   for (var i = 0; i < aq.Block.TILE_DATA.length; i++) {
      preRotateTile (i);
   }

})();

