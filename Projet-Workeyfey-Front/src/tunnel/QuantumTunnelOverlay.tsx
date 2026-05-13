import { useTunnelOverlayPhase } from './TunnelContext';
import './tunnel.css';

/**
 * Sober "Digital Wipe" overlay — a single fixed black layer whose opacity
 * is driven by CSS animations through phase classes (rising / peak /
 * falling / cancelling). No RAF loop, no per-frame style writes; the
 * compositor handles every frame, so main-thread stalls (React mount of
 * the destination route, Three.js shader compilation) cannot make the
 * opacity ramp stutter.
 */
export default function QuantumTunnelOverlay() {
    const phase = useTunnelOverlayPhase();
    const phaseClass =
        phase === 'idle' ? '' : ` QuantumTunnel-overlay--${phase}`;
    return (
        <div
            className={`QuantumTunnel-overlay${phaseClass}`}
            aria-hidden="true"
        />
    );
}
