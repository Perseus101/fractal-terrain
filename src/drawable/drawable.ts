import { Shader } from "../shaders/shader";

export interface Drawable {
    draw(gl: WebGLRenderingContext, shader: Shader): void;
}
