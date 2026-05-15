import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type DataPortProps = {
    bodyColor?: string;
    bodyMetalness?: number;
    bodyRoughness?: number;
    accentColor?: string;
    socketColor?: string;
    glowColor?: string;
    glowIntensity?: number;
    breathSpeed?: number;
    breathDepth?: number;
};

export default function DataPort({
    bodyColor = '#2a2c30',
    bodyMetalness = 1,
    bodyRoughness = 0.18,
    accentColor = '#3a3d44',
    socketColor = '#0a0b0e',
    glowColor = '#00d9ff',
    glowIntensity = 2.4,
    breathSpeed = 1.2,
    breathDepth = 0.45,
}: DataPortProps) {
    const ringRef = useRef<THREE.MeshStandardMaterial>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const breath = 1 - breathDepth + breathDepth * (0.5 + 0.5 * Math.sin(t * breathSpeed));
        if (ringRef.current) {
            ringRef.current.emissiveIntensity = glowIntensity * breath;
        }
        if (lightRef.current) {
            lightRef.current.intensity = 0.6 * breath;
        }
    });

    return (
        <group>
            {/* Outer frame */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.9, 0.9, 0.32]} />
                <meshStandardMaterial
                    color={bodyColor}
                    metalness={bodyMetalness}
                    roughness={bodyRoughness}
                />
            </mesh>

            {/* Bevel plate (slightly forward, slightly smaller) */}
            <mesh position={[0, 0, 0.165]}>
                <boxGeometry args={[0.82, 0.82, 0.02]} />
                <meshStandardMaterial
                    color={accentColor}
                    metalness={bodyMetalness}
                    roughness={Math.max(0, bodyRoughness - 0.06)}
                />
            </mesh>

            {/* Recessed socket cavity */}
            <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.26, 0.26, 0.2, 48]} />
                <meshStandardMaterial
                    color={socketColor}
                    metalness={0.4}
                    roughness={0.7}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Bright emissive ring at the socket entrance */}
            <mesh position={[0, 0, 0.176]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.27, 0.012, 16, 64]} />
                <meshStandardMaterial
                    ref={ringRef}
                    color={glowColor}
                    emissive={glowColor}
                    emissiveIntensity={glowIntensity}
                    toneMapped={false}
                />
            </mesh>

            {/* Tiny inner light to spill onto socket walls */}
            <pointLight
                ref={lightRef}
                position={[0, 0, 0.05]}
                color={glowColor}
                intensity={0.6}
                distance={0.6}
                decay={2}
            />

            {/* 4 corner screws */}
            {[
                [-0.35, 0.35],
                [0.35, 0.35],
                [-0.35, -0.35],
                [0.35, -0.35],
            ].map(([x, y], i) => (
                <mesh key={i} position={[x, y, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
                    <meshStandardMaterial
                        color={accentColor}
                        metalness={1}
                        roughness={0.32}
                    />
                </mesh>
            ))}

            {/* Side vents (thin strips on left/right edges) */}
            {[-0.41, 0.41].map((x) => (
                <mesh key={x} position={[x, 0, 0.16]}>
                    <boxGeometry args={[0.01, 0.6, 0.04]} />
                    <meshStandardMaterial
                        color={socketColor}
                        metalness={0.6}
                        roughness={0.5}
                    />
                </mesh>
            ))}
        </group>
    );
}
