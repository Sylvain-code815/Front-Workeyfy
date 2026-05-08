import { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import OldComputer from '../canvas/OldComputer';
import './ProjectDeployed.css';

gsap.registerPlugin(ScrollTrigger);

type ProgressRef = { current: { value: number } };

const CAMERA_FAR: [number, number, number] = [0, 4.2, 7.5];
const CAMERA_NEAR: [number, number, number] = [0, 0.45, 0.95];
const LOOK_FAR: [number, number, number] = [0, 0.6, 0];
const LOOK_NEAR: [number, number, number] = [0, 0.45, 0];

function DollyCamera({ progressRef }: { progressRef: ProgressRef }) {
    const { camera } = useThree();
    const tmpFrom = useRef(new THREE.Vector3());
    const tmpTo = useRef(new THREE.Vector3());
    const lookFrom = useRef(new THREE.Vector3());
    const lookTo = useRef(new THREE.Vector3());

    useFrame(() => {
        const p = THREE.MathUtils.clamp(progressRef.current.value, 0, 1);
        const eased = 1 - Math.pow(1 - p, 4);

        tmpFrom.current.fromArray(CAMERA_FAR);
        tmpTo.current.fromArray(CAMERA_NEAR);
        camera.position.lerpVectors(tmpFrom.current, tmpTo.current, eased);

        lookFrom.current.fromArray(LOOK_FAR);
        lookTo.current.fromArray(LOOK_NEAR);
        const target = lookFrom.current.lerp(lookTo.current, eased);
        camera.lookAt(target);
    });

    return null;
}

function ZenLights({ progressRef }: { progressRef: ProgressRef }) {
    const keyRef = useRef<THREE.DirectionalLight>(null);
    const fillRef = useRef<THREE.PointLight>(null);
    const ambRef = useRef<THREE.AmbientLight>(null);

    useFrame(() => {
        const p = THREE.MathUtils.clamp(progressRef.current.value, 0, 1);
        const settle = THREE.MathUtils.smoothstep(p, 0.35, 0.85);
        if (keyRef.current) keyRef.current.intensity = 0.6 + settle * 1.4;
        if (fillRef.current) fillRef.current.intensity = 0.3 + settle * 0.6;
        if (ambRef.current) ambRef.current.intensity = 0.25 + settle * 0.25;
    });

    return (
        <>
            <ambientLight ref={ambRef} color="#ffe7c2" intensity={0.25} />
            <directionalLight
                ref={keyRef}
                position={[2.4, 3.8, 2.6]}
                color="#ffd49a"
                intensity={0.6}
            />
            <pointLight
                ref={fillRef}
                position={[-2.2, 1.4, 1.6]}
                color="#fff1d8"
                intensity={0.3}
                distance={8}
                decay={1.4}
            />
        </>
    );
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    return (
        <>
            <color attach="background" args={['#0a0703']} />
            <fog attach="fog" args={['#2a1a0e', 5, 22]} />

            <ZenLights progressRef={progressRef} />
            <DollyCamera progressRef={progressRef} />

            <Suspense fallback={null}>
                <OldComputer scale={0.65} position={[0, 0, 0]} />
            </Suspense>

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <Bloom
                    intensity={0.7}
                    luminanceThreshold={0.5}
                    luminanceSmoothing={0.9}
                    mipmapBlur
                    height={360}
                />
                <Noise opacity={0.05} blendFunction={BlendFunction.OVERLAY} />
            </EffectComposer>
        </>
    );
}

export default function ProjectDeployed() {
    const sectionRef = useRef<HTMLElement>(null);
    const screenRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<{ value: number }>({ value: 0 });

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ paused: true });

            tl.to(
                progressRef.current,
                {
                    value: 1,
                    duration: 2.8,
                    ease: 'none',
                },
                0,
            );

            tl.fromTo(
                screenRef.current,
                { opacity: 0, scale: 0.7 },
                {
                    opacity: 1,
                    scale: 1,
                    duration: 0.8,
                    ease: 'power4.out',
                },
                1.1,
            );

            tl.fromTo(
                titleRef.current,
                { opacity: 0, y: 24 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                },
                1.7,
            );

            tl.fromTo(
                ctaRef.current,
                { opacity: 0, y: 24 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: 'power2.out',
                },
                2.1,
            );

            ScrollTrigger.create({
                trigger: el,
                start: 'top 80%',
                end: 'bottom 20%',
                animation: tl,
                toggleActions: 'play none none reverse',
            });
        }, el);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="ProjectDeployed"
            aria-label="Projet déployé — retour au poste de travail"
        >
            <div className="ProjectDeployed-sticky">
                <Canvas
                    className="ProjectDeployed-canvas"
                    camera={{ position: CAMERA_FAR, fov: 28 }}
                    dpr={[1, 1.5]}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                >
                    <Suspense fallback={null}>
                        <Scene progressRef={progressRef} />
                    </Suspense>
                </Canvas>

                <div ref={screenRef} className="ProjectDeployed-screen" aria-hidden="true">
                    <div className="ProjectDeployed-check">
                        <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
                            <circle
                                cx="32"
                                cy="32"
                                r="27"
                                fill="none"
                                stroke="#22C55E"
                                strokeWidth="3"
                            />
                            <path
                                d="M20 33 l8 8 l16-18"
                                fill="none"
                                stroke="#22C55E"
                                strokeWidth="4.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <p className="ProjectDeployed-status">Projet Déployé</p>
                </div>

                <div className="ProjectDeployed-overlay">
                    <h2 ref={titleRef} className="ProjectDeployed-title">
                        Votre projet est notre prochain défi.
                        <br />
                        On en parle ?
                    </h2>
                    <div ref={ctaRef} className="ProjectDeployed-cta">
                        <a
                            href="mailto:hello@workify.com"
                            className="ProjectDeployed-btn"
                        >
                            Démarrer un projet
                        </a>
                        <a
                            href="mailto:hello@workify.com"
                            className="ProjectDeployed-email"
                        >
                            hello@workify.com
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
