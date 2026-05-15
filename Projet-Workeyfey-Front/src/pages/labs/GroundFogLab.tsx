import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { folder, useControls } from 'leva';
import GroundFog from '../../components/sections/lab/GroundFog';
import '../LabScene.css';

export default function GroundFogLab() {
    const fog = useControls('GroundFog', {
        slab: folder({
            size: { value: 14, min: 4, max: 40, step: 0.5 },
            height: { value: 0, min: -2, max: 2, step: 0.01 },
        }),
        look: folder({
            color: '#a8b8cc',
        }),
        flow: folder({
            speed: { value: 0.04, min: 0, max: 0.5, step: 0.005 },
            density: { value: 0.6, min: 0, max: 1, step: 0.01 },
            frequency: { value: 2.4, min: 0.3, max: 10, step: 0.1 },
        }),
    });

    const post = useControls('PostProcessing', {
        bloomIntensity: { value: 0.35, min: 0, max: 2, step: 0.01 },
        bloomThreshold: { value: 0.9, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.4, min: 0, max: 1, step: 0.01 },
    });

    return (
        <main className="LabScene-stage">
            <Link to="/lab-scene" className="LabScene-back">← Labs</Link>
            <Canvas
                shadows
                camera={{ position: [3.5, 1.0, 4.5], fov: 38 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={['#070a12']} />
                <fog attach="fog" args={['#070a12', 8, 24]} />

                <ambientLight intensity={0.18} />
                <directionalLight position={[2, 5, -2]} intensity={1.2} color="#c9d8ff" />

                <Suspense fallback={null}>
                    <Environment preset="night" />
                    {/* Dark ground so the fog reads against something */}
                    <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[40, 40]} />
                        <meshStandardMaterial color="#0c0f15" roughness={0.95} metalness={0.05} />
                    </mesh>
                    {/* Reference cubes so you can see the fog rolling around them */}
                    {[-2, 0, 2].map((x) => (
                        <mesh key={x} position={[x, 0.5, -1.2]} castShadow>
                            <boxGeometry args={[0.5, 1, 0.5]} />
                            <meshStandardMaterial color="#1f2330" roughness={0.6} metalness={0.4} />
                        </mesh>
                    ))}
                    <GroundFog
                        size={fog.size}
                        color={fog.color}
                        speed={fog.speed}
                        density={fog.density}
                        frequency={fog.frequency}
                        height={fog.height}
                    />
                </Suspense>

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    target={[0, 0.3, 0]}
                />

                <EffectComposer>
                    <Bloom
                        intensity={post.bloomIntensity}
                        luminanceThreshold={post.bloomThreshold}
                        luminanceSmoothing={post.bloomSmoothing}
                        mipmapBlur
                    />
                </EffectComposer>
            </Canvas>
        </main>
    );
}
