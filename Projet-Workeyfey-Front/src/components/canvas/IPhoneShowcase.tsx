import './rectAreaLightInit';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import IPhone from './IPhone';
import { createWindowMockupTexture } from './windowMockupTexture';

const ROT_SENSITIVITY = 0.012;
const VERTICAL_TILT_LIMIT = Math.PI / 2.2;

export type ScreenSlide = {
    screenshot: string;
    title: string;
    appName: string;
    accent: 'cyan' | 'green' | 'violet';
};

function PhoneWithMockupScreen({ slide }: { slide: ScreenSlide }) {
    const [img, setImg] = useState<HTMLImageElement | null>(null);

    // Load the screenshot as a regular Image (CORS anonymous so we can sample
    // its pixels into the canvas), then trigger a re-render.
    useEffect(() => {
        let cancelled = false;
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if (!cancelled) setImg(image);
        };
        image.onerror = () => {
            if (!cancelled) setImg(null);
        };
        image.src = slide.screenshot;
        return () => {
            cancelled = true;
        };
    }, [slide.screenshot]);

    const material = useMemo(() => {
        if (!img) return undefined;
        const tex = createWindowMockupTexture({
            image: img,
            title: slide.title,
            appName: slide.appName,
            accent: slide.accent,
        });
        return new THREE.MeshStandardMaterial({
            color: '#000810',
            emissive: new THREE.Color('#FFFFFF'),
            emissiveMap: tex,
            emissiveIntensity: 1.4,
            roughness: 0.35,
            metalness: 0.0,
            toneMapped: false,
        });
    }, [img, slide.title, slide.appName, slide.accent]);

    // Dispose old material/texture when a new one supersedes it — otherwise
    // every slide swap leaks a CanvasTexture + GPU resources.
    useEffect(() => {
        return () => {
            if (!material) return;
            const map = (material as THREE.MeshStandardMaterial).emissiveMap;
            map?.dispose();
            material.dispose();
        };
    }, [material]);

    return <IPhone position={[0, -0.5, 0]} screenMaterial={material} />;
}

function IPhoneRig({
    interactive,
    slide,
}: {
    interactive: boolean;
    slide?: ScreenSlide;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const dragging = useRef(false);
    const lastPointer = useRef({ x: 0, y: 0 });
    const targetRot = useRef({ x: 0, y: 0 });

    // When interactivity flips off (window mode), snap back to face-on so the
    // edge-cut preview reads as a flat product shot, not a frozen rotated 3D.
    useEffect(() => {
        if (!interactive) {
            targetRot.current = { x: 0, y: 0 };
            dragging.current = false;
            document.body.style.cursor = '';
        }
    }, [interactive]);

    useFrame((_, delta) => {
        const g = groupRef.current;
        if (!g) return;
        const k = 1 - Math.pow(0.001, delta);
        g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetRot.current.y, k);
        g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, targetRot.current.x, k);
    });

    useEffect(() => {
        if (!interactive) return;
        const move = (e: PointerEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - lastPointer.current.x;
            const dy = e.clientY - lastPointer.current.y;
            lastPointer.current.x = e.clientX;
            lastPointer.current.y = e.clientY;
            targetRot.current.y += dx * ROT_SENSITIVITY;
            targetRot.current.x = THREE.MathUtils.clamp(
                targetRot.current.x + dy * ROT_SENSITIVITY,
                -VERTICAL_TILT_LIMIT,
                VERTICAL_TILT_LIMIT,
            );
        };
        const up = () => {
            if (!dragging.current) return;
            dragging.current = false;
            document.body.style.cursor = '';
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [interactive]);

    const onPointerDown = interactive
        ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              dragging.current = true;
              lastPointer.current.x = e.clientX;
              lastPointer.current.y = e.clientY;
              document.body.style.cursor = 'grabbing';
          }
        : undefined;

    const onPointerOver = interactive
        ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (!dragging.current) document.body.style.cursor = 'grab';
          }
        : undefined;

    const onPointerOut = interactive
        ? () => {
              if (!dragging.current) document.body.style.cursor = '';
          }
        : undefined;

    return (
        <group
            ref={groupRef}
            // 1.55 left only ~0.01 world-units of margin against the camera
            // frustum (cam z=3.4, fov 26° → visible vertical ±0.785 vs phone
            // half-height 0.775). Sub-pixel rounding clipped the phone in
            // phone-mode. 1.4 → ~0.085 margin on each side, fully visible.
            scale={1.4}
            onPointerDown={onPointerDown}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
        >
            {slide ? (
                <PhoneWithMockupScreen slide={slide} />
            ) : (
                <IPhone position={[0, -0.5, 0]} />
            )}
        </group>
    );
}

type Props = {
    className?: string;
    interactive?: boolean;
    screenSlide?: ScreenSlide;
};

export default function IPhoneShowcase({
    className,
    interactive = true,
    screenSlide,
}: Props) {
    return (
        <Canvas
            className={className}
            camera={{ position: [0, 0.1, 3.4], fov: 26 }}
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
            <Suspense fallback={null}>
                <ambientLight intensity={0.55} color="#E6F0FF" />

                {/* Roblox blue kicker — top-left, matches the blue stream */}
                <pointLight
                    position={[-2.5, 2, 1.6]}
                    color="#1A78FF"
                    intensity={28}
                    distance={8}
                    decay={1.5}
                />
                {/* FiveM green kicker — bottom-right, matches the green stream
                    (was magenta — swapped to keep Section 3 in palette). */}
                <pointLight
                    position={[2.5, -1.6, 1.6]}
                    color="#4ADE80"
                    intensity={28}
                    distance={8}
                    decay={1.5}
                />
                {/* Soft fill from front */}
                <pointLight position={[0, 0.4, 4]} color="#FFFFFF" intensity={6} distance={10} />

                {/* RectAreaLight wrapping the phone for slick reflections */}
                <rectAreaLight
                    position={[0, 1.4, 1.2]}
                    rotation={[-Math.PI / 5, 0, 0]}
                    color="#9DD8FF"
                    intensity={5}
                    width={3}
                    height={1.2}
                />

                {/* ContactShadows — anchors the phone to a virtual ground
                    plane just below it. Only rendered in window mode (small,
                    docked phone): in phone mode the phone tilts/rotates and
                    the planar contact shadow stays glued at y=-0.72 in world
                    space, which reads as a dark stain detached from the model
                    rather than a contact shadow. */}
                {!interactive && (
                    <ContactShadows
                        position={[0, -0.72, 0]}
                        opacity={0.55}
                        scale={4}
                        blur={2.4}
                        far={1.5}
                        resolution={512}
                        color="#000000"
                    />
                )}

                <IPhoneRig interactive={interactive} slide={screenSlide} />
            </Suspense>
        </Canvas>
    );
}
