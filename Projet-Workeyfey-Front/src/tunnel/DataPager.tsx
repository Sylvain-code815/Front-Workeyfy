import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './tunnel.css';

type DataPagerProps = {
    count: number;
    activeIndex: number;
    onSelect?: (index: number) => void;
    ariaLabel?: string;
};

/**
 * Linear progress rail. A continuous hairline spans the full width with N
 * evenly-spaced ticks pinned to it. The active tick lights up; everything
 * left of it is "passed". A white luminous fill grows from origin to the
 * active tick's position, animated via GSAP for the smooth interpolation
 * the spec calls for.
 *
 * Wrap-around (slide N → slide 0) collapses the fill back to 0 in the same
 * easing window — readable as "cycle restart" rather than a snap.
 */
export default function DataPager({
    count,
    activeIndex,
    onSelect,
    ariaLabel,
}: DataPagerProps) {
    const fillRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const node = fillRef.current;
        if (!node || count <= 1) return;
        const targetPct = (activeIndex / (count - 1)) * 100;
        const tween = gsap.to(node, {
            width: `${targetPct}%`,
            duration: 0.7,
            ease: 'power3.out',
            overwrite: 'auto',
        });
        return () => {
            tween.kill();
        };
    }, [activeIndex, count]);

    if (count <= 0) return null;

    return (
        <div
            className="DataPager"
            role="tablist"
            aria-label={ariaLabel ?? 'Project navigation'}
        >
            <div className="DataPager-rail" aria-hidden="true">
                <div ref={fillRef} className="DataPager-fill" />
            </div>
            <div className="DataPager-ticks">
                {Array.from({ length: count }, (_, i) => {
                    const isActive = i === activeIndex;
                    const isPassed = i < activeIndex;
                    const left = count > 1 ? (i / (count - 1)) * 100 : 50;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`DataPager-tick${
                                isActive
                                    ? ' DataPager-tick--active'
                                    : isPassed
                                      ? ' DataPager-tick--passed'
                                      : ''
                            }`}
                            style={{ left: `${left}%` }}
                            onClick={() => onSelect?.(i)}
                            role="tab"
                            aria-selected={isActive}
                            aria-label={`Project ${i + 1} of ${count}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
