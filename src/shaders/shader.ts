import { vec3, mat4 } from 'gl-matrix';

export class Shader {
    gl: WebGLRenderingContext;
    vertexShader: WebGLShader;
    fragmentShader: WebGLShader;
    shaderProgram: WebGLProgram;

    public vPosAttribLoc: number;
    public vNormAttribLoc: number;
    public vColorAttribLoc: number;

    public diffuseULoc: WebGLUniformLocation;

    public mMatrixULoc: WebGLUniformLocation;
    public pvmMatrixULoc: WebGLUniformLocation;
    public pvmMatrix: mat4;

    public eyePositionULoc: WebGLUniformLocation;
    public lookAtULoc: WebGLUniformLocation;
    public sunDirectionULoc: WebGLUniformLocation;
    public flashLightOnULoc: WebGLUniformLocation;

    constructor(gl: WebGLRenderingContext,
            fShaderCode: string,
            vShaderCode: string) {
        this.gl = gl;
        this.fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(this.fragmentShader, fShaderCode);
        gl.compileShader(this.fragmentShader);

        this.vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vertexShader, vShaderCode);
        gl.compileShader(this.vertexShader);

        if (!gl.getShaderParameter(this.fragmentShader, gl.COMPILE_STATUS)) {
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(this.fragmentShader);
        }
        else if (!gl.getShaderParameter(this.vertexShader, gl.COMPILE_STATUS)) {
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(this.vertexShader);
        }

        this.shaderProgram = gl.createProgram();
        gl.attachShader(this.shaderProgram, this.fragmentShader);
        gl.attachShader(this.shaderProgram, this.vertexShader);
        gl.linkProgram(this.shaderProgram);

        if (!gl.getProgramParameter(this.shaderProgram, gl.LINK_STATUS)) { // bad program link
            throw "error during shader program linking: " + gl.getProgramInfoLog(this.shaderProgram);
        }

        gl.useProgram(this.shaderProgram);

        // locate and enable vertex attributes
        this.vPosAttribLoc = gl.getAttribLocation(this.shaderProgram, "aVertexPosition"); // ptr to vertex pos attrib
        gl.enableVertexAttribArray(this.vPosAttribLoc); // connect attrib to array
        this.vNormAttribLoc = gl.getAttribLocation(this.shaderProgram, "aVertexNormal"); // ptr to vertex normal attrib
        gl.enableVertexAttribArray(this.vNormAttribLoc); // connect attrib to array
        this.vColorAttribLoc = gl.getAttribLocation(this.shaderProgram, "aVertexColor"); // ptr to vertex normal attrib
        gl.enableVertexAttribArray(this.vColorAttribLoc); // connect attrib to array

        // locate vertex uniforms
        this.mMatrixULoc = gl.getUniformLocation(this.shaderProgram, "umMatrix"); // ptr to mmat
        this.pvmMatrixULoc = gl.getUniformLocation(this.shaderProgram, "upvmMatrix"); // ptr to pvmmat

        // locate fragment uniforms
        this.eyePositionULoc = gl.getUniformLocation(this.shaderProgram, "uEyePosition"); // ptr to eye position
        this.lookAtULoc = gl.getUniformLocation(this.shaderProgram, "uLookAt"); // ptr to lookAt vector
        this.flashLightOnULoc = gl.getUniformLocation(this.shaderProgram, "uFlashLightOn"); // ptr to toggle flashLight conditional
        let sunAmbientULoc = gl.getUniformLocation(this.shaderProgram, "uSunAmbient"); // ptr to light ambient
        let sunSpecularULoc = gl.getUniformLocation(this.shaderProgram, "uSunSpecular"); // ptr to light specular
        let moonAmbientULoc = gl.getUniformLocation(this.shaderProgram, "uMoonAmbient"); // ptr to light ambient
        let moonDiffuseULoc = gl.getUniformLocation(this.shaderProgram, "uMoonDiffuse"); // ptr to light diffuse
        let moonSpecularULoc = gl.getUniformLocation(this.shaderProgram, "uMoonSpecular"); // ptr to light specular
        this.sunDirectionULoc = gl.getUniformLocation(this.shaderProgram, "uSunDirection"); // ptr to sun direction
        let ambientULoc = gl.getUniformLocation(this.shaderProgram, "uAmbient"); // ptr to ambient
        this.diffuseULoc = gl.getUniformLocation(this.shaderProgram, "uDiffuse"); // ptr to diffuse
        let specularULoc = gl.getUniformLocation(this.shaderProgram, "uSpecular"); // ptr to specular
        let shininessULoc = gl.getUniformLocation(this.shaderProgram, "uShininess"); // ptr to shininess

        // Pass in default values for uniforms
        // var sunDirection = vec3.fromValues(0,1,0);

        var sunAmbient = vec3.fromValues(1, 1, 1); // default light ambient emission
        var sunSpecular = vec3.fromValues(1, 1, 1); // default light specular emission

        var moonAmbient = vec3.fromValues(1, 1, 1); // default light ambient emission
        var moonDiffuse = vec3.fromValues(0.16, 0.18, 0.23); // default light diffuse emission
        var moonSpecular = vec3.fromValues(1, 1, 1); // default light specular emission

        var ambient = vec3.fromValues(0, 0, 0); // default ambient emission
        var diffuse = vec3.fromValues(0.6, 0.6, 0.6); // default diffuse emission
        var specular = vec3.fromValues(0.1, 0.1, 0.1); // default specular emission
        var shininess = 11; // specular exponent

        // var hMatrix = mat4.create(); // handedness matrix
        // var pMatrix = mat4.create(); // projection matrix
        // var vMatrix = mat4.create(); // view matrix
        // var mMatrix = mat4.create(); // model matrix
        // var hpvMatrix = mat4.create(); // hand * proj * view matrices
        // var hpvmMatrix = mat4.create(); // hand * proj * view * model matrices

        // mat4.fromScaling(hMatrix, vec3.fromValues(-1, 1, 1)); // create handedness matrix
        // mat4.perspective(pMatrix, 0.5 * Math.PI, 1, 0.1, 10); // create projection matrix
        // mat4.lookAt(vMatrix, eye, center, up); // create view matrix
        // mat4.multiply(hpvMatrix, hMatrix, pMatrix); // handedness * projection
        // mat4.multiply(hpvMatrix, hpvMatrix, vMatrix); // handedness * projection * view
        // mat4.multiply(hpvmMatrix, hpvMatrix, mMatrix); // handedness * projection * view * model

        // gl.uniformMatrix4fv(this.mMatrixULoc, false, mMatrix); // pass in the m matrix
        // gl.uniformMatrix4fv(this.pvmMatrixULoc, false, hpvmMatrix); // pass in the hpvm matrix

        gl.uniform3fv(sunAmbientULoc, sunAmbient); // pass in the sun's ambient emission
        gl.uniform3fv(sunSpecularULoc, sunSpecular); // pass in the sun's specular emission

        gl.uniform3fv(moonAmbientULoc, moonAmbient); // pass in the moon's ambient emission
        gl.uniform3fv(moonDiffuseULoc, moonDiffuse); // pass in the moon's diffuse emission
        gl.uniform3fv(moonSpecularULoc, moonSpecular); // pass in the moon's specular emission

        gl.uniform3fv(ambientULoc, ambient); // pass in the ambient reflectivity
        gl.uniform3fv(this.diffuseULoc, diffuse); // pass in the diffuse reflectivity
        gl.uniform3fv(specularULoc, specular); // pass in the specular reflectivity
        gl.uniform1f(shininessULoc, shininess); // pass in the specular exponent
    }
}

// Load shaders as compile time constants
const vertexShader = require('./shader.vs').toString();
const fragmentShader = require('./shader.fs').toString();

export function createShader(gl: WebGLRenderingContext): Shader {
    return new Shader(gl, fragmentShader, vertexShader);
}