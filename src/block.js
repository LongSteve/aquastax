'use strict';

aq.Block = cc.Node.extend ({

   drawNode: null,

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;

      self.drawNode = new cc.DrawNode ();

      var drawTri = function (x, y, type, color) {
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

         self.drawNode.drawPoly (triangle, cc.color (color), 4, cc.color (255,255,255,255));
      };

      var drawTile = function (x, y, n) {
         var tile_data = [
            // ARGB, anchor_x, anchor_y, grid_size, grid_data
            "#fe3500", 0, 0, 2,    0x04, 0x00, 0x31, 0x00,
            "#00fedc", 1, 0, 2,    0x03, 0x31, 0x00, 0x31,
            "#cc00fe", 0, 0, 2,    0x31, 0x31, 0x31, 0x00,
            "#fef500", -1, -1, 1,  0x31, 0x00, 0x00, 0x00,
            "#ff6cb5", 1, 1, 2,    0x04, 0x00, 0x31, 0x31,
            "#4eff00", 0, 1, 2,    0x01, 0x00, 0x31, 0x31,
            "#5c33ff", 0, 1, 2,    0x01, 0x00, 0x31, 0x00,
            "#fea03a", -1, -1, 2,  0x00, 0x00, 0x04, 0x01
         ];

         var dx = 0;
         var dy = 0;

         var anchor_x = tile_data [(n * 8) + 1] * block_size;
         var anchor_y = tile_data [(n * 8) + 2] * block_size;
         var grid_size = tile_data [(n * 8) + 3];
         var color = tile_data [(n * 8) + 0];

         for (var i = 0; i < 4; i++) {
            var tris = tile_data [(n * 8) + 4 + i];
            var t1 = (tris >> 4) & 0xf;
            var t2 = tris & 0xf;

            dy = ((grid_size - 1) - Math.floor (i / grid_size)) * block_size;
            dx = (i % grid_size) * block_size;

            if (t1 !== 0) {
               drawTri (x + dx + anchor_x, y + dy + anchor_y, t1, color);
            }
            if (t2 !== 0) {
               drawTri (x + dx + anchor_x, y + dy + anchor_y, t2, color);
            }
         }
      };

      for (var x = 0; x < 8; x++) {
         drawTile (x * 2 * block_size, 0, x);
      }

      self.addChild (self.drawNode);
   }

});

