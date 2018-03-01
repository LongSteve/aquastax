'use strict';

/* globals AXIS_COLLISION, SLOPE_COLLISION, NO_COLLISION, GRID_LEFT_EDGE_COLLISION, GRID_RIGHT_EDGE_COLLISION */

// The first block that falls at the beginning
//var BLOCK_SEQUENCE = [2,2,4,1,3,5,6];
//var BLOCK_SEQUENCE = [3,4,5,6];
var BLOCK_SEQUENCE = [];

// Disable this to prevent blocks from dropping automatically
var BLOCK_DROPPING = true;

// Fill the grid with alternating triangles to test the rendering
var TRIANGLE_TEST = false;

// This array is a list of blocks that get inserted into the grid at startup, handy for testing
var TEST_LAYOUT = false;

// Show the keypresses
var SHOW_KEYPRESS_INDICATORS = false;

var IX = 0;
var IY = 0;
var INITIAL_GRID = [
   // tile_num, rotation, x, y
   [2, 3, IX, IY],
   [2, 2, IX+2, IY],
   [2, 0, IX, IY+2],
   [2, 1, IX+2, IY+2],
   [0, 0, IX+2, IY+1],
   [6, 0, IX+1, IY+1],
   [7, 2, IX+1, IY+1]
];

var VSPACER = [
   [0, 0, IX+4, IY],
   [0, 2, IX+3, IY+1],
   [3, 0, IX+4, IY+3]
];

var HSPACER = [
   [3, 0, IX, IY],
   [6, 1, IX+1, IY-1],
   [6, 3, IX+2, IY],
   [6, 1, IX+4, IY-1],
   [6, 3, IX+5, IY],
   [6, 1, IX+7, IY-1],
   [6, 3, IX+8, IY],
   [6, 1, IX+10, IY-1],
   [6, 3, IX+11, IY],
   [3, 0, IX+13, IY]
];

// Define TEST_GRID to fill in the grid at the start
//var TEST_GRID = [33688612,33688612,67111938,117902372,117836849,67374129,67374129,50531377,33688642,84216881,84216881,16845873,16845890,16845890,33688612,67374099,67374099,117771313,101059603,67177508,3072,33688642,33688642,84347953,16780291,16845873,33688642,17239076,33688612,33688612,84216851,84216851,50531377,16845860,16845860,84216881,84216881,117443620,33688625,33688642,33688642,117771313,33688612,33688612,33688612,67374129,67374129,16845890,16845890,83889201,3108,3091,33688625,33688625,84216851,84216851,33688625,33688612,3072,67374116,3121,101059650,17173540,50531377,33688625,3138,3121,3108,16845890,16845890,33688625,33688625,67374099,67374099,67112002,3121,3121,33688625,33688625,33688625,67374129,67374129,101059650,17173540,33688612,33688612,33688642,67374099,67374099,461860,3108,33688625,33688625,33688642,67570724,16845873,84216881,84216881,33688612,33688642,33688642,50531377,3072,117836849,3091,50531377,33688642,33688642,117509169,16845873,84282417,3072,3072,3072,3072,3072,3072,101059603,33688642,16845890,16845890,16845843,17173553,3072,101059603,3072,0,0,0,0,3072,33688642,33688642,101059650,17173540,16845843,101059603,3072,3072,0,0,0,0,0,0,3072,3072,67374129,67374129,3072,3072,0,0,0,0,0,0,0,0,0,0,67111940,3072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
//var TEST_GRID = [0,0,3072,101059650,101059620,101059620,101059650,100666370,3072,0,0,3072,0,0,0,0,0,3072,3138,3091,3108,84216881,84216881,3072,0,0,0,3072,0,0,0,0,3072,3072,3072,84216881,84216898,3072,0,0,0,0,0,0,0,0,3072,16780290,84216851,84216851,84216898,83889154,0,0,0,0,0,0,0,0,3072,16845860,16845860,3072,3072,3072,0,0,0,0,0,0,0,0,0,3072,3072,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
//var TEST_GRID = [0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,3072,3138,3073,0,0,0,0,0,0,0,0,0,0,0,3138,3073,0,0,0,0,0,0,0,0,0,0,0,0,3072];
//var TEST_GRID = [0,3072,100666404,101059620,101059633,117443620,117902385,16845890,16845890,16845843,16780289,0,0,0,0,3072,3091,50531377,101125169,3091,117705764,50531377,16780324,16845843,3072,0,0,0,0,0,3072,3072,117443588,67374099,67374099,33688625,3091,50531377,3072,0,0,0,0,0,0,0,3072,84216881,84216881,33688625,33688625,50531377,3072,0,0,0,0,0,0,0,3072,84151345,67374116,3072,3072,3072,0,0,0,0,0,0,0,0,3072,101059633,67374116,3072,0,0,0,0,0,0,0,0,0,0,3072,100994097,50531377,3072,0,0,0,0,0,0,0,0,0,3072,84216851,84216851,33688625,3072,0,0,0,0,0,0,0,0,0,3072,84216881,84216881,33688625,33688625,3072,0,0,0,0,0,0,0,0,3072,83889153,3072,3072,3072];

var TEST_GRID = [0,3072,100666404,101059620,101059633,117443620,117902385,16845890,16845890,16845843,16780289,0,0,0,0,3072,3091,50531377,101125169,3091,117705764,50531377,16780324,16845843,3072,0,0,0,0,0,3072,3072,117443588,67374099,67374099,33688625,3091,50531377,3072,0,0,0,0,0,0,0,3072,84216881,84216881,33688625,33688625,50531377,33688642,3072,0,0,0,0,0,0,3072,84151345,67374116,3072,3072,33688642,33688642,3072,0,0,0,0,0,0,3072,101059633,67374116,3072,0,3072,3072,0,0,0,0,0,0,0,3072,100994097,50531377,3072,0,0,0,0,0,0,0,0,0,3072,84216851,84216851,33688625,3072,0,0,0,0,0,0,0,0,0,3072,84216881,84216881,33688625,33688625,3072,0,0,0,0,0,0,0,0,3072,83889201,3108,3072,50531377,3072,0,0,0,0,0,0,0,0,0,3072,3072,0,3072];



//var TEST_GRID = [];

var GameLayer = cc.Layer.extend ({

   // panels
   gamePanel: null,

   // grid
   grid: null,

   // currently falling block
   block: null,

   // height of the camera
   cameraHeight: 0,

   // count of dropped blocks
   blockCounter: 0,

   // collision test indicators
   collisionPoints: null,

   // Is the stack collapsing
   isCollapsing: false,

   // keypress indicators
   keyPressIndicators: null,
   keyMap: null,

   // Debug Data
   debugGridClusters: 0,
   debugGridGroups: 0,
   debugDropSpeed: 0,

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var w = block_size * blocks_wide;
      var h = cc.winSize.height;

      var blocks_high = Math.ceil ((h * 1.2) / block_size);

      // Root of gameplay area
      self.gamePanel = new cc.LayerColor (cc.color (128,0,0,255), w, h);
      self.gamePanel.setPosition ((cc.winSize.width - w) / 2, 0);
      self.addChild (self.gamePanel, 0);

      // Grid
      self.grid = new aq.Grid (blocks_wide, blocks_high);
      self.gamePanel.addChild (self.grid, 2);

      // Navigation
      self.navigation = new aq.Navigation ();
      self.navigation.initWithGrid (self.grid);
      self.gamePanel.addChild (self.navigation, 3);

      // Test Gumblers
      self.navigation.addGumbler (0);
      //self.navigation.addGumbler (1);

      // Create the first block to drop onto the playing area
      self.nextBlock ();

      //
      // Some indicators and debug info
      //
      self.moveHighlightL = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightL, 100);

      self.moveHighlightR = new cc.DrawNode ();
      self.gamePanel.addChild (self.moveHighlightR, 100);

      self.initKeyPressIndicators ();

      self.debugGridClusters = new cc.LabelTTF ('Clusters: 0', 'Arial', 32);
      self.debugGridClusters.setColor (cc.color.WHITE);
      self.debugGridClusters.setPosition (100,100);
      self.addChild (self.debugGridClusters);

      self.debugGridGroups = new cc.LabelTTF ('Groups: 0', 'Arial', 32);
      self.debugGridGroups.setColor (cc.color.GREEN);
      self.debugGridGroups.setPosition (100,140);
      self.addChild (self.debugGridGroups);

      self.debugDropSpeed = new cc.LabelTTF ('Speed: 0', 'Arial', 32);
      self.debugDropSpeed.setColor (cc.color.YELLOW);
      self.debugDropSpeed.setPosition (100,180);
      self.addChild (self.debugDropSpeed);

      var x, y;
      if (typeof (TEST_GRID) !== 'undefined') {
         self.grid.game_grid = TEST_GRID;
         self.grid.groupFloodFill (true);
      }

      if (TEST_LAYOUT) {
         var doBlock = function (GR, col, row) {
            for (var i = 0; i < GR.length; i++) {
               var gr = GR [i];
               var new_block = new aq.Block (true, gr[0]);
               new_block.setNewRotationAndPosition ({
                  rotation: gr [1],
                  position: cc.p ((col + gr [2]) * aq.config.BLOCK_SIZE, (row + gr [3]) * aq.config.BLOCK_SIZE)
               });
               self.grid.insertBlockIntoGrid (new_block);
            }
         };

         for (y = 0; y < 15; y += 5) {
            for (x = 0; x < 15; x += 5) {
               doBlock (INITIAL_GRID, x, y);
               if (x < 10) {
                  doBlock (VSPACER, x, y);
               }
            }
            doBlock (HSPACER, 0, y + 4);
         }
         self.grid.groupFloodFill (true);
      }

      if (TRIANGLE_TEST) {
         var tiles = [
         {
            'id': 'tileA',
            'flags': 'active',
            'color': '#ffffff',
            'anchors': [[-1,-1]],
            'grid_size': 1,
            'grid_data': [[0x03]],
            'tile_num': 0
         },
         {
            'id': 'tileB',
            'flags': 'active',
            'color': '#000000',
            'anchors': [[-1,-1]],
            'grid_size': 1,
            'grid_data': [[0x01]],
            'tile_num': 1
         }];
         var i = 0;
         for (y = 0; y < 15; y++) {
            for (x = 0; x < blocks_wide; x++) {
               var p = cc.p (x * aq.config.BLOCK_SIZE, y * aq.config.BLOCK_SIZE);

               var t1 = new aq.Block (true, -1, tiles [i++ & 1]);
               t1.setPosition (p);
               self.grid.insertBlockIntoGrid (t1);

               var t2 = new aq.Block (true, -1, tiles [i++ & 1]);
               t2.setPosition (p);
               self.grid.insertBlockIntoGrid (t2);
            }
         }
         self.grid.groupFloodFill (true);
      }

      cc.eventManager.addListener ({
         event: cc.EventListener.KEYBOARD,
         onKeyPressed: function (keyCode) {
            self.keyAction (keyCode, true);
         },
         onKeyReleased: function (keyCode){
            self.keyAction (keyCode, false);
         }
      }, self);

      self.scheduleUpdate ();
   },

   //
   // Keyboard Handling Code
   //

   // array of keys pressed
   keysPressed: [],

   // movement repeat timings
   moveDelayMS: 0,
   rotateDelayMS: 0,

   keyAction: function (keyCode, pressed) {
      var self = this;
      self.keysPressed [keyCode] = pressed;
      if (SHOW_KEYPRESS_INDICATORS) {
         try {
            self.keyPressIndicators[self.keyMap[keyCode]].setVisible (pressed);
         } catch (ex) {
            // catch error for a key not in the keyPressIndicators array
         }
      }
   },

   clearKeys: function () {
      var self = this;
      self.keysPressed [cc.KEY.up] = false;
      self.keysPressed [cc.KEY.down] = false;
      self.keysPressed [cc.KEY.left] = false;
      self.keysPressed [cc.KEY.right] = false;

      self.keysPressed [cc.KEY.w] = false;
      self.keysPressed [cc.KEY.s] = false;
   },

   initKeyPressIndicators: function () {
       var self = this;

       if (!SHOW_KEYPRESS_INDICATORS) {
          return;
       }

       // Create DrawNode objects to show the up,down,left and right key pressed states
       var i;

       self.keyPressIndicators = [];
       self.keyMap = [];

       var triangle = [
          cc.p (0, 0),
          cc.p (50, 50),
          cc.p (100,0)
       ];

       var offsets = [
          -250, 0, 0, cc.KEY.up,
          -300, -100, -90, cc.KEY.left,
          -100, 0, 90, cc.KEY.right,
          -150, -100, 180, cc.KEY.down
       ];

       for (i = 0; i < 4; i++) {
          self.keyPressIndicators [i] = new cc.DrawNode ();
          self.keyPressIndicators [i].drawPoly (triangle, cc.color (255,0,0), 4, cc.color (255,255,255));
          self.keyPressIndicators [i].x = self.gamePanel.x + offsets [(i*4) + 0];
          self.keyPressIndicators [i].y = cc.winSize.height / 2 + offsets [(i*4) + 1];
          self.keyPressIndicators [i].setRotation (offsets [(i*4) + 2]);
          self.addChild (self.keyPressIndicators [i]);
          self.keyPressIndicators [i].setVisible (false);

          self.keyMap [offsets [(i*4)+3]] = i;
       }
   },

   update: function () {
      var self = this;

      self.handleCameraMovement ();

      // Handle a collapsing stack. This takes president over normal block dropping and movement
      if (self.isCollapsing) {

         self.handleCollapsing ();

         if (!self.isCollapsing) {
            self.nextBlock ();
            aq.dispatchEvent (aq.Grid.EVENT_TYPE, aq.Grid.EVENT_STACK_COLLAPSED);
         }
      } else {
         self.handleBlockMovement (self.block);
      }

      var cl = self.grid.getClusterList();
      var l = cl ? cl.length : 0;
      self.debugGridClusters.setString ('Clusters: ' + l);

      var gl = self.grid.getGroupList();
      l = gl ? gl.length : 0;
      self.debugGridGroups.setString ('Groups: ' + l);
   },

   handleCameraMovement: function () {
       var self = this;

       var framesPerSecond = cc.game.config.frameRate;
       var cameraDy = (aq.config.BLOCK_SIZE * aq.config.CAMERA_MOVEMENT_RATE) / framesPerSecond;
       var deltaCamera = 0;

       // Currently, just move the camera with keys, but ultimately it will focus on
       // the lowest gumbler in the scene, moving up or down with them
       if (self.keysPressed [cc.KEY.w]) {
          deltaCamera = cameraDy;
       } else if (self.keysPressed [cc.KEY.s]) {
          deltaCamera = -cameraDy;
       }
       self.cameraHeight += deltaCamera;
       if (self.cameraHeight < 0) {
          self.cameraHeight = 0;
       }

       if (deltaCamera !== 0) {
          self.grid.moveToCamera (self.cameraHeight);
       }
   },

   fallingGroup: null,
   fallingCluster: null,

   handleCollapsing: function () {
       var self = this;

       // Big question.  Does stack collapse happen at the cluster or group level?
       // If at the cluster level, the large chunks will fall, but it may look less
       // 'realistic', but if at the group level, it could take a lot longer to
       // resolve a collapse as each block is going to fall individually.

       var movement = 0;

       var bm;
       var clusters, cluster, c;
       var groups, group, g;

       if (self.fallingGroup) {
          movement = self.handleBlockMovement (self.fallingGroup);
          if (movement === 0) {
             self.fallingGroup.removeFromParent (true);
             self.fallingGroup = null;
          } else {
             self.grid.groupFloodFill ();
             return;
          }
       } else if (self.fallingCluster) {
          movement = self.handleBlockMovement (self.fallingCluster);
          if (movement === 0) {
             self.fallingCluster.removeFromParent (true);
             self.fallingCluster = null;
          } else {
             self.grid.groupFloodFill ();
             return;
          }
       }

       self.grid.groupFloodFill ();
       clusters = self.grid.getClusterList ();

       for (c = 0; c < clusters.length; c++) {
          cluster = clusters [c];
          groups = cluster.groups;
          for (g = 0; g < groups.length; g++) {
             group = groups [g];
             if (group && group.node) {
                var groupNode = group.node;
                group.node = null;
                groupNode.removeFromParent (false);
                self.grid.removeGroupByIndex (group.group_index);
                self.gamePanel.addChild (groupNode, 3);
                self.fallingGroup = groupNode;

                bm = self.handleBlockMovement (self.fallingGroup);
                if (bm === 0) {
                   self.fallingGroup.removeFromParent ();
                   self.fallingGroup = null;
                } else {
                   self.grid.groupFloodFill ();
                }
                movement += bm;
             }
             if (movement > 0) {
                return;
             }
          }
       }

       self.grid.groupFloodFill ();
       self.fallingGroup = null;

       // Now test for any loose clusters that can fall, otherwise, we get the
       // rare case of a group surrounding another group, and they 'hold' each
       // other up.  By falling clusters, we get around this...

       movement = 0;

       clusters = self.grid.getClusterList ();

       for (c = 0; c < clusters.length; c++) {
          cluster = clusters [c];
          // Although this creates a 'block', it's graphic is transparent
          var clusterNode = self.grid.createBlockFromTileDataGroup (cluster, false);
          self.gamePanel.addChild (clusterNode, 3);
          self.fallingCluster = clusterNode;

          var cluster_pos = self.fallingCluster.getPosition ();

          // remove the cluster. this must happen before movement testing
          for (g = 0; g < cluster.groups.length; g++) {
             group = cluster.groups [g];
             if (group) {
                self.grid.removeGroupByIndex (group.group_index);
             }
             // Switch the group nodes to be children of the new falling cluster
             if (group.node) {
                group.node.removeFromParent (false);
                self.fallingCluster.addChild (group.node);
                group.node.x -= cluster_pos.x;
                group.node.y -= cluster_pos.y;
             }
          }

          self.fallingCluster.isCluster = true;

          bm = self.handleBlockMovement (self.fallingCluster);
          if (bm === 0) {
             self.fallingCluster.removeFromParent ();
             self.fallingCluster = null;
          } else {
             self.grid.groupFloodFill ();
          }
          movement += bm;
       }
       if (movement > 0) {
          return;
       }

       self.grid.groupFloodFill (true);
       self.fallingGroup = null;
       self.fallingCluster = null;

       self.isCollapsing = false;
   },

   // Returns 0 if the block movement has ended, or a break has occured.
   // 1 if still potentially moving or sliding
   handleBlockMovement: function (block) {
      var self = this;

      if (!block) {
         return 0;
      }

      // Game update values
      var framesPerSecond = cc.game.config.frameRate;
      var millisPerUpdate = 1000.0 / framesPerSecond;

      // Get key states
      var leftPressed = self.keysPressed[cc.KEY.left];
      var rightPressed = self.keysPressed[cc.KEY.right];

      var rotatePressed = self.keysPressed[cc.KEY.up];
      var dropPressed = self.keysPressed[cc.KEY.down];

      // General purpose collision detection
      var collision = NO_COLLISION;

      // Action triggers
      var willRotate;

      // Move block left and right in pixels
      var dx = 0;
      var dy = 0;

      // Things happen slightly differently when collapsing
      var collapse = self.isCollapsing;
      if (collapse) {
         leftPressed = rightPressed = rotatePressed = dropPressed = false;
      }

      // Move left or right
      if (self.moveDelayMS >= aq.config.KEY_DELAY_MS) {
         if (leftPressed) {
            dx = -1 * aq.config.BLOCK_SIZE;          // move one block left
            self.moveDelayMS = 0;
         } else if (rightPressed) {
            dx = 1 * aq.config.BLOCK_SIZE;           // move one block right
            self.moveDelayMS = 0;
         }
      }

      if (!leftPressed && !rightPressed) {
         self.moveDelayMS = aq.config.KEY_DELAY_MS;
      }

      if (!rotatePressed) {
         self.rotateDelayMS = aq.config.KEY_DELAY_MS;
      }

      self.moveDelayMS += millisPerUpdate;
      self.rotateDelayMS += millisPerUpdate;

      // Rotate the block through 90 degrees
      if (rotatePressed && self.rotateDelayMS >= aq.config.KEY_DELAY_MS) {
         self.rotateDelayMS = 0;

         var potentialNewRotationAndPosition = block.getNewRotationAndPosition90 ();
         collision = self.grid.collideBlock (block,
                                             potentialNewRotationAndPosition.position,
                                             potentialNewRotationAndPosition.rotation);

         // Test the collision data to see if the block has collided with something on
         // it's left, or right.  If so, we might be able shift the block sideways
         // to allow the rotation

         if (collision !== NO_COLLISION) {

            // Take into account colliding with the left and right edges of the grid

            // csl = collision_sum_left, or number of collision points to the left of the falling block
            var collision_sum_left = ((collision & 0x0f) === GRID_LEFT_EDGE_COLLISION) ? 1 : 0;

            // csr = collision_sum_right, or number of collision points to the right of the falling block
            var collision_sum_right = ((collision & 0x0f) === GRID_RIGHT_EDGE_COLLISION) ? 1 : 0;

            var collision_points = block.collision_points;
            if (collision_points && collision_points.length > 0) {
               // Sum the points to the left and right of the falling block where collisions occured

               // Take into account the block bounds within the grid_size area
               var block_grid_size = block.getGridSize ();
               var bounds = block.getTileBounds ();
               var block_x = block.getPositionX ();
               for (var i = 0; i < collision_points.length; i++) {

                  if (collision_points [i].grid_block_pos.x < block_x + (bounds.left * aq.config.BLOCK_SIZE)) {
                     collision_sum_left++;
                  }
                  if (collision_points [i].grid_block_pos.x > block_x - ((block_grid_size - bounds.right) * aq.config.BLOCK_SIZE)) {
                     collision_sum_right++;
                  }
               }
            }

            // Work out if we can move the block to the left or right
            var move_x = 0;
            if (collision_sum_left > 0 && collision_sum_right === 0) {
               // shift right since collision was on the left side
               move_x = aq.config.BLOCK_SIZE;
            } else if (collision_sum_right > 0 && collision_sum_left === 0) {
               // shift left, since collision was on the right
               move_x = -aq.config.BLOCK_SIZE;
            }

            // Move is appropriate, and no further collision
            if (move_x !== 0) {
               potentialNewRotationAndPosition.position.x += move_x;
               collision = self.grid.collideBlock (block,
                                                   potentialNewRotationAndPosition.position,
                                                   potentialNewRotationAndPosition.rotation);
            }
         }

         if (collision === NO_COLLISION) {
            block.setNewRotationAndPosition (potentialNewRotationAndPosition);
            willRotate = true;
         }
      }

      if (!collapse) {
         self.grid.highlightBlockCells (block);
      }

      // dx,dy are the point (pixels) difference to move the block in one game update
      var normal_dy = -(aq.config.BLOCK_SIZE * aq.config.NORMAL_BLOCK_DROP_RATE) / framesPerSecond;
      if (BLOCK_DROPPING) {
         dy = normal_dy;
      }
      var current_block_position = block.getPosition ();
      var new_block_position, fast_dy;

      // If we're fast dropping, check for a collision and only keep the dy update
      // value fast if no collision would occur
      if (dropPressed) {
         fast_dy = -(aq.config.BLOCK_SIZE * aq.config.FAST_BLOCK_DROP_RATE) / framesPerSecond;
         if (block.isSliding) {
            // Make sure we handle sliding with a fast drop
            dy = fast_dy;
            var nx = dx;
            if (block.isSliding.can_move_left) {
               nx = dy;
            } else if (block.isSliding.can_move_right) {
               nx = -dy;
            }
            new_block_position = cc.p (current_block_position.x + nx, current_block_position.y + dy);
         } else {
            // Otherwise going straight down
            new_block_position = cc.p (current_block_position.x + dx, current_block_position.y + fast_dy);
         }

         var fast_drop_collision = self.grid.collideBlock (block, new_block_position);
         if ((fast_drop_collision & AXIS_COLLISION) === 0) {
            dy = fast_dy;
         } else {
            dy = normal_dy;
         }
      }

      // For a stack collapse, just drop the block real fast
      if (collapse) {
         dy = -(aq.config.BLOCK_SIZE >> 1);
      }

      // Render the speed as xx.yy limited to 2 fractional digits
      var dy_s = Number (dy).toString ();
      var p = dy_s.indexOf ('.');
      if (p !== -1) {
         var f = dy_s.substring (p).slice (0, 3);
         dy_s = dy_s.substring (0, p) + f;
      }
      self.debugDropSpeed.setString ('Speed: ' + dy_s);

      // If the block is within 2 * the amount it moves by per frame, then
      // assume it's aligned with the grid
      var alignedDistance = (aq.config.BLOCK_SIZE * 2) / framesPerSecond;

      // Adjust the y position if the block is aligned with the grid
      // This lets the blocks slide left and right into tight gaps
      var aligned_pos = self.grid.getBlockAlignedGridPosition (block);

      // Sideways test, if left or right movement key is pressed
      var tmp_collision = 1;
      var tmp_dx, tmp_pos;
      if (leftPressed || rightPressed) {
         tmp_dx = (leftPressed ? -1 : 1) * aq.config.BLOCK_SIZE;
         tmp_pos = block.getPosition ();
         if (Math.abs (tmp_pos.y - aligned_pos.y) <= alignedDistance) {
            tmp_pos.y = aligned_pos.y;
         }
         tmp_pos.x += tmp_dx;
         tmp_collision = self.grid.collideBlock (block, tmp_pos);
      }

      var can_move_left = leftPressed && (tmp_collision === 0);
      var can_move_right = rightPressed && (tmp_collision === 0);

      if (typeof (block.could_move_left) === 'undefined') {
         block.could_move_left = false;
      }

      if (typeof (block.could_move_right) === 'undefined') {
         block.could_move_right = false;
      }

      if (can_move_left && !block.could_move_left) {
         dx = tmp_dx;
      }

      if (can_move_right && !block.could_move_right) {
         dx = tmp_dx;
      }

      block.could_move_left = can_move_left;
      block.could_move_right = can_move_right;

      // Project the block sideways for a collision test
      new_block_position = block.getPosition ();
      new_block_position.x += dx;

      if (Math.abs (new_block_position.y - aligned_pos.y) <= alignedDistance) {
         new_block_position.y = aligned_pos.y;
      }

      // Test to see if the falling block can move sideways
      if (self.grid.collideBlock (block, new_block_position)) {
         // If collision would occur, don't attempt the sideways move
         dx = 0;
      }

      // Test to see if the falling block can move straight down.
      new_block_position = block.getPosition ();
      new_block_position.y += dy;

      collision = NO_COLLISION;
      collision = self.grid.collideBlock (block, new_block_position);

      //
      // stick block in place
      //
      var stickBlock = function () {

         // If the falling block cannot move down (or slide), lock it in place
         if (block.isCluster) {
            var p = block.getPosition ();
            var blocks = block.getChildren ();
            for (var b = 0; b < blocks.length; b++) {
               var blk = blocks [b];
               if (blk.tile_data) {
                  blk.setPosition (cc.p (p.x + blk.x, p.y + blk.y));
                  self.grid.insertBlockIntoGrid (blk);
               }
            }
         } else {
            self.grid.insertBlockIntoGrid (block);
         }

         // If not collapsing
         if (!collapse) {

            // Fill the grid to generate the coloured block groups
            self.grid.groupFloodFill (true);

            // Allocate a new block for falling
            self.nextBlock ();

            aq.dispatchEvent (aq.Grid.EVENT_TYPE, aq.Grid.EVENT_BLOCK_LAND, {'block': block});
         }
      };

      // Highlight the collision that just occured
      /*
      if (!collapse) {
         self.highlightCollision (block);
      }
      */

      if (block.isSliding) {

         // If the player has pressed the left or right button
         if (dx !== 0) {
            // Shift the block to the next grid aligned column, out of the slide
            dx = block.isSliding.can_move_to.x - block.x;
            // Take the block out of 'sliding' mode
            block.isSliding = null;
         } else {
            // Otherwise handle the slope movement
            if (block.isSliding.can_move_left) {
               dx = dy;
            } else if (block.isSliding.can_move_right) {
               dx = -dy;
            }
         }

         // Update the position
         block.moveBy (dx, dy);

         // if the block is still sliding (might have been a left/right move to stop it sliding)
         if (block.isSliding) {
            if (block.isSliding.can_move_left) {
               // it was going left
               if (block.x <= block.isSliding.can_move_to.x) {
                  // fix to the exact position
                  block.setPosition (block.isSliding.can_move_to);
                  // stop the 'sliding' mode
                  block.isSliding = null;
               }
            } else if (block.isSliding.can_move_right) {
               // or if it was going right
               if (block.x >= block.isSliding.can_move_to.x) {
                  // fix to the exact position and stop the slide
                  block.setPosition (block.isSliding.can_move_to);
                  block.isSliding = null;
               }
            }
         }

         return 1;

      } else {

         if (collision) {

            // Clear any old block breaking collision points
            self.grid.clearCollisionBreakPoints ();

            if ((collision & SLOPE_COLLISION) !== 0) {

               //
               // Handle sliding the block calculations
               //
               var slide = self.grid.slideBlock (block);

               //
               // If the block can slide left or right, then send it off
               //
               if (slide.can_move_left || slide.can_move_right) {
                  block.isSliding = slide;

                  // Align the block to the grid at the current position, to make sure
                  // that sliding moves correctly
                  aligned_pos = self.grid.getBlockAlignedGridPosition (block);
                  block.x = aligned_pos.x;
                  if (aligned_pos.y < block.y) {
                     block.y = aligned_pos.y;
                  }

                  return 1;

               } else {

                  //
                  // Otherwise, the only case here is that the slide code determined that it actually
                  // couldn't slide the block.  This could be because it's stuck in place between
                  // two slopes, or that this is a point collision which should cause a break
                  //
                  var breaking = self.grid.breakBlock (block, new_block_position);

                  if (breaking) {
                     // Potential collapse
                     self.isCollapsing = true;

                     // Remove the broken falling block straight away
                     block.removeFromParent (true);

                     aq.dispatchEvent (aq.Grid.EVENT_TYPE, aq.Grid.EVENT_BLOCK_BREAK, {'block': block});

                     //return 2;
                     return 0;
                  } else {
                     // stick block in place
                     stickBlock ();
                     return 0;
                  }
               }

            } else if ((collision & AXIS_COLLISION) !== 0) {
               // axis collision means no sliding or breaking, so stick the block in place
               stickBlock ();
               return 0;
            }

         } else {

            // otherwise, no collision, so move it
            block.moveBy (dx, dy);
            return 1;
         }
      }

      return 0;
   },

   // highlight a collision
   highlightCollision: function (block) {

      var self = this;

      var i;

      if (self.collisionPoints) {
         for (i = 0; i < self.collisionPoints.length; i++) {
            self.collisionPoints [i].removeFromParent ();
         }
         self.collisionPoints = null;
      }

      var half_block = aq.config.BLOCK_SIZE / 2;
      var block_pos = block.getPosition ();

      if (block.collision_points && block.collision_points.length > 0)
      {
         self.collisionPoints = [];

         for (i = 0; i < block.collision_points.length; i++) {
            var cp = block.collision_points [i];

            var color = ((cp.collision & AXIS_COLLISION) !== 0) ? cc.color (255,0,0,255) : cc.color (0,0,255,255);

            // draw a line between the centers of the two cells that have collided
            var grid_pos = cc.p (cp.grid_block_pos.x + half_block, cp.grid_block_pos.y + half_block);
            var b_pos = cc.p (block_pos.x + (cp.cell.x * aq.config.BLOCK_SIZE) + half_block, block_pos.y + (cp.cell.y * aq.config.BLOCK_SIZE) + half_block);

            var hl = new cc.DrawNode ();
            hl.drawSegment (grid_pos, b_pos, 3, color);
            hl.setPosition (cc.p (0, 0));
            hl.setVisible (true);
            self.collisionPoints.push (hl);
            self.gamePanel.addChild (hl, 200);
         }
      }
   },

   // Create a new random block, at the top middle of the game panel, lso removing the
   // currently falling block
   nextBlock: function () {
       var self = this;

       // Remove the old block
       self.grid.clearFallingBlock ();

       // Allocate a new one
       var grid_x = aq.config.GRID_WIDTH / 2;
       var grid_y = (cc.winSize.height + self.cameraHeight) / aq.config.BLOCK_SIZE;
       var rnd_tile_num = aq.Block.getRandomTileNumber ();

       if (self.blockCounter < BLOCK_SEQUENCE.length) {
          rnd_tile_num = BLOCK_SEQUENCE [self.blockCounter++];
       }

       var new_block = new aq.Block (true, rnd_tile_num);
       new_block.setPosition (grid_x * aq.config.BLOCK_SIZE, grid_y * aq.config.BLOCK_SIZE);

       self.grid.setFallingBlock (new_block);

       self.block = new_block;
   }
});

aq.scenes.GameScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new GameLayer ();
      this.addChild (layer);
   }
});

