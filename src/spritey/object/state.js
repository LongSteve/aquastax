'use strict';

aq.spritey.objects.State = aq.spritey.objects.ScriptObject.extend ({
   _type: 'State',

   name: null,

   ctor: function (name) {
      this.name = name;
      return this;
   },

   description: function () {
      return this._type+': name='+this.name;
   }
});
