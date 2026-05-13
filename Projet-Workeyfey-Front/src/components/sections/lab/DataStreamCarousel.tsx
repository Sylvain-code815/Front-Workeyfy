import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { labProjects, type LabProject, type LabStatus } from './labProjects';
import './DataStreamCarousel.css';

const POINT_COUNT = 1800;

function sampleTextPositions(text: string, count: number): Float32Array {
    if (typeof document === 'undefined') {
        return new Float32Array(count * 3);
    }
    const W = 512;
    const H = 256;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const out = new Float32Array(count * 3);
    if (!ctx) return out;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 110px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);

    const data = ctx.getImageData(0, 0, W, H).data;
    const candidates: number[] = [];
    for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
            const i = (y * W + x) * 4;
            if (data[i] > 128) candidates.push(x, y);
        }
    }
    if (candidates.length === 0) {
        return out;
    }

    const pairs = candidates.length / 2;
    for (let p = 0; p < count; p++) {
        const idx = (Math.floor(Math.random() * pairs)) * 2;
        const cx = candidates[idx];
        const cy = candidates[idx + 1];
        // map pixel coords to world coords centered on origin
        const wx = (cx / W - 0.5) * 6;
        const wy = -(cy / H - 0.5) * 3;
        const wz = (Math.random() - 0.5) * 0.6;
        out[p * 3 + 0] = wx;
        out[p * 3 + 1] = wy;
        out[p * 3 + 2] = wz;
    }
    return out;
}

type CloudProps = { project: LabProject };

function PointCloud({ project }: CloudProps) {
    const ref = useRef<THREE.Points>(null);

    const baseGeom = useMemo(() => {
        const g = new THREE.BufferGeometry();
        const positions = new Float32Array(POINT_COUNT * 3);
        for (let i = 0; i < POINT_COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * 6;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 3;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        return g;
    }, []);

    const target = useMemo(
        () => sampleTextPositions(project.id.replace('PRJ-', ''), POINT_COUNT),
        [project.id]
    );

    useFrame((state) => {
        const points = ref.current;
        if (!points) return;
        const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const t = state.clock.elapsedTime;
        const lerp = 0.06;
        for (let i = 0; i < POINT_COUNT; i++) {
            const ix = i * 3;
            const tx = target[ix] + Math.sin(t * 0.7 + i * 0.013) * 0.04;
            const ty = target[ix + 1] + Math.cos(t * 0.5 + i * 0.017) * 0.04;
            const tz = target[ix + 2] + Math.sin(t * 0.4 + i * 0.011) * 0.06;
            arr[ix] += (tx - arr[ix]) * lerp;
            arr[ix + 1] += (ty - arr[ix + 1]) * lerp;
            arr[ix + 2] += (tz - arr[ix + 2]) * lerp;
        }
        attr.needsUpdate = true;
        points.rotation.y = Math.sin(t * 0.15) * 0.18;
    });

    const color = project.accent === 'magenta' ? '#FF3DCB' : '#5EE7E7';

    return (
        <points ref={ref} geometry={baseGeom}>
            <pointsMaterial
                size={0.025}
                color={color}
                transparent
                opacity={0.9}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
}

function StatusDot({ status }: { status: LabStatus }) {
    const cls =
        status === 'STABLE'
            ? 'is-stable'
            : status === 'BETA'
              ? 'is-beta'
              : 'is-offline';
    return <span className={`DataStream-status-dot ${cls}`} aria-hidden="true" />;
}

function MetadataLog({ project }: { project: LabProject }) {
    const lines = useMemo(() => {
        const out: string[] = [];
        const stack = project.stack.join(' · ');
        for (let i = 0; i < 60; i++) {
            const ts = (1700000000 + i * 7919).toString(16).toUpperCase();
            const op = ['READ', 'WRITE', 'SYNC', 'PUSH', 'PING', 'TRACE'][i % 6];
            out.push(
                `0x${ts}  ${op.padEnd(6)}  ${project.id}  loc=${project.loc}  stack=[${stack}]  status=${project.status}`
            );
        }
        return out;
    }, [project]);

    return (
        <div className="DataStream-log" aria-hidden="true">
            <div className="DataStream-log-track">
                {[...lines, ...lines].map((line, i) => (
                    <span key={i} className="DataStream-log-line">
                        {line}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default function DataStreamCarousel() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const project = labProjects[activeIndex];
    const total = labProjects.length;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % total);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + total) % total);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [total]);

    return (
        <div className="DataStream">
            <MetadataLog project={project} />

            <header className="DataStream-header">
                <span className="DataStream-tag">CONCEPT_A</span>
                <span className="DataStream-title">THE DATA STREAM</span>
                <span className="DataStream-subtitle">
                    encrypted_index · vertical_scanner · {String(activeIndex + 1).padStart(2, '0')}/
                    {String(total).padStart(2, '0')}
                </span>
            </header>

            <div className="DataStream-grid">
                <ul className="DataStream-list" role="listbox" aria-label="Project index">
                    <li className="DataStream-list-head" aria-hidden="true">
                        <span>ID</span>
                        <span>NAME</span>
                        <span>STATUS</span>
                    </li>
                    {labProjects.map((p, i) => {
                        const selected = i === activeIndex;
                        return (
                            <li
                                key={p.id}
                                role="option"
                                aria-selected={selected}
                                tabIndex={0}
                                className={`DataStream-row${selected ? ' is-selected' : ''}`}
                                onMouseEnter={() => setHoverIndex(i)}
                                onMouseLeave={() =>
                                    setHoverIndex((h) => (h === i ? null : h))
                                }
                                onClick={() => setActiveIndex(i)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setActiveIndex(i);
                                    }
                                }}
                            >
                                <span className="DataStream-row-id">{p.id}</span>
                                <span className="DataStream-row-name">
                                    <span className="DataStream-row-name-text">{p.name}</span>
                                    <span
                                        className={`DataStream-scan${
                                            hoverIndex === i ? ' is-active' : ''
                                        }`}
                                        aria-hidden="true"
                                    />
                                </span>
                                <span className="DataStream-row-status">
                                    <StatusDot status={p.status} />
                                    <span>{p.status}</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>

                <div className="DataStream-cloud">
                    <div className="DataStream-cloud-frame" aria-hidden="true">
                        <span className="DataStream-cloud-corner DataStream-cloud-corner--tl" />
                        <span className="DataStream-cloud-corner DataStream-cloud-corner--tr" />
                        <span className="DataStream-cloud-corner DataStream-cloud-corner--bl" />
                        <span className="DataStream-cloud-corner DataStream-cloud-corner--br" />
                    </div>
                    <Canvas
                        className="DataStream-canvas"
                        camera={{ position: [0, 0, 5.2], fov: 50 }}
                        gl={{ antialias: true, alpha: true }}
                    >
                        <ambientLight intensity={0.6} />
                        <PointCloud project={project} />
                    </Canvas>
                    <div className="DataStream-cloud-meta">
                        <div className="DataStream-meta-row">
                            <span>NAME</span>
                            <span>{project.name}</span>
                        </div>
                        <div className="DataStream-meta-row">
                            <span>DOMAIN</span>
                            <span>{project.domain}</span>
                        </div>
                        <div className="DataStream-meta-row">
                            <span>REPO</span>
                            <span>{project.repo}</span>
                        </div>
                        <div className="DataStream-meta-row">
                            <span>STACK</span>
                            <span>{project.stack.join(' · ')}</span>
                        </div>
                        <div className="DataStream-meta-row">
                            <span>LOC</span>
                            <span>{project.loc.toLocaleString('en-US')}</span>
                        </div>
                        <p className="DataStream-meta-desc">{project.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
