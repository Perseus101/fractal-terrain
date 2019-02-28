import { Shader } from "../shaders/shader";

export abstract class Environment {
    vertexBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;

    vertices: any[] = [];
    normals: any[] = [];
    triangles: any[] = [];
    triangleCount = 0;

    constructor(gl: WebGLRenderingContext) {
    }

    createBuffers(gl: WebGLRenderingContext) {
        this.vertexBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((this.vertices as any).flat()), gl.STATIC_DRAW); // data in

        this.normalBuffer = gl.createBuffer(); // init empty webgl set normal component buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((this.normals as any).flat()), gl.STATIC_DRAW); // data in

        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array((this.triangles as any).flat()), gl.DYNAMIC_DRAW); // data in
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate vertex buffer
        gl.vertexAttribPointer(shader.vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate normal buffer
        gl.vertexAttribPointer(shader.vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate index buffer
        gl.drawElements(gl.TRIANGLES, 3 * this.triangleCount, gl.UNSIGNED_SHORT, 0); // render
    }
}