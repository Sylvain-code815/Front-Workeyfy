import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { folder, useControls } from 'leva';
import NeuralCable from '../../components/sections/lab/NeuralCable';
import '../LabScene.css';

export default function NeuralCableLab() {
    const cable = useControls('NeuralCable', {
        geometry: folder({
            thickness: { value: 0.025, min: 0.005, max: 0.08, step: 0.001 },
            sag: { value: 0.4, min: 0, max: 1.5, step: 0.01 },
        }),
        material: folder({
            baseColor: '#1a1d24',
            emissiveColor: '#00d9ff',
            roughness: { value: 0.45, min: 0, max: 1, step: 0.01 },
            metalness: { value: 0.6, min: 0, max: 1, step: 0.01 },
            braidScale: { value: 32, min: 10, max: 80, step: 1 },
        }),
        pulses: folder({
            pulseSpeed: { value: 0.4, min: 0, max: 2, step: 0.01 },
            pulseIntensity: { value: 2.5, min: 0, max: 6, step: 0.01 },
            pulseCount: { value: 3, min: 1, max: 8, step: 1 },
        }),
    });

    const post = useControls('PostProcessing', {
        bloomIntensity: { value: 1.2, min: 0, max: 4, step: 0.01 },
        bloomThreshold: { value: 0.85, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.2, min: 0, max: 1, step: 0.01 },
    });

    return (
        <main className="LabScene-stage">
            <Link to="/lab-scene" className="LabScene-back">← Labs</Link>
            <Canvas
                shadows
                camera={{ position: [0, 0.4, 4.5], fov: 35 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={['#06070b']} />
                <fog attach="fog" args={['#06070b', 6, 14]} />

                <ambientLight intensity={0.12} />
                <directionalLight position={[3, 4, 2]} intensity={1.1} castShadow />
                <pointLight position={[-3, -1, 2]} intensity={0.5} color="#5070ff" />

                <Suspense fallback={null}>
                    <Environment preset="warehouse" />
                    <NeuralCable
                        from={[-2, 0.6, 0]}
                        to={[2, 0.6, 0]}
                        thickness={cable.thickness}
                        sag={cable.sag}
                        baseColor={cable.baseColor}
                        emissiveColor={cable.emissiveColor}
                        roughness={cable.roughness}
                        metalness={cable.metalness}
                        braidScale={cable.braidScale}
                        pulseSpeed={cable.pulseSpeed}
                        pulseIntensity={cable.pulseIntensity}
                        pulseCount={cable.pulseCount}
                    />
                </Suspense>

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    target={[0, 0.2, 0]}
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
