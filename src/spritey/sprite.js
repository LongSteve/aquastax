'use strict';

var SPRITEY_ALPHA = 255;

/**
 * <p>
 *     A custom cc.Sprite subclass with AquaStax functionality.
 * </p>
 * @class
 * @extends cc.Sprite
 */
aq.spritey.Sprite = cc.Sprite.extend(/** @lends aq.spritey.Sprite# */{
   debugRect: null,
   ctor: function () {
      var self = this;

      self._super ();

      if (aq.config.SPRITEY_DEBUG) {
         self.debugRect = new cc.DrawNode ();
         self.addChild (self.debugRect);
      }

      if (SPRITEY_ALPHA !== 255) {
         self.setOpacity (SPRITEY_ALPHA);
      }
   },

   _updateDebugRects: function () {
       var self = this;

       if (!self.debugRect) {
          return;
       }

       let size = self.getContentSize ();
       self.debugRect.clear ();
       self.debugRect.drawRect (cc.p (0,0), cc.p (size.width, size.height),
                                         null, // fillcolor
                                         1,    // line width
                                         cc.color (128,128,0,SPRITEY_ALPHA));

       let app = self.getAnchorPointInPoints ();
       self.debugRect.drawRect (app, cc.p (app.x + 1, app.y + 1), cc.color (255,0,0,SPRITEY_ALPHA), 1, cc.color (255,0,0,SPRITEY_ALPHA));
   },

   /**
    * Override from cc.Sprite.setSpriteFrame.
    * Moves the sprite based on the new frame data, when the frame
    * is set.
    *
    * @override
    */
   setSpriteFrame: function (newFrame) {
       this._setSpriteFrame (newFrame, true);
   },

   /**
    * Custom setSpriteFrame method that determines the frame index
    * of the given frame, and optionally moves the sprite, since
    * movement is tied to frames in the Spritey system.
    */
   _setSpriteFrame: function (newFrame, movement) {
      if (!newFrame) {
         return;
      }

      let spriteFrame = newFrame;
      if (newFrame instanceof cc.AnimationFrame) {
         spriteFrame = newFrame.getSpriteFrame ();
      }

      if (!spriteFrame) {
         return;
      }

      if (typeof spriteFrame.flippedX !== 'undefined') {
         this.setFlippedX (spriteFrame.flippedX);
      } else {
         this.setFlippedX (false);
      }

      // Determine the sprite frame index. This is a bit brute force, it could be optimised
      let userData = this.getUserData ();
      let frames = userData.animation.getFrames ();
      for (let index = 0; index < frames.length; index++) {
         if (newFrame === frames [index].getSpriteFrame ()) {
            userData.frameIndex = index;
            break;
         }
      }

      cc.Sprite.prototype.setSpriteFrame.call (this, newFrame);

      // Need to update the sprite anchor based on the frame centre
      this.setFrameAnchor ();

      // Move the sprite if necessary
      if (movement) {
         this.move ();
      }
   },

   /**
    * Custom method to set the frame of the sprite, from the
    * animation name, frame index, and optional movement based
    * on the frame.
    */
   setDisplayFrameWithFrameIndex: function (animationName, frameIndex, movement) {
       var cache = cc.animationCache.getAnimation (animationName);
       if (!cache){
           cc.log (cc._LogInfos.Sprite_setDisplayFrameWithAnimationName);
           return;
       }
       var animFrame = cache.getFrames () [frameIndex];
       if (!animFrame){
           cc.log (cc._LogInfos.Sprite_setDisplayFrameWithAnimationName_2);
           return;
       }
       this._setSpriteFrame(animFrame.getSpriteFrame (), movement);
   },

   _getPointForFrame: function (anim_array_name, index) {
       let cp = cc.p (0, 0);
       let userData = this.getUserData ();
       let points = userData.anim [anim_array_name];

       if (!points || points.length === 0) {
          return null;
       }

       if (typeof index === 'undefined') {
          index = userData.frameIndex;
       }

       if (points.length === 1) {
          cp = cc.p (points [0].x, points [0].y);
       } else if (typeof points [index] !== 'undefined') {
          cp = cc.p (points [index].x, points [index].y);
       }

       return cp;
   },

   /**
    * Getter for frame specific mirror (horizontal flip) status
    */
   getMirrorForFrame: function (index) {
       let userData = this.getUserData ();
       if (typeof index === 'undefined') {
          index = userData.frameIndex;
       }

       let image = userData.anim.frames [userData.frameIndex];
       return image.mirror;
   },

   /**
    * Getter for frame specific custom point data
    */
   getCustomPointForFrame: function (index) {
       return this._getPointForFrame ('custom_points', index);
   },

   /**
    * Getter for frame specific movement data
    */
   getMoveForFrame: function (index) {
       return this._getPointForFrame ('moves', index);
   },

   /**
    * Move the sprite, based on it's current frame, or with a given
    * offset delta.
    */
   move: function (offset) {

       let delta = cc.p (0, 0);
       let scale = this.getScale ();
       let position = this.getPosition ();

       // Optional offset, used on animation transitions
       if (offset) {
          delta.x += offset.x;
          delta.y += offset.y;
       } else {
          delta = this.getMoveForFrame ();
       }

       if (delta.x !== 0 || delta.y !== 0) {
          delta.x *= scale;
          delta.y *= scale;
          position.x += delta.x;
          position.y -= delta.y;
          this.setPosition (position);
       }
   },

   /**
    * Set the anchor point of the sprite based on the current frame
    */
   setFrameAnchor: function () {
       let userData = this.getUserData ();
       let image = userData.anim.frames [userData.frameIndex];
       if (image.center) {
          let cc_sprite_frame = cc.spriteFrameCache.getSpriteFrame (image.filename);
          let size = cc_sprite_frame.getOriginalSizeInPixels ();
          let cx = image.center.x;
          let cy = image.center.y;
          let ax = (size.width === 0) ? 0 : cx / size.width;
          let ay = (size.height === 0) ? 0 : 1.0 - (cy / size.height);
          if (image.mirror) {
             ax = 1.0 - ax;
          }
          this.setAnchorPoint (ax, ay);
       } else {
          this.setAnchorPoint (0.5, 0.0);
       }
   }
});
