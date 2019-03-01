import { vec3, mat4 } from 'gl-matrix';
import { Shader } from './shaders/shader';

export class Camera {
    delta: number;
    rotDelta: number;
    directions: any;
    flashLight: boolean;

    eye: vec3;
    center: vec3;
    lookAt: vec3;
    up: vec3;
    sun: vec3;
    origin: vec3;

    perspective: mat4;

    constructor(eye: vec3, center: vec3, up: vec3, delta: number = 0.005, rotDelta: number = 0.005) {
        this.eye = eye;
        this.center = center;
        this.lookAt = vec3.create();
        vec3.subtract(this.lookAt, center, eye);
        this.up = up;
        this.sun = vec3.clone(up);
        this.origin = vec3.fromValues(0,0,0);
        this.delta = delta;
        this.rotDelta = rotDelta;
        this.directions = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            up: false,
            down: false,
        }

        this.flashLight = false;

        var hMatrix = mat4.create(); // handedness matrix
        var pMatrix = mat4.create(); // projection matrix

        mat4.fromScaling(hMatrix, vec3.fromValues(-1, 1, 1)); // create handedness matrix
        mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.001, 10); // create projection matrix

        this.perspective = mat4.create();
        mat4.multiply(this.perspective, hMatrix, pMatrix); // handedness * projection
    }

    feed(gl: WebGLRenderingContext, shader: Shader) {
        // Update movement delta
        this.updateMovement();

        let hpvMatrix = mat4.create();
        mat4.lookAt(hpvMatrix, this.eye, this.center, this.up); // create view matrix

        // rotate the sun around the world
        vec3.rotateX(this.sun, this.sun, this.origin, 0.001);
        gl.uniform3fv(shader.sunDirectionULoc, this.sun);

        mat4.multiply(hpvMatrix, this.perspective, hpvMatrix);
        gl.uniformMatrix4fv(shader.pvmMatrixULoc, false, hpvMatrix);
        gl.uniform3fv(shader.eyePositionULoc, this.eye); // pass in the eye's location
        gl.uniform3fv(shader.lookAtULoc, this.lookAt);
        gl.uniform1f(shader.flashLightOnULoc, this.flashLight ? 1.0 : 0.0);
    }

    mouseInput(ev: MouseEvent) {
        let e = ev as any;
        let movementX = e.movementX ||
                e.mozMovementX      ||
                e.webkitMovementX   ||
                0;
        let movementY = e.movementY ||
                e.mozMovementY      ||
                e.webkitMovementY   ||
                0;

        var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
        lookAt = vec3.normalize(lookAt, vec3.subtract(temp, this.center, this.eye)); // get lookat vector
        viewRight = vec3.normalize(viewRight, vec3.cross(temp, [0, 1, 0], lookAt)); // get view right vector

        // Modify center
        vec3.add(this.center, this.center, vec3.scale(temp, viewRight, movementX * this.rotDelta));
        vec3.add(this.center, this.center, vec3.scale(temp, this.up, -movementY * this.rotDelta));
        //vec3.normalize(this.center, this.center);

        // Correct up according the new center
        lookAt = vec3.normalize(lookAt, vec3.subtract(temp, this.center, this.eye)); // get lookat vector
        vec3.add(this.center, this.eye, lookAt); //reset center to be unit distance away
        vec3.cross(this.up, lookAt, viewRight);
        // this.rotateY(-movementX * this.rotDelta);
        // this.rotateX(movementY * this.rotDelta);
        this.lookAt = lookAt;
    }

    updateMovement() {
        var lookAt = vec3.create(), viewRight = vec3.create(), temp = vec3.create(); // lookat, right & temp vectors
        lookAt = vec3.normalize(lookAt, vec3.subtract(temp, this.center, this.eye)); // get lookat vector
        viewRight = vec3.normalize(viewRight, vec3.cross(temp, this.up, lookAt)); // get view right vector

        let delta = vec3.create();

        if(this.directions.left) {
            vec3.add(delta, vec3.scale(temp, viewRight, -this.delta), delta);
        }

        if(this.directions.right) {
            vec3.add(delta, vec3.scale(temp, viewRight, this.delta), delta);
        }

        if(this.directions.forward) {
            vec3.add(delta, vec3.scale(temp, lookAt, this.delta), delta);
        }

        if(this.directions.backward) {
            vec3.add(delta, vec3.scale(temp, lookAt, -this.delta), delta);
        }

        if(this.directions.up) {
            vec3.add(delta, vec3.scale(temp, [0, 1, 0], this.delta), delta);
        }

        if(this.directions.down) {
            vec3.add(delta, vec3.scale(temp, [0, 1, 0], -this.delta), delta);
        }

        vec3.add(this.eye, delta, this.eye);
        vec3.add(this.center, delta, this.center);
    }

    keyDown(event: KeyboardEvent) {
        // PRESS LEFT ARROW OR 'A' KEY
        if (event.keyCode == 37 || event.keyCode == 65 ) {
            this.directions.left = true;
        }
        // PRESS RIGHT ARROW OR 'D' KEY
        else if (event.keyCode == 39 || event.keyCode == 68 ) {
            this.directions.right = true;
        }
        // PRESS UP ARROW OR 'W' KEY
        else if (event.keyCode == 38 || event.keyCode == 87 ) {
            this.directions.forward = true;
        }
        // PRESS DOWN ARROW OR 'S' KEY
        else if (event.keyCode == 40 || event.keyCode == 83 ) {
            this.directions.backward = true;
        }
        // SPACEBAR
        else if (event.keyCode == 32) {
            this.directions.up = true;
        }
        // LEFT SHIFT
        else if (event.keyCode == 16) {
            this.directions.down = true;
        }
        // F OR T FOR FLASHLIGHT
        else if (event.keyCode == 70 || event.keyCode == 84) {
            this.flashLight = !this.flashLight;
        }
    }

    keyUp(event: KeyboardEvent) {
        // PRESS LEFT ARROW OR 'A' KEY
        if (event.keyCode == 37 || event.keyCode == 65 ) {
            this.directions.left = false;
        }
        // PRESS RIGHT ARROW OR 'D' KEY
        else if (event.keyCode == 39 || event.keyCode == 68 ) {
            this.directions.right = false;
        }
        // PRESS UP ARROW OR 'W' KEY
        else if (event.keyCode == 38 || event.keyCode == 87 ) {
            this.directions.forward = false;
        }
        // PRESS DOWN ARROW OR 'S' KEY
        else if (event.keyCode == 40 || event.keyCode == 83 ) {
            this.directions.backward = false;
        }
        // SPACEBAR
        else if (event.keyCode == 32) {
            this.directions.up = false;
        }
        // LEFT SHIFT
        else if (event.keyCode == 16) {
            this.directions.down = false;
        }
    }
}
