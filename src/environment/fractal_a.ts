import { vec3 } from 'gl-matrix';
import { Environment } from "./environment";

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

export class FractalA extends Environment {
    finalDepth : number;
    quadNormals : vec3[];

    constructor(gl: WebGLRenderingContext) {
        super(gl);

        this.finalDepth = 7;
        let initBl = vec3.fromValues(-1, 0, -1);
        let initTl = vec3.fromValues(-1, 0, 1);
        let initTr = vec3.fromValues(1, 0, 1);
        let initBr = vec3.fromValues(1, 0, -1);
        initBl[1] += expRand(initBl, 0);
        initTl[1] += expRand(initTl, 0);
        initTr[1] += expRand(initTr, 0);
        initBr[1] += expRand(initBr, 0);
        this.quadNormals = [];

        this.fractalRecurse(initBl, initBr, initTl, initTr, 0);

        for (let i = 0; i < this.quadNormals.length / 3; i++) {
            let result = getCoord(i);
            let x = result[0];
            let y = result[1];

            this.addNormals(x, y);
            this.addNormals(x + 1, y);
            this.addNormals(x, y + 1);
            this.addNormals(x + 1, y + 1);
        }

        this.triangleCount = this.triangles.length / 3;

        this.createBuffers(gl);
    }

    fractalRecurse(bl: vec3, br: vec3, tl: vec3, tr: vec3, n: number) {
        if (n == this.finalDepth) {
            // this adds a square
            this.vertices.push(bl[0], bl[1], bl[2]);
            this.vertices.push(br[0], br[1], br[2]);
            this.vertices.push(tl[0], tl[1], tl[2]);
            this.vertices.push(tr[0], tr[1], tr[2]);

            let normA = getNormal(bl, tl, br);
            let normB = getNormal(tl, tr, br);
            let sum = vec3.create();
            vec3.add(sum, normA, normB);
            this.quadNormals.push(normA, normB, sum);

            // let normal = vec3.create();
            // vec3.normalize(normal, sum);
            // this.normals.push(normA[0], normA[1], normA[2]);
            // this.normals.push(normal[0], normal[1], normal[2]);
            // this.normals.push(normB[0], normB[1], normB[2]);
            // this.normals.push(normal[0], normal[1], normal[2]);

            let len = this.vertices.length / 3;
            this.triangles.push(len - 4, len - 2, len - 3, len - 2, len - 1, len - 3);
        } else {
            let midLeft = vec3.create();
            let midTop = vec3.create();
            let midRight = vec3.create();
            let midBottom = vec3.create();
            let midPoint = vec3.create();

            vec3.add(midLeft, bl, tl);
            vec3.scale(midLeft, midLeft, 1 / 2);
            vec3.add(midTop, tl, tr);
            vec3.scale(midTop, midTop, 1 / 2);
            vec3.add(midRight, tr, br);
            vec3.scale(midRight, midRight, 1 / 2);
            vec3.add(midBottom, br, bl);
            vec3.scale(midBottom, midBottom, 1 / 2);

            vec3.add(midPoint, bl, tl);
            vec3.add(midPoint, midPoint, tr);
            vec3.add(midPoint, midPoint, br);
            vec3.scale(midPoint, midPoint, 1 / 4);

            midLeft[1] += expRand(midLeft, n);
            midTop[1] += expRand(midTop, n);
            midRight[1] += expRand(midRight, n);
            midBottom[1] += expRand(midBottom, n);
            midPoint[1] += expRand(midPoint, n);

            this.fractalRecurse(bl, midBottom, midLeft, midPoint, n + 1); //bottom left corner
            this.fractalRecurse(midBottom, br, midPoint, midRight, n + 1); //bottom right corner
            this.fractalRecurse(midLeft, midPoint, tl, midTop, n + 1); //top left corner
            this.fractalRecurse(midPoint, midRight, midTop, tr, n + 1); //top right corner
        }
    }

    addNormals(x: number, y: number) {
        //averages the normals of   x,y   x+1,y   x+1,y+1   x,y+1, and throws it into the normals array
        let a = getIndex(x - 1, y - 1) * 3 + 1;
        let b = getIndex(x, y - 1) * 3 + 2;
        let c = getIndex(x - 1, y) * 3 + 2;
        let d = getIndex(x, y) * 3 + 0;

        let normal = vec3.create();

        if (a >= 0 && a < this.quadNormals.length)
            vec3.add(normal, normal, this.quadNormals[a]);
        if (b >= 0 && b < this.quadNormals.length)
            vec3.add(normal, normal, this.quadNormals[b]);
        if (c >= 0 && c < this.quadNormals.length)
            vec3.add(normal, normal, this.quadNormals[c]);
        if (d >= 0 && d < this.quadNormals.length)
            vec3.add(normal, normal, this.quadNormals[d]);

        vec3.normalize(normal, normal);
        this.normals.push(normal[0], normal[1], normal[2]);
    }
}