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

           self._renderCmd.rendering = function(ctx){
              // Draw the node
              var canvas = ctx.getContext ();
              canvas.save ();

              // Save the canvas transform.  Setting to identity puts the rectangle at 0,0 (top left)
              //var savedTransform = canvas.currentTransform;
              //canvas.setTransform(1,0,0,1,0,0);

              canvas.fillStyle = "#0000FF";
              canvas.fillRect (0,0,aq.config.BLOCK_SIZE, aq.config.BLOCK_SIZE);
              canvas.restore ();

              //canvas.currentTransform = savedTransform;
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

