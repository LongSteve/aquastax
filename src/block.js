'use strict';

aq.Block = cc.Node.extend ({

   drawNode: null,

   num: 0,
   rot: 0,

   ctor: function (num) {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;

      var drawTri = function (node, x, y, type, color) {
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

      var tile_data = [
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
            'color': '#ef500',
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

      self.tile_data = tile_data;

      var drawTile = function (x, y, n, r) {

         var node = new cc.DrawNode ();

         var dx = 0;
         var dy = 0;

         // Steve Note, after stream on 3rd November 2016
         // I've looked at the original code and the anchor_x and anchor_y values
         // are not used in rendering the block, they are used when calculating
         // the position after a rotation.  So, I've removed them from here.

         var td = tile_data [n];

         for (var i = 0; i < 4; i++) {
            var tris = td.grid_data [r][i];
            var t1 = (tris >> 4) & 0xf;
            var t2 = tris & 0xf;

            dy = ((td.grid_size - 1) - Math.floor (i / td.grid_size)) * block_size;
            dx = (i % td.grid_size) * block_size;

            if (t1 !== 0) {
               drawTri (node, x + dx, y + dy, t1, td.color);
            }
            if (t2 !== 0) {
               drawTri (node, x + dx, y + dy, t2, td.color);
            }
         }

         return node;
      };

      var preRotateTile = function (n) {

         var td = tile_data [n];

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
         }
      };

      var getTileAnchor = function (n, r) {

         var td = tile_data [n];

         var ax = td.anchors [0][0];
         var ay = td.anchors [0][1];

         if (ax != -1) {
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

      preRotateTile (num);

      for (var i = 1; i < 4; i++) {
         getTileAnchor (num, i);
      }

      self.drawNodes = [
         drawTile (0, 0, num, 0),
         drawTile (0, 0, num, 1),
         drawTile (0, 0, num, 2),
         drawTile (0, 0, num, 3),
      ];

      self.num = num;
      self.rot = 0;

      for (var n = 0; n < self.drawNodes.length; n++) {
         if (n > 0) {
            self.drawNodes[n].setVisible (false);
         }
         self.addChild (self.drawNodes [n]);
      }
   },

   rotate: function () {
       var self = this;

       var old_rotation = self.rot;

       self.drawNodes [old_rotation].setVisible (false);

       var new_rotation = (old_rotation + 1) & 3;

       self.drawNodes [new_rotation].setVisible (true);

       var anchor_x = self.tile_data [self.num]['anchors'][old_rotation][0];
       var anchor_y = self.tile_data [self.num]['anchors'][old_rotation][1];

       if (anchor_x != -1) {

          var anchor_i = self.tile_data [self.num]['anchors'][new_rotation][0];
          var anchor_j = self.tile_data [self.num]['anchors'][new_rotation][1];

          var new_x = self.x + ((anchor_x - anchor_i) * aq.config.BLOCK_SIZE);
          var new_y = self.y - ((anchor_y - anchor_j) * aq.config.BLOCK_SIZE);

          self.setPosition (new_x, new_y);
       }

       self.rot = new_rotation;
   }

});

