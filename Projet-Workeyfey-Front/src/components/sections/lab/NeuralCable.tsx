import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

type Vec3 = [number, number, number];

type NeuralCableProps = {
    from?: Vec3;
    to?: Vec3;
    tubularSegments?: number;
    radialSegments?: number;
    thickness?: number;
    sag?: number;
    baseColor?: string;
    emissiveColor?: string;
    roughness?: number;
    metalness?: number;
    pulseSpeed?: number;
    pulseIntensity?: number;
    pulseCount?: number;
    braidScale?: number;
};

type CableUniforms = {
    uTime: { value: number };
    uPulseSpeed: { value: number };
    uPulseIntensity: { value: number };
    uPulseCount: { value: number };
    uBraidScale: { value: number };
};

export default function NeuralCable({
    from = [-2, 0.6, 0],
    to = [2, 0.6, 0],
    tubularSegments = 192,
    radialSegments = 20,
    thickness = 0.025,
    sag = 0.4,
    baseColor = '#1a1d24',
    emissiveColor = '#00d9ff',
    roughness = 0.45,
    metalness = 0.6,
    pulseSpeed = 0.4,
    pulseIntensity = 2.5,
    pulseCount = 3,
    braidScale = 32,
}: NeuralCableProps) {
    const uniformsRef = useRef<CableUniforms | null>(null);

    // Catenary-ish curve: parabolic sag between A and B.
    // 4·sag·t·(1-t) approximates a hanging chain for small sags and is cheap.
    const curve = useMemo(() => {
        const a = new THREE.Vector3(...from);
        const b = new THREE.Vector3(...to);
        const samples = 14;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const p = a.clone().lerp(b, t);
            p.y -= 4 * sag * t * (1 - t);
            pts.push(p);
        }
        return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    }, [from, to, sag]);

    const geometry = useMemo(
        () => new THREE.TubeGeometry(curve, tubularSegments, thickness, radialSegments, false),
        [curve, tubularSegments, thickness, radialSegments],
    );

    useEffect(() => () => geometry.dispose(), [geometry]);

    const onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms) => {
        shader.uniforms.uTime = { value: 0 };
        shader.uniforms.uPulseSpeed = { value: pulseSpeed };
        shader.uniforms.uPulseIntensity = { value: pulseIntensity };
        shader.uniforms.uPulseCount = { value: pulseCount };
        shader.uniforms.uBraidScale = { value: braidScale };

        shader.vertexShader = shader.vertexShader
            .replace(
                '#include <common>',
                `#include <common>
                varying vec2 vCableUv;`,
            )
            .replace(
                '#include <uv_vertex>',
                `#include <uv_vertex>
                vCableUv = uv;`,
            );

        shader.fragmentShader = shader.fragmentShader
            .replace(
                '#include <common>',
                `#include <common>
                uniform float uTime;
                uniform float uPulseSpeed;
                uniform float uPulseIntensity;
                uniform float uPulseCount;
                uniform float uBraidScale;
                varying vec2 vCableUv;`,
            )
            .replace(
                '#include <roughnessmap_fragment>',
                `#include <roughnessmap_fragment>
                // Procedural woven braid: diamond pattern via UV
                // vCableUv.x = along tube length, vCableUv.y = around circumference
                float braid = sin(vCableUv.x * uBraidScale * 6.28318)
                            * sin(vCableUv.y * 16.0 * 6.28318);
                roughnessFactor = clamp(roughnessFactor + braid * 0.18, 0.04, 1.0);`,
            )
            .replace(
                '#include <emissivemap_fragment>',
                `#include <emissivemap_fragment>
                // Gaussian data pulses traveling along the cable
                float pulse = 0.0;
                for (float i = 0.0; i < 8.0; i++) {
                    if (i >= uPulseCount) break;
                    float phase = fract(uTime * uPulseSpeed + i / uPulseCount);
                    float d = vCableUv.x - phase;
                    d -= floor(d + 0.5); // wrap distance to [-0.5, 0.5]
                    pulse += exp(-d * d * 600.0);
                }
                totalEmissiveRadiance += emissive * pulse * uPulseIntensity;`,
            );

        uniformsRef.current = shader.uniforms as unknown as CableUniforms;
    };

    useEffect(() => {
        const u = uniformsRef.current;
        if (!u) return;
        u.uPulseSpeed.value = pulseSpeed;
        u.uPulseIntensity.value = pulseIntensity;
        u.uPulseCount.value = pulseCount;
        u.uBraidScale.value = braidScale;
    }, [pulseSpeed, pulseIntensity, pulseCount, braidScale]);

    useFrame((_, delta) => {
        if (uniformsRef.current) {
            uniformsRef.current.uTime.value += delta;
        }
    });

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            <meshStandardMaterial
                color={baseColor}
                emissive={emissiveColor}
                emissiveIntensity={1}
                roughness={roughness}
                metalness={metalness}
                onBeforeCompile={onBeforeCompile}
            />
        </mesh>
    );
}
