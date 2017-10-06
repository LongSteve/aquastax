'use strict';

aq.spritey = aq.spritey || {};

aq.spritey.object_list = [];
aq.spritey.animations = {};
aq.spritey.states = {};
aq.spritey.test = [];

aq.spritey.dump = function () {
   var image_count = 0;
   var object_list = aq.spritey.object_list;
   for (var o in object_list) {
      if (object_list [o]) {
         var object = object_list [o];
         // Not sure I like this, but it's a shortcoming of the simple class/object structure I adopted
         if (object._type === 'Image') {
            image_count++;
         } else {
            cc.log (o + ' : ' + object.description ());
         }
      }
   }
   cc.log ('Total Images : ' + image_count);
};

aq.Sprite = cc.Sprite.extend(/** @lends aq.Sprite# */{
   setSpriteFrame: function (newFrame) {
      if (!newFrame) {
         return;
      }

      var spriteFrame = newFrame;
      if (newFrame instanceof cc.AnimationFrame) {
         spriteFrame = newFrame.getSpriteFrame ();
      }

      if (!spriteFrame) {
         return;
      }

      if (typeof spriteFrame.flippedX !== 'undefined') {
         this.setFlippedX (spriteFrame.flippedX);
      } else {
         this.setFlippedX (false);
      }

      // Determine the sprite frame index. This is a bit brute force, it could be optimised
      var userData = this.getUserData ();
      var frames = userData.animation.getFrames ();
      for (var index = 0; index < frames.length; index++) {
         if (newFrame === frames [index].getSpriteFrame ()) {
            break;
         }
      }

      userData.frameIndex = index;
      cc.Sprite.prototype.setSpriteFrame.call (this, newFrame);

      // Need to update the sprite anchor based on the frame centre
      var image = userData.anim.frames [index];
      if (image.center) {
         var cc_sprite_frame = cc.spriteFrameCache.getSpriteFrame (image.filename);
         var size = cc_sprite_frame.getOriginalSizeInPixels ();
         var cx = image.center.x;
         var cy = image.center.y;
         var ax = (size.width === 0) ? 0 : cx / size.width;
         var ay = (size.height === 0) ? 0 : 1.0 - (cy / size.height);
         if (image.mirror) {
            ax = 1.0 - ax;
         }
         this.setAnchorPoint (ax, ay);
      } else {
         this.setAnchorPoint (0.5, 0.0);
      }

      // Move the sprite if necessary (at the beginning of the frame)
      var moves = userData.anim.moves;
      var position = this.getPosition ();
      var scale = this.getScale ();
      var delta = null;
      if (moves.length === 1) {
         // Move the same every frame
         delta = cc.p (moves [0].x, moves [0].y);
      } else if (typeof moves [index] !== 'undefined') {
         delta = cc.p (moves [index].x, moves [index].y);
      }
      if (delta !== null && (delta.x !== 0 || delta.y !== 0)) {
         delta.x *= scale;
         delta.y *= scale;
         position.x += delta.x;
         position.y -= delta.y;
         this.setPosition (position);
      }
   }
});

/**
 * Extends cc.Animate to allow setting specific
 * indexed frames
 * @class
 * @extends cc.Animate
 * @param {cc.Animation} animation
 * @example
 * // create the animation with animation starting at frame 5
 * var anim = new aq.Animate(dance_grey, 5);
 */

aq.Animate = cc.Animate.extend(/** @lends aq.Animate# */{

   _firstFrame: 0,

    /**
     * Constructor function. <br />
     * create the animate with animation.
     * @param {cc.Animation} animation
     * @param {frame} frame index (starting at 0)
     */
    ctor: function (animation, frame) {
       this._super (animation);

       if (!frame) {
          frame = 0;
       }
       this._firstFrame = frame;
    },

    startWithTarget:function (target) {

        // Take into account the delta time past the current frame start
        var t = this._elapsed / (this._duration > 0.0000001192092896 ? this._duration : 0.0000001192092896);
        var dt = t - this._splitTimes [this._currFrameIndex];

        // Trigger the new animation
        cc.ActionInterval.prototype.startWithTarget.call(this, target);
        if (this._animation.getRestoreOriginalFrame()) {
            this._origFrame = target.displayFrame();
        }

        // Update the animation values to correspond with the new start frame
        this._nextFrame = this._firstFrame % this._splitTimes.length;
        this._elapsed = ((this._splitTimes [this._nextFrame] + dt) * this._duration);
        this._executedLoops = 0;

        if (this._firstFrame !== 0) {
           this._firstTick = false;
           this._firstFrame = 0;
        }
    },

    // This is a copy of the cc.Animate.update method, but with the value of _currFrameIndex stored
    // as a this. member variable.
    // TODO: Make Issue/PR against Cocos2d-x GitHub repo to fix this
    update: function (dt) {
        dt = this._computeEaseTime(dt);
        // if t==1, ignore. Animation should finish with t==1
        if (dt < 1.0) {
            dt *= this._animation.getLoops();

            // new loop?  If so, reset frame counter
            var loopNumber = 0 | dt;
            if (loopNumber > this._executedLoops) {
                this._nextFrame = 0;
                this._executedLoops++;
            }

            // new t for animations
            dt = dt % 1.0;
        }

        var frames = this._animation.getFrames();
        var numberOfFrames = frames.length, locSplitTimes = this._splitTimes;

        for (var i = this._nextFrame; i < numberOfFrames; i++) {
            if (locSplitTimes[i] <= dt) {
                this._currFrameIndex = i;
                this.target.setSpriteFrame(frames[this._currFrameIndex].getSpriteFrame());
                this._nextFrame = i + 1;
            } else {
                // Issue 1438. Could be more than one frame per tick, due to low frame rate or frame delta < 1/FPS
                break;
            }
        }
    }

});

aq.animate = function (animation, frame) {
    return new aq.Animate(animation, frame);
};
aq.Animate.create = aq.animate;

var SpriteTestLayer = cc.Layer.extend ({

   sprites: null,

   transitions: null,

   debug: null,

   keysPressed: [],

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      self.sprites = [];

      for (var i = 0; i < aq.spritey.test.length; i++) {
         self.initTestSprite (aq.spritey.test [i]);
      }

      self.setupDebug ();

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

   keyAction: function (keyCode, pressed) {
      var self = this;
      self.keysPressed [keyCode] = pressed;
   },

   update: function () {
      var self = this;

      self.handleKeys ();
      self.handleTransition ();
      self.handleDebug ();
   },

   getCurrentSprite: function () {
       var self = this;
       return self.sprites [0];
   },

   debugItems: [
      'Frame: '
   ],

   setupDebug: function () {
       var self = this;

       if (!self.debug) {
          self.debug = new cc.Node ();
          self.addChild (self.debug);
       }
       self.debug.removeAllChildren ();

       var label = new cc.LabelTTF ('', 'Arial', 32);
       var font_height = label.getLineHeight ();

       var items = self.debugItems;

       self.debug.setPosition (0, 0);
       var item_pos = cc.p (0, items.length * (font_height - 1));
       for (var i = 0; i < items.length; i++) {
          var item_label = new cc.LabelTTF (items [i], 'Arial', 32);
          item_label.setAnchorPoint (1.0, 0.5);
          item_label.setPosition (item_pos);

          // Tag the node with the keyCode to lookup later
          item_label.setTag (i);

          self.debug.addChild (item_label);
          item_pos.y -= font_height;
       }
   },

   updateDebugItem: function (i, data) {
      var self = this;
      var item = self.debug.getChildByTag (i);
      if (item) {
         item.setString (self.debugItems [i] + data);
      }
   },

   handleDebug: function () {
      var self = this;
      var sprite = self.getCurrentSprite ();

      self.updateDebugItem (0, sprite.getUserData ().frameIndex);
    },

   handleKeys: function () {
       var self = this;

       if (!self.transitions) {
          return;
       }

       var sprite = self.getCurrentSprite ();

       if (sprite.transition_to) {
          return;
       }

       // The same key can be defined as a transition more than once in a state
       var labels = self.transitions.getChildren ();
       for (var i = 0; i < labels.length; i++) {
          var key_label = labels [i];
          var key = key_label.key;
          var pressed = self.keysPressed [key.keyCode()];
          key_label.setColor (pressed ? cc.color (0, 255, 0) : cc.color (255, 255, 255));

          if (pressed) {
             self.startTransition (key);
          }
       }
   },

   handleTransition: function () {
       var self = this;

       var sprite = self.getCurrentSprite ();
       var sprite_frame_index = sprite.getUserData ().frameIndex;

       if (sprite.transition_to) {
          if (sprite.transition_to.now || sprite.transition_to.on_frame === sprite_frame_index) {

             var to_anim = sprite.transition_to.transition.to_anim;
             var to_frame = sprite.transition_to.transition.getFrame ();
             var offset = sprite.transition_to.transition.getOffset ();

             self._setSpriteAnim (sprite, to_anim, to_frame, offset);
             self.listTransitions (to_anim);

             self.keysPressed [sprite.transition_to.key.keyCode()] = false;

             sprite.transition_to = null;
          }
       }
   },

   startTransition: function (key) {
       var self = this;

       var sprite = self.getCurrentSprite ();

       if (sprite.transition_to) {
          return;
       }

       // The current sprite frame
       var sprite_frame_index = sprite.getUserData ().frameIndex;

       var transition_to = null;
       var transition_on_frame = sprite_frame_index;
       var transition_now = false;

       if (key.all) {
          // Trigger the transition straight away
          transition_to = key.transitions [0];
          transition_now = true;
       } else {
          // The transition triggers on a certain frame
         if (key.transitions [sprite_frame_index].to_anim) {
            // We're on that frame, trigger it now
            transition_to = key.transitions [sprite_frame_index];
            transition_now = true;
         } else {
            // Loop over the transitions array until we find the next labelled transition frame
            // This loops over the --> entries in the state_trans_key() entries
            var num_frames = key.transitions.length;
            var start = sprite_frame_index;
            var end = (sprite_frame_index + num_frames - 1) % num_frames;
            for (var i = start; i !== end; i = (i + 1) % num_frames ) {
               if (key.transitions [i].to_anim) {
                  transition_to = key.transitions [i];
                  transition_on_frame = i;
                  break;
               }
            }
         }
      }

       if (transition_to !== null) {
          sprite.transition_to = {
             transition: transition_to,
             on_frame: transition_on_frame,
             now: transition_now,
             key: key
          };
       }
   },

   listTransitions: function (anim) {
       var self = this;

       var block_size = aq.config.BLOCK_SIZE;
       var blocks_wide = aq.config.GRID_WIDTH;

       if (!self.transitions) {
          self.transitions = new cc.Node ();
          self.addChild (self.transitions);
       }
       self.transitions.removeAllChildren ();

       var num_transitions = anim.keys.length;
       var label = new cc.LabelTTF ('', 'Arial', 32);
       var font_height = label.getLineHeight ();

       self.transitions.setPosition (blocks_wide * block_size + 10, 0);
       var key_pos = cc.p (10, num_transitions * (font_height - 1));
       for (var i = 0; i < num_transitions; i++) {
          var key = anim.keys [i];
          var key_name = key.name;
          var to_anim = null;
          // Find the first non-null transition
          for (var j = 0; j < key.transitions.length; j++) {
             if (key.transitions [j].to_anim) {
                to_anim = key.transitions[j].to_anim;
                break;
             }
          }
          if (to_anim) {
             var to_state = to_anim.to_state ? to_anim.to_state.name : to_anim.major_state.name;
             var key_label = new cc.LabelTTF (key_name + ' -> ' + to_state, 'Arial', 32);
             key_label.setAnchorPoint (0, 0.5);
             key_label.setPosition (key_pos);

             // Tag the node with the keyCode to lookup later
             key_label.setTag (key.keyCode ());
             key_label.key = key;

             self.transitions.addChild (key_label);
             key_pos.y -= font_height;
          }
       }
   },

   initTestSprite: function (sprite_data) {
       var self = this;

       var block_size = aq.config.BLOCK_SIZE;
       var blocks_wide = aq.config.GRID_WIDTH;

       //
       // Sprite for testing the gumbler animations
       //
       var state = aq.spritey.states [sprite_data.state];
       var anim = state.primary;

       var sprite = new aq.Sprite ();
       sprite.setScale (4);

       // tmp position
       sprite.setPosition (block_size * blocks_wide / 2, block_size * 4);

       // add to scene
       self.addChild (sprite);

       // Show the state transitions
       self.listTransitions (anim);

       // tmp starting animation
       self._setSpriteAnim (sprite, anim, sprite_data.frame_num);

       // save for later reference
       self.sprites.push (sprite);
   },

   // Internal function to switch to a new animation
   _setSpriteAnim: function (sprite, anim, frame, offset) {
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
       var animation = cc.animationCache.getAnimation (anim.name);   // = anim.anim
       if (!animation) {

          // Create an Animation from the frames (which reference images)
          var animation_frames = [];
          for (var f = 0; f < anim.frames.length; f++) {
             var spritey_frame = anim.frames [f];
             var cc_sprite_frame = cc.spriteFrameCache.getSpriteFrame (spritey_frame.filename);
             // Pulling the frame from the cache does not take into account the flippedX/mirror property so we need
             // to clone the sprite frame when necessary if the same frame is used in multiple animations
             if (typeof spritey_frame.mirror !== 'undefined' && cc_sprite_frame.flippedX !== spritey_frame.mirror) {
                cc_sprite_frame = cc_sprite_frame.clone ();
                cc_sprite_frame.flippedX = spritey_frame.mirror;
             }

             var speed = 10.0;
             if (anim.speeds) {
                speed = anim.speeds [f < anim.speeds.length ? f : 0];
             }

             var frame_user_data = {
                anim: anim,
                index: f
             };

             animation_frames.push (new cc.AnimationFrame (cc_sprite_frame, speed / 10.0, frame_user_data));
          }

          // Create the animation from the frames
          animation = new cc.Animation (animation_frames, 0.1);

          // Save to the AnimationCache
          cc.animationCache.addAnimation (animation, anim.name);
       }

       // Store some of the spritey animation data in the CCSprite
       sprite.setUserData ({
          anim: anim,
          animation: animation,
          frameIndex: frame
       });

       // Set the first sprite frame
       sprite.setDisplayFrameWithAnimationName (anim.name, frame);

       // When scaling the sprite don't anti-alias the image, keep a pixel perfect scale.
       // This only works in WebGL, and the opposite (default) is setAntiAliasTexParameters.
       sprite.texture.setAliasTexParameters ();

       // Anchor point
       // TODO: Refactor this, it's duplicated from qa.Sprite
       var image = anim.frames [frame];
       if (image.center) {
          var tmp_sprite_frame = cc.spriteFrameCache.getSpriteFrame (image.filename);
          var size = tmp_sprite_frame.getOriginalSizeInPixels ();
          var cx = image.center.x;
          var cy = image.center.y;
          var ax = (size.width === 0) ? 0 : cx / size.width;
          var ay = (size.height === 0) ? 0 : 1.0 - (cy / size.height);
          if (image.mirror) {
             ax = 1.0 - ax;
          }
          this.setAnchorPoint (ax, ay);
       } else {
          this.setAnchorPoint (0.5, 0.0);
       }

       // stop all current actions
       sprite.stopAllActions ();

       // Move the sprite if an offset is required
       var position = sprite.getPosition ();
       var scale = sprite.getScale ();
       var delta = cc.p (offset.x, offset.y);
       delta.x *= scale;
       delta.y *= scale;
       if (delta.x !== 0 || delta.y !== 0) {
          position.x += delta.x;
          position.y -= delta.y;
          sprite.setPosition (position);
       }

       // start a new one
       var animate = aq.animate (animation, frame);

       var action = null;
       if (anim.advance) {
          var advanceAnim = cc.callFunc (function () {
             self._setSpriteAnim (sprite, anim.advance.to_anim, anim.advance.getFrame (), anim.advance.getOffset ());
             self.listTransitions (anim.advance.to_anim);
          });
          action = cc.sequence (animate, advanceAnim);
       } else {
          action = cc.repeatForever (animate);
       }
       action.setTag (0);
       sprite.runAction (action);

       // Animation needs to move the sprite, then this sort of works
       /*
       if (anim.name === 'right') {
          var moveDone = cc.callFunc (function (node) {
             //cc.log ("Gumbler Moved");
             //sprite.stopAction (action);
          }, self);

          var sprite_scale = 4.0;
          var sprite_move_per_frame = 3 * sprite_scale;
          var move_distance_per_anim = sprite_move_per_frame * 6;
          var move =  cc.moveBy (0.6, cc.p (move_distance_per_anim, 0));
          sprite.runAction (cc.repeatForever (cc.sequence (move, moveDone)));
       }
       */
   }
});

aq.scenes.SpriteTestScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new SpriteTestLayer ();
      this.addChild (layer);
   }
});
