'use strict';

aq.Grid = cc.Node.extend ({

   blocks_wide: 0,

   blocks_high: 0,

   ctor: function (wide, high) {
      var self = this;

      // 1. super init first
      self._super ();

      self.blocks_wide = wide;
      self.blocks_high = high;

      self.bx = 0;
      self.by = 0;

      var block_size = aq.config.BLOCK_SIZE;

      var grid = new cc.DrawNode ();
      var drawGrid = function () {
         var p1, p2;
         for (var x = 0; x <= self.blocks_wide * block_size; x += block_size) {

            p1 = cc.p (x,0);
            p2 = cc.p (x, (self.blocks_high * block_size));
            grid.drawSegment (p1, p2, 1, cc.color.white);
         }

         for (var y = 0; y <= self.blocks_high * block_size; y += block_size) {

            p1 = cc.p (0, y);
            p2 = cc.p (0 + (self.blocks_wide * block_size), y);
            grid.drawSegment (p1, p2, 1, cc.color.white);
         }
      };

      drawGrid ();

      self.addChild (grid);
   }
});

