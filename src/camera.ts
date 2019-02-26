import { vec3, mat4 } from 'gl-matrix';
import { Shader } from './shaders/shader';

export class Camera {
    delta: number;
    rotDelta: number;
    directions: any;

    eye: vec3;
    center: vec3;
    up: vec3;

    rotation: mat4;
    translation: mat4;

    view: mat4;
    perspective: mat4;

    constructor(eye: vec3, center: vec3, up: vec3, delta: number = 0.05, rotDelta: number = 0.001) {
        this.eye = eye;
        this.center = center;
        this.up = up;
        this.delta = delta;
        this.rotDelta = rotDelta;
        this.directions = {
            forward: false,
            backward: false,
            left: false,
            right: false
        }

        var hMatrix = mat4.create(); // handedness matrix
        var pMatrix = mat4.create(); // projection matrix
        var vMatrix = mat4.create(); // view matrix

        mat4.fromScaling(hMatrix, vec3.fromValues(-1, 1, 1)); // create handedness matrix
        mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
        mat4.lookAt(vMatrix, this.eye, this.center, this.up); // create view matrix

        this.translation = mat4.create();
        this.rotation = mat4.create();

        this.view = mat4.create();
        this.perspective = mat4.create();
        mat4.multiply(this.perspective, hMatrix, pMatrix); // handedness * projection
        mat4.multiply(this.view, this.view, vMatrix); // handedness * projection * view
    }

    feed(gl: WebGLRenderingContext, shader: Shader) {
        // Update movement delta
        this.updateMovement();

        let hpvMatrix = mat4.create();
        mat4.multiply(hpvMatrix, this.translation, this.view);
        mat4.multiply(hpvMatrix, this.rotation, hpvMatrix);
        mat4.multiply(hpvMatrix, this.perspective, hpvMatrix);
        gl.uniformMatrix4fv(shader.pvmMatrixULoc, false, hpvMatrix);
        // TODO Eye
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
        this.rotateY(-movementX * this.rotDelta);
        this.rotateX(movementY * this.rotDelta);
    }

    updateMovement() {
        if(this.directions.left) {
            this.translate(vec3.fromValues(-this.delta, 0, 0));
        }

        if(this.directions.right) {
            this.translate(vec3.fromValues(this.delta, 0, 0));
        }

        if(this.directions.forward) {
            this.translate(vec3.fromValues(0, 0, this.delta));
        }

        if(this.directions.backward) {
            this.translate(vec3.fromValues(0, 0, -this.delta));
        }
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
    }

    /**
     * Translate the camera in the current orientation
     * @param {vec3} delta the direction to move relative to
     *                      the camera's current orientation
     */
    translate(delta: vec3) {
        var translate = mat4.create();
        mat4.fromTranslation(translate, delta);

        mat4.multiply(this.translation, translate, this.translation);
    }

    /**
     * Rotate the camera around the Y axis
     * @param {number} delta the rotation delta in radians
     */
    rotateY(delta: number) {
        var rotate = mat4.create();
        mat4.fromYRotation(rotate, delta);

        mat4.multiply(this.translation, rotate, this.translation);
    }

    /**
     * Rotate the camera around the X axis
     * @param {number} delta the rotation delta in radians
     */
    rotateX(delta: number) {
        var rotate = mat4.create();
        mat4.fromXRotation(rotate, delta);

        mat4.multiply(this.rotation, rotate, this.rotation);
    }
}
