import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import ProjectsPager from '../tunnel/ProjectsPager';
import ContactButton from '../components/layout/ContactButton';
import Cog3D from '../components/canvas/Cog3D';
import Globe3D from '../components/canvas/Globe3D';
import GlobalFluidMesh from '../components/canvas/GlobalFluidMesh';
import BackgroundAtmosphere from '../components/canvas/BackgroundAtmosphere';
import AnalyticsDashboard, { type Slide as AnalyticsSlide } from '../components/sections/AnalyticsDashboard';
import BackendCockpit from '../components/sections/BackendCockpit';
import { usePageTheme, type Theme } from '../contexts/PageThemeContext';
import { useTunnel } from '../tunnel/TunnelContext';
import ScanlineSweep from '../tunnel/ScanlineSweep';
import Typewriter from '../tunnel/Typewriter';
import generatedPalettesRaw from '../data/generatedPalettes.json';
import './Projects.css';

gsap.registerPlugin(ScrollTrigger);

// Output of `npm run colors` — keyed by project id. Missing entries are
// fine, the runtime resolver falls back to Liquid Silver.
type GeneratedPaletteEntry = {
    colors: [string, string];
    source?: string;
    extractedAt?: string;
};
const generatedPalettes = generatedPalettesRaw as Record<string, GeneratedPaletteEntry>;

// Liquid Silver default — low-chroma pair that triggers the shader's
// achromatic / silver-liquid branch (uBase #050505, refraction × 1.8).
// Used whenever neither a manual override nor a generated palette exists
// for the active slide.
const LIQUID_SILVER_LEFT = '#A8AEB8';
const LIQUID_SILVER_RIGHT = '#1E2227';

/**
 * Palette resolution priority — same chain for member slides and
 * AnalyticsDashboard slides:
 *   1. slide.manualColors          (artistic override)
 *   2. generatedPalettes[slide.id]  (output of `npm run colors`)
 *   3. Liquid Silver default        (shader handles the rest)
 */
function resolvePalette(
    slide: { id: string; manualColors?: [string, string] } | null | undefined,
): { colorLeft: string; colorRight: string } {
    if (slide?.manualColors) {
        return { colorLeft: slide.manualColors[0], colorRight: slide.manualColors[1] };
    }
    const auto = slide ? generatedPalettes[slide.id]?.colors : undefined;
    if (auto) {
        return { colorLeft: auto[0], colorRight: auto[1] };
    }
    return { colorLeft: LIQUID_SILVER_LEFT, colorRight: LIQUID_SILVER_RIGHT };
}

type Service = { name: string; status: string };

type MemberSlide = {
    id: string;
    frontUrl?: string;
    imageUrl?: string;
    title: string;
    domain: string;
    description: string;
    services: Service[];
    /** Manual palette override [left, right] — wins over the auto-extracted
     *  palette from `generatedPalettes.json`. Use this only when the auto
     *  pick is artistically off (e.g. site loads behind a login, hero is
     *  a video). N&B themes work via the shader's achromatic detection. */
    manualColors?: [string, string];
    /** Optional absolute flow rate for the fluid mesh.
     *  0.02 ≈ calm (portfolio / corporate), 0.06 = default,
     *  0.08 ≈ gaming / energetic. */
    speed?: number;
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
        manualColors: ['#5EE7E7', '#A78BFA'],
        speed: 0.04,
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
        manualColors: ['#FFAA00', '#FF0055'],
        speed: 0.075,
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
        manualColors: ['#22D3EE', '#4ADE80'],
        speed: 0.065,
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
        manualColors: ['#FF3DCB', '#22D3EE'],
        speed: 0.085,
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
        manualColors: ['#6366F1', '#A78BFA'],
        speed: 0.025,
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
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4',
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_5MB.mp4',
    'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_5MB.mp4',
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_10MB.mp4',
    'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_10MB.mp4',
    'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_10MB.mp4',
];

type Game = { id: string; label: string; videoUrl: string };

const robloxGames: Game[] = [
    { id: 'tycoon-empire', label: 'Tycoon Empire', videoUrl: SAMPLE_VIDEOS[0] },
    { id: 'racing-arena', label: 'Racing Arena', videoUrl: SAMPLE_VIDEOS[1] },
    { id: 'rpg-world', label: 'RPG World', videoUrl: SAMPLE_VIDEOS[2] },
];

const fivemGames: Game[] = [
    { id: 'city-roleplay', label: 'City Roleplay', videoUrl: SAMPLE_VIDEOS[3] },
    { id: 'police-simulator', label: 'Police Simulator', videoUrl: SAMPLE_VIDEOS[4] },
    { id: 'racing-circuit', label: 'Racing Circuit', videoUrl: SAMPLE_VIDEOS[5] },
];

type Accent = 'cyan' | 'green';
type SectionId = 1 | 2 | 3;

function VideoCard({
    label,
    accent,
    isActive = false,
    onClick,
}: {
    label: string;
    accent: Accent;
    isActive?: boolean;
    onClick?: () => void;
}) {
    const posterSeed = useMemo(() => Math.random().toString(36).slice(2, 10), []);
    const classes = [
        'ProjectsGaming-card',
        `ProjectsGaming-card--${accent}`,
        isActive ? 'ProjectsGaming-card--active' : '',
    ]
        .filter(Boolean)
        .join(' ');
    return (
        <button
            type="button"
            className={classes}
            aria-label={label}
            aria-pressed={isActive}
            onClick={onClick}
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
        </button>
    );
}

function ColumnBackground({
    src,
    fading,
    videoRef,
    onLoaded,
    onVideoClick,
}: {
    src: string;
    fading: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onLoaded?: () => void;
    onVideoClick?: () => void;
}) {
    const [failed, setFailed] = useState(false);

    if (failed) return null;

    const className =
        'ProjectsGaming-bg-video' + (fading ? ' ProjectsGaming-bg-video--fading' : '');

    return (
        <video
            ref={videoRef}
            className={className}
            src={src}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onError={() => setFailed(true)}
            onLoadedData={onLoaded}
            onClick={(e) => {
                e.stopPropagation();
                onVideoClick?.();
            }}
        />
    );
}

function GamingColumn({
    columnClass,
    accent,
    games,
    title,
    titleDelay,
    titleCursorColor,
    description,
    revealStart,
}: {
    columnClass: 'ProjectsGaming-column--roblox' | 'ProjectsGaming-column--fivem';
    accent: Accent;
    games: Game[];
    title: string;
    titleDelay: number;
    titleCursorColor: 'cyan' | 'magenta';
    description: string;
    revealStart: boolean;
}) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [fading, setFading] = useState(false);
    const [swapKey, setSwapKey] = useState(0);
    const [flashAction, setFlashAction] = useState<{ kind: 'play' | 'pause'; nonce: number } | null>(null);
    const [muteToast, setMuteToast] = useState<{ muted: boolean; nonce: number } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const columnRef = useRef<HTMLDivElement>(null);
    const swapPendingRef = useRef(false);
    const userPausedRef = useRef(false);
    const flashTimeoutRef = useRef<number | null>(null);
    const muteTimeoutRef = useRef<number | null>(null);

    const triggerFlash = (kind: 'play' | 'pause') => {
        if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
        setFlashAction({ kind, nonce: Date.now() });
        flashTimeoutRef.current = window.setTimeout(() => setFlashAction(null), 650);
    };

    const triggerMuteToast = (muted: boolean) => {
        if (muteTimeoutRef.current) window.clearTimeout(muteTimeoutRef.current);
        setMuteToast({ muted, nonce: Date.now() });
        muteTimeoutRef.current = window.setTimeout(() => setMuteToast(null), 1000);
    };

    useEffect(() => {
        return () => {
            if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current);
            if (muteTimeoutRef.current) window.clearTimeout(muteTimeoutRef.current);
        };
    }, []);

    // Hover-driven autoplay / pause + remute on leave — preserves the
    // immersive column behavior. Respects a sticky user-pause: if the user
    // explicitly paused via click, hovering back in shouldn't auto-resume.
    useEffect(() => {
        const column = columnRef.current;
        if (!column) return;
        const handleEnter = () => {
            if (userPausedRef.current) return;
            videoRef.current?.play().catch(() => {});
        };
        const handleLeave = () => {
            const v = videoRef.current;
            if (!v) return;
            v.pause();
            v.muted = true;
        };
        column.addEventListener('mouseenter', handleEnter);
        column.addEventListener('mouseleave', handleLeave);
        return () => {
            column.removeEventListener('mouseenter', handleEnter);
            column.removeEventListener('mouseleave', handleLeave);
        };
    }, []);

    const handleSelect = (i: number) => {
        const v = videoRef.current;
        if (i === activeIndex) {
            if (v) {
                v.muted = !v.muted;
                triggerMuteToast(v.muted);
            }
            return;
        }
        swapPendingRef.current = true;
        userPausedRef.current = false;
        setFading(true);
        setActiveIndex(i);
        setSwapKey((k) => k + 1);
    };

    const handleLoaded = () => {
        if (!swapPendingRef.current) return;
        swapPendingRef.current = false;
        setFading(false);
        const v = videoRef.current;
        if (!v) return;
        v.muted = false;
        v.play().catch(() => {});
        triggerMuteToast(false);
    };

    const handleVideoClick = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) {
            userPausedRef.current = false;
            v.play().catch(() => {});
            triggerFlash('play');
        } else {
            userPausedRef.current = true;
            v.pause();
            triggerFlash('pause');
        }
    };

    return (
        <div ref={columnRef} className={`ProjectsGaming-column ${columnClass}`}>
            <ColumnBackground
                src={games[activeIndex].videoUrl}
                fading={fading}
                videoRef={videoRef}
                onLoaded={handleLoaded}
                onVideoClick={handleVideoClick}
            />
            {swapKey > 0 && (
                <div
                    key={swapKey}
                    className={`ProjectsGaming-scanline ProjectsGaming-scanline--${accent}`}
                    aria-hidden="true"
                />
            )}
            {flashAction && (
                <div
                    key={flashAction.nonce}
                    className={`ProjectsGaming-flash ProjectsGaming-flash--${flashAction.kind}`}
                    aria-hidden="true"
                >
                    {flashAction.kind === 'play' ? (
                        <svg viewBox="0 0 24 24" width="56" height="56">
                            <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="56" height="56">
                            <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" fill="currentColor" />
                        </svg>
                    )}
                </div>
            )}
            {muteToast && (
                <div
                    key={muteToast.nonce}
                    className={`ProjectsGaming-muteToast ProjectsGaming-muteToast--${accent}`}
                    aria-hidden="true"
                >
                    {muteToast.muted ? (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path
                                d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                                fill="currentColor"
                            />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path
                                d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                                fill="currentColor"
                            />
                        </svg>
                    )}
                </div>
            )}
            <div className="ProjectsGaming-content">
                <Typewriter
                    as="h2"
                    text={title}
                    delay={titleDelay}
                    className="ProjectsGaming-title"
                    cursorColor={titleCursorColor}
                    play={revealStart}
                />
                <p className="ProjectsGaming-description">{description}</p>
                <div className="ProjectsGaming-cards">
                    {games.map((g, i) => (
                        <VideoCard
                            key={g.id}
                            label={g.label}
                            accent={accent}
                            isActive={i === activeIndex}
                            onClick={() => handleSelect(i)}
                        />
                    ))}
                </div>
            </div>
        </div>
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
    const [scrollProgress, setScrollProgress] = useState(0);
    const [revealStart, setRevealStart] = useState(false);
    // Mirror of AnalyticsDashboard's active slide — fed via its
    // onActiveSlideChange callback. Used to source the fluid-mesh palette
    // when section 3 dominates the viewport.
    const [s3ActiveSlide, setS3ActiveSlide] = useState<AnalyticsSlide | null>(null);
    // Mobile-only HUD toggle for Section 2 — splits the FiveM ↔ Metaverse
    // dual column into two switchable views (vertical stacking under 768px
    // killed the comparison effect). Pulse nonce drives a one-shot CSS
    // animation on the activated segment for the "click" visual feedback.
    const [activeUniverse, setActiveUniverse] = useState<'roblox' | 'fivem'>('roblox');
    const [universePulseNonce, setUniversePulseNonce] = useState(0);
    const { setTheme } = usePageTheme();
    const tunnel = useTunnel();

    // Wait for the tunnel overlay to begin clearing (~30% faded) before
    // launching the scanline sweep + typewriters. Avoids materializing the
    // page behind a still-opaque overlay (= wasted animation cycles + a
    // visual "pop" when the overlay finishes fading). Direct deep-link works
    // too — finishArrival fires immediately if overlay is already at 0.
    useEffect(() => {
        setRevealStart(false);
        tunnel.finishArrival(() => setRevealStart(true));
    }, [tunnel]);

    const section1Ref = useRef<HTMLElement>(null);
    const section2Ref = useRef<HTMLElement>(null);
    const section3Ref = useRef<HTMLElement>(null);
    const mainRef = useRef<HTMLElement>(null);
    const sec1ContentRef = useRef<HTMLDivElement>(null);
    const sec2ContentRef = useRef<HTMLDivElement>(null);
    const sec3ContentRef = useRef<HTMLDivElement>(null);
    const sec3BgRef = useRef<HTMLDivElement>(null);
    const swipeTimerRef = useRef<number | null>(null);
    // Cinematic transition (cog → cockpit / globe → carousel). GSAP
    // drives the explode-and-recompose animation; isTransitioning forces
    // both views to remain visible while the timeline runs.
    const cockpitRef = useRef<HTMLDivElement>(null);
    const slotStageRef = useRef<HTMLDivElement>(null);
    const transitionTl = useRef<gsap.core.Timeline | null>(null);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const totalSlides = memberSlides.length;
    const currentSlide = memberSlides[slideIndex];

    // "Caméléon" palette: the page-level GlobalFluidMesh absorbs colours
    // from whichever carousel is currently driving the viewport. Every
    // slide goes through resolvePalette() which walks the priority chain
    // manualColors → generatedPalettes[id] → Liquid Silver. Section 2 and
    // any project that hasn't been auto-extracted yet land on Liquid
    // Silver, which auto-triggers the shader's achromatic mode.
    const activePalette = useMemo(() => {
        const DEFAULT_SPEED = 0.06;
        if (activeSection === 1) {
            const palette = resolvePalette(currentSlide);
            return { ...palette, speed: currentSlide.speed ?? DEFAULT_SPEED };
        }
        if (activeSection === 2) {
            // Mobile-only toggle drives the fluid mesh palette so the shader
            // ambient transition reinforces the switch between universes.
            // Desktop stays on Liquid Silver (dual column = no single
            // dominant universe). roblox = cyan/blue calm, fivem = neon
            // green/magenta energetic.
            if (activeUniverse === 'roblox') {
                return { colorLeft: '#5EE7E7', colorRight: '#3B82F6', speed: 0.05 };
            }
            return { colorLeft: '#4ADE80', colorRight: '#FF3DCB', speed: 0.08 };
        }
        if (activeSection === 3 && s3ActiveSlide) {
            const palette = resolvePalette(s3ActiveSlide);
            return { ...palette, speed: s3ActiveSlide.speed ?? DEFAULT_SPEED };
        }
        return {
            colorLeft: LIQUID_SILVER_LEFT,
            colorRight: LIQUID_SILVER_RIGHT,
            speed: DEFAULT_SPEED,
        };
    }, [activeSection, currentSlide, s3ActiveSlide, activeUniverse]);

    // Toggle handler — short haptic + nonce bump that re-keys the activated
    // segment so its CSS pulse animation replays on every click.
    const switchUniverse = (u: 'roblox' | 'fivem') => {
        if (u === activeUniverse) return;
        setActiveUniverse(u);
        setUniversePulseNonce((n) => n + 1);
        if (typeof navigator !== 'undefined') {
            try {
                navigator.vibrate?.(8);
            } catch {
                /* iOS Safari silently no-op, Firefox throws outside gesture */
            }
        }
    };

    // ── Cinematic toggle between carousel front and BackendCockpit ──
    // goToBack: slot stage explodes (scale + blur + opacity in 350ms ease-in)
    //           while cockpit arrives from 0.85/0 to 1/1 (300ms ease-out).
    // goToFront: cockpit recedes (200ms ease-in), then slot stage recomposes
    //           with a single elastic.out exception at 600ms. This is the
    //           only mvt above the 200–400ms house rule by design.
    const goToBack = () => {
        if (isTransitioning || section1View === 'back') return;
        transitionTl.current?.kill();
        const stage = slotStageRef.current;
        const cockpit = cockpitRef.current;
        if (!stage || !cockpit) {
            setSection1View('back');
            return;
        }
        setIsTransitioning(true);
        gsap.set(cockpit, { scale: 0.8, opacity: 0, transformOrigin: '50% 50%' });
        gsap.set(stage, { scale: 1, filter: 'blur(0px)', opacity: 1, transformOrigin: '50% 50%' });

        transitionTl.current = gsap.timeline({
            onComplete: () => {
                setSection1View('back');
                setIsTransitioning(false);
                gsap.set([stage, cockpit], { clearProps: 'all' });
            },
        });
        // Deep-dive: the slot card lunges towards the viewer (scale 2.5)
        // while smearing into blur(20px) before evaporating.
        transitionTl.current.to(
            stage,
            { scale: 2.5, filter: 'blur(20px)', opacity: 0, duration: 0.5, ease: 'power2.in' },
            0
        );
        // Dashboard emerges from the depth — 0.8 → 1.0 with a confident
        // power3 settle, overlapped so the swap reads as one cut.
        transitionTl.current.to(
            cockpit,
            { scale: 1, opacity: 1, duration: 0.36, ease: 'power3.out' },
            0.2
        );
    };

    const goToFront = () => {
        if (isTransitioning || section1View === 'front') return;
        transitionTl.current?.kill();
        const stage = slotStageRef.current;
        const cockpit = cockpitRef.current;
        if (!stage || !cockpit) {
            setSection1View('front');
            return;
        }
        setIsTransitioning(true);
        // Mirror the deep-dive start state: stage is far in front + blurred.
        gsap.set(stage, { scale: 2.5, filter: 'blur(20px)', opacity: 0, transformOrigin: '50% 50%' });
        gsap.set(cockpit, { scale: 1, opacity: 1, transformOrigin: '50% 50%' });

        transitionTl.current = gsap.timeline({
            onComplete: () => {
                setSection1View('front');
                setIsTransitioning(false);
                gsap.set([stage, cockpit], { clearProps: 'all' });
            },
        });
        // Cockpit collapses fast — sharper power3.in so the user feels the
        // pull-back rather than a gentle fade.
        transitionTl.current.to(
            cockpit,
            { scale: 0.8, opacity: 0, duration: 0.18, ease: 'power3.in' },
            0
        );
        // Stage recomposes with a punchier elastic: tighter spring (period
        // 0.35) + extra amplitude (1.4) so the globe snaps back into focus
        // with a crisp overshoot. Still the one motion that exceeds the
        // 200–400ms house rule — by design.
        transitionTl.current.to(
            stage,
            {
                scale: 1,
                filter: 'blur(0px)',
                opacity: 1,
                duration: 0.55,
                ease: 'elastic.out(1.4, 0.35)',
            },
            0.08
        );
    };

    useEffect(() => {
        return () => {
            transitionTl.current?.kill();
        };
    }, []);

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

    useEffect(() => {
        document.documentElement.classList.add('Projects-snap');
        return () => document.documentElement.classList.remove('Projects-snap');
    }, []);

    // Smooth JS-driven snap. Le snap CSS natif (mandatory) avait un timing
    // trop court — l'utilisateur le ressentait comme un "feu rouge". On
    // intercepte molette / touch / clavier, on calcule la prochaine cible
    // (sections + footer) et on anime window.scrollY via GSAP avec un
    // power3.inOut sur 1.1s. Désactivé sous prefers-reduced-motion.
    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        let isAnimating = false;
        let touchStartY = 0;

        const getTargets = (): number[] => {
            const refs = [section1Ref.current, section2Ref.current, section3Ref.current];
            const ys: number[] = [];
            refs.forEach((r) => {
                if (r) ys.push(r.offsetTop);
            });
            const footer = document.querySelector('.Footer') as HTMLElement | null;
            if (footer) ys.push(footer.offsetTop);
            return ys;
        };

        const getCurrentIndex = (targets: number[]) => {
            const y = window.scrollY;
            let bestI = 0;
            let bestDist = Infinity;
            for (let i = 0; i < targets.length; i++) {
                const d = Math.abs(targets[i] - y);
                if (d < bestDist) {
                    bestDist = d;
                    bestI = i;
                }
            }
            return bestI;
        };

        const animateTo = (i: number) => {
            const targets = getTargets();
            const clamped = Math.max(0, Math.min(targets.length - 1, i));
            const target = targets[clamped];
            if (Math.abs(target - window.scrollY) < 2) return;
            isAnimating = true;
            const obj = { y: window.scrollY };
            gsap.to(obj, {
                y: target,
                duration: 0.9,
                ease: 'power3.inOut',
                onUpdate: () => window.scrollTo(0, obj.y),
                onComplete: () => {
                    isAnimating = false;
                },
            });
        };

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey) return; // laisse passer le zoom navigateur
            e.preventDefault();
            if (isAnimating) return;
            if (Math.abs(e.deltaY) < 1) return;
            const targets = getTargets();
            const current = getCurrentIndex(targets);
            const next = e.deltaY > 0 ? current + 1 : current - 1;
            if (next >= 0 && next < targets.length && next !== current) {
                animateTo(next);
            }
        };

        const onTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };

        const onTouchMove = (e: TouchEvent) => {
            // Bloque le scroll natif pendant le geste — sinon iOS / Android
            // déclenchent leur propre inertie qui combat notre animation.
            if (isAnimating) e.preventDefault();
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (isAnimating) return;
            const dy = touchStartY - e.changedTouches[0].clientY;
            if (Math.abs(dy) < 40) return;
            const targets = getTargets();
            const current = getCurrentIndex(targets);
            const next = dy > 0 ? current + 1 : current - 1;
            if (next >= 0 && next < targets.length && next !== current) {
                animateTo(next);
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (isAnimating) return;
            const targets = getTargets();
            const current = getCurrentIndex(targets);
            let next = current;
            if (e.key === 'PageDown' || e.key === 'ArrowDown' || e.key === ' ') {
                next = current + 1;
            } else if (e.key === 'PageUp' || e.key === 'ArrowUp') {
                next = current - 1;
            } else if (e.key === 'Home') {
                next = 0;
            } else if (e.key === 'End') {
                next = targets.length - 1;
            } else {
                return;
            }
            e.preventDefault();
            if (next >= 0 && next < targets.length && next !== current) {
                animateTo(next);
            }
        };

        window.addEventListener('wheel', onWheel, { passive: false, capture: true });
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    // Drive the global fluid mesh: 0 at top of section 1, 1 once section 3
    // dominates the viewport. rAF-throttled so we never run more than one
    // calc per frame, even on a noisy scroll wheel.
    useEffect(() => {
        let rafId: number | null = null;
        const compute = () => {
            rafId = null;
            const s1 = section1Ref.current;
            const s3 = section3Ref.current;
            if (!s1 || !s3) return;
            const start = s1.offsetTop;
            const end = s3.offsetTop + s3.offsetHeight * 0.5;
            const y = window.scrollY + window.innerHeight * 0.5;
            const p = (y - start) / Math.max(1, end - start);
            setScrollProgress(Math.min(1, Math.max(0, p)));
        };
        const onScroll = () => {
            if (rafId !== null) return;
            rafId = window.requestAnimationFrame(compute);
        };
        compute();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (rafId !== null) window.cancelAnimationFrame(rafId);
        };
    }, []);

    // Cinematic focus transition between sections.
    //
    // Each section's content has 3 strictly-budgeted element categories.
    // The split is driven by GPU cost: `filter: blur()` promotes the
    // target to its own compositor layer, which is fine on small text
    // nodes but ruinous on heavy DOM trees (mockup frame + screenshot)
    // or WebGL canvases (frame-rate cliff). The fluid mesh shader is
    // already holding one compositor slot — we keep filter strictly
    // scoped so the rest stays on the cheap path.
    //
    //   focus → blur + scale + opacity. ONLY text-like nodes.
    //   lens  → scale + opacity. Heavy containers + 3D canvases.
    //   fade  → opacity only. Iframes / videos / images.
    //
    // ScrollTrigger fires onEnter/onLeave (forward) and onEnterBack/
    // onLeaveBack (backward) with explicit scale directions so the focus
    // pulls correctly with the user's scroll direction (lens-in coming
    // forward, lens-back coming backward). Sections below the initial
    // viewport pre-render in their "out-backward" state so the entry
    // animation always plays cinematically the first time you scroll to
    // them, not just on return.
    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        const DURATION = 0.8;
        const EASE = 'power3.inOut';
        const BLUR_MAX = 10;

        const ctx = gsap.context(() => {
            // Three strictly-separated element categories per section. The
            // split exists primarily to keep `will-change: filter` (which
            // promotes the element to its own GPU layer) OFF heavy containers
            // — only pure text nodes get filter. The shader is already eating
            // a compositor slot; stacking a filter layer on the screenshot
            // frame or a WebGL canvas would have older laptops audibly
            // throttling.
            //
            //   focusSel → blur + scale + opacity. ONLY text-like elements
            //              (h1/h2/p, captions, title bars). Filter is cheap
            //              here because the layer is small and text-only.
            //   lensSel  → scale + opacity. Heavy containers + 3D canvases.
            //              NEVER filter (would rasterise the screenshot
            //              subtree / re-snapshot a WebGL canvas every frame).
            //   fadeSel  → opacity only. Iframes / videos / standalone
            //              images. Cheapest path; opacity is free on most
            //              compositors.
            const sectionTargets = [
                {
                    section: section1Ref.current,
                    content: sec1ContentRef.current,
                    isInitial: true,
                    focusSel: 'h1, h2, h3, p, .ProjectsBack-pager',
                    lensSel: '.ProjectsBack-cog3d, .ProjectsBack-globe3d',
                    fadeSel: '.ProjectsBack-iframe, .ProjectsBack-img',
                },
                {
                    section: section2Ref.current,
                    content: sec2ContentRef.current,
                    isInitial: false,
                    focusSel: 'h1, h2, h3, p, .ProjectsGaming-badge',
                    lensSel: '',
                    fadeSel: 'video',
                },
                {
                    section: section3Ref.current,
                    content: sec3ContentRef.current,
                    isInitial: false,
                    // Filter goes ONLY on the inner text nodes (caption +
                    // title bar). The frame container — which wraps the
                    // screenshot img — gets scale+opacity via lensSel, no
                    // filter. The opacity cascade from the frame covers
                    // the screenshot automatically, so we don't need a
                    // separate fadeSel target inside the frame.
                    focusSel: '.AnalyticsDashboard-mockup-caption, .AnalyticsDashboard-titleBar',
                    lensSel: '.AnalyticsDashboard-frame, .AnalyticsDashboard-phoneCanvas',
                    fadeSel: '',
                },
            ];

            sectionTargets.forEach(({ section, content, isInitial, focusSel, lensSel, fadeSel }) => {
                if (!section || !content) return;

                const focusEls = focusSel ? content.querySelectorAll(focusSel) : ([] as unknown as NodeListOf<Element>);
                const lensEls = lensSel ? content.querySelectorAll(lensSel) : ([] as unknown as NodeListOf<Element>);
                const fadeEls = fadeSel ? content.querySelectorAll(fadeSel) : ([] as unknown as NodeListOf<Element>);

                // GPU layer hints — kept strictly minimal: filter only where
                // the element actually receives filter (text-only focusEls).
                if (focusEls.length) gsap.set(focusEls, { willChange: 'filter, transform, opacity' });
                if (lensEls.length) gsap.set(lensEls, { willChange: 'transform, opacity' });
                if (fadeEls.length) gsap.set(fadeEls, { willChange: 'opacity' });

                if (!isInitial) {
                    if (focusEls.length) gsap.set(focusEls, { opacity: 0, scale: 0.95, filter: `blur(${BLUR_MAX}px)` });
                    if (lensEls.length) gsap.set(lensEls, { opacity: 0, scale: 0.95 });
                    if (fadeEls.length) gsap.set(fadeEls, { opacity: 0 });
                }

                const animateIn = () => {
                    if (focusEls.length) gsap.to(focusEls, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: DURATION, ease: EASE, overwrite: true });
                    if (lensEls.length) gsap.to(lensEls, { opacity: 1, scale: 1, duration: DURATION, ease: EASE, overwrite: true });
                    if (fadeEls.length) gsap.to(fadeEls, { opacity: 1, duration: DURATION, ease: EASE, overwrite: true });
                };
                const animateOut = (scale: number) => {
                    if (focusEls.length) gsap.to(focusEls, { opacity: 0, scale, filter: `blur(${BLUR_MAX}px)`, duration: DURATION, ease: EASE, overwrite: true });
                    if (lensEls.length) gsap.to(lensEls, { opacity: 0, scale, duration: DURATION, ease: EASE, overwrite: true });
                    if (fadeEls.length) gsap.to(fadeEls, { opacity: 0, duration: DURATION, ease: EASE, overwrite: true });
                };

                ScrollTrigger.create({
                    trigger: section,
                    start: 'top center',
                    end: 'bottom center',
                    onEnter: animateIn,
                    onLeave: () => animateOut(1.05),
                    onEnterBack: animateIn,
                    onLeaveBack: () => animateOut(0.95),
                });
            });

            // Section 3 cream background — bidirectional fade, matched to
            // the section's focus rhythm so it doesn't lag the content.
            const sec3Bg = sec3BgRef.current;
            if (sec3Bg) {
                gsap.set(sec3Bg, { opacity: 0, willChange: 'opacity' });
                ScrollTrigger.create({
                    trigger: section3Ref.current,
                    start: 'top center',
                    end: 'bottom center',
                    onEnter: () => gsap.to(sec3Bg, { opacity: 1, duration: DURATION, ease: EASE, overwrite: true }),
                    onLeave: () => gsap.to(sec3Bg, { opacity: 0, duration: DURATION, ease: EASE, overwrite: true }),
                    onEnterBack: () => gsap.to(sec3Bg, { opacity: 1, duration: DURATION, ease: EASE, overwrite: true }),
                    onLeaveBack: () => gsap.to(sec3Bg, { opacity: 0, duration: DURATION, ease: EASE, overwrite: true }),
                });
            }
        }, mainRef);

        return () => ctx.revert();
    }, []);

    return (
        <ScanlineSweep play={revealStart}>
            <main className="Projects" ref={mainRef}>
            {/* Persistent fluid canvas — bridges section 1 (cyan calm) and
                section 3 (magenta energetic). Lives behind every section.   */}
            <div className="Projects-fluidBg" aria-hidden="true">
                <GlobalFluidMesh
                    className="Projects-fluidBg-canvas"
                    progress={scrollProgress}
                    colorLeft={activePalette.colorLeft}
                    colorRight={activePalette.colorRight}
                    speed={activePalette.speed}
                />
                <BackgroundAtmosphere />
            </div>
            {/* SECTION 1 — Carousel membres (back <-> front) */}
            <section
                ref={section1Ref}
                data-section="1"
                className={`Projects-section Projects-section--back Projects-section--back-${section1View}${isTransitioning ? ' Projects-section--transitioning' : ''}`}
                aria-label={`Showcase membre — ${currentSlide.id}`}
            >
                <div
                    ref={sec1ContentRef}
                    className="Projects-section-inner Projects-section-inner--back"
                >
                <div className="ProjectsBack-toggle">
                    {section1View === 'front' ? (
                        <Cog3D
                            className="ProjectsBack-cog3d"
                            ariaLabel="Voir la partie back"
                            onActivate={goToBack}
                        />
                    ) : (
                        <Globe3D
                            className="ProjectsBack-globe3d"
                            ariaLabel="Voir la partie front"
                            onActivate={goToFront}
                        />
                    )}
                </div>

                <div className="ProjectsBack-stage">
                    <div
                        className="ProjectsBack-view ProjectsBack-view--back"
                        aria-hidden={section1View !== 'back'}
                    >
                        <BackendCockpit ref={cockpitRef} slide={currentSlide} />
                    </div>

                    <div
                        className="ProjectsBack-view ProjectsBack-view--front"
                        aria-hidden={section1View !== 'front'}
                    >
                        <div
                            ref={slotStageRef}
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

                <div className="ProjectsBack-pager">
                    <ProjectsPager
                        count={totalSlides}
                        activeIndex={slideIndex}
                        ariaLabel={`Projet ${slideIndex + 1} sur ${totalSlides}`}
                        onPrev={() => triggerSwipe('prev')}
                        onNext={() => triggerSwipe('next')}
                    />
                </div>
                </div>
            </section>

            {/* SECTION 2 — Gaming Productions */}
            <section
                ref={section2Ref}
                data-section="2"
                data-active-universe={activeUniverse}
                className="Projects-section Projects-section--gaming"
                aria-label="Gaming Productions"
            >
                <div
                    ref={sec2ContentRef}
                    className="Projects-section-inner Projects-section-inner--gaming"
                >
                <Typewriter
                    as="span"
                    text="GAMING PRODUCTIONS"
                    delay={0.55}
                    className="ProjectsGaming-badge"
                    cursor={false}
                    play={revealStart}
                />

                {/* Mobile-only HUD toggle — hidden via CSS above 768px.
                    The 2-segment switch replaces the vertical stack of
                    columns with a single dominant universe at a time so
                    the comparison effect survives small viewports. */}
                <div
                    className="ProjectsGaming-universeToggle"
                    role="tablist"
                    aria-label="Univers gaming"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeUniverse === 'roblox'}
                        key={`metaverse-${activeUniverse === 'roblox' ? universePulseNonce : 'idle'}`}
                        className={`ProjectsGaming-universeToggle-segment ProjectsGaming-universeToggle-segment--metaverse${activeUniverse === 'roblox' ? ' ProjectsGaming-universeToggle-segment--active' : ''}`}
                        onClick={() => switchUniverse('roblox')}
                    >
                        METAVERSE
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeUniverse === 'fivem'}
                        key={`fivem-${activeUniverse === 'fivem' ? universePulseNonce : 'idle'}`}
                        className={`ProjectsGaming-universeToggle-segment ProjectsGaming-universeToggle-segment--fivem${activeUniverse === 'fivem' ? ' ProjectsGaming-universeToggle-segment--active' : ''}`}
                        onClick={() => switchUniverse('fivem')}
                    >
                        FIVEM
                    </button>
                </div>

                <GamingColumn
                    columnClass="ProjectsGaming-column--roblox"
                    accent="cyan"
                    games={robloxGames}
                    title="Roblox Metaverse"
                    titleDelay={0.7}
                    titleCursorColor="cyan"
                    description="Immersive experiences built with Lua scripting, custom physics engines, and advanced monetization systems."
                    revealStart={revealStart}
                />

                <GamingColumn
                    columnClass="ProjectsGaming-column--fivem"
                    accent="green"
                    games={fivemGames}
                    title="FiveM Framework"
                    titleDelay={0.85}
                    titleCursorColor="magenta"
                    description="Advanced GTA V multiplayer servers with custom React-based HUDs, real-time economy systems, and fully scripted roleplay mechanics."
                    revealStart={revealStart}
                />
                </div>
            </section>

            {/* SECTION 3 — Application / Analytics Dashboard Pro */}
            <section
                ref={section3Ref}
                data-section="3"
                className="Projects-section Projects-section--app"
                aria-label="Analytics Dashboard Pro"
            >
                <div
                    ref={sec3BgRef}
                    className="Projects-section--app-bgFade"
                    aria-hidden="true"
                />
                <div
                    ref={sec3ContentRef}
                    className="Projects-section-inner Projects-section-inner--app"
                >
                    <AnalyticsDashboard onActiveSlideChange={setS3ActiveSlide} />
                </div>
            </section>

            <ContactButton fixed />
            </main>
        </ScanlineSweep>
    );
}
