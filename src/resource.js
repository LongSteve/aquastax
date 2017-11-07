'use strict';

/**
 * aq.res is the set of resource identifiers, used to refer to the resources
 * when doing things like new cc.Sprite (res.OriginalLogo);
 */
aq.res = {
   OriginalLogo:   'res/original_logo.png',
   AquaStaxLogo:   'res/aquastax_logo.png',
   Fish:           'res/fish.png',
   GumblerTexture: 'res/spritey/gumbler.png',
   GumblerSprites: 'res/spritey/gumbler.plist'
};

/**
 * aq.load is the set of resources to preload when the game boots up.
 * Used in main.js.
 */
aq.load = [];
for (var i in aq.res) {
   aq.load.push (aq.res[i]);
}
