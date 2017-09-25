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

      cc.Sprite.prototype.setSpriteFrame.call (this, newFrame);
   }
});

var SpriteTestLayer = cc.Layer.extend ({

   sprites: null,

   transitions: null,

   keysPressed: [],

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      self.sprites = [];

      for (var i = 0; i < aq.spritey.test.length; i++) {
         self.initTestSprite (aq.spritey.test [i]);
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

   keyAction: function (keyCode, pressed) {
      var self = this;
      self.keysPressed [keyCode] = pressed;
   },

   update: function () {
      var self = this;

      self.handleKeys ();
      self.handleTransition ();
   },

   getCurrentSprite: function () {
       var self = this;
       return self.sprites [0];
   },

   handleKeys: function () {
       var self = this;

       if (!self.transitions) {
          return;
       }

       var sprite = self.getCurrentSprite ();

       if (sprite.transitioning) {
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

       if (sprite.transitioning) {
          // test the frame and if we're on the right one to transition, do so

          sprite.transitioning = false;
       }
   },

   startTransition: function (key) {
       var self = this;

       var sprite = self.getCurrentSprite ();

       if (sprite.transitioning) {
          return;
       }

       var to_anim;

       if (key.all) {
          // There is only one transition and any frame the sprite is currently on will transition
          to_anim = key.transitions [0].to_anim;
       } else {
          // The transition triggers on a certain frame
          for (var j = 0; j < key.transitions.length; j++) {
             if (key.transitions [j].to_anim) {
                to_anim = key.transitions[j].to_anim;
                break;
             }
          }
       }
       if (to_anim) {
          self._setSpriteAnim (sprite, to_anim);
          self.listTransitions (to_anim);
          self.keysPressed [key.keyCode()] = false;
          sprite.transitioning = true;
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
       self._setSpriteAnim (sprite, anim, sprite_data.frame_num - 1);

       // save for later reference
       self.sprites.push (sprite);
   },

   // Internal function to switch to a new animation
   _setSpriteAnim: function (sprite, anim, frame) {
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

       // Set the first sprite frame
       sprite.setDisplayFrameWithAnimationName (anim.name, frame);

       // When scaling the sprite don't anti-alias the image, keep a pixel perfect scale.
       // This only works in WebGL, and the opposite (default) is setAntiAliasTexParameters.
       sprite.texture.setAliasTexParameters ();

       // tmp anchor point (should use anim data)
       sprite.setAnchorPoint (0.5, 0.0);

       // stop all current actions
       sprite.stopAllActions ();

       // start a new one
       var animate = cc.animate (animation);
       var action = null;
       if (anim.advance) {
          var advanceAnim = cc.callFunc (function () {
             self._setSpriteAnim (sprite, anim.advance.to_anim);
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
