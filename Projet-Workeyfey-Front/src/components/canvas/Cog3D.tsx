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

    // Bijou Chrome — polished mirror metal with an injected Fresnel rim that
    // makes the silhouette glow when grazing the camera, the way real
    // chrome reads when the room lights wrap around it. The rim picks up
    // the refraction-white tint so the cog harmonizes with the blue/green
    // streams flowing across the page background instead of competing.
    useEffect(() => {
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
                const m = mat as THREE.MeshStandardMaterial;
                if (!('metalness' in m)) return;
                m.metalness = 1;
                m.roughness = 0.1;
                if (m.color) m.color.set('#0a0d14');
                if (m.emissive) m.emissive.set('#cdfbff');
                m.emissiveIntensity = 0.55;
                m.envMapIntensity = 4.5;

                // Inject a Fresnel rim term into the standard shader without
                // forking the material. We piggyback on emissive_fragment so
                // the rim reads as additive light, not as a tinted base.
                m.onBeforeCompile = (shader) => {
                    shader.uniforms.uRimColor = { value: new THREE.Color('#cdfbff') };
                    shader.uniforms.uRimPower = { value: 3.0 };
                    shader.uniforms.uRimStrength = { value: 1.6 };
                    shader.fragmentShader = shader.fragmentShader
                        .replace(
                            '#include <common>',
                            `#include <common>
                             uniform vec3 uRimColor;
                             uniform float uRimPower;
                             uniform float uRimStrength;`,
                        )
                        .replace(
                            '#include <emissivemap_fragment>',
                            `#include <emissivemap_fragment>
                             // pow(1 - dot(N, V), uRimPower) — classic Fresnel
                             // edge factor. Strongest where the surface grazes
                             // the camera, zero where it faces head-on.
                             float fresnelTerm = pow(
                                 clamp(1.0 - dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0),
                                 uRimPower
                             );
                             totalEmissiveRadiance += uRimColor * fresnelTerm * uRimStrength;`,
                        );
                };
                m.needsUpdate = true;
            });
        });
    }, [scene]);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        // Cap delta — frames dropped during fast scroll otherwise produce
        // visible rotation jumps that read as "the cog is spinning faster
        // because I'm scrolling". 1/30 s keeps the idle / drift speeds
        // truly constant from the user's POV.
        const dt = Math.min(delta, 1 / 30);
        const speed = spinning ? ENGAGE_SPEED : hovered ? HOVER_SPEED : IDLE_SPEED;
        groupRef.current.rotation.z -= dt * speed;
        if (yDriftRef.current) {
            yDriftRef.current.rotation.y += dt * Y_DRIFT_SPEED;
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
                <ambientLight intensity={0.22} />
                <directionalLight position={[2, 3, 4]} intensity={0.55} />
                {/* Bijou Chrome lighting matched to the data-flow palette:
                    Roblox blue from one side, FiveM toxic green from the
                    other. The chrome teeth catch both as crisp specular
                    rims that mirror the streams flowing across the page. */}
                <pointLight
                    position={[-1.0, 0.5, 1.3]}
                    intensity={18}
                    distance={5}
                    decay={1.6}
                    color="#1A78FF"
                />
                <pointLight
                    position={[1.0, 0.4, 1.3]}
                    intensity={18}
                    distance={5}
                    decay={1.6}
                    color="#1FE873"
                />
                {/* Top fill — pulls highlights onto the upper bezel so the
                    Fresnel rim has something brighter to roll off into. */}
                <pointLight
                    position={[0, 1.4, 1.6]}
                    intensity={8}
                    distance={5}
                    decay={1.8}
                    color="#FFFFFF"
                />
                <Suspense fallback={null}>
                    <Environment preset="city" />
                    <CogModel spinning={spinning} hovered={hovered} />
                </Suspense>
            </Canvas>
        </div>
    );
}
