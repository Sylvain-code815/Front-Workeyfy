import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

useGLTF.preload('/cog.glb');

const TARGET_SIZE = 1.5;
const SPIN_DURATION_MS = 420;
const IDLE_SPEED = 0.8;
const HOVER_SPEED = 2.4;
const ENGAGE_SPEED = 10;
const Y_DRIFT_SPEED = 0.18;

type CogModelProps = {
    spinning: boolean;
    hovered: boolean;
};

function CogModel({ spinning, hovered }: CogModelProps) {
    const { scene } = useGLTF('/cog.glb');
    const groupRef = useRef<THREE.Group>(null);
    const yDriftRef = useRef<THREE.Group>(null);

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

    // Glossy-black chrome with cyan-tinted edges. The low cyan emissive
    // makes the rims glow softly even where the environment doesn't reflect,
    // turning the cog into a "noir brillant avec arêtes cyan" object.
    useEffect(() => {
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
                const m = mat as THREE.MeshStandardMaterial;
                if (!('metalness' in m)) return;
                m.metalness = 1;
                m.roughness = 0.08;
                if (m.color) m.color.set('#0a0d14');
                if (m.emissive) m.emissive.set('#00E5FF');
                m.emissiveIntensity = 0.22;
                m.envMapIntensity = 1.6;
                m.needsUpdate = true;
            });
        });
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        const speed = spinning ? ENGAGE_SPEED : hovered ? HOVER_SPEED : IDLE_SPEED;
        groupRef.current.rotation.z -= delta * speed;
        if (yDriftRef.current) {
            yDriftRef.current.rotation.y += delta * Y_DRIFT_SPEED;
        }
    });

    return (
        <group ref={yDriftRef}>
            <group ref={groupRef} scale={fitScale} position={offset}>
                <group rotation={[0, Math.PI / 4, 0]}>
                    <primitive object={scene} />
                </group>
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
                camera={{ position: [0, 5, 2.6], fov: 35 }}
                gl={{ alpha: true, antialias: true }}
                dpr={[1, 2]}
            >
                <ambientLight intensity={0.18} />
                <directionalLight position={[2, 3, 4]} intensity={0.45} />
                {/* Cyan rim — sharp specular hits on the chrome teeth */}
                <pointLight
                    position={[0.6, 0.6, 1.4]}
                    intensity={6.5}
                    distance={6}
                    decay={1.4}
                    color="#00E5FF"
                />
                <Suspense fallback={null}>
                    <Environment preset="city" />
                    <CogModel spinning={spinning} hovered={hovered} />
                </Suspense>
            </Canvas>
        </div>
    );
}
