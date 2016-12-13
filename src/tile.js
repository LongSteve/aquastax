'use strict';

aq.TILE_DATA = [
   {
      'id': 'tile0',
      'flags': 'active',
      'color': '#fe3500',
      'anchors': [[0,0]],
      'grid_size': 2,
      'grid_data': [[0x4,0x0,0x31,0x0]]
   },
   {
      'id': 'tile1',
      'flags': 'active',
      'color': '#00fedc',
      'anchors': [[1,0]],
      'grid_size': 2,
      'grid_data': [[0x3,0x31,0x0,0x31]]
   },
   {
      'id': 'tile2',
      'flags': 'active',
      'color': '#cc00fe',
      'anchors': [[0,0]],
      'grid_size': 2,
      'grid_data': [[0x31,0x31,0x31,0x0]]
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
      'grid_data': [[0x4,0x0,0x31,0x31]]
   },
   {
      'id': 'tile5',
      'flags': 'active',
      'color': '#4eff00',
      'anchors': [[0,1]],
      'grid_size': 2,
      'grid_data': [[0x1,0x0,0x31,0x31]]
   },
   {
      'id': 'tile6',
      'flags': 'active',
      'color': '#5c33ff',
      'anchors': [[0,1]],
      'grid_size': 2,
      'grid_data': [[0x1,0x0,0x31,0x0]]
   },
   {
      'id': 'tile7',
      'flags': 'active',
      'color': '#fea03a',
      'anchors': [[-1,-1]],
      'grid_size': 2,
      'grid_data': [[0x0,0x0,0x4,0x1]]
   }
];

/**
 * initTileData function, needs to be called at game startup.  It initialises the TILE_DATA array
 * with the additional tile rotations.
 *
 */
aq.initTileData = function () {

   var preRotateTile = function (n) {

      var td = aq.TILE_DATA [n];

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

      var td = aq.TILE_DATA [n];

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

   for (var i = 0; i < aq.TILE_DATA.length; i++) {
      preRotateTile (i);
   }
};

aq.getTileBounds = function (n, rotation) {

   var tile = aq.TILE_DATA [n];
   var grid_size = tile.grid_size;

   var x = 0, y = 0;
   var lb = 99, rb = 99;
   var grid_pos;

   for (x = 0; x < grid_size; ++x)
   {
      for (y = 0; y < grid_size; ++y)
      {
         // Determine left bound
         if (lb === 99) {
            grid_pos = (y * grid_size) + x;
            if (tile.grid_data [rotation][grid_pos] !== 0 ) {
               lb = x;
            }
         }

         // Determine right bound
         if (rb === 99) {
            grid_pos = (y * grid_size) + (grid_size - 1 - x);
            if (tile.grid_data [rotation][grid_pos] !== 0 ) {
               rb = (grid_size - x);
            }
         }
      }
   }

   return {
      left: lb,
      right: rb
   };
};

/**
 * Create a cc.DrawNode to render a given tile number and rotation.
 *
 * @param x position
 * @param y position
 * @param n tile number (0 - aq.TILE_DATA.length)
 * @param r rotation (0 - 3)
 * @return a cc.DrawNode to add to the scene
 */
aq.createTileNodeAtRotation = function (x, y, n, r) {

   var node = new cc.DrawNode ();

   var dx = 0;
   var dy = 0;

   var td = aq.TILE_DATA [n];
   var m = td.grid_size * td.grid_size;

   for (var i = 0; i < m; i++) {
      var tris = td.grid_data [r][i];
      var t1 = (tris >> 4) & 0xf;
      var t2 = tris & 0xf;

      dy = ((td.grid_size - 1) - Math.floor (i / td.grid_size)) * aq.config.BLOCK_SIZE;
      dx = (i % td.grid_size) * aq.config.BLOCK_SIZE;

      if (t1 !== 0) {
         aq.drawTri (node, x + dx, y + dy, t1, td.color);
      }
      if (t2 !== 0) {
         aq.drawTri (node, x + dx, y + dy, t2, td.color);
      }
   }

   return node;
};

/**
 * Given a cc.DrawNode, add the geometry to render a triangle of the given type (0-3) and color, with
 * a white outline.  Uses the drawPoly method of cc.DrawNode.
 *
 * @param node cc.DrawNode
 * @param x position
 * @param y position
 * @param type triangle type (0 - 3)
 * @param color value passed to cc.color, eg. "#FF00FF"
 */
aq.drawTri = function (node, x, y, type, color) {
   var block_size = aq.config.BLOCK_SIZE;
   var triangle;
   switch (type) {
   case 1:
      triangle = [
         cc.p (x, y),                  // bottom left    |\
         cc.p (x, y + block_size),     // top left       | \
         cc.p (x + block_size, y)      // bottom right   |__\
      ];
      break;
   case 2:
      triangle = [
         cc.p (x, y),                                 // bottom left    |--/
         cc.p (x, y + block_size),                    // top left       | /
         cc.p (x + block_size, y + block_size)        // bottom right   |/
      ];
      break;
   case 3:
      triangle = [
         cc.p (x, y + block_size),                       // bottom left    \--|
         cc.p (x + block_size, y + block_size),          // top left        \ |
         cc.p (x + block_size, y)                        // bottom right     \|
      ];
      break;
   case 4:
      triangle = [
         cc.p (x, y),                                    // bottom left      /|
         cc.p (x + block_size, y + block_size),          // top left        / |
         cc.p (x + block_size, y)                        // bottom right   /__|
      ];
      break;
   }

   node.drawPoly (triangle, cc.color (color), 4, cc.color (255,255,255,255));
};


