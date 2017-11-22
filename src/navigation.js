'use strict';

var WALK_TOP      = (1 << 8);
var SIT_LEFT      = (1 << 9);
var SIT_RIGHT     = (1 << 10);
var STAND_LEFT    = (1 << 11);
var STAND_RIGHT   = (1 << 12);

aq.Navigation = cc.Class.extend ({

   // Reference to the game grid
   grid: null,

   // Debug draw nodes to display the nav data
   debug_node: null,

   // The nav grid is an single dimensional array of ints, starting at 0 bottom left.
   // It mirrors the game grid, and is generated from the game grid as base data.
   //
   // Each entry uses the following bit pattern:
   //
   // 31            23            15         7    3    0
   // |             |             | flags    | t2 | t1 |
   //
   nav_grid: null,

   ctor: function () {
      return this;
   },

   initWithGrid: function (grid) {
      var self = this;

      self.grid = grid;

      self.nav_grid = new Array (self.grid.grid_cell_count);

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         self.nav_grid [i] = self.grid.game_grid [i] & 0xff;
      }
   },

   updateDebugNavNodes: function () {
      var self = this;

      if (!self.debug_node) {
         self.debug_node = new cc.Node ();
      }
      self.debug_node.removeAllChildren ();

      var n = self.debug_node;

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         if (self.canWalkOn (i)) {
            let p1 = self.grid.getGridPositionForIndex (i);
            p1.y += aq.config.BLOCK_SIZE;
            let p2 = cc.p (p1.x + aq.config.BLOCK_SIZE, p1.y);
            let drawNode = new cc.DrawNode ();
            drawNode.drawSegment (p1, p2, 3, cc.color.GREEN);
            n.addChild (drawNode);
         }
      }

      return self.debug_node;
   },

   _indexMatchFlag: function (index, flag) {
      var self = this;
      return (self.nav_grid [index] & flag) !== 0;
   },

   canWalkOn: function (index) {
      var self = this;

      if (index < 0) {
         return true;
      }

      return self._indexMatchFlag (index, WALK_TOP);
   },

   updateNavData: function () {
      var self = this;

      // Set the nav flags in the nav_grid data

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         // Clear the flags and reset cell data (the triangles)
         self.nav_grid [i] = self.grid.game_grid [i] & 0xff;

         // Determine walkability
         if (self._determineWalkFlag (i)) {
            self.nav_grid [i] |= WALK_TOP;
         }
      }
   },

   _determineWalkFlag: function (index) {
      var self = this;
      var g = self.nav_grid [index];
      var g_above = self.nav_grid [index + self.grid.blocks_wide];

      if (
         index < 0 ||
         (g & 0x0f) === 0x02 ||
         (g & 0xf0) === 0x20 ||
         (g & 0x0f) === 0x03 ||
         (g & 0xf0) === 0x30 ||

         (g_above & 0x0f) === 0x01 ||
         (g_above & 0xf0) === 0x10 ||

         (g_above & 0x0f) === 0x04 ||
         (g_above & 0xf0) === 0x40 ||

         self._isPlatform (index)
         )
       {
          return true;
       }

       return false;
   },

   _isPlatform: function (/*index*/) {
       // TODO: Implement this test
       return false;
   }
});
