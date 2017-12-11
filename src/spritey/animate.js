'use strict';

/**
 * Extends cc.Animate to allow setting specific
 * indexed frames
 * @class
 * @extends cc.Animate
 * @param {cc.Animation} animation
 * @param {Number} starting frame
 * @example
 * // create the animation with animation starting at frame 5
 * var anim = new aq.Animate(dance_grey, 5);
 */

aq.spritey.Animate = cc.Animate.extend(/** @lends aq.Animate# */{

   _firstFrame: 0,

    /**
     * Constructor function. <br />
     * create the animate with animation.
     * @param {cc.Animation} animation
     * @param {frame} frame index (starting at 0)
     */
    ctor: function (animation, frame) {
       this._super (animation);

       if (!frame) {
          frame = 0;
       }
       this._firstFrame = frame;
    },

    startWithTarget:function (target) {

        // Take into account the delta time past the current frame start
        let t = this._elapsed / (this._duration > 0.0000001192092896 ? this._duration : 0.0000001192092896);
        let dt = t - this._splitTimes [this._currFrameIndex];

        // Trigger the new animation
        cc.ActionInterval.prototype.startWithTarget.call(this, target);
        if (this._animation.getRestoreOriginalFrame()) {
            this._origFrame = target.displayFrame();
        }

        // Update the animation values to correspond with the new start frame
        this._nextFrame = this._firstFrame % this._splitTimes.length;
        this._elapsed = ((this._splitTimes [this._nextFrame] + dt) * this._duration);
        this._executedLoops = 0;

        if (this._firstFrame !== 0) {
           this._firstTick = false;
           this._firstFrame = 0;
        }
    },

    // This is a copy of the cc.Animate.update method, but with the value of _currFrameIndex stored
    // as a this. member variable.
    // TODO: Make Issue/PR against Cocos2d-x GitHub repo to fix this
    update: function (dt) {
        dt = this._computeEaseTime(dt);
        // if t==1, ignore. Animation should finish with t==1
        if (dt < 1.0) {
            dt *= this._animation.getLoops();

            // new loop?  If so, reset frame counter
            let loopNumber = 0 | dt;
            if (loopNumber > this._executedLoops) {
                this._nextFrame = 0;
                this._executedLoops++;
            }

            // new t for animations
            dt = dt % 1.0;
        }

        let frames = this._animation.getFrames();
        let numberOfFrames = frames.length, locSplitTimes = this._splitTimes;

        for (let i = this._nextFrame; i < numberOfFrames; i++) {
            if (locSplitTimes[i] <= dt) {
                if (this._currFrameIndex !== i) {
                   // This should prevent the double move when advancing an animation, but I'm not sure it does?
                   this._currFrameIndex = i;
                   this.target.setSpriteFrame(frames[this._currFrameIndex].getSpriteFrame());
                   this._nextFrame = i + 1;
                   break;
                }
            } else {
                // Issue 1438. Could be more than one frame per tick, due to low frame rate or frame delta < 1/FPS
                break;
            }
        }
    }

});

aq.spritey.animate = function (animation, frame) {
    return new aq.spritey.Animate(animation, frame);
};

aq.spritey.Animate.create = aq.spritey.animate;
