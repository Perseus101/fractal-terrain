import { Shader } from "../shaders/shader";

export abstract class Drawable {
    constructor(gl: WebGLRenderingContext) {
    }

    abstract draw(gl: WebGLRenderingContext, shader: Shader): void;
}
