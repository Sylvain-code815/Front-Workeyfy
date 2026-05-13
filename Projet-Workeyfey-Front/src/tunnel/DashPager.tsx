import './DashPager.css';

type DashPagerProps = {
    count: number;
    activeIndex: number;
    onSelect?: (index: number) => void;
    ariaLabel?: string;
};

export default function DashPager({
    count,
    activeIndex,
    onSelect,
    ariaLabel,
}: DashPagerProps) {
    if (count <= 0) return null;

    // % position along the rail. With a single slide the segment sits at the
    // centre; otherwise tick i lives at i/(count-1) of the rail's length.
    const pct = (i: number) => (count > 1 ? (i / (count - 1)) * 100 : 50);
    const segmentLeft = pct(activeIndex);

    return (
        <div
            className="DashPager"
            role="tablist"
            aria-label={ariaLabel ?? 'Project navigation'}
        >
            <div className="DashPager-rail" aria-hidden="true" />
            <div className="DashPager-ticks">
                {Array.from({ length: count }, (_, i) => {
                    const isActive = i === activeIndex;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`DashPager-tick${
                                isActive ? ' DashPager-tick--active' : ''
                            }`}
                            style={{ left: `${pct(i)}%` }}
                            onClick={() => onSelect?.(i)}
                            role="tab"
                            aria-selected={isActive}
                            aria-label={`Project ${i + 1} of ${count}`}
                        />
                    );
                })}
            </div>
            <div
                className="DashPager-segment"
                style={{ left: `${segmentLeft}%` }}
                aria-hidden="true"
            />
        </div>
    );
}
