aq.TestNode = cc.Node.extend(/** @lends cc.DrawNode# */{
});

(function(){

   if (cc._renderType === cc.game.RENDER_TYPE_CANVAS) {

       cc.extend(aq.TestNode.prototype, {
           _className:"TestNodeCanvas",

           ctor: function () {
               cc.Node.prototype.ctor.call(this);
               this.init();
           },

           _createRenderCmd: function () {
               return new aq.TestNode.CanvasRenderCmd(this);
           }
       });
   } else if (cc._renderType === cc.game.RENDER_TYPE_WEBGL) {

      cc.extend(cc.DrawNode.prototype, {
          _squareVertexPositionBuffer:null,
          _squareVertexColorBuffer:null,

          _className:"TestNodeWebGL",

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

    aq.TestNode.CanvasRenderCmd = function(renderableObject){
        cc.Node.CanvasRenderCmd.call(this, renderableObject);
        this._needDraw = true;
    };

    aq.TestNode.CanvasRenderCmd.prototype = Object.create(cc.Node.CanvasRenderCmd.prototype);
    aq.TestNode.CanvasRenderCmd.prototype.constructor = aq.TestNode.CanvasRenderCmd;

    cc.extend( aq.TestNode.CanvasRenderCmd.prototype, {
        rendering: function (ctx, scaleX, scaleY) {
            var wrapper = ctx || cc._renderContext, context = wrapper.getContext(), node = this._node;
            var alpha = node._displayedOpacity / 255;
            if (alpha === 0)
                return;

            wrapper.setTransform(this._worldTransform, scaleX, scaleY);

            context.save ();
            context.fillStyle = "#00FF00";

            var nx = node.x;
            var ny = node.y;
            var nh = node.height;
            var nw = node.width;

            //context.fillRect (nx,-(ny + nh),nw, nh);

            // TODO: Figure put how the coordinates map from Cocos2d-JS nodes to html5 canvas.

            // Test out where I think the position of the node should be by drawing a dot
            context.beginPath();
            context.arc(nx, -(ny + nh), 5 , 0, Math.PI * 2, false);
            context.closePath();
            context.fill();

            //context.fillRect (0, 0, nw, nh);
            //context.fillRect (0,-(ny + nh),nw, nh);

            // line code taken from CCDrawNode, which does work, and draws the polygon/rect in the correct place.
            /*
            context.lineWidth = 3 * scaleX;
            context.beginPath();
            context.moveTo (node.x , -node.y);
            context.lineTo (node.x + aq.config.BLOCK_SIZE, -node.y);
            context.lineTo (node.x + aq.config.BLOCK_SIZE, -(node.y + aq.config.BLOCK_SIZE));
            context.lineTo (node.x, -(node.y + aq.config.BLOCK_SIZE));

            context.closePath();
            //context.fill();
            context.stroke();
            */

            context.restore ();
        }
    });
})();



/*
aq.TestNode = cc.Node.extend({
    ctor:function(){
        this._super();
        this.init();
    },
    init:function(){
        var self = this;
        self._renderCmd._needDraw = true;
        self._renderCmd._matrix = new cc.math.Matrix4();
        self._renderCmd._matrix.identity();

        if (cc._renderType === cc.game.RENDER_TYPE_CANVAS) {

           self._renderCmd.rendering = function(ctx, scaleX, scaleY){

              var wrapper = ctx || cc._renderContext, context = wrapper.getContext(), node = this._node;

              wrapper.setTransform(this._worldTransform, scaleX, scaleY);

              context.fillStyle = "#0000FF";
              context.fillRect (node.x,-node.y,aq.config.BLOCK_SIZE, aq.config.BLOCK_SIZE);
           }
        } else {
           // WebGL Support Code
           self.initBuffers ();
           self._renderCmd.rendering = function(ctx){
               var wt = this._worldTransform;
               this._matrix.mat[0] = wt.a;
               this._matrix.mat[4] = wt.c;
               this._matrix.mat[12] = wt.tx;
               this._matrix.mat[1] = wt.b;
               this._matrix.mat[5] = wt.d;
               this._matrix.mat[13] = wt.ty;

               // At the moment, the rectangle is drawn at the place of the falling block, when I was
               // expecting it to be 0,0 relative to the parent node.  Something to fix later...

               cc.kmGLMatrixMode(cc.KM_GL_MODELVIEW);
               cc.kmGLPushMatrix();
               cc.kmGLLoadMatrix(this._matrix);

               gl.enableVertexAttribArray(cc.VERTEX_ATTRIB_COLOR);
               gl.enableVertexAttribArray(cc.VERTEX_ATTRIB_POSITION);

               // Draw fullscreen Square
               gl.bindBuffer(gl.ARRAY_BUFFER, self.squareVertexPositionBuffer);
               gl.vertexAttribPointer(cc.VERTEX_ATTRIB_POSITION, 2, gl.FLOAT, false, 0, 0);

               gl.bindBuffer(gl.ARRAY_BUFFER, self.squareVertexColorBuffer);
               gl.vertexAttribPointer(cc.VERTEX_ATTRIB_COLOR, 4, gl.FLOAT, false, 0, 0);

               gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

               gl.bindBuffer(gl.ARRAY_BUFFER, null);

               cc.kmGLPopMatrix();
            }
        };
    },
    initBuffers:function() {
        //
        // Square
        //
        var squareVertexPositionBuffer = this.squareVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
        vertices = [
            aq.config.BLOCK_SIZE,  aq.config.BLOCK_SIZE,
            0,                     aq.config.BLOCK_SIZE,
            aq.config.BLOCK_SIZE,  0,
            0,                     0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        var squareVertexColorBuffer = this.squareVertexColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexColorBuffer);
        colors = [
            0.0, 0.0, 1.0, 1.0,
            0.0, 0.0, 1.0, 1.0,
            0.0, 0.0, 1.0, 1.0,
            0.0, 0.0, 1.0, 1.0
        ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
});
*/
