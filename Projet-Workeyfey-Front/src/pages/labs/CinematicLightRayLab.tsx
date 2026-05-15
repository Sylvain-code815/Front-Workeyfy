import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { folder, useControls } from 'leva';
import CinematicLightRay from '../../components/sections/lab/CinematicLightRay';
import '../LabScene.css';

export default function CinematicLightRayLab() {
    const ray = useControls('CinematicLightRay', {
        beam: folder({
            length: { value: 4, min: 1, max: 10, step: 0.1 },
            radiusTop: { value: 0.08, min: 0.0, max: 1, step: 0.01 },
            radiusBottom: { value: 1.2, min: 0.1, max: 3, step: 0.05 },
        }),
        look: folder({
            color: '#e8d8b0',
            opacity: { value: 0.55, min: 0, max: 1.5, step: 0.01 },
            falloff: { value: 2.2, min: 0.5, max: 6, step: 0.05 },
            sweepSpeed: { value: 0.35, min: 0, max: 3, step: 0.01 },
        }),
        tilt: folder({
            tiltX: { value: -0.25, min: -1.5, max: 1.5, step: 0.01 },
            tiltZ: { value: 0.0, min: -1.5, max: 1.5, step: 0.01 },
        }),
    });

    const post = useControls('PostProcessing', {
        bloomIntensity: { value: 0.9, min: 0, max: 4, step: 0.01 },
        bloomThreshold: { value: 0.2, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.4, min: 0, max: 1, step: 0.01 },
    });

    return (
        <main className="LabScene-stage">
            <Link to="/lab-scene" className="LabScene-back">← Labs</Link>
            <Canvas
                camera={{ position: [3.5, 1.4, 3.5], fov: 40 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={['#04050a']} />
                <fog attach="fog" args={['#04050a', 4, 18]} />

                <ambientLight intensity={0.04} />
                <directionalLight position={[2, 4, 2]} intensity={0.4} color="#ccd6e8" />

                <Suspense fallback={null}>
                    <Environment preset="night" />
                    {/* Ground plate so the cone has something to hit */}
                    <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                        <planeGeometry args={[12, 12]} />
                        <meshStandardMaterial color="#0a0c12" roughness={0.85} metalness={0.2} />
                    </mesh>
                    {/* The beam itself */}
                    <group position={[0, 0, 0]} rotation={[ray.tiltX, 0, ray.tiltZ]}>
                        <CinematicLightRay
                            length={ray.length}
                            radiusTop={ray.radiusTop}
                            radiusBottom={ray.radiusBottom}
                            color={ray.color}
                            opacity={ray.opacity}
                            falloff={ray.falloff}
                            sweepSpeed={ray.sweepSpeed}
                        />
                    </group>
                </Suspense>

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    target={[0, 1.2, 0]}
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
