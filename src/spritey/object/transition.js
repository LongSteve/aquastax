'use strict';

aq.spritey.objects.Transition = aq.spritey.objects.ScriptObject.extend ({
   _type: 'Transition',

   // transition to anim name
   name: null,

   // transition to anim object
   to_anim: null,

   // Objects are used to store the numeric frame, xoff and yoff values 
   // in order to check for their existence
   _frame: null,
   _xoff: null,
   _yoff: null,

   ctor: function (n) {
      if (n !== null) {
         if (typeof n === 'string') {
            this.name = n;
         } else if (typeof n === 'object') {
            this.name = n.anim_name;
            this._frame = n.anim_frame;
            if (typeof n.xoff !== 'undefined' ) {
               this._xoff = n.xoff;
               this._yoff = n.yoff;
            }
         }
      }
      return this;
   },

   getFrame: function () {
      if (this._frame === null) {
         return 0;
      }
      return this._frame;
   },

   setFrame: function (f) {
      this._frame = parseInt (f);
   },

   getOffsetX: function () {
      if (this._xoff === null) {
         return 0;
      }
      return this._xoff;
   },

   setOffsetX: function (n) {
      this._xoff = parseInt (n);
   },

   getOffsetY: function () {
      if (this._yoff === null) {
         return 0;
      }
      return this._yoff;
   },

   setOffsetY: function (n) {
      this._yoff = parseInt (n);
   },

   description: function () {
      var offset = '';
      if (this._xoff !== null && this._yoff !== null) {
         offset = ' offset '+this.xoff+','+this.yoff;
      }

      var tmp_string = '';

      if (this.name === null && this._frame === null) {
         tmp_string = '-->';
      } else {
         tmp_string = this.name+':'+this.frame + offset;
      }
       
      return this._type+': ='+tmp_string;
   }
});

(function defineTransitionProperties () {
   var _p = aq.spritey.objects.Transition.prototype;
   cc.defineGetterSetter(_p, 'frame', _p.getFrame, _p.setFrame);
   cc.defineGetterSetter(_p, 'xoff', _p.getOffsetX, _p.setOffsetX);
   cc.defineGetterSetter(_p, 'yoff', _p.getOffsetY, _p.setOffsetY);
})();
