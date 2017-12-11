'use strict';

/**
 * Define our top level 'AquaStax' namespace.  All the config, scenes
 * and resources will go in here to keep the global namespace clean.
 *
 * Also define constants and config options that we want to use
 * throughout the code in one place.
 *
 * @author steve (13/10/2016)
 */

var aq = aq || {
   'scenes': {},
   'spritey': {},
   'config': {}
};

/**
 * aq.config.DESIGN_WIDTH and DESIGN_HEIGHT are passed to setDesignResolutionSize,
 * so setting cc.winSize to this fixed value
 */
aq.config.DESIGN_WIDTH = 1920;
aq.config.DESIGN_HEIGHT = 1080;

/**
 * aq.config.SHOW_SPLASH_SCREENS skips the splash screen intro if set false
 */
aq.config.SHOW_SPLASH_SCREENS = false;

/**
 * aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR is the value to scale up any
 * old game resources (ie. those taken from the 240x320 sized game)
 */
aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR = 4.0;

/**
 * aq.config.BLOCK_SIZE block size in pixels.  A single square block will
 * be drawn with 2 triangles.  This is also known as a 'cell'.
 */
aq.config.BLOCK_SIZE = 50;

/**
 * aq.config.GRID_SIZE is how many blocks fit across the bottom of the
 * gameplay area.
 */
aq.config.GRID_WIDTH = 14;

/**
 * aq.config.BLOCK_OUTLINE_COLOR is the color to render the 
 * block outlines in 
 */
aq.config.BLOCK_OUTLINE_COLOR = {r:0,g:0,b:0,a:255};

/**
 * aq.config.BLOCK_OUTLINE_WIDTH is the width in pixels to 
 * render the block outlines.  Set to 0 to disable. 
 */
aq.config.BLOCK_OUTLINE_WIDTH = 2;

/**
 * Millisecond delay for keyboard being held down and actions repeating
 */
aq.config.KEY_DELAY_MS = 100;

/**
 * Block drop rate in grid cells per second
 */
aq.config.NORMAL_BLOCK_DROP_RATE = 1;

/**
 * Block drop rate when fast dropping
 */
aq.config.FAST_BLOCK_DROP_RATE = 20;

/**
 * Camera movement rate in blocks per second
 */
aq.config.CAMERA_MOVEMENT_RATE = 10;

/**
 * Spritey debug output
 */
aq.config.SPRITEY_DEBUG = true;

/**
 * Freeze the aq.config object so we don't go adding to it all over the code
 */
Object.freeze (aq.config);
