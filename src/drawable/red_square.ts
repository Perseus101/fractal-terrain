import { Drawable } from "./drawable";
import { Shader } from "../shaders/shader";
import { BufferSet } from "./buffer_set";

export class RedSquare implements Drawable {
    buffers: BufferSet;

    constructor(gl: WebGLRenderingContext) {
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

        let colors = [
            [ 1.0, 1.0, 1.0 ],
            [ 1.0, 1.0, 1.0 ],
            [ 1.0, 1.0, 1.0 ],
            [ 1.0, 1.0, 1.0 ],
        ];

        let triangles =  [
            [ 0, 1, 2 ],
            [ 2, 3, 0 ],
        ];

        this.buffers = new BufferSet(gl, vertices, normals, colors, triangles);
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.buffers.draw(gl, shader);
    }
}