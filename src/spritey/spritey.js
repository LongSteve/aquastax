'use strict';

aq.spritey = aq.spritey || {};

aq.spritey.object_list = [];

aq.spritey.dump = function () {
   var image_count = 0;
   var object_list = aq.spritey.object_list;
   for (var o in object_list) {
      if (object_list [o]) {
         var object = object_list [o];
         // Not sure I like this, but it's a shortcoming of the simple class/object structure I adopted
         if (object._name === 'Image') {
            image_count++;
         } else {
            cc.log (o + ' : ' + object.description ());
         }
      }
   }
   cc.log ('Total Images : ' + image_count);
};

