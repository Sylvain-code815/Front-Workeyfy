import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, useScroll, useTransform } from 'framer-motion';
import * as THREE from 'three';
import './AuroraBackend.css';

const AURORA_VERT = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const AURORA_FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uEnergy;
    uniform vec2  uMouse;
    uniform vec2  uResolution;
    uniform vec3  uColorWhite;
    uniform vec3  uColorBlue;
    uniform vec3  uColorPink;

    // 3D simplex noise (Ashima/IQ classic implementation).
    vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g  = step(x0.yzx, x0.xyz);
        vec3 l  = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m*m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
        vec2 uv = vUv;
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        vec2 p = (uv - 0.5) * aspect;

        float t = uTime * 0.05;
        float n1 = snoise(vec3(p * 1.6, t)) * 0.5 + 0.5;
        float n2 = snoise(vec3(p * 2.8 + 11.0, t * 1.4)) * 0.5 + 0.5;
        float n3 = snoise(vec3(p * 0.9 - 7.0, t * 0.7)) * 0.5 + 0.5;

        // Cursor-driven hot point.
        vec2 mp = (uMouse - 0.5) * aspect;
        float d = distance(p, mp);
        float hot = exp(-d * 3.5) * 0.55;

        float k1 = smoothstep(0.25, 0.85, n1);
        float k2 = smoothstep(0.30, 0.80, n2 + hot * 0.6);
        float k3 = smoothstep(0.20, 0.90, n3);

        vec3 col = uColorWhite;
        col = mix(col, uColorBlue, k1 * (0.55 + 0.45 * uEnergy));
        col = mix(col, uColorPink, k2 * (0.50 + 0.50 * uEnergy));
        col = mix(col, uColorWhite, k3 * 0.35);

        // Subtle vignette toward edges that keeps the focal area bright.
        float vig = smoothstep(1.1, 0.25, length(p));
        col = mix(col * 0.85, col, vig);

        gl_FragColor = vec4(col, 1.0);
    }
`;

function AuroraMesh({
    energyRef,
    mouseRef,
}: {
    energyRef: { current: number };
    mouseRef: { current: { x: number; y: number } };
}) {
    const matRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uEnergy: { value: 0 },
            uMouse: { value: new THREE.Vector2(0.5, 0.5) },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uColorWhite: { value: new THREE.Color('#FFFFFF') },
            uColorBlue: { value: new THREE.Color('#A8C5FF') },
            uColorPink: { value: new THREE.Color('#FFBADD') },
        }),
        []
    );

    useFrame(({ size }, delta) => {
        const u = matRef.current?.uniforms;
        if (!u) return;
        u.uTime.value += delta;
        u.uEnergy.value += (energyRef.current - u.uEnergy.value) * Math.min(1, delta * 4);
        const m = u.uMouse.value as THREE.Vector2;
        m.x += (mouseRef.current.x - m.x) * Math.min(1, delta * 4);
        m.y += (mouseRef.current.y - m.y) * Math.min(1, delta * 4);
        (u.uResolution.value as THREE.Vector2).set(size.width, size.height);
    });

    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={matRef}
                vertexShader={AURORA_VERT}
                fragmentShader={AURORA_FRAG}
                uniforms={uniforms}
            />
        </mesh>
    );
}

type Pillar = {
    id: string;
    title: string;
    blurb: string;
    stack: string[];
    metric: { label: string; value: string };
};

const PILLARS: Pillar[] = [
    {
        id: 'runtime',
        title: 'Distributed runtime.',
        blurb: 'Node, Rust and Go workloads orchestrated across three continents with sub-second failover.',
        stack: ['Node 22', 'Rust', 'Go 1.23', 'Kubernetes'],
        metric: { label: 'multi-region', value: '12 zones' },
    },
    {
        id: 'events',
        title: 'Real-time events.',
        blurb: 'Append-only event log with exactly-once delivery, fan-out to web sockets and edge workers.',
        stack: ['Kafka', 'NATS JetStream', 'WebSocket'],
        metric: { label: 'p99 fan-out', value: '8.2 ms' },
    },
    {
        id: 'trust',
        title: 'Identity & trust.',
        blurb: 'OAuth2 + mutual TLS service mesh. Short-lived tokens, automated key rotation, full audit trail.',
        stack: ['OAuth2', 'JWT RS256', 'mTLS', 'SPIFFE'],
        metric: { label: 'rotation', value: '24 h' },
    },
    {
        id: 'edge',
        title: 'Edge & cache.',
        blurb: 'Smart routing pushes reads to the nearest region. Redis hot tier, signed assets at the edge.',
        stack: ['Redis 7', 'Cloudflare', 'CDN', 'Quic'],
        metric: { label: 'p50 globally', value: '47 ms' },
    },
];

function Sparkline({ seed }: { seed: number }) {
    const points = useMemo(() => {
        const n = 24;
        const arr: { x: number; y: number }[] = [];
        for (let i = 0; i < n; i++) {
            const s = Math.sin((i + seed) * 0.6) * 0.5 + Math.cos((i + seed) * 0.27) * 0.3;
            arr.push({ x: (i / (n - 1)) * 100, y: 50 - s * 22 });
        }
        return arr;
    }, [seed]);
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    return (
        <svg className="AuroraBackend-spark" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden>
            <defs>
                <linearGradient id={`auroraSpark-${seed}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#7AA9FF" />
                    <stop offset="100%" stopColor="#FF8FC8" />
                </linearGradient>
            </defs>
            <path d={path} fill="none" stroke={`url(#auroraSpark-${seed})`} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
    );
}

export default function AuroraBackend() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const energyRef = useRef(0);
    const mouseRef = useRef({ x: 0.5, y: 0.5 });
    const [latencyMs, setLatencyMs] = useState(47);

    const { scrollYProgress } = useScroll({
        target: wrapperRef,
        offset: ['start end', 'end start'],
    });

    const headlineY = useTransform(scrollYProgress, [0, 1], [60, -60]);
    const headlineOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.5]);
    const footerY = useTransform(scrollYProgress, [0, 1], [80, -40]);

    useEffect(() => {
        const unsub = scrollYProgress.on('change', (v) => {
            const focus = 1 - Math.abs(v - 0.5) * 2;
            energyRef.current = Math.max(0, focus);
        });
        return () => unsub();
    }, [scrollYProgress]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const el = wrapperRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            mouseRef.current.x = (e.clientX - r.left) / r.width;
            mouseRef.current.y = 1 - (e.clientY - r.top) / r.height;
        };
        const node = wrapperRef.current;
        node?.addEventListener('mousemove', onMove);
        return () => node?.removeEventListener('mousemove', onMove);
    }, []);

    useEffect(() => {
        let id = 0;
        const tick = () => {
            setLatencyMs((prev) => {
                const target = 45 + Math.sin(performance.now() / 1700) * 4 + (Math.random() - 0.5) * 1.4;
                return Math.round((prev + (target - prev) * 0.25) * 10) / 10;
            });
            id = window.setTimeout(tick, 480);
        };
        tick();
        return () => window.clearTimeout(id);
    }, []);

    return (
        <div ref={wrapperRef} className="AuroraBackend">
            <div className="AuroraBackend-bg">
                <Canvas
                    orthographic
                    camera={{ zoom: 1, position: [0, 0, 1] }}
                    gl={{ antialias: false, alpha: false }}
                    dpr={[1, 2]}
                >
                    <AuroraMesh energyRef={energyRef} mouseRef={mouseRef} />
                </Canvas>
            </div>

            <div className="AuroraBackend-veil" />
            <div className="AuroraBackend-grain" />

            <motion.header
                className="AuroraBackend-header"
                style={{ y: headlineY, opacity: headlineOpacity }}
            >
                <p className="AuroraBackend-eyebrow">// BACKEND_PROTOTYPE / E / AURORA</p>
                <h2 className="AuroraBackend-title">Engineered to disappear.</h2>
                <p className="AuroraBackend-sub">
                    Four pillars hold the platform up. The user never sees them — that's the point.
                </p>
            </motion.header>

            <div className="AuroraBackend-stack">
                {PILLARS.map((p, i) => (
                    <PillarCard key={p.id} pillar={p} index={i} progress={scrollYProgress} />
                ))}
            </div>

            <motion.footer className="AuroraBackend-footer" style={{ y: footerY }}>
                <span className="AuroraBackend-footer-label">median latency, globally</span>
                <span className="AuroraBackend-footer-value">
                    {latencyMs.toFixed(1)}
                    <small>ms</small>
                </span>
            </motion.footer>
        </div>
    );
}

function PillarCard({
    pillar,
    index,
    progress,
}: {
    pillar: Pillar;
    index: number;
    progress: ReturnType<typeof useScroll>['scrollYProgress'];
}) {
    const start = 0.05 + index * 0.18;
    const y = useTransform(progress, [start, start + 0.25], [50, 0]);
    const opacity = useTransform(progress, [start - 0.05, start + 0.15], [0, 1]);
    const cardRef = useRef<HTMLDivElement>(null);

    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 100;
        const yy = ((e.clientY - r.top) / r.height - 0.5) * 100;
        el.style.setProperty('--aurora-card-x', `${x}%`);
        el.style.setProperty('--aurora-card-y', `${yy}%`);
    };

    return (
        <motion.div
            ref={cardRef}
            className="AuroraBackend-card"
            style={{ y, opacity }}
            onMouseMove={onMove}
        >
            <div className="AuroraBackend-card-shine" />
            <span className="AuroraBackend-card-index">0{index + 1}</span>
            <h3 className="AuroraBackend-card-title">{pillar.title}</h3>
            <p className="AuroraBackend-card-blurb">{pillar.blurb}</p>
            <div className="AuroraBackend-card-body">
                <ul className="AuroraBackend-card-stack">
                    {pillar.stack.map((s) => (
                        <li key={s}>{s}</li>
                    ))}
                </ul>
                <div className="AuroraBackend-card-viz">
                    <Sparkline seed={index + 3} />
                    <div className="AuroraBackend-card-metric">
                        <span className="AuroraBackend-card-metric-value">{pillar.metric.value}</span>
                        <span className="AuroraBackend-card-metric-label">{pillar.metric.label}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
