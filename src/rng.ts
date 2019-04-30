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
        let seed = this.hashCombine(this.hashCombine(this.hashCombine(this.hashCombine(this.globalSeed, localSeed), vec[0]), vec[1]), vec[2]);
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

export default RNG;