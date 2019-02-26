import { vec3 } from 'gl-matrix';

import { setupWebGL } from './setupWebGL';
import { createShader, Shader } from './shaders/shader';
import { Environment } from './environment/environment';
import { Camera } from './camera';

function render(gl: WebGLRenderingContext, shader: Shader, environment: Environment, camera: Camera) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    camera.feed(gl, shader);
    environment.draw(gl, shader);

    requestAnimationFrame(() => render(gl, shader, environment, camera)); // set up frame render callback
}

function main() {
    let canvas = document.createElement("canvas");
    canvas.height = 512;
    canvas.width = 512;
    document.querySelector("body").appendChild(canvas);
    let gl = setupWebGL(canvas);
    let shader = createShader(gl);
    let environment = new Environment(gl);
    let camera = new Camera(
        vec3.fromValues(0.5, 0.5, -0.5), // Eye
        vec3.fromValues(0.5, 0.5, 0.5), // Center
        vec3.fromValues(0, 1, 0) // Up
    );
    document.addEventListener('keydown', (ev: KeyboardEvent) => camera.keyboardInput(ev));
    render(gl, shader, environment, camera);
}

function onReady(fn: Function) {
    if (document.readyState != 'loading'){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', (fn as any));
    }
}

onReady(main);