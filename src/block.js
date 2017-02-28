'use strict';

aq.Block = cc.Node.extend ({

   // a list of cc.DrawNode objects representing this block at the 4 rotations
   drawNodes: null,

   // The tile number for this block
   tile_num: 0,

   // Block rotation (0 - 3)
   rot: 0,

   ctor: function (tile_num) {
      var self = this;

      // 1. super init first
      self._super ();

      // Make the set of drawNodes corresponding to each rotation
      self.drawNodes = [
         self.createTileNodeAtRotation (tile_num, 0),
         self.createTileNodeAtRotation (tile_num, 1),
         self.createTileNodeAtRotation (tile_num, 2),
         self.createTileNodeAtRotation (tile_num, 3),
      ];

      self.tile_num = tile_num;
      self.rot = 0;

      for (var n = 0; n < self.drawNodes.length; n++) {
         if (n > 0) {
            self.drawNodes[n].setVisible (false);
         }
         self.addChild (self.drawNodes [n]);
      }
   },

   /**
    * Create a cc.DrawNode to render a given tile number and rotation.
    *
    * @param n tile number (0 - aq.Block.TILE_DATA.length)
    * @param r rotation (0 - 3)
    * @return a cc.DrawNode to add to the scene
    */
   createTileNodeAtRotation: function (n, r) {
      var self = this;

      var node = new cc.DrawNode ();

      var dx = 0;
      var dy = 0;

      var td = aq.Block.TILE_DATA [n];
      var m = td.grid_size * td.grid_size;

      for (var i = 0; i < m; i++) {
         var tris = td.grid_data [r][i];
         var t1 = (tris >> 4) & 0xf;
         var t2 = tris & 0xf;

         dy = ((td.grid_size - 1) - Math.floor (i / td.grid_size)) * aq.config.BLOCK_SIZE;
         dx = (i % td.grid_size) * aq.config.BLOCK_SIZE;

         if (t1 !== 0) {
            aq.drawTri (node, dx, dy, t1, td.color);
         }
         if (t2 !== 0) {
            aq.drawTri (node, dx, dy, t2, td.color);
         }
      }

      self.addBlockOutline (node, n, r);

      return node;
   },

   /**
    * Add the cc.DrawNode geometry (using DrawNode.drawSegment) calls to render lines for the
    * block outline
    *
    * @param node The cc.DrawNode to add the outlines too
    * @param n tile number (0 - aq.Block.TILE_DATA.length)
    * @param r rotation (0 - 3)
    */
   addBlockOutline: function (node, n, r) {
       var self = this;

       if (typeof (r) === 'undefined') {
          r = self.rot;
       }

       var dx = 0;
       var dy = 0;

       var td = aq.Block.TILE_DATA [n];

       var ind = function (tx, ty) {
          if (tx < 0 || tx >= td.grid_size) {
             return -1;
          }
          if (ty < 0 || ty >= td.grid_size) {
             return -1;
          }

          var i = (y * td.grid_size) + x;
          return i;
       };

       // TODO: Continue with this
       // The general idea here is to loop over the cells of the block, and determine if there are edges that
       // align with 'empty' space, they need an outline.  The code below is a start for a single case of
       // one triangle, and it kind of works!  Need a lot more thinking about how best to structure the
       // cases.

       for (var x = 0; x < td.grid_size; x++) {
          for (var y = 0; y < td.grid_size; y++) {

             var i = ind (x, y);

             var tris = td.grid_data [r][i];

             if (tris !== 0) {
                var tris_l = ind (x - 1, y);
                var tris_r = ind (x + 1, y);
                var tris_t = ind (x, y - 1);
                var tris_b = ind (x, y + 1);

                var t1 = (tris >> 4) & 0xf;
                var t2 = tris & 0xf;

                if (t1 === 1 || t2 === 1) {
                   // Vertical line at left edge
                   if (tris_l === -1 || ((tris_l & 0xf) === 1) || (((tris_l & 0xf0) >> 4) === 1)
                                     || ((tris_l & 0xf) === 2) || (((tris_l & 0xf0) >> 4) === 2)) {
                      // Need a line
                      dx = x * aq.config.BLOCK_SIZE;
                      dy = y * aq.config.BLOCK_SIZE;

                      node.drawSegment (cc.p (dx, dy), cc.p (dx, dy + aq.config.BLOCK_SIZE), 2, cc.color (255,255,255,255));
                   }
                }
             }
          }
       }

   },

   getTileData: function () {
       var self = this;
       return aq.Block.TILE_DATA [self.tile_num];
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
       return aq.Block.TILE_DATA [self.tile_num].grid_size;
   },

   getObjectData: function (rotation) {
       var self = this;
       if (typeof (rotation) === 'undefined') {
          rotation = self.rot;
       }

       return aq.Block.TILE_DATA[self.tile_num].grid_data[rotation];
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

      self.drawNodes [self.rot].setVisible (false);      // hide old rotation
      self.drawNodes [rotationAndRotation.rotation].setVisible (true);

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

      // TODO: Calculate this once at startup and cache the values
      var tile = aq.Block.TILE_DATA [self.tile_num];
      var grid_size = tile.grid_size;

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
               if (tile.grid_data [rotation][grid_pos] !== 0) {
                  lb = x;
               }
            }

            // Determine right bound
            if (rb === 99) {
               grid_pos = (y * grid_size) + (grid_size - 1 - x);
               if (tile.grid_data [rotation][grid_pos] !== 0) {
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
               if (tile.grid_data [rotation][grid_pos] !== 0 && y < bb) {
                  bb = y;
               }
            }

            // Determine 'top' or upper bound
            if (tb === 99) {
               grid_pos = (y * grid_size) + x;
               if (tile.grid_data [rotation][grid_pos] !== 0 && y < tb) {
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

   /**
    * Return a list of tile cells with position offsets.
    */
   getTileCells: function (rotation, exclude_empty) {

      var self = this;

      if (typeof (rotation) === 'undefined') {
         rotation = self.rot;
      }

      var tile = aq.Block.TILE_DATA [self.tile_num];
      var grid_size = tile.grid_size;

      var x = 0, y = 0;
      var grid_pos, tile_cell;

      var cell_list = [];

      for (x = 0; x < grid_size; ++x)
      {
         for (y = 0; y < grid_size; ++y)
         {
            grid_pos = (y * grid_size) + x;
            tile_cell = tile.grid_data [rotation][grid_pos];
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
   var rnd_tile_num = Math.floor (Math.random () * aq.Block.TILE_DATA.length);
   return rnd_tile_num;
};

// Static Block method to get the tile data for a given number
aq.Block.getTileDataForNum = function (tile_num) {
   return aq.Block.TILE_DATA [tile_num];
};

/**
 * initTileData function, needs to be called at game startup, so is called as an Immediately Executed Function.
 * It initialises the TILE_DATA array with the additional tile rotations.
 *
 */
(function () {

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

