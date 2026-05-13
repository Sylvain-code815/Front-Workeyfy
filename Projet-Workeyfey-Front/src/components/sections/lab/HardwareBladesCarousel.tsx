import { useEffect, useMemo, useState } from 'react';
import { labProjects, type LabProject } from './labProjects';
import './HardwareBladesCarousel.css';

type LedKind = 'cyan' | 'magenta' | 'amber' | 'dim';

type Telemetry = {
    rack: string;
    slot: string;
    cpu: number;
    mem: number;
    net: string;
    uptime: string;
    temp: number;
    bays: LedKind[];
};

function buildTelemetry(p: LabProject, idx: number): Telemetry {
    const seed = (idx + 1) * 13;
    const cpu = ((seed * 7) % 60) + 30;
    const mem = ((seed * 11) % 50) + 40;
    const temp = ((seed * 5) % 28) + 38;
    const uptimeDays = ((seed * 3) % 280) + 4;

    const bays: LedKind[] = [];
    for (let i = 0; i < 12; i++) {
        if (p.status === 'OFFLINE' && i % 4 === 0) bays.push('magenta');
        else if (p.status === 'BETA' && i % 5 === 0) bays.push('amber');
        else if (i % 6 === 0 && p.status !== 'STABLE') bays.push('magenta');
        else if (i % 7 === 5) bays.push('dim');
        else bays.push('cyan');
    }

    return {
        rack: `R-${String(idx + 1).padStart(2, '0')}`,
        slot: `S-${String((idx * 3) % 16).padStart(2, '0')}`,
        cpu,
        mem,
        net: `${(seed % 12) + 2}.${(seed * 17) % 100}`,
        uptime: `${uptimeDays}d`,
        temp,
        bays,
    };
}

function Blade({
    project,
    telemetry,
    role,
    onClick,
}: {
    project: LabProject;
    telemetry: Telemetry;
    role: 'active' | 'near' | 'far' | 'hidden';
    onClick: () => void;
}) {
    const accent = project.accent === 'magenta' ? 'is-magenta' : 'is-cyan';
    const statusColor =
        project.status === 'STABLE'
            ? 'is-online'
            : project.status === 'BETA'
              ? 'is-warn'
              : 'is-down';

    return (
        <button
            type="button"
            className={`Blade Blade--${role} ${accent}`}
            onClick={onClick}
            aria-label={`${project.name} — ${project.status}`}
            tabIndex={role === 'active' ? 0 : -1}
        >
            {/* Top rack rail */}
            <div className="Blade-rail Blade-rail--top" aria-hidden="true">
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
            </div>

            {/* Front panel */}
            <div className="Blade-panel">
                <div className="Blade-meta">
                    <span className="Blade-meta-rack">{telemetry.rack}</span>
                    <span className="Blade-meta-slot">/{telemetry.slot}</span>
                    <span className={`Blade-status ${statusColor}`}>
                        <span className="Blade-status-led" />
                        {project.status}
                    </span>
                </div>

                <div className="Blade-id">{project.id}</div>
                <h3 className="Blade-name">{project.name}</h3>
                <p className="Blade-domain">{project.domain}</p>

                <div className="Blade-bays" aria-hidden="true">
                    {telemetry.bays.map((kind, i) => (
                        <span
                            key={i}
                            className={`Blade-bay Blade-bay--${kind}`}
                        />
                    ))}
                </div>

                <div className="Blade-readouts">
                    <div className="Blade-readout">
                        <span className="Blade-readout-label">CPU</span>
                        <div className="Blade-bar">
                            <span
                                className="Blade-bar-fill"
                                style={{ width: `${telemetry.cpu}%` }}
                            />
                        </div>
                        <span className="Blade-readout-val">{telemetry.cpu}%</span>
                    </div>
                    <div className="Blade-readout">
                        <span className="Blade-readout-label">MEM</span>
                        <div className="Blade-bar">
                            <span
                                className="Blade-bar-fill"
                                style={{ width: `${telemetry.mem}%` }}
                            />
                        </div>
                        <span className="Blade-readout-val">{telemetry.mem}%</span>
                    </div>
                    <div className="Blade-readout">
                        <span className="Blade-readout-label">NET</span>
                        <span className="Blade-readout-val Blade-readout-val--mono">
                            {telemetry.net} Gb/s
                        </span>
                    </div>
                    <div className="Blade-readout">
                        <span className="Blade-readout-label">TEMP</span>
                        <span className="Blade-readout-val Blade-readout-val--mono">
                            {telemetry.temp}°C
                        </span>
                    </div>
                    <div className="Blade-readout">
                        <span className="Blade-readout-label">UPTIME</span>
                        <span className="Blade-readout-val Blade-readout-val--mono">
                            {telemetry.uptime}
                        </span>
                    </div>
                </div>

                <div className="Blade-vents" aria-hidden="true">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <span key={i} className="Blade-vent" />
                    ))}
                </div>

                <div className="Blade-stack">
                    {project.stack.slice(0, 4).map((s) => (
                        <span key={s} className="Blade-stack-chip">
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* Bottom rack rail */}
            <div className="Blade-rail Blade-rail--bottom" aria-hidden="true">
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
                <span className="Blade-rail-screw" />
            </div>
        </button>
    );
}

export default function HardwareBladesCarousel() {
    const [active, setActive] = useState(0);
    const total = labProjects.length;

    const telemetries = useMemo(
        () => labProjects.map((p, i) => buildTelemetry(p, i)),
        []
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setActive((i) => (i + 1) % total);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setActive((i) => (i - 1 + total) % total);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [total]);

    const roleFor = (i: number): 'active' | 'near' | 'far' | 'hidden' => {
        const half = Math.floor(total / 2);
        let offset = i - active;
        if (offset > half) offset -= total;
        if (offset < -half) offset += total;
        const abs = Math.abs(offset);
        if (abs === 0) return 'active';
        if (abs === 1) return 'near';
        if (abs === 2) return 'far';
        return 'hidden';
    };

    const offsetFor = (i: number): number => {
        const half = Math.floor(total / 2);
        let offset = i - active;
        if (offset > half) offset -= total;
        if (offset < -half) offset += total;
        return offset;
    };

    const current = labProjects[active];

    return (
        <div className="Blades">
            <div className="Blades-floor" aria-hidden="true" />
            <div className="Blades-rackHum" aria-hidden="true" />

            <header className="Blades-header">
                <span className="Blades-tag">CONCEPT_C</span>
                <span className="Blades-title">HARDWARE BLADES</span>
                <span className="Blades-subtitle">
                    physical_index · DoF_focus · {String(active + 1).padStart(2, '0')}/
                    {String(total).padStart(2, '0')}
                </span>
            </header>

            <div className="Blades-stage">
                {labProjects.map((p, i) => {
                    const role = roleFor(i);
                    if (role === 'hidden') return null;
                    const off = offsetFor(i);
                    const tx = off * 360;
                    const rotY = off * -14;
                    const scale =
                        role === 'active' ? 1 : role === 'near' ? 0.86 : 0.7;
                    return (
                        <div
                            key={p.id}
                            className="Blades-slot"
                            style={{
                                transform: `translate(-50%, -50%) translateX(${tx}px) rotateY(${rotY}deg) scale(${scale})`,
                                zIndex: 50 - Math.abs(off),
                            }}
                        >
                            <Blade
                                project={p}
                                telemetry={telemetries[i]}
                                role={role}
                                onClick={() => setActive(i)}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="Blades-detail">
                <div className="Blades-detail-row">
                    <span className="Blades-detail-key">UNIT</span>
                    <span className="Blades-detail-val">{current.id}</span>
                </div>
                <div className="Blades-detail-row">
                    <span className="Blades-detail-key">REPO</span>
                    <span className="Blades-detail-val">{current.repo}</span>
                </div>
                <div className="Blades-detail-row">
                    <span className="Blades-detail-key">LOC</span>
                    <span className="Blades-detail-val">
                        {current.loc.toLocaleString('en-US')}
                    </span>
                </div>
                <p className="Blades-detail-desc">{current.description}</p>
            </div>

            <div className="Blades-controls">
                <button
                    type="button"
                    className="Blades-btn"
                    onClick={() => setActive((i) => (i - 1 + total) % total)}
                    aria-label="Blade précédent"
                >
                    ← PREV
                </button>
                <span className="Blades-counter">
                    <span className="Blades-counter-current">
                        {String(active + 1).padStart(2, '0')}
                    </span>
                    <span className="Blades-counter-total">
                        / {String(total).padStart(2, '0')}
                    </span>
                </span>
                <button
                    type="button"
                    className="Blades-btn"
                    onClick={() => setActive((i) => (i + 1) % total)}
                    aria-label="Blade suivant"
                >
                    NEXT →
                </button>
            </div>
        </div>
    );
}
