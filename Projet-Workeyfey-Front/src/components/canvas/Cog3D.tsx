import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Suspense, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

useGLTF.preload('/cog.glb');

const TARGET_SIZE = 1.5;
const SPIN_DURATION_MS = 420;
const IDLE_SPEED = 0.8;
const HOVER_SPEED = 2.4;
const ENGAGE_SPEED = 10;

type CogModelProps = {
    spinning: boolean;
    hovered: boolean;
};

function CogModel({ spinning, hovered }: CogModelProps) {
    const { scene } = useGLTF('/cog.glb');
    const groupRef = useRef<THREE.Group>(null);

    const { fitScale, offset } = useMemo(() => {
        const bbox = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        bbox.getSize(size);
        bbox.getCenter(center);
        const max = Math.max(size.x, size.y, size.z);
        const fit = max > 0 ? TARGET_SIZE / max : 1;
        return {
            fitScale: fit,
            offset: [
                -fit * center.x,
                -fit * center.y,
                -fit * center.z,
            ] as [number, number, number],
        };
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const speed = spinning ? ENGAGE_SPEED : hovered ? HOVER_SPEED : IDLE_SPEED;
        groupRef.current.rotation.z -= delta * speed;
    });

    return (
        <group ref={groupRef} scale={fitScale} position={offset}>
            <group rotation={[0, Math.PI / 4, 0]}>
                <primitive object={scene} />
            </group>
        </group>
    );
}

type Cog3DProps = {
    onActivate?: () => void;
    className?: string;
    ariaLabel?: string;
};

export default function Cog3D({ onActivate, className, ariaLabel }: Cog3DProps) {
    const [hovered, setHovered] = useState(false);
    const [spinning, setSpinning] = useState(false);

    const handleActivate = () => {
        if (spinning) return;
        setSpinning(true);
        window.setTimeout(() => {
            onActivate?.();
            setSpinning(false);
        }, SPIN_DURATION_MS);
    };

    return (
        <div
            className={className}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={handleActivate}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleActivate();
                }
            }}
        >
            <Canvas
                camera={{ position: [0, 0, 2.6], fov: 35 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[2, 3, 4]} intensity={1.1} />
                <directionalLight
                    position={[-2, -1, 2]}
                    intensity={0.5}
                    color="#5EE7E7"
                />
                <Suspense fallback={null}>
                    <CogModel spinning={spinning} hovered={hovered} />
                </Suspense>
            </Canvas>
        </div>
    );
}
