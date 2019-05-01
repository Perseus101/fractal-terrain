import { vec3 } from 'gl-matrix';

const kBuf = new ArrayBuffer(8);
const kBufAsF64 = new Float64Array(kBuf);
const kBufAsI32 = new Int32Array(kBuf);

export class RNG {
    globalSeed: number;

    constructor(seed: number,
        private gaussianAmplitude: number = 300,
        private expBase: number = 2
    ) {
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
        return lhs * 19.0 + rhs * 17;
    }

    /* Note, this ignores the y value when seeding */
    seededRandom(vec: vec3) {
        let seed = this.hashCombine(this.hashCombine(vec[0], this.globalSeed), vec[2]);
        let x = Math.sin(seed * 1.12) * 9999.0;
        return x - Math.floor(x);
    }

    seededRandomGauss(vec: vec3) {
        let randA = this.seededRandom(vec);
        let randB = this.seededRandom(vec3.fromValues(vec[0] + randA, vec[1] + randA, vec[2] + randA));
        return Math.sqrt(-2 * Math.log(randA)) * Math.cos(2 * Math.PI * randB);
    }

    expRand(vec: vec3, n: number) {
        return this.gaussianAmplitude*this.seededRandomGauss(vec) / Math.pow(this.expBase, n);
    }
}

export default RNG;