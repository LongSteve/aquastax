'use strict';

aq.Block = cc.Node.extend ({

   drawNode: null,

   ctor: function (type) {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;

      self.drawNode = new cc.DrawNode ();

      var drawTri = function (x, y, type) {
         var triangle;
         switch (type) {
         case 0:
            triangle = [
               cc.p (x, y),                  // bottom left    |\
               cc.p (x, y + block_size),     // top left       | \
               cc.p (x + block_size, y)      // bottom right   |__\
            ];
            break;
         case 1:
            triangle = [
               cc.p (x, y),                                 // bottom left    |--/
               cc.p (x, y + block_size),                    // top left       | /
               cc.p (x + block_size, y + block_size)        // bottom right   |/
            ];
            break;
         case 2:
            triangle = [
               cc.p (x, y + block_size),                       // bottom left    \--|
               cc.p (x + block_size, y + block_size),          // top left        \ |
               cc.p (x + block_size, y)                        // bottom right     \|
            ];
            break;
         case 3:
            triangle = [
               cc.p (x, y),                                    // bottom left      /|
               cc.p (x + block_size, y + block_size),          // top left        / |
               cc.p (x + block_size, y)                        // bottom right   /__|
            ];
            break;
         }

         self.drawNode.drawPoly (triangle, cc.color (0,0,255,128), 4, cc.color (255,255,255,255));
      };

      var drawBlock = function (x, y) {
         drawTri (x, y, 3);
         drawTri (x, y, 1);
      };

      drawBlock (0, 0);

      self.addChild (self.drawNode);
   }

});

