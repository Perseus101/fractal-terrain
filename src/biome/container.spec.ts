import { expect } from 'chai';
import 'mocha';

import { vec3 } from 'gl-matrix';

import { BiomeContainer, BiomeQuad } from './container';
import Biome from './biome';

describe('BiomeContainer', () => {
    it('Should hold several biomes', () => {
        let biomes = new BiomeContainer([
            new Biome(vec3.fromValues(1, 0, 0), 1, 0.99),
            new Biome(vec3.fromValues(0, 1, 0), 0, 0.99),
            new Biome(vec3.fromValues(0, 0, 1), 0.5, 0.99),
        ]);
        expect(biomes).to.not.be.null;
    });
    it('Should interpolate between biomes', () => {
        let biome1 = new Biome(vec3.fromValues(1, 0, 0), 1, 0.99)
        let biome2 = new Biome(vec3.fromValues(0, 1, 0), 0, 0.99)
        let biome3 = new Biome(vec3.fromValues(0, 0, 1), 0.5, 0.99)

        let biomes = new BiomeContainer([biome1, biome2, biome3]);
        expect(biomes.createInterpolatedBiome([1, 0, 0])).to.eql(biome1);
        expect(biomes.createInterpolatedBiome([0, 1, 0])).to.eql(biome2);
        expect(biomes.createInterpolatedBiome([0, 0, 1])).to.eql(biome3);

        expect(biomes.createInterpolatedBiome([1, 1, 0]).amplitude).to.be.closeTo(0.5, 0.000001);
        expect(biomes.createInterpolatedBiome([0.5, 0.5, 0]).amplitude).to.be.closeTo(0.5, 0.000001);

    });
});

describe('BiomeQuad', () => {
    it('interpolates between biomes', () => {
        let biome1 = new Biome(vec3.fromValues(0, 0, 0), 0, 0.99);
        let biome2 = new Biome(vec3.fromValues(0, 1, 0), 0.25, 0.99);
        let biome3 = new Biome(vec3.fromValues(1, 0, 0), 0.5, 0.99);
        let biome4 = new Biome(vec3.fromValues(1, 1, 0), 0.75, 0.99);

        let biomes = new BiomeContainer([biome1, biome2, biome3, biome4]);

        let quad = new BiomeQuad(biomes, [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], [
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 0, 1),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(1, 0, 1)
        ]);

        expect(quad.bilerp(vec3.fromValues(0, 0, 0))).to.eql(biome1);
        expect(quad.bilerp(vec3.fromValues(0, 0, 1))).to.eql(biome2);
        expect(quad.bilerp(vec3.fromValues(1, 0, 0))).to.eql(biome3);
        expect(quad.bilerp(vec3.fromValues(1, 0, 1))).to.eql(biome4);

        expect(quad.bilerp(vec3.fromValues(0, 0, 0.5))).to.eql(new Biome(vec3.fromValues(0, 0.5, 0), 0.125, 0.99));
        expect(quad.bilerp(vec3.fromValues(0.5, 0, 0))).to.eql(new Biome(vec3.fromValues(0.5, 0, 0), 0.25, 0.99));
        expect(quad.bilerp(vec3.fromValues(0.5, 0, 0.5))).to.eql(new Biome(vec3.fromValues(0.5, 0.5, 0), 0.375, 0.99));
    });

    it('interpolates correctly in negative quadrant', () => {
        let biome1 = new Biome(vec3.fromValues(0, 0, 0), 0, 0.99);
        let biome2 = new Biome(vec3.fromValues(0, 1, 0), 0.25, 0.99);
        let biome3 = new Biome(vec3.fromValues(1, 0, 0), 0.5, 0.99);
        let biome4 = new Biome(vec3.fromValues(1, 1, 0), 0.75, 0.99);

        let biomes = new BiomeContainer([biome1, biome2, biome3, biome4]);

        let quad = new BiomeQuad(biomes, [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], [
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(-1, 0, 0),
            vec3.fromValues(-1, 0, -1)
        ]);

        expect(quad.bilerp(vec3.fromValues(0, 0, -0.5))).to.eql(new Biome(vec3.fromValues(0, 0.5, 0), 0.125, 0.99));
        expect(quad.bilerp(vec3.fromValues(-0.5, 0, 0))).to.eql(new Biome(vec3.fromValues(0.5, 0, 0), 0.25, 0.99));
        expect(quad.bilerp(vec3.fromValues(-0.5, 0, -0.5))).to.eql(new Biome(vec3.fromValues(0.5, 0.5, 0), 0.375, 0.99));
    });


    it('interpolates correctly in pos/neg quadrant', () => {
        let biome1 = new Biome(vec3.fromValues(0, 0, 0), 0, 0.99);
        let biome2 = new Biome(vec3.fromValues(0, 1, 0), 0.25, 0.99);
        let biome3 = new Biome(vec3.fromValues(1, 0, 0), 0.5, 0.99);
        let biome4 = new Biome(vec3.fromValues(1, 1, 0), 0.75, 0.99);

        let biomes = new BiomeContainer([biome1, biome2, biome3, biome4]);

        let quad = new BiomeQuad(biomes, [
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ], [
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 0, -1),
            vec3.fromValues(1, 0, 0),
            vec3.fromValues(1, 0, -1)
        ]);

        expect(quad.bilerp(vec3.fromValues(0, 0, -0.5))).to.eql(new Biome(vec3.fromValues(0, 0.5, 0), 0.125, 0.99));
        expect(quad.bilerp(vec3.fromValues(0.5, 0, 0))).to.eql(new Biome(vec3.fromValues(0.5, 0, 0), 0.25, 0.99));
        expect(quad.bilerp(vec3.fromValues(0.5, 0, -0.5))).to.eql(new Biome(vec3.fromValues(0.5, 0.5, 0), 0.375, 0.99));
    });
});