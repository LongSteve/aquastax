'use strict';

aq.spritey.objects = aq.spritey.objects || {};

aq.spritey.objects.ScriptObject = cc.Class.extend ({
   _type: 'ScriptObject',

   type: function () {
      return this._type;
   },

   description: function () {
      return this._type;
   }
});
