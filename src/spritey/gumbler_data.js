'use strict';

// One controllable LARGE Gumbler (FULL ANIM DATA SET)

aq.spritey.gumbler = function gumbler () {

   // Load all the frames from the TexturePacker defined Gumbler sprite sheet
   cc.spriteFrameCache.addSpriteFrames (aq.res.GumblerSprites);

   // The parser for the Gumbler Animation System script originally output a list of 'GameObject' objects
   // but it seems somewhat mad to deal with all the parser generator and domain specific language
   // business now, when we can just code the data definition all up in Javascript.

   // Objects to hold state while building the animation data
   var current_anim = null;
   var image_map = {};
   var state_map = aq.spritey.states;

   var new_object = function (Ctor, ...args) {
      let obj = new Ctor (...args);
      aq.spritey.object_list.push (obj);
      return obj;
   };

   var parse_error = function (e) {
      aq.fatalError ('Animation Data Error: ' + e);
   };

   var key_color = function (...args) {
      return new_object (aq.spritey.objects.KeyColor, ...args);
   };

   var background_color = function (...args) {
      return new_object (aq.spritey.objects.BackgroundColor, ...args);
   };

   var map_insert_unique = function (obj, map) {
      if (map [obj.name]) {
         parse_error ('Animation object ' + obj._type + ' (' + obj.name + ') is already defined.');
      } else {
         map [obj.name] = obj;
      }
      return map [obj.name];
   };

   var image = function (...args) {
      let img = new_object (aq.spritey.objects.Image, ...args);
      return map_insert_unique (img, image_map);
   };

   var state = function (...args) {
      let st = new_object (aq.spritey.objects.State, ...args);
      return map_insert_unique (st, state_map);
   };

   var start = function (name, state, frame_num, x, y) {
      aq.spritey.test.push ({
         name: name,
         state: state,
         frame_num: frame_num - 1,  // translate from 1 indexed in this script
         position: cc.p (x, y)
      });
   };

   var begin_anim = function (...args) {
      if (current_anim) {
         //cc.log ('End Animation: ' + current_anim.name);
         aq.spritey.animations [current_anim.name] = current_anim;
      }
      if (args [0]) {
         current_anim = new_object (aq.spritey.objects.Anim, ...args);
         //cc.log ('Begin Animation: ' + current_anim.name);
      } else {
         // End of animation data

         // Backfill all object names with references
         for (let anim_name in aq.spritey.animations) {
            let anim = aq.spritey.animations [anim_name];
            if (anim.keys) {
               for (let k = 0; k < anim.keys.length; k++) {
                  let key = anim.keys [k];
                  if (key.transitions) {
                     for (let t = 0; t < key.transitions.length; t++) {
                        let tran = key.transitions [t];
                        tran.to_anim = aq.spritey.animations [tran.name];
                     }
                  }
               }
            }
            if (anim.advance) {
               let to_anim = aq.spritey.animations [anim.advance.name];
               anim.advance.to_anim = to_anim;
            }
            if (anim.overlay) {
               let overlay_anim = aq.spritey.animations [anim.overlay];
               anim.overlay = overlay_anim;
               anim.overlay.isOverlay = true;
            }
         }

         for (let o in aq.spritey.object_list) {
            let obj = aq.spritey.object_list [o];
            // Backfill any global transitions
            if (obj.type () === 'Key') {
               if (obj.transitions) {
                  for (let t = 0; t < obj.transitions.length; t++) {
                     let tran = obj.transitions [t];
                     tran.to_anim = aq.spritey.animations [tran.name];
                  }
               }

            }
         }
      }
   };

   var major_state = function (state_name) {
      if (!current_anim) {
         parse_error ('major_state ' + state_name + ' without current_anim');
      }
      if (state_map[state_name]) {
         current_anim.major_state = state_map[state_name];
         state_map[state_name].primary = current_anim;
      } else {
         let e = 'State ' + state_name + ' is not defined.';
         parse_error (e);
      }
   };

   var to_state = function (state_name) {
      if (!current_anim) {
         parse_error ('to_state ' + state_name + ' without current_anim');
      }
      if (state_map[state_name]) {
         current_anim.to_state = state_map[state_name];
      } else {
         let e = 'State ' + state_name + ' is not defined.';
         parse_error (e);
      }
   };

   var parse_space_list = function (name, list, item_callback) {
      if (!current_anim) {
         parse_error (name + ' specified without current_anim');
      }
      if (!list) {
         parse_error (name + ' list cannot be empty');
      }
      let ls = list.split (' ');
      let output = [];
      for (let i = 0; i < ls.length; i++) {
         let str = ls [i];
         output.push (item_callback (str));
      }
      return output;
   };

   // frames is a space separated list of images. eg. 'R1 R2 R3 R4 R5 R6'
   var frames = function (frames) {
      current_anim.frames = parse_space_list ('frames', frames, function (item) {
         if (!image_map [item]) {
            parse_error ('frame ' + item + ' is not a defined image');
         }
         return image_map [item];
      });
   };

   // A transition is defined
   // as   IDENTIFIER:anim_name COMMA integer:anim_frame
   // or   IDENTIFIER:anim_name COMMA integer:anim_frame OFFSET integer:xoff COMMA integer:yoff
   var get_transition = function (value) {
      let transition_data = null;
      let transition = null;
      if (value === '-->') {
         transition = new aq.spritey.objects.Transition (null);
      } else {
         try {
            let values = value.split (' ');
            let name_frame = values [0].split (',');
            transition_data = {
               'anim_name': name_frame [0],
               'anim_frame': parseInt (name_frame [1]) - 1,    // why did I ever think 1 indexed was ok!
               'name': 'advance-to(' + name_frame [0] + ')'
            };
            if (value.indexOf ('OFFSET') >= 0 && values.length === 3) {
               let offset = values [2].split (',');
               transition_data.xoff = parseInt (offset [0]);
               transition_data.yoff = parseInt (offset [1]);
            }
         } catch (e) {
            parse_error ('error parsing transition data "' + value + '": ' + e);
         }

         transition = new aq.spritey.objects.Transition (transition_data);
      }

      return transition;
   };

   // Advance is a transition reference
   var advance = function (value) {
      if (!current_anim) {
         parse_error ('advance specified without current_anim');
      }
      current_anim.advance = get_transition (value);
   };

   // Overlay is an anim reference
   var overlay = function (value) {
      if (!current_anim) {
         parse_error ('overlay specified without current_anim');
      }
      current_anim.overlay = value;
   };

   var get_speed = function (value) {
      let s = null;
      try {
         s = parseInt (value);
      } catch (e) {
         parse_error ('speed value must equate to an integer. ' + e);
      }
      return s;
   };

   var speed_all = function (value) {
      if (!current_anim) {
         parse_error ('speed_all specified without current_anim');
      }
      // Set just a single entry into the speeds array
      current_anim.speeds = [get_speed (value)];
   };

   // speed is a space separated list of integers. eg. '10 10 10 20 10 20'
   var speed = function (speeds) {
      current_anim.speeds = parse_space_list ('speed', speeds, get_speed);
   };

   var get_move = function (value) {
      let move = null;
      try {
         let m = value.split (',');
         // speed value should be (int,int) with negative values possible
         let x = parseInt (m[0]);
         let y = parseInt (m[1]);
         move = {'x': x, 'y': y, 'name': x+','+y}; // name is useful for debug output, but not otherwise used
      } catch (e) {
         parse_error ('move value parse error. ' + e);
      }
      return move;
   };

   var move = function (moves) {
      if (!current_anim) {
         parse_error ('move specified without current_anim');
      }

      current_anim.moves = parse_space_list ('move_all', moves, get_move);
   };

   var move_all = function (value) {
      // Set just a single entry into the moves array
      current_anim.moves = [get_move (value)];
   };

   var custom_points = function (name, points) {
      if (!current_anim) {
         parse_error ('custom_points specified without current_anim');
      }

      if (typeof points === 'undefined' && typeof name === 'string') {
         points = name;
         name = 'default';
      }

      current_anim.custom_points [name] = parse_space_list ('custom_points', points, get_move);
   };

   var get_key = function (key_string) {
      let key_string_lowercase = key_string.toLowerCase ();
      let once_index = key_string_lowercase.indexOf ('once');

      let key_name = null;
      if (once_index >= 0) {
         key_name = key_string.substring (once_index + 5);
      } else {
         key_name = key_string;
      }

      let key =  new aq.spritey.objects.Key (key_name);
      key.once = (once_index >= 0);
      return key;
   };

   var global_state_trans_key = function (key_string, transition_string) {
      let key = get_key (key_string);
      key.all = true;
      let transition = get_transition (transition_string);
      key.transitions.push (transition);

      aq.spritey.object_list.push (key);
      return key;
   };

   var state_trans_key = function (key_string, transition_string) {
      if (!current_anim) {
         parse_error ('state_trans_key specified without current_anim');
      }

      let key = get_key (key_string);
      let transition = null;
      let transition_string_lower_case = transition_string.toLowerCase ();
      if (transition_string_lower_case.indexOf ('all') === 0) {
         key.all = true;
         transition_string = transition_string.substring (4);
         transition = get_transition (transition_string);
         key.transitions.push (transition);
      } else {
         let trans_values = transition_string.split (' ');
         for (let i = 0; i < trans_values.length; i++) {
            let trans = trans_values [i];
            // handle the ' OFFSET x,y' that can postfix a transition within the list
            if (i < trans_values.length - 2 && trans_values [i + 1] === 'OFFSET') {
               trans += ' OFFSET ' + trans_values [i + 2];
               i += 2;
            }
            transition = get_transition (trans);
            key.transitions.push (transition);
         }
      }

      current_anim.keys.push (key);
      return key;
   };

   // Surpress the jshint "'{a}' is not defined." message, because these functions are
   // defined dynamically at runtime

   //
   // Gumbler Sprite Definition
   //

   key_color (255, 0, 255);

   background_color (192, 192, 192);

   // Sprite Image Definitions

   // GUMBLER walk
   image ('R1', 'LARGE_gumbler_walk_R01.png');
   image ('R2', 'LARGE_gumbler_walk_R02.png');
   image ('R3', 'LARGE_gumbler_walk_R03.png');
   image ('R4', 'LARGE_gumbler_walk_R04.png');
   image ('R5', 'LARGE_gumbler_walk_R05.png');
   image ('R6', 'LARGE_gumbler_walk_R06.png');
   image ('L1', 'LARGE_gumbler_walk_R01.png', 'MIRROR');
   image ('L2', 'LARGE_gumbler_walk_R02.png', 'MIRROR');
   image ('L3', 'LARGE_gumbler_walk_R03.png', 'MIRROR');
   image ('L4', 'LARGE_gumbler_walk_R04.png', 'MIRROR');
   image ('L5', 'LARGE_gumbler_walk_R05.png', 'MIRROR');
   image ('L6', 'LARGE_gumbler_walk_R06.png', 'MIRROR');

   // GUMBLER climb
   image ('cl1', 'LARGE_gumbler_climb_01.png');
   image ('cl2', 'LARGE_gumbler_climb_02.png');
   image ('cl3', 'LARGE_gumbler_climb_03.png');
   image ('cl4', 'LARGE_gumbler_climb_04.png');
   image ('cl5', 'LARGE_gumbler_climb_05.png');
   image ('cl6', 'LARGE_gumbler_climb_06.png');
   image ('cl7', 'LARGE_gumbler_climb_07.png');
   image ('cl8', 'LARGE_gumbler_climb_01.png', 'MIRROR');
   image ('cl9', 'LARGE_gumbler_climb_02.png', 'MIRROR');
   image ('cl10', 'LARGE_gumbler_climb_03.png', 'MIRROR');
   image ('cl11', 'LARGE_gumbler_climb_04.png', 'MIRROR');
   image ('cl12', 'LARGE_gumbler_climb_05.png', 'MIRROR');
   image ('cl13', 'LARGE_gumbler_climb_06.png', 'MIRROR');
   image ('cl14', 'LARGE_gumbler_climb_07.png', 'MIRROR');

   // GUMBLER climb up top RIGHT
   image ('cltopR1', 'LARGE_gumbler_climbtop_01.png');
   image ('cltopR2', 'LARGE_gumbler_climbtop_02.png');
   image ('cltopR3', 'LARGE_gumbler_climbtop_03.png');
   image ('cltopR4', 'LARGE_gumbler_climbtop_04.png');
   image ('cltopR5', 'LARGE_gumbler_climbtop_05.png');
   image ('cltopR6', 'LARGE_gumbler_climbtop_06.png');
   image ('cltopR7', 'LARGE_gumbler_climbtop_07.png');
   image ('cltopR8', 'LARGE_gumbler_climbtop_08.png');
   image ('cltopR9', 'LARGE_gumbler_climbtop_09.png');
   image ('cltopR10', 'LARGE_gumbler_climbtop_10.png');
   image ('cltopR11', 'LARGE_gumbler_climbtop_11.png');
   image ('cltopR12', 'LARGE_gumbler_climbtop_12.png');
   image ('cltopR13', 'LARGE_gumbler_climbtop_13.png');
   image ('cltopR14', 'LARGE_gumbler_climbtop_14.png');
   image ('cltopR15', 'LARGE_gumbler_climbtop_15.png');
   image ('cltopR16', 'LARGE_gumbler_climbtop_16.png');
   image ('cltopR17', 'LARGE_gumbler_climbtop_17.png');

   // GUMBLER climb up top LEFT
   image ('cltopL1', 'LARGE_gumbler_climbtop_01.png', 'MIRROR');
   image ('cltopL2', 'LARGE_gumbler_climbtop_02.png', 'MIRROR');
   image ('cltopL3', 'LARGE_gumbler_climbtop_03.png', 'MIRROR');
   image ('cltopL4', 'LARGE_gumbler_climbtop_04.png', 'MIRROR');
   image ('cltopL5', 'LARGE_gumbler_climbtop_05.png', 'MIRROR');
   image ('cltopL6', 'LARGE_gumbler_climbtop_06.png', 'MIRROR');
   image ('cltopL7', 'LARGE_gumbler_climbtop_07.png', 'MIRROR');
   image ('cltopL8', 'LARGE_gumbler_climbtop_08.png', 'MIRROR');
   image ('cltopL9', 'LARGE_gumbler_climbtop_09.png', 'MIRROR');
   image ('cltopL10', 'LARGE_gumbler_climbtop_10.png', 'MIRROR');
   image ('cltopL11', 'LARGE_gumbler_climbtop_11.png', 'MIRROR');
   image ('cltopL12', 'LARGE_gumbler_climbtop_12.png', 'MIRROR');
   image ('cltopL13', 'LARGE_gumbler_climbtop_13.png', 'MIRROR');
   image ('cltopL14', 'LARGE_gumbler_climbtop_14.png', 'MIRROR');
   image ('cltopL15', 'LARGE_gumbler_climbtop_15.png', 'MIRROR');
   image ('cltopL16', 'LARGE_gumbler_climbtop_16.png', 'MIRROR');
   image ('cltopL17', 'LARGE_gumbler_climbtop_17.png', 'MIRROR');

   // GUMBLER stand to climb TRANSITION (from standing to climbing)
   image ('clt1', 'LARGE_gumbler_climb_trans_01.png');
   image ('clt2', 'LARGE_gumbler_climb_trans_02.png');
   image ('clt3', 'LARGE_gumbler_climb_trans_03.png');

   // GUMBLER victory
   image ('vic1', 'LARGE_gumbler_victory_01.png');
   image ('vic2', 'LARGE_gumbler_victory_02.png');
   image ('vic3', 'LARGE_gumbler_victory_03.png');
   image ('vic4', 'LARGE_gumbler_victory_04.png');
   image ('vic5', 'LARGE_gumbler_victory_05.png');

   // GUMBLER hand over hand right (climbing moving right)
   image ('handR1', 'LARGE_gumbler_handover_01.png');
   image ('handR2', 'LARGE_gumbler_handover_02.png');
   image ('handR3', 'LARGE_gumbler_handover_03.png');
   image ('handR4', 'LARGE_gumbler_handover_04.png');
   image ('handR5', 'LARGE_gumbler_handover_05.png');
   image ('handR6', 'LARGE_gumbler_handover_06.png');
   image ('handR7', 'LARGE_gumbler_handover_07.png');
   image ('handR8', 'LARGE_gumbler_handover_08.png');

   // GUMBLER hand over hand left (climbing moving left)
   image ('handL1', 'LARGE_gumbler_handover_01.png', 'MIRROR');
   image ('handL2', 'LARGE_gumbler_handover_02.png', 'MIRROR');
   image ('handL3', 'LARGE_gumbler_handover_03.png', 'MIRROR');
   image ('handL4', 'LARGE_gumbler_handover_04.png', 'MIRROR');
   image ('handL5', 'LARGE_gumbler_handover_05.png', 'MIRROR');
   image ('handL6', 'LARGE_gumbler_handover_06.png', 'MIRROR');
   image ('handL7', 'LARGE_gumbler_handover_07.png', 'MIRROR');
   image ('handL8', 'LARGE_gumbler_handover_08.png', 'MIRROR');

   // GUMBLER drowning
   image ('drown1', 'LARGE_gumbler_drown_01.png');
   image ('drown2', 'LARGE_gumbler_drown_02.png');
   image ('drown3', 'LARGE_gumbler_drown_03.png');
   image ('drown4', 'LARGE_gumbler_drown_04.png');
   image ('drown5', 'LARGE_gumbler_drown_05.png');
   image ('drown6', 'LARGE_gumbler_drown_06.png');
   image ('drown7', 'LARGE_gumbler_drown_07.png');
   image ('drown8', 'LARGE_gumbler_drown_08.png');

   // GUMBLER drown down bubbles (bubbles of death)
   image ('bubbles1', 'LARGE_gumbler_drown_down_bubbles_01.png', 'CENTRE 7,45');
   image ('bubbles2', 'LARGE_gumbler_drown_down_bubbles_02.png', 'CENTRE 7,47');
   image ('bubbles3', 'LARGE_gumbler_drown_down_bubbles_03.png', 'CENTRE 7,50');
   image ('bubbles4', 'LARGE_gumbler_drown_down_bubbles_04.png', 'CENTRE 7,52');
   image ('bubbles5', 'LARGE_gumbler_drown_down_bubbles_05.png', 'CENTRE 7,53');
   image ('bubbles6', 'LARGE_gumbler_drown_down_bubbles_06.png', 'CENTRE 7,30');
   image ('bubbles7', 'LARGE_gumbler_drown_down_bubbles_07.png', 'CENTRE 7,37');
   image ('bubbles8', 'LARGE_gumbler_drown_down_bubbles_08.png', 'CENTRE 7,43');

   // GUMBLER waiting (static frame - as same as first turn frame)
   image ('wait1', 'LARGE_gumbler_turn_01.png');

   // GUMBLER turn around
   image ('turn1', 'LARGE_gumbler_turn_01.png');
   image ('turn2', 'LARGE_gumbler_turn_02.png');
   image ('turn3', 'LARGE_gumbler_turn_03.png');
   image ('turn4', 'LARGE_gumbler_turn_04.png');
   image ('turn5', 'LARGE_gumbler_turn_05.png');
   image ('turn6', 'LARGE_gumbler_turn_06.png');
   image ('turn7', 'LARGE_gumbler_turn_07.png');
   image ('turn8', 'LARGE_gumbler_turn_08.png');

   // GUMBLER sit down TRANSITION right (from standing up to sitting down facing right)
   image ('sitdownR1', 'LARGE_gumbler_sit_trans_01.png', 'CENTRE 6,31');
   image ('sitdownR2', 'LARGE_gumbler_sit_trans_02.png', 'CENTRE 6,31');
   image ('sitdownR3', 'LARGE_gumbler_sit_trans_03.png', 'CENTRE 6,31');

   // GUMBLER sit down TRANSITION left (from standing up to sitting down facing leftt)
   image ('sitdownL1', 'LARGE_gumbler_sit_trans_01.png', 'CENTRE 6,31 MIRROR');
   image ('sitdownL2', 'LARGE_gumbler_sit_trans_02.png', 'CENTRE 6,31 MIRROR');
   image ('sitdownL3', 'LARGE_gumbler_sit_trans_03.png', 'CENTRE 6,31 MIRROR');

   // GUMBLER stand up TRANSITION right (from sitting down right to standing up facing wall)
   image ('standR1', 'LARGE_gumbler_stand_trans_01.png', 'CENTRE 11,24');
   image ('standR2', 'LARGE_gumbler_stand_trans_02.png', 'CENTRE 11,24');
   image ('standR3', 'LARGE_gumbler_stand_trans_03.png', 'CENTRE 11,24');
   image ('standR4', 'LARGE_gumbler_climbtop_16.png', 'CENTRE 11,31');
   image ('standR5', 'LARGE_gumbler_climbtop_17.png', 'CENTRE 11,31');

   // GUMBLER stand up TRANSITION left (from sitting down left to standing up facing wall)
   image ('standL1', 'LARGE_gumbler_stand_trans_01.png', 'CENTRE 11,24 MIRROR');
   image ('standL2', 'LARGE_gumbler_stand_trans_02.png', 'CENTRE 11,24 MIRROR');
   image ('standL3', 'LARGE_gumbler_stand_trans_03.png', 'CENTRE 11,24 MIRROR');
   image ('standL4', 'LARGE_gumbler_climbtop_16.png', 'CENTRE 11,31 MIRROR');
   image ('standL5', 'LARGE_gumbler_climbtop_17.png', 'CENTRE 11,31 MIRROR');

   // GUMBLER hanging straight (hanging with two hands static frame)
   image ('hangst1', 'LARGE_gumbler_hangstraight_01.png');

   // GUMBLER hanging swaping hands LEFT to RIGHT
   image ('hangswapL1', 'LARGE_gumbler_hang_swap_01.png', 'CENTRE 20,25');

   // GUMBLER hanging swaping hands RIGHT to LEFT
   image ('hangswapR1', 'LARGE_gumbler_hang_swap_01.png', 'CENTRE 20,25 MIRROR');

   // GUMBLER hanging TRANSITION (from climb to hanging straight)
   image ('hangon1', 'LARGE_gumbler_hangon_01.png');
   image ('hangon2', 'LARGE_gumbler_hangon_02.png');

   // GUMBLER falling (spinning)
   image ('fallspin1', 'LARGE_gumbler_fallspin_01.png');
   image ('fallspin2', 'LARGE_gumbler_fallspin_02.png');
   image ('fallspin3', 'LARGE_gumbler_fallspin_03.png');
   image ('fallspin4', 'LARGE_gumbler_fallspin_04.png');
   image ('fallspin5', 'LARGE_gumbler_fallspin_05.png');
   image ('fallspin6', 'LARGE_gumbler_fallspin_06.png');
   image ('fallspin7', 'LARGE_gumbler_fallspin_07.png');
   image ('fallspin8', 'LARGE_gumbler_fallspin_08.png');
   image ('fallspin9', 'LARGE_gumbler_fallspin_09.png');
   image ('fallspin10', 'LARGE_gumbler_fallspin_10.png');

   // GUMBLER bounce (after falling)
   image ('bounce1', 'LARGE_gumbler_bounce_01.png');
   image ('bounce2', 'LARGE_gumbler_bounce_02.png');
   image ('bounce3', 'LARGE_gumbler_bounce_03.png');
   image ('bounce4', 'LARGE_gumbler_bounce_04.png');
   image ('bounce5', 'LARGE_gumbler_bounce_05.png');
   image ('bounce6', 'LARGE_gumbler_bounce_06.png');
   image ('bounce7', 'LARGE_gumbler_bounce_07.png');
   image ('bounce8', 'LARGE_gumbler_bounce_08.png');
   image ('bounce9', 'LARGE_gumbler_bounce_09.png');
   image ('bounce10', 'LARGE_gumbler_bounce_10.png');
   image ('bounce11', 'LARGE_gumbler_bounce_11.png');

   // GUMBLER get up (after a fall)
   image ('getup1', 'LARGE_gumbler_getup_01.png');
   image ('getup2', 'LARGE_gumbler_getup_02.png');
   image ('getup3', 'LARGE_gumbler_getup_03.png');
   image ('getup4', 'LARGE_gumbler_getup_04.png');
   image ('getup5', 'LARGE_gumbler_getup_05.png');
   image ('getup6', 'LARGE_gumbler_getup_06.png');
   image ('getup7', 'LARGE_gumbler_getup_07.png');
   image ('getup8', 'LARGE_gumbler_getup_08.png');
   image ('getup9', 'LARGE_gumbler_getup_09.png');
   image ('getup10', 'LARGE_gumbler_getup_10.png');

   // GUMBLER shake head (after a fall)
   image ('shakehead1', 'LARGE_gumbler_timeout_yawn_10.png');
   image ('shakehead2', 'LARGE_gumbler_turn_01.png');
   image ('shakehead3', 'LARGE_gumbler_timeout_yawn_10.png', 'MIRROR');

   // GUMBLER exit leap (leave level)
   image ('exit1', 'LARGE_gumbler_exitleap_01.png');
   image ('exit2', 'LARGE_gumbler_exitleap_02.png');
   image ('exit3', 'LARGE_gumbler_exitleap_03.png');
   image ('exit4', 'LARGE_gumbler_exitleap_04.png');
   image ('exit5', 'LARGE_gumbler_exitleap_05.png');
   image ('exit6', 'LARGE_gumbler_exitleap_06.png');
   image ('exit7', 'LARGE_gumbler_exitleap_07.png');
   image ('exit8', 'LARGE_gumbler_exitleap_08.png');
   image ('exit9', 'LARGE_gumbler_exitleap_01.png');
   image ('exit10', 'LARGE_gumbler_exitleap_10.png');
   image ('exit11', 'LARGE_gumbler_exitleap_11.png');
   image ('exit12', 'LARGE_gumbler_exitleap_12.png');
   image ('exit13', 'LARGE_gumbler_exitleap_13.png');
   image ('exit14', 'LARGE_gumbler_exitleap_14.png');
   image ('exit15', 'LARGE_gumbler_exitleap_15.png');
   image ('exit16', 'LARGE_gumbler_exitleap_16.png');
   image ('exit17', 'LARGE_gumbler_exitleap_17.png');
   image ('exit18', 'LARGE_gumbler_exitleap_18.png');
   image ('exit19', 'LARGE_gumbler_exitleap_19.png');

   // GUMBLER TIMEOUT asleep
   image ('sleep1', 'LARGE_gumbler_timeout_sleep_01.png', 'CENTRE 8,29');
   image ('sleep2', 'LARGE_gumbler_timeout_sleep_02.png', 'CENTRE 8,29');
   image ('sleep3', 'LARGE_gumbler_timeout_sleep_03.png', 'CENTRE 8,29');

   // GUMBLER TIMEOUT asleep ZZZZ
   image ('zzz1', 'LARGE_gumbler_timeout_zzz_01.png', 'CENTRE -9,58');
   image ('zzz2', 'LARGE_gumbler_timeout_zzz_02.png', 'CENTRE -9,58');
   image ('zzz3', 'LARGE_gumbler_timeout_zzz_03.png', 'CENTRE -9,58');
   image ('zzz4', 'LARGE_gumbler_timeout_zzz_04.png', 'CENTRE -9,58');
   image ('zzz5', 'LARGE_gumbler_timeout_zzz_05.png', 'CENTRE -9,58');

   // GUMBLER TIME OUT look around w/ binos
   image ('look1', 'LARGE_gumbler_timeout_look_01.png');
   image ('look2', 'LARGE_gumbler_timeout_look_02.png');
   image ('look3', 'LARGE_gumbler_timeout_look_03.png');
   image ('look4', 'LARGE_gumbler_timeout_look_04.png');
   image ('look5', 'LARGE_gumbler_timeout_look_05.png');
   image ('look6', 'LARGE_gumbler_timeout_look_06.png');
   image ('look7', 'LARGE_gumbler_timeout_look_07.png');
   image ('look8', 'LARGE_gumbler_timeout_look_08.png');
   image ('look9', 'LARGE_gumbler_timeout_look_09.png');
   image ('look10', 'LARGE_gumbler_timeout_look_10.png');
   image ('look11', 'LARGE_gumbler_timeout_look_11.png');
   image ('look12', 'LARGE_gumbler_timeout_look_12.png');
   image ('look13', 'LARGE_gumbler_timeout_look_13.png');
   image ('look14', 'LARGE_gumbler_timeout_look_01.png', 'MIRROR');
   image ('look15', 'LARGE_gumbler_timeout_look_02.png', 'MIRROR');
   image ('look16', 'LARGE_gumbler_timeout_look_03.png', 'MIRROR');
   image ('look17', 'LARGE_gumbler_timeout_look_04.png', 'MIRROR');
   image ('look18', 'LARGE_gumbler_timeout_look_05.png', 'MIRROR');
   image ('look19', 'LARGE_gumbler_timeout_look_06.png', 'MIRROR');
   image ('look20', 'LARGE_gumbler_timeout_look_07.png', 'MIRROR');
   image ('look21', 'LARGE_gumbler_timeout_look_08.png', 'MIRROR');
   image ('look22', 'LARGE_gumbler_timeout_look_09.png', 'MIRROR');
   image ('look23', 'LARGE_gumbler_timeout_look_10.png', 'MIRROR');
   image ('look24', 'LARGE_gumbler_timeout_look_11.png', 'MIRROR');
   image ('look25', 'LARGE_gumbler_timeout_look_12.png', 'MIRROR');
   image ('look26', 'LARGE_gumbler_timeout_look_13.png', 'MIRROR');

   // GUMBLER TIME OUT look up w/ binos
   image ('lookup1', 'LARGE_gumbler_timeout_lookup_01.png', 'CENTRE 11,35');
   image ('lookup2', 'LARGE_gumbler_timeout_lookup_02.png', 'CENTRE 11,35');
   image ('lookup3', 'LARGE_gumbler_timeout_lookup_03.png', 'CENTRE 11,35');
   image ('lookup4', 'LARGE_gumbler_timeout_lookup_04.png', 'CENTRE 11,35');
   image ('lookup5', 'LARGE_gumbler_timeout_lookup_02.png', 'CENTRE 11,35 MIRROR');
   image ('lookup6', 'LARGE_gumbler_timeout_lookup_01.png', 'CENTRE 11,35 MIRROR');

   // GUMBLER TIME OUT sitting down kicking his legs facing RIGHT
   image ('sitR1', 'LARGE_gumbler_timeout_sit_01.png', 'CENTRE 6,23');
   image ('sitR2', 'LARGE_gumbler_timeout_sit_02.png', 'CENTRE 6,23');
   image ('sitR3', 'LARGE_gumbler_timeout_sit_03.png', 'CENTRE 6,23');
   image ('sitR4', 'LARGE_gumbler_timeout_sit_04.png', 'CENTRE 6,23');
   image ('sitR5', 'LARGE_gumbler_timeout_sit_05.png', 'CENTRE 6,23');
   image ('sitR6', 'LARGE_gumbler_timeout_sit_06.png', 'CENTRE 6,23');
   image ('sitR7', 'LARGE_gumbler_timeout_sit_07.png', 'CENTRE 6,23');
   image ('sitR8', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,23');
   image ('sitR9', 'LARGE_gumbler_timeout_sit_09.png', 'CENTRE 6,23');
   image ('sitR10', 'LARGE_gumbler_timeout_sit_10.png', 'CENTRE 6,23');
   image ('sitR11', 'LARGE_gumbler_timeout_sit_11.png', 'CENTRE 6,23');

   // GUMBLER TIME OUT sitting down kicking his legs facing LEFT
   image ('sitL1', 'LARGE_gumbler_timeout_sit_01.png', 'CENTRE 6,23 MIRROR');
   image ('sitL2', 'LARGE_gumbler_timeout_sit_02.png', 'CENTRE 6,23 MIRROR');
   image ('sitL3', 'LARGE_gumbler_timeout_sit_03.png', 'CENTRE 6,23 MIRROR');
   image ('sitL4', 'LARGE_gumbler_timeout_sit_04.png', 'CENTRE 6,23 MIRROR');
   image ('sitL5', 'LARGE_gumbler_timeout_sit_05.png', 'CENTRE 6,23 MIRROR');
   image ('sitL6', 'LARGE_gumbler_timeout_sit_06.png', 'CENTRE 6,23 MIRROR');
   image ('sitL7', 'LARGE_gumbler_timeout_sit_07.png', 'CENTRE 6,23 MIRROR');
   image ('sitL8', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,23 MIRROR');
   image ('sitL9', 'LARGE_gumbler_timeout_sit_09.png', 'CENTRE 6,23 MIRROR');
   image ('sitL10', 'LARGE_gumbler_timeout_sit_10.png', 'CENTRE 6,23 MIRROR');
   image ('sitL11', 'LARGE_gumbler_timeout_sit_11.png', 'CENTRE 6,23 MIRROR');

   // GUMBLER TIME OUT sitting eating a chicken facing RIGHT
   image ('eatR1', 'LARGE_gumbler_timeout_eat_01.png', 'CENTRE 6,30');
   image ('eatR2', 'LARGE_gumbler_timeout_eat_02.png', 'CENTRE 6,30');
   image ('eatR3', 'LARGE_gumbler_timeout_eat_03.png', 'CENTRE 6,30');
   image ('eatR4', 'LARGE_gumbler_timeout_eat_04.png', 'CENTRE 6,30');
   image ('eatR5', 'LARGE_gumbler_timeout_eat_05.png', 'CENTRE 6,30');
   image ('eatR6', 'LARGE_gumbler_timeout_eat_06.png', 'CENTRE 6,30');
   image ('eatR7', 'LARGE_gumbler_timeout_eat_07.png', 'CENTRE 6,30');

   // GUMBLER TIME OUT sitting eating a chicken facing LEFT
   image ('eatL1', 'LARGE_gumbler_timeout_eat_01.png', 'CENTRE 6,30 MIRROR');
   image ('eatL2', 'LARGE_gumbler_timeout_eat_02.png', 'CENTRE 6,30 MIRROR');
   image ('eatL3', 'LARGE_gumbler_timeout_eat_03.png', 'CENTRE 6,30 MIRROR');
   image ('eatL4', 'LARGE_gumbler_timeout_eat_04.png', 'CENTRE 6,30 MIRROR');
   image ('eatL5', 'LARGE_gumbler_timeout_eat_05.png', 'CENTRE 6,30 MIRROR');
   image ('eatL6', 'LARGE_gumbler_timeout_eat_06.png', 'CENTRE 6,30 MIRROR');
   image ('eatL7', 'LARGE_gumbler_timeout_eat_07.png', 'CENTRE 6,30 MIRROR');

   // GUMBLER TIME OUT cast off RIGHT
   image ('fishcastR1', 'LARGE_gumbler_timeout_cast_01.png', 'CENTRE 6,31');
   image ('fishcastR2', 'LARGE_gumbler_timeout_cast_02.png', 'CENTRE 6,31');
   image ('fishcastR3', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,15');
   image ('fishcastR4', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,15');

   // GUMBLER TIME OUT cast off LEFT
   image ('fishcastL1', 'LARGE_gumbler_timeout_cast_01.png', 'CENTRE 6,31 MIRROR');
   image ('fishcastL2', 'LARGE_gumbler_timeout_cast_02.png', 'CENTRE 6,31 MIRROR');
   image ('fishcastL3', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,15 MIRROR');
   image ('fishcastL4', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,15 MIRROR');

   // GUMBLER TIME OUT fishing RIGHT
   image ('fishwaitR1', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,23');

   // GUMBLER TIME OUT fishing LEFT
   image ('fishwaitL1', 'LARGE_gumbler_timeout_sit_08.png', 'CENTRE 6,23 MIRROR');

   // GUMBLER TIME OUT fishing rod RIGHT
   image ('fishwaitrodR1', 'LARGE_gumbler_timeout_fish__rod_01.png', 'CENTRE 1,12');
   image ('fishwaitrodR2', 'LARGE_gumbler_timeout_fish__rod_02.png', 'CENTRE 1,12');
   image ('fishwaitrodR3', 'LARGE_gumbler_timeout_fish__rod_03.png', 'CENTRE 1,12');
   image ('fishwaitrodR4', 'LARGE_gumbler_timeout_fish__rod_04.png', 'CENTRE 1,12');

   // GUMBLER TIME OUT fishing rod LEFT
   image ('fishwaitrodL1', 'LARGE_gumbler_timeout_fish__rod_01.png', 'CENTRE 1,12 MIRROR');
   image ('fishwaitrodL2', 'LARGE_gumbler_timeout_fish__rod_02.png', 'CENTRE 1,12 MIRROR');
   image ('fishwaitrodL3', 'LARGE_gumbler_timeout_fish__rod_03.png', 'CENTRE 1,12 MIRROR');
   image ('fishwaitrodL4', 'LARGE_gumbler_timeout_fish__rod_04.png', 'CENTRE 1,12 MIRROR');

   // GUMBLER TIME OUT fishing reel in RIGHT
   image ('fishreelR1', 'LARGE_gumbler_timeout_fishreel_01.png', 'CENTRE 8,37');
   image ('fishreelR2', 'LARGE_gumbler_timeout_fishreel_02.png', 'CENTRE 8,37');
   image ('fishreelR3', 'LARGE_gumbler_timeout_fishreel_03.png', 'CENTRE 8,37');
   image ('fishreelR4', 'LARGE_gumbler_timeout_fishreel_04.png', 'CENTRE 8,37');
   image ('fishreelR5', 'LARGE_gumbler_timeout_fishreel_05.png', 'CENTRE 8,37');
   image ('fishreelR6', 'LARGE_gumbler_timeout_fishreel_06.png', 'CENTRE 8,37');
   image ('fishreelR7', 'LARGE_gumbler_timeout_fishreel_07.png', 'CENTRE 8,37');

   // GUMBLER TIME OUT fishing reel in LEFT
   image ('fishreelL1', 'LARGE_gumbler_timeout_fishreel_01.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL2', 'LARGE_gumbler_timeout_fishreel_02.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL3', 'LARGE_gumbler_timeout_fishreel_03.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL4', 'LARGE_gumbler_timeout_fishreel_04.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL5', 'LARGE_gumbler_timeout_fishreel_05.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL6', 'LARGE_gumbler_timeout_fishreel_06.png', 'CENTRE 8,37 MIRROR');
   image ('fishreelL7', 'LARGE_gumbler_timeout_fishreel_07.png', 'CENTRE 8,37 MIRROR');

   // GUMBLER TIME OUT fishing reel in walking RIGHT
   image ('fishwalkR1', 'LARGE_gumbler_timeout_fishreel_07.png', 'CENTRE 22,37');
   image ('fishwalkR2', 'LARGE_gumbler_timeout_fishreel_walk_01.png');
   image ('fishwalkR3', 'LARGE_gumbler_timeout_fishreel_walk_02.png');
   image ('fishwalkR4', 'LARGE_gumbler_timeout_fishreel_walk_03.png');
   image ('fishwalkR5', 'LARGE_gumbler_timeout_fishreel_walk_04.png');

   // GUMBLER TIME OUT fishing reel in walking LEFT
   image ('fishwalkL1', 'LARGE_gumbler_timeout_fishreel_07.png', 'CENTRE 22,37 MIRROR');
   image ('fishwalkL2', 'LARGE_gumbler_timeout_fishreel_walk_01.png', 'MIRROR');
   image ('fishwalkL3', 'LARGE_gumbler_timeout_fishreel_walk_02.png', 'MIRROR');
   image ('fishwalkL4', 'LARGE_gumbler_timeout_fishreel_walk_03.png', 'MIRROR');
   image ('fishwalkL5', 'LARGE_gumbler_timeout_fishreel_walk_04.png', 'MIRROR');

   // GUMBLER TIME OUT yawing
   image ('yawn1', 'LARGE_gumbler_timeout_yawn_01.png');
   image ('yawn2', 'LARGE_gumbler_timeout_yawn_02.png');
   image ('yawn3', 'LARGE_gumbler_timeout_yawn_03.png');
   image ('yawn4', 'LARGE_gumbler_timeout_yawn_04.png');
   image ('yawn5', 'LARGE_gumbler_timeout_yawn_05.png');
   image ('yawn6', 'LARGE_gumbler_timeout_yawn_06.png');
   image ('yawn7', 'LARGE_gumbler_timeout_yawn_07.png');
   image ('yawn8', 'LARGE_gumbler_timeout_yawn_08.png');
   image ('yawn9', 'LARGE_gumbler_timeout_yawn_09.png');
   image ('yawn10', 'LARGE_gumbler_timeout_yawn_10.png');

   // GUMBLER TIME OUT jiggy dance (get down to that hidden beat)
   image ('jiggy1', 'LARGE_gumbler_turn_01.png');
   image ('jiggy2', 'LARGE_gumbler_turn_02.png');
   image ('jiggy3', 'LARGE_gumbler_timeout_jiggy_01.png', 'CENTRE 9,29');
   image ('jiggy4', 'LARGE_gumbler_turn_02.png', 'MIRROR');
   image ('jiggy5', 'LARGE_gumbler_timeout_jiggy_01.png', 'CENTRE 9,29 MIRROR');

   // GUMBLER TIME OUT booty dance (shake that booty Mama!)
   image ('booty1', 'LARGE_gumbler_turn_05.png');
   image ('booty2', 'LARGE_gumbler_turn_04.png');
   image ('booty3', 'LARGE_gumbler_timeout_booty_01.png', 'CENTRE 14,31');
   image ('booty4', 'LARGE_gumbler_turn_06.png');
   image ('booty5', 'LARGE_gumbler_timeout_booty_01.png', 'CENTRE 14,31 MIRROR');

   // GUMBLER TIMEOUT waving
   image ('waving1', 'LARGE_gumbler_timeout_wave_01.png', 'CENTRE 8,32');
   image ('waving2', 'LARGE_gumbler_timeout_wave_02.png', 'CENTRE 8,32');
   image ('waving3', 'LARGE_gumbler_timeout_wave_03.png', 'CENTRE 8,32');
   image ('waving4', 'LARGE_gumbler_timeout_wave_04.png', 'CENTRE 8,32');
   image ('waving5', 'LARGE_gumbler_timeout_wave_05.png', 'CENTRE 8,32');
   image ('waving6', 'LARGE_gumbler_timeout_wave_06.png', 'CENTRE 8,32');
   image ('waving7', 'LARGE_gumbler_timeout_wave_07.png', 'CENTRE 8,32');

   // GUMBLER wave to wait TRANSITION
   image ('wavetrans1', 'LARGE_gumbler_timeout_wave_trans_01.png', 'CENTRE 8,32');
   image ('wavetrans2', 'LARGE_gumbler_timeout_wave_trans_02.png', 'CENTRE 8,32');

   // GUMBLER TIME OUT hanging on with one (left) arm
   image ('hangL1', 'LARGE_gumbler_hanging_01.png');
   image ('hangL2', 'LARGE_gumbler_hanging_02.png');
   image ('hangL3', 'LARGE_gumbler_hanging_03.png');
   image ('hangL4', 'LARGE_gumbler_hanging_04.png');
   image ('hangL5', 'LARGE_gumbler_hanging_05.png');
   image ('hangL6', 'LARGE_gumbler_hanging_06.png');

   // GUMBLER TIME OUT hanging on with one (right) arm
   image ('hangR1', 'LARGE_gumbler_hanging_01.png', 'MIRROR');
   image ('hangR2', 'LARGE_gumbler_hanging_02.png', 'MIRROR');
   image ('hangR3', 'LARGE_gumbler_hanging_03.png', 'MIRROR');
   image ('hangR4', 'LARGE_gumbler_hanging_04.png', 'MIRROR');
   image ('hangR5', 'LARGE_gumbler_hanging_05.png', 'MIRROR');
   image ('hangR6', 'LARGE_gumbler_hanging_06.png', 'MIRROR');

   // GUMBLER hang to climb TRANSITION (from hanging on with LEFT arm to climbing)
   image ('hangrecoverL1', 'LARGE_gumbler_hang_trans_01.png', 'CENTRE 16,33');
   image ('hangrecoverL2', 'LARGE_gumbler_hang_trans_02.png', 'CENTRE 16,33');
   image ('hangrecoverL3', 'LARGE_gumbler_hang_trans_03.png', 'CENTRE 16,33');
   image ('hangrecoverL4', 'LARGE_gumbler_hang_trans_04.png', 'CENTRE 16,33');
   image ('hangrecoverL5', 'LARGE_gumbler_hang_trans_05.png', 'CENTRE 16,33');
   image ('hangrecoverL6', 'LARGE_gumbler_hang_trans_06.png', 'CENTRE 16,33');
   image ('hangrecoverL7', 'LARGE_gumbler_hang_trans_07.png', 'CENTRE 16,33');
   image ('hangrecoverL8', 'LARGE_gumbler_hang_trans_08.png', 'CENTRE 16,33');
   image ('hangrecoverL9', 'LARGE_gumbler_hang_trans_09.png', 'CENTRE 16,33');
   image ('hangrecoverL10', 'LARGE_gumbler_hang_trans_10.png', 'CENTRE 16,33');

   // GUMBLER hang to climb TRANSITION (from hanging on with RIGHT arm to climbing)
   image ('hangrecoverR1', 'LARGE_gumbler_hang_trans_01.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR2', 'LARGE_gumbler_hang_trans_02.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR3', 'LARGE_gumbler_hang_trans_03.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR4', 'LARGE_gumbler_hang_trans_04.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR5', 'LARGE_gumbler_hang_trans_05.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR6', 'LARGE_gumbler_hang_trans_06.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR7', 'LARGE_gumbler_hang_trans_07.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR8', 'LARGE_gumbler_hang_trans_08.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR9', 'LARGE_gumbler_hang_trans_09.png', 'CENTRE 16,33 MIRROR');
   image ('hangrecoverR10', 'LARGE_gumbler_hang_trans_10.png', 'CENTRE 16,33 MIRROR');

   // GUMBLER TIME OUT twisting and waiting
   image ('twist1', 'LARGE_gumbler_turn_01.png');
   image ('twist2', 'LARGE_gumbler_timeout_twist_01.png');
   image ('twist3', 'LARGE_gumbler_timeout_twist_02.png');
   image ('twist4', 'LARGE_gumbler_timeout_twist_03.png');
   image ('twist5', 'LARGE_gumbler_turn_01.png');
   image ('twist6', 'LARGE_gumbler_timeout_twist_01.png', 'MIRROR');
   image ('twist7', 'LARGE_gumbler_timeout_twist_02.png', 'MIRROR');
   image ('twist8', 'LARGE_gumbler_timeout_twist_03.png', 'MIRROR');

   // GUMBLER Panic right (run around like a fool on cheap speed)
   image ('panicR1', 'LARGE_gumbler_panic_01.png');
   image ('panicR2', 'LARGE_gumbler_panic_02.png');

   // GUMBLER Panic left (run around like a fool on cheap speed)
   image ('panicL1', 'LARGE_gumbler_panic_01.png', 'MIRROR');
   image ('panicL2', 'LARGE_gumbler_panic_02.png', 'MIRROR');

   //#LAYOUT LARGE_hang_guide.png 39,40
   //#LAYOUT LARGE_guide.png 45,33
   //#LAYOUT LARGE_guide.png 45,1
   //#LAYOUT LARGE_guide.png 74,33
   //#LAYOUT LARGE_guide.png 74,1
   //#LAYOUT line.png 39,60
   //#LAYOUT line.png 39,90


   //START
   start ('gumbler1', 'wait', 1, 6 * 50, 0, 'FOCUS');
   //start ('gumbler2', 'timeout_fish_right', 1, 384, 448, 'FOCUS');
   //start ('gumbler2', 'hang_twohand', 1, 60, 94, 'FOCUS');
   //start ('gumbler3', 'walk_right', 1, 60, 94, 'FOCUS');
   //start ('gumbler1', 'fall', 1, 300, 800, 'FOCUS');

   //STATES
   state ('wait');
   state ('sleep');
   state ('zzz');
   state ('walk_right');
   state ('walk_left');
   state ('victory');
   state ('exit');
   state ('null');
   state ('climb_up');
   state ('climb_down');
   state ('climb_left');
   state ('climb_right');
   state ('hang_twohand');
   state ('hang_lefthand');
   state ('hang_righthand');
   state ('knock');
   state ('fall');
   state ('fall_short');
   state ('land');
   state ('drown');
   state ('drown_down');
   state ('bubbles');
   state ('timeout_sit_left');
   state ('timeout_sit_right');
   state ('timeout_fish_left');
   state ('timeout_fish_right');
   state ('timeout_reel_left');
   state ('timeout_reel_right');
   state ('timeout_eat_left');
   state ('timeout_eat_right');
   state ('timeout_wave');
   state ('timeout_look1');
   state ('timeout_look2');
   state ('timeout_look3');
   state ('timeout_look4');
   state ('timeout_look5');
   state ('timeout_look6');
   state ('timeout_look7');
   state ('timeout_look8');
   state ('timeout_jiggy');
   state ('timeout_booty');
   state ('timeout_twist');
   state ('panic_left');
   state ('panic_right');

   //
   // Global animation transitions that can occur from any current animation
   //

   global_state_trans_key ('ONCE G', 'drown,1');

   global_state_trans_key ('ONCE G', 'fallspin,1');

   global_state_trans_key ('ONCE G', 'knockspin,1');

   //
   // Animation states
   //

   begin_anim ('right');
   major_state ('walk_right');
   frames ('R1 R2 R3 R4 R5 R6');
   speed_all (10);
   move_all ('3,0');

   state_trans_key ('LEFT', 'left,1 left,2 left,3 left,4 left,5 left,6');
   state_trans_key ('ONCE UP', 'ALL Rturn2climb,1');
   state_trans_key ('ONCE SPACE', 'ALL Rturn,1');
   state_trans_key ('ONCE DOWN', 'ALL stand2sitR,1');
   state_trans_key ('ONCE RETURN', 'ALL climbtopdownR,1 OFFSET 0,20');

   begin_anim ('left');
   major_state ('walk_left');
   frames ('L1 L2 L3 L4 L5 L6');
   speed_all (10);
   move_all ('-3,0');

   state_trans_key ('RIGHT', 'right,1 right,2 right,3 right,4 right,5 right,6');
   state_trans_key ('ONCE UP', 'ALL Lturn2climb,1');
   state_trans_key ('ONCE SPACE', 'ALL Lturn,1');
   state_trans_key ('ONCE DOWN', 'ALL stand2sitL,1');
   state_trans_key ('ONCE RETURN', 'ALL climbtopdownR,1 OFFSET 0,20');

   begin_anim ('climb');
   major_state ('climb_up');
   frames ('cl1 cl2 cl3 cl4 cl5 cl6 cl7 cl8 cl9 cl10 cl11 cl12 cl13 cl14');
   speed_all (15);
   move_all ('0,-2');
   custom_points ('left_hand', '2,7 2,5 2,4 3,2 4,2 4,1 6,0 6,2 6,4 6,6 6,8 6,10 6,12 3,11');
   custom_points ('right_hand', '21,2 21,4 21,6 21,8 21,10 21,12 24,11 25,7 25,5 25,4 24,2 23,2 23,1 21,0');

   state_trans_key ('ONCE RIGHT', 'ALL handright,2');
   state_trans_key ('ONCE LEFT', 'ALL handleft,2');
   state_trans_key ('ONCE SPACE', 'ALL climbtopL,1 OFFSET 0,-2');
   state_trans_key ('ONCE DOWN', 'climbdown,1 climbdown,14 climbdown,13 climbdown,12 climbdown,11 climbdown,10 climbdown,9 climbdown,8 climbdown,7 climbdown,6 climbdown,5 climbdown,4 climbdown,3 climbdown,2');
   state_trans_key ('ONCE UP', 'ALL climb2hangstraight,1');
   state_trans_key ('ONCE K5', 'ALL fallshort,1');

   begin_anim ('climb2hangstraight');
   to_state ('hang_twohand');
   frames ('hangon1 hangon2');
   speed_all (10);
   advance ('hangstraight,1');
   move_all ('0,0');
   custom_points ('left_hand', '2,0 2,0');
   custom_points ('right_hand', '19,0 21,0');

   begin_anim ('hangstraight');
   major_state ('hang_twohand');
   frames ('hangst1');
   speed_all (10);
   move_all ('0,0');
   custom_points ('left_hand', '2,0');
   custom_points ('right_hand', '21,0');

   state_trans_key ('ONCE UP', 'ALL climb,1');
   state_trans_key ('ONCE DOWN', 'ALL climbdown,6');
   state_trans_key ('ONCE RETURN', 'ALL climbtopupR,1 OFFSET 0,-2');
   state_trans_key ('ONCE LEFT', 'ALL handleft,1 OFFSET -1,-1');
   state_trans_key ('ONCE RIGHT', 'ALL handright,1 OFFSET 1,-1');
   state_trans_key ('ONCE K4', 'ALL hangstraight2hangL,1 OFFSET -8,-9');
   state_trans_key ('ONCE K6', 'ALL hangstraight2hangR,1 OFFSET 8,-9');
   state_trans_key ('ONCE K5', 'ALL fallshort,1');

   begin_anim ('climbtopupL');
   to_state ('wait');
   frames ('cltopL1 cltopL2 cltopL3 cltopL4 cltopL5 cltopL6 cltopL7 cltopL8 cltopL9 cltopL10 cltopL11 cltopL12 cltopL13 cltopL14 cltopL15 cltopL16 cltopL17');
   speed_all (10);
   advance ('turnback2frontR,1 OFFSET 0,-28');
   move ('0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,-3 0,-1 0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,0');

   begin_anim ('climbtopupR');
   to_state ('wait');
   frames ('cltopR1 cltopR2 cltopR3 cltopR4 cltopR5 cltopR6 cltopR7 cltopR8 cltopR9 cltopR10 cltopR11 cltopR12 cltopR13 cltopR14 cltopR15 cltopR16 cltopR17');
   speed_all (10);
   advance ('turnback2frontL,1 OFFSET 0,-28');
   move ('0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,-3 0,-1 0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,0');

   begin_anim ('fallshort');
   major_state ('fall_short');
   frames ('hangst1');
   speed_all (10);
   move ('0,4');
   advance ('wait,1');

   begin_anim ('fallspin');
   major_state ('fall');
   frames ('fallspin10 fallspin9 fallspin8 fallspin7 fallspin6 fallspin5 fallspin4 fallspin3 fallspin2 fallspin1');
   speed_all (5);
   move_all ('0,4');

   state_trans_key ('ONCE SPACE', 'ALL bounce,1');

   begin_anim ('bounce');
   to_state ('wait');
   frames ('bounce1 bounce2 bounce3 bounce4 bounce5 bounce6 bounce7 bounce8 bounce9 bounce10 bounce11');
   speed_all (10);
   advance ('getup,1');
   move ('0,4 0,4 0,4 0,4 0,0 0,0 0,0 0,0 0,0 0,0 0,1');

   begin_anim ('getup');
   to_state ('wait');
   frames ('getup1 getup2 getup3 getup4 getup5 getup6 getup7 getup8 getup9 getup10');
   speed_all (10);
   advance ('shakehead,1 OFFSET 0,-1');
   move_all ('0,0');

   begin_anim ('shakehead');
   to_state ('wait');
   frames ('shakehead2 shakehead3 shakehead2 shakehead1 shakehead2 shakehead3 shakehead2 shakehead1');
   speed_all (10);
   advance ('wait,1');
   move_all ('0,0');

   begin_anim ('exitleap');
   to_state ('exit');
   frames ('exit1 exit2 exit3 exit4 exit5 exit6 exit7 exit8 exit9 exit10 exit11 exit12 exit13 exit14 exit15 exit16 exit17 exit18 exit19');
   speed_all (10);
   advance ('exitover,1');
   move_all ('0,0');

   begin_anim ('exitover');
   major_state ('null');
   frames ('exit16');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE RETURN', 'wait,1');
   begin_anim ('climbtopR');
   to_state ('wait');
   frames ('cltopR1 cltopR2 cltopR3 cltopR4 cltopR5 cltopR6 cltopR7 cltopR8 cltopR9 cltopR10 cltopR11 cltopR12 cltopR13 cltopR14 cltopR15 cltopR16 cltopR17');
   speed_all (10);
   advance ('turnback2frontR,1 OFFSET 0,-28');
   move_all ('0,0');

   begin_anim ('climbtopL');
   to_state ('wait');
   frames ('cltopL1 cltopL2 cltopL3 cltopL4 cltopL5 cltopL6 cltopL7 cltopL8 cltopL9 cltopL10 cltopL11 cltopL12 cltopL13 cltopL14 cltopL15 cltopL16 cltopL17');
   speed_all (10);
   advance ('turnback2frontL,1 OFFSET 0,-28');
   move_all ('0,0');

   begin_anim ('climbtopdownR');
   to_state ('climb_down');
   frames ('cltopR17 cltopR16 cltopR15 cltopR14 cltopR13 cltopR12 cltopR11 cltopR10 cltopR9 cltopR8 cltopR7 cltopR6 cltopR5 cltopR4 cltopR3 cltopR2');
   speed_all (10);
   advance ('climbdown,2 OFFSET 0,5');
   move ('0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,0 0,1 0,2 0,0 0,0 0,0 0,0 0,0');

   begin_anim ('climbdown');
   major_state ('climb_down');
   frames ('cl14 cl13 cl12 cl11 cl10 cl9 cl8 cl7 cl6 cl5 cl4 cl3 cl2 cl1');
   speed_all (15);
   move_all ('0,2');
   custom_points ('left_hand', '3,11 6,12 6,10 6,8 6,6 6,4 6,2 6,0 4,1 4,2 3,2 2,4 2,5 2,7');
   custom_points ('right_hand', '21,0 23,1 23,2 24,2 25,4 25,5 25,7 24,11 21,12 21,10 21,8 21,6 21,4 21,2');

   state_trans_key ('RIGHT', 'ALL handright,2');
   state_trans_key ('LEFT', 'ALL handleft,2');
   state_trans_key ('UP', 'climb,1 climb,14 climb,13 climb,12 climb,11 climb,10 climb,9 climb,8 climb,7 climb,6 climb,5 climb,4 climb,3 climb,2');
   state_trans_key ('ONCE DOWN', 'ALL climb2hangstraight,1');
   state_trans_key ('ONCE K5', 'ALL fallshort,1');
   state_trans_key ('ONCE SPACE', 'ALL climbtopL,1');

   begin_anim ('handright');
   major_state ('climb_right');
   frames ('handR1 handR2 handR3 handR4 handR5 handR6 handR7 handR8');
   speed_all (15);
   move ('0,0 0,0 0,0 0,0 1,0 0,0 1,0 1,0');
   custom_points ('left_hand', '3,0 3,0 3,0 3,0 2,0 2,0 2,0 2,0');
   custom_points ('right_hand', '22,0 22,2 24,2 25,0 24,0 24,0 23,0 22,0');

   state_trans_key ('ONCE LEFT', 'handleft,1 --> --> --> --> --> --> -->');
   state_trans_key ('ONCE UP', 'ALL climb,2');
   state_trans_key ('ONCE DOWN', 'ALL climbdown,2');
   state_trans_key ('ONCE SPACE', 'ALL climbtopR,1');
   state_trans_key ('ONCE RETURN', 'ALL hangstraight,1 OFFSET 0,1');
   state_trans_key ('ONCE K5', 'ALL fallshort,1');

   begin_anim ('handleft');
   major_state ('climb_left');
   frames ('handL1 handL2 handL3 handL4 handL5 handL6 handL7 handL8');
   speed_all (15);
   move ('0,0 0,0 0,0 0,0 -1,0 0,0 -1,0 -1,0');
   custom_points ('left_hand', '5,0 5,2 3,2 2,0 3,0 3,0 4,0 5,0');
   custom_points ('right_hand', '24,0 24,0 24,0 24,0 25,0 25,0 25,0 25,0');

   state_trans_key ('ONCE RIGHT', 'handright,1 --> --> --> --> --> --> -->');
   state_trans_key ('ONCE UP', 'ALL climb,9');
   state_trans_key ('ONCE DOWN', 'ALL climbdown,9');
   state_trans_key ('ONCE SPACE', 'ALL climbtopL,1');
   state_trans_key ('ONCE RETURN', 'ALL hangstraight,1 OFFSET 0,1');
   state_trans_key ('ONCE K5', 'ALL fallshort,1');

   begin_anim ('drown');
   major_state ('drown');
   frames ('drown1 drown2 drown3 drown4 drown5 drown6 drown7 drown8');
   speed_all (15);
   move_all ('0,0');

   state_trans_key ('ONCE DOWN', 'ALL drowndown,1');
   begin_anim ('drowndown');
   major_state ('drown_down');
   frames ('drown1 drown2 drown3 drown4 drown5 drown6 drown7 drown8');
   speed_all (15);
   move_all ('0,1');
   overlay ('bubbles');

   state_trans_key ('ONCE SPACE', 'ALL exitover,1');

   begin_anim ('bubbles');
   major_state ('null');
   frames ('bubbles1 bubbles2 bubbles3 bubbles4 bubbles5 bubbles6 bubbles7 bubbles8');
   speed_all (15);
   advance ('bubbles,1');
   move_all ('0,1');

   begin_anim ('TIMEOUTtwist');
   major_state ('timeout_twist');
   frames ('twist1 twist2 twist3 twist4 twist5 twist6 twist7 twist8');
   advance ('wait,1');
   speed ('30 30 40 30 30 30 40 30');
   move_all ('0,0');

   begin_anim ('wait');
   major_state ('wait');
   frames ('wait1');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE LEFT', 'ALL turnL,1');
   state_trans_key ('ONCE RIGHT', 'ALL turnR,1');
   state_trans_key ('ONCE UP', 'ALL turnfront2backR,1');
   state_trans_key ('ONCE SPACE', 'ALL victory,1');
   state_trans_key ('ONCE K1', 'ALL stand2sitL,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlook,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookroundR,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookroundL,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookroundslowR,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookroundslowL,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookR,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookL,1');
   state_trans_key ('ONCE RETURN', 'ALL TIMEOUTlookup,1');
   state_trans_key ('ONCE K3', 'ALL stand2sitR,1');
   state_trans_key ('ONCE SPACE', 'ALL sleep,1');
   state_trans_key ('ONCE K2', 'ALL panicL,1');
   state_trans_key ('ONCE K4', 'ALL panicR,1');
   state_trans_key ('ONCE K7', 'ALL wait2wave,1');
   state_trans_key ('ONCE K9', 'ALL TIMEOUTjiggy,1');
   state_trans_key ('ONCE K9', 'ALL TIMEOUTbooty,1');
   state_trans_key ('ONCE K5', 'ALL TIMEOUTtwist,1');
   state_trans_key ('ONCE DOWN', 'ALL climbtopdownR,1 OFFSET 0,28');

   begin_anim ('sleep');
   major_state ('sleep');
   frames ('sleep1 sleep1 sleep1 sleep1 sleep1 sleep2 sleep2 sleep2 sleep2 sleep2 sleep3 sleep3 sleep3 sleep3 sleep3');
   speed_all (10);
   move_all ('0,0');
   overlay ('zzz');

   state_trans_key ('ONCE SPACE', 'ALL yawn,1');

   begin_anim ('zzz');
   major_state ('null');
   frames ('zzz1 zzz2 zzz3 zzz4 zzz5');
   speed_all (10);
   advance ('zzz,1');
   move_all ('0,0');

   begin_anim ('yawn');
   to_state ('wait');
   frames ('yawn1 yawn2 yawn3 yawn4 yawn5 yawn4 yawn5 yawn6 yawn7 yawn8 yawn9 yawn10 yawn1');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('panicR');
   major_state ('panic_right');
   frames ('panicR1 panicR2 panicR1 panicR2 panicR1 panicR2 panicR1 panicR2 panicR1 panicR2');
   speed_all (15);
   advance ('wait,1');
   move_all ('0,0');

   begin_anim ('panicL');
   major_state ('panic_left');
   frames ('panicL1 panicL2 panicL1 panicL2 panicL1 panicL2 panicL1 panicL2 panicL1 panicL2');
   speed_all (15);
   advance ('wait,1');
   move_all ('0,0');

   begin_anim ('hangL');
   major_state ('hang_lefthand');
   frames ('hangL1 hangL2 hangL3 hangL4 hangL5 hangL6 hangL5 hangL4 hangL3 hangL2');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE UP', '--> --> --> --> --> hangL2climb,1 OFFSET -5,-13 --> --> --> -->');
   state_trans_key ('ONCE LEFT', '--> --> --> --> --> hangL2climbtopL,1 --> --> --> -->');
   state_trans_key ('ONCE RETURN', '--> --> --> --> --> hangL2hangstraight,1 OFFSET -5,-13 --> --> --> -->');
   state_trans_key ('ONCE SPACE', '--> --> --> --> --> --> --> --> --> hangL2swap,1 OFFSET -5,-13');
   state_trans_key ('ONCE DOWN', '--> --> --> --> --> hangL2climbdown,1 --> --> --> -->');
   state_trans_key ('ONCE RIGHT', '--> --> --> --> --> --> --> --> --> hangL2hangR,1');
   state_trans_key ('ONCE K7', 'handleft,1 OFFSET 2,-5 --> --> --> --> --> --> --> --> -->');
   state_trans_key ('ONCE K9', 'handright,1 OFFSET 4,-5 --> --> --> --> --> --> --> --> -->');

   begin_anim ('hangR2climbtopR');
   to_state ('wait');
   frames ('hangrecoverR1 hangrecoverR2 hangrecoverR3 hangrecoverR4 hangrecoverR5 hangrecoverR6 hangrecoverR7 hangrecoverR8');
   advance ('climbtopupR,1 OFFSET -13,-4');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2climbtopL');
   to_state ('wait');
   frames ('hangrecoverL1 hangrecoverL2 hangrecoverL3 hangrecoverL4 hangrecoverL5 hangrecoverL6 hangrecoverL7 hangrecoverL8');
   advance ('climbtopupL,1 OFFSET 1,-4');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangR');
   major_state ('hang_righthand');
   frames ('hangR1 hangR2 hangR3 hangR4 hangR5 hangR6 hangR5 hangR4 hangR3 hangR2');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE UP', '--> --> --> --> --> hangR2climb,1 OFFSET 5,-13 --> --> --> -->');
   state_trans_key ('ONCE RIGHT', '--> --> --> --> --> hangR2climbtopR,1 OFFSET -1,0 --> --> --> -->');
   state_trans_key ('ONCE RETURN', '--> --> --> --> --> hangR2hangstraight,1 OFFSET 5,-13 --> --> --> -->');
   state_trans_key ('ONCE SPACE', '--> --> --> --> --> --> --> --> --> hangR2swap,1 OFFSET 5,-13');
   state_trans_key ('ONCE DOWN', '--> --> --> --> --> hangR2climbdown,1 --> --> --> -->');
   state_trans_key ('ONCE LEFT', '--> --> --> --> --> --> --> --> --> hangR2hangL,1 OFFSET -1,0');
   state_trans_key ('ONCE K7', 'handleft,1 OFFSET -4,-5 --> --> --> --> --> --> --> --> -->');
   state_trans_key ('ONCE K9', 'handright,1 OFFSET -2,-5 --> --> --> --> --> --> --> --> -->');

   begin_anim ('hangR2hangstraight');
   to_state ('hang_twohand');
   frames ('hangrecoverR1 hangrecoverR2 hangrecoverR3 hangrecoverR4 hangrecoverR5 hangrecoverR6 hangrecoverR7 hangrecoverR8');
   advance ('hangstraight,1 OFFSET -8,9');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangR2swap');
   to_state ('hang_lefthand');
   frames ('hangrecoverR7 hangrecoverR8 hangswapL1');
   advance ('hangL,1 OFFSET -11,13');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2swap');
   to_state ('hang_righthand');
   frames ('hangrecoverL7 hangrecoverL8 hangswapR1');
   advance ('hangR,1 OFFSET 11,13');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2hangstraight');
   to_state ('hang_twohand');
   frames ('hangrecoverL1 hangrecoverL2 hangrecoverL3 hangrecoverL4 hangrecoverL5 hangrecoverL6 hangrecoverL7 hangrecoverL8');
   advance ('hangstraight,1 OFFSET 8,9');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2hangR');
   to_state ('hang_righthand');
   frames ('hangrecoverL6 hangrecoverL7 hangrecoverL8 hangrecoverR8 hangrecoverR7 hangrecoverR6');
   advance ('hangR,1 OFFSET 1,0');
   speed_all (10);
   move ('0,0 0,0 0,0 8,0 0,0 0,0');

   begin_anim ('hangR2hangL');
   to_state ('hang_lefthand');
   frames ('hangrecoverR6 hangrecoverR7 hangrecoverR8 hangrecoverL8 hangrecoverL7 hangrecoverL6');
   advance ('hangL,1');
   speed_all (10);
   move ('0,0 0,0 0,0 -8,0 0,0 0,0');

   begin_anim ('hangstraight2hangL');
   to_state ('hang_lefthand');
   frames ('hangrecoverL8 hangrecoverL7');
   advance ('hangL,1 OFFSET 5,13');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangstraight2hangR');
   to_state ('hang_righthand');
   frames ('hangrecoverR8 hangrecoverR7');
   advance ('hangR,1 OFFSET -5,13');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2climb');
   to_state ('climb_up');
   frames ('hangrecoverL1 hangrecoverL2 hangrecoverL3 hangrecoverL4 hangrecoverL5 hangrecoverL6 hangrecoverL7 hangrecoverL8 hangrecoverL9 hangrecoverL10');
   advance ('climb,1 OFFSET 8,6');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangR2climb');
   to_state ('climb_up');
   frames ('hangrecoverR1 hangrecoverR2 hangrecoverR3 hangrecoverR4 hangrecoverR5 hangrecoverR6 hangrecoverR7 hangrecoverR8 hangrecoverR9 hangrecoverR10');
   advance ('climb,7 OFFSET -8,6');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangL2climbdown');
   to_state ('climb_down');
   frames ('hangrecoverL1 hangrecoverL2 hangrecoverL3 hangrecoverL4 hangrecoverL5 hangrecoverL6 hangrecoverL7 hangrecoverL8 hangrecoverL9 hangrecoverL10');
   advance ('climbdown,1 OFFSET 1,-8');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('hangR2climbdown');
   to_state ('climb_down');
   frames ('hangrecoverR1 hangrecoverR2 hangrecoverR3 hangrecoverR4 hangrecoverR5 hangrecoverR6 hangrecoverR7 hangrecoverR8 hangrecoverR9 hangrecoverR10');
   advance ('climbdown,1 OFFSET 1,-8');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('fishwaitR');
   major_state ('timeout_fish_right');
   frames ('fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1');
   speed ('150 10 10 10');
   move_all ('0,0');
   overlay ('fishwaitrodR');

   state_trans_key ('ONCE RETURN', 'ALL fishreelR,1 OFFSET -5,0');
   state_trans_key ('ONCE SPACE', 'ALL fishreelinlineR,1');

   begin_anim ('fishreelinlineR');
   to_state ('wait');
   frames ('fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1');
   speed_all (10);
   advance ('sit2standR,1');
   move_all ('0,0');
   overlay ('fishlineupR');

   begin_anim ('fishreelinlineL');
   to_state ('wait');
   frames ('fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1');
   speed_all (10);
   advance ('sit2standL,1');
   move_all ('0,0');
   overlay ('fishlineupL');

   begin_anim ('fishreelR');
   major_state ('timeout_reel_right');
   frames ('fishreelR1 fishreelR2 fishreelR3 fishreelR4 fishreelR5 fishreelR6 fishreelR7');
   speed_all (10);
   move_all ('0,0');
   custom_points ('45,19 41,11 45,6 42,33 39,34 44,31 42,31');

   state_trans_key ('ONCE LEFT', 'ALL fishwalkR,1 OFFSET 14,0');

   begin_anim ('fishcastR');
   to_state ('timeout_fish_right');
   frames ('fishcastR1 fishcastR2');
   speed_all (10);
   advance ('fishcastlineR,1');
   move_all ('0,0');

   begin_anim ('fishcastlineR');
   to_state ('timeout_fish_right');
   frames ('fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1 fishwaitR1');
   speed_all (10);
   advance ('fishwaitR,1');
   move_all ('0,0');
   overlay ('fishrodlineR');

   begin_anim ('fishcastlineL');
   to_state ('timeout_fish_left');
   frames ('fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1');
   speed_all (10);
   advance ('fishwaitL,1');
   move_all ('0,0');
   overlay ('fishrodlineL');

   begin_anim ('fishcastL');
   to_state ('timeout_fish_left');
   frames ('fishcastL1 fishcastL2');
   speed_all (10);
   advance ('fishcastlineL,1');
   move_all ('0,0');

   begin_anim ('fishwaitrodR');
   major_state ('null');
   frames ('fishwaitrodR1 fishwaitrodR2 fishwaitrodR3 fishwaitrodR4');
   speed ('100 10 10 10');
   advance ('fishwaitrodR,1');
   move_all ('0,0');
   custom_points ('36,9 36,8 36,7 36,1');

   begin_anim ('fishrodlineR');
   major_state ('null');
   frames ('fishwaitrodR1');
   speed_all (10);
   advance ('fishrodlineR,1');
   move_all ('0,0');
   custom_points ('36,9');

   begin_anim ('fishrodlineL');
   major_state ('null');
   frames ('fishwaitrodL1');
   speed_all (10);
   advance ('fishrodlineL,1');
   move_all ('0,0');
   custom_points ('2,9');

   begin_anim ('fishlineupR');
   major_state ('null');
   frames ('fishwaitrodR1');
   speed_all (10);
   advance ('fishlineupR,1');
   move_all ('0,0');
   custom_points ('36,9');

   begin_anim ('fishlineupL');
   major_state ('null');
   frames ('fishwaitrodL1');
   speed_all (10);
   advance ('fishlineupL,1');
   move_all ('0,0');
   custom_points ('2,9');

   begin_anim ('fishwaitrodL');
   major_state ('null');
   frames ('fishwaitrodL1 fishwaitrodL2 fishwaitrodL3 fishwaitrodL4');
   speed ('100 10 10 10');
   advance ('fishwaitrodL,1');
   move_all ('0,0');
   custom_points ('2,9 2,8 2,7 2,1');

   begin_anim ('fishwaitL');
   major_state ('timeout_fish_left');
   frames ('fishwaitL1 fishwaitL1 fishwaitL1 fishwaitL1');
   speed ('0 10 10 10');
   move_all ('0,0');
   overlay ('fishwaitrodL');

   state_trans_key ('ONCE RETURN', 'ALL fishreelL,1 OFFSET 5,0');
   state_trans_key ('ONCE SPACE', 'ALL fishreelinlineL,1');

   begin_anim ('fishreelL');
   major_state ('timeout_reel_left');
   frames ('fishreelL1 fishreelL2 fishreelL3 fishreelL4 fishreelL5 fishreelL6 fishreelL7');
   speed_all (10);
   move_all ('0,0');
   custom_points ('2,19 7,11 2,6 5,33 8,34 3,31 5,31');

   state_trans_key ('ONCE RIGHT', 'ALL fishwalkL,1 OFFSET -14,0');

   begin_anim ('fishwalkR');
   to_state ('wait');
   frames ('fishwalkR1 fishwalkR2 fishwalkR3 fishwalkR4 fishwalkR5 fishwalkR1 fishwalkR2 fishwalkR3 fishwalkR4 fishwalkR5');
   speed_all (10);
   advance ('fishflapR,1');
   move ('0,0 0,0 -5,0 -2,0 -1,0 0,0 0,0 -5,0 -2,0 -1,0');
   custom_points ('42,31 41,32 41,30 41,35 41,33 42,31 41,32 41,30 41,35 41,33');

   begin_anim ('fishflapR');
   to_state ('wait');
   frames ('fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1 fishwalkR1');
   speed ('10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 50');
   advance ('Rturn,1 OFFSET -7,0');
   move_all ('0,0');
   custom_points ('42,31');

   begin_anim ('fishwalkL');
   to_state ('wait');
   frames ('fishwalkL1 fishwalkL2 fishwalkL3 fishwalkL4 fishwalkL5 fishwalkL1 fishwalkL2 fishwalkL3 fishwalkL4 fishwalkL5');
   speed_all (10);
   advance ('fishflapL,1');
   move ('0,0 0,0 5,0 2,0 1,0 0,0 0,0 5,0 2,0 1,0');
   custom_points ('5,31 2,32 2,30 2,35 2,33 5,31 2,32 2,30 2,35 2,33');

   begin_anim ('fishflapL');
   to_state ('wait');
   frames ('fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1 fishwalkL1');
   speed ('10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 10 50');
   advance ('Lturn,1 OFFSET 7,0');
   move_all ('0,0');
   custom_points ('5,31');

   begin_anim ('victory');
   major_state ('victory');
   frames ('vic1 vic2 vic3 vic4 vic5');
   speed_all (15);
   move_all ('0,0');

   state_trans_key ('ONCE UP', '--> --> --> --> exitleap,1');

   begin_anim ('waving');
   major_state ('timeout_wave');
   frames ('waving1 waving2 waving3 waving4 waving5 waving6 waving7 waving6 waving5 waving4 waving3 waving2 waving1 waving2 waving3 waving4 waving5 waving6 waving7 waving6 waving5 waving4 waving3 waving2');
   speed_all (10);
   advance ('wave2wait,1');
   move_all ('0,0');

   begin_anim ('wave2wait');
   to_state ('wait');
   frames ('waving4 waving6 wavetrans1 wavetrans2');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('wait2wave');
   to_state ('timeout_wave');
   frames ('wavetrans2 wavetrans1 waving7 waving6 waving5 waving4 waving3 waving2');
   advance ('waving,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('stand2sitR');
   to_state ('timeout_sit_right');
   frames ('sitdownR1 sitdownR2 sitdownR3');
   advance ('sitR,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('stand2sitL');
   to_state ('timeout_sit_left');
   frames ('sitdownL1 sitdownL2 sitdownL3');
   advance ('sitL,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('sitR');
   major_state ('timeout_sit_right');
   frames ('sitR1 sitR2 sitR3 sitR4 sitR5 sitR6 sitR6 sitR7 sitR8 sitR9 sitR10 sitR11');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE K9', '--> --> --> --> --> --> --> sit2standR,1 --> --> --> -->');
   state_trans_key ('ONCE K5', '--> --> --> --> --> --> --> eatR,1 --> --> --> -->');
   state_trans_key ('ONCE K6', '--> --> --> --> --> --> --> fishcastR,1 --> --> --> -->');

   begin_anim ('sitL');
   major_state ('timeout_sit_left');
   frames ('sitL1 sitL2 sitL3 sitL4 sitL5 sitL6 sitL6 sitL7 sitL8 sitL9 sitL10 sitL11');
   speed_all (10);
   move_all ('0,0');

   state_trans_key ('ONCE K7', '--> --> --> --> --> --> --> sit2standL,1 --> --> --> -->');
   state_trans_key ('ONCE K5', '--> --> --> --> --> --> --> eatL,1 --> --> --> -->');
   state_trans_key ('ONCE K4', '--> --> --> --> --> --> --> fishcastL,1 --> --> --> -->');

   begin_anim ('sit2standR');
   to_state ('wait');
   frames ('standR1 standR2 standR3 standR4 standR5');
   advance ('turnback2frontwithwalkL,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('sit2standL');
   to_state ('wait');
   frames ('standL1 standL2 standL3 standL4 standL5');
   advance ('turnback2frontwithwalkR,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('eatR');
   major_state ('timeout_eat_right');
   frames ('eatR3 eatR2 eatR3 eatR2 eatR3 eatR2 eatR3 eatR4 eatR1 eatR1 eatR1 eatR1 eatR1 eatR1 eatR1 eatR1 eatR1 eatR1 eatR6 eatR7 eatR6 eatR7 eatR6 eatR7');
   advance ('sitR,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('eatL');
   major_state ('timeout_eat_left');
   frames ('eatL3 eatL2 eatL3 eatL2 eatL3 eatL2 eatL3 eatL4 eatL1 eatL1 eatL1 eatL1 eatL1 eatL1 eatL1 eatL1 eatL1 eatL1 eatL6 eatL7 eatL6 eatL7 eatL6 eatL7');
   advance ('sitL,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlook');
   major_state ('timeout_look1');
   frames ('look1 look1 look1 look2 look2 look3 look4 look5 look6 look7 look7 look8 look8 look9 look9 look11 look11 look12 look12 look12 look12 look11 look11 look9 look9 look10 look9 look10 look9 look8 look8 look7 look7 look13 look13 look2 look2 look1 look1');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookroundR');
   // quick look round RIGHT
   major_state ('timeout_look2');
   frames ('look1 look1 look1 look2 look2 look3 look4 look5 look6 look7 look7 lookup1 lookup1 lookup3 lookup3 lookup6 lookup6 look12 look26 look26 look15 look15 look14 look14');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookroundslowR');
   // slow look round RIGHT
   major_state ('timeout_look3');
   frames ('look1 look1 look1 look2 look2 look3 look4 look5 look6 look7 look7 lookup1 lookup1 lookup1 lookup1 lookup1 lookup1 lookup1 lookup1 lookup3 lookup3 lookup3 lookup3 lookup3 lookup3 lookup3 lookup3 lookup6 lookup6 lookup6 lookup6 lookup6 lookup6 lookup6 look12 look26 look26 look15 look15 look14 look14');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookroundslowL');
   // slow look round LEFT
   major_state ('timeout_look4');
   frames ('look14 look14 look14 look15 look16 look16 look17 look18 look19 look20 look20 lookup6 lookup6 lookup6 lookup6 lookup6 lookup6 lookup3 lookup3 lookup3 lookup3 lookup3 lookup3 lookup1 lookup1 lookup1 lookup1 lookup1 lookup1 look25 look13 look13 look2 look2 look1 look1');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookroundL');
   // quick look round LEFT
   major_state ('timeout_look5');
   frames ('look14 look14 look14 look15 look16 look16 look17 look18 look19 look20 look20 lookup6 lookup6 lookup3 lookup3 lookup1 lookup1 look25 look13 look13 look2 look2 look1 look1');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookR');
   // looking right
   major_state ('timeout_look6');
   frames ('look1 look1 look1 look2 look2 look3 look4 look5 look6 look7 look7 look7 look7 look7 look7 look7 look7 look7 look7 look7 look7 look13 look13 look2 look2 look1 look1');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookL');
   // looking left
   major_state ('timeout_look7');
   frames ('look14 look14 look14 look15 look15 look16 look17 look18 look19 look20 look20 look20 look20 look20 look20 look20 look20 look20 look20 look20 look20 look26 look26 look15 look15 look14 look14');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTlookup');
   // look up at the blocks
   major_state ('timeout_look8');
   frames ('look1 look1 look1 look2 look2 look3 look4 look5 look6 look7 look7 lookup2 lookup2 lookup4 lookup4 lookup4 lookup4 lookup4 lookup4 lookup4 lookup4 lookup1 look7 look13 look13 look2 look2 look1 look1');
   advance ('wait,1');
   speed_all (15);
   move_all ('0,0');

   begin_anim ('TIMEOUTjiggy');
   major_state ('timeout_jiggy');
   frames ('jiggy1 jiggy2 jiggy3 jiggy2 jiggy3 jiggy2 jiggy1 jiggy4 jiggy5 jiggy4 jiggy5 jiggy4 jiggy1 jiggy2 jiggy3 jiggy2 jiggy3 jiggy2 jiggy1 jiggy4 jiggy5 jiggy4 jiggy5 jiggy4');
   advance ('wait,1');
   speed_all (20);
   move_all ('0,0');

   begin_anim ('TIMEOUTbooty');
   major_state ('timeout_booty');
   frames ('booty1 booty2 booty3 booty2 booty3 booty2 booty1 booty4 booty5 booty4 booty5 booty4');
   advance ('turnback2frontR,1');
   speed_all (20);
   move_all ('0,0');

   begin_anim ('turnR');
   to_state ('walk_right');
   frames ('turn1 turn2 turn3');
   advance ('right,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('turnL');
   to_state ('walk_left');
   frames ('turn1 turn8 turn7');
   advance ('left,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('Rturn');
   to_state ('wait');
   frames ('turn3 turn2 turn1');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('Lturn');
   to_state ('wait');
   frames ('turn7 turn8 turn1');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('Rturn2climb');
   to_state ('climb_up');
   frames ('turn3 turn4 turn5 clt1 clt2 clt3');
   advance ('climb,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('Lturn2climb');
   to_state ('climb_up');
   frames ('turn7 turn6 turn5 clt1 clt2 clt3');
   advance ('climb,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('climb2turnR');
   to_state ('walk_right');
   frames ('turn5 turn4 turn3');
   advance ('right,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('climb2turnL');
   to_state ('walk_left');
   frames ('turn5 turn6 turn7');
   advance ('left,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('turnback2frontR');
   to_state ('wait');
   frames ('turn5 turn4 turn3 turn2 turn1');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('turnback2frontL');
   to_state ('wait');
   frames ('turn5 turn6 turn7 turn8 turn1');
   advance ('wait,1');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('turnfront2backR');
   to_state ('climb_up');
   frames ('turn1 turn2 turn3 turn4 turn5 clt1 clt2 clt3');
   advance ('climb,1 OFFSET 0,2');
   speed_all (10);
   move_all ('0,0');

   begin_anim ('turnback2frontwithwalkL');
   to_state ('wait');
   frames ('turn5 turn6 turn7 L1 L2 L3 turn8');
   advance ('wait,1');
   speed_all (10);
   move ('0,0 0,0 0,0 -2,0 -2,0 -2,0 0,0');

   begin_anim ('turnback2frontwithwalkR');
   to_state ('wait');
   frames ('turn5 turn4 turn3 R1 R2 R3 turn2');
   advance ('wait,1');
   speed_all (10);
   move ('0,0 0,0 0,0 2,0 2,0 2,0 0,0');

   begin_anim ('knockspin');
   major_state ('knock');
   frames ('fallspin10 fallspin9 fallspin8 fallspin7 fallspin6 fallspin5 fallspin4 fallspin3 fallspin2 fallspin1');
   speed_all (5);
   move_all ('0,0');

   state_trans_key ('ONCE RETURN', 'fallspin,1 fallspin,2 fallspin,3 fallspin,4 fallspin,5 fallspin,6 fallspin,7 fallspin,8 fallspin,9 fallspin,10');

   // End the last animation
   begin_anim (null);
};
