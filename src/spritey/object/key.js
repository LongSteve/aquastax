
'use strict';

aq.spritey.objects.Key = aq.spritey.objects.ScriptObject.extend ({
   _type: 'key',

   name: null,
   once: false,
   transitions: null,

   ctor: function (n) {
      this.name = n;
      this.transitions = [];
      return this;
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

//    //self.durationLabel.text = [NSString stringWithFormat:@"Duration: %@", [[AppDelegate instance].hopsterAPI stringFromTimeInSeconds:[video duration]]];
    // @onimitch: Commented out because the loading indicator dissapea
