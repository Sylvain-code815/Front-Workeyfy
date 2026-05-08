import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useCanvasFrameloop } from '../../hooks/useCanvasFrameloop';
import './BackendTransition.css';

gsap.registerPlugin(ScrollTrigger);

type ProgressRef = { current: { value: number } };

const ACCENT = '#00E5FF';

const VERTEX = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const FRAGMENT = /* glsl */ `
    uniform sampler2D uMap;
    uniform float uDissolve;
    uniform float uBrightness;
    uniform vec3 uGlowColor;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    void main() {
        vec4 color = texture2D(uMap, vUv);
        // Dimme la texture pendant la phase idle pour rester sous le seuil de bloom.
        vec3 base = color.rgb * uBrightness;
        float n = noise(vUv * 14.0);

        // Wireframe grid emerging in dissolved zones
        vec2 grid = abs(fract(vUv * 32.0) - 0.5);
        float gridLine = smoothstep(0.46, 0.5, max(grid.x, grid.y));

        if (n < uDissolve) {
            if (gridLine > 0.5) {
                gl_FragColor = vec4(uGlowColor * 1.6, 1.0);
                return;
            }
            discard;
        }

        // Glowing edge band on the dissolve front
        float edge = 1.0 - smoothstep(0.0, 0.06, n - uDissolve);
        vec3 final = mix(base, uGlowColor * 2.5, edge);

        gl_FragColor = vec4(final, 1.0);
    }
`;

function makeBrowserTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 0, 640);
    grad.addColorStop(0, '#FAFAFA');
    grad.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 640);

    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, 1024, 56);

    ['#FF5F57', '#FEBC2E', '#28C840'].forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(28 + i * 22, 28, 7, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText('Workify', 60, 200);
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText("L'expertise tech qui transforme.", 60, 244);

    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(60, 300, 420, 14);
    ctx.fillRect(60, 328, 380, 14);
    ctx.fillRect(60, 356, 360, 14);

    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(60, 420, 200, 52);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('En savoir plus', 90, 452);

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function BrowserPlane({ progressRef }: { progressRef: ProgressRef }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);
    const texture = useMemo(() => makeBrowserTexture(), []);

    const uniforms = useMemo(
        () => ({
            uMap: { value: texture },
            uDissolve: { value: 0 },
            uBrightness: { value: 0.32 },
            uGlowColor: { value: new THREE.Color(ACCENT) },
        }),
        [texture]
    );

    useFrame(({ clock }) => {
        if (!meshRef.current || !matRef.current) return;
        const p = progressRef.current.value;
        const t = clock.elapsedTime;

        // L'app dérive smooth pendant l'idle puis se fige avant le dissolve.
        const idleFactor = 1 - THREE.MathUtils.smoothstep(p, 0.30, 0.42);
        meshRef.current.position.x = Math.sin(t * 0.4) * 0.08 * idleFactor;
        meshRef.current.position.y = Math.cos(t * 0.3) * 0.05 * idleFactor;

        const dissolve = THREE.MathUtils.clamp((p - 0.375) / 0.625, 0, 1);
        matRef.current.uniforms.uDissolve.value = dissolve * 1.05;

        // Brightness : sombre pendant l'idle (sous le seuil de bloom),
        // ramp sur la fenêtre du dissolve pour donner l'éblouissement.
        const brightness = THREE.MathUtils.lerp(0.32, 1.4, dissolve);
        matRef.current.uniforms.uBrightness.value = brightness;
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[3.6, 2.25]} />
            <shaderMaterial
                ref={matRef}
                uniforms={uniforms}
                vertexShader={VERTEX}
                fragmentShader={FRAGMENT}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

function NetworkNodes({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);
    const sphereMatRef = useRef<THREE.MeshBasicMaterial>(null);
    const lineMatRef = useRef<THREE.LineBasicMaterial>(null);

    const { positions, lineGeometry } = useMemo(() => {
        const N = 32;
        const pos: THREE.Vector3[] = [];
        for (let i = 0; i < N; i++) {
            pos.push(
                new THREE.Vector3(
                    (Math.random() - 0.5) * 7,
                    (Math.random() - 0.5) * 4.5,
                    (Math.random() - 0.5) * 5 - 2.5
                )
            );
        }
        const linePoints: THREE.Vector3[] = [];
        for (let i = 0; i < N; i++) {
            const neighbours = pos
                .map((p, j) => ({ j, d: pos[i].distanceTo(p) }))
                .filter((x) => x.j !== i)
                .sort((a, b) => a.d - b.d)
                .slice(0, 2);
            for (const { j } of neighbours) {
                linePoints.push(pos[i], pos[j]);
            }
        }
        return {
            positions: pos,
            lineGeometry: new THREE.BufferGeometry().setFromPoints(linePoints),
        };
    }, []);

    useFrame(({ clock }, delta) => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        groupRef.current.rotation.y += delta * 0.05;

        const pulse = 0.7 + Math.sin(clock.elapsedTime * 2.4) * 0.3;
        // Dazzle décalé : n'apparaît que dans la deuxième moitié du dissolve.
        const dazzle = THREE.MathUtils.smoothstep(p, 0.6, 1.0);
        if (sphereMatRef.current) {
            sphereMatRef.current.opacity = dazzle * pulse;
        }
        if (lineMatRef.current) {
            lineMatRef.current.opacity = dazzle * 0.5;
        }
    });

    return (
        <group ref={groupRef}>
            {positions.map((p, i) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.06, 12, 12]} />
                    <meshBasicMaterial
                        ref={i === 0 ? sphereMatRef : undefined}
                        color={ACCENT}
                        transparent
                        opacity={0}
                        toneMapped={false}
                    />
                </mesh>
            ))}
            <lineSegments geometry={lineGeometry}>
                <lineBasicMaterial
                    ref={lineMatRef}
                    color={ACCENT}
                    transparent
                    opacity={0}
                    toneMapped={false}
                />
            </lineSegments>
        </group>
    );
}

function DatabaseStacks({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);

    const stacks = useMemo(() => {
        const layout: { x: number; z: number; layers: number }[] = [
            { x: -3.2, z: -7, layers: 4 },
            { x: 3.4, z: -10, layers: 5 },
            { x: -2.5, z: -14, layers: 4 },
            { x: 2.6, z: -18, layers: 6 },
            { x: -4.0, z: -22, layers: 3 },
            { x: 3.5, z: -26, layers: 5 },
        ];
        return layout;
    }, []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const t = clock.elapsedTime;
        // Dazzle décalé : n'apparaît qu'après le début du dissolve.
        const dazzle = THREE.MathUtils.smoothstep(p, 0.6, 1.0);
        // Flottement très léger pour combler la suppression du camera shake.
        groupRef.current.position.y = Math.sin(t * 0.6) * 0.05 * dazzle;
        groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.04 * dazzle;
        groupRef.current.children.forEach((child) => {
            const mesh = child as THREE.Mesh;
            const m = mesh.material as THREE.MeshBasicMaterial | undefined;
            if (m) m.opacity = dazzle * 0.55;
        });
    });

    return (
        <group ref={groupRef}>
            {stacks.flatMap((stack, si) =>
                Array.from({ length: stack.layers }, (_, li) => (
                    <mesh
                        key={`${si}-${li}`}
                        position={[stack.x, -1.5 + li * 0.45, stack.z]}
                    >
                        <boxGeometry args={[1.2, 0.36, 1.2]} />
                        <meshBasicMaterial
                            color={ACCENT}
                            transparent
                            opacity={0}
                            wireframe={li % 2 === 0}
                            toneMapped={false}
                        />
                    </mesh>
                ))
            )}
        </group>
    );
}

function DataFlows({ progressRef }: { progressRef: ProgressRef }) {
    const groupRef = useRef<THREE.Group>(null);

    const flows = useMemo(() => {
        const result: [number, number, number][] = [];
        for (let i = 0; i < 10; i++) {
            result.push([
                (Math.random() - 0.5) * 10,
                0,
                -(2 + Math.random() * 22),
            ]);
        }
        return result;
    }, []);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const p = progressRef.current.value;
        const t = clock.elapsedTime;
        // Dazzle décalé : n'apparaît qu'après le début du dissolve.
        const dazzle = THREE.MathUtils.smoothstep(p, 0.6, 1.0);
        groupRef.current.children.forEach((child, i) => {
            child.position.y = Math.sin(t * 0.9 + i * 0.7) * 0.4;
            const mesh = child as THREE.Mesh;
            const m = mesh.material as THREE.MeshBasicMaterial | undefined;
            if (m) m.opacity = dazzle * 0.85;
        });
    });

    return (
        <group ref={groupRef}>
            {flows.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <cylinderGeometry args={[0.025, 0.025, 6, 8]} />
                    <meshBasicMaterial
                        color={ACCENT}
                        transparent
                        opacity={0}
                        toneMapped={false}
                    />
                </mesh>
            ))}
        </group>
    );
}

function Scene({ progressRef }: { progressRef: ProgressRef }) {
    return (
        <>
            <color attach="background" args={['#000000']} />
            <fogExp2 attach="fog" args={['#000000', 0.06]} />
            <ambientLight intensity={0.3} />
            <DatabaseStacks progressRef={progressRef} />
            <DataFlows progressRef={progressRef} />
            <NetworkNodes progressRef={progressRef} />
            <BrowserPlane progressRef={progressRef} />
        </>
    );
}

export default function BackendTransition() {
    const wrapperRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const detailsRef = useRef<HTMLParagraphElement>(null);
    const progressRef = useRef<{ value: number }>({ value: 0 });
    const frameloop = useCanvasFrameloop(wrapperRef);

    useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ paused: true });

            // Timeline totale : 3s d'idle (app dérive sur x/y) + 5s de désintégration = 8s.
            tl.to(
                progressRef.current,
                {
                    value: 1,
                    duration: 8,
                    ease: 'none',
                },
                0,
            );

            tl.fromTo(
                titleRef.current,
                { opacity: 0, y: 28 },
                {
                    opacity: 0.87,
                    y: 0,
                    duration: 1.0,
                    ease: 'power2.out',
                },
                0.4,
            );

            tl.fromTo(
                detailsRef.current,
                { opacity: 0, y: 28 },
                {
                    opacity: 0.6,
                    y: 0,
                    duration: 1.0,
                    ease: 'power2.out',
                },
                1.4,
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
            ref={wrapperRef}
            className="BackendTransition"
            aria-label="Front-end vers Back-end — architectures serveurs"
        >
            <div className="BackendTransition-sticky">
                <Canvas
                    className="BackendTransition-canvas"
                    camera={{ position: [0, 0, 5], fov: 45 }}
                    gl={{ antialias: false, powerPreference: 'high-performance' }}
                    dpr={[1, 1]}
                    frameloop={frameloop}
                >
                    <Scene progressRef={progressRef} />
                    <EffectComposer multisampling={0} enableNormalPass={false}>
                        <Bloom
                            intensity={1.4}
                            luminanceThreshold={0.15}
                            luminanceSmoothing={0.9}
                            mipmapBlur
                            height={240}
                        />
                    </EffectComposer>
                </Canvas>

                <div className="BackendTransition-overlay">
                    <h2
                        ref={titleRef}
                        className="BackendTransition-title"
                    >
                        Robustesse, sécurité, architectures serveurs
                    </h2>
                    <p
                        ref={detailsRef}
                        className="BackendTransition-details"
                    >
                        Flux d&apos;authentification, architecture serveur, création
                        d&apos;API
                    </p>
                </div>
            </div>
        </section>
    );
}
