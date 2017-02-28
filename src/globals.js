'use strict';

/**
 * Global (at least in the aq. namespace) methods are defined here.  Can be utilities, or
 * anything that doesn't fit with any of the other modules.
 */

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

   node.drawPoly (triangle, cc.color (color), 4, true);
};


