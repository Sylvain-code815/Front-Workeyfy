import './rectAreaLightInit';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
// import { OrbitControls } from '@react-three/drei'; // disabled: scroll drives the camera, no manual orbit
import { Html, useGLTF, SpotLight, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useControls, button } from 'leva';
import * as THREE from 'three';
import Produit from './Produit';
import OldComputer from './OldComputer';
import Cables from './Cables';
import { createPeripheralSchemaTexture } from './peripheralSchemaTexture';
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

type ScreenRALProps = {
    position: [number, number, number];
    target: [number, number, number];
    color: string;
    width?: number;
    height?: number;
    intensity?: number;
};

function ScreenRAL({
    position,
    target,
    color,
    width = 0.6,
    height = 0.4,
    intensity = 4,
}: ScreenRALProps) {
    const ref = useRef<THREE.RectAreaLight>(null);
    useEffect(() => {
        if (ref.current) ref.current.lookAt(target[0], target[1], target[2]);
    }, [target]);
    return (
        <rectAreaLight
            ref={ref}
            position={position}
            color={color}
            intensity={intensity}
            width={width}
            height={height}
        />
    );
}

export default function Scene({ progressRef }: SceneProps) {
    const { camera } = useThree();
    const screenRef = useRef<HTMLDivElement>(null);

    const fog = useControls('Atmosphere', {
        bg: '#000000',
        fogColor: '#000000',
        density: { value: 0.06, min: 0, max: 0.5, step: 0.005 },
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

    const godRays = useControls('God rays', {
        enabled: true,
        intensity: { value: 8, min: 0, max: 30, step: 0.5 },
        color: '#00E5FF',
        angle: { value: 0.18, min: 0.05, max: 0.6, step: 0.01 },
        attenuation: { value: 6, min: 1, max: 20, step: 0.5 },
        anglePower: { value: 5, min: 0, max: 10, step: 0.5 },
        opacity: { value: 0.45, min: 0, max: 1, step: 0.05 },
        radiusTop: { value: 0.05, min: 0, max: 1, step: 0.01 },
        radiusBottom: { value: 0.6, min: 0, max: 3, step: 0.05 },
        distance: { value: 14, min: 1, max: 40, step: 0.5 },
    });

    const ralCtrl = useControls('Screen RectAreaLights', {
        enabled: true,
        centralColor: '#00E5FF',
        centralIntensity: { value: 5, min: 0, max: 20, step: 0.25 },
        peripheralColor: '#7FF7E8',
        peripheralIntensity: { value: 2.2, min: 0, max: 10, step: 0.1 },
        peripheralCount: { value: 9, min: 0, max: 9, step: 1 },
    });

    const dust = useControls('Dust', {
        count: { value: 80, min: 0, max: 400, step: 10 },
        size: { value: 1.5, min: 0.1, max: 6, step: 0.1 },
        speed: { value: 0.2, min: 0, max: 2, step: 0.05 },
        opacity: { value: 0.6, min: 0, max: 1, step: 0.05 },
        color: '#00E5FF',
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
    });

    const post = useControls('Post-processing', {
        bloomIntensity: { value: 1.4, min: 0, max: 5, step: 0.05 },
        bloomThreshold: { value: 0.3, min: 0, max: 1, step: 0.01 },
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

    const peripheralTextures = useMemo(
        () => Array.from({ length: 9 }, (_, i) => createPeripheralSchemaTexture(i)),
        [],
    );

    const peripheralMaterials = useMemo(() => {
        const base = produitGltf.materials.Screen;
        if (!base) return [];
        return peripheralTextures.map((tex) => {
            const mat = base.clone();
            mat.color = new THREE.Color('#000810');
            mat.emissive = new THREE.Color('#00E5FF');
            mat.emissiveMap = tex;
            mat.emissiveIntensity = 0.85;
            mat.toneMapped = false;
            mat.needsUpdate = true;
            return mat;
        });
    }, [produitGltf, peripheralTextures]);

    useEffect(() => {
        return () => {
            peripheralMaterials.forEach((m) => m.dispose());
            peripheralTextures.forEach((t) => t.dispose());
        };
    }, [peripheralMaterials, peripheralTextures]);

    const peripheralRALPositions = useMemo(() => {
        return PRODUIT_PC_POSITIONS.map((p) => {
            const dir = new THREE.Vector3(-p[0], 0, -p[2]).normalize();
            const offset = 0.55;
            const lightPos: [number, number, number] = [
                p[0] + dir.x * offset,
                p[1] + 0.45,
                p[2] + dir.z * offset,
            ];
            return { lightPos, target: p as [number, number, number] };
        });
    }, []);

    useFrame(() => {
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
            const fade = 1 - THREE.MathUtils.smoothstep(t, 0.55, 0.95);
            screenRef.current.style.opacity = String(fade);
            screenRef.current.style.pointerEvents = fade > 0.5 ? 'auto' : 'none';
        }
    });

    const memoizedHtmlScale = useMemo(
        () => overlay.scale * HTML_BASE_SCALE,
        [overlay.scale],
    );

    const handleStartClick = () => {
        window.dispatchEvent(new Event('hero-start'));
    };

    return (
        <>
            <color attach="background" args={[fog.bg]} />
            <fogExp2 attach="fog" args={[fog.fogColor, fog.density]} />

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

            {godRays.enabled && (
                <>
                    <SpotLight
                        position={[-1.8, 8, 0.5]}
                        target-position={[-1.5, 0, 0.3]}
                        color={godRays.color}
                        intensity={godRays.intensity}
                        angle={godRays.angle}
                        attenuation={godRays.attenuation}
                        anglePower={godRays.anglePower}
                        opacity={godRays.opacity}
                        radiusTop={godRays.radiusTop}
                        radiusBottom={godRays.radiusBottom}
                        distance={godRays.distance}
                        volumetric
                    />
                    <SpotLight
                        position={[2.2, 8, -0.8]}
                        target-position={[1.8, 0, -0.6]}
                        color={godRays.color}
                        intensity={godRays.intensity}
                        angle={godRays.angle}
                        attenuation={godRays.attenuation}
                        anglePower={godRays.anglePower}
                        opacity={godRays.opacity}
                        radiusTop={godRays.radiusTop}
                        radiusBottom={godRays.radiusBottom}
                        distance={godRays.distance}
                        volumetric
                    />
                </>
            )}

            {ralCtrl.enabled && (
                <>
                    <ScreenRAL
                        position={[0, 0.55, 0.55]}
                        target={[0, 0.55, 0]}
                        color={ralCtrl.centralColor}
                        width={0.7}
                        height={0.5}
                        intensity={ralCtrl.centralIntensity}
                    />
                    {peripheralRALPositions
                        .slice(0, ralCtrl.peripheralCount)
                        .map(({ lightPos, target }, i) => (
                            <ScreenRAL
                                key={`ral-${i}`}
                                position={lightPos}
                                target={target}
                                color={ralCtrl.peripheralColor}
                                width={0.45}
                                height={0.32}
                                intensity={ralCtrl.peripheralIntensity}
                            />
                        ))}
                </>
            )}

            <Produit screenMaterials={peripheralMaterials} />

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

            <Sparkles
                count={dust.count}
                scale={[10, 6, 8]}
                size={dust.size}
                speed={dust.speed}
                opacity={dust.opacity}
                color={dust.color}
                position={[0, 3, -1]}
            />

            <Html
                transform
                position={overlay.position}
                rotation={overlay.rotation}
                scale={memoizedHtmlScale}
                style={{ width: '420px' }}
            >
                <div
                    ref={screenRef}
                    className="Scene-screen"
                    style={{ transition: 'opacity 80ms linear' }}
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
