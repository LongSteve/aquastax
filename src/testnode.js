'use strict';

//
// TestNode is a custom node, that uses both HTML5 Canvas and WebGL render commands.
// It was written to investigate the new rendering of Cocos2d-JS v3, and mostly
// borrows from (but simplifies) CCDrawNode.  It just draws a square!
//

aq.TestNode = cc.Node.extend({
});

(function(){

   if (cc._renderType === cc.game.RENDER_TYPE_CANVAS) {

       cc.extend(aq.TestNode.prototype, {
           _className:'TestNodeCanvas',

           ctor: function () {
               cc.Node.prototype.ctor.call(this);
               this.init();
           },

           _createRenderCmd: function () {
               return new aq.TestNode.CanvasRenderCmd(this);
           }
       });
   } else if (cc._renderType === cc.game.RENDER_TYPE_WEBGL) {

      cc.extend(aq.TestNode.prototype, {
          _squareVertexPositionBuffer:null,
          _squareVertexColorBuffer:null,

          _className:'TestNodeWebGL',

          ctor:function () {
              cc.Node.prototype.ctor.call(this);
              this.init();
          },

          init:function () {
              if (cc.Node.prototype.init.call(this)) {
                  this.shaderProgram = cc.shaderCache.programForKey(cc.SHADER_POSITION_LENGTHTEXTURECOLOR);
                  return true;
              }
              return false;
          },

          _createRenderCmd: function () {
              return new aq.TestNode.WebGLRenderCmd(this);
          }

      });
   }

   //
   // CanvasRenderCmd
   //

   aq.TestNode.CanvasRenderCmd = function(renderableObject){
      cc.Node.CanvasRenderCmd.call(this, renderableObject);
      this._needDraw = true;
   };

   aq.TestNode.CanvasRenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype);
   aq.TestNode.CanvasRenderCmd.prototype.constructor = aq.TestNode.CanvasRenderCmd;

   cc.extend( aq.TestNode.CanvasRenderCmd.prototype, {
      rendering: function (ctx, scaleX, scaleY) {
         var wrapper = ctx || cc._renderContext, context = wrapper.getContext(), node = this._node;
         var alpha = this._displayedOpacity / 255;
         if (alpha === 0) {
            return;
         }

         // What this does is set the canvas transform so that 0,0 is the node.x,node.y position.
         // Width and height units are in node unit space, but with inverted y.
         // To draw a bounding box, you simply needs to draw a rect from 0,0 to node.width,-node.height
         wrapper.setTransform(this._worldTransform, scaleX, scaleY);
         wrapper.setGlobalAlpha(alpha);

         context.save ();

         context.fillStyle = '#00FF00';   // green

         context.fillRect (0, 0, node.width, -node.height);

         context.restore ();
      }
   });

   //
   // WebGLRenderCmd
   //
   aq.TestNode.WebGLRenderCmd = function (renderableObject) {
       cc.Node.WebGLRenderCmd.call(this, renderableObject);
       this._needDraw = true;
       this._matrix = new cc.math.Matrix4();
       this._matrix.identity();

       // Define the buffers
       var squareVertexPositionBuffer = this._squareVertexPositionBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
       var vertices = [
           aq.config.BLOCK_SIZE,  aq.config.BLOCK_SIZE,
           0,                     aq.config.BLOCK_SIZE,
           aq.config.BLOCK_SIZE,  0,
           0,                     0
       ];
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

       var squareVertexColorBuffer = this._squareVertexColorBuffer = gl.createBuffer();
       gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
       var colors = [
           0.0, 1.0, 0.0, 1.0,
           0.0, 1.0, 0.0, 1.0,
           0.0, 1.0, 0.0, 1.0,
           0.0, 1.0, 0.0, 1.0
       ];
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
       gl.bindBuffer(gl.ARRAY_BUFFER, null);
   };

   aq.TestNode.WebGLRenderCmd.prototype = Object.create(cc.Node.WebGLRenderCmd.prototype);
   aq.TestNode.WebGLRenderCmd.prototype.constructor = aq.TestNode.WebGLRenderCmd;

   cc.extend( aq.TestNode.WebGLRenderCmd.prototype, {
      rendering: function (ctx, scaleX, scaleY) {
         var wt = this._worldTransform;
         this._matrix.mat[0] = wt.a;
         this._matrix.mat[4] = wt.c;
         this._matrix.mat[12] = wt.tx;
         this._matrix.mat[1] = wt.b;
         this._matrix.mat[5] = wt.d;
         this._matrix.mat[13] = wt.ty;

         this._shaderProgram.use();
         this._shaderProgram._setUniformForMVPMatrixWithMat4(this._matrix);

         cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
         cc.kmGLPushMatrix();
         cc.kmGLLoadMatrix(this._matrix);

         gl.enableVertexAttribArray(cc.VERTEX_ATTRIB_COLOR);
         gl.enableVertexAttribArray(cc.VERTEX_ATTRIB_POSITION);

         // Draw fullscreen Square
         gl.bindBuffer(gl.ARRAY_BUFFER, this._squareVertexPositionBuffer);
         gl.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0);

         gl.bindBuffer(gl.ARRAY_BUFFER, this._squareVertexColorBuffer);
         gl.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, gl.FLOAT, false, 0, 0);

         gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

         gl.bindBuffer(gl.ARRAY_BUFFER, null);

         cc.kmGLPopMatrix();
      }
   });

})();
