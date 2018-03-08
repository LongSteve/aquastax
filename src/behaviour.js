'use strict';

aq.behaviour = aq.behaviour || {};

/**
 * Function that runs each game update to handle the general
 * gumbler behaviours.
 *
 * @param gumbler The method is called for each gumbler in turn
 */
aq.behaviour.GumblerHandleGameUpdate = function (gumbler, navigation) {

   // This list of behaviours to process each game update
   let behaviours = [
      aq.behaviour.GumblerRandomlyWalksAround,
      aq.behaviour.GumblerReversesAtGridEdge,
      aq.behaviour.GumblerDoesSomethingAtPlatformEdge,
      aq.behaviour.GumblerSittingTimesOut,
      aq.behaviour.GumblerReelsInFish,
      aq.behaviour.GumblerLandsOnStackWhenFalling
   ];

   for (let i = 0; i < behaviours.length; i++) {
      if (behaviours [i] (gumbler, navigation)) {
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerRandomlyWalksAround = function (gumbler, navigation) {
   let description = 'Gumblers waiting will walk off in a random direction';
   let current_state_name = gumbler.getAnimationStateName ();
   let current_state_time = gumbler.getAnimationStateTime ();

   if (current_state_name === 'wait') {
      if (current_state_time > 3.0) {

         let grid = navigation.getGrid ();
         let grid_index = grid.getGridIndexForNode (gumbler);

         let can_walk_left = grid_index > 0 && navigation.canWalk (grid_index - 1);
         let can_walk_right = navigation.canWalk (grid_index + 1);

         let direction = Math.random () < 0.5 ? 'walk_left' : 'walk_right';
         if (can_walk_left && !can_walk_right) {
            direction = 'walk_left';
         } else if (can_walk_right && !can_walk_left) {
            direction = 'walk_right';
         }

         gumbler.setAnimationState (direction);
         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerReversesAtGridEdge = function (gumbler) {
   let description = 'Gumbler walking towards grid edge reverses direction';
   let current_state_name = gumbler.getAnimationStateName ();

   if (current_state_name === 'walk_left') {
      if (gumbler.getPositionX () < (aq.config.BLOCK_SIZE >> 1)) {
         gumbler.setAnimationState ('walk_right');
         cc.log (description);
         return true;
      }
   } else if (current_state_name === 'walk_right') {
      if (gumbler.getPositionX () > (aq.config.BLOCK_SIZE * aq.config.GRID_WIDTH) - (aq.config.BLOCK_SIZE >> 1)) {
         gumbler.setAnimationState ('walk_left');
         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerDoesSomethingAtPlatformEdge = function (gumbler, navigation) {
   let description = 'Gumbler does something at a platform edge';
   let current_state_name = gumbler.getAnimationStateName ();

   let grid = navigation.getGrid ();
   let grid_index = grid.getGridIndexForNode (gumbler);

   let rnd = Math.random ();

   let grid_pos = grid.getGridPositionForIndex (grid_index);

   if (current_state_name === 'walk_left') {
      if (!navigation.canWalk (grid_index - 1)) {
         if (rnd < 0.25) {
            gumbler.setAnimationState ('wait');
         } else if (rnd < 0.75) {
            gumbler.setAnimationState ('walk_right');
         } else {
            gumbler.setAnimationState ('timeout_sit_left');
            gumbler.setPositionX (grid_pos.x + (aq.config.BLOCK_SIZE / 3));
         }
         cc.log (description);
         return true;
      }
   } else if (current_state_name === 'walk_right') {
      if (!navigation.canWalk (grid_index + 1)) {
         if (rnd < 0.25) {
            gumbler.setAnimationState ('wait');
         } else if (rnd < 0.75) {
            gumbler.setAnimationState ('walk_left');
         } else {
            gumbler.setAnimationState ('timeout_sit_right');
            gumbler.setPositionX (grid_pos.x + (aq.config.BLOCK_SIZE / 3 * 2));
         }
         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerSittingTimesOut = function (gumbler) {
   let description = 'Gumbler setting performs a timeout';
   let current_state_name = gumbler.getAnimationStateName ();
   let current_state_time = gumbler.getAnimationStateTime ();

   let rnd = Math.random ();

   if (current_state_time > 3.0) {
      if (current_state_name === 'timeout_sit_left') {
         gumbler.setAnimationState (rnd < 0.5 ? 'timeout_fish_left' : 'wait');
         cc.log (description);
         return true;
      } else if (current_state_name === 'timeout_sit_right') {
         gumbler.setAnimationState (rnd < 0.5 ? 'timeout_fish_right' : 'wait');
         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerReelsInFish = function (gumbler) {
   let description = 'Gumbler reels in a fish';
   let current_state_name = gumbler.getAnimationStateName ();
   let current_state_time = gumbler.getAnimationStateTime ();

   if (current_state_time > 3.0) {
      if (current_state_name === 'timeout_fish_left') {
         gumbler.setAnimationState ('timeout_reel_left');
         cc.log (description);
         return true;
      } else if (current_state_name === 'timeout_fish_right') {
         gumbler.setAnimationState ('timeout_reel_right');
         cc.log (description);
         return true;
      } else if (current_state_name === 'timeout_reel_left' || current_state_name === 'timeout_reel_right') {
         gumbler.setAnimationState ('wait');
         cc.log (description);
         return true;
      }

   }

   return false;
};

aq.behaviour.GumblerLandsOnStackWhenFalling = function (gumbler, navigation) {
   let description = 'Gumbler falling lands upon the stack (or the ground)';
   let current_state_name = gumbler.getAnimationStateName ();
   let grid = navigation.getGrid ();
   if (current_state_name === 'fall') {
      let grid_index = grid.getGridIndexForNode (gumbler);
      if (grid_index < 0 || (navigation.canWalk (grid_index) && navigation.canWalk (grid_index - 1))) {
         if (gumbler.setAnimationState ('wait')) {

            // Adjust the Gumbler Y position so he sits properly on the grid cell
            let grid_pos = grid.getGridPositionForIndex (grid_index);
            gumbler.setPositionY (grid_pos.y + aq.config.BLOCK_SIZE);

            cc.log (description);
            return true;
         }
      }
   }

   return false;
};

/**
 * Method that is run only when a grid event occurs, to process
 * any Gumbler behaviours
 * @param event_data The event that has occured
 * @param gumbler The method is called for each gumbler in turn
 */
aq.behaviour.GumblerRespondToGridEvent = function (event_data, gumbler) {

   // This list of behaviours is processed when a grid event occurs
   let behaviours = [
      aq.behaviour.GumblerWakeWhenBlockLandsNear
   ];

   for (let i = 0; i < behaviours.length; i++) {
      if (behaviours [i] (event_data, gumbler)) {
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerWakeWhenBlockLandsNear = function (event_data, gumbler) {
   let description = 'Gumbler wakes up when a block lands or breaks near';

   if (event_data.event !== aq.Grid.EVENT_BLOCK_LAND && event_data.event !== aq.Grid.EVENT_BLOCK_BREAK) {
      return false;
   }

   let p1 = event_data.block.getPosition ();
   let p2 = gumbler.getPosition ();
   if (Math.abs (p1.y - p2.y) < aq.config.BLOCK_SIZE) {
      if (Math.abs (p1.x - p2.x) < (aq.config.BLOCK_SIZE << 1)) {
         if (gumbler.getAnimationStateName () === 'sleep') {
            gumbler.setAnimationState ('wait');
            cc.log (description);
            return true;
         }
      }
   }

   return false;
};
