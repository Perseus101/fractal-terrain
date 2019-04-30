import { vec3 } from 'gl-matrix';

const kBuf = new ArrayBuffer(8);
const kBufAsF64 = new Float64Array(kBuf);
const kBufAsI32 = new Int32Array(kBuf);

export class RNG {
    globalSeed: number;

    constructor(seed: number) {
        this.globalSeed = this.hashFloat(seed)
    }

    hashFloat(n: number) {
        if (~~n === n) {
            return ~~n;
        }
        kBufAsF64[0] = n;
        return kBufAsI32[0] ^ kBufAsI32[1];
    }

    hashCombine(lhs: number, rhs: number) {
        return lhs * 19 + rhs;
    }

    seededRandom(vec: vec3, localSeed: number) {
        let seed = this.hashCombine(this.hashCombine(this.hashCombine(this.globalSeed, localSeed), vec[0]), vec[2]);
        let x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    seededRandomGauss(vec: vec3, localSeed: number) {
        let randA = this.seededRandom(vec, localSeed);
        let randB = this.seededRandom(vec3.fromValues(vec[0] + randA, vec[1] + randA, vec[2] + randA), localSeed);
        return Math.sqrt(-2 * Math.log(randA)) * Math.cos(2 * Math.PI * randB);
    }

    expRand(vec: vec3, n: number, localSeed=1, gaussianAmplitude = 1.0) {
        return gaussianAmplitude*this.seededRandomGauss(vec, localSeed) / Math.pow(2, n);
    }
}

export class PerlinRNG {
    constructor() {
        for (let i=0; i < this.permutation.length; i++) this.p.push(0)
        for (let i=0; i < 256 ; i++) this.p[256+i] = this.p[i] = this.permutation[i];
    }

    noiseVec(point: vec3): number {
        return this.noise(point[0], point[1], point[2]);
    }

    noise(x: number, y: number, z: number): number {
        let X = Math.floor(x) & 255,
            Y = Math.floor(y) & 255,
            Z = Math.floor(z) & 255;
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        let u = this.fade(x),
            v = this.fade(y),
            w = this.fade(z);
        let A = this.p[X  ]+Y, AA = this.p[A]+Z, AB = this.p[A+1]+Z,
            B = this.p[X+1]+Y, BA = this.p[B]+Z, BB = this.p[B+1]+Z;

        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA  ], x  , y  , z   ),
                                                      this.grad(this.p[BA  ], x-1, y  , z   )),
                                         this.lerp(u, this.grad(this.p[AB  ], x  , y-1, z   ),
                                                      this.grad(this.p[BB  ], x-1, y-1, z   ))),
                            this.lerp(v, this.lerp(u, this.grad(this.p[AA+1], x  , y  , z-1 ),
                                                      this.grad(this.p[BA+1], x-1, y  , z-1 )),
                                         this.lerp(u, this.grad(this.p[AB+1], x  , y-1, z-1 ),
                                                      this.grad(this.p[BB+1], x-1, y-1, z-1 ))));
    }
    private fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
    private lerp(t: number, a: number, b: number): number { return a + t * (b - a); }
    private grad(hash: number, x: number, y: number, z: number): number {
        let h = hash & 15;
        let u = h<8 ? x : y,
            v = h<4 ? y : h==12||h==14 ? x : z;
        return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
    }
    private p: number[] = [];
    private readonly permutation = [ 151,160,137,91,90,15,
    131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,
    88,237,149,56,87,174,20,125,136,171,168, 68,175,74,165,71,134,139,48,27,166,
    77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
    102,143,54, 65,25,63,161, 1,216,80,73,209,76,132,187,208, 89,18,169,200,196,
    135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,
    5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
    223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,167, 43,172,9,
    129,22,39,253, 19,98,108,110,79,113,224,232,178,185, 112,104,218,246,97,228,
    251,34,242,193,238,210,144,12,191,179,162,241, 81,51,145,235,249,14,239,107,
    49,192,214, 31,181,199,106,157,184, 84,204,176,115,121,50,45,127, 4,150,254,
    138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
}

export default RNG;