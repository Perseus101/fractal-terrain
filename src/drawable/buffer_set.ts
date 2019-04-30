import { Shader } from "../shaders/shader";

export class BufferSet {
    vertexBuffer: WebGLBuffer;
    normalBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
    triangleCount: number;

    constructor(gl: WebGLRenderingContext, vertices: any[], normals: any[], colors: any[], triangles: any[]) {
        let flatTriangles = (triangles as any).flat();
        this.triangleCount = flatTriangles.length;

        this.vertexBuffer = gl.createBuffer(); // init empty webgl set vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((vertices as any).flat()), gl.STATIC_DRAW); // data in

        this.normalBuffer = gl.createBuffer(); // init empty webgl set normal component buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((normals as any).flat()), gl.STATIC_DRAW); // data in

        this.colorBuffer = gl.createBuffer(); // init empty webgl set normal component buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array((colors as any).flat()), gl.STATIC_DRAW); // data in


        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(flatTriangles), gl.STATIC_DRAW); // data in
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate vertex buffer
        gl.vertexAttribPointer(shader.vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate normal buffer
        gl.vertexAttribPointer(shader.vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer); // activate normal buffer
        gl.vertexAttribPointer(shader.vColorAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate index buffer
        gl.drawElements(gl.TRIANGLES, this.triangleCount, gl.UNSIGNED_SHORT, 0); // render
    }
}

export class BufferSetBuilder {
    public vertices: any[] = [];
    public normals: any[] = [];
    public colors: any[] = [];
    public triangles: any[] = [];

    build(gl: WebGLRenderingContext): BufferSet {
        return new BufferSet(gl, this.vertices, this.normals, this.colors, this.triangles);
    }
}