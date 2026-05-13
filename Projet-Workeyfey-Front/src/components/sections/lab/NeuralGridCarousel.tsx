import { useEffect, useRef, useState } from 'react';
import { labProjects, type LabProject } from './labProjects';
import './NeuralGridCarousel.css';

const TILE_SPANS: { col: number; row: number }[] = [
    { col: 2, row: 2 },
    { col: 2, row: 1 },
    { col: 1, row: 2 },
    { col: 1, row: 1 },
    { col: 2, row: 1 },
    { col: 1, row: 1 },
    { col: 1, row: 2 },
    { col: 2, row: 1 },
];

type AudioRef = {
    ctx: AudioContext;
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    gain: GainNode;
    filter: BiquadFilterNode;
};

function NeuralCard({
    project,
    span,
    isHovered,
    onEnter,
    onLeave,
}: {
    project: LabProject;
    span: { col: number; row: number };
    isHovered: boolean;
    onEnter: () => void;
    onLeave: () => void;
}) {
    const accentClass =
        project.accent === 'magenta' ? 'is-magenta' : 'is-cyan';
    const statusClass =
        project.status === 'STABLE'
            ? 'is-stable'
            : project.status === 'BETA'
              ? 'is-beta'
              : 'is-offline';

    return (
        <article
            className={`NeuralCard ${accentClass}${
                isHovered ? ' is-hovered' : ''
            }`}
            style={{
                gridColumn: `span ${span.col}`,
                gridRow: `span ${span.row}`,
            }}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            tabIndex={0}
            onFocus={onEnter}
            onBlur={onLeave}
        >
            <div className="NeuralCard-frame" aria-hidden="true">
                <div className="NeuralCard-frame-inner" />
            </div>

            <div className="NeuralCard-glitch" aria-hidden="true">
                <span className="NeuralCard-glitch-layer NeuralCard-glitch-layer--r">
                    {project.name}
                </span>
                <span className="NeuralCard-glitch-layer NeuralCard-glitch-layer--g">
                    {project.name}
                </span>
                <span className="NeuralCard-glitch-layer NeuralCard-glitch-layer--b">
                    {project.name}
                </span>
            </div>

            <header className="NeuralCard-header">
                <span className="NeuralCard-id">{project.id}</span>
                <span className={`NeuralCard-status ${statusClass}`}>
                    <span className="NeuralCard-status-dot" />
                    {project.status}
                </span>
            </header>

            <div className="NeuralCard-body">
                <h3 className="NeuralCard-title">{project.name}</h3>
                <p className="NeuralCard-domain">{project.domain}</p>
                <p className="NeuralCard-tagline">{project.tagline}</p>
            </div>

            <div className="NeuralCard-reveal" aria-hidden={!isHovered}>
                <div className="NeuralCard-typewrite">
                    <span className="NeuralCard-key">$ inspect</span>
                    <span className="NeuralCard-typewrite-text">{project.repo}</span>
                </div>
                <div className="NeuralCard-typewrite">
                    <span className="NeuralCard-key">$ stack</span>
                    <span className="NeuralCard-typewrite-text">
                        {project.stack.join(' → ')}
                    </span>
                </div>
                <div className="NeuralCard-typewrite">
                    <span className="NeuralCard-key">$ loc</span>
                    <span className="NeuralCard-typewrite-text">
                        {project.loc.toLocaleString('en-US')} lines
                    </span>
                </div>
            </div>

            <div className="NeuralCard-corners" aria-hidden="true">
                <span className="NeuralCard-corner NeuralCard-corner--tl" />
                <span className="NeuralCard-corner NeuralCard-corner--tr" />
                <span className="NeuralCard-corner NeuralCard-corner--bl" />
                <span className="NeuralCard-corner NeuralCard-corner--br" />
            </div>
        </article>
    );
}

export default function NeuralGridCarousel() {
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const [audioOn, setAudioOn] = useState(false);
    const audioRef = useRef<AudioRef | null>(null);
    const sectionRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!audioOn) {
            const a = audioRef.current;
            if (a) {
                a.gain.gain.cancelScheduledValues(a.ctx.currentTime);
                a.gain.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
                a.osc1.stop(a.ctx.currentTime + 0.2);
                a.osc2.stop(a.ctx.currentTime + 0.2);
                a.ctx.close();
                audioRef.current = null;
            }
            return;
        }

        const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.value = 60;
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 120;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc1.start();
        osc2.start();

        gain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.4);

        audioRef.current = { ctx, osc1, osc2, gain, filter };
        return () => {
            // cleanup handled when audioOn flips
        };
    }, [audioOn]);

    useEffect(() => {
        const node = sectionRef.current;
        if (!node) return;
        const onMove = (e: MouseEvent) => {
            const a = audioRef.current;
            if (!a) return;
            const rect = node.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            // map x to filter cutoff, y to gain (inverted)
            const cutoff = 250 + x * 2200;
            const gainTarget = 0.012 + (1 - y) * 0.04;
            a.filter.frequency.setTargetAtTime(cutoff, a.ctx.currentTime, 0.05);
            a.gain.gain.setTargetAtTime(gainTarget, a.ctx.currentTime, 0.08);
        };
        node.addEventListener('mousemove', onMove);
        return () => node.removeEventListener('mousemove', onMove);
    }, [audioOn]);

    return (
        <div className="NeuralGrid" ref={sectionRef}>
            <div className="NeuralGrid-noise" aria-hidden="true" />

            <header className="NeuralGrid-header">
                <span className="NeuralGrid-tag">CONCEPT_B</span>
                <span className="NeuralGrid-title">THE NEURAL GRID</span>
                <span className="NeuralGrid-subtitle">
                    distortion_field · double_filet · {labProjects.length} nodes
                </span>
                <button
                    type="button"
                    className={`NeuralGrid-audio${audioOn ? ' is-on' : ''}`}
                    onClick={() => setAudioOn((v) => !v)}
                    aria-pressed={audioOn}
                >
                    <span className="NeuralGrid-audio-dot" aria-hidden="true" />
                    {audioOn ? 'HUM ON' : 'HUM OFF'}
                </button>
            </header>

            <div className="NeuralGrid-grid">
                {labProjects.map((p, i) => (
                    <NeuralCard
                        key={p.id}
                        project={p}
                        span={TILE_SPANS[i % TILE_SPANS.length]}
                        isHovered={hoverIdx === i}
                        onEnter={() => setHoverIdx(i)}
                        onLeave={() =>
                            setHoverIdx((h) => (h === i ? null : h))
                        }
                    />
                ))}
            </div>
        </div>
    );
}
