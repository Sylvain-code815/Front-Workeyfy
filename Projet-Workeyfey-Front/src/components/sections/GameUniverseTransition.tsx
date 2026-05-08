import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
import { SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { createBraidTexture } from '../canvas/cableTexture';
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
const SPARK_COLOR = '#7ff7ff';
const CYAN = '#00E5FF';
const MAGENTA = '#ff2a8a';

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

type Building = {
    pos: [number, number, number];
    size: [number, number, number];
    tone: number;
    accent: 'cyan' | 'magenta' | 'dim';
    seed: number;
};

function createWindowTexture(seed: number, accent: 'cyan' | 'magenta' | 'dim'): THREE.CanvasTexture {
    const W = 256;
    const H = 512;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    let s = seed * 9301 + 49297;
    const rand = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };

    const cols = 8;
    const rows = 18;
    const cw = W / cols;
    const rh = H / rows;
    const padX = cw * 0.18;
    const padY = rh * 0.18;

    const litColor =
        accent === 'magenta'
            ? ['rgba(255, 90, 180, 0.95)', 'rgba(255, 130, 200, 0.6)']
            : accent === 'cyan'
              ? ['rgba(120, 240, 255, 0.95)', 'rgba(60, 200, 240, 0.55)']
              : ['rgba(180, 220, 240, 0.45)', 'rgba(120, 160, 200, 0.25)'];

    const litRate = accent === 'dim' ? 0.18 : 0.42;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const lit = rand() < litRate;
            ctx.fillStyle = lit ? (rand() > 0.6 ? litColor[0] : litColor[1]) : 'rgba(255,255,255,0.02)';
            ctx.fillRect(
                c * cw + padX,
                r * rh + padY,
                cw - padX * 2,
                rh - padY * 2,
            );
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 4;
    tex.needsUpdate = true;
    return tex;
}

function CityCables({ buildings }: { buildings: Building[] }) {
    const braidTex = useMemo(() => {
        const t = createBraidTexture();
        t.repeat.set(2, 24);
        return t;
    }, []);

    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color: '#000508',
                emissive: new THREE.Color(CYAN),
                emissiveIntensity: 1.7,
                emissiveMap: braidTex,
                roughness: 0.35,
                metalness: 0.25,
                toneMapped: false,
            }),
        [braidTex],
    );

    const curves = useMemo(() => {
        const result: THREE.CatmullRomCurve3[] = [];
        let s = 71;
        const rand = () => {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };

        // Side spines along the curbs (left & right of road)
        const makeSpine = (x: number) => {
            const pts: THREE.Vector3[] = [];
            for (let z = 4; z >= -44; z -= 2.5) {
                pts.push(
                    new THREE.Vector3(
                        x + (rand() - 0.5) * 0.18,
                        0.04 + (rand() - 0.5) * 0.02,
                        z,
                    ),
                );
            }
            return new THREE.CatmullRomCurve3(pts);
        };
        const leftSpine = makeSpine(-2.6);
        const rightSpine = makeSpine(2.6);
        result.push(leftSpine, rightSpine);

        // Branch cables: from curb spine up each building facade
        buildings.forEach((b, i) => {
            const sideSign = b.pos[0] > 0 ? 1 : -1;
            const curbX = sideSign * 2.6;
            const z = b.pos[2];
            // Facade face that looks toward the street
            const facadeX = b.pos[0] - sideSign * (b.size[0] / 2 + 0.02);
            const facadeTopY = Math.min(b.size[1] - 0.4, 0.8 + (i % 5) * 0.55);
            const climbY = facadeTopY * 0.55;

            const start = new THREE.Vector3(curbX, 0.04, z + 0.1);
            const sag = new THREE.Vector3(
                (curbX + facadeX) * 0.5,
                0.18,
                z - 0.05,
            );
            const wallBase = new THREE.Vector3(facadeX, 0.5, z);
            const wallMid = new THREE.Vector3(facadeX, climbY, z);
            const wallTop = new THREE.Vector3(facadeX, facadeTopY, z);
            result.push(
                new THREE.CatmullRomCurve3([start, sag, wallBase, wallMid, wallTop]),
            );
        });

        // Cross cables (suspended above the street, connecting opposite facades)
        for (let i = 0; i < buildings.length; i += 4) {
            const b = buildings[i];
            if (!b) continue;
            const z = b.pos[2];
            const high = 3.2 + (i % 3) * 0.4;
            const left = new THREE.Vector3(-2.4, 1.2, z);
            const archA = new THREE.Vector3(-1.0, high, z + 0.15);
            const archB = new THREE.Vector3(1.0, high, z - 0.15);
            const right = new THREE.Vector3(2.4, 1.2, z);
            result.push(new THREE.CatmullRomCurve3([left, archA, archB, right]));
        }

        return result;
    }, [buildings]);

    useFrame(({ clock }) => {
        const t = clock.elapsedTime;
        material.emissiveIntensity = 1.45 + 0.35 * Math.sin(t * 0.7);
        if (material.emissiveMap) {
            material.emissiveMap.offset.y = -t * 0.06;
        }
    });

    return (
        <group>
            {curves.map((curve, i) => (
                <mesh key={i} material={material}>
                    <tubeGeometry args={[curve, 48, 0.04, 6, false]} />
                </mesh>
            ))}
        </group>
    );
}

function CityBuildings({ buildings }: { buildings: Building[] }) {
    const materials = useMemo(() => {
        return buildings.map((b) => {
            const tex = createWindowTexture(b.seed, b.accent);
            return new THREE.MeshStandardMaterial({
                color: '#0a0e14',
                emissiveMap: tex,
                emissive: new THREE.Color('#ffffff'),
                emissiveIntensity: b.accent === 'dim' ? 0.55 : 1.05,
                roughness: 0.55,
                metalness: 0.55,
                toneMapped: true,
            });
        });
    }, [buildings]);

    useEffect(() => {
        return () => {
            materials.forEach((m) => {
                if (m.emissiveMap) m.emissiveMap.dispose();
                m.dispose();
            });
        };
    }, [materials]);

    return (
        <>
            {buildings.map((b, i) => (
                <mesh key={i} position={b.pos} material={materials[i]}>
                    <boxGeometry args={b.size} />
                </mesh>
            ))}
        </>
    );
}

function GameCity({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);

    const buildings = useMemo<Building[]>(() => {
        let seed = 13;
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        const result: Building[] = [];
        for (let row = 0; row < 9; row++) {
            for (let side = -1; side <= 1; side += 2) {
                const x = side * (3.4 + rand() * 1.2);
                const z = -row * 4.2 - 4;
                const h = 3.2 + rand() * 5.5;
                const w = 1.8 + rand() * 0.6;
                const d = 1.8 + rand() * 0.6;
                const r = rand();
                const accent: Building['accent'] =
                    r < 0.18 ? 'magenta' : r < 0.62 ? 'cyan' : 'dim';
                result.push({
                    pos: [x, h / 2, z],
                    size: [w, h, d],
                    tone: 8 + rand() * 6,
                    accent,
                    seed: row * 31 + (side + 1) * 7 + Math.floor(rand() * 1000),
                });
            }
        }
        return result;
    }, []);

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
            {/* Cool moonlight from above — no ambient, very subtle */}
            <directionalLight
                position={[8, 18, 6]}
                intensity={0.35}
                color="#5a78b8"
            />
            <hemisphereLight
                args={['#1a2840', '#040608', 0.12]}
            />

            {/* Cyan volumetric god ray cutting from upper-left */}
            <SpotLight
                position={[-7, 14, -10]}
                target-position={[-1, 2, -16]}
                color={CYAN}
                intensity={70}
                angle={0.42}
                penumbra={0.55}
                distance={42}
                attenuation={6}
                anglePower={5}
                opacity={0.55}
                radiusTop={0.12}
                radiusBottom={1.4}
                volumetric
            />

            {/* Magenta volumetric god ray from upper-right */}
            <SpotLight
                position={[7, 13, -22]}
                target-position={[1, 1.5, -28]}
                color={MAGENTA}
                intensity={60}
                angle={0.4}
                penumbra={0.6}
                distance={42}
                attenuation={6}
                anglePower={5}
                opacity={0.5}
                radiusTop={0.12}
                radiusBottom={1.4}
                volumetric
            />

            {/* Cyan accent down the central corridor */}
            <SpotLight
                position={[0, 9, -34]}
                target-position={[0, 0.3, -8]}
                color={CYAN}
                intensity={55}
                angle={0.32}
                penumbra={0.7}
                distance={44}
                attenuation={6}
                anglePower={5}
                opacity={0.32}
                radiusTop={0.06}
                radiusBottom={0.6}
                volumetric
            />

            <CityBuildings buildings={buildings} />

            {/* Wet asphalt road */}
            <mesh position={[0, 0, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[7, 50]} />
                <meshStandardMaterial
                    color="#04080c"
                    roughness={0.32}
                    metalness={0.55}
                />
            </mesh>

            {/* Glowing center line */}
            <mesh position={[0, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.14, 50]} />
                <meshBasicMaterial color={CYAN} toneMapped={false} />
            </mesh>

            {/* Side curb glow strips */}
            <mesh position={[-3.32, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, 50]} />
                <meshBasicMaterial color={CYAN} toneMapped={false} />
            </mesh>
            <mesh position={[3.32, 0.011, -18]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.06, 50]} />
                <meshBasicMaterial color={MAGENTA} toneMapped={false} />
            </mesh>

            <CityCables buildings={buildings} />
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
            <color attach="background" args={['#02050a']} />
            <fog attach="fog" args={['#040a14', 7, 36]} />
            <PushForwardCamera progressRef={progressRef} />
            <FusionNodes progressRef={progressRef} />
            <CoreFlash progressRef={progressRef} />
            <ParticleBurst progressRef={progressRef} />
            <GameCity progressRef={progressRef} />

            <EffectComposer multisampling={0} enableNormalPass={false}>
                <Bloom
                    intensity={1.55}
                    luminanceThreshold={0.16}
                    luminanceSmoothing={0.9}
                    mipmapBlur
                    height={300}
                />
                <DepthOfField
                    focusDistance={0.012}
                    focalLength={0.045}
                    bokehScale={3.2}
                    height={360}
                />
            </EffectComposer>
        </>
    );
}

export default function GameUniverseTransition() {
    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const techListRef = useRef<HTMLUListElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
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
                overlayRef.current,
                { opacity: 0 },
                {
                    opacity: 1,
                    duration: 0.9,
                    ease: 'power2.out',
                },
                6.0,
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
                    <div className="GameUniverse-hud-panel GameUniverse-hud-server">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot" />
                            <h4>Server Status</h4>
                        </div>
                        <ul className="GameUniverse-hud-kv">
                            <li>
                                <span className="GameUniverse-hud-key">FiveM Connection</span>
                                <span className="GameUniverse-hud-val GameUniverse-hud-val--ok">Stable</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Tickrate</span>
                                <span className="GameUniverse-hud-val">128 Hz</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Players</span>
                                <span className="GameUniverse-hud-val">128 / 256</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-key">Build</span>
                                <span className="GameUniverse-hud-val">workify-fivem · v3.4.1</span>
                            </li>
                        </ul>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-link">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot GameUniverse-hud-dot--magenta" />
                            <h4>Connection</h4>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Latency</span>
                            <span className="GameUniverse-hud-mono">12 ms</span>
                            <div className="GameUniverse-hud-bar"><span style={{ width: '14%' }} /></div>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Frame time</span>
                            <span className="GameUniverse-hud-mono">7.8 ms</span>
                            <div className="GameUniverse-hud-bar"><span style={{ width: '38%' }} /></div>
                        </div>
                        <div className="GameUniverse-hud-metric">
                            <span className="GameUniverse-hud-key">Packet loss</span>
                            <span className="GameUniverse-hud-mono">0.02 %</span>
                            <div className="GameUniverse-hud-bar GameUniverse-hud-bar--alt"><span style={{ width: '4%' }} /></div>
                        </div>
                    </div>

                    <div className="GameUniverse-hud-panel GameUniverse-hud-queue">
                        <div className="GameUniverse-hud-panel-head">
                            <span className="GameUniverse-hud-dot" />
                            <h4>Modding Queue</h4>
                            <span className="GameUniverse-hud-tag">/scripts</span>
                        </div>
                        <ul className="GameUniverse-hud-queue-list">
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang">lua</span>
                                    <span>core/inventory.lua</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--ok">running</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang GameUniverse-hud-script-lang--ts">ts</span>
                                    <span>nui/hud.tsx</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--ok">running</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang">lua</span>
                                    <span>esx_jobs/dispatch.lua</span>
                                </span>
                                <span className="GameUniverse-hud-status">build 84%</span>
                            </li>
                            <li>
                                <span className="GameUniverse-hud-script">
                                    <span className="GameUniverse-hud-script-lang GameUniverse-hud-script-lang--ts">ts</span>
                                    <span>shared/protocol.ts</span>
                                </span>
                                <span className="GameUniverse-hud-status GameUniverse-hud-status--queue">queued</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div ref={overlayRef} className="GameUniverse-overlay">
                    <span className="GameUniverse-overlay-eyebrow">// metaverse · build pipeline</span>
                    <h2 ref={titleRef} className="GameUniverse-title">
                        Metaverse Modding Framework
                    </h2>
                    <ul ref={techListRef} className="GameUniverse-tech">
                        <li>Lua</li>
                        <li>TypeScript</li>
                        <li>FiveM</li>
                        <li>NUI</li>
                    </ul>
                </div>
            </div>
        </section>
    );
}
