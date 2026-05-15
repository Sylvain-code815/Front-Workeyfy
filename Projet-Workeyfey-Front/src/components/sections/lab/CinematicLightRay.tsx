import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type CinematicLightRayProps = {
    length?: number;
    radiusTop?: number;
    radiusBottom?: number;
    color?: string;
    opacity?: number;
    falloff?: number;
    sweepSpeed?: number;
};

const vertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mv.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vViewNormal;
varying vec3 vViewPosition;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uFalloff;
uniform float uSweepSpeed;

void main() {
    // Longitudinal fade: source bright, taper to nothing at the far end
    float longF = (1.0 - smoothstep(0.0, 0.95, vUv.y));
    longF *= smoothstep(0.0, 0.08, vUv.y); // soft start at emitter

    // Fresnel-style silhouette glow — denser air seen edge-on
    vec3 view = normalize(vViewPosition);
    float ndotv = abs(dot(normalize(vViewNormal), view));
    float fresnel = pow(1.0 - ndotv, uFalloff);

    // Very slow breathing sweep — dust drifting through the beam
    float pulse = 0.80 + 0.20 * sin(uTime * uSweepSpeed);

    float a = longF * fresnel * uOpacity * pulse;
    gl_FragColor = vec4(uColor, a);
}
`;

export default function CinematicLightRay({
    length = 4,
    radiusTop = 0.08,
    radiusBottom = 1.2,
    color = '#e8d8b0',
    opacity = 0.55,
    falloff = 2.2,
    sweepSpeed = 0.35,
}: CinematicLightRayProps) {
    const matRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
            uFalloff: { value: falloff },
            uSweepSpeed: { value: sweepSpeed },
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    if (matRef.current) {
        uniforms.uColor.value.set(color);
        uniforms.uOpacity.value = opacity;
        uniforms.uFalloff.value = falloff;
        uniforms.uSweepSpeed.value = sweepSpeed;
    }

    useFrame((_, delta) => {
        uniforms.uTime.value += delta;
    });

    return (
        // Default cylinder axis = Y. Position pivot at top emitter point.
        <mesh position={[0, length / 2, 0]}>
            <cylinderGeometry args={[radiusTop, radiusBottom, length, 48, 1, true]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
