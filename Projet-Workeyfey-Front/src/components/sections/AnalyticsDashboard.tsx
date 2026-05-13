import { useEffect, useRef, useState } from 'react';
import MeshGradientBackground from '../canvas/MeshGradientBackground';
import IPhoneShowcase from '../canvas/IPhoneShowcase';
import ProjectsPager from '../../tunnel/ProjectsPager';
import './AnalyticsDashboard.css';


export type Slide = {
    id: string;
    appName: string;
    titleBar: string;
    headline: string;
    blurb: string;
    accent: 'cyan' | 'green' | 'violet';
    screenshot: string;
    /** Manual palette override [left, right] absorbed by the page-level
     *  GlobalFluidMesh when this slide is active. AnalyticsDashboard slides
     *  use placeholder screenshots (picsum), so they aren't auto-extracted —
     *  manualColors is the primary palette source here. Falls back to
     *  Liquid Silver if omitted. */
    manualColors?: [string, string];
    /** Optional absolute flow rate consumed by GlobalFluidMesh.
     *  0.02 ≈ calm, 0.06 = default, 0.08 ≈ energetic. */
    speed?: number;
};

// Picsum seeds give stable, distinct visuals per slide so the carousel reads
// as "different apps", not "same template re-skinned". Same URL is used for
// the iPhone screen texture so PC and phone show matching content.
const slides: Slide[] = [
    {
        id: 'messages',
        appName: 'Aurora Music',
        titleBar: 'Aurora Music — Library',
        headline: 'Sound, sorted.',
        blurb:
            'A streaming companion that learns your night-listen habits and quietly stitches them into your morning queue.',
        accent: 'cyan',
        screenshot: 'https://picsum.photos/seed/aurora-music-2026/1280/800',
        manualColors: ['#5EE7E7', '#3B82F6'],
        speed: 0.035,
    },
    {
        id: 'feed',
        appName: 'Pulse Health',
        titleBar: 'Pulse Health — Today',
        headline: 'Days that move you.',
        blurb:
            'Activity, sleep and recovery in one calm dashboard. Pulse stays out of the way until something is worth paying attention to.',
        accent: 'green',
        screenshot: 'https://picsum.photos/seed/pulse-health-vivid/1280/800',
        manualColors: ['#4ADE80', '#22D3EE'],
        speed: 0.055,
    },
    {
        id: 'spaces',
        appName: 'Lumen Notes',
        titleBar: 'Lumen Notes — Workspace',
        headline: 'Notes that stay close.',
        blurb:
            'A workspace for half-formed thoughts. Lumen keeps your scraps cross-referenced, searchable and synced across every device.',
        accent: 'violet',
        screenshot: 'https://picsum.photos/seed/lumen-notes-violet/1280/800',
        manualColors: ['#A78BFA', '#FF3DCB'],
        speed: 0.07,
    },
];

type SlotRole =
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

function offsetToRole(offset: number): SlotRole {
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

function ChevronLeft() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
                d="M14 6l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

function ChevronRight() {
    return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
                d="M10 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}

function AppMockup({ slide }: { slide: Slide }) {
    return (
        <div className={`AnalyticsDashboard-mockup AnalyticsDashboard-mockup--${slide.accent}`}>
            <img
                src={slide.screenshot}
                alt={slide.appName}
                className="AnalyticsDashboard-mockup-shot"
                draggable={false}
                loading="lazy"
            />
            <div className="AnalyticsDashboard-mockup-overlay" aria-hidden="true" />
            <div className="AnalyticsDashboard-mockup-caption">
                <span className="AnalyticsDashboard-mockup-appName">{slide.appName}</span>
                <h3 className="AnalyticsDashboard-mockup-headline">{slide.headline}</h3>
                <p className="AnalyticsDashboard-mockup-blurb">{slide.blurb}</p>
            </div>
        </div>
    );
}

type AnalyticsDashboardProps = {
    /** Called whenever the active slide changes. Lets the page-level fluid
     *  mesh absorb the slide's palette without lifting state out of here. */
    onActiveSlideChange?: (slide: Slide, index: number) => void;
};

export default function AnalyticsDashboard({
    onActiveSlideChange,
}: AnalyticsDashboardProps = {}) {
    const [slideIndex, setSlideIndex] = useState(0);
    const [mode, setMode] = useState<'window' | 'phone'>('window');
    const [isSwiping, setIsSwiping] = useState(false);
    const [swipeDir, setSwipeDir] = useState<'prev' | 'next' | null>(null);
    const swipeTimerRef = useRef<number | null>(null);

    const total = slides.length;
    const half = Math.floor(total / 2);
    const activeSlide = slides[slideIndex];

    useEffect(() => {
        onActiveSlideChange?.(slides[slideIndex], slideIndex);
    }, [slideIndex, onActiveSlideChange]);

    const triggerSwipe = (dir: 'prev' | 'next') => {
        if (isSwiping) return;
        setSwipeDir(dir);
        setIsSwiping(true);
        setSlideIndex((i) =>
            dir === 'next' ? (i + 1) % total : (i - 1 + total) % total,
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

    const goPrev = () => triggerSwipe('prev');
    const goNext = () => triggerSwipe('next');

    const handleSlotClick = (role: SlotRole) => {
        if (role === 'hidden') return;
        if (role === 'active') {
            // Click the docked window in phone mode → swap back to window mode.
            if (mode === 'phone') setMode('window');
            return;
        }
        triggerSwipe(role.startsWith('prev') ? 'prev' : 'next');
    };

    const handlePhoneClick = () => {
        if (mode === 'window') setMode('phone');
    };

    const rootClass = [
        'AnalyticsDashboard',
        `AnalyticsDashboard--${mode}`,
        isSwiping ? 'AnalyticsDashboard--swiping' : '',
        swipeDir ? `AnalyticsDashboard--swipe-${swipeDir}` : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={rootClass}>
            <MeshGradientBackground className="AnalyticsDashboard-bgCanvas" />
            <div className="AnalyticsDashboard-blur" aria-hidden="true" />
            <div className="AnalyticsDashboard-vignette" aria-hidden="true" />

            <div className="AnalyticsDashboard-stage">
                <div
                    className={`AnalyticsDashboard-stage3d${
                        isSwiping ? ' AnalyticsDashboard-stage3d--swiping' : ''
                    }${swipeDir ? ` AnalyticsDashboard-stage3d--swipe-${swipeDir}` : ''}`}
                >
                    {slides.map((slide, i) => {
                        let offset = i - slideIndex;
                        if (offset > half) offset -= total;
                        if (offset < -half) offset += total;
                        const role = offsetToRole(offset);
                        const isSideSlot = role !== 'active' && role !== 'hidden';
                        const isClickable =
                            isSideSlot || (role === 'active' && mode === 'phone');

                        return (
                            <div
                                key={slide.id}
                                className={`AnalyticsDashboard-slotPos AnalyticsDashboard-slotPos--${role}`}
                                onClick={isClickable ? () => handleSlotClick(role) : undefined}
                                role={isClickable ? 'button' : undefined}
                                aria-label={
                                    role === 'active' && mode === 'phone'
                                        ? 'Revenir à la vue plein écran'
                                        : role.startsWith('prev')
                                          ? 'Slide précédent'
                                          : role.startsWith('next')
                                            ? 'Slide suivant'
                                            : undefined
                                }
                            >
                                <div
                                    className={`AnalyticsDashboard-slot AnalyticsDashboard-slot--${role}`}
                                >
                                    <div className="AnalyticsDashboard-frame">
                                        <div className="AnalyticsDashboard-titleBar">
                                            <div className="AnalyticsDashboard-trafficLights" aria-hidden="true">
                                                <span className="AnalyticsDashboard-trafficLight AnalyticsDashboard-trafficLight--red" />
                                                <span className="AnalyticsDashboard-trafficLight AnalyticsDashboard-trafficLight--yellow" />
                                                <span className="AnalyticsDashboard-trafficLight AnalyticsDashboard-trafficLight--green" />
                                            </div>
                                            <span className="AnalyticsDashboard-titleText">{slide.titleBar}</span>
                                            <span className="AnalyticsDashboard-titleSpacer" aria-hidden="true" />
                                        </div>

                                        <AppMockup slide={slide} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* iPhone slot — two states:
                    window → docked at the bottom between the carousel buttons
                            and the contact button, top half visible (vertical
                            cut), face-on, no drag.
                    phone  → centered, drag-to-rotate enabled. Screen texture
                            mirrors the active slide's screenshot. */}
                <div
                    className={`AnalyticsDashboard-phoneSlot AnalyticsDashboard-phoneSlot--${mode}`}
                    onClick={mode === 'window' ? handlePhoneClick : undefined}
                    role={mode === 'window' ? 'button' : undefined}
                    aria-label={mode === 'window' ? 'Manipuler le téléphone en 3D' : undefined}
                >
                    <IPhoneShowcase
                        className="AnalyticsDashboard-phoneCanvas"
                        interactive={mode === 'phone'}
                        screenSlide={{
                            screenshot: activeSlide.screenshot,
                            title: activeSlide.titleBar,
                            appName: activeSlide.appName,
                            accent: activeSlide.accent,
                        }}
                    />
                </div>
            </div>

            {/* Pill rendue HORS du footer pour qu'on puisse la repositionner
                en haut-centre sur mobile (CSS 768px). Sur desktop le look
                est conservé — c'est juste le containing block qui change. */}
            <span className="AnalyticsDashboard-pill">ANALYTICS DASHBOARD PRO</span>

            <div className="AnalyticsDashboard-footer">
                <div className="AnalyticsDashboard-nav">
                    <ProjectsPager
                        count={total}
                        activeIndex={slideIndex}
                        onPrev={goPrev}
                        onNext={goNext}
                        ariaLabel={`Slide ${slideIndex + 1} sur ${total}`}
                    />
                </div>

                <span className="AnalyticsDashboard-footerSpacer" />
            </div>
        </div>
    );
}
