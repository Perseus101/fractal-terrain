import { vec3, mat4 } from 'gl-matrix';
import { Drawable } from "./drawable";
import { BufferSet, ModelBufferSet, BufferSetBuilder } from './buffer_set';
import { Shader } from '../shaders/shader';
import { Environment } from './environment';
import RNG, { PerlinRNG } from '../rng';
import Biome from '../biome/biome';
import { BiomeContainer, BiomeQuad } from '../biome/container';

const BIOME_DEPTH = 6;
const BIOME_SCALE = 0.5;

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
    static readonly perlin = new PerlinRNG();

    midpoint: vec3;

    constructor(
        public bl: vec3,
        public br: vec3,
        public tl: vec3,
        public tr: vec3,
        public rng: RNG,
        public biomes?: BiomeContainer,
        public biomeQuad?: BiomeQuad
    ) {
        this.bl = bl;
        this.br = br;
        this.tl = tl;
        this.tr = tr;
        this.rng = rng;

        this.computeMidpoint();
        if(this.biomeQuad === undefined) {
            if(this.biomes === undefined) {
                throw new Error("BiomeContainer required when BiomeQuad not present");
            }
            this.generateBiomeQuad();
        }
    }

    private generateBiomeQuad() {
        this.biomeQuad = new BiomeQuad(this.biomes, [
            this.generateBiomeWeights(this.bl),
            this.generateBiomeWeights(this.tl),
            this.generateBiomeWeights(this.br),
            this.generateBiomeWeights(this.tr)
        ], [
            this.bl, this.tl, this.br, this.tr
        ])
    }

    private generateBiomeWeights(point: vec3): number[] {
        const scale = BIOME_SCALE;
        let x = point[0] / scale;
        let z = point[2] / scale;
        let biomeWeights = [];
        let y = 0.1;

        for(let i = 0; i < this.biomes.biomeCount(); i++) {
            y += i * 1000.8;
            let val = Patch.perlin.noise(x, y, z);
            if(val < 0) {
                val = 0.01;
            }
            biomeWeights.push(val);
        }
        if(biomeWeights[0] > 1) {
            console.log(biomeWeights);
        }
        return biomeWeights;
    }

    private computeMidpoint() {
        this.midpoint = vec3.create();

        vec3.add(this.midpoint, this.bl, this.tl);
        vec3.add(this.midpoint, this.midpoint, this.tr);
        vec3.add(this.midpoint, this.midpoint, this.br);
        vec3.scale(this.midpoint, this.midpoint, 1 / 4);
    }

    getBiome(point: vec3): Biome {
        return this.biomeQuad.bilerp(point)
    }

    divide(currentDepth: number) {
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

        let midpoint = vec3.clone(this.midpoint);

        // let biome = this.biomes.createInterpolatedBiome(this.biomeWeights);

        midLeft[1] += this.rng.expRand(midLeft, currentDepth, 1, this.getBiome(midLeft).amplitude);
        midTop[1] += this.rng.expRand(midTop, currentDepth, 1, this.getBiome(midTop).amplitude);
        midRight[1] += this.rng.expRand(midRight, currentDepth, 1, this.getBiome(midRight).amplitude);
        midBottom[1] += this.rng.expRand(midBottom, currentDepth, 1, this.getBiome(midBottom).amplitude);
        midpoint[1] += this.rng.expRand(midpoint, currentDepth, 1, this.getBiome(midpoint).amplitude);

        let biomeQuad: BiomeQuad = undefined;
        if(currentDepth > BIOME_DEPTH) {
            biomeQuad = this.biomeQuad;
        }
        return [
            new Patch(this.bl, midBottom, midLeft, midpoint, this.rng, this.biomes, biomeQuad), //bottom left corner
            new Patch(midBottom, this.br, midpoint, midRight, this.rng, this.biomes, biomeQuad), //bottom right corner
            new Patch(midLeft, midpoint, this.tl, midTop, this.rng, this.biomes, biomeQuad), //top left corner
            new Patch(midpoint, midRight, midTop, this.tr, this.rng, this.biomes, biomeQuad) //top right corner
        ]
    }

    /**
     * Returns the larger patch enclosing this one, assuming this patch is in the given quadrant
     * @param quadrantToBe the quadrant that this patch would exist in in the larger patch
     */
    undivide(quadrantToBe: Quadrant, currentDepth: number): Patch {
        let anchor; //the point that doesn't move
        let pX;     //the point that is grown along the x direction
        let pY;     //the point that is grown along the y direciton
        let pXY;    //the point that is grown along the x and y directions

        switch (quadrantToBe) {
            case Quadrant.Bl: {
                anchor = vec3.clone(this.bl);
                pX = vec3.clone(this.br);
                pY = vec3.clone(this.tl);
                pXY = vec3.clone(this.tr);
                break;
            }
            case Quadrant.Br: {
                anchor = vec3.clone(this.br);
                pX = vec3.clone(this.bl);
                pY = vec3.clone(this.tr);
                pXY = vec3.clone(this.tl);
                break;
            }
            case Quadrant.Tl: {
                anchor = vec3.clone(this.tl);
                pX = vec3.clone(this.tr);
                pY = vec3.clone(this.bl);
                pXY = vec3.clone(this.br);
                break;
            }
            case Quadrant.Tr: {
                anchor = vec3.clone(this.tr);
                pX = vec3.clone(this.tl);
                pY = vec3.clone(this.br);
                pXY = vec3.clone(this.bl);
                break;
            }
        }

        let dX = vec3.create(); vec3.subtract(dX, pX, anchor);
        let dY = vec3.create(); vec3.subtract(dY, pY, anchor);

        let oldPX = vec3.clone(pX);
        let oldPY = vec3.clone(pY);
        let oldPXY = vec3.clone(pXY);

        vec3.add(pX, pX, dX);
        vec3.add(pY, pY, dY);
        vec3.add(pXY, pXY, dX);
        vec3.add(pXY, pXY, dY);

        //(anchor + newCorner) / 2 = interpolated     and interpolated + displacement = midY
        //newCorner = 2*(midY - displacement) - anchor
        pX[1] = 2 * (oldPX[1] - this.rng.expRand(oldPX, currentDepth - 1)) - anchor[1];
        pY[1] = 2 * (oldPY[1] - this.rng.expRand(oldPY, currentDepth - 1)) - anchor[1];

        //(anchor + pX + pY + pXY)/4 = oldPXY - displacement
        //pXY = 4*(oldPXY - displacement) - pX - pY - anchor
        pXY[1] = 4 * (oldPXY[1] - this.rng.expRand(oldPXY, currentDepth - 1)) - pX[1] - pY[1] - anchor[1];


        switch (quadrantToBe) {
            case Quadrant.Bl: {
                let bl = anchor;
                let br = pX;
                let tl = pY;
                let tr = pXY;
                return new Patch(bl, br, tl, tr, this.rng, this.biomes);
            }
            case Quadrant.Br: {
                let br = anchor;
                let bl = pX;
                let tr = pY;
                let tl = pXY;
                return new Patch(bl, br, tl, tr, this.rng, this.biomes);
            }
            case Quadrant.Tl: {
                let tl = anchor;
                let tr = pX;
                let bl = pY;
                let br = pXY;
                return new Patch(bl, br, tl, tr, this.rng, this.biomes);
            }
            case Quadrant.Tr: {
                let tr = anchor;
                let tl = pX;
                let br = pY;
                let bl = pXY;
                return new Patch(bl, br, tl, tr, this.rng, this.biomes);
            }
        }
    }
}

abstract class Fractal implements Environment {
    abstract getBufferedFractalAt(p: vec3): BufferedFractal;
    abstract getYAt(p: vec3): number;
    abstract draw(gl: WebGLRenderingContext, shader: Shader): void;

    updatePositionGivenCollisions(pos: vec3): boolean {
        let newY = this.getYAt(pos);
        if (newY != pos[1]) {
            pos[1] = newY + 0.4;
            return true;
        } else {
            return false;
        }
    }
}

export enum Quadrant {
    Bl,
    Br,
    Tl,
    Tr,
}

//This is the tree that either contains more trees, or eventually a BufferedFractal which is a leaf node
export class FractalNode extends Fractal {
    bl: Fractal;
    br: Fractal;
    tl: Fractal;
    tr: Fractal;
    blPatch: Patch;
    brPatch: Patch;
    tlPatch: Patch;
    trPatch: Patch;

    constructor(
        private gl: WebGLRenderingContext,
        public patch: Patch,
        private depth: number,
        private policies: any,
        private isRoot: boolean
    ) {
        super();
        this.computeAndStoreDivisions();
    }

    computeAndStoreDivisions() {
        let subdivisions = this.patch.divide(this.depth);
        this.blPatch = subdivisions[0];
        this.brPatch = subdivisions[1];
        this.tlPatch = subdivisions[2];
        this.trPatch = subdivisions[3];
    }

    /**
     * Updates the tree with new nodes if the player is close enough, and will delete nodes too far from the player
     * @param playerPosition the current position of the player
     */
    expandAndPruneTree(playerPosition: vec3): FractalNode {
        this.becomeRootIfNeeded(playerPosition);

        let blP = this.getPolicyFor(this.blPatch, playerPosition);
        let brP = this.getPolicyFor(this.brPatch, playerPosition);
        let tlP = this.getPolicyFor(this.tlPatch, playerPosition);
        let trP = this.getPolicyFor(this.trPatch, playerPosition);

        // console.log("bl");
        if (!blP || !blP.bufferAt)
            this.bl = undefined;
        else {
            if (this.depth + 1 >= blP.bufferAt) {
                if (!this.bl || !(this.bl instanceof BufferedFractal))
                    this.bl = new BufferedFractal(this.gl, this.blPatch, this.depth + 1, 6);
            } else {
                if (!this.bl || !(this.bl instanceof FractalNode))
                    this.bl = new FractalNode(this.gl, this.blPatch, this.depth + 1, this.policies, false);
                (this.bl as FractalNode).expandAndPruneTree(playerPosition);
            }
        }
        // console.log("br");
        if (!brP || !brP.bufferAt)
            this.br = undefined;
        else {
            if (this.depth + 1 >= brP.bufferAt) {
                if (!this.br || !(this.br instanceof BufferedFractal))
                    this.br = new BufferedFractal(this.gl, this.brPatch, this.depth + 1, 6);
            } else {
                if (!this.br || !(this.br instanceof FractalNode))
                    this.br = new FractalNode(this.gl, this.brPatch, this.depth + 1, this.policies, false);
                (this.br as FractalNode).expandAndPruneTree(playerPosition);
            }
        }
        // console.log("tl");
        if (!tlP || !tlP.bufferAt)
            this.tl = undefined;
        else {
            if (this.depth + 1 >= tlP.bufferAt) {
                if (!this.tl || !(this.tl instanceof BufferedFractal))
                    this.tl = new BufferedFractal(this.gl, this.tlPatch, this.depth + 1, 6);
            } else {
                if (!this.tl || !(this.tl instanceof FractalNode))
                    this.tl = new FractalNode(this.gl, this.tlPatch, this.depth + 1, this.policies, false);
                (this.tl as FractalNode).expandAndPruneTree(playerPosition);
            }
        }
        // console.log("tr");
        if (!trP || !trP.bufferAt)
            this.tr = undefined;
        else {
            if (this.depth + 1 >= trP.bufferAt) {
                if (!this.tr || !(this.tr instanceof BufferedFractal))
                    this.tr = new BufferedFractal(this.gl, this.trPatch, this.depth + 1, 6);
            } else {
                if (!this.tr || !(this.tr instanceof FractalNode))
                    this.tr = new FractalNode(this.gl, this.trPatch, this.depth + 1, this.policies, false);
                (this.tr as FractalNode).expandAndPruneTree(playerPosition);
            }
        }

        return this;
    }

    /**
     * Updates the tree with new nodes if the player is close enough, and will delete nodes too far from the player
     * @param playerPosition the current position of the player
     */
    getPolicyFor(patch: Patch, playerPosition: vec3) {
        let circumscribedRadius = xzDistance(patch.bl, patch.br) * Math.sqrt(2) / 2;
        let sqDist = xzSquaredDistance(patch.midpoint, playerPosition);

        for (let policy of this.policies.policyList) {
            // console.log(policy, sqDist, circumscribedRadius, Math.pow(policy.from + circumscribedRadius, 2), Math.pow(policy.to + circumscribedRadius, 2));
            if ((!policy.from || sqDist >= Math.pow(policy.from + circumscribedRadius, 2)) && (!policy.to || sqDist < Math.pow(policy.to + circumscribedRadius, 2))) {
                return policy;
            }
        }

        return undefined;
    }

    becomeRootIfNeeded(playerPosition: vec3) {
        if (this.isRoot) {
            let renderCutoff = this.policies.newNodeCutoff;
            if (Math.abs(playerPosition[0] - this.patch.bl[0]) < renderCutoff) {
                if (xzSquaredDistance(this.patch.bl, playerPosition) < xzSquaredDistance(this.patch.tl, playerPosition))
                    this.becomeNewRoot(Quadrant.Tr);
                else
                    this.becomeNewRoot(Quadrant.Br);
            }
            if (Math.abs(playerPosition[0] - this.patch.br[0]) < renderCutoff) {
                if (xzSquaredDistance(this.patch.br, playerPosition) < xzSquaredDistance(this.patch.tr, playerPosition))
                    this.becomeNewRoot(Quadrant.Tl);
                else
                    this.becomeNewRoot(Quadrant.Bl);
            }
            if (Math.abs(playerPosition[2] - this.patch.tl[2]) < renderCutoff) {
                if (xzSquaredDistance(this.patch.tl, playerPosition) < xzSquaredDistance(this.patch.tr, playerPosition))
                    this.becomeNewRoot(Quadrant.Br);
                else
                    this.becomeNewRoot(Quadrant.Bl);
            }
            if (Math.abs(playerPosition[2] - this.patch.bl[2]) < renderCutoff) {
                if (xzSquaredDistance(this.patch.bl, playerPosition) < xzSquaredDistance(this.patch.br, playerPosition))
                    this.becomeNewRoot(Quadrant.Tr);
                else
                    this.becomeNewRoot(Quadrant.Tl);
            }
        }
    }

    /**
     * Turns this current node into the newer root node for the whole tree, and puts the current tree into the specified quadrant.
     * @param quadrantToBe The quadrant that this existing tree will become.
     */
    becomeNewRoot(quadrantToBe: Quadrant) {
        let clone = this.clone();
        clone.isRoot = false;
        this.bl = undefined;
        this.br = undefined;
        this.tl = undefined;
        this.tr = undefined;
        switch(quadrantToBe) {
            case Quadrant.Bl: {
                this.bl = clone;
                break;
            }
            case Quadrant.Br: {
                this.br = clone;
                break;
            }
            case Quadrant.Tl: {
                this.tl = clone;
                break;
            }
            case Quadrant.Tr: {
                this.tr = clone;
                break;
            }
        }
        this.depth -= 1;
        this.patch = this.patch.undivide(quadrantToBe, clone.depth);
        this.computeAndStoreDivisions();
    }

    /**
     * Performs a shallow clone
     */
    clone(): FractalNode {
        let clone = new FractalNode(this.gl, this.patch, this.depth, this.policies, this.isRoot);
        clone.bl = this.bl;
        clone.br = this.br;
        clone.tl = this.tl;
        clone.tr = this.tr;
        return clone;
    }

    draw(gl: WebGLRenderingContext, shader: Shader) {
        if (this.bl)
            this.bl.draw(gl, shader);
        if (this.br)
            this.br.draw(gl, shader);
        if (this.tl)
            this.tl.draw(gl, shader);
        if (this.tr)
            this.tr.draw(gl, shader);
    }

    getBufferedFractalAt(p: vec3): BufferedFractal {
        let fractal;
        if (p[0] > this.patch.midpoint[0]) {
            if (p[2] > this.patch.midpoint[2]) {
                fractal = this.tr;
            } else {
                fractal = this.br;
            }
        } else {
            if (p[2] > this.patch.midpoint[2]) {
                fractal = this.tl;
            } else {
                fractal = this.bl;
            }
        }
        if (!fractal)
            throw "Error, current position in an unloaded fractal quadrant";
        return fractal.getBufferedFractalAt(p);
    }

    getYAt(p: vec3): number {
        return this.getBufferedFractalAt(p).getYAt(p);
    }
}

function xzSquaredDistance(a: vec3, b: vec3): number {
    return (a[0] - b[0]) * (a[0] - b[0]) + (a[2] - b[2]) * (a[2] - b[2]);
}

function xzDistance(a: vec3, b: vec3): number {
    return Math.sqrt(xzSquaredDistance(a, b));
}

//This is a leaf of a fractal tree, and actually contains buffer data that can be drawn
export class BufferedFractal extends Fractal {
    finalDepth : number;
    quadNormals : vec3[];
    buffers: BufferSet;
    patch: Patch;
    saved_vertices: number[];
    sqrtSize: number;
    floraBuffer : ModelBufferSet;


    constructor(gl: WebGLRenderingContext, patch: Patch, depth: number, layersToRecurse: number) {
        super();

        this.patch = patch;
        this.finalDepth = depth + layersToRecurse - 1;

        let quadNormals: vec3[] = [];
        this.floraBuffer = new ModelBufferSet(gl, Flora.treeModel);

        let builder = new BufferSetBuilder();
        this.fractalRecurse(gl, builder, quadNormals, patch, depth, false);

        // console.log(this.floraBuffer.transforms);

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

    fractalRecurse(gl: WebGLRenderingContext, builder: BufferSetBuilder, quadNormals: vec3[], patch: Patch, n: number, barren: boolean) {
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

            let blBiome = patch.getBiome(patch.bl);
            let brBiome = patch.getBiome(patch.br);
            let tlBiome = patch.getBiome(patch.tl);
            let trBiome = patch.getBiome(patch.tr);

            builder.colors.push(blBiome.color[0], blBiome.color[1], blBiome.color[2]);
            builder.colors.push(brBiome.color[0], brBiome.color[1], brBiome.color[2]);
            builder.colors.push(tlBiome.color[0], tlBiome.color[1], tlBiome.color[2]);
            builder.colors.push(trBiome.color[0], trBiome.color[1], trBiome.color[2]);

            let len = builder.vertices.length / 3;
            builder.triangles.push(len - 4, len - 2, len - 3, len - 2, len - 1, len - 3);
        } else {
            let subPatches = patch.divide(n);
            let rand = patch.rng.seededRandom(patch.midpoint);
            let foliage = patch.getBiome(patch.midpoint).foliage;
            if((window as any).test === undefined || foliage > (window as any).test) {
                (window as any).test = foliage;
            }
            if (!barren && rand > foliage && n >= 14) {
                barren = true;
                this.floraBuffer.transforms.push(Flora.getTransform(patch));
            }

            for (let subPatch of subPatches) {
                this.fractalRecurse(gl, builder, quadNormals, subPatch, n + 1, barren);
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
        this.floraBuffer.draw(gl, shader);
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

export class Flora {

    static treeModel: any;
    static rMatrix: mat4;

    static getTransform(patch: Patch) {
        // Translate the model to a location on the patch
        let loc = patch.midpoint;

        // Scale the model based on the size of the patch
        let dif = vec3.create();
        vec3.sub(dif, patch.bl, patch.tr);
        dif[1] = 0;
        let size = vec3.length(dif);
        size /= 20.0;

        let mMatrix = mat4.create();
        // scale
        mMatrix[0] = size;
        mMatrix[5] = size;
        mMatrix[10] = size;
        // translate
        mMatrix[12] = loc[0];
        mMatrix[13] = loc[1];
        mMatrix[14] = loc[2];

        return mat4.multiply(mat4.create(), mMatrix, Flora.rMatrix);
    }
}
