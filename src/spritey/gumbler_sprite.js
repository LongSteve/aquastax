'use strict';

/**
 * Extends aq.spritey.Sprite to implement specialist Gumbler
 * actions.
 * @class
 * @extends aq.spritey.Sprite
 */

aq.spritey.Gumbler = aq.spritey.Sprite.extend (/** @lends aq.spritey.Sprite# */{

   animator: null,

   navigation: null,

   ctor: function () {
      this._super ();
      this.animator = aq.spritey.animator (this);
      this.navigation = {
         state: null,
         direction: null,
         path: null
      };
   },

   getAnimator: function () {
      return this.animator;
   },

   getNavigationState: function () {
      return this.navigation.state;
   },

   setNavigationState: function (s) {
      this.navigation.state = s;
   },

   getNavigationDirection: function () {
      return this.navigation.direction;
   },

   setNavigationDirection: function (d) {
      this.navigation.direction = d;
   },

   getNavigationPath: function () {
      return this.navigation.path;
   },

   setNavigationPath: function (p) {
      this.navigation.path = p;
   },

   /**
    * Returns the current spritey animation state of the Gumbler.
    * This is one of the states defined in gumbler_data.js, and
    * is an instance of aq.spritey.objects.State
    */
   getAnimationState: function () {
      var self = this;
      var userData = self.getUserData();
      if (userData && userData.state) {
         return userData.state;
      }
      return null;
   },

   getAnimationStateName: function () {
      var self = this;
      let state = self.getAnimationState ();
      return state ? state.name : null;
   },

   getAnimationStateTime: function () {
       var self = this;
       return self.animator.getStateTime ();
   },

   getAnimationFrameIndex: function () {
       var self = this;
       return self.getUserData ().frameIndex;
   },

   /**
    * Sets the gumbler animation state, given a name (or an
    * instance of aq.spritey.objects.State)
    */
   setAnimationState: function (state) {
      var self = this;

      let state_name = state;

      // Assume a string
      if (state instanceof aq.spritey.objects.State) {
         state_name = state.name;
      }

      cc.log ('Gumbler setAnimationState: ' + state_name);

      let animator = self.getAnimator ();

      if (animator.isTransitioning ()) {
         cc.log ('Gumbler setAnimationState fail: already transitioning');
         return false;
      }

      let state_transitions = animator.listStateTransitions ();
      let states = Object.keys (state_transitions);
      cc.log ('State transition keys: ' + states);
      let key = state_transitions [state_name];
      if (key) {
         animator.startTransition (key);
         return true;
      }

      cc.log ('Animation State Transition not possible from current state');
      return false;
   },

   initWithTestData: function (sprite_data) {
      var self = this;

      //
      // Sprite for testing the gumbler animations
      //
      let state = aq.spritey.states [sprite_data.state];
      let anim = state.primary;

      self.setScale (aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR);

      // tmp position
      self.setPosition (sprite_data.position);

      // tmp starting animation
      self._setSpriteAnim (anim, sprite_data.frame_num);

      self.animator.initTransitions ();

      self.scheduleUpdate ();

      return self;
   },

   update: function (dt) {
      var self = this;

      self.animator.handleTransition (dt);
      self._handleLineAndFish ();
      self._updateDebugRects ();       // From aq.spritey.Sprite
   },

   // Get an cc.Animation for an aq.spritey.objects.Anim
   _getAnimationForAnim: function (anim) {
       // jshint unused:false
       var self = this;

       let animation = cc.animationCache.getAnimation (anim.name);   // = anim.anim
       if (!animation) {

          // Create an Animation from the frames (which reference images)
          let animation_frames = [];
          for (var f = 0; f < anim.frames.length; f++) {
             let spritey_frame = anim.frames [f];
             let cc_sprite_frame = cc.spriteFrameCache.getSpriteFrame (spritey_frame.filename);
             // Pulling the frame from the cache does not take into account the flippedX/mirror property so we need
             // to clone the sprite frame when necessary if the same frame is used in multiple animations
             if (typeof spritey_frame.mirror !== 'undefined' && cc_sprite_frame.flippedX !== spritey_frame.mirror) {
                cc_sprite_frame = cc_sprite_frame.clone ();
                cc_sprite_frame.flippedX = spritey_frame.mirror;
             }

             let speed = 10.0;
             if (anim.speeds) {
                speed = anim.speeds [f < anim.speeds.length ? f : 0];
             }

             let frame_user_data = {
                anim: anim,
                index: f
             };

             if (anim.custom_points) {
                let cp = anim.custom_points [f < anim.custom_points.length ? f : 0];
                frame_user_data.custom_point = cp;
             }

             animation_frames.push (new cc.AnimationFrame (cc_sprite_frame, speed / 10.0, frame_user_data));
          }

          // Create the animation from the frames
          animation = new cc.Animation (animation_frames, 0.1);

          // Save to the AnimationCache
          cc.animationCache.addAnimation (animation, anim.name);
       }

       return animation;
   },

   // Internal function to switch to a new animation
   _setSpriteAnim: function (anim, frame, offset) {
       var self = this;

       if (typeof frame === 'undefined' || frame < 0) {
          frame = 0;
       }

       if (typeof anim === 'string') {
          anim = aq.spritey.animations [anim];
          if (!anim) {
             aq.fatalError ('_setSpriteAnim unknown animation string name: ' + anim);
          }
       }

       if (typeof offset === 'undefined') {
          offset = cc.p (0,0);
       }

       // Get the Cocos2d animation
       var animation = self._getAnimationForAnim (anim);

       // Maintain the state
       var user_data = self.getUserData ();
       var current_state = user_data ? user_data.state : null;

       // Store some of the spritey animation data in the CCSprite
       self.setUserData ({
          state: anim.major_state || current_state,
          anim: anim,
          animation: animation,
          frameIndex: frame
       });

       // Set the first sprite frame, with no movement
       self.setDisplayFrameWithFrameIndex (anim.name, frame, false);

       // When scaling the sprite don't anti-alias the image, keep a pixel perfect scale.
       // This only works in WebGL, and the opposite (default) is setAntiAliasTexParameters.
       self.texture.setAliasTexParameters ();

       // Anchor point
       self.setFrameAnchor ();

       // Move the sprite if an offset is required
       self.move (offset);

       // stop all current actions
       self.stopAllActions ();

       // Handle an overlay animation.

       let overlay_sprite_to_remove = self.getChildByTag (99);
       if (overlay_sprite_to_remove) {
          self.removeChild (overlay_sprite_to_remove);
       }

       if (anim.overlay) {

          // Create a new sprite (having removed any existing ones above)
          let overlay_sprite = new aq.spritey.Gumbler ();
          overlay_sprite._setSpriteAnim (anim.overlay, frame);

          // Work out the offset. Remember, a child node at 0,0 does not get drawn at the anchor point
          let overlay_offset = self.getAnchorPointInPoints ();
          overlay_offset.y = -overlay_offset.y;

          overlay_sprite.x = overlay_offset.x;
          overlay_sprite.y = -overlay_offset.y;

          // Update the sprite userData to include the overlay
          let userData = self.getUserData ();
          userData.overlay = anim.overlay;

          self.addChild (overlay_sprite, -1, 99);
       }

       if (anim.custom_points) {
          self._setupFishing ();
       }

       // start the new animation
       var animate = aq.spritey.animate (animation, frame);

       var action = null;
       if (anim.advance) {
          var advanceAnim = cc.callFunc (function () {
             self._setSpriteAnim (anim.advance.to_anim, anim.advance.getFrame (), anim.advance.getOffset ());
             if (!anim.isOverlay) {
                self.animator.initTransitions ();
             }
          });
          action = cc.sequence (animate, advanceAnim);
       } else {
          action = cc.repeatForever (animate);
       }
       action.setTag (0);
       self.runAction (action);
   },

   // Setup the extra elements for fishing
   _setupFishing: function () {
      var self = this;
      var line, fish;

      var anim = self.getUserData ().anim;
      if (anim.name.match (/.*fish.*/gi)) {
         // Add a DrawNode for the line, and the fish sprite
          if (!self.getChildByName ('line')) {
             line = new cc.DrawNode ();
             self.addChild (line, -2, 'line');
          }
          if (!self.getChildByName ('fish')) {
             fish = new cc.Sprite (aq.res.Fish);
             fish.setRotation (-90);
             fish.setAnchorPoint (1.0, 0.95);
             fish.texture.setAliasTexParameters ();
             self.addChild (fish, -3, 'fish');
          }
      }
   },

   _handleLineAndFish: function () {
       // jshint unused:false
       var self = this;

       var anim = self.getUserData ().anim;
       var frame = self.getUserData ().frameIndex;

       var line = self.getChildByName ('line');
       var fish = self.getChildByName ('fish');
       var cp = self.getCustomPointForFrame ();

       // This array is borrowed directly from the original code, and the numbers is signed byte range values
       // for a sine table, used to move the fish in a flapping arc when it's being reeled in
       var FISHFLAP_SIN_TAB = [0,150,243,243,150,0,-150,-243,-243,-150,0,150,243,243,150,0,-150,-243,-243,-150];

       if (line && fish) {

          // Setup the line.  Default to draw from the custom point to below the bottom of the screen
          line.clear ();
          fish.setOpacity (0);

          if (cp) {

             let mirror = false;

             let world_rod_pos = self.convertToWorldSpace (cp);
             // For future reference, I have no idea why the scale factor seems to be effecting the fishing line length
             let LENGTH = world_rod_pos.y / aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR;

             let lineTop = cp;
             let lineBot = cc.p (cp.x, cp.y - LENGTH);

             if (anim.name === 'fishflapR' || anim.name === 'fishflapL') {
                lineBot.x = cp.x + (((FISHFLAP_SIN_TAB [frame] * 10) / 256) + 8);
                lineBot.y = cp.y - ((LENGTH - cp.y) / 20) * (20 - frame);
                mirror = FISHFLAP_SIN_TAB[frame] < 0 ? true : false;
             }

             line.drawSegment (lineTop, lineBot, 0, cc.color.BLACK);

             if (fish) {
                fish.setPosition (lineBot);
                fish.setOpacity (255);
                let sx = fish.getScaleY ();
                if ((sx > 0 && mirror) || (sx < 0 && !mirror)) {
                   fish.setScaleY (sx * -1.0);
                }
             }
          }
       }

       var overlay = self.getChildByTag (99);
       if (overlay) {
          overlay._handleLineAndFish ();
       }
   }

});

