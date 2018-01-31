'use strict';

aq.behaviour = aq.behaviour || {};

/**
 * Function that runs each game update to handle the general
 * gumbler behaviours.
 *
 * @param gumbler The method is called for each gumbler in turn
 */
aq.behaviour.GumblerHandleGameUpdate = function (gumbler) {

   // This list of behaviours to process each game update
   let behaviours = [
      aq.behaviour.GumblerRandomlyWalksAround,
      aq.behaviour.GumblerReversesAtGridEdge
   ];

   for (let i = 0; i < behaviours.length; i++) {
      if (behaviours [i] (gumbler)) {
         return true;
      }
   }

   return false;
};

aq.behaviour.GumblerRandomlyWalksAround = function (gumbler) {
   let description = 'Gumblers waiting will walk off in a random direction';
   let current_state_name = gumbler.getAnimationStateName ();

   if (current_state_name === 'wait') {
      gumbler.setAnimationState ('walk_left');
      cc.log (description);
      return true;
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
