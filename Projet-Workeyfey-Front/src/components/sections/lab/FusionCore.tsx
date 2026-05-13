import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import './FusionCore.css';

type ServiceId = 'api' | 'db' | 'events' | 'cache' | 'auth' | 'observe';

type Service = {
    id: ServiceId;
    name: string;
    short: string;
    accent: string;
    accentRgb: [number, number, number];
    runtime: string;
    version: string;
    replicas: string;
    load: number;
    region: string;
    status: 'ok' | 'warn' | 'idle';
};

const INITIAL_SERVICES: Service[] = [
    {
        id: 'api',
        name: 'API Gateway',
        short: 'gateway',
        accent: '#5EE7E7',
        accentRgb: [0.37, 0.91, 0.91],
        runtime: 'Node.js LTS',
        version: 'v18.4.2',
        replicas: '8/8',
        load: 62,
        region: 'EU-WEST-3',
        status: 'ok',
    },
    {
        id: 'db',
        name: 'PostgreSQL',
        short: 'postgres',
        accent: '#FF3DCB',
        accentRgb: [1.0, 0.24, 0.8],
        runtime: 'Postgres 16',
        version: 'v16.4.0',
        replicas: '3/3',
        load: 41,
        region: 'EU-WEST-3',
        status: 'ok',
    },
    {
        id: 'events',
        name: 'Event Bus',
        short: 'kafka',
        accent: '#FFB14A',
        accentRgb: [1.0, 0.69, 0.29],
        runtime: 'Kafka 3.7',
        version: 'v3.7.1',
        replicas: '5/5',
        load: 78,
        region: 'US-EAST-1',
        status: 'warn',
    },
    {
        id: 'cache',
        name: 'Edge Cache',
        short: 'redis',
        accent: '#6EFFB1',
        accentRgb: [0.43, 1.0, 0.69],
        runtime: 'Redis 7',
        version: 'v7.2.4',
        replicas: '6/6',
        load: 28,
        region: 'GLOBAL',
        status: 'ok',
    },
    {
        id: 'auth',
        name: 'Identity',
        short: 'auth',
        accent: '#B58CFF',
        accentRgb: [0.71, 0.55, 1.0],
        runtime: 'Deno 1.40',
        version: 'v4.1.0',
        replicas: '4/4',
        load: 35,
        region: 'EU-WEST-3',
        status: 'ok',
    },
    {
        id: 'observe',
        name: 'Observability',
        short: 'otel',
        accent: '#7AB8FF',
        accentRgb: [0.48, 0.72, 1.0],
        runtime: 'Rust / Tokio',
        version: 'v2.3.0',
        replicas: '3/3',
        load: 55,
        region: 'MULTI',
        status: 'idle',
    },
];

const BRUTAL_LINES = [
    'BACKEND IS NOT A POEM',
    'POSTGRES IS FOR ADULTS',
    'AT 03:17 NOBODY NOTICED',
    'THE BACKEND IS THE PROMISE',
];

const IDLE_COLOR: [number, number, number] = [0.78, 0.86, 1.0];
const SERVICE_IDS: ServiceId[] = ['api', 'db', 'events', 'cache', 'auth', 'observe'];

// ── Custom-property registration (animatable lengths/numbers for GSAP) ──
let propsRegistered = false;
function registerCustomProps() {
    if (propsRegistered) return;
    propsRegistered = true;
    if (typeof CSS === 'undefined' || !('registerProperty' in CSS)) return;
    const safe = (config: { name: string; syntax: string; inherits: boolean; initialValue: string }) => {
        try {
            (CSS as unknown as { registerProperty: (c: typeof config) => void }).registerProperty(config);
        } catch {
            /* already registered */
        }
    };
    safe({ name: '--fc-mx', syntax: '<length>', inherits: false, initialValue: '0px' });
    safe({ name: '--fc-my', syntax: '<length>', inherits: false, initialValue: '0px' });
    safe({ name: '--fc-scale', syntax: '<number>', inherits: false, initialValue: '1' });
    safe({ name: '--fc-prox', syntax: '<number>', inherits: false, initialValue: '0' });
    safe({ name: '--fc-rx', syntax: '<number>', inherits: false, initialValue: '0' });
    safe({ name: '--fc-ry', syntax: '<number>', inherits: false, initialValue: '0' });
}

// ── Sphere ────────────────────────────────────────────────────────────
function LiquidSphere({
    targetColor,
    contractRef,
    pulseRef,
}: {
    targetColor: { current: [number, number, number] };
    contractRef: { current: number };
    pulseRef: { current: number };
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshPhysicalMaterial>(null);
    const colorRef = useRef(new THREE.Color(...IDLE_COLOR));

    useFrame(({ clock }, delta) => {
        const m = meshRef.current;
        const mat = matRef.current;
        if (!m || !mat) return;

        const t = clock.getElapsedTime();
        const breathe = 1 + Math.sin(t * 0.6) * 0.04;
        const target = targetColor.current;
        const next = new THREE.Color(target[0], target[1], target[2]);
        colorRef.current.lerp(next, Math.min(1, delta * 3));
        (mat.attenuationColor as THREE.Color).copy(colorRef.current);

        const contract = contractRef.current;
        const finalScale = breathe * (1 - contract * 0.6) * pulseRef.current;
        m.scale.setScalar(finalScale);

        m.rotation.y += delta * 0.08;
        m.rotation.x += delta * 0.04;
    });

    return (
        <mesh ref={meshRef}>
            <icosahedronGeometry args={[1.45, 32]} />
            <meshPhysicalMaterial
                ref={matRef}
                color="#ffffff"
                transmission={1}
                thickness={1.3}
                roughness={0.04}
                ior={1.45}
                iridescence={0.85}
                iridescenceIOR={1.32}
                iridescenceThicknessRange={[120, 540]}
                clearcoat={1}
                clearcoatRoughness={0.05}
                attenuationDistance={1.8}
                attenuationColor={new THREE.Color(...IDLE_COLOR)}
                envMapIntensity={1.5}
            />
        </mesh>
    );
}

function SphereScene({
    targetColor,
    contractRef,
    pulseRef,
}: {
    targetColor: { current: [number, number, number] };
    contractRef: { current: number };
    pulseRef: { current: number };
}) {
    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 4]} intensity={1} color="#dbe7ff" />
            <directionalLight position={[-4, -2, 2]} intensity={0.7} color="#ffd4ec" />
            <Environment preset="studio" environmentIntensity={1.1} />
            <LiquidSphere targetColor={targetColor} contractRef={contractRef} pulseRef={pulseRef} />
            <EffectComposer>
                <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.45} mipmapBlur />
            </EffectComposer>
        </>
    );
}

// ── Mini sinusoid (rendered inside the HUD) ──────────────────────────
function AgitationWave({
    agitation,
    color,
    height = 32,
    strokeWidth = 1.4,
}: {
    agitation: number;
    color: string;
    height?: number;
    strokeWidth?: number;
}) {
    const pathRef = useRef<SVGPathElement>(null);
    const gradientId = useMemo(
        () => `fcWaveGrad-${color.slice(1)}-${Math.round(height)}-${Math.round(agitation * 1000)}`,
        [color, height, agitation]
    );

    useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const tick = () => {
            const t = (performance.now() - start) / 1000;
            const p = pathRef.current;
            if (p) {
                const N = 40;
                const amp = 4 + agitation * 10;
                const freq = 1.4 + agitation * 4.5;
                const speed = 1.2 + agitation * 3;
                const pts: string[] = [];
                for (let i = 0; i <= N; i++) {
                    const x = (i / N) * 100;
                    const y =
                        20 +
                        Math.sin((i / N) * Math.PI * freq + t * speed) * amp +
                        Math.sin((i / N) * Math.PI * freq * 2 + t * speed * 1.7) * (amp * 0.35);
                    pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`);
                }
                p.setAttribute('d', pts.join(' '));
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [agitation]);

    return (
        <svg
            className={`FusionCore-hud-wave${height < 24 ? ' FusionCore-hud-wave--mini' : ''}`}
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            style={{ height }}
            aria-hidden
        >
            <defs>
                <linearGradient id={gradientId} x1="0" x2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={color} stopOpacity="1" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.2" />
                </linearGradient>
            </defs>
            <path
                ref={pathRef}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </svg>
    );
}

// ── Micro bar chart (CPU/RAM/NET) ─────────────────────────────────────
function MicroBar({
    label,
    color,
    getValue,
}: {
    label: string;
    color: string;
    getValue: (t: number) => number;
}) {
    const fillRef = useRef<HTMLSpanElement>(null);
    const numRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        let raf = 0;
        const start = performance.now();
        const tick = () => {
            const t = performance.now() - start;
            const v = Math.max(0, Math.min(100, getValue(t)));
            if (fillRef.current) fillRef.current.style.width = `${v.toFixed(1)}%`;
            if (numRef.current) numRef.current.textContent = `${v.toFixed(0)}`;
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [getValue]);

    return (
        <div className="FusionCore-hud-microbar" style={{ ['--fc-accent' as string]: color }}>
            <span className="FusionCore-hud-microbar-label">{label}</span>
            <span className="FusionCore-hud-microbar-track">
                <span ref={fillRef} className="FusionCore-hud-microbar-fill" />
            </span>
            <span ref={numRef} className="FusionCore-hud-microbar-num">0</span>
        </div>
    );
}

// ── Glitch reveal for HUD values ──────────────────────────────────────
const GLITCH_CHARS = '!<>-_\\/[]{}—=+*^?#________ABCDEF0123456789';
function useGlitchReveal(value: string, durationMs = 220): string {
    const [shown, setShown] = useState('');
    useEffect(() => {
        if (!value) {
            setShown('');
            return;
        }
        const start = performance.now();
        let raf: number | null = null;
        const tick = () => {
            const t = Math.min(1, (performance.now() - start) / durationMs);
            const locked = Math.floor(t * value.length);
            let out = value.slice(0, locked);
            for (let i = locked; i < value.length; i++) {
                const ch = value[i];
                if (ch === ' ') out += ' ';
                else out += GLITCH_CHARS[(Math.random() * GLITCH_CHARS.length) | 0];
            }
            setShown(out);
            if (t < 1) raf = requestAnimationFrame(tick);
            else setShown(value);
        };
        raf = requestAnimationFrame(tick);
        return () => {
            if (raf !== null) cancelAnimationFrame(raf);
        };
    }, [value, durationMs]);
    return shown;
}

// ── Pseudo-random generator for deterministic data columns ────────────
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Vertical raw-data scroll column ───────────────────────────────────
function DataColumn({ side, seed, rows = 160 }: { side: 'left' | 'right'; seed: number; rows?: number }) {
    const block = useMemo(() => {
        const rand = mulberry32(seed);
        const lines: string[] = [];
        for (let i = 0; i < rows; i++) {
            if (rand() < 0.5) {
                const v = (rand() * 65536) | 0;
                lines.push(v.toString(16).toUpperCase().padStart(4, '0'));
            } else {
                const v = (rand() * 256) | 0;
                lines.push(v.toString(2).padStart(8, '0'));
            }
        }
        return lines.join('\n');
    }, [seed, rows]);

    return (
        <div className={`FusionCore-data FusionCore-data--${side}`} aria-hidden>
            <pre>{block}{'\n'}{block}</pre>
        </div>
    );
}

// ── Service tile layout (six points on an ellipse around the sphere) ──
const TILE_POSITIONS: Record<ServiceId, { x: number; y: number }> = {
    api: { x: 14, y: 24 },
    db: { x: 86, y: 24 },
    events: { x: 92, y: 56 },
    cache: { x: 86, y: 86 },
    auth: { x: 14, y: 86 },
    observe: { x: 8, y: 56 },
};

const CENTER = { x: 50, y: 55 };

// Precomputed radial order: closest tile first, then outward (stable for ties).
const RADIAL_ORDER: ServiceId[] = [...SERVICE_IDS].sort((a, b) => {
    const da = Math.hypot(TILE_POSITIONS[a].x - CENTER.x, TILE_POSITIONS[a].y - CENTER.y);
    const db = Math.hypot(TILE_POSITIONS[b].x - CENTER.x, TILE_POSITIONS[b].y - CENTER.y);
    return da - db;
});

export default function FusionCore() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const sphereGlowRef = useRef<HTMLDivElement>(null);
    const targetColorRef = useRef<[number, number, number]>(IDLE_COLOR);
    const contractRef = useRef(0);
    const pulseRef = useRef(1);
    const tileRefs = useRef<Record<ServiceId, HTMLButtonElement | null>>({
        api: null, db: null, events: null, cache: null, auth: null, observe: null,
    });
    const scanTokenRef = useRef(0);

    // GSAP quickTo binders, allocated once.
    const rxQuickTo = useRef<((v: number) => void) | null>(null);
    const ryQuickTo = useRef<((v: number) => void) | null>(null);

    const [services] = useState<Service[]>(INITIAL_SERVICES);
    const [hoveredId, setHoveredId] = useState<ServiceId | null>(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0 });
    const [hudPos, setHudPos] = useState({ x: 0, y: 0 });
    const [parallax, setParallax] = useState({ x: 0, y: 0 });
    const [isGlitching, setIsGlitching] = useState(false);
    const [restartCount, setRestartCount] = useState(0);
    const [deployTick, setDeployTick] = useState(0);
    const [scanning, setScanning] = useState<Set<ServiceId>>(() => new Set());

    const hovered = useMemo(
        () => services.find((s) => s.id === hoveredId) ?? null,
        [hoveredId, services]
    );

    // Register CSS custom properties + build quickTo binders once.
    useEffect(() => {
        registerCustomProps();
        const root = wrapperRef.current;
        if (root) {
            rxQuickTo.current = gsap.quickTo(root, '--fc-rx', { duration: 0.9, ease: 'power2.out' });
            ryQuickTo.current = gsap.quickTo(root, '--fc-ry', { duration: 0.9, ease: 'power2.out' });
        }
        return () => {
            const tiles = Object.values(tileRefs.current).filter(Boolean) as HTMLButtonElement[];
            if (root) gsap.killTweensOf(root);
            tiles.forEach((t) => gsap.killTweensOf(t));
        };
    }, []);

    // Sphere accent color follows the hovered service.
    useEffect(() => {
        if (hovered) {
            targetColorRef.current = hovered.accentRgb;
        } else {
            targetColorRef.current = IDLE_COLOR;
        }
    }, [hovered]);

    // Smooth HUD follow.
    useEffect(() => {
        let raf = 0;
        const lerp = () => {
            setHudPos((p) => ({
                x: p.x + (cursor.x - p.x) * 0.18,
                y: p.y + (cursor.y - p.y) * 0.18,
            }));
            raf = requestAnimationFrame(lerp);
        };
        raf = requestAnimationFrame(lerp);
        return () => cancelAnimationFrame(raf);
    }, [cursor]);

    // Global mouse listener: drives parallax (via GSAP, inertial) +
    // per-tile proximity --fc-prox (continuous glow).
    useEffect(() => {
        const node = wrapperRef.current;
        if (!node) return;

        const onMove = (e: MouseEvent) => {
            const r = node.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            setCursor({ x, y });

            const nx = (x / r.width) - 0.5;
            const ny = (y / r.height) - 0.5;
            setParallax({ x: nx * 2, y: ny * 2 });

            // Inertial parallax via GSAP power2.out (continues briefly after stop).
            rxQuickTo.current?.(nx * 2);
            ryQuickTo.current?.(ny * 2);

            // Continuous proximity glow on every tile.
            const threshold = 260;
            SERVICE_IDS.forEach((id) => {
                const el = tileRefs.current[id];
                if (!el) return;
                const tr = el.getBoundingClientRect();
                const cx = tr.left - r.left + tr.width / 2;
                const cy = tr.top - r.top + tr.height / 2;
                const d = Math.hypot(x - cx, y - cy);
                const prox = Math.max(0, 1 - d / threshold);
                el.style.setProperty('--fc-prox', prox.toFixed(3));
            });
        };

        const onLeave = () => {
            SERVICE_IDS.forEach((id) => {
                const el = tileRefs.current[id];
                if (el) el.style.setProperty('--fc-prox', '0');
            });
            rxQuickTo.current?.(0);
            ryQuickTo.current?.(0);
        };

        node.addEventListener('mousemove', onMove);
        node.addEventListener('mouseleave', onLeave);
        return () => {
            node.removeEventListener('mousemove', onMove);
            node.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    // Magnetic attraction handlers — attached per tile.
    const handleTileEnter = useCallback((id: ServiceId) => {
        setHoveredId(id);
    }, []);

    const handleTileLeave = useCallback((id: ServiceId) => {
        setHoveredId((cur) => (cur === id ? null : cur));
        const el = tileRefs.current[id];
        if (el) {
            gsap.to(el, {
                '--fc-mx': '0px',
                '--fc-my': '0px',
                duration: 0.9,
                ease: 'elastic.out(1, 0.3)',
                onComplete: () => {
                    el.style.removeProperty('--fc-mx');
                    el.style.removeProperty('--fc-my');
                },
            });
        }
    }, []);

    const handleTileMove = useCallback((id: ServiceId, e: React.MouseEvent<HTMLButtonElement>) => {
        const el = tileRefs.current[id];
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * 0.28;
        const dy = (e.clientY - cy) * 0.28;
        const clamp = 16;
        const cdx = Math.max(-clamp, Math.min(clamp, dx));
        const cdy = Math.max(-clamp, Math.min(clamp, dy));
        gsap.to(el, {
            '--fc-mx': `${cdx.toFixed(2)}px`,
            '--fc-my': `${cdy.toFixed(2)}px`,
            duration: 0.6,
            ease: 'elastic.out(1, 0.4)',
            overwrite: 'auto',
        });
    }, []);

    // Radial cascade: bumps each tile in radial order with elastic jump.
    const triggerCascade = useCallback((startDelay: number) => {
        const myToken = ++scanTokenRef.current;
        const step = 95;
        const window = 320;

        RADIAL_ORDER.forEach((id, i) => {
            setTimeout(() => {
                if (scanTokenRef.current !== myToken) return;
                setScanning((s) => {
                    const n = new Set(s);
                    n.add(id);
                    return n;
                });
                const el = tileRefs.current[id];
                if (el) {
                    gsap.fromTo(
                        el,
                        { '--fc-scale': 1.08 },
                        {
                            '--fc-scale': 1,
                            duration: 0.55,
                            ease: 'elastic.out(1, 0.45)',
                            onComplete: () => el.style.removeProperty('--fc-scale'),
                        }
                    );
                }
                setTimeout(() => {
                    if (scanTokenRef.current !== myToken) return;
                    setScanning((s) => {
                        const n = new Set(s);
                        n.delete(id);
                        return n;
                    });
                }, window);
            }, startDelay + i * step);
        });

        // Sphere halo pulse.
        const glow = sphereGlowRef.current;
        if (glow) {
            glow.classList.remove('is-pulse');
            // Force reflow so animation restarts.
            void glow.offsetWidth;
            glow.classList.add('is-pulse');
            setTimeout(() => {
                if (scanTokenRef.current === myToken) glow.classList.remove('is-pulse');
            }, 620);
        }
    }, []);

    // Restart: trigger glitch + sphere contraction.
    const onRestart = useCallback(() => {
        setIsGlitching(true);
        setRestartCount((c) => c + 1);
        const start = performance.now();
        const D = 1100;
        const tick = () => {
            const t = Math.min(1, (performance.now() - start) / D);
            const half = 0.5;
            contractRef.current = t < half ? t / half : Math.max(0, 1 - (t - half) / half);
            pulseRef.current = t < half ? 1 - t * 0.4 : 0.6 + (t - half) * 0.8;
            if (t < 1) requestAnimationFrame(tick);
            else {
                contractRef.current = 0;
                pulseRef.current = 1;
                setIsGlitching(false);
            }
        };
        requestAnimationFrame(tick);
        triggerCascade(550);
    }, [triggerCascade]);

    const onDeploy = useCallback(() => {
        setDeployTick((t) => t + 1);
        const start = performance.now();
        const D = 700;
        const peak = 1.22;
        const tick = () => {
            const t = Math.min(1, (performance.now() - start) / D);
            pulseRef.current = t < 0.25 ? 1 + (peak - 1) * (t / 0.25) : peak - (peak - 1) * ((t - 0.25) / 0.75);
            if (t < 1) requestAnimationFrame(tick);
            else pulseRef.current = 1;
        };
        requestAnimationFrame(tick);
        triggerCascade(180);
    }, [triggerCascade]);

    const hudAgitation = hovered ? hovered.load / 100 : 0;
    const showHud = hovered !== null;
    const glowColor = hovered?.accent ?? '#5EE7E7';

    return (
        <div
            ref={wrapperRef}
            className={`FusionCore${isGlitching ? ' is-glitching' : ''}`}
            data-restart={restartCount}
        >
            {/* Raw data columns — kept flat, outside the parallax stage */}
            <DataColumn side="left" seed={1} />
            <DataColumn side="right" seed={7} />

            {/* Parallax stage: full-amplitude floating layer */}
            <div ref={stageRef} className="FusionCore-stage">
                {/* Brutal background text with parallax */}
                <div className="FusionCore-brutal" aria-hidden>
                    {BRUTAL_LINES.map((line, i) => (
                        <span
                            key={i}
                            className={`FusionCore-brutal-line FusionCore-brutal-line--${i}`}
                            style={{
                                transform: `translate3d(${parallax.x * (8 + i * 4)}px, ${
                                    parallax.y * (6 + i * 3)
                                }px, 0)`,
                            }}
                        >
                            {line}
                        </span>
                    ))}
                </div>

                {/* Sphere drop-shadow halo (color follows hovered service) */}
                <div
                    ref={sphereGlowRef}
                    className="FusionCore-sphere-glow"
                    style={{ ['--fc-glow' as string]: glowColor }}
                    aria-hidden
                />

                {/* Central liquid glass sphere */}
                <div className="FusionCore-sphere" aria-hidden>
                    <Canvas
                        camera={{ position: [0, 0, 4.2], fov: 40 }}
                        gl={{ antialias: true, alpha: true }}
                        dpr={[1, 2]}
                    >
                        <SphereScene
                            targetColor={targetColorRef}
                            contractRef={contractRef}
                            pulseRef={pulseRef}
                        />
                    </Canvas>
                </div>

                {/* SVG wiring: sphere → tiles, with flowing particles + masked plug-in effect */}
                <svg
                    className="FusionCore-wires"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden
                >
                    <defs>
                        <mask id="fcSphereMask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                            <rect x="0" y="0" width="100" height="100" fill="white" />
                            <circle cx={CENTER.x} cy={CENTER.y} r="8.4" fill="black" />
                        </mask>
                        {services.map((s) => (
                            <linearGradient
                                key={s.id}
                                id={`fcLine-${s.id}`}
                                gradientUnits="userSpaceOnUse"
                                x1={CENTER.x}
                                y1={CENTER.y}
                                x2={TILE_POSITIONS[s.id].x}
                                y2={TILE_POSITIONS[s.id].y}
                            >
                                <stop offset="0%" stopColor={s.accent} stopOpacity="0.85" />
                                <stop offset="100%" stopColor={s.accent} stopOpacity="0.18" />
                            </linearGradient>
                        ))}
                    </defs>
                    <g mask="url(#fcSphereMask)">
                        {services.map((s) => {
                            const t = TILE_POSITIONS[s.id];
                            const dx = t.x - CENTER.x;
                            const dy = t.y - CENTER.y;
                            const dist = Math.max(0.001, Math.hypot(dx, dy));
                            // Start point inside the sphere disc so the wire "plugs in" beneath the mask.
                            const inner = {
                                x: CENTER.x - (dx / dist) * 3.5,
                                y: CENTER.y - (dy / dist) * 3.5,
                            };
                            const cx = CENTER.x + dx * 0.5 + (-dy) * 0.06;
                            const cy = CENTER.y + dy * 0.5 + dx * 0.06;
                            const d = `M ${inner.x.toFixed(2)} ${inner.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${t.x} ${t.y}`;
                            const speed = (16 - s.load / 8).toFixed(2);
                            const active = hoveredId === s.id;
                            return (
                                <g key={s.id} className={`FusionCore-wire-group${active ? ' is-active' : ''}`}>
                                    <path
                                        d={d}
                                        className="FusionCore-wire-base"
                                        stroke={`url(#fcLine-${s.id})`}
                                    />
                                    <path
                                        d={d}
                                        className="FusionCore-wire-flow"
                                        stroke={s.accent}
                                        style={{ animationDuration: `${speed}s` }}
                                    />
                                </g>
                            );
                        })}
                    </g>
                    {/* Endpoint glow nodes — drawn OUTSIDE the mask so they shine on the tile side */}
                    {services.map((s) => {
                        const t = TILE_POSITIONS[s.id];
                        const active = hoveredId === s.id;
                        return (
                            <g key={`tip-${s.id}`} className={`FusionCore-wire-group${active ? ' is-active' : ''}`}>
                                <circle
                                    cx={t.x}
                                    cy={t.y}
                                    r="1.2"
                                    fill={s.accent}
                                    className="FusionCore-wire-tip-halo"
                                />
                                <circle
                                    cx={t.x}
                                    cy={t.y}
                                    r="0.55"
                                    fill={s.accent}
                                    className="FusionCore-wire-tip"
                                />
                            </g>
                        );
                    })}
                </svg>

                {/* Service tiles */}
                <div className="FusionCore-tiles">
                    {services.map((s) => {
                        const pos = TILE_POSITIONS[s.id];
                        const active = hoveredId === s.id;
                        const isScan = scanning.has(s.id);
                        return (
                            <button
                                key={s.id}
                                ref={(el) => {
                                    tileRefs.current[s.id] = el;
                                }}
                                type="button"
                                className={
                                    `FusionCore-tile FusionCore-tile--${s.status}` +
                                    (active ? ' is-active' : '') +
                                    (isScan ? ' is-scanning' : '')
                                }
                                style={{
                                    left: `${pos.x}%`,
                                    top: `${pos.y}%`,
                                    ['--fc-accent' as string]: s.accent,
                                }}
                                onMouseEnter={() => handleTileEnter(s.id)}
                                onMouseLeave={() => handleTileLeave(s.id)}
                                onMouseMove={(e) => handleTileMove(s.id, e)}
                                onFocus={() => setHoveredId(s.id)}
                                onBlur={() => setHoveredId(null)}
                                aria-label={`${s.name} — ${s.status}, load ${s.load}%`}
                            >
                                <span className="FusionCore-tile-shock" aria-hidden />
                                <span className="FusionCore-tile-bracket FusionCore-tile-bracket--tl" />
                                <span className="FusionCore-tile-bracket FusionCore-tile-bracket--tr" />
                                <span className="FusionCore-tile-bracket FusionCore-tile-bracket--bl" />
                                <span className="FusionCore-tile-bracket FusionCore-tile-bracket--br" />

                                <span className="FusionCore-tile-status">
                                    <span className="FusionCore-tile-status-dot" />
                                    <span className="FusionCore-tile-status-label">{s.status}</span>
                                </span>
                                <span className="FusionCore-tile-name">{s.name}</span>
                                <span className="FusionCore-tile-short">// {s.short}</span>
                                <div className="FusionCore-tile-load">
                                    <span className="FusionCore-tile-load-bar">
                                        <span
                                            className="FusionCore-tile-load-fill"
                                            style={{ width: `${s.load}%` }}
                                        />
                                    </span>
                                    <span className="FusionCore-tile-load-num">{s.load}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Anchored UI layer: header + actions get 30% parallax amplitude */}
            <div className="FusionCore-anchored">
                <header className="FusionCore-head">
                    <p className="FusionCore-eyebrow">// BACKEND_PROTOTYPE / H / FUSION&nbsp;CORE</p>
                    <h2 className="FusionCore-title">The core commands.</h2>
                    <p className="FusionCore-sub">Six services. One sphere. Every signal logical.</p>
                </header>

                <div className="FusionCore-actions">
                    <button type="button" className="FusionCore-action FusionCore-action--deploy" onClick={onDeploy}>
                        <span>DEPLOY</span>
                        <span className="FusionCore-action-tick">·{String(deployTick).padStart(3, '0')}</span>
                    </button>
                    <button type="button" className="FusionCore-action FusionCore-action--restart" onClick={onRestart}>
                        <span>RESTART</span>
                        <span className="FusionCore-action-tick">·{String(restartCount).padStart(3, '0')}</span>
                    </button>
                </div>
            </div>

            {/* Follower HUD */}
            <FollowerHud
                visible={showHud}
                service={hovered}
                x={hudPos.x}
                y={hudPos.y}
                agitation={hudAgitation}
                bounds={wrapperRef.current}
            />
        </div>
    );
}

function FollowerHud({
    visible,
    service,
    x,
    y,
    agitation,
    bounds,
}: {
    visible: boolean;
    service: Service | null;
    x: number;
    y: number;
    agitation: number;
    bounds: HTMLElement | null;
}) {
    const version = useGlitchReveal(service?.version ?? '');
    const replicas = useGlitchReveal(service?.replicas ?? '');
    const load = useGlitchReveal(service ? `${service.load}%` : '');
    const region = useGlitchReveal(service?.region ?? '');

    // Pre-bake the ticker lines so they're stable while the HUD is open for one service.
    const tickerLines = useMemo(() => {
        if (!service) return [];
        const rand = mulberry32(
            (service.id.charCodeAt(0) << 8) ^
                (service.id.charCodeAt(1) ?? 0) ^
                Math.floor(service.load * 13)
        );
        const messages: { level: 'info' | 'warn' | 'ok'; msg: string }[] = [
            { level: 'info', msg: `${service.short}.scheduler ack` },
            { level: 'ok', msg: `health=200 rtt=${(rand() * 20 + 4).toFixed(1)}ms` },
            { level: 'info', msg: `${service.short}.lease renew ttl=${(rand() * 60 + 30) | 0}s` },
            { level: 'warn', msg: `${service.short}.queue depth=${(rand() * 500) | 0}` },
            { level: 'ok', msg: `replicas=${service.replicas} steady` },
        ];
        const time = () => {
            const h = ((rand() * 8) | 0) + 16;
            const m = ((rand() * 60) | 0).toString().padStart(2, '0');
            const sec = ((rand() * 60) | 0).toString().padStart(2, '0');
            return `${h}:${m}:${sec}`;
        };
        return messages.map((m) => ({ ...m, time: time() }));
    }, [service]);

    if (!service) return null;

    const HUD_W = 304;
    const HUD_H = 360;
    let posX = x + 24;
    let posY = y + 24;
    if (bounds) {
        const r = bounds.getBoundingClientRect();
        if (posX > r.width - HUD_W) posX = x - (HUD_W + 16);
        if (posY > r.height - HUD_H) posY = y - HUD_H;
        if (posX < 12) posX = 12;
        if (posY < 12) posY = 12;
    }

    const accentDim = service.accent;

    // Derived live values for the micro-bars.
    const cpuGet = (t: number) => service.load + Math.sin(t / 380) * 6 + Math.sin(t / 130) * 2;
    const ramGet = (t: number) =>
        ((service.load * 0.7 + 18) % 100) + Math.sin(t / 520) * 4;
    const netGet = (t: number) => 50 + Math.sin(t / 280) * 28 + Math.sin(t / 90) * 4;

    return (
        <div
            className={`FusionCore-hud${visible ? ' is-visible' : ''}`}
            style={{
                transform: `translate3d(${posX}px, ${posY}px, 0)`,
                ['--fc-accent' as string]: service.accent,
            }}
            role="tooltip"
        >
            <span className="FusionCore-hud-bracket FusionCore-hud-bracket--tl" />
            <span className="FusionCore-hud-bracket FusionCore-hud-bracket--tr" />
            <span className="FusionCore-hud-bracket FusionCore-hud-bracket--bl" />
            <span className="FusionCore-hud-bracket FusionCore-hud-bracket--br" />

            <header className="FusionCore-hud-head">
                <span className={`FusionCore-hud-dot FusionCore-hud-dot--${service.status}`} />
                <span className="FusionCore-hud-name">{service.name}</span>
                <span className="FusionCore-hud-version">{version}</span>
            </header>

            <dl className="FusionCore-hud-list">
                <div>
                    <dt>runtime</dt>
                    <dd>{service.runtime}</dd>
                </div>
                <div>
                    <dt>load</dt>
                    <dd className="FusionCore-hud-val--accent">{load}</dd>
                </div>
                <div>
                    <dt>replicas</dt>
                    <dd>{replicas}</dd>
                </div>
                <div>
                    <dt>region</dt>
                    <dd>{region}</dd>
                </div>
            </dl>

            <div className="FusionCore-hud-grid">
                <MicroBar label="cpu" color={accentDim} getValue={cpuGet} />
                <MicroBar label="ram" color={accentDim} getValue={ramGet} />
                <MicroBar label="net" color={accentDim} getValue={netGet} />
            </div>

            <div className="FusionCore-hud-wave-wrap">
                <div className="FusionCore-hud-wave-label-row">
                    <span className="FusionCore-hud-wave-label">agitation · {(agitation * 100).toFixed(0)}%</span>
                </div>
                <AgitationWave agitation={agitation} color={service.accent} />
                <div className="FusionCore-hud-wave-label-row" style={{ marginTop: 4 }}>
                    <span className="FusionCore-hud-wave-label">net jitter</span>
                </div>
                <AgitationWave agitation={0.25} color={service.accent} height={18} strokeWidth={1} />
            </div>

            <div className="FusionCore-hud-ticker">
                <span className="FusionCore-hud-ticker-label">event stream</span>
                <div className="FusionCore-hud-ticker-view">
                    <div className="FusionCore-hud-ticker-stream">
                        {[...tickerLines, ...tickerLines].map((line, i) => (
                            <div
                                key={i}
                                className={`FusionCore-hud-ticker-line FusionCore-hud-ticker-line--${line.level}`}
                            >
                                <span className="FusionCore-hud-ticker-time">{line.time}</span>
                                <span className="FusionCore-hud-ticker-level">{line.level}</span>
                                <span className="FusionCore-hud-ticker-msg">{line.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
