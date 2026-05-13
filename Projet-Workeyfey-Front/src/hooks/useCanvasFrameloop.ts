import { useEffect, useState, type RefObject } from 'react';
import { useTunnelActive } from '../tunnel/TunnelContext';

/**
 * Returns 'always' while `ref` is intersecting the viewport AND no route
 * tunnel transition is animating; returns 'never' otherwise. Pass to
 * `<Canvas frameloop={...}>` to stop rendering off-screen scenes AND to
 * free the GPU during tunnel transitions so the scanline transform stays
 * glass-smooth.
 */
export function useCanvasFrameloop(
    ref: RefObject<HTMLElement | null>,
    threshold = 0.01,
): 'always' | 'never' {
    const [intersecting, setIntersecting] = useState(true);
    const tunnelActive = useTunnelActive();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setIntersecting(entry.isIntersecting);
            },
            { threshold },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [ref, threshold]);

    return intersecting && !tunnelActive ? 'always' : 'never';
}
