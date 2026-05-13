import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
    progressRef: { current: { value: number } };
    origin?: [number, number, number];
    count?: number;
    triggerStart?: number;
    triggerEnd?: number;
}

const VERTEX = /* glsl */ `
    attribute vec3 aDir;
    attribute float aSpeed;
    attribute float aSeed;
    uniform float uProgress;
    uniform float uSize;
    varying float vAlpha;
    varying float vSeed;

    void main() {
        vSeed = aSeed;
        float t = clamp(uProgress, 0.0, 1.0);
        // Ease-out cubic for the burst
        float burst = 1.0 - pow(1.0 - t, 3.0);
        vec3 displaced = position + aDir * aSpeed * burst * 12.0;

        // Particles fade in fast, peak around mid burst, fade out late
        float fadeIn = smoothstep(0.0, 0.15, t);
        float fadeOut = 1.0 - smoothstep(0.7, 1.0, t);
        vAlpha = fadeIn * fadeOut;

        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.4 + 0.6 * sin(aSeed * 6.28)) / max(0.1, -mv.z);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    varying float vAlpha;
    varying float vSeed;

    void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        if (d > 0.5) discard;
        float core = smoothstep(0.5, 0.0, d);
        vec3 col = mix(uColorA, uColorB, vSeed);
        gl_FragColor = vec4(col * core * 1.6, vAlpha * core);
    }
`;

export default function ExplosionParticles({
    progressRef,
    origin = [0, 0, 0],
    count = 1500,
    triggerStart = 0.4,
    triggerEnd = 0.62,
}: Props) {
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const pointsRef = useRef<THREE.Points>(null);

    const geometry = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const dirs = new Float32Array(count * 3);
        const speeds = new Float32Array(count);
        const seeds = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3 + 0] = origin[0];
            positions[i * 3 + 1] = origin[1];
            positions[i * 3 + 2] = origin[2];

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 1;
            dirs[i * 3 + 0] = Math.sin(phi) * Math.cos(theta) * r;
            dirs[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
            dirs[i * 3 + 2] = Math.cos(phi) * r;

            speeds[i] = 0.5 + Math.random() * 1.4;
            seeds[i] = Math.random();
        }

        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3));
        g.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
        g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
        return g;
    }, [count, origin]);

    const uniforms = useMemo(
        () => ({
            uProgress: { value: 0 },
            uSize: { value: 80 },
            uColorA: { value: new THREE.Color('#00E5FF') },
            uColorB: { value: new THREE.Color('#FF2E88') },
        }),
        [],
    );

    useEffect(() => {
        return () => {
            geometry.dispose();
        };
    }, [geometry]);

    useFrame(() => {
        const p = progressRef.current.value;
        const localT = THREE.MathUtils.clamp(
            (p - triggerStart) / (triggerEnd - triggerStart),
            0,
            1,
        );
        uniforms.uProgress.value = localT;
        if (pointsRef.current) {
            pointsRef.current.visible = localT > 0 && localT < 1;
        }
    });

    return (
        <points ref={pointsRef} geometry={geometry} frustumCulled={false} visible={false}>
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                vertexShader={VERTEX}
                fragmentShader={FRAGMENT}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}
