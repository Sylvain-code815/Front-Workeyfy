import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type HoloScreenProps = {
    width?: number;
    height?: number;
    curvature?: number;
    color?: string;
    scanlineDensity?: number;
    scanlineSpeed?: number;
    flicker?: number;
    distortion?: number;
    opacity?: number;
};

const vertexShader = /* glsl */ `
varying vec2 vUv;
uniform float uCurvature;
void main() {
    vUv = uv;
    vec3 pos = position;
    float dx = uv.x - 0.5;
    float dy = uv.y - 0.5;
    pos.z -= (dx * dx + dy * dy * 0.5) * uCurvature;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uScanlineDensity;
uniform float uScanlineSpeed;
uniform float uFlicker;
uniform float uDistortion;
uniform float uOpacity;

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = vUv;
    // Per-scanline horizontal jitter (CRT instability)
    float jitter = (hash21(vec2(floor(uv.y * 220.0), floor(uTime * 14.0))) - 0.5) * uDistortion * 0.015;
    uv.x += jitter;

    // Sharp scanlines — pow shapes the band
    float line = sin(uv.y * uScanlineDensity * 6.28318 + uTime * uScanlineSpeed) * 0.5 + 0.5;
    line = pow(line, 3.0);

    // Soft vignette so it reads as a glow, not a flat panel
    vec2 c = uv - 0.5;
    float vignette = 1.0 - dot(c, c) * 1.7;
    vignette = clamp(vignette, 0.0, 1.0);

    // Random flicker — discrete steps, not smooth
    float flick = mix(1.0, hash21(vec2(floor(uTime * 28.0), 7.3)), uFlicker);

    float intensity = line * vignette * flick;
    float a = intensity * uOpacity;
    gl_FragColor = vec4(uColor * (0.5 + 0.5 * intensity), a);
}
`;

export default function HoloScreen({
    width = 1.6,
    height = 1.0,
    curvature = 0.35,
    color = '#7adcff',
    scanlineDensity = 120,
    scanlineSpeed = 1.2,
    flicker = 0.18,
    distortion = 0.4,
    opacity = 0.9,
}: HoloScreenProps) {
    const matRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) },
            uCurvature: { value: curvature },
            uScanlineDensity: { value: scanlineDensity },
            uScanlineSpeed: { value: scanlineSpeed },
            uFlicker: { value: flicker },
            uDistortion: { value: distortion },
            uOpacity: { value: opacity },
        }),
        // Initial only; subsequent prop changes are pushed via the sync block below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    if (matRef.current) {
        uniforms.uColor.value.set(color);
        uniforms.uCurvature.value = curvature;
        uniforms.uScanlineDensity.value = scanlineDensity;
        uniforms.uScanlineSpeed.value = scanlineSpeed;
        uniforms.uFlicker.value = flicker;
        uniforms.uDistortion.value = distortion;
        uniforms.uOpacity.value = opacity;
    }

    useFrame((_, delta) => {
        uniforms.uTime.value += delta;
    });

    return (
        <mesh>
            <planeGeometry args={[width, height, 64, 32]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
