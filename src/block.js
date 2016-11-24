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
         aq.createTileNodeAtRotation (0, 0, tile_num, 0),
         aq.createTileNodeAtRotation (0, 0, tile_num, 1),
         aq.createTileNodeAtRotation (0, 0, tile_num, 2),
         aq.createTileNodeAtRotation (0, 0, tile_num, 3),
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

   getTileData: function () {
       var self = this;
       return aq.TILE_DATA [self.tile_num];
   },

   getTileNum: function () {
       var self = this;
       return self.tile_num;
   },

   rotateRight90: function () {
       var self = this;

       var old_rotation = self.rot;

       self.drawNodes [old_rotation].setVisible (false);

       var new_rotation = (old_rotation + 1) & 3;

       self.drawNodes [new_rotation].setVisible (true);

       var td = self.getTileData ();

       // Gets the anchor point for the current rotation
       var anchor_x = td.anchors[old_rotation][0];
       var anchor_y = td.anchors[old_rotation][1];

       // -1 in the anchors array means don't bother offsetting by anchors (ie. for the 1x1 tile)
       if (anchor_x !== -1) {

          // Get the anchor point for the new rotation (which is 90 degrees more than the old rotation)
          var anchor_i = td.anchors[new_rotation][0];
          var anchor_j = td.anchors[new_rotation][1];

          // Work out the difference in the positions of the anchor point and offset the tile by
          // that delta in the x and y.
          var new_x = self.x + ((anchor_x - anchor_i) * aq.config.BLOCK_SIZE);
          var new_y = self.y - ((anchor_y - anchor_j) * aq.config.BLOCK_SIZE);   //Why is this - and not + ?

          self.setPosition (new_x, new_y);
       }

       self.rot = new_rotation;
   }

});

