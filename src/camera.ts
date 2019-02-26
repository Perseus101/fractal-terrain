import { vec3, mat4 } from 'gl-matrix';
import { Shader } from './shaders/shader';

export class Camera {
    delta: number;

    eye: vec3;
    center: vec3;
    up: vec3;

    transform: mat4;
    perspective: mat4;

    constructor(eye: vec3, center: vec3, up: vec3, delta: number = 0.1) {
        this.eye = eye;
        this.center = center;
        this.up = up;
        this.delta = delta;

        var hMatrix = mat4.create(); // handedness matrix
        var pMatrix = mat4.create(); // projection matrix
        var vMatrix = mat4.create(); // view matrix

        mat4.fromScaling(hMatrix, vec3.fromValues(-1, 1, 1)); // create handedness matrix
        mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
        mat4.lookAt(vMatrix, this.eye, this.center, this.up); // create view matrix

        this.transform = mat4.create();
        this.perspective = mat4.create();
        mat4.multiply(this.perspective, hMatrix, pMatrix); // handedness * projection
        mat4.multiply(this.transform, this.transform, vMatrix); // handedness * projection * view
    }

    feed(gl: WebGLRenderingContext, shader: Shader) {
        let hpvMatrix = mat4.create();
        mat4.multiply(hpvMatrix, this.perspective, this.transform);
        gl.uniformMatrix4fv(shader.pvmMatrixULoc, false, hpvMatrix);
        // TODO Eye
    }

    keyboardInput(event: KeyboardEvent) {
        // PRESS LEFT ARROW OR 'A' KEY
        if (event.keyCode == 37 || event.keyCode == 65 ) {
            this.translate(vec3.fromValues(-this.delta, 0, 0));
        }
        // PRESS RIGHT ARROW OR 'D' KEY
        else if (event.keyCode == 39 || event.keyCode == 68 ) {
            this.translate(vec3.fromValues(this.delta, 0, 0));
        }
        // PRESS UP ARROW OR 'W' KEY
        else if (event.keyCode == 38 || event.keyCode == 87 ) {
            this.translate(vec3.fromValues(0, 0, this.delta));
        }
        // PRESS DOWN ARROW OR 'S' KEY
        else if (event.keyCode == 40 || event.keyCode == 83 ) {
            this.translate(vec3.fromValues(0, 0, -this.delta));
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
        // Rotate the translation into the current frame of reference
        // Add the new translation
        mat4.multiply(this.transform, translate, this.transform);
    }

    /**
     * Rotate the camera around the Y axis
     * @param {number} delta the rotation delta in radians
     */
    rotateY(delta: number) {
        var rotate = mat4.create();
        mat4.fromYRotation(rotate, delta);

        mat4.multiply(this.transform, rotate, this.transform);
    }

    /**
     * Rotate the camera around the X axis
     * @param {number} delta the rotation delta in radians
     */
    rotateX(delta: number) {
        var rotate = mat4.create();
        mat4.fromXRotation(rotate, delta);

        mat4.multiply(this.transform, rotate, this.transform);
    }
}
