import './BackgroundAtmosphere.css';

/**
 * Cyber-Sober atmosphere — the static, non-canvas overlay that sits on top
 * of the GlobalFluidMesh inside `.Projects-fluidBg`. Holds a faint
 * coordinate grid and a persistent atmospheric scanline.
 *
 * Pure CSS. No interaction surface — `pointer-events: none` is on the root.
 */
export default function BackgroundAtmosphere() {
    return (
        <div className="BackgroundAtmosphere" aria-hidden="true">
            <div className="BackgroundAtmosphere-grid" />
            <div className="BackgroundAtmosphere-scanline" />
        </div>
    );
}
