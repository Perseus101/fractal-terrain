
/**
 * @param {HTMLElement} canvas HTML Canvas element
 */
export function setupWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext {
    let gl = canvas.getContext("webgl"); // get a webgl object from it
    if (gl == null) {
        throw "unable to create gl context";
    }
    else {
        gl.clearColor(0.3, 0.56, 0.68, 1.0); // use black when we clear the frame buffer
        // SKY: #4D8FAC
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // enable depth test
    }

    return gl;
}