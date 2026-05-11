import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef, useState } from 'react';
import * as THREE from 'three';

const SPIN_DURATION_MS = 420;
const IDLE_SPEED = 0.5;
const HOVER_SPEED = 1.6;
const ENGAGE_SPEED = 8;
const ACCENT = '#5EE7E7';

type GlobeMeshProps = {
    spinning: boolean;
    hovered: boolean;
};

function GlobeMesh({ spinning, hovered }: GlobeMeshProps) {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const speed = spinning ? ENGAGE_SPEED : hovered ? HOVER_SPEED : IDLE_SPEED;
        groupRef.current.rotation.y += delta * speed;
    });

    return (
        <group ref={groupRef}>
            <mesh>
                <sphereGeometry args={[0.88, 32, 32]} />
                <meshBasicMaterial
                    color={ACCENT}
                    transparent
                    opacity={0.1}
                    toneMapped={false}
                />
            </mesh>

            <mesh>
                <sphereGeometry args={[1, 14, 10]} />
                <meshBasicMaterial
                    color={ACCENT}
                    wireframe
                    transparent
                    opacity={0.75}
                    toneMapped={false}
                />
            </mesh>

            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1, 0.014, 10, 64]} />
                <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            <mesh>
                <torusGeometry args={[1, 0.014, 10, 64]} />
                <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[1, 0.014, 10, 64]} />
                <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
        </group>
    );
}

type Globe3DProps = {
    onActivate?: () => void;
    className?: string;
    ariaLabel?: string;
};

export default function Globe3D({
    onActivate,
    className,
    ariaLabel,
}: Globe3DProps) {
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
                camera={{ position: [0, 0, 4.2], fov: 32 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, window.matchMedia('(max-width: 768px)').matches ? 1.5 : 2]}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[2, 3, 4]} intensity={0.8} />
                <Suspense fallback={null}>
                    <GlobeMesh spinning={spinning} hovered={hovered} />
                </Suspense>
            </Canvas>
        </div>
    );
}
