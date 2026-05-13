import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Environment, Float, RoundedBox } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import './PrismBackend.css';

type ModuleId = 'api' | 'db' | 'bus' | 'identity' | 'edge' | 'observe';

type ModuleSpec = {
    id: ModuleId;
    label: string;
    sub: string;
    stack: string[];
    metric: { value: string; unit: string };
    position: [number, number, number];
    tint: [number, number, number];
};

const MODULES: ModuleSpec[] = [
    {
        id: 'api',
        label: 'API GATEWAY',
        sub: 'Edge contract surface',
        stack: ['REST', 'GraphQL', 'gRPC'],
        metric: { value: '142k', unit: 'rps' },
        position: [-2.6, 1.1, 0.4],
        tint: [0.78, 0.86, 1.0],
    },
    {
        id: 'db',
        label: 'DATABASE',
        sub: 'Replicated, partitioned',
        stack: ['PostgreSQL 16', 'Logical Repl.', 'Sharding'],
        metric: { value: '99.997', unit: '% durable' },
        position: [2.6, 1.1, 0.4],
        tint: [1.0, 0.84, 0.95],
    },
    {
        id: 'bus',
        label: 'EVENT BUS',
        sub: 'Real-time streams',
        stack: ['Kafka', 'NATS', 'Avro'],
        metric: { value: '8.2', unit: 'ms p99' },
        position: [-2.1, -1.3, -0.6],
        tint: [0.74, 0.94, 1.0],
    },
    {
        id: 'identity',
        label: 'IDENTITY',
        sub: 'Zero-trust auth',
        stack: ['OAuth2', 'JWT', 'mTLS'],
        metric: { value: 'RS256', unit: 'rotated 24h' },
        position: [2.1, -1.3, -0.6],
        tint: [1.0, 0.78, 0.92],
    },
    {
        id: 'edge',
        label: 'EDGE & CACHE',
        sub: 'Global hot tier',
        stack: ['CDN', 'Redis 7', 'Cloudflare'],
        metric: { value: '12', unit: 'regions' },
        position: [0, 1.95, 1.0],
        tint: [0.86, 0.88, 1.0],
    },
    {
        id: 'observe',
        label: 'OBSERVABILITY',
        sub: 'Signals everywhere',
        stack: ['OpenTelemetry', 'Prometheus', 'Loki'],
        metric: { value: '47', unit: 'ms p50' },
        position: [0, -2.05, 0.0],
        tint: [0.92, 0.84, 1.0],
    },
];

type ModuleMeshProps = {
    spec: ModuleSpec;
    isHovered: boolean;
    isAnyHovered: boolean;
    onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
    onPointerOut: () => void;
    pointer: THREE.Vector2;
};

function ModuleMesh({
    spec,
    isHovered,
    isAnyHovered,
    onPointerOver,
    onPointerOut,
    pointer,
}: ModuleMeshProps) {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const targetScale = useRef(1);

    useFrame((_, delta) => {
        const grp = groupRef.current;
        if (!grp) return;

        targetScale.current = isHovered ? 1.16 : isAnyHovered ? 0.92 : 1;
        const s = grp.scale.x;
        const ns = s + (targetScale.current - s) * Math.min(1, delta * 6);
        grp.scale.setScalar(ns);

        const targetZ = isHovered ? spec.position[2] + 0.55 : spec.position[2];
        grp.position.z += (targetZ - grp.position.z) * Math.min(1, delta * 5);

        const px = spec.position[0] + pointer.x * 0.18;
        const py = spec.position[1] + pointer.y * 0.18;
        grp.position.x += (px - grp.position.x) * Math.min(1, delta * 3);
        grp.position.y += (py - grp.position.y) * Math.min(1, delta * 3);

        const m = meshRef.current;
        if (m) {
            m.rotation.x += delta * 0.15;
            m.rotation.y += delta * 0.22;
        }
    });

    return (
        <group ref={groupRef} position={spec.position}>
            <Float floatIntensity={0.6} rotationIntensity={0.25} speed={1.1}>
                <RoundedBox
                    ref={meshRef}
                    args={[1.25, 1.25, 1.25]}
                    radius={0.22}
                    smoothness={6}
                    creaseAngle={0.4}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        onPointerOver(e);
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={() => {
                        onPointerOut();
                        document.body.style.cursor = '';
                    }}
                >
                    <meshPhysicalMaterial
                        transmission={1}
                        thickness={0.85}
                        roughness={0.05}
                        ior={1.45}
                        iridescence={1}
                        iridescenceIOR={1.32}
                        iridescenceThicknessRange={[100, 600]}
                        clearcoat={1}
                        clearcoatRoughness={0.04}
                        attenuationDistance={2.4}
                        attenuationColor={new THREE.Color(...spec.tint)}
                        color="#ffffff"
                        envMapIntensity={1.4}
                    />
                </RoundedBox>
            </Float>
        </group>
    );
}

function PrismScene({
    hoveredId,
    setHoveredId,
}: {
    hoveredId: ModuleId | null;
    setHoveredId: (id: ModuleId | null) => void;
}) {
    const pointer = useRef(new THREE.Vector2(0, 0));

    useFrame(({ pointer: p }) => {
        pointer.current.lerp(p, 0.1);
    });

    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 6, 4]} intensity={0.9} color="#cfe1ff" />
            <directionalLight position={[-5, -3, 2]} intensity={0.6} color="#ffd4ec" />
            <Environment preset="apartment" environmentIntensity={1.1} />

            {MODULES.map((m) => (
                <ModuleMesh
                    key={m.id}
                    spec={m}
                    isHovered={hoveredId === m.id}
                    isAnyHovered={hoveredId !== null && hoveredId !== m.id}
                    onPointerOver={() => setHoveredId(m.id)}
                    onPointerOut={() => setHoveredId(null)}
                    pointer={pointer.current}
                />
            ))}

            <EffectComposer>
                <Bloom intensity={0.55} luminanceThreshold={0.78} luminanceSmoothing={0.4} mipmapBlur />
                <ChromaticAberration
                    offset={new THREE.Vector2(0.0018, 0.0024)}
                    blendFunction={BlendFunction.NORMAL}
                    radialModulation={false}
                    modulationOffset={0}
                />
            </EffectComposer>
        </>
    );
}

const CONNECTIONS: [ModuleId, ModuleId][] = [
    ['api', 'db'],
    ['api', 'bus'],
    ['db', 'bus'],
    ['identity', 'api'],
    ['edge', 'api'],
    ['observe', 'db'],
    ['observe', 'bus'],
    ['edge', 'identity'],
];

function projectToScreen(pos: [number, number, number]): { x: number; y: number } {
    // Rough orthographic projection — drives only the decorative SVG overlay.
    const sx = 50 + pos[0] * 11;
    const sy = 50 - pos[1] * 13;
    return { x: sx, y: sy };
}

export default function PrismBackend() {
    const [hoveredId, setHoveredId] = useState<ModuleId | null>(null);
    const [cursor, setCursor] = useState({ x: 50, y: 50 });
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const el = wrapperRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * 100;
            const y = ((e.clientY - r.top) / r.height) * 100;
            setCursor({ x, y });
        };
        const node = wrapperRef.current;
        node?.addEventListener('mousemove', onMove);
        return () => node?.removeEventListener('mousemove', onMove);
    }, []);

    const lines = useMemo(
        () =>
            CONNECTIONS.map(([a, b], i) => {
                const A = MODULES.find((m) => m.id === a)!;
                const B = MODULES.find((m) => m.id === b)!;
                const pa = projectToScreen(A.position);
                const pb = projectToScreen(B.position);
                const mx = (pa.x + pb.x) / 2 + (i % 2 === 0 ? 3 : -3);
                const my = (pa.y + pb.y) / 2 + (i % 2 === 0 ? -2 : 2);
                return { id: `${a}-${b}`, d: `M ${pa.x} ${pa.y} Q ${mx} ${my} ${pb.x} ${pb.y}`, delay: i * 0.4 };
            }),
        []
    );

    const hovered = MODULES.find((m) => m.id === hoveredId) ?? null;

    return (
        <div ref={wrapperRef} className="PrismBackend" data-hovered={hovered ? 'true' : 'false'}>
            <div
                className="PrismBackend-aura"
                style={{ ['--prism-cursor-x' as string]: `${cursor.x}%`, ['--prism-cursor-y' as string]: `${cursor.y}%` }}
            />
            <div className="PrismBackend-grain" />

            <div className="PrismBackend-canvas">
                <Canvas
                    camera={{ position: [0, 0, 7.2], fov: 38 }}
                    gl={{ antialias: true, alpha: true }}
                    dpr={[1, 2]}
                >
                    <PrismScene hoveredId={hoveredId} setHoveredId={setHoveredId} />
                </Canvas>
            </div>

            <svg className="PrismBackend-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <defs>
                    <linearGradient id="prismLineGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#7AA9FF" />
                        <stop offset="50%" stopColor="#FFFFFF" />
                        <stop offset="100%" stopColor="#FFADD6" />
                    </linearGradient>
                </defs>
                {lines.map((l) => (
                    <path
                        key={l.id}
                        d={l.d}
                        className="PrismBackend-line"
                        style={{ animationDelay: `${l.delay}s` }}
                    />
                ))}
            </svg>

            <header className="PrismBackend-header">
                <p className="PrismBackend-eyebrow">// BACKEND_PROTOTYPE / D / PRISM</p>
                <h2 className="PrismBackend-title">
                    <span className="PrismBackend-title-line">Backend.</span>
                    <span className="PrismBackend-title-line is-accent">Reconsidered.</span>
                </h2>
                <p className="PrismBackend-sub">Six systems. One coherence.</p>
            </header>

            <div className="PrismBackend-labels" aria-hidden>
                {MODULES.map((m) => {
                    const p = projectToScreen(m.position);
                    return (
                        <div
                            key={m.id}
                            className={`PrismBackend-label${hoveredId === m.id ? ' is-active' : ''}`}
                            style={{ left: `${p.x}%`, top: `${p.y}%` }}
                        >
                            <span className="PrismBackend-label-dot" />
                            <span className="PrismBackend-label-text">{m.label}</span>
                        </div>
                    );
                })}
            </div>

            <div className={`PrismBackend-card${hovered ? ' is-visible' : ''}`} aria-live="polite">
                {hovered && (
                    <>
                        <div className="PrismBackend-card-head">
                            <span className="PrismBackend-card-dot" />
                            <span className="PrismBackend-card-id">{hovered.id.toUpperCase()}</span>
                        </div>
                        <h3 className="PrismBackend-card-title">{hovered.label}</h3>
                        <p className="PrismBackend-card-sub">{hovered.sub}</p>
                        <ul className="PrismBackend-card-stack">
                            {hovered.stack.map((s) => (
                                <li key={s}>{s}</li>
                            ))}
                        </ul>
                        <div className="PrismBackend-card-metric">
                            <span className="PrismBackend-card-metric-value">{hovered.metric.value}</span>
                            <span className="PrismBackend-card-metric-unit">{hovered.metric.unit}</span>
                        </div>
                    </>
                )}
            </div>

            <footer className="PrismBackend-footer">
                <div className="PrismBackend-stat">
                    <span className="PrismBackend-stat-value">99.99<small>%</small></span>
                    <span className="PrismBackend-stat-label">uptime · rolling 90d</span>
                </div>
                <div className="PrismBackend-stat">
                    <span className="PrismBackend-stat-value">12</span>
                    <span className="PrismBackend-stat-label">regions · primary + read</span>
                </div>
                <div className="PrismBackend-stat">
                    <span className="PrismBackend-stat-value">47<small>ms</small></span>
                    <span className="PrismBackend-stat-label">p50 latency · globally</span>
                </div>
            </footer>
        </div>
    );
}
