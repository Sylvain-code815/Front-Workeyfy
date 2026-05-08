import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    EffectComposer,
    Bloom,
    Noise,
    DepthOfField,
    Vignette,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import OldComputer from '../canvas/OldComputer';
import BraidedCable from '../canvas/BraidedCable';
import { createDeployedScreenTexture } from '../canvas/deployedScreenTexture';
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
    const rimLeftRef = useRef<THREE.SpotLight>(null);
    const rimRightRef = useRef<THREE.SpotLight>(null);

    useFrame(() => {
        const p = THREE.MathUtils.clamp(progressRef.current.value, 0, 1);
        const settle = THREE.MathUtils.smoothstep(p, 0.35, 0.85);
        if (keyRef.current) keyRef.current.intensity = 0.6 + settle * 1.4;
        if (fillRef.current) fillRef.current.intensity = 0.3 + settle * 0.6;
        if (ambRef.current) ambRef.current.intensity = 0.22 + settle * 0.22;
        if (rimLeftRef.current) rimLeftRef.current.intensity = 8 + settle * 14;
        if (rimRightRef.current) rimRightRef.current.intensity = 6 + settle * 12;
    });

    return (
        <>
            <ambientLight ref={ambRef} color="#ffe7c2" intensity={0.22} />
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

            {/* Rim — left edge, cyan */}
            <spotLight
                ref={rimLeftRef}
                position={[-3.2, 1.6, -1.4]}
                target-position={[-0.4, 0.5, 0]}
                color="#7DE3FF"
                intensity={8}
                angle={0.55}
                penumbra={0.85}
                distance={9}
                decay={1.4}
            />
            {/* Rim — right edge, cool white */}
            <spotLight
                ref={rimRightRef}
                position={[3.2, 1.6, -1.4]}
                target-position={[0.4, 0.5, 0]}
                color="#E8F4FF"
                intensity={6}
                angle={0.55}
                penumbra={0.85}
                distance={9}
                decay={1.4}
            />
        </>
    );
}

function GradientBackdrop() {
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    uColorCenter: { value: new THREE.Color('#0b1830') },
                    uColorEdge: { value: new THREE.Color('#000205') },
                },
                vertexShader: /* glsl */ `
                    varying vec4 vClip;
                    void main() {
                        vec4 worldPos = modelMatrix * vec4(position, 1.0);
                        vClip = projectionMatrix * viewMatrix * worldPos;
                        gl_Position = vClip;
                    }
                `,
                fragmentShader: /* glsl */ `
                    uniform vec3 uColorCenter;
                    uniform vec3 uColorEdge;
                    varying vec4 vClip;
                    void main() {
                        vec2 ndc = vClip.xy / vClip.w;
                        // Slightly elevate the focal point in the frame
                        ndc.y -= 0.1;
                        float r = clamp(length(ndc) * 0.85, 0.0, 1.0);
                        float t = smoothstep(0.0, 1.0, r);
                        vec3 col = mix(uColorCenter, uColorEdge, t);
                        gl_FragColor = vec4(col, 1.0);
                    }
                `,
            }),
        [],
    );

    return (
        <mesh renderOrder={-1000} frustumCulled={false}>
            <sphereGeometry args={[60, 24, 24]} />
            <primitive object={material} attach="material" />
        </mesh>
    );
}

function BackdropCable() {
    const curve = useMemo(() => {
        const pts = [
            new THREE.Vector3(-3.8, 1.6, -3.4),
            new THREE.Vector3(-1.6, 1.1, -3.1),
            new THREE.Vector3(0.4, 0.7, -3.3),
            new THREE.Vector3(2.4, 1.2, -3.0),
            new THREE.Vector3(4.0, 1.7, -3.6),
        ];
        const c = new THREE.CatmullRomCurve3(pts);
        c.tension = 0.4;
        return c;
    }, []);

    return (
        <BraidedCable
            curve={curve}
            radius={0.06}
            color="#0a3a4d"
            emissive="#003a52"
            emissiveIntensity={0.35}
            metalness={0.25}
            normalScale={0.6}
            tilesPerUnit={1.2}
        />
    );
}

function DeployedComputer({ progressRef }: { progressRef: ProgressRef }) {
    const screenTexture = useMemo(() => createDeployedScreenTexture(), []);
    const screenMaterial = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#020806',
                emissive: new THREE.Color('#34F88B'),
                emissiveMap: screenTexture,
                emissiveIntensity: 0.0,
                roughness: 0.55,
                metalness: 0.1,
                toneMapped: false,
            }),
        [screenTexture],
    );

    useEffect(() => {
        return () => {
            screenMaterial.dispose();
            screenTexture.dispose();
        };
    }, [screenMaterial, screenTexture]);

    useFrame(({ clock }) => {
        const p = THREE.MathUtils.clamp(progressRef.current.value, 0, 1);
        const wake = THREE.MathUtils.smoothstep(p, 0.25, 0.95);
        const flicker = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.04;
        screenMaterial.emissiveIntensity = wake * 1.55 * flicker;
    });

    return (
        <OldComputer scale={0.65} position={[0, 0, 0]} screenMaterial={screenMaterial} />
    );
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    return (
        <>
            <GradientBackdrop />
            <fog attach="fog" args={['#020a14', 6, 24]} />

            <ZenLights progressRef={progressRef} />
            <DollyCamera progressRef={progressRef} />

            <Suspense fallback={null}>
                <BackdropCable />
                <DeployedComputer progressRef={progressRef} />
            </Suspense>

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <DepthOfField
                    focusDistance={0.012}
                    focalLength={0.05}
                    bokehScale={4.5}
                    height={480}
                />
                <Bloom
                    intensity={1.15}
                    luminanceThreshold={0.32}
                    luminanceSmoothing={0.92}
                    mipmapBlur
                    height={360}
                />
                <Vignette eskil={false} offset={0.18} darkness={0.85} />
                <Noise opacity={0.07} blendFunction={BlendFunction.OVERLAY} />
            </EffectComposer>
        </>
    );
}

function CopyIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
        >
            <rect
                x="8"
                y="8"
                width="11"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M5 16V6a2 2 0 0 1 2-2h9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export default function ProjectDeployed() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<{ value: number }>({ value: 0 });
    const [copied, setCopied] = useState(false);
    const copyTimeoutRef = useRef<number | null>(null);

    const email = 'hello@workify.com';

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

    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current !== null) {
                window.clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            if (copyTimeoutRef.current !== null) {
                window.clearTimeout(copyTimeoutRef.current);
            }
            copyTimeoutRef.current = window.setTimeout(() => {
                setCopied(false);
                copyTimeoutRef.current = null;
            }, 1800);
        } catch {
            window.location.href = `mailto:${email}`;
        }
    };

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

                <div className="ProjectDeployed-overlay">
                    <h2 ref={titleRef} className="ProjectDeployed-title">
                        Votre projet est notre prochain défi.
                        <br />
                        On en parle&nbsp;?
                    </h2>
                    <div ref={ctaRef} className="ProjectDeployed-cta">
                        <a
                            href={`mailto:${email}`}
                            className="ProjectDeployed-btn"
                        >
                            Démarrer le projet
                        </a>
                        <div className="ProjectDeployed-divider" aria-hidden="true" />
                        <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="ProjectDeployed-email"
                            aria-label={
                                copied
                                    ? `Adresse ${email} copiée`
                                    : `Copier l'adresse ${email}`
                            }
                        >
                            <span className="ProjectDeployed-email-text">
                                {email}
                            </span>
                            <span
                                className="ProjectDeployed-email-icon"
                                aria-hidden="true"
                            >
                                {copied ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        width="14"
                                        height="14"
                                        focusable="false"
                                    >
                                        <path
                                            d="M5 12l4 4 10-10"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    <CopyIcon />
                                )}
                            </span>
                            <span className="ProjectDeployed-email-feedback">
                                {copied ? 'Copié' : ''}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
