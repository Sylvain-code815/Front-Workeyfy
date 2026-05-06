import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei'; // disabled: scroll drives the camera, no manual orbit
import { Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import Produit from './Produit';
import OldComputer from './OldComputer';
import Cables from './Cables';
import { createCodeTexture } from './codeTexture';
import './Scene.css';

type SceneProps = {
    progressRef: { current: { value: number } };
};

const PRODUIT_PC_POSITIONS: [number, number, number][] = [
    [0.27, 1.529, -2.613],
    [-1.43, 2.496, -1.8],
    [-2.731, 0.629, -0.522],
    [1.845, 0.377, -1.771],
    [3.11, 2.145, -0.18],
    [-3.417, 3.056, 1.303],
    [-3.899, 4.287, -2.642],
    [0.992, 4.287, -4.209],
    [4.683, 4.29, -1.558],
];

const HTML_BASE_SCALE = 0.001;

export default function Scene({ progressRef }: SceneProps) {
    const { camera } = useThree();
    const screenRef = useRef<HTMLDivElement>(null);

    const fog = useControls('Atmosphere', {
        bg: '#000000',
        fogColor: '#000000',
        fogNear: { value: 6, min: 0, max: 50, step: 0.5 },
        fogFar: { value: 18, min: 1, max: 100, step: 1 },
    });

    const cyanSpot = useControls('Cyan side spots', {
        intensity: { value: 45, min: 0, max: 200, step: 1 },
        color: '#00d4ff',
        angle: { value: 0.55, min: 0.05, max: Math.PI / 2, step: 0.01 },
        attenuation: { value: 6, min: 0, max: 20, step: 0.5 },
        anglePower: { value: 4, min: 0, max: 10, step: 0.5 },
        distance: { value: 20, min: 1, max: 50, step: 0.5 },
        penumbra: { value: 0.6, min: 0, max: 1, step: 0.05 },
        positionA: { value: [6, 4, 2], step: 0.5 },
        positionB: { value: [-6, 4, -2], step: 0.5 },
    });

    const heroSpot = useControls('Hero spot', {
        intensity: { value: 30, min: 0, max: 200, step: 1 },
        color: '#ffffff',
        angle: { value: Math.PI / 7, min: 0.05, max: Math.PI / 2, step: 0.01 },
        penumbra: { value: 0.5, min: 0, max: 1, step: 0.05 },
        distance: { value: 12, min: 0, max: 50, step: 0.5 },
        decay: { value: 1.2, min: 0, max: 3, step: 0.1 },
        position: { value: [0, 6, 0], step: 0.5 },
    });

    const hero = useControls('Hero (old computer)', {
        position: { value: [0, 0, 0], step: 0.1 },
        rotation: { value: [0, 0, 0], step: 0.05 },
        scale: { value: 0.6, min: 0.05, max: 5, step: 0.05 },
    });

    const cam = useControls('Camera', {
        near: { value: [0, 0.3, 0.85], step: 0.05 },
        lookNear: { value: [-0.12, 0.4, 0.25], step: 0.05 },
        far: { value: [0, 5, 8], step: 0.5 },
        lookFar: { value: [0, 1.5, -1], step: 0.5 },
        fov: { value: 25, min: 20, max: 120, step: 1 },
    });

    const overlay = useControls('Html overlay', {
        position: { value: [-0.12, 0.42, 0.25], step: 0.01 },
        rotation: { value: [0, 0, 0], step: 0.05 },
        scale: { value: 10, min: 0.1, max: 10, step: 0.1 },
        bgColor: '#f5f0e6',
        bgOpacity: { value: 0, min: 0, max: 1, step: 0.05 },
        textColor: '#1a1a1a',
    });

    const post = useControls('Post-processing', {
        bloomIntensity: { value: 1.2, min: 0, max: 5, step: 0.05 },
        bloomThreshold: { value: 0.35, min: 0, max: 1, step: 0.01 },
        bloomSmoothing: { value: 0.9, min: 0, max: 1, step: 0.01 },
        noiseOpacity: { value: 0.04, min: 0, max: 0.5, step: 0.01 },
    });

    useControls('Animation', {
        toTop: button(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }),
        toBottom: button(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth',
            });
        }),
    });

    const produitGltf = useGLTF('/produit_b2b.glb') as unknown as {
        materials: { Screen?: THREE.MeshStandardMaterial };
    };
    const codeTexture = useMemo(() => createCodeTexture(), []);

    useEffect(() => {
        const screen = produitGltf.materials.Screen;
        if (!screen) return;
        screen.color = new THREE.Color('#000810');
        screen.emissive = new THREE.Color('#00ff88');
        screen.emissiveMap = codeTexture;
        screen.emissiveIntensity = 1.6;
        screen.toneMapped = false;
        screen.needsUpdate = true;
    }, [produitGltf, codeTexture]);

    useFrame(({ clock }) => {
        codeTexture.offset.y = -clock.elapsedTime * 0.02;

        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== cam.fov) {
            camera.fov = cam.fov;
            camera.updateProjectionMatrix();
        }

        const t = progressRef.current.value;
        const ease = THREE.MathUtils.smoothstep(t, 0, 1);

        camera.position.x = THREE.MathUtils.lerp(cam.near[0], cam.far[0], ease);
        camera.position.y = THREE.MathUtils.lerp(cam.near[1], cam.far[1], ease);
        camera.position.z = THREE.MathUtils.lerp(cam.near[2], cam.far[2], ease);

        camera.lookAt(
            THREE.MathUtils.lerp(cam.lookNear[0], cam.lookFar[0], ease),
            THREE.MathUtils.lerp(cam.lookNear[1], cam.lookFar[1], ease),
            THREE.MathUtils.lerp(cam.lookNear[2], cam.lookFar[2], ease),
        );

        if (screenRef.current) {
            const fade = THREE.MathUtils.clamp(1 - t / 0.18, 0, 1);
            screenRef.current.style.opacity = String(fade);
            screenRef.current.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';
        }
    });

    const memoizedHtmlScale = useMemo(
        () => overlay.scale * HTML_BASE_SCALE,
        [overlay.scale],
    );

    const handleStartClick = () => {
        window.scrollTo({
            top: window.innerHeight * 2,
            behavior: 'smooth',
        });
    };

    return (
        <>
            <color attach="background" args={[fog.bg]} />
            <fog attach="fog" args={[fog.fogColor, fog.fogNear, fog.fogFar]} />

            <spotLight
                position={cyanSpot.positionA}
                angle={cyanSpot.angle}
                intensity={cyanSpot.intensity}
                distance={cyanSpot.distance}
                color={cyanSpot.color}
                penumbra={cyanSpot.penumbra}
            />
            <spotLight
                position={cyanSpot.positionB}
                angle={cyanSpot.angle}
                intensity={cyanSpot.intensity}
                distance={cyanSpot.distance}
                color={cyanSpot.color}
                penumbra={cyanSpot.penumbra}
            />

            <spotLight
                position={heroSpot.position}
                color={heroSpot.color}
                intensity={heroSpot.intensity}
                angle={heroSpot.angle}
                penumbra={heroSpot.penumbra}
                distance={heroSpot.distance}
                decay={heroSpot.decay}
            />

            <Produit />

            <OldComputer
                position={hero.position}
                rotation={hero.rotation}
                scale={hero.scale}
            />

            <Cables
                pcPositions={PRODUIT_PC_POSITIONS}
                heroPosition={hero.position}
                linksPerPc={2}
                linksToHero={2}
            />

            <Html
                transform
                position={overlay.position}
                rotation={overlay.rotation}
                scale={memoizedHtmlScale}
                style={{ width: '360px' }}
            >
                <div
                    ref={screenRef}
                    className="Scene-screen"
                    style={{
                        backgroundColor: hexToRgba(overlay.bgColor, overlay.bgOpacity),
                        color: overlay.textColor,
                        transition: 'opacity 80ms linear',
                    }}
                >
                    <p className="Scene-screen-tagline">
                        Vous avez la vision.<br />
                        Nous avons le code.
                    </p>
                    <button
                        type="button"
                        className="Scene-screen-cta"
                        onClick={handleStartClick}
                    >
                        Démarrer le projet
                    </button>
                </div>
            </Html>

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <Bloom
                    intensity={post.bloomIntensity}
                    luminanceThreshold={post.bloomThreshold}
                    luminanceSmoothing={post.bloomSmoothing}
                    mipmapBlur
                    height={240}
                />
                <Noise
                    opacity={post.noiseOpacity}
                    blendFunction={BlendFunction.OVERLAY}
                />
            </EffectComposer>
        </>
    );
}

function hexToRgba(hex: string, alpha: number) {
    const v = hex.replace('#', '');
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
