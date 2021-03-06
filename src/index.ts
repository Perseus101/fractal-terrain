import { vec3, mat4 } from 'gl-matrix';

import { setupWebGL } from './setupWebGL';
import { createShader, Shader } from './shaders/shader';
import { Environment } from './drawable/environment';
import { Patch, FractalNode, Flora, Quadrant } from './drawable/fractal';
import { Camera } from './camera';
import RNG from './rng';

import Biome from './biome/biome';
import { BiomeContainer } from './biome/container';

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

    let biomes = new BiomeContainer([
        new Biome(vec3.fromValues(0.4, 0.4, 0.4), 900, 0.9995),
        new Biome(vec3.fromValues(0.2, 1, 0.2), 50, 0.99),
        new Biome(vec3.fromValues(0.8, 0.8, 0.1), 25, 1.01)
    ]);

    Flora.treeModel = require('./assets/tree.json');
    Flora.rMatrix = mat4.create();
    let angle = Math.PI*1.5;
    Flora.rMatrix[5] = Math.cos(angle);
    Flora.rMatrix[6] = Math.sin(angle);
    Flora.rMatrix[9] = -1 * Math.sin(angle);
    Flora.rMatrix[10] = Math.cos(angle);

    let size = 5 * Math.pow(2, 10);
    let patch = new Patch(
        vec3.fromValues(-size, 0, -size),
        vec3.fromValues(size, 0, -size),
        vec3.fromValues(-size, 0, size),
        vec3.fromValues(size, 0, size),
        new RNG(Math.random()),
        biomes
    );
    let policies = {
        policyList: [
            { from: undefined, to: 25, bufferAt: 12 },
            { from: 25, to: 200, bufferAt: -100 },
            { from: 200, to: undefined, bufferAt: undefined }, //undefined indicates it should despawn at this distance
        ],
        newNodeCutoff: 250
    };
    let environment = new FractalNode(gl, patch, 0, policies, undefined)
    environment.expandAndPruneTree(vec3.fromValues(0, 0, 0));
    // environment.becomeNewRoot(Quadrant.Bl);
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
