import { useEffect, useRef, useState } from 'react';
import ContactButton from '../components/layout/ContactButton';
import Cog3D from '../components/canvas/Cog3D';
import Globe3D from '../components/canvas/Globe3D';
import AnalyticsDashboard from '../components/sections/AnalyticsDashboard';
import { usePageTheme, type Theme } from '../contexts/PageThemeContext';
import './Projects.css';

type Service = { name: string; status: string };

type MemberSlide = {
    id: string;
    frontUrl: string;
    title: string;
    domain: string;
    description: string;
    services: Service[];
};

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
];

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

function ChevronLeft() {
    return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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

function PlayButton({ label, accent }: { label: string; accent: Accent }) {
    return (
        <div className="ProjectsGaming-play">
            <button
                type="button"
                className={`ProjectsGaming-play-btn ProjectsGaming-play-btn--${accent}`}
                aria-label={`Lancer ${label}`}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                    <path d="M8 5v14l11-7L8 5z" fill="currentColor" />
                </svg>
            </button>
            <span className="ProjectsGaming-play-label">{label}</span>
        </div>
    );
}

export default function Projects() {
    const [section1View, setSection1View] = useState<'back' | 'front'>('front');
    const [slideIndex, setSlideIndex] = useState<number>(0);
    const [activeSection, setActiveSection] = useState<SectionId>(1);
    const { setTheme } = usePageTheme();

    const section1Ref = useRef<HTMLElement>(null);
    const section2Ref = useRef<HTMLElement>(null);
    const section3Ref = useRef<HTMLElement>(null);

    const totalSlides = memberSlides.length;
    const currentSlide = memberSlides[slideIndex];

    const goPrevSlide = () =>
        setSlideIndex((i) => (i - 1 + totalSlides) % totalSlides);
    const goNextSlide = () =>
        setSlideIndex((i) => (i + 1) % totalSlides);

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
                        <div className="ProjectsBack-stage3d">
                            {memberSlides.map((slide, i) => {
                                const total = memberSlides.length;
                                const half = Math.floor(total / 2);
                                let offset = i - slideIndex;
                                if (offset > half) offset -= total;
                                if (offset < -half) offset += total;

                                const role: 'active' | 'prev' | 'next' | 'hidden' =
                                    offset === 0
                                        ? 'active'
                                        : offset === -1
                                          ? 'prev'
                                          : offset === 1
                                            ? 'next'
                                            : 'hidden';

                                return (
                                    <div
                                        key={slide.id}
                                        className={`ProjectsBack-slotPos ProjectsBack-slotPos--${role}`}
                                    >
                                        <div
                                            className={`ProjectsBack-slot ProjectsBack-slot--${role}`}
                                        >
                                            <iframe
                                                src={slide.frontUrl}
                                                className="ProjectsBack-iframe"
                                                title={`Portfolio ${slide.id}`}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                tabIndex={role === 'active' ? 0 : -1}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="ProjectsBack-bottom">
                    <button
                        type="button"
                        className="ProjectsBack-nav-btn"
                        onClick={goPrevSlide}
                        aria-label="Slide précédent"
                    >
                        <ChevronLeft />
                    </button>
                    <span className="ProjectsBack-pagination-indicator">
                        {String(slideIndex + 1).padStart(2, '0')}
                        <span className="ProjectsBack-pagination-sep"> / </span>
                        {String(totalSlides).padStart(2, '0')}
                    </span>
                    <button
                        type="button"
                        className="ProjectsBack-nav-btn"
                        onClick={goNextSlide}
                        aria-label="Slide suivant"
                    >
                        <ChevronRight />
                    </button>
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
                    <div className="ProjectsGaming-content">
                        <h2 className="ProjectsGaming-title">Roblox Metaverse</h2>
                        <p className="ProjectsGaming-description">
                            Immersive experiences built with Lua scripting, custom physics
                            engines, and advanced monetization systems.
                        </p>
                        <div className="ProjectsGaming-buttons">
                            {robloxGames.map((g) => (
                                <PlayButton key={g.id} label={g.label} accent="cyan" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ProjectsGaming-column ProjectsGaming-column--fivem">
                    <div className="ProjectsGaming-content">
                        <h2 className="ProjectsGaming-title">FiveM Framework</h2>
                        <p className="ProjectsGaming-description">
                            Advanced GTA V multiplayer servers with custom React-based HUDs,
                            real-time economy systems, and fully scripted roleplay mechanics.
                        </p>
                        <div className="ProjectsGaming-buttons">
                            {fivemGames.map((g) => (
                                <PlayButton key={g.id} label={g.label} accent="green" />
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
