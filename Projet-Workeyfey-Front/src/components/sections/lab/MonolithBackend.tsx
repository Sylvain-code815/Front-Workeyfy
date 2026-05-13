import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import './MonolithBackend.css';

type Pillar = {
    overline: string;
    headline: string;
    body: string;
    detail: number;
};

const PILLARS: Pillar[] = [
    {
        overline: 'i.',
        headline: 'Distributed by design.',
        body: 'Primary writes anchored in one region. Read replicas in eleven more. The cluster votes a new leader before a human can react.',
        detail: 0,
    },
    {
        overline: 'ii.',
        headline: 'Sub-50ms, globally.',
        body: 'Edge caching at the request layer. Smart routing in front of every endpoint. The slowest user is forty-seven milliseconds away.',
        detail: 1,
    },
    {
        overline: 'iii.',
        headline: 'Audit-first.',
        body: 'An append-only event log records every consequential action. Replays are deterministic. Forensics are minutes, not days.',
        detail: 2,
    },
    {
        overline: 'iv.',
        headline: 'Zero trust.',
        body: 'OAuth2 at the edge. JWTs rotated every twenty-four hours. mTLS between every internal service. No one is assumed friendly.',
        detail: 3,
    },
    {
        overline: 'v.',
        headline: 'Self-healing.',
        body: 'Kubernetes drains failing pods quietly. Circuit breakers shed load before it cascades. The operator sleeps through most incidents.',
        detail: 4,
    },
];

function ChromeIcosahedron({
    targetDetail,
    pointer,
}: {
    targetDetail: number;
    pointer: { x: number; y: number };
}) {
    const meshRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);
    const [detail, setDetail] = useState(0);
    const fadeRef = useRef(1);

    useEffect(() => {
        if (targetDetail === detail) return;
        const D = 420;
        let raf = 0;
        const start = performance.now();
        let swapped = false;
        const step = (now: number) => {
            const elapsed = now - start;
            if (elapsed < D) {
                fadeRef.current = 1 - elapsed / D;
            } else if (elapsed < D * 2) {
                if (!swapped) {
                    setDetail(targetDetail);
                    swapped = true;
                }
                fadeRef.current = (elapsed - D) / D;
            } else {
                fadeRef.current = 1;
                return;
            }
            raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [targetDetail, detail]);

    useFrame((_, delta) => {
        const m = meshRef.current;
        const g = groupRef.current;
        if (!m || !g) return;
        m.rotation.y += delta * 0.08;
        m.rotation.x += delta * 0.03;
        g.rotation.x += (pointer.y * 0.12 - g.rotation.x) * Math.min(1, delta * 2);
        g.rotation.y += (pointer.x * 0.18 - g.rotation.y) * Math.min(1, delta * 2);
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat) mat.opacity = fadeRef.current;
    });

    const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.65, detail), [detail]);

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} geometry={geometry}>
                <meshStandardMaterial
                    color="#dadada"
                    metalness={1}
                    roughness={0.18}
                    transparent
                    envMapIntensity={1.6}
                />
            </mesh>
            {/* Subtle wireframe overlay for the higher detail levels — feels like a relief. */}
            <mesh geometry={geometry} scale={1.001}>
                <meshBasicMaterial
                    color="#1c1c1c"
                    wireframe
                    transparent
                    opacity={0.22 * fadeRef.current}
                />
            </mesh>
        </group>
    );
}

function MonolithScene({
    detailIndex,
    pointer,
}: {
    detailIndex: number;
    pointer: { x: number; y: number };
}) {
    return (
        <>
            <ambientLight intensity={0.18} />
            <directionalLight position={[-4, 6, 4]} intensity={1.4} color="#b8c5d8" />
            <directionalLight position={[5, -2, -3]} intensity={0.7} color="#e8b26a" />
            <spotLight position={[0, 8, 4]} intensity={0.6} angle={0.45} penumbra={1} color="#ffffff" />
            <Environment preset="studio" environmentIntensity={0.6} />
            <ChromeIcosahedron targetDetail={PILLARS[detailIndex].detail} pointer={pointer} />
        </>
    );
}

export default function MonolithBackend() {
    const [index, setIndex] = useState(0);
    const [pulse, setPulse] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const pointerRef = useRef({ x: 0, y: 0 });
    const intervalRef = useRef<number | null>(null);
    const userPausedRef = useRef(false);

    useEffect(() => {
        const start = () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
            intervalRef.current = window.setInterval(() => {
                if (!userPausedRef.current) {
                    setIndex((i) => (i + 1) % PILLARS.length);
                }
            }, 5400);
        };
        start();
        return () => {
            if (intervalRef.current) window.clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        const t = window.setInterval(() => setPulse((p) => !p), 1800);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const el = wrapperRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            pointerRef.current.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
            pointerRef.current.y = -((e.clientY - r.top) / r.height - 0.5) * 2;
        };
        const node = wrapperRef.current;
        node?.addEventListener('mousemove', onMove);
        return () => node?.removeEventListener('mousemove', onMove);
    }, []);

    const goto = (i: number) => {
        userPausedRef.current = true;
        setIndex(i);
        window.setTimeout(() => {
            userPausedRef.current = false;
        }, 8000);
    };

    return (
        <div ref={wrapperRef} className="MonolithBackend">
            <div className="MonolithBackend-vignette" />

            <div className="MonolithBackend-canvas">
                <Canvas
                    camera={{ position: [0, 0, 5.4], fov: 38 }}
                    gl={{ antialias: true }}
                    dpr={[1, 2]}
                >
                    <MonolithScene detailIndex={index} pointer={pointerRef.current} />
                </Canvas>
            </div>

            <header className="MonolithBackend-eyebrow-wrap">
                <p className="MonolithBackend-eyebrow">// BACKEND_PROTOTYPE / F / MONOLITH</p>
                <p className="MonolithBackend-overline">Quiet machinery.</p>
            </header>

            <div className="MonolithBackend-text">
                <div className="MonolithBackend-text-inner">
                    {PILLARS.map((p, i) => (
                        <article
                            key={p.headline}
                            className={`MonolithBackend-pillar${i === index ? ' is-active' : ''}`}
                            aria-hidden={i !== index}
                        >
                            <span className="MonolithBackend-pillar-num">{p.overline}</span>
                            <h2 className="MonolithBackend-pillar-headline">{p.headline}</h2>
                            <p className="MonolithBackend-pillar-body">{p.body}</p>
                        </article>
                    ))}
                </div>
            </div>

            <nav className="MonolithBackend-pagination" aria-label="Pillar navigation">
                {PILLARS.map((p, i) => (
                    <button
                        key={p.headline}
                        type="button"
                        className={`MonolithBackend-pagination-dot${i === index ? ' is-active' : ''}`}
                        onClick={() => goto(i)}
                        aria-label={`Pillar ${i + 1}: ${p.headline}`}
                        aria-current={i === index ? 'true' : undefined}
                    />
                ))}
            </nav>

            <div className="MonolithBackend-pulse" aria-hidden>
                <span className={`MonolithBackend-pulse-dot${pulse ? ' is-on' : ''}`} />
                <span className="MonolithBackend-pulse-label">
                    system pulse · {[ '47ms', '49ms', '46ms', '48ms', '47ms' ][index]}
                </span>
            </div>

            <div className="MonolithBackend-sig">
                <span>workeyfy backend</span>
                <span>2026</span>
            </div>
        </div>
    );
}
