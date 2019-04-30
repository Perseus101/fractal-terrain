import { vec3, mat4 } from 'gl-matrix';
import { Drawable } from "./drawable";
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
    return 1*seededRandomGauss(vec) / Math.pow(2, n);
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

export class Patch {
    bl: vec3;
    br: vec3;
    tl: vec3;
    tr: vec3;

    barren: boolean
    hasFlora: boolean;

    constructor(bl: vec3, br: vec3, tl: vec3, tr: vec3, barren: boolean) {
        this.bl = bl;
        this.br = br;
        this.tl = tl;
        this.tr = tr;
        this.barren = barren;
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

        // give this patch some flora
        let size = vec3.length(vec3.sub(vec3.create(), this.bl, this.br));
        if (!this.barren && seededRandom(midPoint) > size) {
            // console.log("has Flora");
            this.hasFlora = true;
        }

        return [
            new Patch(this.bl, midBottom, midLeft, midPoint, this.hasFlora), //bottom left corner
            new Patch(midBottom, this.br, midPoint, midRight, this.hasFlora), //bottom right corner
            new Patch(midLeft, midPoint, this.tl, midTop, this.hasFlora), //top left corner
            new Patch(midPoint, midRight, midTop, this.tr, this.hasFlora) //top right corner
        ]
    }
}

export class FractalTree extends Drawable {
    bl: Drawable;
    br: Drawable;
    tl: Drawable;
    tr: Drawable;

    constructor(gl: WebGLRenderingContext, patch: Patch, depth: number, layersUntilBuffering: number) {
        super(gl);

        let subs = patch.divide(depth);

        if (layersUntilBuffering == 0) {
            this.bl = new BufferedFractal(gl, subs[0], depth + 1, 8);
            this.br = new BufferedFractal(gl, subs[1], depth + 1, 8);
            this.tl = new BufferedFractal(gl, subs[2], depth + 1, 8);
            this.tr = new BufferedFractal(gl, subs[3], depth + 1, 8);
        } else {
            this.bl = new FractalTree(gl, subs[0], depth + 1, layersUntilBuffering - 1);
            this.br = new FractalTree(gl, subs[1], depth + 1, layersUntilBuffering - 1);
            this.tl = new FractalTree(gl, subs[2], depth + 1, layersUntilBuffering - 1);
            this.tr = new FractalTree(gl, subs[3], depth + 1, layersUntilBuffering - 1);
        }
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.bl.draw(gl, shader);
        this.br.draw(gl, shader);
        this.tl.draw(gl, shader);
        this.tr.draw(gl, shader);
    }
}

export class BufferedFractal extends Drawable {
    finalDepth : number;
    quadNormals : vec3[];
    buffers: BufferSet;

    constructor(gl: WebGLRenderingContext, patch: Patch, depth: number, layersToRecurse: number) {
        super(gl);

        this.finalDepth = depth + layersToRecurse - 1;

        let quadNormals: vec3[] = [];

        let builder = new BufferSetBuilder();
        this.fractalRecurse(builder, quadNormals, patch, depth);

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



export class Flora extends Drawable {

    static treeModel;
    modelBuffer: BufferSet;

    constructor(gl: WebGLRenderingContext, patch: Patch) {
        super(gl);

        // Translate the model to a location on the patch
        let loc = patch.bl;

        // Scale the model based on the size of the patch
        let size = vec3.length(vec3.sub(vec3.create(), patch.bl, patch.tr));
        size /= 9.0;

        let mMatrix = mat4.create();
        // scale
        mMatrix[0] = size;
        mMatrix[5] = size;
        mMatrix[10] = size;
        // translate
        mMatrix[12] = loc[0];
        mMatrix[13] = loc[1];
        mMatrix[14] = loc[2];
        let mVertices = [];
        for (let vert of Flora.treeModel.vertices) {
            let vertex = vec3.fromValues(vert[0], vert[1], vert[2]);
            let mVertex = vec3.create();
            vec3.transformMat4(mVertex, vertex, mMatrix)
            mVertices.push([mVertex[0], mVertex[1], mVertex[2]]);
        }

        this.modelBuffer = new BufferSet(gl, mVertices, Flora.treeModel.normals, Flora.treeModel.triangles);
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.modelBuffer.draw(gl, shader);
    }
}