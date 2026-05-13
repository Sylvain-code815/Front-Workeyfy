import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

type BlobSpec = {
    color: string;
    base: [number, number, number];
    drift: [number, number, number];
    period: [number, number, number];
    radius: number;
    speed: number;
};

// Section 3 palette aligned with the page-wide Roblox blue / FiveM green
// data-fluid theme. Magenta and pink are out — they fight the cohesion
// established in Sections 1 and 2.
const BLOBS: BlobSpec[] = [
    {
        // Roblox deep blue — anchors the left half.
        color: '#1A78FF',
        base: [-3.4, 1.6, -1],
        drift: [0.6, 0.5, 0.4],
        period: [9, 11, 13],
        radius: 2.6,
        speed: 1.5,
    },
    {
        // FiveM toxic green — dominates the right half.
        color: '#4ADE80',
        base: [3.2, -1.3, -0.6],
        drift: [0.55, 0.6, 0.45],
        period: [10.5, 8.5, 12],
        radius: 2.8,
        speed: 1.5,
    },
    {
        // Bright cyan accent where the streams kiss — a refraction tone.
        color: '#7FE3FF',
        base: [2.4, 2.2, -1.4],
        drift: [0.5, 0.45, 0.35],
        period: [12, 13.5, 9.5],
        radius: 2.2,
        speed: 1.5,
    },
    {
        // Saturated emerald to deepen the green field on the right/bottom.
        color: '#1FE873',
        base: [-2.8, -1.9, -1.2],
        drift: [0.6, 0.55, 0.4],
        period: [11.5, 10, 14],
        radius: 2.4,
        speed: 1.5,
    },
];

function Blob({ spec }: { spec: BlobSpec }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() * 0.18;
        ref.current.position.set(
            spec.base[0] + Math.sin((t * 2 * Math.PI) / spec.period[0]) * spec.drift[0],
            spec.base[1] + Math.cos((t * 2 * Math.PI) / spec.period[1]) * spec.drift[1],
            spec.base[2] + Math.sin((t * 2 * Math.PI) / spec.period[2]) * spec.drift[2],
        );
    });

    return (
        <mesh ref={ref} position={spec.base}>
            <icosahedronGeometry args={[spec.radius, 24]} />
            <MeshDistortMaterial
                color={spec.color}
                emissive={spec.color}
                emissiveIntensity={0.55}
                roughness={0.4}
                metalness={0}
                speed={spec.speed}
                distort={0.4}
                toneMapped={false}
            />
        </mesh>
    );
}

function BlobsScene() {
    return (
        <>
            {/* Match the deep void used by GlobalFluidMesh, not the old purple-
                tinted #0a0419 — keeps Section 3 in the same chromatic family. */}
            <color attach="background" args={['#02050a']} />
            <ambientLight intensity={0.45} />
            <pointLight position={[6, 4, 6]} color="#FFFFFF" intensity={0.8} />
            <pointLight position={[-6, -4, 4]} color="#FFFFFF" intensity={0.5} />
            {BLOBS.map((spec, i) => (
                <Blob key={i} spec={spec} />
            ))}
        </>
    );
}

type Props = {
    className?: string;
};

export default function MeshGradientBackground({ className }: Props) {
    return (
        <Canvas
            className={className}
            camera={{ position: [0, 0, 7], fov: 38 }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, powerPreference: 'low-power' }}
        >
            <BlobsScene />
        </Canvas>
    );
}
