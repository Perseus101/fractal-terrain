import { vec3 } from 'gl-matrix';
import Biome from "./biome";

export class BiomeContainer {
    constructor(private biomes: Biome[]) {}

    biomeCount(): number {
        return this.biomes.length;
    }

    createInterpolatedBiome(weights: number[]): Biome {
        if(weights.length !== this.biomes.length) {
            throw new Error("Incorrect biome weight length");
        }
        let newBiome = new Biome(vec3.create(), 0);
        let weightMag = 0;
        for (let i = 0; i < this.biomes.length; i++) {
            let biome = this.biomes[i];
            let weight = weights[i];
            weightMag += weight * weight;

            vec3.add(newBiome.color, newBiome.color, [weight * biome.color[0], weight * biome.color[1], weight * biome.color[2]]);
            newBiome.amplitude += weight * biome.amplitude;
        }
        weightMag = Math.sqrt(weightMag);
        vec3.scale(newBiome.color, newBiome.color, 1/weightMag);
        newBiome.amplitude /= weightMag;
        return newBiome;
    }
}

export default BiomeContainer;