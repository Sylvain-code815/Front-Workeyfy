import { useEffect, useMemo, useRef, useState } from 'react';
import ContactButton from '../components/layout/ContactButton';
import Cog3D from '../components/canvas/Cog3D';
import Globe3D from '../components/canvas/Globe3D';
import AnalyticsDashboard from '../components/sections/AnalyticsDashboard';
import { usePageTheme, type Theme } from '../contexts/PageThemeContext';
import './Projects.css';

type Service = { name: string; status: string };

type MemberSlide = {
    id: string;
    frontUrl?: string;
    imageUrl?: string;
    title: string;
    domain: string;
    description: string;
    services: Service[];
};

const picsum = (seed: string) => `https://picsum.photos/seed/${seed}/1280/800`;

const memberSlides: MemberSlide[] = [
    {
        id: 'mahoudeau',
        frontUrl: 'https://www.mahoudeau.dev/',
        title: 'QUANTUM CRM',
        domain: 'mahoudeau.dev',
        description:
            'A comprehensive customer relationship management platform built with React, Redux, and PostgreSQL. Features real-time analytics, automated workflows, and seamless integrations.',
        services: [
            { name: 'API Gateway', status: 'Operational' },
            { name: 'Cache Layer', status: 'Healthy' },
            { name: 'Database', status: 'Active' },
            { name: 'Auth Service', status: 'Secure' },
            { name: 'CDN', status: 'Online' },
            { name: 'Message Queue', status: 'Running' },
        ],
    },
    {
        id: 'sylvain',
        frontUrl: 'https://sylvain-code815.github.io/index.html',
        title: 'PORTFOLIO BLOIS',
        domain: 'sylvain-code815.github.io',
        description:
            'Front-end developer based in Blois — passionate about creating modern interactive web experiences. Built sites for tea cafés, gaming campuses, restaurants, and interactive applications.',
        services: [
            { name: 'HTML5', status: 'Expert' },
            { name: 'CSS3', status: 'Expert' },
            { name: 'JavaScript', status: 'Advanced' },
            { name: 'React', status: 'Active' },
            { name: 'TypeScript', status: 'Active' },
            { name: 'Three.js', status: 'Learning' },
        ],
    },
    {
        id: 'neon-fintech',
        imageUrl: picsum('neon-fintech'),
        title: 'NEON FINTECH',
        domain: 'neon-fintech.io',
        description:
            'Banking interface with realtime transaction streams, neon-grid dashboards and biometric auth flows. Built around an event-sourced ledger.',
        services: [
            { name: 'Ledger Engine', status: 'Live' },
            { name: 'Risk Scoring', status: 'Active' },
            { name: 'KYC Pipeline', status: 'Compliant' },
            { name: 'Webhooks', status: 'Healthy' },
            { name: 'Card Issuing', status: 'Operational' },
            { name: 'Audit Trail', status: 'Sealed' },
        ],
    },
    {
        id: 'pulse-analytics',
        imageUrl: picsum('pulse-analytics'),
        title: 'PULSE ANALYTICS',
        domain: 'pulse-analytics.app',
        description:
            'Realtime metrics platform with subsecond charts, anomaly detection and a query builder that talks to a columnar warehouse.',
        services: [
            { name: 'Stream Ingest', status: 'Streaming' },
            { name: 'OLAP Store', status: 'Healthy' },
            { name: 'Anomaly AI', status: 'Trained' },
            { name: 'Dashboards', status: 'Online' },
            { name: 'Alerting', status: 'Armed' },
            { name: 'Exporter', status: 'Ready' },
        ],
    },
    {
        id: 'orbit-saas',
        imageUrl: picsum('orbit-saas'),
        title: 'ORBIT SaaS',
        domain: 'orbit-saas.dev',
        description:
            'Workspace and billing suite for indie SaaS teams. Multi-tenant by design, with usage-based pricing and a plug-in marketplace.',
        services: [
            { name: 'Tenant Router', status: 'Operational' },
            { name: 'Billing', status: 'Live' },
            { name: 'Marketplace', status: 'Open' },
            { name: 'Sandbox', status: 'Spawning' },
            { name: 'SSO', status: 'Federated' },
            { name: 'Backups', status: 'Hourly' },
        ],
    },
    {
        id: 'lumen-ai',
        imageUrl: picsum('lumen-ai'),
        title: 'LUMEN AI',
        domain: 'lumen-ai.studio',
        description:
            'Prompt studio for product teams. Versioned prompts, evals, and a deployment graph that ships variants behind feature gates.',
        services: [
            { name: 'Prompt Store', status: 'Versioned' },
            { name: 'Eval Runner', status: 'Scoring' },
            { name: 'Inference', status: 'Warm' },
            { name: 'A/B Gates', status: 'Active' },
            { name: 'Telemetry', status: 'Streaming' },
            { name: 'Cache', status: 'Hot' },
        ],
    },
    {
        id: 'arcadia-games',
        imageUrl: picsum('arcadia-games'),
        title: 'ARCADIA GAMES',
        domain: 'arcadia-games.gg',
        description:
            'Esports platform with tournament brackets, spectator overlays and a rewards economy. Scoring runs on a deterministic match server.',
        services: [
            { name: 'Match Server', status: 'Authoritative' },
            { name: 'Bracket Engine', status: 'Live' },
            { name: 'Overlay CDN', status: 'Online' },
            { name: 'Wallets', status: 'Settled' },
            { name: 'Anti-cheat', status: 'Watching' },
            { name: 'Replays', status: 'Indexed' },
        ],
    },
    {
        id: 'aurora-shop',
        imageUrl: picsum('aurora-shop'),
        title: 'AURORA SHOP',
        domain: 'aurora-shop.store',
        description:
            'Headless commerce front-end with WebGL product views, edge personalization and a checkout that completes in two taps.',
        services: [
            { name: 'Catalog', status: 'Indexed' },
            { name: 'Edge Cache', status: 'Warm' },
            { name: 'Checkout', status: 'Lightning' },
            { name: 'Search', status: 'Tuned' },
            { name: 'Reviews', status: 'Verified' },
            { name: 'Recos', status: 'Personalized' },
        ],
    },
    {
        id: 'voltage-music',
        imageUrl: picsum('voltage-music'),
        title: 'VOLTAGE MUSIC',
        domain: 'voltage-music.fm',
        description:
            'Streaming app with collaborative playlists, lossless transcoding and a recommendation engine tuned for late-night listening.',
        services: [
            { name: 'Transcoder', status: 'Lossless' },
            { name: 'Recos', status: 'Tuned' },
            { name: 'Sessions', status: 'Live' },
            { name: 'Playlists', status: 'Synced' },
            { name: 'Catalog', status: 'Curated' },
            { name: 'Royalties', status: 'Reported' },
        ],
    },
    {
        id: 'mercury-mail',
        imageUrl: picsum('mercury-mail'),
        title: 'MERCURY MAIL',
        domain: 'mercury-mail.dev',
        description:
            'Transactional mail API with deliverability scoring, drag-drop templates and a webhook bus that survives regional outages.',
        services: [
            { name: 'SMTP Relay', status: 'Healthy' },
            { name: 'Templates', status: 'Compiled' },
            { name: 'Reputation', status: 'Trusted' },
            { name: 'Webhooks', status: 'At least once' },
            { name: 'Analytics', status: 'Streaming' },
            { name: 'Suppressions', status: 'Honored' },
        ],
    },
    {
        id: 'helios-iot',
        imageUrl: picsum('helios-iot'),
        title: 'HELIOS IoT',
        domain: 'helios-iot.cloud',
        description:
            'Fleet console for solar microgrids. Edge devices report telemetry over MQTT and reconcile through a CRDT-based state engine.',
        services: [
            { name: 'MQTT Broker', status: 'Clustered' },
            { name: 'CRDT Sync', status: 'Converged' },
            { name: 'OTA Updates', status: 'Rolling' },
            { name: 'Telemetry', status: 'Live' },
            { name: 'Geofencing', status: 'Armed' },
            { name: 'Inventory', status: 'Tracked' },
        ],
    },
    {
        id: 'cobalt-docs',
        imageUrl: picsum('cobalt-docs'),
        title: 'COBALT DOCS',
        domain: 'cobalt-docs.app',
        description:
            'Collaborative editor with offline-first CRDTs, cursor presence and a publishing pipeline that exports to static sites.',
        services: [
            { name: 'CRDT Engine', status: 'Synced' },
            { name: 'Presence', status: 'Live' },
            { name: 'Comments', status: 'Threaded' },
            { name: 'Publish', status: 'Static' },
            { name: 'Search', status: 'Indexed' },
            { name: 'History', status: 'Restorable' },
        ],
    },
    {
        id: 'nimbus-devops',
        imageUrl: picsum('nimbus-devops'),
        title: 'NIMBUS DEVOPS',
        domain: 'nimbus-devops.sh',
        description:
            'CI/CD console with build graphs, ephemeral preview environments and a SLO-driven deploy gate.',
        services: [
            { name: 'Runners', status: 'Idle Pool' },
            { name: 'Previews', status: 'Spinning Up' },
            { name: 'SLO Gate', status: 'Green' },
            { name: 'Artifacts', status: 'Stored' },
            { name: 'Secrets', status: 'Rotated' },
            { name: 'Audit', status: 'Logged' },
        ],
    },
    {
        id: 'spectra-vr',
        imageUrl: picsum('spectra-vr'),
        title: 'SPECTRA VR',
        domain: 'spectra-vr.world',
        description:
            'Spatial collaboration rooms with low-latency audio, hand tracking and a scene editor that lives in the headset.',
        services: [
            { name: 'Spatial Audio', status: 'Live' },
            { name: 'Hand Tracking', status: 'Locked' },
            { name: 'Scene Sync', status: 'Authoritative' },
            { name: 'Avatars', status: 'Rendered' },
            { name: 'Voice Mod', status: 'Filtered' },
            { name: 'Recording', status: 'Idle' },
        ],
    },
    {
        id: 'circuit-edu',
        imageUrl: picsum('circuit-edu'),
        title: 'CIRCUIT EDU',
        domain: 'circuit-edu.io',
        description:
            'Hands-on learning platform with browser-side sandboxes, live grading and a curriculum builder for technical bootcamps.',
        services: [
            { name: 'Sandboxes', status: 'Spawning' },
            { name: 'Grader', status: 'Running' },
            { name: 'Curriculum', status: 'Versioned' },
            { name: 'Cohorts', status: 'Active' },
            { name: 'Reviews', status: 'Peered' },
            { name: 'Certificates', status: 'Signed' },
        ],
    },
];

const SAMPLE_VIDEOS = [
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
    'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4',
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4',
    'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_2MB.mp4',
    'https://www.w3schools.com/html/mov_bbb.mp4',
    'https://www.w3schools.com/html/movie.mp4',
];

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const robloxGames = [
    { id: 'tycoon-empire', label: 'Tycoon Empire' },
    { id: 'racing-arena', label: 'Racing Arena' },
    { id: 'rpg-world', label: 'RPG World' },
];

const fivemGames = [
    { id: 'city-roleplay', label: 'City Roleplay' },
    { id: 'police-simulator', label: 'Police Simulator' },
    { id: 'racing-circuit', label: 'Racing Circuit' },
];

type Accent = 'cyan' | 'green';
type SectionId = 1 | 2 | 3;

function ExternalLinkIcon() {
    return (
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
            <path
                d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

function VideoCard({ label, accent }: { label: string; accent: Accent }) {
    const posterSeed = useMemo(() => Math.random().toString(36).slice(2, 10), []);
    return (
        <div
            className={`ProjectsGaming-card ProjectsGaming-card--${accent}`}
            aria-label={label}
        >
            <img
                className="ProjectsGaming-card-thumb"
                src={`https://picsum.photos/seed/${posterSeed}/400/225`}
                alt=""
                loading="lazy"
            />
            <span className="ProjectsGaming-card-overlay" aria-hidden="true" />
            <span className="ProjectsGaming-card-play" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                </svg>
            </span>
            <span className="ProjectsGaming-card-label">{label}</span>
        </div>
    );
}

function ColumnBackground() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoSrc = useMemo(() => pickRandom(SAMPLE_VIDEOS), []);
    const [muted, setMuted] = useState(true);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const column = video.closest('.ProjectsGaming-column');
        if (!column) return;

        const handleEnter = () => {
            video.play().catch(() => {});
        };
        const handleLeave = () => {
            video.pause();
            video.muted = true;
            setMuted(true);
        };

        column.addEventListener('mouseenter', handleEnter);
        column.addEventListener('mouseleave', handleLeave);
        return () => {
            column.removeEventListener('mouseenter', handleEnter);
            column.removeEventListener('mouseleave', handleLeave);
        };
    }, []);

    if (failed) return null;

    return (
        <video
            ref={videoRef}
            className="ProjectsGaming-bg-video"
            src={videoSrc}
            muted={muted}
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onError={() => setFailed(true)}
            onClick={(e) => {
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                v.muted = !v.muted;
                setMuted(v.muted);
            }}
        />
    );
}

type SlideRole =
    | 'active'
    | 'prev1'
    | 'prev2'
    | 'prev3'
    | 'prev4'
    | 'next1'
    | 'next2'
    | 'next3'
    | 'next4'
    | 'hidden';

const SWIPE_DURATION_MS = 600;

function offsetToRole(offset: number): SlideRole {
    switch (offset) {
        case 0: return 'active';
        case -1: return 'prev1';
        case -2: return 'prev2';
        case -3: return 'prev3';
        case -4: return 'prev4';
        case 1: return 'next1';
        case 2: return 'next2';
        case 3: return 'next3';
        case 4: return 'next4';
        default: return 'hidden';
    }
}

export default function Projects() {
    const [section1View, setSection1View] = useState<'back' | 'front'>('front');
    const [slideIndex, setSlideIndex] = useState<number>(0);
    const [isSwiping, setIsSwiping] = useState<boolean>(false);
    const [swipeDir, setSwipeDir] = useState<'prev' | 'next' | null>(null);
    const [activeSection, setActiveSection] = useState<SectionId>(1);
    const { setTheme } = usePageTheme();

    const section1Ref = useRef<HTMLElement>(null);
    const section2Ref = useRef<HTMLElement>(null);
    const section3Ref = useRef<HTMLElement>(null);
    const swipeTimerRef = useRef<number | null>(null);

    const totalSlides = memberSlides.length;
    const currentSlide = memberSlides[slideIndex];

    const handleSlotClick = (role: SlideRole) => {
        if (role === 'active' || role === 'hidden') return;
        triggerSwipe(role.startsWith('prev') ? 'prev' : 'next');
    };

    const triggerSwipe = (dir: 'prev' | 'next') => {
        if (isSwiping) return;
        setSwipeDir(dir);
        setIsSwiping(true);
        setSlideIndex((i) =>
            dir === 'next'
                ? (i + 1) % totalSlides
                : (i - 1 + totalSlides) % totalSlides
        );
        if (swipeTimerRef.current !== null) {
            window.clearTimeout(swipeTimerRef.current);
        }
        swipeTimerRef.current = window.setTimeout(() => {
            setIsSwiping(false);
            setSwipeDir(null);
            swipeTimerRef.current = null;
        }, SWIPE_DURATION_MS);
    };

    useEffect(() => {
        return () => {
            if (swipeTimerRef.current !== null) {
                window.clearTimeout(swipeTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let theme: Theme = 'dark';
        if (activeSection === 1) {
            theme = section1View === 'front' ? 'light' : 'dark';
        } else if (activeSection === 2) {
            theme = 'dark';
        } else if (activeSection === 3) {
            theme = 'light';
        }
        setTheme(theme);
    }, [activeSection, section1View, setTheme]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                let bestEntry: IntersectionObserverEntry | null = null;
                entries.forEach((entry) => {
                    if (
                        entry.isIntersecting &&
                        (!bestEntry || entry.intersectionRatio > bestEntry.intersectionRatio)
                    ) {
                        bestEntry = entry;
                    }
                });
                if (bestEntry) {
                    const idx = Number(
                        (bestEntry as IntersectionObserverEntry).target.getAttribute('data-section')
                    ) as SectionId;
                    setActiveSection(idx);
                }
            },
            { threshold: [0.4, 0.6, 0.8] }
        );

        const refs = [section1Ref, section2Ref, section3Ref];
        refs.forEach((ref) => {
            if (ref.current) observer.observe(ref.current);
        });
        return () => observer.disconnect();
    }, []);

    return (
        <main className="Projects">
            {/* SECTION 1 — Carousel membres (back <-> front) */}
            <section
                ref={section1Ref}
                data-section="1"
                className={`Projects-section Projects-section--back Projects-section--back-${section1View}`}
                aria-label={`Showcase membre — ${currentSlide.id}`}
            >
                <div className="ProjectsBack-top">
                    <span
                        className="ProjectsBack-label"
                        style={{ visibility: section1View === 'back' ? 'visible' : 'hidden' }}
                    >
                        BACKEND ARCHITECTURE
                    </span>
                </div>

                <div className="ProjectsBack-toggle">
                    {section1View === 'front' ? (
                        <Cog3D
                            className="ProjectsBack-cog3d"
                            ariaLabel="Voir la partie back"
                            onActivate={() => setSection1View('back')}
                        />
                    ) : (
                        <Globe3D
                            className="ProjectsBack-globe3d"
                            ariaLabel="Voir la partie front"
                            onActivate={() => setSection1View('front')}
                        />
                    )}
                </div>

                <div className="ProjectsBack-stage">
                    <div
                        className="ProjectsBack-view ProjectsBack-view--back"
                        aria-hidden={section1View !== 'back'}
                    >
                        <div className="ProjectsBack-grid">
                            <div className="ProjectsBack-info">
                                <h2 className="ProjectsBack-title">{currentSlide.title}</h2>
                                <a
                                    href={`https://${currentSlide.domain}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ProjectsBack-link"
                                >
                                    {currentSlide.domain}
                                    <ExternalLinkIcon />
                                </a>
                                <p className="ProjectsBack-description">
                                    {currentSlide.description}
                                </p>
                            </div>

                            <div className="ProjectsBack-services">
                                {currentSlide.services.map((s) => (
                                    <div className="ProjectsBack-service" key={s.name}>
                                        <span className="ProjectsBack-service-name">{s.name}</span>
                                        <span className="ProjectsBack-service-status">
                                            {s.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div
                        className="ProjectsBack-view ProjectsBack-view--front"
                        aria-hidden={section1View !== 'front'}
                    >
                        <div
                            className={`ProjectsBack-stage3d${
                                isSwiping ? ' ProjectsBack-stage3d--swiping' : ''
                            }${swipeDir ? ` ProjectsBack-stage3d--swipe-${swipeDir}` : ''}`}
                        >
                            {memberSlides.map((slide, i) => {
                                const total = memberSlides.length;
                                const half = Math.floor(total / 2);
                                let offset = i - slideIndex;
                                if (offset > half) offset -= total;
                                if (offset < -half) offset += total;

                                const role = offsetToRole(offset);

                                const isSideSlot = role !== 'active' && role !== 'hidden';

                                return (
                                    <div
                                        key={slide.id}
                                        className={`ProjectsBack-slotPos ProjectsBack-slotPos--${role}`}
                                        onClick={isSideSlot ? () => handleSlotClick(role) : undefined}
                                        role={isSideSlot ? 'button' : undefined}
                                        aria-label={
                                            role.startsWith('prev')
                                                ? 'Slide précédent'
                                                : role.startsWith('next')
                                                  ? 'Slide suivant'
                                                  : undefined
                                        }
                                    >
                                        <div
                                            className={`ProjectsBack-slot ProjectsBack-slot--${role}`}
                                        >
                                            {slide.frontUrl ? (
                                                <iframe
                                                    src={slide.frontUrl}
                                                    className="ProjectsBack-iframe"
                                                    title={`Portfolio ${slide.id}`}
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer"
                                                    tabIndex={role === 'active' ? 0 : -1}
                                                />
                                            ) : (
                                                <img
                                                    src={slide.imageUrl}
                                                    alt={slide.title}
                                                    className="ProjectsBack-img"
                                                    loading="lazy"
                                                    draggable={false}
                                                />
                                            )}
                                            <div
                                                className="ProjectsBack-vinylSheen"
                                                aria-hidden="true"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div
                    className="ProjectsBack-counter"
                    aria-label={`Projet ${slideIndex + 1} sur ${totalSlides}`}
                >
                    <span className="ProjectsBack-counter-current">
                        {String(slideIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="ProjectsBack-counter-total">
                        / {String(totalSlides).padStart(2, '0')}
                    </span>
                    <span
                        className="ProjectsBack-counter-track"
                        aria-hidden="true"
                    >
                        <span
                            className="ProjectsBack-counter-fill"
                            style={{
                                transform: `scaleX(${
                                    (slideIndex + 1) / totalSlides
                                })`,
                            }}
                        />
                    </span>
                </div>
            </section>

            {/* SECTION 2 — Gaming Productions */}
            <section
                ref={section2Ref}
                data-section="2"
                className="Projects-section Projects-section--gaming"
                aria-label="Gaming Productions"
            >
                <span className="ProjectsGaming-badge">GAMING PRODUCTIONS</span>

                <div className="ProjectsGaming-column ProjectsGaming-column--roblox">
                    <ColumnBackground />
                    <div className="ProjectsGaming-content">
                        <h2 className="ProjectsGaming-title">Roblox Metaverse</h2>
                        <p className="ProjectsGaming-description">
                            Immersive experiences built with Lua scripting, custom physics
                            engines, and advanced monetization systems.
                        </p>
                        <div className="ProjectsGaming-cards">
                            {robloxGames.map((g) => (
                                <VideoCard key={g.id} label={g.label} accent="cyan" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ProjectsGaming-column ProjectsGaming-column--fivem">
                    <ColumnBackground />
                    <div className="ProjectsGaming-content">
                        <h2 className="ProjectsGaming-title">FiveM Framework</h2>
                        <p className="ProjectsGaming-description">
                            Advanced GTA V multiplayer servers with custom React-based HUDs,
                            real-time economy systems, and fully scripted roleplay mechanics.
                        </p>
                        <div className="ProjectsGaming-cards">
                            {fivemGames.map((g) => (
                                <VideoCard key={g.id} label={g.label} accent="green" />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 3 — Application / Analytics Dashboard Pro */}
            <section
                ref={section3Ref}
                data-section="3"
                className="Projects-section Projects-section--app"
                aria-label="Analytics Dashboard Pro"
            >
                <AnalyticsDashboard />
            </section>

            <ContactButton fixed />
        </main>
    );
}
