import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Cables from '../canvas/Cables';
import { useCanvasFrameloop } from '../../hooks/useCanvasFrameloop';
import './GameUniverseTransition.css';

gsap.registerPlugin(ScrollTrigger);

type ProgressRef = { current: { value: number } };

const FUSION_END = 0.22;
const FLASH_PEAK = 0.28;
const EXPLOSION_END = 0.42;
const GAME_START = 0.45;

const NODE_ACCENT = '#00E5FF';
const FLASH_COLOR = '#ffffff';
const SPARK_COLOR = '#ffe7a8';

function FusionNodes({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);
    const startPositions = useMemo(() => {
        const N = 36;
        const arr: THREE.Vector3[] = [];
        for (let i = 0; i < N; i++) {
            arr.push(new THREE.Vector3(
                (Math.random() - 0.5) * 7,
                (Math.random() - 0.5) * 4.5,
                (Math.random() - 0.5) * 5 - 1.5,
            ));
        }
        return arr;
    }, []);

    useFrame(() => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const fusionT = THREE.MathUtils.smoothstep(p, 0, FUSION_END);
        const accel = Math.pow(fusionT, 2.4);
        groupRef.current.children.forEach((child, i) => {
            const s = startPositions[i];
            child.position.x = THREE.MathUtils.lerp(s.x, 0, accel);
            child.position.y = THREE.MathUtils.lerp(s.y, 0, accel);
            child.position.z = THREE.MathUtils.lerp(s.z, 0, accel);
            const scale = THREE.MathUtils.lerp(1, 0.05, accel);
            child.scale.setScalar(scale);
            const mesh = child as THREE.Mesh;
            const mat = mesh.material as THREE.MeshBasicMaterial;
            const fadeOut = THREE.MathUtils.smoothstep(p, FUSION_END - 0.04, FUSION_END + 0.02);
            mat.opacity = 1 - fadeOut;
        });
    });

    return (
        <group ref={groupRef}>
            {startPositions.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.07, 12, 12]} />
                    <meshBasicMaterial
                        color={NODE_ACCENT}
                        transparent
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

function CoreFlash({ progressRef }: { progressRef: ProgressRef }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame(() => {
        if (!meshRef.current || !matRef.current) return;
        const p = progressRef.current.value;
        const ramp = THREE.MathUtils.smoothstep(p, FUSION_END - 0.06, FLASH_PEAK);
        const fall = THREE.MathUtils.smoothstep(p, FLASH_PEAK, EXPLOSION_END);
        const intensity = ramp * (1 - fall);
        matRef.current.opacity = intensity;
        const scale = 0.05 + intensity * 1.4;
        meshRef.current.scale.setScalar(scale);
    });

    return (
        <mesh ref={meshRef} position={[0, 0, 0]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial
                ref={matRef}
                color={FLASH_COLOR}
                transparent
                opacity={0}
                toneMapped={false}
            />
        </mesh>
    );
}

function ParticleBurst({ progressRef, count = 200 }: { progressRef: ProgressRef; count?: number }) {
    const pointsRef = useRef<THREE.Points>(null);
    const matRef = useRef<THREE.PointsMaterial>(null);

    const directions = useMemo(() => {
        const dirs = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const v = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5,
            )
                .normalize()
                .multiplyScalar(0.6 + Math.random() * 0.6);
            dirs[i * 3] = v.x;
            dirs[i * 3 + 1] = v.y;
            dirs[i * 3 + 2] = v.z;
        }
        return dirs;
    }, [count]);

    const geometry = useMemo(() => {
        const positions = new Float32Array(count * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return geo;
    }, [count]);

    useFrame(() => {
        if (!pointsRef.current || !matRef.current) return;
        const p = progressRef.current.value;
        const expT = THREE.MathUtils.clamp(
            (p - FLASH_PEAK) / (EXPLOSION_END - FLASH_PEAK),
            0,
            1,
        );
        const positions = geometry.attributes.position.array as Float32Array;
        const distance = Math.pow(expT, 0.6) * 14;
        for (let i = 0; i < count; i++) {
            positions[i * 3] = directions[i * 3] * distance;
            positions[i * 3 + 1] = directions[i * 3 + 1] * distance;
            positions[i * 3 + 2] = directions[i * 3 + 2] * distance;
        }
        geometry.attributes.position.needsUpdate = true;
        const fadeIn = THREE.MathUtils.smoothstep(expT, 0, 0.1);
        const fadeOut = THREE.MathUtils.smoothstep(expT, 0.55, 1);
        matRef.current.opacity = fadeIn * (1 - fadeOut);
    });

    return (
        <points ref={pointsRef} geometry={geometry}>
            <pointsMaterial
                ref={matRef}
                color={SPARK_COLOR}
                size={0.09}
                sizeAttenuation
                transparent
                opacity={0}
                toneMapped={false}
                depthWrite={false}
            />
        </points>
    );
}

function GameCity({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);

    const buildings = useMemo(() => {
        let seed = 13;
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        const result: { pos: [number, number, number]; size: [number, number, number]; tone: number; emissive: number }[] = [];
        for (let row = 0; row < 9; row++) {
            for (let side = -1; side <= 1; side += 2) {
                const x = side * (3 + rand() * 1.4);
                const z = -row * 4.2 - 4;
                const h = 2.4 + rand() * 5.5;
                const w = 1.6 + rand() * 0.6;
                const d = 1.6 + rand() * 0.6;
                result.push({
                    pos: [x, h / 2, z],
                    size: [w, h, d],
                    tone: 14 + rand() * 18,
                    emissive: rand() < 0.4 ? 0.15 : 0.04,
                });
            }
        }
        return result;
    }, []);

    const cablePositions = useMemo<[number, number, number][]>(() => {
        return buildings
            .filter((_, i) => i % 2 === 0)
            .map((b) => [b.pos[0], b.pos[1] + b.size[1] / 2 - 0.1, b.pos[2]]);
    }, [buildings]);

    useFrame(() => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const reveal = THREE.MathUtils.smoothstep(p, GAME_START, GAME_START + 0.18);
        groupRef.current.visible = reveal > 0.01;
        groupRef.current.children.forEach((child) => {
            child.scale.setScalar(THREE.MathUtils.lerp(0.4, 1, reveal));
        });
    });

    return (
        <group ref={groupRef}>
            <directionalLight
                position={[12, 8, -8]}
                intensity={2.2}
                color="#ffaa55"
            />
            <ambientLight intensity={0.18} color="#ff8855" />

            {buildings.map((b, i) => (
                <mesh key={i} position={b.pos}>
                    <boxGeometry args={b.size} />
                    <meshStandardMaterial
                        color={`hsl(${20 + (i % 8) * 4}, 32%, ${b.tone}%)`}
                        emissive="#ff7a3c"
                        emissiveIntensity={b.emissive}
                        roughness={0.7}
                        metalness={0.15}
                    />
                </mesh>
            ))}

            <mesh position={[0, 0, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[7, 50]} />
                <meshStandardMaterial
                    color="#1a1410"
                    roughness={0.95}
                />
            </mesh>

            <mesh position={[0, 0.01, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.18, 50]} />
                <meshBasicMaterial color="#ffcc77" toneMapped={false} />
            </mesh>

            <Cables
                pcPositions={cablePositions}
                linksPerPc={1}
                linksToHero={0}
                radius={0.04}
                color="#ffaa66"
            />
        </group>
    );
}

function PushForwardCamera({ progressRef }: { progressRef: ProgressRef }) {
    const { camera } = useThree();

    useFrame(() => {
        const p = progressRef.current.value;

        if (p < EXPLOSION_END) {
            const shake = THREE.MathUtils.smoothstep(p, FLASH_PEAK - 0.02, FLASH_PEAK + 0.02)
                * (1 - THREE.MathUtils.smoothstep(p, FLASH_PEAK, EXPLOSION_END));
            const t = performance.now() * 0.001;
            camera.position.set(
                Math.sin(t * 18) * 0.06 * shake,
                Math.cos(t * 14) * 0.04 * shake,
                5,
            );
            camera.lookAt(0, 0, 0);
            return;
        }

        const gameT = THREE.MathUtils.clamp(
            (p - GAME_START) / (1 - GAME_START),
            0,
            1,
        );
        const eased = THREE.MathUtils.smoothstep(gameT, 0, 1);
        camera.position.set(
            Math.sin(eased * 0.4) * 0.5,
            1.3 + eased * 0.3,
            5 - eased * 14,
        );
        camera.lookAt(0, 1.4, -16 + eased * 4);
    });

    return null;
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    return (
        <>
            <color attach="background" args={['#000000']} />
            <fog attach="fog" args={['#1a0d08', 6, 32]} />
            <PushForwardCamera progressRef={progressRef} />
            <FusionNodes progressRef={progressRef} />
            <CoreFlash progressRef={progressRef} />
            <ParticleBurst progressRef={progressRef} />
            <GameCity progressRef={progressRef} />

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <Bloom
                    intensity={1.6}
                    luminanceThreshold={0.18}
                    luminanceSmoothing={0.9}
                    mipmapBlur
                    height={240}
                />
            </EffectComposer>
        </>
    );
}

export default function GameUniverseTransition() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const techListRef = useRef<HTMLUListElement>(null);
    const hudRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<{ value: number }>({ value: 0 });
    const frameloop = useCanvasFrameloop(sectionRef);

    useEffect(() => {
        const el = sectionRef.current;
        if (!el) return;
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ paused: true });

            tl.to(
                progressRef.current,
                {
                    value: 1,
                    duration: 10,
                    ease: 'none',
                },
                0,
            );

            tl.fromTo(
                hudRef.current,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 0.9,
                    ease: 'power2.out',
                },
                5.5,
            );

            tl.fromTo(
                titleRef.current,
                { opacity: 0, y: 30 },
                {
                    opacity: 0.87,
                    y: 0,
                    duration: 1.1,
                    ease: 'power2.out',
                },
                6.1,
            );

            tl.fromTo(
                techListRef.current,
                { opacity: 0, y: 20 },
                {
                    opacity: 0.6,
                    y: 0,
                    duration: 1.1,
                    ease: 'power2.out',
                },
                6.9,
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
            className="GameUniverse"
            aria-label="Univers gaming — fusion et révélation"
        >
            <div className="GameUniverse-sticky">
                <Canvas
                    className="GameUniverse-canvas"
                    camera={{ position: [0, 0, 5], fov: 45 }}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    dpr={[1, 1]}
                    frameloop={frameloop}
                >
                    <Scene progressRef={progressRef} />
                </Canvas>

                <div ref={hudRef} className="GameUniverse-hud" aria-hidden="true">
                    <div className="GameUniverse-hud-panel GameUniverse-hud-status">
                        <h4>Status</h4>
                        <div className="GameUniverse-hud-row">
                            <span className="GameUniverse-hud-label">HP</span>
                            <div className="GameUniverse-hud-bar"><span style={{ width: '78%' }} /></div>
                        </div>
                        <div className="GameUniverse-hud-row">
                            <span className="GameUniverse-hud-label">PWR</span>
                            <div className="GameUniverse-hud-bar GameUniverse-hud-bar--alt"><span style={{ width: '92%' }} /></div>
                        </div>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-server">
                        <h4>Server</h4>
                        <p className="GameUniverse-hud-mono">workify-fivem-01</p>
                        <p className="GameUniverse-hud-mono GameUniverse-hud-dim">128 / 256 players</p>
                        <p className="GameUniverse-hud-mono GameUniverse-hud-dim">ping 12ms · v3.4.1</p>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-inventory">
                        <h4>Inventory</h4>
                        <div className="GameUniverse-hud-grid">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="GameUniverse-hud-slot">
                                    <span className="GameUniverse-hud-slot-tag">{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="GameUniverse-overlay">
                    <h2 ref={titleRef} className="GameUniverse-title">
                        Univers gaming sur-mesure
                    </h2>
                    <ul ref={techListRef} className="GameUniverse-tech">
                        <li>Lua</li>
                        <li>TypeScript</li>
                        <li>Modding</li>
                        <li>Interfaces in-game</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
