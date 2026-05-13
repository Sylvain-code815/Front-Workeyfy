import { useEffect, useRef, useState } from 'react';
import DataStreamCarousel from '../components/sections/lab/DataStreamCarousel';
import NeuralGridCarousel from '../components/sections/lab/NeuralGridCarousel';
import HardwareBladesCarousel from '../components/sections/lab/HardwareBladesCarousel';
import PrismBackend from '../components/sections/lab/PrismBackend';
import AuroraBackend from '../components/sections/lab/AuroraBackend';
import MonolithBackend from '../components/sections/lab/MonolithBackend';
import RuptureBackend from '../components/sections/lab/RuptureBackend';
import FusionCore from '../components/sections/lab/FusionCore';
import CockpitLegacy from '../components/sections/lab/CockpitLegacy';
import WaveDropletDemo from '../components/sections/lab/WaveDropletDemo';
import MercuryDemo from '../components/sections/lab/MercuryDemo';
import RemnantDemo from '../components/sections/lab/RemnantDemo';
import YinYangDemo from '../components/sections/lab/YinYangDemo';
import { usePageTheme } from '../contexts/PageThemeContext';
import './Lab.css';

type LabTab = 'backend' | 'video';
type BackendSectionId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
type VideoSectionId = 'V1' | 'V2' | 'V3' | 'V4';
type LabSectionId = BackendSectionId | VideoSectionId;

const backendSections: { id: BackendSectionId; code: string; title: string }[] = [
    { id: 'A', code: '01', title: 'THE DATA STREAM' },
    { id: 'B', code: '02', title: 'THE NEURAL GRID' },
    { id: 'C', code: '03', title: 'HARDWARE BLADES' },
    { id: 'D', code: '04', title: 'BACKEND // PRISM' },
    { id: 'E', code: '05', title: 'BACKEND // AURORA' },
    { id: 'F', code: '06', title: 'BACKEND // MONOLITH' },
    { id: 'G', code: '07', title: 'BACKEND // RUPTURE' },
    { id: 'H', code: '08', title: 'BACKEND // FUSION CORE' },
    { id: 'I', code: '09', title: 'BACKEND // COCKPIT v1 (archive)' },
];

const videoSections: { id: VideoSectionId; code: string; title: string }[] = [
    { id: 'V1', code: '01', title: 'WAVE // DROPLET' },
    { id: 'V2', code: '02', title: 'MERCURY // PERSISTENT MARKER' },
    { id: 'V3', code: '03', title: 'PUSH + REMNANT' },
    { id: 'V4', code: '04', title: 'YIN-YANG // GAMING PREVIEW' },
];

const tabs: { id: LabTab; label: string }[] = [
    { id: 'backend', label: 'Test Backend' },
    { id: 'video', label: 'Test Vidéo' },
];

export default function Lab() {
    const [activeTab, setActiveTab] = useState<LabTab>('backend');
    const [activeBackend, setActiveBackend] = useState<BackendSectionId>('A');
    const [activeVideo, setActiveVideo] = useState<VideoSectionId>('V1');
    const { setTheme } = usePageTheme();
    const refs = useRef<Record<LabSectionId, HTMLElement | null>>({
        A: null,
        B: null,
        C: null,
        D: null,
        E: null,
        F: null,
        G: null,
        H: null,
        I: null,
        V1: null,
        V2: null,
        V3: null,
        V4: null,
    });

    useEffect(() => {
        setTheme('dark');
    }, [setTheme]);

    // IntersectionObserver scoped per active tab — only the visible tab's
    // sections are observed so the rail's active highlight tracks the
    // section currently in view without cross-talk between tabs.
    useEffect(() => {
        const targetIds: LabSectionId[] =
            activeTab === 'backend'
                ? backendSections.map((s) => s.id)
                : videoSections.map((s) => s.id);

        const observer = new IntersectionObserver(
            (entries) => {
                let best: IntersectionObserverEntry | null = null;
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        (!best || entry.intersectionRatio > best.intersectionRatio)
                    ) {
                        best = entry;
                    }
                });
                if (best) {
                    const id = (best as IntersectionObserverEntry).target.getAttribute(
                        'data-lab-section'
                    ) as LabSectionId | null;
                    if (!id) return;
                    if (activeTab === 'backend' && (id as BackendSectionId)) {
                        setActiveBackend(id as BackendSectionId);
                    } else if (activeTab === 'video') {
                        setActiveVideo(id as VideoSectionId);
                    }
                }
            },
            { threshold: [0.4, 0.6, 0.8] }
        );
        targetIds.forEach((id) => {
            const node = refs.current[id];
            if (node) observer.observe(node);
        });
        return () => observer.disconnect();
    }, [activeTab]);

    const scrollTo = (id: LabSectionId) => {
        refs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleTabSwitch = (tab: LabTab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        // Reset scroll to top of the new tab's content so the rail's first
        // section is naturally in view after the switch (avoids briefly
        // showing the bottom of the previous tab's scrollTop).
        window.scrollTo({ top: 0, behavior: 'auto' });
    };

    const rail = activeTab === 'backend' ? backendSections : videoSections;
    const activeRailId: LabSectionId =
        activeTab === 'backend' ? activeBackend : activeVideo;

    return (
        <main className="Lab">
            <nav className="Lab-tabs" aria-label="Lab top-level tabs">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        className={`Lab-tab${activeTab === t.id ? ' is-active' : ''}`}
                        onClick={() => handleTabSwitch(t.id)}
                        aria-current={activeTab === t.id ? 'true' : undefined}
                    >
                        {t.label}
                    </button>
                ))}
            </nav>

            <aside className="Lab-rail" aria-label="Lab navigation">
                {rail.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        className={`Lab-rail-item${activeRailId === s.id ? ' is-active' : ''}`}
                        onClick={() => scrollTo(s.id)}
                        aria-current={activeRailId === s.id ? 'true' : undefined}
                    >
                        <span className="Lab-rail-code">{s.code}</span>
                        <span className="Lab-rail-title">{s.title}</span>
                    </button>
                ))}
            </aside>

            {activeTab === 'backend' && (
                <>
                    <section
                        ref={(node) => {
                            refs.current.A = node;
                        }}
                        data-lab-section="A"
                        className="Lab-section Lab-section--A"
                        aria-label="Concept A — The Data Stream"
                    >
                        <DataStreamCarousel />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.B = node;
                        }}
                        data-lab-section="B"
                        className="Lab-section Lab-section--B"
                        aria-label="Concept B — The Neural Grid"
                    >
                        <NeuralGridCarousel />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.C = node;
                        }}
                        data-lab-section="C"
                        className="Lab-section Lab-section--C"
                        aria-label="Concept C — Hardware Blades"
                    >
                        <HardwareBladesCarousel />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.D = node;
                        }}
                        data-lab-section="D"
                        className="Lab-section Lab-section--D"
                        aria-label="Backend prototype D — Prism"
                    >
                        <PrismBackend />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.E = node;
                        }}
                        data-lab-section="E"
                        className="Lab-section Lab-section--E"
                        aria-label="Backend prototype E — Aurora"
                    >
                        <AuroraBackend />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.F = node;
                        }}
                        data-lab-section="F"
                        className="Lab-section Lab-section--F"
                        aria-label="Backend prototype F — Monolith"
                    >
                        <MonolithBackend />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.G = node;
                        }}
                        data-lab-section="G"
                        className="Lab-section Lab-section--G"
                        aria-label="Backend prototype G — Rupture"
                    >
                        <RuptureBackend />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.H = node;
                        }}
                        data-lab-section="H"
                        className="Lab-section Lab-section--H"
                        aria-label="Backend prototype H — Fusion Core"
                    >
                        <FusionCore />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.I = node;
                        }}
                        data-lab-section="I"
                        className="Lab-section Lab-section--I"
                        aria-label="Backend prototype I — Cockpit v1 (card grid archive)"
                    >
                        <CockpitLegacy />
                    </section>
                </>
            )}

            {activeTab === 'video' && (
                <>
                    <section
                        ref={(node) => {
                            refs.current.V1 = node;
                        }}
                        data-lab-section="V1"
                        className="Lab-section Lab-section--video"
                        aria-label="Video diagonal — Wave / Droplet"
                    >
                        <WaveDropletDemo />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.V2 = node;
                        }}
                        data-lab-section="V2"
                        className="Lab-section Lab-section--video"
                        aria-label="Video diagonal — Mercury persistent marker"
                    >
                        <MercuryDemo />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.V3 = node;
                        }}
                        data-lab-section="V3"
                        className="Lab-section Lab-section--video"
                        aria-label="Video diagonal — Push with remnant"
                    >
                        <RemnantDemo />
                    </section>

                    <section
                        ref={(node) => {
                            refs.current.V4 = node;
                        }}
                        data-lab-section="V4"
                        className="Lab-section Lab-section--video"
                        aria-label="Video diagonal — Yin-Yang seed takeover"
                    >
                        <YinYangDemo />
                    </section>
                </>
            )}
        </main>
    );
}
