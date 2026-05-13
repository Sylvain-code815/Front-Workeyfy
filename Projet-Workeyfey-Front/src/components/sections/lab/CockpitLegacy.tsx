/* ──────────────────────────────────────────────────────────────────
   CockpitLegacy — Lab archive of the original card-grid BackendCockpit.

   Renders BackendCockpit *without* the `.Atelier` wrapper so the
   editorial-list / Apple-like overrides do not apply here. The
   production page (`/projects`) now ships the premium pass; this
   section preserves the v1 card-grid look for comparison and memory.
   ────────────────────────────────────────────────────────────────── */

import BackendCockpit from '../BackendCockpit';
import './CockpitLegacy.css';

const SAMPLE_SLIDE = {
    id: 'lab-legacy-cockpit',
    title: 'Workeyfy Cluster',
    domain: 'workeyfy.io',
    services: [
        { name: 'api-gateway', status: 'Ready' },
        { name: 'auth-service', status: 'Ready' },
        { name: 'billing', status: 'Ready' },
        { name: 'realtime', status: 'Ready' },
        { name: 'workers', status: 'Ready' },
        { name: 'analytics', status: 'Ready' },
    ],
};

export default function CockpitLegacy() {
    return (
        <div className="LegacyCockpit">
            <header className="LegacyCockpit-meta">
                <span className="LegacyCockpit-meta-tag">Atelier 09 · Legacy archive</span>
                <h2 className="LegacyCockpit-meta-title">Cockpit, v1 (card grid)</h2>
                <p className="LegacyCockpit-meta-note">
                    Original card-grid presentation, kept here for reference. The production
                    Projects page now ships the editorial-list pass. Same engine, same
                    metrics, same FORCE ERROR cycle — only the surface differs.
                </p>
            </header>
            <BackendCockpit slide={SAMPLE_SLIDE} />
        </div>
    );
}
