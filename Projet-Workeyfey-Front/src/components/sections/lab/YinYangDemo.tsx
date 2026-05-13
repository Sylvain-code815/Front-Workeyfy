import { useEffect, useRef, useState } from 'react';
import './YinYangDemo.css';

type ActiveSide = 'none' | 'light' | 'dark';

const LIGHT_VIDEO_SRC =
    'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_5MB.mp4';
const DARK_VIDEO_SRC =
    'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_5MB.mp4';

/**
 * Idée 04 — Yin Yang / Seed Takeover (preview Gaming Productions).
 *
 * Layout en 3 colonnes : texte Roblox · disc · texte FiveM. Les
 * colonnes texte SONT les zones d'interaction (cursor pointer, ARIA
 * button) — survol explicite, plus de zones rectangulaires fantômes.
 * Au hover : graine R/6 → 0.85 absorbant le cercle ; colonne opposée
 * fade à 0.22 ; halo du disc se teinte vers l'accent du côté actif.
 * Animation du rayon pilotée par rAF (CSS peu fiable sur <circle>
 * dans <clipPath>).
 */

const LIGHT_HALF =
    'M 0.5,0 A 0.5,0.5 0 0,0 0.5,1 A 0.25,0.25 0 0,0 0.5,0.5 A 0.25,0.25 0 0,1 0.5,0 Z';
const DARK_HALF =
    'M 0.5,0 A 0.5,0.5 0 0,1 0.5,1 A 0.25,0.25 0 0,1 0.5,0.5 A 0.25,0.25 0 0,0 0.5,0 Z';

const EYE_R_IDLE = 1 / 12;
const EYE_R_TAKEOVER = 0.85;
const DURATION_MS = 1100;

function snapEase(t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return t < 0.5
        ? Math.pow(2 * t, 3) / 2
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const ROBLOX_GAMES = ['Tycoon Empire', 'Racing Arena', 'RPG World'];
const FIVEM_GAMES = ['City Roleplay', 'Police Simulator', 'Racing Circuit'];

export default function YinYangDemo() {
    const [active, setActive] = useState<ActiveSide>('none');
    const [lightR, setLightR] = useState(EYE_R_IDLE);
    const [darkR, setDarkR] = useState(EYE_R_IDLE);

    const rootRef = useRef<HTMLDivElement | null>(null);
    const lightVideoRef = useRef<HTMLVideoElement | null>(null);
    const darkVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        const targetLight =
            active === 'light' ? EYE_R_TAKEOVER : active === 'dark' ? 0 : EYE_R_IDLE;
        const targetDark =
            active === 'dark' ? EYE_R_TAKEOVER : active === 'light' ? 0 : EYE_R_IDLE;
        const startLight = lightR;
        const startDark = darkR;
        const startTime = performance.now();
        let raf = 0;

        const tick = (now: number) => {
            const t = Math.min((now - startTime) / DURATION_MS, 1);
            const e = snapEase(t);
            setLightR(startLight + (targetLight - startLight) * e);
            setDarkR(startDark + (targetDark - startDark) * e);
            if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    useEffect(() => {
        const root = rootRef.current;
        const lv = lightVideoRef.current;
        const dv = darkVideoRef.current;
        if (!root || !lv || !dv) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        lv.play().catch(() => undefined);
                        dv.play().catch(() => undefined);
                    } else {
                        lv.pause();
                        dv.pause();
                    }
                });
            },
            { threshold: 0.25 },
        );
        observer.observe(root);
        return () => observer.disconnect();
    }, []);

    const activateLight = () => setActive('light');
    const activateDark = () => setActive('dark');

    return (
        <div
            ref={rootRef}
            className="YinYang"
            data-active={active}
            onMouseLeave={() => setActive('none')}
        >
            <svg
                width="0"
                height="0"
                className="YinYang-defs"
                aria-hidden="true"
            >
                <defs>
                    <clipPath id="yy-light-region" clipPathUnits="objectBoundingBox">
                        <path d={LIGHT_HALF} />
                        <circle cx="0.5" cy="0.75" r={lightR} />
                    </clipPath>
                    <clipPath id="yy-dark-region" clipPathUnits="objectBoundingBox">
                        <path d={DARK_HALF} />
                        <circle cx="0.5" cy="0.25" r={darkR} />
                    </clipPath>
                </defs>
            </svg>

            <header className="YinYang-header">
                <span className="YinYang-eyebrow">
                    DEMO &nbsp;·&nbsp; 04 &nbsp;·&nbsp; GAMING PREVIEW
                </span>
                <h2 className="YinYang-title">Gaming Productions</h2>
                <p className="YinYang-blurb">
                    Deux univers, un seul cercle. Survole une colonne pour basculer —
                    la graine plantée dans l'opposé absorbe la vidéo adverse en plein
                    cadre.
                </p>
            </header>

            <div className="YinYang-grid">
                <div
                    className="YinYang-column YinYang-column--light"
                    role="button"
                    tabIndex={0}
                    onMouseEnter={activateLight}
                    onClick={activateLight}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            activateLight();
                        }
                    }}
                    aria-label="Switch universe: Roblox Metaverse"
                >
                    <div className="YinYang-columnInner">
                        <span className="YinYang-columnEyebrow">UNIVERSE 01</span>
                        <span className="YinYang-columnTitle">Roblox Metaverse</span>
                        <p className="YinYang-columnDesc">
                            Expériences immersives en Lua, physique custom et systèmes
                            de monétisation avancés.
                        </p>
                        <ul className="YinYang-gamesList">
                            {ROBLOX_GAMES.map((label) => (
                                <li key={label} className="YinYang-game">
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="YinYang-stage">
                    <div className="YinYang-disc">
                        <video
                            ref={darkVideoRef}
                            className="YinYang-video YinYang-video--dark"
                            src={DARK_VIDEO_SRC}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            aria-hidden="true"
                        />
                        <video
                            ref={lightVideoRef}
                            className="YinYang-video YinYang-video--light"
                            src={LIGHT_VIDEO_SRC}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            aria-hidden="true"
                        />
                        <button
                            type="button"
                            className="YinYang-discZone YinYang-discZone--light"
                            onMouseEnter={activateLight}
                            onClick={activateLight}
                            aria-label="Roblox Metaverse"
                        />
                        <button
                            type="button"
                            className="YinYang-discZone YinYang-discZone--dark"
                            onMouseEnter={activateDark}
                            onClick={activateDark}
                            aria-label="FiveM Framework"
                        />
                    </div>
                </div>

                <div
                    className="YinYang-column YinYang-column--dark"
                    role="button"
                    tabIndex={0}
                    onMouseEnter={activateDark}
                    onClick={activateDark}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            activateDark();
                        }
                    }}
                    aria-label="Switch universe: FiveM Framework"
                >
                    <div className="YinYang-columnInner">
                        <span className="YinYang-columnEyebrow">UNIVERSE 02</span>
                        <span className="YinYang-columnTitle">FiveM Framework</span>
                        <p className="YinYang-columnDesc">
                            Serveurs GTA V multijoueur — HUDs React, économie temps
                            réel, mécaniques roleplay scriptées.
                        </p>
                        <ul className="YinYang-gamesList">
                            {FIVEM_GAMES.map((label) => (
                                <li key={label} className="YinYang-game">
                                    {label}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="YinYang-grain" aria-hidden="true" />
        </div>
    );
}
