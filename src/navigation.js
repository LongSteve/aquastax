'use strict';

var NAVIGATION_DEBUGGING = true;

aq.nav = aq.nav || {};

(function () {

// constants
aq.nav.WALK_BOT      = (1 << 8);
aq.nav.SIT_LEFT      = (1 << 9);
aq.nav.SIT_RIGHT     = (1 << 10);
aq.nav.CLIMB_LEFT    = (1 << 11);        // vertical climbing occurs up the left edge of a cell
aq.nav.CLIMB_TOP     = (1 << 12);        // horizontal climb movement occurs on the top edge of a cell

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

   // Pathfinding start and end
   path_start: null,
   path_end: null,
   path: null,

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
         },
         onMouseDown: function (event) {
             let l = event.getLocation ();
             let p = self.convertToNodeSpace (l);
             if (event.getButton () === cc.EventMouse.BUTTON_LEFT) {
                self.path_start = p;
             } else if (event.getButton () === cc.EventMouse.BUTTON_RIGHT) {
                self.path_end = p;
             }
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

      let highlight = function () {
         let h = new cc.DrawNode();
         h.index = 0;
         self.addChild (h);
         return h;
      };

      //gumbler.temp_pos_highlight = highlight ();
      gumbler.temp_path_start_highlight = highlight ();
   },

   update: function () {
      var self = this;

      // handle the gumblers
      self.updateGumblers ();

      if (NAVIGATION_DEBUGGING) {
         self.updateDebugNavNodes ();
      }
   },

   highlightPos: function (p, highlight) {
      var self = this;

      if (!highlight) {
         highlight = self.grid_pos_highlight;
      }

      if (!highlight) {
         return;
      }

      let block_size = aq.config.BLOCK_SIZE;
      let index = self.grid.getGridIndexForPoint (p);

      // set a specific index for testing
      //index = 5 * 14 + 6;

      if (index !== highlight.index) {
         highlight.index = index;

         highlight.clear ();

         // Add in the geometry for a rectangle to highlight the block grid position
         highlight.drawRect (cc.p (0,0), cc.p (block_size, block_size),
                             null, // fillcolor
                             4,    // line width
                             cc.color (255,0,0,255));

         highlight.setPosition (self.grid.getGridPositionForIndex (index));
      }
   },

   updateDebugNavNodes: function () {
      var self = this;

      self.debug_node.removeAllChildren ();

      let grid_nav = new cc.DrawNode ();

      // Render walk and climb segments
      /*
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

         // Climb vertically up
         if (self.canClimbLeft (i)) {
            let p1 = cc.p (p.x + 1, p.y + 1);
            let p2 = cc.p (p1.x + 1, p1.y + aq.config.BLOCK_SIZE - 1);
            grid_nav.drawSegment (p1, p2, 2, cc.color (255,0,0,255));
         }

         // Climb horizontally along
         if (self.canClimbTop (i)) {
            let p1 = cc.p (p.x + 1, p.y + aq.config.BLOCK_SIZE - 1);
            let p2 = cc.p (p1.x + aq.config.BLOCK_SIZE - 1, p1.y);
            grid_nav.drawSegment (p1, p2, 2, cc.color (255,0,255,255));
         }
      }
      */

      self.debug_node.addChild (grid_nav, 1);

      // Render path data
      let renderPath = function (path, node) {

         let drawArrow = function (p1, p2, color) {
            // some trigonometry...
         };

         if (path) {
            for (let j = 0; j < path.length; j++) {
               let current_index = path [j];
               if (current_index !== -1 && j < path.length - 1) {
                  let next_index = path [j + 1];

                  let current_pos = self.grid.getGridPositionForIndex (current_index);
                  let next_pos = self.grid.getGridPositionForIndex (next_index);

                  // vertical path up?
                  if (next_pos.y > current_pos.y) {
                     let p1 = cc.p (current_pos.x, current_pos.y + aq.config.BLOCK_SIZE);
                     let p2 = cc.p (p1.x, p1.y + aq.config.BLOCK_SIZE);
                     node.drawSegment (p1, p2, 2, cc.color (0,255,0,255));
                     drawArrow (p1, p2, cc.color.YELLOW);
                  }

                  // vertical path down?
                  if (next_pos.y < current_pos.y) {
                     let p1 = cc.p (current_pos.x, current_pos.y + aq.config.BLOCK_SIZE);
                     let p2 = cc.p (p1.x, p1.y - aq.config.BLOCK_SIZE);
                     node.drawSegment (p1, p2, 2, cc.color (0,255,0,255));
                     drawArrow (p1, p2, cc.color.YELLOW);
                  }

                  // horizontal path left
                  if (next_pos.x < current_pos.x) {
                     let p1 = cc.p (current_pos.x, current_pos.y + aq.config.BLOCK_SIZE);
                     let p2 = cc.p (p1.x - aq.config.BLOCK_SIZE, p1.y);
                     node.drawSegment (p1, p2, 2, cc.color (0,255,0,255));
                     drawArrow (p1, p2, cc.color.YELLOW);
                  }

                  // horizontal path right?
                  if (next_pos.x > current_pos.x) {
                     let p1 = cc.p (current_pos.x, current_pos.y + aq.config.BLOCK_SIZE);
                     let p2 = cc.p (p1.x + aq.config.BLOCK_SIZE, p1.y);
                     node.drawSegment (p1, p2, 2, cc.color (0,255,0,255));
                     drawArrow (p1, p2, cc.color.YELLOW);
                  }

               }

               // blob at the center of the path cell
               let pos = self.grid.getGridPositionForIndex (current_index);
               pos.x += aq.config.BLOCK_SIZE / 2;
               pos.y += aq.config.BLOCK_SIZE / 2;
               let col = cc.color.WHITE;

               if (j === 0) {
                  col = cc.color.GREEN;      // start of path
               } else if (j === path.length - 1) {
                  col = cc.color.RED;        // end of path
               }

               node.drawDot (pos, 4, col);
            }
         }
      };

      // Render gumbler path points
      /*
      for (let i = 0; i < self.gumblers.length; i++) {
         let gumbler = self.gumblers [i];
         let gumbler_nav = new cc.DrawNode ();

         let path = gumbler.getNavigationPath ();
         renderPath (path, gumbler_nav);

         self.debug_node.addChild (gumbler_nav);
      }
      */

      // Render the test path, based on the mouse click points
      if (self.path) {
         let path_node = new cc.DrawNode ();

         renderPath (self.path, path_node);

         self.debug_node.addChild (path_node);
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

   canClimbLeft: function (index) {
       var self = this;
       //
       return self._indexMatchFlag (index, aq.nav.CLIMB_LEFT);
   },

   canClimbTop: function (index) {
       var self = this;
       //
       return self._indexMatchFlag (index, aq.nav.CLIMB_TOP);
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

      let climb = 0;

      // Only climb (vertically) up where there are two square grid cells together (horizontally)
      let check_cell = self.nav_grid [index];
      let check_left = self.nav_grid [index - 1];
      let check_below = self.nav_grid [index - aq.config.GRID_WIDTH];
      let check_below_left = self.nav_grid [index - aq.config.GRID_WIDTH - 1];
      if (aq.isSquareCell (check_cell) && aq.isSquareCell (check_left) &&
          aq.isSquareCell (check_below) && aq.isSquareCell (check_below_left)) {
         climb |= aq.nav.CLIMB_LEFT;
      }

      // Only climb along (horizontally) where there is a walkable edge to the left and the right,
      // and the cell is not in the far right column (far left also not allowed, but handled above)
      if (((index + 1) % aq.config.GRID_WIDTH) !== 0) {
         let check_right = self.nav_grid [index + 1];
         if (aq.isSquareCell (check_cell) && aq.isSquareCell (check_left) && aq.isSquareCell (check_right)) {
            climb |= aq.nav.CLIMB_TOP;
         }
      }

      return climb;
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
         aq.behaviour.GumblerRespondToGridEvent (event_data, gumbler, self);
      }
   },

   updateGumblers: function () {
       var self = this;

       var climbable = function (x, y) {
          let i = self.grid.getGridIndexForPosition (x, y);
          return self.canClimbLeft (i);
       };

       if (self.path_start && self.path_end) {
          let path = [];

          let start_index = self.grid.getGridIndexForPoint (self.path_start);
          let start = self.grid.getGridPointForIndex (start_index);

          let end_index = self.grid.getGridIndexForPoint (self.path_end);
          let end = self.grid.getGridPointForIndex (end_index);

          aq.path.findPath (start.x, start.y, end.x, end.y, path, climbable);

          self.path = path;
       }

       for (let i = 0; i < self.gumblers.length; i++) {
          let gumbler = self.gumblers [i];
          aq.behaviour.GumblerHandleGameUpdate (gumbler, self);

          /*
          // Pathfind from the middle of the Gumbler, not his feet.  This works for both walking and climbing
          let gumbler_anchor = gumbler.getPosition ();
          let path_start = cc.p (gumbler_anchor.x, gumbler_anchor.y + (aq.config.BLOCK_SIZE * 1));

          // TEMP: Gumbler pathfinding code.  To be refactored into behaviour.js
          let start_index = self.grid.getGridIndexForPoint (path_start);
          let start = self.grid.getGridPointForIndex (start_index);

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

          // Highlight the gumbler grid cell
          //self.highlightPos (gumbler.getPosition (), gumbler.temp_pos_highlight);

          // Highlight the pathfinding start position
          let start_pos = self.grid.getGridPositionForIndex (start_index);
          self.highlightPos (start_pos, gumbler.temp_path_start_highlight);

          */
       }
   }
});
