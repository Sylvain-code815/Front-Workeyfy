import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns 'always' while `ref` is intersecting the viewport, 'never' otherwise.
 * Pass to `<Canvas frameloop={...}>` to stop rendering off-screen scenes.
 */
export function useCanvasFrameloop(
    ref: RefObject<HTMLElement | null>,
    threshold = 0.01,
): 'always' | 'never' {
    const [frameloop, setFrameloop] = useState<'always' | 'never'>('always');

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => {
                setFrameloop(entry.isIntersecting ? 'always' : 'never');
            },
            { threshold },
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [ref, threshold]);

    return frameloop;
}
