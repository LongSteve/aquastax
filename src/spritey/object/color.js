'use strict';

aq.spritey.objects.Color = aq.spritey.objects.ScriptObject.extend ({
   _type: 'Color',

   color: null,

   ctor: function (r, g, b) {
      this.color = cc.color (r, g, b);
      return this;
   },

   description: function () {
      return this._type+': r='+this.color.r+' g='+this.color.g+' b='+this.color.b;
   }
});

aq.spritey.objects.KeyColor = aq.spritey.objects.Color.extend ({
   _type: 'KeyColor'
});

aq.spritey.objects.BackgroundColor = aq.spritey.objects.Color.extend ({
   _type: 'BackgroundColor'
});

