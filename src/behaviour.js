'use strict';

aq.behaviour = aq.behaviour || {};

// 'Constants' for determining the behaviour time spans
aq.behaviour.WaitBeforeMovingSeconds = 3.0;
aq.behaviour.TimeoutWhenSittingSeconds = 3.0;
aq.behaviour.TimeSpentFishingSeconds = 3.0;
aq.behaviour.HangingTimeBeforePullUp = 3.0;

// ... and random modifiers to alter the states
aq.behaviour.MoveLeftOrRightChance = 0.5;
aq.behaviour.WaitAtPlatformEdgeChance = 0.25;
aq.behaviour.WalkAtPlatformEdgeChance = 0.75;
aq.behaviour.FishingWhenSittingChance = 0.5;

aq.behaviour.climbing_states = Object.freeze ({
   'climb_up': true,
   'climb_down': true,
   'climb_left': true,
   'climb_right': true,
   'hang_twohand': true,
   'hang_lefthand': true,
   'hang_righthand': true
});

aq.behaviour.GumblerIsClimbing = function (gumbler) {
   return aq.behaviour.climbing_states [gumbler.getAnimationStateName ()] ? true : false;
};

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
      aq.behaviour.GumblerLandsOnStackWhenFalling,
      aq.behaviour.GumblerStartsClimbing,
      aq.behaviour.GumblerClimbingFollowsPath,
      aq.behaviour.GumblerHangingPullsHimselfUp,
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
      if (current_state_time > aq.behaviour.WaitBeforeMovingSeconds) {

         let grid = navigation.getGrid ();
         let grid_index = grid.getGridIndexForNode (gumbler);

         let can_walk_left = grid_index > 0 && navigation.canWalk (grid_index - 1);
         let can_walk_right = navigation.canWalk (grid_index + 1);

         let direction = Math.random () < aq.behaviour.MoveLeftOrRightChance ? 'walk_left' : 'walk_right';
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

   let can_walk_left = grid_index > 0 && navigation.canWalk (grid_index - 1);
   let can_walk_right = navigation.canWalk (grid_index + 1);

   let walking_left = (current_state_name === 'walk_left');
   let walking_right = (current_state_name === 'walk_right');

   let grid_pos = grid.getGridPositionForIndex (grid_index);

   if ((walking_left && !can_walk_left) || (walking_right && !can_walk_right)) {
      if (rnd < aq.behaviour.WaitAtPlatformEdgeChance) {
         gumbler.setAnimationState ('wait');
      } else if (rnd < aq.behaviour.WalkAtPlatformEdgeChance) {
         if (walking_left) {
            gumbler.setAnimationState ('walk_right');
         } else {
            gumbler.setAnimationState ('walk_left');
         }
      } else {
         if (walking_left) {
            gumbler.setAnimationState ('timeout_sit_left');
            gumbler.setPositionX (grid_pos.x + (aq.config.BLOCK_SIZE / 3));
         } else {
            gumbler.setAnimationState ('timeout_sit_right');
            gumbler.setPositionX (grid_pos.x + (aq.config.BLOCK_SIZE / 3 * 2));
         }
      }
      cc.log (description);
      return true;
   }

   return false;
};

aq.behaviour.GumblerSittingTimesOut = function (gumbler) {
   let description = 'Gumbler setting performs a timeout';
   let current_state_name = gumbler.getAnimationStateName ();
   let current_state_time = gumbler.getAnimationStateTime ();

   let rnd = Math.random ();

   if (current_state_time > aq.behaviour.TimeoutWhenSittingSeconds) {
      if (current_state_name === 'timeout_sit_left') {
         gumbler.setAnimationState (rnd < aq.behaviour.FishingWhenSittingChance ? 'timeout_fish_left' : 'wait');
         cc.log (description);
         return true;
      } else if (current_state_name === 'timeout_sit_right') {
         gumbler.setAnimationState (rnd < aq.behaviour.FishingWhenSittingChance ? 'timeout_fish_right' : 'wait');
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

   if (current_state_time > aq.behaviour.TimeSpentFishingSeconds) {
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

aq.behaviour.GumblerStartsClimbing = function (gumbler, navigation) {
   let description = 'Gumbler starts climbing when a path upwards is possible';
   let grid = navigation.getGrid ();

   let gumbler_is_climbing = aq.behaviour.GumblerIsClimbing (gumbler);
   let path = gumbler.getNavigationPath ();

   if (!gumbler_is_climbing && path && path.length > 1) {
      if (path [1] === path [0] + aq.config.GRID_WIDTH) {

         let grid_index = grid.getGridIndexForNode (gumbler);

         // path is going up, make the gumbler climb
         gumbler.setAnimationState ('climb_up');

         // Adjust the Gumbler X position so he is aligned between two grid cells
         let grid_pos = grid.getGridPositionForIndex (grid_index);
         gumbler.setPositionX (grid_pos.x);

         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerClimbingFollowsPath = function (gumbler, navigation) {

   let description = 'Gumbler climbing follows the direction of the path';
   let grid = navigation.getGrid ();

   let gumbler_is_climbing = aq.behaviour.GumblerIsClimbing (gumbler);
   let path = gumbler.getNavigationPath ();

   let grid_index = grid.getGridIndexForNode (gumbler);
   let grid_pos = grid.getGridPositionForIndex (grid_index);

   if (!path) {
      return false;
   }

   let state_changed = false;

   if (gumbler_is_climbing) {
      if (path.length > 1) {
         if (path [1] === path [0] + aq.config.GRID_WIDTH) {
            state_changed = gumbler.setAnimationState ('climb_up');
            if (state_changed) {
               gumbler.setPositionX (grid_pos.x);
            }
         } else if (path [1] === path [0] - aq.config.GRID_WIDTH) {
            state_changed = gumbler.setAnimationState ('climb_down');
            if (state_changed) {
               gumbler.setPositionX (grid_pos.x);
            }
         } else if (path [1] === path [0] - 1) {
            state_changed = gumbler.setAnimationState ('climb_left');
            if (state_changed) {
               gumbler.setPositionY (grid_pos.y + aq.config.BLOCK_SIZE * 0.3);
            }
         } else if (path [1] === path [0] + 1) {
            state_changed = gumbler.setAnimationState ('climb_right');
            if (state_changed) {
               gumbler.setPositionY (grid_pos.y + aq.config.BLOCK_SIZE * 0.3);
            }
         }
      } else {
         state_changed = gumbler.setAnimationState ('hang_twohand');
         if (state_changed) {
            gumbler.setPositionY (grid_pos.y + aq.config.BLOCK_SIZE * 0.3);
         }
      }

      if (state_changed) {
         cc.log (description);
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerHangingPullsHimselfUp = function (gumbler) {

   let description = 'Gumbler hanging pulls himself up';
   let current_state_name = gumbler.getAnimationStateName ();
   let current_state_time = gumbler.getAnimationStateTime ();

   if (current_state_name === 'hang_twohand' && current_state_time > aq.behaviour.HangingTimeBeforePullUp) {
      gumbler.setAnimationState ('wait');
      cc.log (description);
      return true;
   }

   return false;
};

/**
 * Method that is run only when a grid event occurs, to process
 * any Gumbler behaviours
 * @param event_data The event that has occured
 * @param gumbler The method is called for each gumbler in turn
 */
aq.behaviour.GumblerRespondToGridEvent = function (event_data, gumbler, navigation) {

   // This list of behaviours is processed when a grid event occurs
   let behaviours = [
      aq.behaviour.GumblerWakeWhenBlockLandsNear,
      aq.behaviour.GumblerFallsWhenStackIsBroken
   ];

   for (let i = 0; i < behaviours.length; i++) {
      if (behaviours [i] (event_data, gumbler, navigation)) {
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

aq.behaviour.GumblerFallsWhenStackIsBroken = function (event_data, gumbler, navigation) {
   let description = 'Gumbler falls when the stack collapses and he ends up in mid air';

   if (event_data.event !== aq.Grid.EVENT_STACK_COLLAPSED) {
      return false;
   }

   let grid = navigation.getGrid ();
   let grid_index = grid.getGridIndexForNode (gumbler);

   // Test the blocks where the gumbler would stand.
   // TODO: If the gumbler is climbing, test the blocks where is hands are

   let can_walk = navigation.canWalk (grid_index);

   if (!can_walk) {
      gumbler.setAnimationState ('fall');
      cc.log (description);
      return true;
   }

   return false;
};
