import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './ProjectsPager.css';

type ProjectsPagerProps = {
    count: number;
    activeIndex: number;
    ariaLabel?: string;
    onPrev?: () => void;
    onNext?: () => void;
};

const SLOT = 18;

export default function ProjectsPager({
    count,
    activeIndex,
    ariaLabel,
    onPrev,
    onNext,
}: ProjectsPagerProps) {
    const stripRef = useRef<HTMLDivElement>(null);
    const prevIndexRef = useRef(activeIndex);

    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;
        const prev = prevIndexRef.current;
        prevIndexRef.current = activeIndex;
        if (prev === activeIndex || count <= 1) return;

        const forward = (activeIndex - prev + count) % count;
        const backward = (prev - activeIndex + count) % count;
        const direction = forward <= backward ? 1 : -1;

        const tween = gsap.fromTo(
            strip,
            { x: direction * SLOT },
            { x: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' },
        );
        return () => {
            tween.kill();
        };
    }, [activeIndex, count]);

    if (count <= 0) return null;

    // Each visible position maps to a navigation intent. The outer-left
    // pair walks backward, the centre is the active slide (no-op), the
    // outer-right pair walks forward. Mirrors the touch-pager convention
    // users already expect from app carousels.
    const dotActions: Array<{ kind: 'prev' | 'active' | 'next'; label: string }> = [
        { kind: 'prev', label: 'Projet précédent' },
        { kind: 'prev', label: 'Projet précédent' },
        { kind: 'active', label: `Projet ${activeIndex + 1} sur ${count}` },
        { kind: 'next', label: 'Projet suivant' },
        { kind: 'next', label: 'Projet suivant' },
    ];

    const handleClick = (kind: 'prev' | 'active' | 'next') => {
        if (kind === 'prev') onPrev?.();
        else if (kind === 'next') onNext?.();
    };

    return (
        <div
            className="SatellitePager"
            role="status"
            aria-label={ariaLabel ?? 'Project navigation'}
        >
            <div ref={stripRef} className="SatellitePager-strip">
                {dotActions.map((d, i) => (
                    <button
                        key={i}
                        type="button"
                        className={`SatellitePager-dot${
                            d.kind === 'active' ? ' SatellitePager-dot--active' : ''
                        }`}
                        onClick={() => handleClick(d.kind)}
                        aria-label={d.label}
                        aria-current={d.kind === 'active' ? 'true' : undefined}
                        disabled={d.kind === 'active'}
                    />
                ))}
            </div>
        </div>
    );
}
