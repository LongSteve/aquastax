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

   var c = cc.color (color);
   node.drawPoly (triangle, c, 0, c);
};

/**
 * Determine if a grid cell (either from a block or within the grid) is a solid square
 *
 * @param c the grid cell data value
 * @return true is the cell is a solid square made of two triangles, and not a single triangle
 */
aq.isSquareCell = function (c) {
   return (((c & 0xff) === 0x31) || ((c & 0xff) === 0x13) || ((c & 0xff) === 0x24) || ((c & 0xff) === 0x42));
};

/**
 * Determine if a grid cell is a single triangle, of the given type
 *
 * @param c the grid cell data value
 * @param t the triangle type (optional) (see block.js)
 * @return true if the cell contains just one single triangle, and it is of the given type
 */
aq.isSingleTriangleCell = function (c, t) {

   // Empty
   if (c === 0) {
      return false;
   }

   // Solid square
   if (aq.isSquareCell (c)) {
      return false;
   }

   if (typeof t === 'undefined') {
      return true;
   }
   
   // Otherwise
   return (((c & 0x0f) === t) || (((c >> 4) & 0x0f) === t));
};

/**
 * A fatal error has occured in the code. Hopefully, these will 
 * never occur in the production game, but while developing, 
 * it's better to fail fast. 
 */
aq.fatalError = function (error) {
   cc.log (error);
   window.alert (error);
   throw (error);
};

/**
 * Create a multi-dimensional array given the dimension lengths.
 * Used for porting code like:
 *   int a[5][10] === createArray(5,10)
 *
 * From https://stackoverflow.com/a/966938
 */
aq.createArray = function (length) {
    var arr = new Array (length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call (arguments, 1);
        while (i--) {
           arr [length - 1 - i] = aq.createArray.apply (this, args);
        }
    }

    return arr;
};
