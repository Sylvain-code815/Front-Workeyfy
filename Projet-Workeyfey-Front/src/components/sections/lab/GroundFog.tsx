import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type GroundFogProps = {
    size?: number;
    color?: string;
    speed?: number;
    density?: number;
    frequency?: number;
    height?: number;
};

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Ashima Arts / Stefan Gustavson — simplex noise 2D (public domain)
const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uDensity;
uniform float uFrequency;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m; m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x  = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

void main() {
    vec2 p = vUv * uFrequency;
    p.y += uTime * uSpeed;
    // Two octaves — base flow + finer detail drifting against it
    float n1 = snoise(p) * 0.5 + 0.5;
    float n2 = snoise(p * 2.3 + vec2(11.0, -uTime * uSpeed * 0.6)) * 0.5 + 0.5;
    float n  = n1 * 0.7 + n2 * 0.3;

    // Density: smoothstep maps the high end of noise to visible fog
    float a = smoothstep(1.0 - uDensity, 1.0, n);

    // Soft circular edge fade so the slab doesn't show its border
    vec2 e = abs(vUv - 0.5) * 2.0;
    float edge = 1.0 - smoothstep(0.55, 1.0, length(e));

    gl_FragColor = vec4(uColor, a * edge);
}
`;

export default function GroundFog({
    size = 14,
    color = '#a8b8cc',
    speed = 0.04,
    density = 0.6,
    frequency = 2.4,
    height = 0,
}: GroundFogProps) {
    const matRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) },
            uSpeed: { value: speed },
            uDensity: { value: density },
            uFrequency: { value: frequency },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    if (matRef.current) {
        uniforms.uColor.value.set(color);
        uniforms.uSpeed.value = speed;
        uniforms.uDensity.value = density;
        uniforms.uFrequency.value = frequency;
    }

    useFrame((_, delta) => {
        uniforms.uTime.value += delta;
    });

    return (
        <mesh position={[0, height, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[size, size, 1, 1]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
            />
        </mesh>
    );
}
