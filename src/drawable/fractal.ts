import { vec3 } from 'gl-matrix';
import { BufferSet, BufferSetBuilder } from './buffer_set';
import { Shader } from '../shaders/shader';
import { Environment } from './environment';
import RNG from '../rng';

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

    constructor(bl: vec3, br: vec3, tl: vec3, tr: vec3, rng: RNG) {
        this.bl = bl;
        this.br = br;
        this.tl = tl;
        this.tr = tr;
        this.rng = rng;

        this.computeMidpoint();
    }

    private computeMidpoint() {
        this.midpoint = vec3.create();

        vec3.add(this.midpoint, this.bl, this.tl);
        vec3.add(this.midpoint, this.midpoint, this.tr);
        vec3.add(this.midpoint, this.midpoint, this.br);
        vec3.scale(this.midpoint, this.midpoint, 1 / 4);
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

        midLeft[1] += this.rng.expRand(midLeft, currentDepth);
        midTop[1] += this.rng.expRand(midTop, currentDepth);
        midRight[1] += this.rng.expRand(midRight, currentDepth);
        midBottom[1] += this.rng.expRand(midBottom, currentDepth);
        midpoint[1] += this.rng.expRand(midpoint, currentDepth);

        return [
            new Patch(this.bl, midBottom, midLeft, midpoint, this.rng), //bottom left corner
            new Patch(midBottom, this.br, midpoint, midRight, this.rng), //bottom right corner
            new Patch(midLeft, midpoint, this.tl, midTop, this.rng), //top left corner
            new Patch(midpoint, midRight, midTop, this.tr, this.rng) //top right corner
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
                return new Patch(bl, br, tl, tr, this.rng);
            }
            case Quadrant.Br: {
                let br = anchor;
                let bl = pX;
                let tr = pY;
                let tl = pXY;
                return new Patch(bl, br, tl, tr, this.rng);
            }
            case Quadrant.Tl: {
                let tl = anchor;
                let tr = pX;
                let bl = pY;
                let br = pXY;
                return new Patch(bl, br, tl, tr, this.rng);
            }
            case Quadrant.Tr: {
                let tr = anchor;
                let tl = pX;
                let br = pY;
                let bl = pXY;
                return new Patch(bl, br, tl, tr, this.rng);
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
        // console.log(pos[1], newY);
        if (newY != pos[1]) {
            pos[1] = newY + 0.1;
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

    constructor(private gl: WebGLRenderingContext, public patch: Patch, private depth: number, private layerToBuffer: number, private isRoot) {
        super();
    }

    recurse(): FractalNode {
        this.recurseOnce();
        if (this.bl && this.bl instanceof FractalNode)
            this.bl.recurse();
        if (this.br && this.br instanceof FractalNode)
            this.br.recurse();
        if (this.tl && this.tl instanceof FractalNode)
            this.tl.recurse();
        if (this.tr && this.tr instanceof FractalNode)
            this.tr.recurse();
        return this;
    }

    recurseOnce(): FractalNode {
        let subs = this.patch.divide(this.depth);
        if (this.depth == this.layerToBuffer - 1) {
            if (!this.bl)
                this.bl = new BufferedFractal(this.gl, subs[0], this.depth + 1, 6);
            if (!this.br)
                this.br = new BufferedFractal(this.gl, subs[1], this.depth + 1, 6);
            if (!this.tl)
                this.tl = new BufferedFractal(this.gl, subs[2], this.depth + 1, 6);
            if (!this.tr)
                this.tr = new BufferedFractal(this.gl, subs[3], this.depth + 1, 6);
        } else {
            if (!this.bl)
                this.bl = new FractalNode(this.gl, subs[0], this.depth + 1, this.layerToBuffer, false);
            if (!this.br)
                this.br = new FractalNode(this.gl, subs[1], this.depth + 1, this.layerToBuffer, false);
            if (!this.tl)
                this.tl = new FractalNode(this.gl, subs[2], this.depth + 1, this.layerToBuffer, false);
            if (!this.tr)
                this.tr = new FractalNode(this.gl, subs[3], this.depth + 1, this.layerToBuffer, false);
        }
        return this;
    }

    recurseOnceIfNeeded(): FractalNode {
        if (!this.bl || !this.br || !this.tl || !this.tr)
            this.recurseOnce();
        return this;
    }

    /**
     * Updates the tree with new nodes if the player is close enough, and will delete nodes too far from the player
     * @param playerPosition the current position of the player
     */
    expandAndPruneTree(playerPosition: vec3) {
        let renderCutoff = 5;
        let despawnCutoff = 6;
        if (this.isRoot) {
            if (Math.abs(playerPosition[0] - this.patch.bl[0]) < renderCutoff) {
                if (vec3.squaredDistance(this.patch.bl, playerPosition) < vec3.squaredDistance(this.patch.tl, playerPosition))
                    this.becomeNewRoot(Quadrant.Tr);
                else
                    this.becomeNewRoot(Quadrant.Br);
            }
            if (Math.abs(playerPosition[0] - this.patch.br[0]) < renderCutoff) {
                if (vec3.squaredDistance(this.patch.br, playerPosition) < vec3.squaredDistance(this.patch.tr, playerPosition))
                    this.becomeNewRoot(Quadrant.Tl);
                else
                    this.becomeNewRoot(Quadrant.Bl);
            }
            if (Math.abs(playerPosition[2] - this.patch.tl[2]) < renderCutoff) {
                if (vec3.squaredDistance(this.patch.tl, playerPosition) < vec3.squaredDistance(this.patch.tr, playerPosition))
                    this.becomeNewRoot(Quadrant.Br);
                else
                    this.becomeNewRoot(Quadrant.Bl);
            }
            if (Math.abs(playerPosition[2] - this.patch.bl[2]) < renderCutoff) {
                if (vec3.squaredDistance(this.patch.bl, playerPosition) < vec3.squaredDistance(this.patch.br, playerPosition))
                    this.becomeNewRoot(Quadrant.Tr);
                else
                    this.becomeNewRoot(Quadrant.Tl);
            }
        }

        let circumscribed = vec3.distance(this.patch.bl, this.patch.br) * Math.sqrt(2);
        if (vec3.squaredDistance(this.patch.midpoint, playerPosition) < Math.pow(renderCutoff + circumscribed, 2)) {
            this.recurseOnceIfNeeded();
            if (this.bl instanceof FractalNode)
                this.bl.expandAndPruneTree(playerPosition);
            if (this.br instanceof FractalNode)
                this.br.expandAndPruneTree(playerPosition);
            if (this.tl instanceof FractalNode)
                this.tl.expandAndPruneTree(playerPosition);
            if (this.tr instanceof FractalNode)
                this.tr.expandAndPruneTree(playerPosition);
        } else if (vec3.squaredDistance(this.patch.midpoint, playerPosition) > Math.pow(despawnCutoff + circumscribed, 2)) {
            this.bl = undefined;
            this.br = undefined;
            this.tl = undefined;
            this.tr = undefined;
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
    }

    /**
     * Performs a shallow clone
     */
    clone(): FractalNode {
        let clone = new FractalNode(this.gl, this.patch, this.depth, this.layerToBuffer, this.isRoot);
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

//This is a leaf of a fractal tree, and actually contains buffer data that can be drawn
export class BufferedFractal extends Fractal {
    finalDepth : number;
    quadNormals : vec3[];
    buffers: BufferSet;
    patch: Patch;
    saved_vertices: number[];
    sqrtSize: number;

    constructor(gl: WebGLRenderingContext, patch: Patch, depth: number, layersToRecurse: number) {
        super();
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
