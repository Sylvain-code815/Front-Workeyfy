import { useRef, useState } from 'react';
import MeniscusLens from './MeniscusLens';
import './WaveDropletDemo.css';

type ActiveSide = 'none' | 'light' | 'dark';

// Two distinct sources — warm/bright for the light universe, dark/punchy
// for the dark one. Google's gtv-videos-bucket serves with CORS headers,
// which is required for sampling the videos as Three.js VideoTextures.
const LIGHT_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
const DARK_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/**
 * Idée 01 — Refraction / Persistent Meniscus.
 *
 * Idle = 50/50 diagonale. Hover sur une colonne → la colonne se révèle
 * plein écran, le sibling se dissipe, et un ménisque liquide se crée
 * lentement sur le coin du sibling (marker de l'univers caché). Le
 * ménisque PERSISTE (pas de fade-out automatique).
 *
 * Hover sur le ménisque → toggle vers l'univers opposé. L'ancien
 * ménisque migre vers le nouveau coin, pendant que les colonnes
 * inversent leur révélation. La lentille échantillonne en direct la
 * vidéo de l'univers OPPOSÉ — quand light est actif, la goutte
 * réfracte les couleurs de la vidéo dark, et inversement.
 */
export default function WaveDropletDemo() {
    const [active, setActive] = useState<ActiveSide>('none');
    const lightVideoRef = useRef<HTMLVideoElement>(null);
    const darkVideoRef = useRef<HTMLVideoElement>(null);

    const toggleActive = () => {
        setActive((prev) =>
            prev === 'light' ? 'dark' : prev === 'dark' ? 'light' : prev
        );
    };

    return (
        <div className="WaveDroplet" data-active={active}>
            <svg width="0" height="0" className="WaveDroplet-defs" aria-hidden="true">
                <defs>
                    <filter id="wd-grain">
                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
                        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0" />
                    </filter>
                </defs>
            </svg>

            <header className="WaveDroplet-header">
                <span className="WaveDroplet-eyebrow">DEMO &nbsp;·&nbsp; 01</span>
                <h2 className="WaveDroplet-title">Refraction</h2>
                <p className="WaveDroplet-blurb">
                    Le ménisque persiste sur le coin du sibling et devient le switch
                    pour inverser la révélation. Survole une colonne, puis le ménisque.
                </p>
            </header>

            <div className="WaveDroplet-stage">
                <div
                    className="WaveDroplet-column WaveDroplet-column--light"
                    onMouseEnter={() => setActive('light')}
                    onClick={() => setActive('light')}
                >
                    <video
                        ref={lightVideoRef}
                        className="WaveDroplet-column-video"
                        src={LIGHT_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="WaveDroplet-column-tint" aria-hidden="true" />
                    <span className="WaveDroplet-label">Universe&nbsp;01</span>
                </div>
                <div
                    className="WaveDroplet-column WaveDroplet-column--dark"
                    onMouseEnter={() => setActive('dark')}
                    onClick={() => setActive('dark')}
                >
                    <video
                        ref={darkVideoRef}
                        className="WaveDroplet-column-video"
                        src={DARK_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="WaveDroplet-column-tint" aria-hidden="true" />
                    <span className="WaveDroplet-label">Universe&nbsp;02</span>
                </div>

                <svg
                    className="WaveDroplet-hairline"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(234, 229, 220, 0.20)" strokeWidth="0.15" />
                </svg>

                <button
                    type="button"
                    className="WaveDroplet-meniscus"
                    onMouseEnter={toggleActive}
                    onClick={toggleActive}
                    aria-label="Switch universe"
                >
                    <MeniscusLens
                        active={active}
                        lightVideoRef={lightVideoRef}
                        darkVideoRef={darkVideoRef}
                    />
                </button>

                <div className="WaveDroplet-grain" aria-hidden="true" />
            </div>
        </div>
    );
}
