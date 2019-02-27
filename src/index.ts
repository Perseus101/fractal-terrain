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

    // Add event listeners
    setupCallbacks(camera, canvas);

    render(gl, shader, environment, camera);
}

function setupCallbacks(camera: Camera, canvas: HTMLElement) {
    document.addEventListener('keydown', (ev: KeyboardEvent) => camera.keyDown(ev), false);
    document.addEventListener('keyup', (ev: KeyboardEvent) => camera.keyUp(ev), false);

    canvas.addEventListener('mousedown', (ev: MouseEvent) => {
        let el = ev.target as any;
        el.requestPointerLock = el.requestPointerLock ||
                                el.mozRequestPointerLock ||
                                el.webkitRequestPointerLock;

        el.requestPointerLock();
    }, false);

    let mouseCallback = (ev: MouseEvent) => {
        camera.mouseInput(ev);
    }

    let changeCallback = () => {
        let el = document as any;
        if (el.pointerLockElement === canvas ||
            el.mozPointerLockElement === canvas ||
            el.webkitPointerLockElement === canvas) {
            // Pointer locked
            document.addEventListener('mousemove', mouseCallback, false);
        }
        else {
            // Pointer unlocked
            document.removeEventListener("mousemove", mouseCallback, false);
        }
    }

    document.addEventListener('pointerlockchange', changeCallback, false);
    document.addEventListener('mozpointerlockchange', changeCallback, false);
    document.addEventListener('webkitpointerlockchange', changeCallback, false);
}

function onReady(fn: Function) {
    if (document.readyState != 'loading'){
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', (fn as any));
    }
}

onReady(main);