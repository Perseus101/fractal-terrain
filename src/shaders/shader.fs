precision mediump float; // set float to medium precision

// eye location
uniform vec3 uEyePosition; // the eye's position in world

// light properties
uniform vec3 uLightAmbient; // the light's ambient color
uniform vec3 uLightDiffuse; // the light's diffuse color
uniform vec3 uLightSpecular; // the light's specular color
uniform vec3 uLightPosition; // the light's position

// material properties
uniform vec3 uAmbient; // the ambient reflectivity
uniform vec3 uDiffuse; // the diffuse reflectivity
uniform vec3 uSpecular; // the specular reflectivity
uniform float uShininess; // the specular exponent

// // texture properties
// uniform bool uUsingTexture; // if we are using a texture
// uniform sampler2D uTexture; // the texture for the fragment
// varying vec2 vVertexUV; // texture uv of fragment

// geometry properties
varying vec3 vWorldPos; // world xyz of fragment
varying vec3 vVertexNormal; // normal of fragment

void main(void) {

    // ambient term
    vec3 ambient = uAmbient*uLightAmbient;

    // diffuse term
    vec3 normal = normalize(vVertexNormal);
    vec3 light = normalize(uLightPosition - vWorldPos);
    float lambert = max(0.0,dot(normal,light));
    vec3 diffuse = uDiffuse*uLightDiffuse*lambert; // diffuse term

    // specular term
    vec3 eye = normalize(uEyePosition - vWorldPos);
    vec3 halfVec = normalize(light+eye);
    float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
    vec3 specular = uSpecular*uLightSpecular*highlight; // specular term

    // combine to find lit color
    vec3 litColor = ambient + diffuse + specular;

    gl_FragColor = vec4(litColor, 1.0);
} // end main