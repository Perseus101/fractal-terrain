import { Shader } from "../shaders/shader";
import { mat4 } from "gl-matrix";

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
        gl.uniformMatrix4fv(shader.mMatrixULoc, false, mat4.create());
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

export class ModelBufferSet extends BufferSet {
    public transforms: mat4[];
    constructor(gl: WebGLRenderingContext, model: any) {
        super(gl,
            model.vertices,
            model.normals,
            ModelBufferSet.treeColor(70, model.vertices.length),
            model.triangles);
        this.transforms = [];
    }

    static treeColor(leafCutoff: number, l: number): number[] {
        let colors = [];
        for(let i = 0; i < leafCutoff; i++) {
            colors.push(0.75, 0.5, 0.25);
        }
        for(let i = leafCutoff; i < l; i++) {
            colors.push(0.3, 0.8, 0.25);
        }
        return colors;
    }

    static defaultColor(l: number): number[] {
        let colors = [];
        for(let i = 0; i < l; i++) {
            colors.push(0.8, 0.5, 0.25);
        }
        return colors;
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        if (this.transforms.length == 0)
            return;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); // activate vertex buffer
        gl.vertexAttribPointer(shader.vPosAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer); // activate normal buffer
        gl.vertexAttribPointer(shader.vNormAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer); // activate index buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer); // activate normal buffer
        gl.vertexAttribPointer(shader.vColorAttribLoc, 3, gl.FLOAT, false, 0, 0); // feed

        for (let transform of this.transforms) {
            gl.uniformMatrix4fv(shader.mMatrixULoc, false, transform);
            let hpvTrans = mat4.create();
            mat4.multiply(hpvTrans, shader.pvmMatrix, transform);
            gl.uniformMatrix4fv(shader.pvmMatrixULoc, false, hpvTrans);
            gl.drawElements(gl.TRIANGLES, this.triangleCount, gl.UNSIGNED_SHORT, 0); // render
        }
        gl.uniformMatrix4fv(shader.mMatrixULoc, false, mat4.create());
        gl.uniformMatrix4fv(shader.pvmMatrixULoc, false, shader.pvmMatrix);
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