'use strict';

aq.spritey = aq.spritey || {};

aq.spritey.object_list = [];
aq.spritey.animations = {};
aq.spritey.states = {};
aq.spritey.test = [];

aq.spritey.dump = function () {
   let image_count = 0;
   let object_list = aq.spritey.object_list;
   for (let o in object_list) {
      if (object_list [o]) {
         let object = object_list [o];
         // Not sure I like this, but it's a shortcoming of the simple class/object structure I adopted
         if (object.type () === 'Image') {
            image_count++;
         } else {
            cc.log (o + ' : ' + object.description ());
         }
      }
   }
   cc.log ('Total Images : ' + image_count);
};

aq.Sprite = cc.Sprite.extend(/** @lends aq.Sprite# */{
   debugRect: null,
   ctor: function () {
      var self = this;

      self._super ();

      // Uncomment to show debug rects on sprite
      self.debugRect = new cc.DrawNode ();
      self.addChild (self.debugRect);

      self.scheduleUpdate ();
   },

   update: function (dt) {
       // jshint unused:false
       var self = this;
       self._drawDebugRects ();
   },

   _drawDebugRects: function () {
       var self = this;

       if (!self.debugRect) {
          return;
       }

       let size = self.getContentSize ();
       self.debugRect.clear ();
       self.debugRect.drawRect (cc.p (0,0), cc.p (size.width, size.height),
                                         null, // fillcolor
                                         1,    // line width
                                         cc.color (0,255,0,255));

       let app = self.getAnchorPointInPoints ();
       self.debugRect.drawRect (app, cc.p (app.x + 1, app.y + 1), cc.color (255,0,0,255), 1, cc.color (255,0,0,255));
   },

   setSpriteFrame: function (newFrame, noMovement) {
      if (!newFrame) {
         return;
      }

      let spriteFrame = newFrame;
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
      let userData = this.getUserData ();
      let frames = userData.animation.getFrames ();
      for (let index = 0; index < frames.length; index++) {
         if (newFrame === frames [index].getSpriteFrame ()) {
            userData.frameIndex = index;
            break;
         }
      }

      cc.Sprite.prototype.setSpriteFrame.call (this, newFrame);

      // Need to update the sprite anchor based on the frame centre
      this.setFrameAnchor ();

      // Move the sprite if necessary
      if (!noMovement) {
         this.moveFrame ();
      }
   },

   setDisplayFrameWithNoMovement: function (animationName, frameIndex) {
       var cache = cc.animationCache.getAnimation (animationName);
       if (!cache){
           cc.log (cc._LogInfos.Sprite_setDisplayFrameWithAnimationName);
           return;
       }
       var animFrame = cache.getFrames () [frameIndex];
       if (!animFrame){
           cc.log (cc._LogInfos.Sprite_setDisplayFrameWithAnimationName_2);
           return;
       }
       this.setSpriteFrame(animFrame.getSpriteFrame (), true);
   },

   _getPointForFrame: function (anim_array_name, index) {
       let cp = cc.p (0, 0);
       let userData = this.getUserData ();
       let points = userData.anim [anim_array_name];

       if (!points || points.length === 0) {
          return null;
       }

       if (typeof index === 'undefined') {
          index = userData.frameIndex;
       }

       if (points.length === 1) {
          cp = cc.p (points [0].x, points [0].y);
       } else if (typeof points [index] !== 'undefined') {
          cp = cc.p (points [index].x, points [index].y);
       }

       return cp;
   },

   getCustomPointForFrame: function (index) {
       return this._getPointForFrame ('custom_points', index);
   },

   getMoveForFrame: function (index) {
       return this._getPointForFrame ('moves', index);
   },

   moveFrame: function (offset) {

       let delta = cc.p (0, 0);
       let scale = this.getScale ();
       let position = this.getPosition ();

       // Optional offset, used on animation transitions
       if (offset) {
          delta.x += offset.x;
          delta.y += offset.y;
       } else {
          delta = this.getMoveForFrame ();
       }

       if (delta.x !== 0 || delta.y !== 0) {
          delta.x *= scale;
          delta.y *= scale;
          position.x += delta.x;
          position.y -= delta.y;
          this.setPosition (position);
       }
   },

   setFrameAnchor: function () {
       let userData = this.getUserData ();
       let image = userData.anim.frames [userData.frameIndex];
       if (image.center) {
          let cc_sprite_frame = cc.spriteFrameCache.getSpriteFrame (image.filename);
          let size = cc_sprite_frame.getOriginalSizeInPixels ();
          let cx = image.center.x;
          let cy = image.center.y;
          let ax = (size.width === 0) ? 0 : cx / size.width;
          let ay = (size.height === 0) ? 0 : 1.0 - (cy / size.height);
          if (image.mirror) {
             ax = 1.0 - ax;
          }
          this.setAnchorPoint (ax, ay);
       } else {
          this.setAnchorPoint (0.5, 0.0);
       }
   },

   frameMirror: function () {
       let userData = this.getUserData ();
       let image = userData.anim.frames [userData.frameIndex];
       return image.mirror;
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
        let t = this._elapsed / (this._duration > 0.0000001192092896 ? this._duration : 0.0000001192092896);
        let dt = t - this._splitTimes [this._currFrameIndex];

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
            let loopNumber = 0 | dt;
            if (loopNumber > this._executedLoops) {
                this._nextFrame = 0;
                this._executedLoops++;
            }

            // new t for animations
            dt = dt % 1.0;
        }

        let frames = this._animation.getFrames();
        let numberOfFrames = frames.length, locSplitTimes = this._splitTimes;

        for (let i = this._nextFrame; i < numberOfFrames; i++) {
            if (locSplitTimes[i] <= dt) {
                if (this._currFrameIndex !== i) {
                   // This should prevent the double move when advancing an animation, but I'm not sure it does?
                   this._currFrameIndex = i;
                   this.target.setSpriteFrame(frames[this._currFrameIndex].getSpriteFrame());
                   this._nextFrame = i + 1;
                   break;
                }
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

   global_transitions: null,

   debug: null,

   keysPressed: [],

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      self.initGlobalTransitions ();

      // Although there is a 'concept' of multiple sprites, this isn't fully implemented yet
      self.sprites = [];

      for (let i = 0; i < aq.spritey.test.length; i++) {
         self.initTestSprite (aq.spritey.test [i]);
      }

      self.initFakeKeySequence ();

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

   clearKeys: function () {
       var self = this;
       self.keysPressed.forEach (function (v, i, a) {
          a [i] = false;
       });
   },

   update: function () {
      var self = this;

      self.handleKeys ();
      self.handleTransition ();
      self.handleDebug ();

      // Wrap the sprite at the bottom of the 'screen'
      var sprite = self.getCurrentSprite ();
      if (sprite.getPositionY () <  -sprite.getContentSize ().height) {
         sprite.setPositionY (sprite.getPositionY () + cc.winSize.height);
      }

      self.handleLineAndFish (sprite);
   },

   getCurrentSprite: function () {
       var self = this;
       return self.sprites [0];
   },

   debugItems: [
      'State: ',
      'Anim: ',
      'Frame: '
   ],

   handleDebug: function () {
      var self = this;
      var sprite = self.getCurrentSprite ();
      var data = sprite.getUserData ();

      self.updateDebugItem (0, data.state.name || '');
      self.updateDebugItem (1, data.anim.name);
      self.updateDebugItem (2, data.frameIndex);
    },

   setupDebug: function () {
       var self = this;

       if (!self.debug) {
          self.debug = new cc.Node ();
          self.addChild (self.debug);
       }
       self.debug.removeAllChildren ();

       let label = new cc.LabelTTF ('', 'Arial', 32);
       let font_height = label.getLineHeight ();

       let items = self.debugItems;

       self.debug.setPosition (0, 0);
       let item_pos = cc.p (-20, items.length * (font_height - 1));
       for (let i = 0; i < items.length; i++) {
          let item_label = new cc.LabelTTF (items [i], 'Arial', 32);
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

   handleKeys: function () {
       var self = this;

       if (!self.transitions) {
          return;
       }

       let sprite = self.getCurrentSprite ();

       if (sprite.transition_to) {
          return;
       }

       let countPressed = 0;
       for (let k in self.keysPressed) {
          if (self.keysPressed [k]) {
             countPressed++;
          }
       }

       // The same key can be defined as a transition more than once in a state
       let labels = self.transitions.getChildren ();
       for (let i = 0; i < labels.length; i++) {
          let key_label = labels [i];
          let mod = key_label.mod;
          let key = key_label.key;
          let pressed = self.keysPressed [key.keyCode()];
          key_label.setColor (pressed ? cc.color (0, 255, 0) : cc.color (255, 255, 255));

          if (pressed) {
             if (mod === 0 && countPressed === 1) {
                self.startTransition (key);
             } else {
                let mCode = cc.KEY ['' + mod];
                if (self.keysPressed [mCode]) {
                   self.startTransition (key);
                }
             }
          }
       }
   },

   handleTransition: function () {
       var self = this;

       let sprite = self.getCurrentSprite ();
       let sprite_frame_index = sprite.getUserData ().frameIndex;

       if (sprite.transition_to) {
          if (sprite.transition_to.now || sprite.transition_to.on_frame === sprite_frame_index) {

             let to_anim = sprite.transition_to.transition.to_anim;
             let to_frame = sprite.transition_to.transition.getFrame ();
             let offset = sprite.transition_to.transition.getOffset ();

             self._setSpriteAnim (sprite, to_anim, to_frame, offset);
             self.listTransitions (to_anim);

             self.keysPressed [sprite.transition_to.key.keyCode()] = false;

             sprite.transition_to = null;
          }
       }
   },

   startTransition: function (key) {
       var self = this;

       let sprite = self.getCurrentSprite ();

       if (sprite.transition_to) {
          return;
       }

       // The current sprite frame
       let sprite_frame_index = sprite.getUserData ().frameIndex;

       let transition_to = null;
       let transition_on_frame = sprite_frame_index;
       let transition_now = false;

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
            let num_frames = key.transitions.length;
            let start = sprite_frame_index;
            let end = (sprite_frame_index + num_frames - 1) % num_frames;
            for (let i = start; i !== end; i = (i + 1) % num_frames ) {
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

       let num_transitions = anim.keys.length;
       let label = new cc.LabelTTF ('', 'Arial', 32);
       let font_height = label.getLineHeight ();

       self.transitions.setPosition (blocks_wide * block_size + 10, 0);
       var key_pos = cc.p (10, num_transitions * (font_height - 1));

       // Calculate the transitions that have matching keypresses,
       // so they can be numbered
       let label_counts = [];
       let label_numbers = [];
       for (let i = 0; i < num_transitions; i++) {
          let key_name = anim.keys [i].name;
          if (typeof (label_counts [key_name]) === 'undefined') {
             label_counts [key_name] = 0;
          }
          label_counts [key_name]++;
          label_numbers [key_name] = 0;
       }

       let num_global_transitions = self.global_transitions.length;
       for (let i = 0; i < num_global_transitions; i++) {
          let key_name = self.global_transitions [i].name;
          if (typeof (label_counts [key_name]) === 'undefined') {
             label_counts [key_name] = 0;
          }
          label_counts [key_name]++;
          label_numbers [key_name] = 0;
       }

       let display_labels = [];

       var get_key_label = function (key) {
          let key_name = key.name;
          let to_anim = null;
          let key_label = null;

          // Find the first non-null transition
          for (let j = 0; j < key.transitions.length; j++) {
             if (key.transitions [j].to_anim) {
                to_anim = key.transitions[j].to_anim;
                break;
             }
          }
          if (to_anim) {
             let to_state = to_anim.to_state ? to_anim.to_state.name : to_anim.major_state.name;
             let label_string = key_name + (label_counts [key_name] > 1 ? ' (' + (++label_numbers [key_name]) + ') ' : '') + ' -> ' + to_state;
             key_label = new cc.LabelTTF (label_string, 'Arial', 32);
             key_label.setAnchorPoint (0, 0.5);

             // Tag the node with the keyCode to lookup later
             key_label.setTag (key.keyCode ());
             key_label.key = key;

             // TODO: Refactor this hack
             key_label.mod = label_numbers [key_name];
          }

          return key_label;
       };

       for (let i = 0; i < num_transitions; i++) {
          display_labels.push (get_key_label (anim.keys [i]));
       }

       // Sort the labels into a sensible order for visual recognition
       var order = ['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE', 'RETURN', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9'];
       var sorted_labels = order.map (function (key) {
          return display_labels.filter (function (label) {
             return (label.getString ().indexOf (key) >= 0);
          });
       });

       // Flatten the array of arrays returned by the map/filter
       sorted_labels = [].concat.apply ([], sorted_labels);

       for (let i = 0; i < sorted_labels.length; i++) {
          let key_label = sorted_labels [i];

          key_label.setPosition (key_pos);
          self.transitions.addChild (key_label);
          key_pos.y -= font_height;
       }

       key_pos = cc.p (10, (num_transitions + 1 + num_global_transitions) * (font_height - 1));
       for (let i = 0; i < self.global_transitions.length; i++) {
          let key_label = get_key_label (self.global_transitions [i]);
          key_label.setPosition (key_pos);
          self.transitions.addChild (key_label);
          key_pos.y -= font_height;
       }
   },

   initGlobalTransitions: function () {
       var self = this;

       self.global_transitions = [];

       let object_list = aq.spritey.object_list;
       for (let o in object_list) {
          if (object_list [o]) {
             let object = object_list [o];
             if (object.type () === 'Key') {
                self.global_transitions.push (object);
             }
          }
       }
   },

   initTestSprite: function (sprite_data) {
       var self = this;

       //
       // Sprite for testing the gumbler animations
       //
       let state = aq.spritey.states [sprite_data.state];
       let anim = state.primary;

       let sprite = new aq.Sprite ();
       sprite.setScale (aq.config.ORIGINAL_GRAPHIC_SCALE_FACTOR);

       // tmp position
       sprite.setPosition (sprite_data.position);

       // add to scene
       self.addChild (sprite);

       // Show the state transitions
       self.listTransitions (anim);

       // tmp starting animation
       self._setSpriteAnim (sprite, anim, sprite_data.frame_num);

       // save for later reference
       self.sprites.push (sprite);
   },

   initFakeKeySequence: function () {
       var self = this;

       var keyPress = function (keyCode) {
          return cc.callFunc (function () {
             self.keyAction (keyCode, true);
          });
       };

       var keyClear = function () {
          return cc.callFunc (function () {
             self.clearKeys ();
          });
       };

       var action = cc.sequence (
          //cc.delayTime (3.0), keyPress (cc.KEY.up),
          //cc.delayTime (7.2), keyPress (cc.KEY.space),
          //cc.delayTime (2.0), keyPress (cc.KEY [7]),
          //cc.delayTime (3.0), keyPress (cc.KEY.right),
          //cc.delayTime (2.0), keyPress (cc.KEY.down),    // sit
          //cc.delayTime (2.0), keyPress (cc.KEY [5]),     // eat
          //cc.delayTime (2.0), keyPress (cc.KEY [6]),     // fish
          cc.delayTime (3.0), keyPress (cc.KEY.enter),
          cc.delayTime (1.0), keyPress (cc.KEY.left),
          cc.delayTime (3.0), keyPress (cc.KEY [9]), keyPress (cc.KEY [1]),   // jiggy
          cc.delayTime (1.0), keyClear ()
       );

       self.runAction (action);
   },

   // Setup the extra elements for fishing
   _setupFishing: function (sprite) {
      var self = this;
      var line, fish;

      var anim = sprite.getUserData ().anim;
      if (anim.name.match (/.*fish.*/gi)) {
         // Add a DrawNode for the line, and the fish sprite
          if (!sprite.getChildByName ('line')) {
             line = new cc.DrawNode ();
             sprite.addChild (line, 0, 'line');
          }
          if (!sprite.getChildByName ('fish')) {
             fish = new cc.Sprite (aq.res.Fish);
             fish.setRotation (-90);
             fish.setAnchorPoint (1.0, 0.95);
             sprite.addChild (fish, 0, 'fish');
          }

          self.handleLineAndFish (sprite);
      }
   },

   handleLineAndFish: function (sprite) {
       // jshint unused:false
       var self = this;

       var anim = sprite.getUserData ().anim;
       var frame = sprite.getUserData ().frameIndex;

       var line = sprite.getChildByName ('line');
       var fish = sprite.getChildByName ('fish');
       var cp = sprite.getCustomPointForFrame ();

       // This array is borrowed directly from the original code, and the numbers is signed byte range values
       // for a sine table, used to move the fish in a flapping arc when it's being reeled in
       var FISHFLAP_SIN_TAB = [0,150,243,243,150,0,-150,-243,-243,-150,0,150,243,243,150,0,-150,-243,-243,-150];

       if (line && fish) {

          // Setup the line.  Default to draw from the custom point to below the bottom of the screen
          line.clear ();
          fish.setOpacity (0);

          if (cp) {

             let lineTop = cp;

             let LENGTH = cc.winSize.height - sprite.convertToWorldSpace (cp).y;
             let lineBot = cc.p (cp.x, cp.y - LENGTH);

             let mirror = false;

             if (anim.name === 'fishflapR' || anim.name === 'fishflapL') {
                let mul = (anim.name === 'fishflapL' ? -1.0 : 1.0);
                lineBot.x = cp.x + (((FISHFLAP_SIN_TAB [frame] * 10 * mul) / 256) + 8);
                lineBot.y = cp.y - ((LENGTH - cp.y) / 20) * (20 - frame);
                mirror = FISHFLAP_SIN_TAB[frame] < 0 ? true : false;
                if (mul < 0) {
                   mirror = !mirror;
                }
             }

             line.drawSegment (lineTop, lineBot, 1, cc.color (0, 0, 255, 255));

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

       var overlay = sprite.getChildByTag (99);
       if (overlay) {
          self.handleLineAndFish (overlay);
       }
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
       var animation = self._getAnimationForAnim (anim);

       // Maintain the state
       var user_data = sprite.getUserData ();
       var current_state = user_data ? user_data.state : null;

       // Store some of the spritey animation data in the CCSprite
       sprite.setUserData ({
          state: anim.major_state || current_state,
          anim: anim,
          animation: animation,
          frameIndex: frame
       });

       // Set the first sprite frame
       sprite.setDisplayFrameWithNoMovement (anim.name, frame);

       // When scaling the sprite don't anti-alias the image, keep a pixel perfect scale.
       // This only works in WebGL, and the opposite (default) is setAntiAliasTexParameters.
       sprite.texture.setAliasTexParameters ();

       // Anchor point
       sprite.setFrameAnchor ();

       // Move the sprite if an offset is required
       sprite.moveFrame (offset);

       // stop all current actions
       sprite.stopAllActions ();

       // Handle an overlay animation.
       sprite.removeChildByTag (99);
       if (anim.overlay) {

          // Create a new sprite (having removed any existing ones above)
          let overlay_sprite = new aq.Sprite ();
          self._setSpriteAnim (overlay_sprite, anim.overlay, frame);

          // Work out the offset. Remember, a child node at 0,0 does not get drawn at the anchor point
          let overlay_offset = sprite.getAnchorPointInPoints ();
          overlay_offset.y = -overlay_offset.y;

          overlay_sprite.x = overlay_offset.x;
          overlay_sprite.y = -overlay_offset.y;

          // Update the sprite userData to include the overlay
          let userData = sprite.getUserData ();
          userData.overlay = anim.overlay;

          sprite.addChild (overlay_sprite, -1, 99);
       }

       if (anim.custom_points) {
          self._setupFishing (sprite);
       }

       // start the new animation
       var animate = aq.animate (animation, frame);

       var action = null;
       if (anim.advance) {
          var advanceAnim = cc.callFunc (function () {
             self._setSpriteAnim (sprite, anim.advance.to_anim, anim.advance.getFrame (), anim.advance.getOffset ());
             if (!anim.isOverlay) {
                self.listTransitions (anim.advance.to_anim);
             }
          });
          action = cc.sequence (animate, advanceAnim);
       } else {
          action = cc.repeatForever (animate);
       }
       action.setTag (0);
       sprite.runAction (action);
   }
});

aq.scenes.SpriteTestScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new SpriteTestLayer ();
      this.addChild (layer);
   }
});
