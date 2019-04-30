import { vec3 } from 'gl-matrix';

import { setupWebGL } from './setupWebGL';
import { createShader, Shader } from './shaders/shader';
import { Environment } from './drawable/environment';
import { Patch, FractalNode, Quadrant } from './drawable/fractal';
import { Camera } from './camera';
import RNG from './rng';

function render(gl: WebGLRenderingContext, shader: Shader, environment: Environment, camera: Camera) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    camera.feed(gl, shader, environment);
    (environment as FractalNode).expandAndPruneTree(camera.getPlayerPosition());
    environment.draw(gl, shader);

    requestAnimationFrame(() => render(gl, shader, environment, camera)); // set up frame render callback
}

function main() {
    let canvas: any = document.getElementById("canvas");
    let gl = setupWebGL(canvas);
    let shader = createShader(gl);
    let size = 2.5;
    let patch = new Patch(
        vec3.fromValues(-size, 0, -size),
        vec3.fromValues(size, 0, -size),
        vec3.fromValues(-size, 0, size),
        vec3.fromValues(size, 0, size),
        new RNG(Math.random())
    );
    let environment = new FractalNode(gl, patch, 0, 3, true).recurse();
    environment.becomeNewRoot(Quadrant.Bl);
    (window as any).env = environment; //TODO: remove, for debugging only
    let camera = new Camera(
        gl,
        vec3.fromValues(0.5, 0.5, -0.5), // Eye
        vec3.fromValues(0.5, 0.5, 0.5), // Center
        vec3.fromValues(0, 1, 0) // Up
    );

    // Add event listeners
    setupCallbacks(gl, camera, canvas);

    render(gl, shader, environment, camera);
}

function setupCallbacks(gl: WebGLRenderingContext, camera: Camera, canvas: HTMLElement) {
    function onResize() {
        let realToCSSPixels = window.devicePixelRatio;

        // Lookup the size the browser is displaying the canvas in CSS pixels
        // and compute a size needed to make our drawingbuffer match it in
        // device pixels.
        let displayWidth = Math.floor(gl.canvas.clientWidth * realToCSSPixels);
        let displayHeight = Math.floor(gl.canvas.clientHeight * realToCSSPixels);

        // Check if the canvas is not the same size.
        if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
            // Make the canvas the same size
            gl.canvas.width = displayWidth;
            gl.canvas.height = displayHeight;
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            camera.createPerspective(gl);
        }
    }

    window.addEventListener("resize", onResize);
    onResize();

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
