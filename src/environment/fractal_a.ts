import { vec3 } from 'gl-matrix';
import { Environment } from "./environment";
import { BufferSet, BufferSetBuilder } from './buffer_set';
import { Shader } from '../shaders/shader';

const kBuf = new ArrayBuffer(8);
const kBufAsF64 = new Float64Array(kBuf);
const kBufAsI32 = new Int32Array(kBuf);

function hashFloat(n: number) {
    // Remove this `if` if you want 0 and -0 to hash to different values.
    if (~~n === n) {
        return ~~n;
    }
    kBufAsF64[0] = n;
    return kBufAsI32[0] ^ kBufAsI32[1];
}

function hashCombine(lhs: number, rhs: number) {
    return lhs * 19 + rhs;
}

var globalSeed = hashFloat(Math.random());

function seededRandom(vec: vec3) {
    let seed = hashCombine(hashCombine(hashCombine(globalSeed, vec[0]), vec[1]), vec[2]);
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function seededRandomGauss(vec: vec3) {
    let randA = seededRandom(vec);
    let randB = seededRandom(vec3.fromValues(vec[0] + randA, vec[1] + randA, vec[2] + randA));
    return Math.sqrt(-2 * Math.log(randA)) * Math.cos(2 * Math.PI * randB);
}

function expRand(vec: vec3, n : number) {
    return 0.5*seededRandomGauss(vec) / Math.pow(2, n + 1);
}

function reverse(binary: number, length: number) {
    let result = 0;
    for (let i = 0; i < length; i++) {
        result = (result << 1) | binary & 1;
        binary = binary >>> 1;
    }
    return result;
}

function getIndex(x: number, y: number) {
    if (x < 0 || y < 0)
        return -1;
    let acc = 0;
    let digits = 0;
    while (x > 0 || y > 0) {
        acc = acc << 1;
        acc |= x & 1;
        acc = acc << 1;
        acc |= y & 1;
        digits += 2;
        x = x >>> 1;
        y = y >>> 1;
    }
    return reverse(acc, digits);
}

function getCoord(index: number) {
    let x = 0;
    let y = 0;
    let digits = 0;
    while (index > 0) {
        x = x << 1 | index & 1;
        index = index >>> 1;
        y = y << 1 | index & 1;
        index = index >>> 1;

        digits += 1;
    }
    return [reverse(x, digits), reverse(y, digits)];
}

function getNormal(a : vec3, b : vec3, c : vec3) {
    let tmp1 = vec3.create();
    let tmp2 = vec3.create();
    vec3.subtract(tmp1, b, a);
    vec3.subtract(tmp2, c, a);
    let normal = vec3.create();
    vec3.cross(normal, tmp1, tmp2);
    vec3.normalize(normal, normal);
    return normal;
}

class Patch {
    bl: vec3;
    br: vec3;
    tl: vec3;
    tr: vec3;

    constructor(bl: vec3, br: vec3, tl: vec3, tr: vec3) {
        this.bl = bl;
        this.br = br;
        this.tl = tl;
        this.tr = tr;
    }

    divide(n: number) {
        let midLeft = vec3.create();
        let midTop = vec3.create();
        let midRight = vec3.create();
        let midBottom = vec3.create();
        let midPoint = vec3.create();

        vec3.add(midLeft, this.bl, this.tl);
        vec3.scale(midLeft, midLeft, 1 / 2);
        vec3.add(midTop, this.tl, this.tr);
        vec3.scale(midTop, midTop, 1 / 2);
        vec3.add(midRight, this.tr, this.br);
        vec3.scale(midRight, midRight, 1 / 2);
        vec3.add(midBottom, this.br, this.bl);
        vec3.scale(midBottom, midBottom, 1 / 2);

        vec3.add(midPoint, this.bl, this.tl);
        vec3.add(midPoint, midPoint, this.tr);
        vec3.add(midPoint, midPoint, this.br);
        vec3.scale(midPoint, midPoint, 1 / 4);

        midLeft[1] += expRand(midLeft, n);
        midTop[1] += expRand(midTop, n);
        midRight[1] += expRand(midRight, n);
        midBottom[1] += expRand(midBottom, n);
        midPoint[1] += expRand(midPoint, n);

        return [
            new Patch(this.bl, midBottom, midLeft, midPoint), //bottom left corner
            new Patch(midBottom, this.br, midPoint, midRight), //bottom right corner
            new Patch(midLeft, midPoint, this.tl, midTop), //top left corner
            new Patch(midPoint, midRight, midTop, this.tr) //top right corner
        ]
    }
}

export class FractalA extends Environment {
    finalDepth : number;
    quadNormals : vec3[];
    buffers: BufferSet;

    constructor(gl: WebGLRenderingContext) {
        super(gl);

        this.finalDepth = 7;
        let patch = new Patch(
            vec3.fromValues(-1, 0, -1),
            vec3.fromValues(1, 0, -1),
            vec3.fromValues(-1, 0, 1),
            vec3.fromValues(1, 0, 1)
        );
        patch.bl[1] += expRand(patch.bl, 0);
        patch.br[1] += expRand(patch.br, 0);
        patch.tl[1] += expRand(patch.tl, 0);
        patch.tr[1] += expRand(patch.tr, 0);

        let quadNormals: vec3[] = [];

        let builder = new BufferSetBuilder();
        this.fractalRecurse(builder, quadNormals, patch, 0);

        for (let i = 0; i < quadNormals.length / 3; i++) {
            let result = getCoord(i);
            let x = result[0];
            let y = result[1];

            this.addNormals(builder, quadNormals, x, y);
            this.addNormals(builder, quadNormals, x + 1, y);
            this.addNormals(builder, quadNormals, x, y + 1);
            this.addNormals(builder, quadNormals, x + 1, y + 1);
        }

        this.buffers = builder.build(gl);
    }

    fractalRecurse(builder: BufferSetBuilder, quadNormals: vec3[], patch: Patch, n: number) {
        if (n == this.finalDepth) {
            // this adds a square
            builder.vertices.push(patch.bl[0], patch.bl[1], patch.bl[2]);
            builder.vertices.push(patch.br[0], patch.br[1], patch.br[2]);
            builder.vertices.push(patch.tl[0], patch.tl[1], patch.tl[2]);
            builder.vertices.push(patch.tr[0], patch.tr[1], patch.tr[2]);

            let normA = getNormal(patch.bl, patch.tl, patch.br);
            let normB = getNormal(patch.tl, patch.tr, patch.br);
            let sum = vec3.create();
            vec3.add(sum, normA, normB);
            quadNormals.push(normA, normB, sum);

            // let normal = vec3.create();
            // vec3.normalize(normal, sum);
            // builder.normals.push(normA[0], normA[1], normA[2]);
            // builder.normals.push(normal[0], normal[1], normal[2]);
            // builder.normals.push(normB[0], normB[1], normB[2]);
            // builder.normals.push(normal[0], normal[1], normal[2]);

            let len = builder.vertices.length / 3;
            builder.triangles.push(len - 4, len - 2, len - 3, len - 2, len - 1, len - 3);
        } else {
            let subPatches = patch.divide(n);

            for (let subPatch of subPatches) {
                this.fractalRecurse(builder, quadNormals, subPatch, n + 1);
            }
        }
    }

    addNormals(builder: BufferSetBuilder, quadNormals: vec3[], x: number, y: number) {
        //averages the normals of   x,y   x+1,y   x+1,y+1   x,y+1, and throws it into the normals array
        let a = getIndex(x - 1, y - 1) * 3 + 1;
        let b = getIndex(x, y - 1) * 3 + 2;
        let c = getIndex(x - 1, y) * 3 + 2;
        let d = getIndex(x, y) * 3 + 0;

        let normal = vec3.create();

        if (a >= 0 && a < quadNormals.length)
            vec3.add(normal, normal, quadNormals[a]);
        if (b >= 0 && b < quadNormals.length)
            vec3.add(normal, normal, quadNormals[b]);
        if (c >= 0 && c < quadNormals.length)
            vec3.add(normal, normal, quadNormals[c]);
        if (d >= 0 && d < quadNormals.length)
            vec3.add(normal, normal, quadNormals[d]);

        vec3.normalize(normal, normal);
        builder.normals.push(normal[0], normal[1], normal[2]);
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.buffers.draw(gl, shader);
    }
}