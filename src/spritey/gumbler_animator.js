'use strict';

/**
 * <p>
 *     The class responsible for animating gumbler sprites
 * </p>
 * @class
 * @extends cc.Class
 */
aq.spritey.GumblerAnimator = cc.Class.extend (/** @lends cc.Class# */{

   gumbler: null,

   current_anim_keys: null,

   transition_to: null,

   ctor: function (gumbler) {
      this.gumbler = gumbler;
   },

   getGumbler: function () {
       return this.gumbler;
   },

   getCurrentAnimKeys: function () {
       return this.current_anim_keys;
   },

   isTransitioning: function () {
       return (this.transition_to !== null);
   },

   _dispatchEvent: function (event) {
       var self = this;

       cc.eventManager.dispatchCustomEvent (aq.spritey.GumblerAnimator.EVENT_TYPE, {
          'event': event,
          'gumbler': self.gumbler
       });
   },

   initTransitions: function () {
       var self = this;

       let data = self.gumbler.getUserData ();

       let anim = data.anim;

       let num_transitions = anim.keys.length;

       // Combine the global transitions with the current
       let global_keys = aq.spritey.GumblerAnimator.global_keys;
       let num_global_transitions = global_keys.length;

       // Stash a list of all the anim transitions
       self.current_anim_keys = [];
       for (let i = 0; i < num_transitions; i++) {
          self.current_anim_keys.push (anim.keys [i]);
       }
       for (let i = 0; i < num_global_transitions; i++) {
          self.current_anim_keys.push (global_keys [i]);
       }

       self._dispatchEvent (aq.spritey.GumblerAnimator.EVENT_INIT);
   },

   handleTransition: function () {
       var self = this;

       let sprite_frame_index = self.gumbler.getUserData ().frameIndex;

       if (self.transition_to) {
          if (self.transition_to.now || self.transition_to.on_frame === sprite_frame_index) {

             let to_anim = self.transition_to.transition.to_anim;
             let to_frame = self.transition_to.transition.getFrame ();
             let offset = self.transition_to.transition.getOffset ();

             self.gumbler._setSpriteAnim (to_anim, to_frame, offset);

             self.initTransitions ();

             self.transition_to = null;
          }
       }
   },

   startTransition: function (key) {
       var self = this;

       if (self.transition_to) {
          return true;
       }

       // The current sprite frame
       let sprite_frame_index = self.gumbler.getUserData ().frameIndex;

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
          self.transition_to = {
             transition: transition_to,
             on_frame: transition_on_frame,
             now: transition_now,
             key: key
          };

          self._dispatchEvent (aq.spritey.GumblerAnimator.EVENT_START);
       }

       if (self.transition_to) {
          return true;
       }

       return false;
   }

});

aq.spritey.GumblerAnimator.global_keys = [];
aq.spritey.GumblerAnimator.initGlobalKeys = function () {
    let global_keys = aq.spritey.GumblerAnimator.global_keys;

    let object_list = aq.spritey.object_list;
    for (let o in object_list) {
       if (object_list [o]) {
          let object = object_list [o];
          if (object.type () === 'Key') {
             global_keys.push (object);
          }
       }
    }
};

aq.spritey.GumblerAnimator.getGlobalTransitions = function () {
   return aq.spritey.GumblerAnimator.global_keys;
};

aq.spritey.GumblerAnimator.EVENT_TYPE  = 'gumbler_animator';

aq.spritey.GumblerAnimator.EVENT_START = 'start_transition';   // A new animation state has been requested
aq.spritey.GumblerAnimator.EVENT_INIT  = 'init_transition';    // The requested new animation state has now been initialised

aq.spritey.animator = function (gumbler) {

   if (aq.spritey.GumblerAnimator.global_keys.length === 0) {
      aq.spritey.GumblerAnimator.initGlobalKeys ();
   }

   return new aq.spritey.GumblerAnimator (gumbler);
};

aq.spritey.GumblerAnimator.create = aq.spritey.animator;
