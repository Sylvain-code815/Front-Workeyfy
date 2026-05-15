import { Link } from 'react-router-dom';
import './LabScene.css';

type LabEntry = {
    slug: string;
    code: string;
    title: string;
    subtitle: string;
    status: 'wip' | 'ready';
};

const labs: LabEntry[] = [
    {
        slug: 'neural-cable',
        code: '01',
        title: 'Neural Cable',
        subtitle: 'Premium braided data cable with traveling light pulses.',
        status: 'wip',
    },
    {
        slug: 'holo-screen',
        code: '02',
        title: 'Holographic CRT Overlay',
        subtitle: 'Curved scanline glow that floats off the monitor surface.',
        status: 'wip',
    },
    {
        slug: 'cinematic-light-ray',
        code: '03',
        title: 'Volumetric God-Rays',
        subtitle: 'Cone-shaped god-rays via fresnel falloff, no raymarching.',
        status: 'wip',
    },
    {
        slug: 'data-port',
        code: '04',
        title: 'Data Port Terminal',
        subtitle: 'Metallic dock with a breathing emissive socket — endpoint B for cables.',
        status: 'wip',
    },
    {
        slug: 'ground-fog',
        code: '05',
        title: 'Flowing Ground Fog',
        subtitle: 'Simplex-noise driven mist crawling on the Z axis.',
        status: 'wip',
    },
];

export default function LabScene() {
    return (
        <main className="LabScene">
            <div className="LabScene-index">
                <p className="LabScene-eyebrow">// LAB SCENE</p>
                <h1 className="LabScene-title">Component Workbench</h1>
                <p className="LabScene-desc">
                    Each lab isolates one component — material, motion, post-pro —
                    so we can triturate it until it sings, then merge it into the
                    main scene.
                </p>

                <ul className="LabScene-list">
                    {labs.map((lab) => (
                        <li key={lab.slug}>
                            <Link
                                to={`/lab-scene/${lab.slug}`}
                                className="LabScene-card"
                            >
                                <span className="LabScene-card-code">{lab.code}</span>
                                <span className="LabScene-card-body">
                                    <span className="LabScene-card-title">
                                        {lab.title}
                                    </span>
                                    <span className="LabScene-card-subtitle">
                                        {lab.subtitle}
                                    </span>
                                </span>
                                <span
                                    className={`LabScene-card-status LabScene-card-status--${lab.status}`}
                                >
                                    {lab.status === 'wip' ? 'WIP' : 'READY'}
                                </span>
                                <span className="LabScene-card-arrow" aria-hidden>
                                    →
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </main>
    );
}
