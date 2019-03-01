precision mediump float; // set float to medium precision

// eye location
uniform vec3 uEyePosition; // the eye's position in world
uniform vec3 uLookAt; // vector that indicates where the player is looking

// light properties
uniform vec3 uSunAmbient; // the light's ambient color
uniform vec3 uSunSpecular; // the light's specular color

uniform vec3 uMoonAmbient; // the light's ambient color
uniform vec3 uMoonDiffuse; // the light's diffuse color
uniform vec3 uMoonSpecular; // the light's specular color

uniform vec3 uSunDirection; // the direction of the sun

uniform float uFlashLightOn; // the power/color of the flashLight

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
    vec3 ambient = uAmbient*uSunAmbient;

    // sunset
    vec3 modifiedSun = vec3(0.4 + abs(uSunDirection.y) * 0.6, max(0.5, abs(uSunDirection.y)), max(0.5, min(0.92, abs(uSunDirection.y))));

    // sun diffuse
    vec3 normal = normalize(vVertexNormal);
    vec3 sunLight = uSunDirection;
    float sunLambert = max(0.0,dot(normal,sunLight));
    vec3 sunDiffuse = uDiffuse*modifiedSun*sunLambert; // diffuse from sun

    // moon diffuse
    vec3 moonLight = uSunDirection * -1.0;
    float moonLambert = max(0.0,dot(normal,moonLight));
    vec3 moonDiffuse = uDiffuse*uMoonDiffuse*moonLambert; // diffuse from moon

    // flashlight diffuse
    vec3 eyeOffset = uEyePosition - vWorldPos;
    vec3 eye = normalize(eyeOffset);
    float flashLightLambert = max(0.0,dot(normal,eye));

    // specular term
    vec3 halfVec = normalize(sunLight+eye);
    float highlight = pow(max(0.0,dot(normal,halfVec)),uShininess);
    vec3 specular = uSpecular*uSunSpecular*highlight; // specular term

    // don't use flashLight if angle is too steep
    float angle = dot(uLookAt, eye * -1.0);
    float lightValue = pow(angle, 4.0) * uFlashLightOn / pow(max(1.0, length(eyeOffset)*4.0), 2.0);
    vec3 flashLightDiffuse;
    flashLightDiffuse = uDiffuse*flashLightLambert * lightValue;

    // combine to find lit color
    vec3 litColor = ambient + sunDiffuse + moonDiffuse + flashLightDiffuse;

    gl_FragColor = vec4(litColor, 1.0);
} // end main
