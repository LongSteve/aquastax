'use strict';

var NAVIGATION_DEBUGGING = true;

aq.nav = aq.nav || {};

(function () {

// constants
aq.nav.WALK_BOT      = (1 << 8);
aq.nav.SIT_LEFT      = (1 << 9);
aq.nav.SIT_RIGHT     = (1 << 10);
aq.nav.STAND_LEFT    = (1 << 11);
aq.nav.STAND_RIGHT   = (1 << 12);
aq.nav.CLIMB         = (1 << 13);      // climbing occurs up the left edge of a cell

})();

aq.Navigation = cc.Node.extend ({

   // Reference to the game grid
   grid: null,

   // Gumbler sprites
   gumblers: null,

   // Debug draw nodes to display the nav data
   debug_node: null,

   // Highlight the grid cell under the mouse
   grid_pos_highlight: null,

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
      var self = this;

      // super init first
      self._super ();

      self.gumblers = [];

      return this;
   },

   initWithGrid: function (grid) {
      var self = this;

      self.grid = grid;

      self.nav_grid = new Array (self.grid.grid_cell_count);

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         self.nav_grid [i] = self.grid.game_grid [i] & 0xff;
      }

      self.grid_pos_highlight = new cc.DrawNode();
      self.grid_pos_highlight.index = 0;
      self.addChild (self.grid_pos_highlight);

      aq.path.initPathfinding ();

      if (NAVIGATION_DEBUGGING) {
         self.debug_node = new cc.Node ();
         self.addChild (self.debug_node);
         self.updateDebugNavNodes ();
      }

      // The custom event listener will be initially paused.  It is un-paused
      // by super::onEnter (called below in onEnter)
      cc.eventManager.addListener (cc.EventListener.create ({
         event: cc.EventListener.CUSTOM,
         eventName: aq.Grid.EVENT_TYPE,
         callback: function (event) {
           self.gridEvent (event);
         }
      }), self);

      cc.eventManager.addListener ({
         event: cc.EventListener.MOUSE,
         onMouseMove: function (event) {
            let l = event.getLocation ();
            let p = self.convertToNodeSpace (l);
            self.highlightPos (p);
         }
      }, self);
   },

   getGrid: function () {
       var self = this;
       return self.grid;
   },

   onEnter: function () {
      var self = this;

      // This is important to un-pause the custom event listener
      this._super ();

      // Initialise the nav data for the first time
      self.updateNavData ();

      self.scheduleUpdate ();
   },

   addGumbler: function (n) {
      var self = this;

      if (typeof (n) === 'undefined') {
         n = 0;
      }

      let gumbler = new aq.spritey.Gumbler ();
      gumbler.initWithTestData (aq.spritey.test [n]);
      self.addChild (gumbler);
      self.gumblers.push (gumbler);
   },

   update: function () {
      var self = this;

      // handle the gumblers
      self.updateGumblers ();

      if (NAVIGATION_DEBUGGING) {
         self.updateDebugNavNodes ();
      }
   },

   highlightPos: function (p) {
      var self = this;

      if (!self.grid_pos_highlight) {
         return;
      }

      let block_size = aq.config.BLOCK_SIZE;
      let index = self.grid.getGridIndexForPoint (p);

      // set a specific index for testing
      //index = 5 * 14 + 6;

      if (index !== self.grid_pos_highlight.index) {
         self.grid_pos_highlight.index = index;

         self.grid_pos_highlight.clear ();

         // Add in the geometry for a rectangle to highlight the block grid position
         self.grid_pos_highlight.drawRect (cc.p (0,0), cc.p (block_size, block_size),
                                           null, // fillcolor
                                           4,    // line width
                                           cc.color (255,0,0,255));

         self.grid_pos_highlight.setPosition (self.grid.getGridPositionForIndex (index));
      }
   },

   updateDebugNavNodes: function () {
      var self = this;

      self.debug_node.removeAllChildren ();

      let grid_nav = new cc.DrawNode ();

      for (let i = 0; i < self.grid.grid_cell_count; i++) {
         let p = self.grid.getGridPositionForIndex (i);
         if (self.canWalk (i)) {
            let p1 = cc.p (p.x + 1, p.y + 1);
            let p2 = cc.p (p1.x + aq.config.BLOCK_SIZE - 2, p1.y);
            grid_nav.drawSegment (p1, p2, 2, cc.color.GREEN);

            if (self.canSitLeft (i)) {
               grid_nav.drawDot (p, 4, cc.color.BLUE);
            }

            if (self.canSitRight (i)) {
               let p1 = cc.p (p.x, p.y);
               p1.x += aq.config.BLOCK_SIZE;
               grid_nav.drawDot (p1, 4, cc.color.YELLOW);
            }
         }
      }

      self.debug_node.addChild (grid_nav, 1);

      for (let i = 0; i < self.gumblers.length; i++) {
         let gumbler = self.gumblers [i];
         let p1 = self.grid.getGridPositionForNode (gumbler);
         p1.x += aq.config.BLOCK_SIZE / 2;
         p1.y += aq.config.BLOCK_SIZE / 2;
         let gumbler_nav = new cc.DrawNode ();
         gumbler_nav.drawDot (p1, 4, cc.color.GREY);

         let path = gumbler.getNavigationPath ();
         if (path) {
            for (let j = 0; j < path.length; j++) {
               let index = path [j];
               if (index !== -1) {
                  let pos = self.grid.getGridPositionForIndex (index);
                  pos.x += aq.config.BLOCK_SIZE / 2;
                  pos.y += aq.config.BLOCK_SIZE / 2;
                  gumbler_nav.drawDot (pos, 4, cc.color.WHITE);
               }
            }
         }

         self.debug_node.addChild (gumbler_nav);
      }

      return self.debug_node;
   },

   _indexMatchFlag: function (index, flag) {
      var self = this;
      if (index < 0 || index > self.nav_grid.length) {
         return false;
      }
      return (self.nav_grid[index] & flag) !== 0;
   },

   canWalk: function (index) {
      var self = this;

     return self._indexMatchFlag (index, aq.nav.WALK_BOT);
   },

   _canSit: function (index, flag) {
       var self = this;
       return self._indexMatchFlag (index, flag);
   },

   canSitLeft: function (index) {
      var self = this;
      return self._canSit (index, aq.nav.SIT_LEFT);
   },

   canSitRight: function (index) {
      var self = this;
      return self._canSit (index, aq.nav.SIT_RIGHT);
   },

   canClimb: function (index) {
       var self = this;
       return self._indexMatchFlag (index, aq.nav.CLIMB);
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

         // climbability
         self.nav_grid [i] |= self._determineClimbFlags (i);
      }
   },

   _determineWalkFlags: function (index) {
      var self = this;

      if (index < self.grid.blocks_wide) {
         return aq.nav.WALK_BOT;
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
          return aq.nav.WALK_BOT;
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
          can_sit_left = (g_left === 0 && g_below_left === 0 ? aq.nav.SIT_LEFT : 0);
       }

       if (bx < self.grid.blocks_wide - 1) {
          let g_right = self.nav_grid [index + 1] & 0xff;
          let g_below_right = self.nav_grid [index + 1 - self.grid.blocks_wide] & 0xff;
          can_sit_right = (g_right === 0 && g_below_right === 0 ? aq.nav.SIT_RIGHT : 0);
       }

       return can_sit_left | can_sit_right;
   },

   _determineClimbFlags: function (index) {
      var self = this;

      // Cannot climb along the bottom row, or far left hand column
      if ((index < aq.config.GRID_WIDTH) || ((index % aq.config.GRID_WIDTH) === 0)) {
         return 0;
      }

      // TODO: Check for the blocks under water
      // TODO: Check for unclimable blocks

      // Only climb up where there are two square grid cells together (horizontally)
      let c1 = self.nav_grid [index];
      let c2 = self.nav_grid [index - 1];
      if (aq.isSquareCell (c1) && aq.isSquareCell (c2)) {
         return aq.nav.CLIMB;
      }

      return 0;
   },

   _isPlatform: function (/*index*/) {
       // TODO: Add this test when platforms are implemented
       return false;
   },

   gridEvent: function (event) {
      var self = this;

      let event_data = event.getUserData ();

      cc.log ('Grid Event: ' + event_data.event +
              (event_data.block ? (' block: ' + JSON.stringify (event_data.block.getPosition ())) : ''));

      // Any grid event (block land or break/collapse) means the nav data must be re-calculated
      self.updateNavData ();

      // Process the gumbler behaviours for when a grid event occurs
      for (let i = 0; i < self.gumblers.length; i++) {
         let gumbler = self.gumblers [i];
         aq.behaviour.GumblerRespondToGridEvent (event_data, gumbler);
      }
   },

   updateGumblers: function () {
       var self = this;

       var climbable = function (x, y) {
          let i = self.grid.getGridIndexForPosition (x, y);
          return self.canClimb (i);
       };

       for (let i = 0; i < self.gumblers.length; i++) {
          let gumbler = self.gumblers [i];
          aq.behaviour.GumblerHandleGameUpdate (gumbler, self);

          // TEMP: Gumbler pathfinding code.  To be refactored into behaviour.js
          let start = self.grid.getGridPointForNode (gumbler);

          // route the gumbler up, as for an infinite level
          //let exit = cc.clone (start);
          //exit.y += self.grid.getHeight () >> 1;

          // Set the path using the mouse pointer
          let exit = self.grid.getGridPointForIndex (self.grid_pos_highlight.index);

          let path = [];

          // Temp: Check against the sprite anchor point being under the 0 line
          if (start.y < 0 || start.x < 0) {
             continue;
          }

          // Temp: Also make sure the mouse pointer isn't offscreen
          if (exit.y < 0 || exit.x < 0) {
             continue;
          }

          aq.path.findPath (start.x, start.y, exit.x, exit.y, path, climbable);

          gumbler.setNavigationPath (path);
       }
   }
});
