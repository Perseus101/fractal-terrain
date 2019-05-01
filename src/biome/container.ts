import { vec3 } from 'gl-matrix';
import Biome from "./biome";

function softmax(arr: number[]): number[] {
    return arr.map((value: number, index: number) => {
      return Math.exp(value) / arr.map( (y) => { return Math.exp(y) } ).reduce( (a,b) => { return a+b })
    })
}

export class BiomeContainer {
    constructor(private biomes: Biome[]) {}

    biomeCount(): number {
        return this.biomes.length;
    }

    createInterpolatedBiome(weights: number[]): Biome {
        let softmaxWeights = softmax(weights);
        if(weights.length !== this.biomes.length) {
            throw new Error("Incorrect biome weight length");
        }
        let newBiome = new Biome(vec3.create(), 0, 0);
        let weightMag = 0;
        let softmaxMag = 0;
        for (let i = 0; i < this.biomes.length; i++) {
            let biome = this.biomes[i];
            let weight = weights[i];
            weightMag += weight;
            softmaxMag += softmaxWeights[i];

            vec3.add(newBiome.color, newBiome.color, [weight * biome.color[0], weight * biome.color[1], weight * biome.color[2]]);
            newBiome.amplitude += weight * biome.amplitude;
            newBiome.foliage += softmaxWeights[i] * biome.foliage;
        }
        vec3.scale(newBiome.color, newBiome.color, 1/weightMag);
        newBiome.amplitude /= weightMag;
        newBiome.foliage /= softmaxMag;
        return newBiome;
    }
}

export class BiomeQuad {

    x1: number;
    y1: number;
    x2: number;
    y2: number;

    // Precalculated coefficient
    c: number;
    constructor(
        public biomeContainer: BiomeContainer,
        private biomeWeights: number[][],
        quadCoords: vec3[]
    ) {
        this.x1 = quadCoords[0][0];
        this.y1 = quadCoords[0][2];

        this.x2 = quadCoords[3][0];
        this.y2 = quadCoords[3][2];

        this.c = 1 / ((this.x2 - this.x1)*(this.y2 - this.y1))
    }

    bilerp(coord: vec3): Biome {
        let x = coord[0];
        let y = coord[2];

        let dx1 = x - this.x1;
        let dy1 = y - this.y1;
        let dx2 = this.x2 - x;
        let dy2 = this.y2 - y;

        let newWeights = [];
        let q11 = this.biomeWeights[0];
        let q21 = this.biomeWeights[2];
        let q12 = this.biomeWeights[1];
        let q22 = this.biomeWeights[3];
        for(let i = 0; i < q11.length; i++) {
            let weight = this.c * (
                (q11[i] * dx2 * dy2) +
                (q21[i] * dx1 * dy2) +
                (q12[i] * dx2 * dy1) +
                (q22[i] * dx1 * dy1)
            );
            newWeights.push(weight);
        }

        return this.biomeContainer.createInterpolatedBiome(newWeights);
    }
}