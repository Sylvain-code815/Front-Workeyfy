import './RemnantDemo.css';

const LIGHT_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
const DARK_VIDEO_SRC =
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

/**
 * Idée 03 — Inertia / Remnant.
 *
 * La seule des trois démos qui conserve la signature triangulaire :
 * le sibling rétrécit en un fragment d'origine et glisse hors champ
 * avec une inertie marquée — courbe Quart.easeInOut, durée généreuse,
 * petit overshoot. Légère flottaison sur scale en parallèle pour
 * éviter le rendu mécanique.
 *
 * L'idée : "souvenir" de l'univers absent comme une marque qui flotte,
 * pas comme un bouton qui se replie.
 */
export default function RemnantDemo() {
    return (
        <div className="Remnant">
            <svg width="0" height="0" className="Remnant-defs" aria-hidden="true">
                <defs>
                    <filter id="rem-grain">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.9"
                            numOctaves="2"
                            stitchTiles="stitch"
                        />
                        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0" />
                    </filter>
                </defs>
            </svg>

            <header className="Remnant-header">
                <span className="Remnant-eyebrow">DEMO &nbsp;·&nbsp; 03</span>
                <h2 className="Remnant-title">Inertia</h2>
                <p className="Remnant-blurb">
                    Le fragment triangulaire glisse hors champ avec inertie. Quart.easeInOut,
                    léger overshoot, flottaison subtile. Trace de l'univers absent.
                </p>
            </header>

            <div className="Remnant-stage">
                <div className="Remnant-column Remnant-column--light">
                    <video
                        className="Remnant-column-video"
                        src={LIGHT_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="Remnant-column-tint" aria-hidden="true" />
                    <span className="Remnant-label">Universe&nbsp;01</span>
                </div>
                <div className="Remnant-column Remnant-column--dark">
                    <video
                        className="Remnant-column-video"
                        src={DARK_VIDEO_SRC}
                        autoPlay
                        muted
                        loop
                        playsInline
                        crossOrigin="anonymous"
                        aria-hidden="true"
                    />
                    <span className="Remnant-column-tint" aria-hidden="true" />
                    <span className="Remnant-label">Universe&nbsp;02</span>
                </div>

                <svg
                    className="Remnant-hairline"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    <line
                        x1="100"
                        y1="0"
                        x2="0"
                        y2="100"
                        stroke="rgba(234, 229, 220, 0.14)"
                        strokeWidth="0.15"
                    />
                </svg>

                <div className="Remnant-grain" aria-hidden="true" />
            </div>
        </div>
    );
}
