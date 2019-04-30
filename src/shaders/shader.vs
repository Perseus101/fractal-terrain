attribute vec3 aVertexPosition; // vertex position
attribute vec3 aVertexNormal; // vertex normal
attribute vec3 aVertexColor; // vertex color

//attribute vec2 aVertexUV; // vertex texture uv

uniform mat4 umMatrix; // the model matrix
uniform mat4 upvmMatrix; // the project view model matrix

varying vec3 vWorldPos; // interpolated world position of vertex
varying vec3 vVertexNormal; // interpolated normal for frag shader
varying vec3 vVertexColor; // interpolated vertex color
//varying vec2 vVertexUV; // interpolated uv for frag shader

void main(void) {

    // vertex position
    vec4 vWorldPos4 = umMatrix * vec4(aVertexPosition, 1.0);
    vWorldPos = vWorldPos4.xyz;
    gl_Position = upvmMatrix * vec4(aVertexPosition, 1.0);

    // vertex normal (assume no non-uniform scale)
    vec4 vWorldNormal4 = umMatrix * vec4(aVertexNormal, 0.0);
    vVertexNormal = normalize(vWorldNormal4.xyz);

    vVertexColor = aVertexColor;

    // vertex uv
    //vVertexUV = aVertexUV;
}
