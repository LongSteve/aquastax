'use strict';

aq.spritey.objects.Image = aq.spritey.objects.ScriptObject.extend ({
   _type: 'Image',

   // Script data
   name: null,
   filename: null,
   center: null,
   mirror: false,
   // Runtime data
   image: null,
   anchor: cc.p (-1,-1),
   image_table_index: 0,
   palette: null,

   ctor: function (name, filename, options_string) {
      this.name = name;
      this.filename = filename;

      try {
         options_string = options_string || '';
         options_string = options_string.toLowerCase ();

         // translate the image options string into object properties
         if (options_string.indexOf ('mirror') !== -1) {
            this.mirror = true;
         }

         if (options_string.indexOf ('centre') !== -1) {
            this.center = cc.p (0,0);
            var re = /.*centre\s?(-?\d+)\s?,\s?(-?\d+).*/;
            var m = options_string.match (re);
            if (m && m.length >= 3) {
               this.center.x = parseInt (m [1]);
               this.center.y = parseInt (m [2]);
            } else {
               cc.log ('Unexpected "CENTRE" option specified for a Image: ' + options_string);
            }
         }

         //cc.log ('Parsed Image Options: "' + options_string + '", mirror=' + this.mirror + ' centre:' + this.center.x + ',' + this.center.y);
      } catch (ex) {
         cc.log ('Exception parsing image options string: ' + options_string);
      }

      return this;
   },

   description: function () {
      return this._type+': name='+this.name+' filename="'+this.filename+'"';
   }
});

