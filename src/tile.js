'use strict';


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


