'use strict';

aq.spritey = aq.spritey || {};

aq.spritey.object_list = [];
aq.spritey.animations = {};
aq.spritey.states = {};
aq.spritey.test = [];

var FAKE_KEYS = false;
var KEYS_CONTROL = true;

var SpriteTestLayer = cc.Layer.extend ({

   gumbler: null,

   root: null,

   debug: null,

   transitions: null,

   keysPressed: [],

   ctor: function () {
      var self = this;

      // 1. super init first
      self._super ();

      var block_size = aq.config.BLOCK_SIZE;
      var blocks_wide = aq.config.GRID_WIDTH;

      var layer_size = self.getContentSize ();

      // Background that resembles the game grid area)
      var area_size = cc.size (block_size * blocks_wide, cc.winSize.height);
      var background = new cc.LayerColor (cc.color (128,0,0,128), area_size.width, area_size.height);
      background.setPosition ((layer_size.width - area_size.width) / 2, 0);

      // Use the background as the root node for all other things in this test scene
      self.root = background;
      self.addChild (self.root);

      if (aq.config.SPRITEY_DEBUG) {
         self.setupDebug ();
      }

      if (FAKE_KEYS) {
         self.initFakeKeySequence ();
      }

      // The custom event listener will be initially paused.  It is un-paused
      // by super::onEnter (called below in onEnter)
      cc.eventManager.addListener (cc.EventListener.create ({
         event: cc.EventListener.CUSTOM,
         eventName: aq.spritey.GumblerAnimator.EVENT_TYPE,
         callback: function (event) {
           self.gumblerEvent (event);
         }
      }), self);

      cc.eventManager.addListener ({
         event: cc.EventListener.KEYBOARD,
         onKeyPressed: function (keyCode) {
            self.keyAction (keyCode, true);
         },
         onKeyReleased: function (keyCode){
            self.keyAction (keyCode, false);
         }
      }, self);
   },

   onEnter: function () {
      var self = this;

      // This is important to un-pause the custom event listener
      this._super ();

      self.initTestSprite (aq.spritey.test [0]);

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

   gumblerEvent: function (event) {
      var self = this;
      let data = event.getUserData ();

      if (data.event === aq.spritey.GumblerAnimator.EVENT_INIT) {
         self._listTransitionControlKeys ();
      } else {
         //cc.log ('Unhandled gumbler event: ' + data.event);
      }
   },

   update: function () {
      var self = this;

      self.handleKeys ();
      self.handleDebug ();

      // Wrap the sprite at the bottom of the 'screen'
      var sprite = self.getCurrentSprite ();
      if (sprite.getPositionY () <  -sprite.getContentSize ().height) {
         sprite.setPositionY (sprite.getPositionY () + cc.winSize.height);
      }
   },

   initTestSprite: function (sprite_data) {
       var self = this;

       self.gumbler = new aq.spritey.Gumbler ();
       self.gumbler.initWithTestData (sprite_data);
       self.root.addChild (self.gumbler);
   },

   getCurrentSprite: function () {
       var self = this;
       return self.gumbler;
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
          self.root.addChild (self.debug);
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

      if (!self.debug) {
         return;
      }

      var item = self.debug.getChildByTag (i);
      if (item) {
         item.setString (self.debugItems [i] + data);
      }
   },

   handleKeys: function () {
       var self = this;

       let sprite = self.getCurrentSprite ();
       let animator = sprite.getAnimator ();

       if (animator.isTransitioning ()) {
          return;
       }

       let countPressed = 0;
       for (let k in self.keysPressed) {
          if (self.keysPressed [k]) {
             countPressed++;
          }
       }

       let current_anim_keys = animator.getCurrentAnimKeys ();

       // The same key can be defined as a transition more than once in a state
       for (let i = 0; i < current_anim_keys.length; i++) {
          let key = current_anim_keys [i];
          let mod = key.mod;

          let pressed = self.keysPressed [key.keyCode()];

          if (key.label) {
             key.label.setColor (pressed ? cc.color (0, 255, 0) : cc.color (255, 255, 255));
          }

          if (pressed) {
             let will_transition = false;
             if (mod === 0 && countPressed === 1) {
                will_transition = animator.startTransition (key);
             } else {
                let mCode = cc.KEY ['' + mod];
                if (self.keysPressed [mCode]) {
                   will_transition = animator.startTransition (key);
                }
             }
             if (will_transition) {
                self.keysPressed [key.keyCode()] = false;
             }
          }
       }
   },

   _listTransitionControlKeys: function () {
       var self = this;

       let sprite = self.getCurrentSprite ();

       let anim = sprite.getUserData ().anim;

       if (!anim.keys) {
          return;
       }

       // Now visually create a list to display
       var block_size = aq.config.BLOCK_SIZE;
       var blocks_wide = aq.config.GRID_WIDTH;

       if (!self.transitions) {
          self.transitions = new cc.Node ();
          if (KEYS_CONTROL) {
             self.root.addChild (self.transitions);
          }
       }
       self.transitions.removeAllChildren ();

       let global_keys = aq.spritey.GumblerAnimator.getGlobalTransitions ();

       let num_transitions = anim.keys.length;
       let num_global_transitions = global_keys.length;

       let label = new cc.LabelTTF ('', 'Arial', 32);
       let font_height = label.getLineHeight ();

       self.transitions.setPosition (blocks_wide * block_size + 10, 0);
       var key_pos = cc.p (10, num_transitions * (font_height - 1));

       // Calculate the transitions that have matching keypresses,
       // so they can be numbered with a modifier
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

       for (let i = 0; i < num_global_transitions; i++) {
          let key_name = global_keys [i].name;
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
             key.label = key_label;

             // TODO: Refactor this hack
             key.mod = label_numbers [key_name];
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
       for (let i = 0; i < global_keys.length; i++) {
          let key_label = get_key_label (global_keys [i]);
          key_label.setPosition (key_pos);
          self.transitions.addChild (key_label);
          key_pos.y -= font_height;
       }
   },

   initFakeKeySequence: function () {
       var self = this;

       if (!FAKE_KEYS) {
          return;
       }

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

   // Internal function to switch to a new animation
   _setSpriteAnim: function (sprite, anim, frame, offset) {
       sprite._setSpriteAnim (anim, frame, offset);
   }
});

aq.scenes.SpriteTestScene = cc.Scene.extend ({
   onEnter: function () {
      this._super ();
      var layer = new SpriteTestLayer ();
      this.addChild (layer);
   }
});
