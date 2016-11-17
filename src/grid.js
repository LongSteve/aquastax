'use strict';

aq.Grid = cc.Node.extend ({

   blocks_wide: 0,

   blocks_high: 0,

   game_grid: null,

   ctor: function (wide, high) {
      var self = this;

      // 1. super init first
      self._super ();

      self.blocks_wide = wide;
      self.blocks_high = high;

      self.game_grid = new Array (wide * high * 2);

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
   },

   drawTri: function (node, x, y, type, color) {
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
   },

   drawGridBlocks: function () {
       var self = this;

       var block_size = aq.config.BLOCK_SIZE;

       var p1, p2;
       var p = 0;
       for (var y = 0; y < self.blocks_high * block_size; y += block_size) {
          for (var x = 0; x < self.blocks_wide * block_size; x += block_size, p++) {
             var d = self.game_grid [p];
             if (d != 0) {

                var node = new cc.DrawNode ();
                node.x = x;
                node.y = y;

                var tile = aq.TILE_DATA [(d >> 24) & 0xff];

                if ((d & 0x0f) != 0) {
                   self.drawTri (node, 0, 0, (d & 0x0f), cc.color (tile.color));
                }

                if ((d & 0xf0) != 0) {
                   self.drawTri (node, 0, 0, ((d >> 4) & 0x0f), cc.color (tile.color));
                }

                self.addChild (node)
             }
          }
      }
   },

   collideBlock: function (block) {

       var self = this;

       var tile_data = block.getTileData ();
       var grid_size = tile_data.grid_size;

       var gridIndex = function (node) {
          var y = Math.floor (node.y / aq.config.BLOCK_SIZE);
          var x = Math.floor (node.x / aq.config.BLOCK_SIZE);
          var i = (y * self.blocks_wide) + x;
          return i;
       };

       console.log (gridIndex (block));

       var top_left = gridIndex (block) + ((grid_size - 1) * self.blocks_wide);

       var x,y;

       var game_grid = self.game_grid;

       // set the position in the grid to the collision
       for (y = 0; y < grid_size; y++)
       {
          for (x = 0; x < grid_size; x++)
          {
             var grid_pos = top_left - (y * self.blocks_wide) + x;

             if (grid_pos < 0) {
                continue;
             }

             var block_pos = x + (y * grid_size);

             var block_grid_pos = tile_data.grid_data [block.rot][block_pos];

             if (block_grid_pos != 0)
             {
                if ((block_grid_pos & 0x0f) != 0)
                {
                   if ((game_grid[grid_pos] & 0x0f) == 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | (block_grid_pos & 0x0f) | (block.num << 24);
                   }
                   else if ((game_grid[grid_pos] & 0xf0) == 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | ((block_grid_pos<<4) & 0xf0) | (block.num << 24);
                   }
                }

                if ((block_grid_pos & 0xf0) != 0)
                {
                   if ((game_grid[grid_pos] & 0x0f) == 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | ((block_grid_pos>>4) & 0x0f) | (block.num << 24);
                   }
                   else if ((game_grid[grid_pos] & 0xf0) == 0)
                   {
                      game_grid[grid_pos] = (game_grid[grid_pos]) | (block_grid_pos & 0xf0) | (block.num << 24);
                   }
                }
             }
          }
       }

       // Render the grid now it should have some data in it
       self.drawGridBlocks ();
   }
});

