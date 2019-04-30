import { expect } from 'chai';
import 'mocha';

import { vec3 } from 'gl-matrix';

import BiomeContainer from './container';
import Biome from './biome';

describe('BiomeContainer', () => {
    it('Should hold several biomes', () => {
        let biomes = new BiomeContainer([
            new Biome(vec3.fromValues(1, 0, 0), 1),
            new Biome(vec3.fromValues(0, 1, 0), 0),
            new Biome(vec3.fromValues(0, 0, 1), 0.5),
        ]);
        expect(biomes).to.not.be.null;
    });
    it('Should interpolate between biomes', () => {
        let biome1 = new Biome(vec3.fromValues(1, 0, 0), 1)
        let biome2 = new Biome(vec3.fromValues(0, 1, 0), 0)
        let biome3 = new Biome(vec3.fromValues(0, 0, 1), 0.5)

        let biomes = new BiomeContainer([biome1, biome2, biome3]);
        expect(biomes.createInterpolatedBiome([1, 0, 0])).to.eql(biome1);
        expect(biomes.createInterpolatedBiome([0, 1, 0])).to.eql(biome2);
        expect(biomes.createInterpolatedBiome([0, 0, 1])).to.eql(biome3);

        expect(biomes.createInterpolatedBiome([1, 1, 0]).amplitude).to.be.closeTo(Math.sqrt(2)/2, 0.000001);
    });
});