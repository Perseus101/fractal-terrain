import { Drawable } from "./drawable";
import { Shader } from "../shaders/shader";
import { BufferSet } from "./buffer_set";

export class RedSquare extends Drawable {
    buffers: BufferSet;

    constructor(gl: WebGLRenderingContext) {
        super(gl);

        let vertices = [
            [ 0.0, 0.0, 1.0 ],
            [ 0.0, 1.0, 1.0 ],
            [ 1.0, 1.0, 1.0 ],
            [ 1.0, 0.0, 1.0 ],
        ];

        let normals = [
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
        ];

        let triangles =  [
            [ 0, 1, 2 ],
            [ 2, 3, 0 ],
        ];

        this.buffers = new BufferSet(gl, vertices, normals, triangles);
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.buffers.draw(gl, shader);
    }
}