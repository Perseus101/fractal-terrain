import { vec3 } from 'gl-matrix';
import { BufferSet, BufferSetBuilder } from './buffer_set';
import { Shader } from '../shaders/shader';
import { Environment } from './environment';
import RNG from '../rng';
import Biome from '../biome/biome';
import { BiomeContainer } from '../biome/container';

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

//this is basically a dividable quadrilateral
export class Patch {
    bl: vec3;
    br: vec3;
    tl: vec3;
    tr: vec3;
    midpoint: vec3;
    rng: RNG;

    biomeWeights: number[];
    biomes: BiomeContainer;

    constructor(bl: vec3, br: vec3, tl: vec3, tr: vec3, rng: RNG, biomeWeights: number[], biomes: BiomeContainer) {
        this.bl = bl;
        this.br = br;
        this.tl = tl;
        this.tr = tr;
        this.rng = rng;

        this.biomeWeights = biomeWeights;
        this.biomes = biomes;
    }

    computeMidpoint() {
        let midpoint = vec3.create();

        vec3.add(midpoint, this.bl, this.tl);
        vec3.add(midpoint, midpoint, this.tr);
        vec3.add(midpoint, midpoint, this.br);
        vec3.scale(midpoint, midpoint, 1 / 4);

        return midpoint;
    }

    divide(n: number) {
        let midLeft = vec3.create();
        let midTop = vec3.create();
        let midRight = vec3.create();
        let midBottom = vec3.create();

        vec3.add(midLeft, this.bl, this.tl);
        vec3.scale(midLeft, midLeft, 1 / 2);
        vec3.add(midTop, this.tl, this.tr);
        vec3.scale(midTop, midTop, 1 / 2);
        vec3.add(midRight, this.tr, this.br);
        vec3.scale(midRight, midRight, 1 / 2);
        vec3.add(midBottom, this.br, this.bl);
        vec3.scale(midBottom, midBottom, 1 / 2);

        let midpoint = this.computeMidpoint();

        // let biome = this.biomes.createInterpolatedBiome(this.biomeWeights);

        midLeft[1] += this.rng.expRand(midLeft, n/*, 1, biome.amplitude*/);
        midTop[1] += this.rng.expRand(midTop, n/*, 1, biome.amplitude*/);
        midRight[1] += this.rng.expRand(midRight, n/*, 1, biome.amplitude*/);
        midBottom[1] += this.rng.expRand(midBottom, n/*, 1, biome.amplitude*/);
        midpoint[1] += this.rng.expRand(midpoint, n/*, 1, biome.amplitude*/);

        return [
            new Patch(this.bl, midBottom, midLeft, midpoint, this.rng, this.perturbWeights(0, n, this.bl), this.biomes), //bottom left corner
            new Patch(midBottom, this.br, midpoint, midRight, this.rng, this.perturbWeights(1, n, this.br), this.biomes), //bottom right corner
            new Patch(midLeft, midpoint, this.tl, midTop, this.rng, this.perturbWeights(2, n, this.tl), this.biomes), //top left corner
            new Patch(midpoint, midRight, midTop, this.tr, this.rng, this.perturbWeights(3, n, this.tr), this.biomes) //top right corner
        ]
    }

    perturbWeights(seed: number, n: number, point: vec3): number[] {
        let weights = [];
        for (let i = 0; i < this.biomeWeights.length; i++) {
            let weight = this.biomeWeights[i];
            let localSeed = this.rng.hashCombine(i, seed);
            weight += this.rng.expRand(point, n, localSeed, 0.2);
            if (weight > 1) {
                weight = 1;
            }
            if (weight < 0) {
                weight = 0;
            }
            weights.push(weight);
        }
        return weights;
    }
}
abstract class Fractal implements Environment {
    abstract getBufferedFractalAt(p: vec3): BufferedFractal;
    abstract getYAt(p: vec3): number;
    abstract draw(gl: WebGLRenderingContext, shader: Shader): void;

    updatePositionGivenCollisions(pos: vec3): boolean {
        let newY = this.getYAt(pos);
        if (newY != pos[1]) {
            pos[1] = newY + 0.1;
            return true;
        } else {
            return false;
        }
    }
}

//This is the tree that either contains more trees, or eventually a BufferedFractal which is a leaf node
export class FractalTree extends Fractal {
    bl: Fractal;
    br: Fractal;
    tl: Fractal;
    tr: Fractal;
    midpoint: vec3;

    constructor(gl: WebGLRenderingContext, biomes: BiomeContainer, patch: Patch, depth: number, layersUntilBuffering: number) {
        super();

        this.midpoint = patch.computeMidpoint();

        let subs = patch.divide(depth);
        if (layersUntilBuffering == 0) {
            this.bl = new BufferedFractal(gl, biomes, subs[0], depth + 1, 8);
            this.br = new BufferedFractal(gl, biomes, subs[1], depth + 1, 8);
            this.tl = new BufferedFractal(gl, biomes, subs[2], depth + 1, 8);
            this.tr = new BufferedFractal(gl, biomes, subs[3], depth + 1, 8);
        } else {
            this.bl = new FractalTree(gl, biomes, subs[0], depth + 1, layersUntilBuffering - 1);
            this.br = new FractalTree(gl, biomes, subs[1], depth + 1, layersUntilBuffering - 1);
            this.tl = new FractalTree(gl, biomes, subs[2], depth + 1, layersUntilBuffering - 1);
            this.tr = new FractalTree(gl, biomes, subs[3], depth + 1, layersUntilBuffering - 1);
        }
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        this.bl.draw(gl, shader);
        this.br.draw(gl, shader);
        this.tl.draw(gl, shader);
        this.tr.draw(gl, shader);
    }

    getBufferedFractalAt(p: vec3): BufferedFractal {
        let fractal;
        if (p[0] > this.midpoint[0]) {
            if (p[2] > this.midpoint[2]) {
                fractal = this.tr;
            } else {
                fractal = this.br;
            }
        } else {
            if (p[2] > this.midpoint[2]) {
                fractal = this.tl;
            } else {
                fractal = this.bl;
            }
        }
        return fractal.getBufferedFractalAt(p);
    }

    getYAt(p: vec3): number {
        return this.getBufferedFractalAt(p).getYAt(p);
    }
}

//This is a leaf of a fractal tree, and actually contains buffer data that can be drawn
export class BufferedFractal extends Fractal {
    finalDepth : number;
    quadNormals : vec3[];
    buffers: BufferSet;
    patch: Patch;
    saved_vertices: number[];
    sqrtSize: number;

    biomes: BiomeContainer

    constructor(gl: WebGLRenderingContext, biomes: BiomeContainer, patch: Patch, depth: number, layersToRecurse: number) {
        super();

        this.biomes = biomes;
        this.patch = patch;
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
        this.sqrtSize = Math.pow(2, layersToRecurse);
        this.saved_vertices = builder.vertices;
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

            let biome = this.biomes.createInterpolatedBiome(patch.biomeWeights);
            builder.colors.push(biome.color[0], biome.color[1], biome.color[2]);
            builder.colors.push(biome.color[0], biome.color[1], biome.color[2]);
            builder.colors.push(biome.color[0], biome.color[1], biome.color[2]);
            builder.colors.push(biome.color[0], biome.color[1], biome.color[2]);

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

    getBufferedFractalAt(p: vec3): BufferedFractal {
        return this;
    }

    getYAt(p: vec3): number {
        //what fraction we are into this patch
        let xp = (p[0] - this.patch.bl[0]) / (this.patch.br[0] - this.patch.bl[0]);
        let yp = (p[2] - this.patch.bl[2]) / (this.patch.tl[2] - this.patch.bl[2]);

        let size = this.sqrtSize - 1;

        //what integer x y coordinates into our grid of vertices that corresponds to
        let x = Math.floor(xp * size);
        let y = Math.floor(yp * size);

        //what percentage inside the mini square between the smallest points in our grid is
        let xpp = xp * size - x;
        let ypp = yp * size - y;

        let bl = this.saved_vertices[getIndex(x, y)         * 3 + 1];
        let br = this.saved_vertices[getIndex(x + 1, y)     * 3 + 1];
        let tl = this.saved_vertices[getIndex(x, y + 1)     * 3 + 1];
        let tr = this.saved_vertices[getIndex(x + 1, y + 1) * 3 + 1];

        let left_interp = (1 - ypp) * bl + ypp * tl;
        let right_interp = (1 - ypp) * br + ypp * tr;

        let interp = (1-xpp) * left_interp + xpp*right_interp;

        return interp;
    }
}
