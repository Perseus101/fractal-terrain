import { vec3 } from "gl-matrix";
import { Drawable } from "./drawable";

export interface Environment extends Drawable {
    //returns true if a collision occured
    updatePositionGivenCollisions(pos: vec3): boolean;
}
