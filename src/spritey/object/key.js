
'use strict';

aq.spritey.objects.Key = aq.spritey.objects.ScriptObject.extend ({
   _type: 'Key',

   name: null,
   once: false,
   all: false,
   transitions: null,

   ctor: function (n) {
      this.name = n;
      this.transitions = [];
      return this;
   },

   keyCode: function () {
      var self = this;

      var mapping = {
         'return': cc.KEY.enter,
         'k0': cc.KEY [0],
         'k1': cc.KEY [1],
         'k2': cc.KEY [2],
         'k3': cc.KEY [3],
         'k4': cc.KEY [4],
         'k5': cc.KEY [5],
         'k6': cc.KEY [6],
         'k7': cc.KEY [7],
         'k8': cc.KEY [8],
         'k9': cc.KEY [9]
      };

      var tmp = self.name.toLowerCase ();

      if (typeof cc.KEY [tmp] !== 'undefined') {
         return cc.KEY [tmp];
      } else if (typeof mapping [tmp] !== 'undefined') {
         return mapping [tmp];
      }

      aq.fatalError ('Unknown key: ' + self.name);

      return cc.KEY.none;
   },

   description: function () {
      var tmp_string = '';

      for (var i = 0; i < this.transitions.length; i++) {
         tmp_string += this.transitions [i].description ();
         if (i < this.transitions.length - 1) {
            tmp_string += ' ';
         }
      }
      return this._type + (this.once ? '(once)' : '') + ':' + this.name + ' ' + tmp_string;
   }
});
