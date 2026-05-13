import { useState } from 'react';
import './MercuryDemo.css';

type ActiveSide = 'none' | 'light' | 'dark';

const LIGHT_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
const DARK_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/**
 * Idée 02 — Mercury / Persistent Marker.
 *
 * Idle = 50/50 diagonale. Hover sur une colonne → la colonne se révèle,
 * le sibling se dissipe, et UN blob mercure se crée du côté du sibling
 * (marker de l'univers caché). Le blob PERSISTE.
 *
 * Hover sur le blob → toggle. L'ancien blob fade (le côté qu'il
 * représentait se révèle plein écran à sa place), et un NOUVEAU blob
 * se crée du côté opposé. Le filtre goo crée la fusion fluide pendant
 * la transition (les deux blobs se chevauchent brièvement au passage).
 *
 * - light active : le blob dark visible au coin bas-droit (= mercure
 *   sombre représentant l'univers dark caché).
 * - dark active : le blob light visible au coin haut-gauche.
 */
export default function MercuryDemo() {
    const [active, setActive] = useState<ActiveSide>('none');

    return (
        <div className="Mercury" data-active={active}>
            <svg width="0" height="0" className="Mercury-defs" aria-hidden="true">
                <defs>
                    <filter id="mercury-goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="b" />
                        <feColorMatrix
                            in="b"
                            mode="matrix"
                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9"
                            result="g"
                        />
                        <feComposite in="SourceGraphic" in2="g" operator="atop" />
                    </filter>
                </defs>
            </svg>

            <header className="Mercury-header">
                <span className="Mercury-eyebrow">DEMO &nbsp;·&nbsp; 02</span>
                <h2 className="Mercury-title">Mercury</h2>
                <p className="Mercury-blurb">
                    Le marker mercure persiste sur le coin du sibling. Survole le marker
                    pour inverser — fusion fluide via filtre goo pendant la transition.
                </p>
            </header>

            <div className="Mercury-stage">
                <div
                    className="Mercury-column Mercury-column--light"
                    onMouseEnter={() => setActive('light')}
                >
                    <video
                        className="Mercury-column-video"
                        src={LIGHT_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="Mercury-column-tint" aria-hidden="true" />
                    <span className="Mercury-label">Universe&nbsp;01</span>
                </div>
                <div
                    className="Mercury-column Mercury-column--dark"
                    onMouseEnter={() => setActive('dark')}
                >
                    <video
                        className="Mercury-column-video"
                        src={DARK_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="Mercury-column-tint" aria-hidden="true" />
                    <span className="Mercury-label">Universe&nbsp;02</span>
                </div>

                <svg
                    className="Mercury-hairline"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <line x1="100" y1="0" x2="0" y2="100" stroke="rgba(234, 229, 220, 0.20)" strokeWidth="0.15" />
                </svg>

                <div className="Mercury-mercury" aria-hidden="true">
                    {/* Blob light visible quand DARK est actif (coin haut-gauche). */}
                    <button
                        type="button"
                        className="Mercury-blob Mercury-blob--light"
                        onMouseEnter={() => setActive('light')}
                        aria-label="Switch to light universe"
                    />
                    {/* Blob dark visible quand LIGHT est actif (coin bas-droit). */}
                    <button
                        type="button"
                        className="Mercury-blob Mercury-blob--dark"
                        onMouseEnter={() => setActive('dark')}
                        aria-label="Switch to dark universe"
                    />
                </div>
            </div>

            {/* Grain overlay hors du stage pour rester au-dessus de tout. */}
            <div className="Mercury-grain" aria-hidden="true" />
        </div>
    );
}
