import { expect } from 'chai';
import 'mocha';

import register from 'ignore-styles'
register(['.vs', '.fs']);


let webGL = require('node-webgl');

import { Shader } from "./shader";

describe('Shader', () => {
    let canvas = webGL.document().createElement('canvas');
    let gl = canvas.getContext('experimental-webgl');
    it('should create a shader program', () => {
        let fShaderCode: string = `
        void main() {
            gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
        }
        `;
        let vShaderCode: string = `
        void main() {
            gl_Position = vec4(1.0, 1.0, 1.0, 1.0);
        }
        `;
        let shader = new Shader(gl, fShaderCode, vShaderCode);
        expect(shader).to.not.be.null;
    });
    it('should fail to create an invalid shader program', () => {
        let fShaderCode: string = `
        void main() {
            gl_FragColor = vec4
        }
        `;
        let vShaderCode: string = `
        void main() {
            gl_Position = vec4(1.0, 1.0, 1.0, 1.0);
        }
        `;
        expect(() => { new Shader(gl, fShaderCode, vShaderCode) }).to.throw();
    });
});