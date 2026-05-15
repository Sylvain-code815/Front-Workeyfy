import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { folder, useControls } from 'leva';
import DataPort from '../../components/sections/lab/DataPort';
import '../LabScene.css';

export default function DataPortLab() {
    const port = useControls('DataPort', {
        body: folder({
            bodyColor: '#2a2c30',
            bodyMetalness: { value: 1, min: 0, max: 1, step: 0.01 },
            bodyRoughness: { value: 0.18, min: 0, max: 1, step: 0.01 },
            accentColor: '#3a3d44',
            socketColor: '#0a0b0e',
        }),
        glow: folder({
            glowColor: '#00d9ff',
            glowIntensity: { value: 2.4, min: 0, max: 8, step: 0.05 },
            breathSpeed: { value: 1.2, min: 0, max: 5, step: 0.05 },
            breathDepth: { value: 0.45, min: 0, max: 1, step: 0.01 },
        }),
    });

    const post = useControls('PostProcessing', {
        bloomIntensity: { value: 1.0, min: 0, max: 4, step: 0.01 },
        bloomThreshold: { value: 0.85, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.2, min: 0, max: 1, step: 0.01 },
    });

    return (
        <main className="LabScene-stage">
            <Link to="/lab-scene" className="LabScene-back">← Labs</Link>
            <Canvas
                shadows
                camera={{ position: [1.2, 0.8, 1.8], fov: 35 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={['#06070b']} />

                <ambientLight intensity={0.18} />
                <directionalLight
                    position={[3, 4, 2]}
                    intensity={1.4}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />
                <directionalLight position={[-3, 2, -1]} intensity={0.5} color="#8095c4" />

                <Suspense fallback={null}>
                    <Environment preset="warehouse" />
                    <DataPort
                        bodyColor={port.bodyColor}
                        bodyMetalness={port.bodyMetalness}
                        bodyRoughness={port.bodyRoughness}
                        accentColor={port.accentColor}
                        socketColor={port.socketColor}
                        glowColor={port.glowColor}
                        glowIntensity={port.glowIntensity}
                        breathSpeed={port.breathSpeed}
                        breathDepth={port.breathDepth}
                    />
                    <ContactShadows
                        position={[0, -0.55, 0]}
                        opacity={0.55}
                        scale={4}
                        blur={2.5}
                        far={2}
                    />
                </Suspense>

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.05}
                    target={[0, 0, 0]}
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
