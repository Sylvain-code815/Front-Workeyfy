import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import Produit from './Produit';
import OldComputer from './OldComputer';
import './Scene.css';

interface SceneProps {
    started: boolean;
    onStart: () => void;
    onReset: () => void;
}

const HTML_BASE_SCALE = 0.001;

export default function Scene({ started, onStart, onReset }: SceneProps) {
    const lookAt = useRef(new THREE.Vector3(0, 0.4, 0.25));
    const [animationSettled, setAnimationSettled] = useState(false);

    const ambient = useControls('Ambient light', {
        intensity: { value: 0.6, min: 0, max: 5, step: 0.05 },
        color: '#ffffff',
    });

    const directional = useControls('Directional light', {
        intensity: { value: 1, min: 0, max: 10, step: 0.1 },
        color: '#ffffff',
        position: { value: [5, 5, 5], step: 0.5 },
    });

    const spot = useControls('Spot (hero)', {
        intensity: { value: 40, min: 0, max: 200, step: 1 },
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
        near: { value: [0, 0.4, 0.85], step: 0.05 },
        lookNear: { value: [0, 0.4, 0.25], step: 0.05 },
        far: { value: [0, 5, 6], step: 0.5 },
        lookFar: { value: [0, 2, -1], step: 0.5 },
        fov: { value: 50, min: 20, max: 120, step: 1 },
    });

    const overlay = useControls('Html overlay', {
        position: { value: [-0.12, 0.42, 0.25], step: 0.01 },
        rotation: { value: [0, 0, 0], step: 0.05 },
        scale: { value: 10, min: 0.1, max: 10, step: 0.1 },
        bgColor: '#f5f0e6',
        bgOpacity: { value: 0, min: 0, max: 1, step: 0.05 },
        textColor: '#1a1a1a',
    });

    useControls('Animation', {
        replay: button(() => {
            setAnimationSettled(false);
            lookAt.current.set(...cam.lookNear);
            onReset();
        }),
        skip: button(() => {
            onStart();
        }),
    });

    const camNear = useMemo(() => new THREE.Vector3(...cam.near), [cam.near]);
    const camFar = useMemo(() => new THREE.Vector3(...cam.far), [cam.far]);
    const camLookNear = useMemo(() => new THREE.Vector3(...cam.lookNear), [cam.lookNear]);
    const camLookFar = useMemo(() => new THREE.Vector3(...cam.lookFar), [cam.lookFar]);

    useFrame(({ camera }) => {
        if (camera instanceof THREE.PerspectiveCamera && camera.fov !== cam.fov) {
            camera.fov = cam.fov;
            camera.updateProjectionMatrix();
        }

        if (animationSettled) return;

        const targetPos = started ? camFar : camNear;
        const targetLook = started ? camLookFar : camLookNear;

        camera.position.lerp(targetPos, 0.04);
        lookAt.current.lerp(targetLook, 0.04);
        camera.lookAt(lookAt.current);

        if (started && camera.position.distanceTo(targetPos) < 0.15) {
            setAnimationSettled(true);
        }
    });

    return (
        <>
            <ambientLight intensity={ambient.intensity} color={ambient.color} />
            <directionalLight
                intensity={directional.intensity}
                color={directional.color}
                position={directional.position}
            />

            <Produit />

            <OldComputer
                position={hero.position}
                rotation={hero.rotation}
                scale={hero.scale}
            />
            <spotLight
                position={spot.position}
                color={spot.color}
                intensity={spot.intensity}
                angle={spot.angle}
                penumbra={spot.penumbra}
                distance={spot.distance}
                decay={spot.decay}
                castShadow
            />

            {!started && (
                <Html
                    transform
                    position={overlay.position}
                    rotation={overlay.rotation}
                    scale={overlay.scale * HTML_BASE_SCALE}
                    style={{ width: '360px', pointerEvents: 'auto' }}
                >
                    <div
                        className="Scene-screen"
                        style={{
                            backgroundColor: hexToRgba(overlay.bgColor, overlay.bgOpacity),
                            color: overlay.textColor,
                        }}
                    >
                        <p className="Scene-screen-tagline">
                            Vous avez la vision.<br />
                            Nous avons le code.
                        </p>
                        <button
                            type="button"
                            className="Scene-screen-cta"
                            onClick={onStart}
                        >
                            Démarrer le projet
                        </button>
                    </div>
                </Html>
            )}

            {animationSettled && <OrbitControls target={cam.lookFar} />}
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
