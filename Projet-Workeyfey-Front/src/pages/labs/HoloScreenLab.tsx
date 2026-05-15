import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { Environment, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { folder, useControls } from 'leva';
import HoloScreen from '../../components/sections/lab/HoloScreen';
import '../LabScene.css';

export default function HoloScreenLab() {
    const screen = useControls('HoloScreen', {
        geometry: folder({
            width: { value: 1.6, min: 0.5, max: 4, step: 0.05 },
            height: { value: 1.0, min: 0.4, max: 3, step: 0.05 },
            curvature: { value: 0.35, min: 0, max: 1.2, step: 0.01 },
        }),
        look: folder({
            color: '#7adcff',
            opacity: { value: 0.9, min: 0, max: 1.5, step: 0.01 },
        }),
        scanlines: folder({
            scanlineDensity: { value: 120, min: 20, max: 400, step: 1 },
            scanlineSpeed: { value: 1.2, min: 0, max: 10, step: 0.05 },
        }),
        noise: folder({
            flicker: { value: 0.18, min: 0, max: 1, step: 0.01 },
            distortion: { value: 0.4, min: 0, max: 2, step: 0.01 },
        }),
    });

    const post = useControls('PostProcessing', {
        bloomIntensity: { value: 1.4, min: 0, max: 4, step: 0.01 },
        bloomThreshold: { value: 0.4, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.3, min: 0, max: 1, step: 0.01 },
    });

    return (
        <main className="LabScene-stage">
            <Link to="/lab-scene" className="LabScene-back">← Labs</Link>
            <Canvas
                camera={{ position: [0, 0.1, 2.6], fov: 38 }}
                gl={{ antialias: true }}
            >
                <color attach="background" args={['#06070b']} />
                <fog attach="fog" args={['#06070b', 6, 14]} />

                <ambientLight intensity={0.08} />
                <pointLight position={[-2, 1, 2]} intensity={0.25} color="#5070ff" />

                <Suspense fallback={null}>
                    <Environment preset="warehouse" />
                    <HoloScreen
                        width={screen.width}
                        height={screen.height}
                        curvature={screen.curvature}
                        color={screen.color}
                        opacity={screen.opacity}
                        scanlineDensity={screen.scanlineDensity}
                        scanlineSpeed={screen.scanlineSpeed}
                        flicker={screen.flicker}
                        distortion={screen.distortion}
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
