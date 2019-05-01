import { vec3 } from 'gl-matrix';

export class Biome {
    constructor(
        public color: vec3,
        public amplitude: number,
        public foliage: number,
    ) {}
}

export default Biome;