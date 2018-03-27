'use strict';

aq.spritey.objects.Anim = aq.spritey.objects.ScriptObject.extend ({
   _type: 'Anim',

   // Script data
   name: null,
   frames: null,
   speeds: null,
   advance: null,
   moves: null,
   custom_points: null,

   // each key contains a list of transitions
   keys: null,

   major_state: null,
   to_state: null,
   overlay: null,

   // Runtime data
   ms: 0,
   anim: null,
   isOverlay: false,

   ctor: function (name) {
      this.name = name;
      this.frames = [];
      this.speeds = [];
      this.moves = [];
      this.keys = [];
      this.custom_points = {};
      return this;
   },

   description: function () {
      var listToString = function (l) {
          if (!l) {
             return '[]';
          }
          var str = '[';
          for (var i = 0; i < l.length; i++) {
             var v = l [i];
             var s = v.name || v;
             str += s + (i < l.length - 1 ? ' ' : '');
          }
          str += ']';
          return str;
       };

      return this._type + ': name=' + this.name +
         '\nOverlay:' + this.overlay +
         '\nFrames:' + listToString (this.frames) +
         '\nSpeeds:' + listToString (this.speeds) +
         '\nMoves:' + listToString (this.moves) +
         '\nCustomPoints:' + listToString (this.custom_points ['default']) +
         '\nKeys:' + listToString (this.keys) +
         '\nAdvance:' + (this.advance && this.advance.name) || 'null' +
         '\nMajorState:' + this.major_state + ' ToState:' + this.to_state + ' Overlay:' + this.overlay;
   }
});
