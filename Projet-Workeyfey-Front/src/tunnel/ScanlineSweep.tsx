import { useEffect, useState, type ReactNode } from 'react';
import './tunnel.css';

type ScanlineSweepProps = {
    children: ReactNode;
    play: boolean;
    onComplete?: () => void;
};

// Total CSS-animation duration: 1.45s translate + 0.55s fade overlap.
// Keep in sync with the @keyframes definitions in tunnel.css.
const SWEEP_TOTAL_S = 2.0;

/**
 * CSS-only sweep. The panel + line + halos are baked into a single
 * `linear-gradient` background (see `.ScanlineSweep-mask` in tunnel.css);
 * the descent is driven by a `@keyframes` animation on `transform` and
 * `opacity`. Both properties are composited, so the animation runs on the
 * browser's compositor thread — completely insulated from main-thread
 * stalls (React reconciliation, Three.js shader compilation on route
 * mount, ScrollTrigger refresh, etc.). Even if the main thread is locked
 * for hundreds of milliseconds during the route swap, the sweep stays at
 * native refresh rate.
 *
 * Earlier GSAP-driven version: every frame had to land on the main thread
 * to compute the new transform — when React mounted the destination route
 * (heavy Three.js Canvases) at exactly that moment, GSAP missed frames →
 * the line stuttered. CSS keyframes don't have that dependency.
 */
export default function ScanlineSweep({
    children,
    play,
    onComplete,
}: ScanlineSweepProps) {
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
        if (!play) {
            setPlaying(false);
            return;
        }
        setPlaying(true);
        const timer = window.setTimeout(
            () => onComplete?.(),
            SWEEP_TOTAL_S * 1000,
        );
        return () => window.clearTimeout(timer);
    }, [play, onComplete]);

    return (
        <div className="ScanlineSweep">
            <div className="ScanlineSweep-content">{children}</div>
            <div
                className={`ScanlineSweep-mask${
                    playing ? ' ScanlineSweep-mask--play' : ''
                }`}
                aria-hidden="true"
            />
        </div>
    );
}
