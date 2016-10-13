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
aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR = 3.0;

/**
 * Freeze the aq.config object so we don't go adding to it all over the code
 */
Object.freeze (aq.config);
