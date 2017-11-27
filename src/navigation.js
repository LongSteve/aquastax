'use strict';

var WALK_BOT      = (1 << 8);
var SIT_LEFT      = (1 << 9);
var SIT_RIGHT     = (1 << 10);
//var STAND_LEFT    = (1 << 11);
//var STAND_RIGHT   = (1 << 12);

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
         let p = self.grid.getGridPositionForIndex (i);
         if (self.canWalk (i)) {
            let p1 = cc.p (p.x + 1, p.y + 1);
            let p2 = cc.p (p1.x + aq.config.BLOCK_SIZE - 2, p1.y);
            let drawNode = new cc.DrawNode ();
            drawNode.drawSegment (p1, p2, 2, cc.color.GREEN);
            n.addChild (drawNode, 1);

            if (self.canSitLeft (i)) {
               //let drawNode = new cc.DrawNode ();
               drawNode.drawDot (p, 4, cc.color.BLUE);
               //n.addChild (drawNode, 2);
            }

            if (self.canSitRight (i)) {
               let p1 = cc.p (p.x, p.y);
               p1.x += aq.config.BLOCK_SIZE;
               drawNode.drawDot (p1, 4, cc.color.YELLOW);
            }
         }
      }

      return self.debug_node;
   },

   _indexMatchFlag: function (index, flag) {
      var self = this;
      return (self.nav_grid [index] & flag) !== 0;
   },

   canWalk: function (index) {
      var self = this;

      if (index < 0) {
         return true;
      }

      return self._indexMatchFlag (index, WALK_BOT);
   },

   _canSit: function (index, flag) {
       var self = this;

       if (index < 0) {
          return true;
       }

       return self._indexMatchFlag (index, flag);
   },

   canSitLeft: function (index) {
      var self = this;
      return self._canSit (index, SIT_LEFT);
   },

   canSitRight: function (index) {
      var self = this;
      return self._canSit (index, SIT_RIGHT);
   },

   updateNavData: function () {
      var self = this;

      // Set the nav flags in the nav_grid data

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         // Clear the flags and reset cell data (the triangles)
         self.nav_grid [i] = self.grid.game_grid [i] & 0xff;
      }

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         // walkability
         self.nav_grid [i] |= self._determineWalkFlags (i);

         // sitability
         self.nav_grid [i] |= self._determineSitFlags (i);
      }
   },

   _determineWalkFlags: function (index) {
      var self = this;

      if (index < self.grid.blocks_wide) {
         return WALK_BOT;
      }

      var g = self.nav_grid [index];
      var g_below = self.nav_grid [index - self.grid.blocks_wide];

      if (
         (g & 0x0f) === 0x01 ||
         (g & 0xf0) === 0x10 ||
         (g & 0x0f) === 0x04 ||
         (g & 0xf0) === 0x40 ||

         (g_below & 0x0f) === 0x02 ||
         (g_below & 0xf0) === 0x20 ||

         (g_below & 0x0f) === 0x03 ||
         (g_below & 0xf0) === 0x30 ||

         self._isPlatform (g_below)
         )
       {
          return WALK_BOT;
       }

       return 0;
   },

   _determineSitFlags: function (index) {
       var self = this;

       if (index < self.grid.blocks_wide) {
          return 0;
       }

       var g = self.nav_grid [index] & 0xff;
       if (g !== 0) {
          return 0;
       }

       let bx = index % self.grid.blocks_wide;
       let can_sit_left = 0;
       let can_sit_right = 0;

       if (bx > 0) {
          let g_left = self.nav_grid [index - 1] & 0xff;
          let g_below_left = self.nav_grid [index - 1 - self.grid.blocks_wide] & 0xff;
          can_sit_left = (g_left === 0 && g_below_left === 0 ? SIT_LEFT : 0);
       }

       if (bx < self.grid.blocks_wide - 1) {
          let g_right = self.nav_grid [index + 1] & 0xff;
          let g_below_right = self.nav_grid [index + 1 - self.grid.blocks_wide] & 0xff;
          can_sit_right = (g_right === 0 && g_below_right === 0 ? SIT_RIGHT : 0);
       }

       return can_sit_left | can_sit_right;
   },

   _isPlatform: function (/*index*/) {
       // TODO: Add this test when platforms are implemented
       return false;
   }
});
