import { Shader } from "../shaders/shader";

export abstract class Environment {
    constructor(gl: WebGLRenderingContext) {
    }

    abstract draw(gl: WebGLRenderingContext, shader: Shader): void;
}
