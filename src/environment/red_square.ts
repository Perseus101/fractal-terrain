import { Environment } from "./environment";

export class RedSquare extends Environment {
    constructor(gl: WebGLRenderingContext) {
        super(gl);

        this.vertices = [
            [ 0.0, 0.0, 1.0 ],
            [ 0.0, 1.0, 1.0 ],
            [ 1.0, 1.0, 1.0 ],
            [ 1.0, 0.0, 1.0 ],
        ];

        this.normals = [
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
            [ 0.0, 0.0, -1.0 ],
        ];

        this.triangles =  [
            [ 0, 1, 2 ],
            [ 2, 3, 0 ],
        ];

        this.triangleCount = this.triangles.length;

        this.createBuffers(gl);
    }
}