import { expect } from 'chai';
import 'mocha';

import { PerlinRNG } from "../rng";

describe('PerlinRNG', () => {
    it('Should generate random numbers', () => {
        let rng = new PerlinRNG();
        let noise = [];
        const size = 4;
        for(let x = 0; x < size; x++)
            for(let y = 0; y < size; y++)
                for(let z = 0; z < size; z++)
                    noise.push(rng.noise(x / size, y / size, z / size));

        const offset = 4;
        for(let i = 0; i < noise.length-offset; i++)
            expect(noise[i]).to.not.be.closeTo(noise[i+offset], 0.001);
    });

    it('Should generate numbers near eachother', () => {
        let rng = new PerlinRNG();
        let noise = [];
        const size = 16;
        const scale = 0.0005;
        for(let x = 0; x < size; x++)
            noise.push(rng.noise(x * scale, 0.2, 0.1));

        const offset = 4;
        for(let i = 0; i < noise.length-offset; i++)
            expect(noise[i]).to.be.closeTo(noise[i+offset], 0.005);
    });
});